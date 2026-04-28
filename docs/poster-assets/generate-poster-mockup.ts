// @ts-nocheck
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const outPath = join(process.cwd(), "docs", "poster-assets", "poster-mockup-30x40in.svg");

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function makePoster(): string {
  const W = 30;
  const H = 40;
  const m = 0.48;
  const innerW = W - 2 * m;
  const headerH = 2.45;
  const footerH = 1.02;

  const contentTop = m + headerH + 0.12;
  const contentBottom = H - m - footerH - 0.1;
  const contentH = contentBottom - contentTop;

  const colW = (innerW - 2 * 0.35) / 3;
  const col1 = m + 0.0;
  const col2 = col1 + colW + 0.35;
  const col3 = col2 + colW + 0.35;

  const row1H = contentH * 0.45;
  const rowGap = 0.16;
  const row2H = contentH - row1H - rowGap;
  const row1Top = contentTop;
  const row2Top = row1Top + row1H + rowGap;

  // Vertical space reserved for panel title bar before body content starts.
  // titleBarH = 0.92, so 1.0 gives 0.08" breathing room after the bar.
  const PANEL_INSET = 0.88;

  const title = "Smart Home Model";
  const subtitle = "Web-first building management: secure access, live telemetry, policy-driven control";
  const team = "Mario Belmonte, Cindy Chen · 18-500";

  const pitch = [
    "Use case: a building manager needs one place to see environment + enforce access in real time.",
    "The house is a physical demo: door access and room telemetry are driven by the web platform.",
    "Key targets: dashboard updates < 1 s, access checks < 500 ms (p95), and auditable event logging.",
  ].join(" ");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}in" height="${H}in" viewBox="0 0 ${W} ${H}">`,
    `<defs>`,
    `  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">`,
    `    <stop offset="0%" stop-color="#f8fafc"/>`,
    `    <stop offset="100%" stop-color="#eef2ff"/>`,
    `  </linearGradient>`,
    `  <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">`,
    `    <feDropShadow dx="0" dy="0.04" stdDeviation="0.06" flood-color="#0f172a" flood-opacity="0.10"/>`,
    `  </filter>`,
    // FIX: arrowhead marker for architecture diagram lines
    `  <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">`,
    `    <path d="M0,0 L0,6 L8,3 z" fill="#475569"/>`,
    `  </marker>`,
    `  <style>`,
    `    .t { font-family: Arial, Helvetica, sans-serif; fill: #0f172a; }`,
    `    .h1 { font-weight: 800; }`,
    `    .h2 { font-weight: 700; }`,
    `    .sub { fill: #cbd5e1; font-weight: 600; }`,
    `    .meta { fill: #475569; }`,
    `    .p { fill: #0f172a; }`,
    `    .k { font-weight: 800; }`,
    `    .boxTitle { font-weight: 800; fill: #0f172a; }`,
    `    .boxSub { fill: #475569; }`,
    `  </style>`,
    `</defs>`,
    `<rect x="0" y="0" width="${W}" height="${H}" fill="url(#bg)"/>`,
    `<rect x="${m}" y="${m}" width="${innerW}" height="${H - 2 * m}" fill="#ffffff" stroke="#e2e8f0" filter="url(#shadow)"/>`,
    `<rect x="${m}" y="${m}" width="${innerW}" height="${headerH}" fill="#0f172a"/>`,
    `<text class="t h1" font-size="0.82" x="${m + 0.35}" y="${m + 1.02}" fill="#ffffff">${esc(title)}</text>`,
    `<text class="t sub" font-size="0.24" x="${m + 0.35}" y="${m + 1.52}" fill="#cbd5e1">${esc(subtitle)}</text>`,
    `<text class="t meta" font-size="0.21" x="${W - m - 0.35}" y="${m + 0.92}" text-anchor="end" fill="#cbd5e1">${esc(team)}</text>`,

    // ── Col 1 / Row 1 : Product Pitch ────────────────────────────────────────
    rectPanel(col1, row1Top, colW, row1H, "Product pitch", "Bold the outcomes you can defend with evidence (targets + test results)."),
    // FIX: was an inline <text><tspan> block joined with \n which injected literal
    // whitespace nodes into SVG and never wrapped. Replace with two wrapTextBlock calls.
    wrapTextBlock(col1 + 0.25, row1Top + PANEL_INSET + 0.05, colW - 0.5,
      "Key outcomes: dashboard freshness, access-path latency where measured, and complete logging in Timescale for auditability.",
      0.38, "p", true),
    wrapTextBlock(col1 + 0.25, row1Top + PANEL_INSET + 0.78, colW - 0.5, pitch, 0.36, "p"),

    // ── Col 2 / Row 1 top: System diagram ────────────────────────────────────
    (() => {
      const sysH = row1H * 0.58;
      const sysY = row1Top;
      const archY = sysY + PANEL_INSET;
      const archH = Math.max(0.6, sysY + sysH - archY - 0.1);
      return [
        rectPanel(col2, sysY, colW, sysH, "System diagram", "End-to-end data + control flow."),
        architectureMini(col2 + 0.25, archY, colW - 0.5, archH),
      ].join("\n");
    })(),

    // ── Col 2 / Row 1 bottom: Hardware photos ────────────────────────────────
    (() => {
      const hwY = row1Top + row1H * 0.58 + 0.1;
      const hwH = row1H * 0.42 - 0.1;
      const photoY = hwY + PANEL_INSET;
      const photoH = Math.max(0.4, hwY + hwH - photoY - 0.1);
      return [
        rectPanel(col2, hwY, colW, hwH, "Hardware + demo photos", "Label every module: RFID, lock relay, BME280, TEMT6000, dimmer, fan relay, ESP32."),
        photoGrid(col2 + 0.2, photoY, colW - 0.4, photoH),
      ].join("\n");
    })(),

    // ── Col 3 / Row 1 : Judge take-aways ─────────────────────────────────────
    rectPanel(col3, row1Top, colW, row1H, "What judges see in 20 seconds", "One glance at the story: web stack + physical edge + proof."),
    bulleted(col3 + 0.25, row1Top + PANEL_INSET + 0.05, colW - 0.5, 0.38, [
      "React dashboard: live charts + access logs + control actions",
      "FastAPI + broker + TimescaleDB: ingest, policy, and persistence",
      "ESP32 edge: RFID/lock, sensors, and actuation paths",
    ]),

    // ── Col 1 / Row 2 top: Latency chart ─────────────────────────────────────
    (() => {
      const top = row2Top;
      const h = row2H * 0.55;
      const imgY = top + PANEL_INSET;
      const imgH = Math.max(0.5, top + h - imgY - 0.12);
      return [
        rectPanel(col1, top, colW, h, "Test results: latency vs targets", "Use legend to explain bar colors."),
        assetImage("test-results-latency-vs-target.svg", col1 + 0.2, imgY, colW - 0.4, imgH),
      ].join("\n");
    })(),

    // ── Col 1 / Row 2 bottom: Coverage ───────────────────────────────────────
    (() => {
      const top = row2Top + row2H * 0.55 + 0.1;
      const h = row2H * 0.45 - 0.1;
      const imgY = top + PANEL_INSET;
      const imgH = Math.max(0.4, top + h - imgY - 0.12);
      return [
        rectPanel(col1, top, colW, h, "Testability breakdown", "What was actually exercised."),
        assetImage("test-results-coverage-summary.svg", col1 + 0.2, imgY, colW - 0.4, imgH),
      ].join("\n");
    })(),

    // ── Col 2 / Row 2 top: Evidence table ────────────────────────────────────
    (() => {
      const top = row2Top;
      const h = row2H * 0.62;
      const imgY = top + PANEL_INSET;
      const imgH = Math.max(0.5, top + h - imgY - 0.12);
      return [
        rectPanel(col2, top, colW, h, "Test evidence table (numbers + pass/fail)", "Keep 24pt+ body text in final export."),
        assetImage("test-results-evidence-table.svg", col2 + 0.2, imgY, colW - 0.4, imgH),
      ].join("\n");
    })(),

    // ── Col 2 / Row 2 bottom: Trade-off ──────────────────────────────────────
    (() => {
      const top = row2Top + row2H * 0.62 + 0.1;
      const h = row2H * 0.38 - 0.1;
      return [
        rectPanel(col2, top, colW, h, "Engineering trade-off", "Latency vs security vs real hardware constraints."),
        wrapTextBlock(
          col2 + 0.25, top + PANEL_INSET + 0.05, colW - 0.5,
          "We optimized for a responsive operator loop: measured server-side timings are far under our UI targets. Partial hardware cases (e.g. lighting without a physical lamp) are called out as limitations.",
          0.34, "p",
        ),
      ].join("\n");
    })(),

    // ── Col 3 / Row 2 : Demo plan ─────────────────────────────────────────────
    rectPanel(col3, row2Top, colW, row2H, "Demo plan (30 seconds each)", "Helps sponsors know what to ask."),
    bulleted(col3 + 0.25, row2Top + PANEL_INSET + 0.05, colW - 0.5, 0.38, [
      "Open dashboard: show a live sensor trace updating",
      "Swipe RFID: show grant + log line + lock response",
      "Toggle policy: show denial path + time-to-enforce",
    ]),

    // ── Footer ────────────────────────────────────────────────────────────────
    `<rect x="${m}" y="${H - m - footerH}" width="${innerW}" height="${footerH}" fill="#f1f5f9" stroke="#e2e8f0"/>`,
    `<text class="t meta" font-size="0.21" x="${m + 0.35}" y="${H - m - footerH + 0.42}">Checklist: 30x40in canvas · body text 24pt+ · labels 18pt+ · import assets below · export PDF+PNG for print shop</text>`,
    `<text class="t meta" font-size="0.21" x="${W - m - 0.35}" y="${H - m - footerH + 0.42}" text-anchor="end">Mockup: docs/poster-assets/poster-mockup-30x40in.svg</text>`,
    `</svg>`,
  ].join("\n");
}

// ── Photo grid ───────────────────────────────────────────────────────────────

function photoGrid(x: number, y: number, w: number, h: number): string {
  const cols = 3;
  const rows = 2;
  const gap = 0.1;
  const cellW = (w - gap * (cols - 1)) / cols;
  const cellH = (h - gap * (rows - 1)) / rows;
  const labels = [
    "Model overview",
    "Door node (RFID + lock)",
    "Room node wiring",
    "Dashboard (live view)",
    "Under-hood (power/relays)",
    "CAD (optional)",
  ];

  const out: string[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const cx = x + c * (cellW + gap);
      const cy = y + r * (cellH + gap);
      // FIX: guard against very small cells — skip sub-text if no room
      const hasRoom = cellH > 0.55;
      out.push(
        `<g>`,
        `  <rect x="${cx}" y="${cy}" width="${cellW}" height="${cellH}" fill="#f8fafc" stroke="#cbd5e1" rx="0.08"/>`,
        `  <text class="t meta" x="${cx + 0.08}" y="${cy + 0.24}" font-size="0.23" font-weight="800">Photo ${i + 1}</text>`,
          hasRoom
          ? `  <text class="t meta" x="${cx + 0.08}" y="${cy + 0.48}" font-size="0.19" fill="#64748b">${esc(labels[i])}</text>`
          : "",
        hasRoom
          ? `  <text class="t meta" x="${cx + 0.08}" y="${cy + cellH - 0.1}" font-size="0.17" fill="#94a3b8">(replace with photo)</text>`
          : "",
        `</g>`,
      );
    }
  }
  return out.join("\n");
}

// ── Panel rectangle ──────────────────────────────────────────────────────────

function rectPanel(x: number, y: number, w: number, h: number, title: string, subtitle: string): string {
  const r = 0.12;
  const titleBarH = 0.88;
  return [
    `<g>`,
    `  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="#ffffff" stroke="#e2e8f0"/>`,
    `  <rect x="${x}" y="${y}" width="${w}" height="${titleBarH}" rx="${r}" fill="#0f172a" opacity="0.06"/>`,
    `  <text class="t boxTitle" font-size="0.39" x="${x + 0.2}" y="${y + 0.36}">${esc(title)}</text>`,
    `  <text class="t boxSub" font-size="0.26" x="${x + 0.2}" y="${y + 0.68}">${esc(subtitle)}</text>`,
    `</g>`,
  ].join("\n");
}

// ── Text wrapping ─────────────────────────────────────────────────────────────
// FIX: fontIn typed as number (was string, causing TS errors + Number() coercion).
// FIX: lineH multiplier 1.15→1.5 (was too cramped to read).
// FIX: char-width ratio 0.45→0.52 (0.45 underestimated Arial width, lines overflowed).

function wrapTextBlock(
  x: number, y: number, maxW: number,
  text: string,
  fontPt: number,
  cls: string,
  bold = false,
): string {
  const lineH = fontPt * 1.5;
  // ~0.52× font size = average glyph advance for Arial proportional text
  const maxChars = Math.max(18, Math.floor(maxW / (fontPt * 0.52)));
  const lines = softWrap(text, maxChars);
  const weight = bold ? ` font-weight="800"` : "";
  return lines
    .map((line, i) =>
      `<text class="t ${cls}" x="${x}" y="${y + i * lineH}" font-size="${fontPt}"${weight}>${esc(line)}</text>`,
    )
    .join("\n");
}

// ── Bulleted list ─────────────────────────────────────────────────────────────
// FIX: fontPt now explicit parameter (was hardcoded 0.33 for chars but called with 0.33
//      which happened to match; but char-width calc used 0.22 — wrong divisor).

function bulleted(x: number, y: number, w: number, fontPt: number, items: string[]): string {
  // FIX: use fontPt * 0.52 for char width (matches wrapTextBlock) + 1.5× line height
  const maxChars = Math.max(10, Math.floor(w / (fontPt * 0.52)));
  const lineH = fontPt * 1.5;
  const itemGap = fontPt * 0.5;
  const out: string[] = [];
  let yy = y;
  for (const it of items) {
    const lines = softWrap("• " + it, maxChars);
    for (const ln of lines) {
      out.push(`<text class="t p" font-size="${fontPt}" x="${x}" y="${yy}">${esc(ln)}</text>`);
      yy += lineH;
    }
    yy += itemGap;
  }
  return out.join("\n");
}

function softWrap(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur: string[] = [];
  for (const w of words) {
    const trial = [...cur, w].join(" ");
    if (trial.length > maxChars && cur.length) {
      lines.push(cur.join(" "));
      cur = [w];
    } else {
      cur = trial.split(" ");
    }
  }
  if (cur.length) lines.push(cur.join(" "));
  return lines;
}

// ── Asset placeholder ─────────────────────────────────────────────────────────

function assetImage(file: string, x: number, y: number, w: number, h: number): string {
  return [
    `<g>`,
    `  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#f8fafc" stroke="#cbd5e1" stroke-dasharray="0.08 0.06" rx="0.1"/>`,
    `  <image x="${x + 0.05}" y="${y + 0.05}" width="${w - 0.1}" height="${h - 0.1}" preserveAspectRatio="xMidYMid meet" href="${file}" xlink:href="${file}"/>`,
    `  <text class="t meta" font-size="0.16" x="${x + w / 2}" y="${y + h - 0.12}" text-anchor="middle" fill="#94a3b8">${esc(file)}</text>`,
    `</g>`,
  ].join("\n");
}

// ── Architecture mini-diagram ─────────────────────────────────────────────────
// FIX: stroke-width 0.01→0.05 (0.01 was invisible on a 30×40" poster).
// FIX: arrowheads via marker-end reference.
// FIX: node sub-text clamped so it never renders outside the box.

function architectureMini(x: number, y: number, w: number, h: number): string {
  const nodeW = w * 0.28;
  const nodeH = Math.min(h * 0.34, 1.4); // clamp so text always fits
  const r = 0.05;
  const c1x = x + w * 0.04;
  const c2x = x + w * 0.36;
  const c3x = x + w * 0.68;
  const rowA = y + h * 0.05;
  const rowB = y + h * 0.55;

  // FIX: sub-text y is relative to box top, clamped within nodeH
  const box = (bx: number, by: number, label: string, sub: string, fill: string) => {
    const titleY = by + Math.min(nodeH * 0.35, 0.22);
    const subY = by + Math.min(nodeH * 0.68, 0.50);
    const showSub = nodeH > 0.45;
    return [
      `<rect x="${bx}" y="${by}" width="${nodeW}" height="${nodeH}" rx="${r}" fill="${fill}" stroke="#475569" stroke-width="0.02"/>`,
      `<text class="t p" x="${bx + 0.06}" y="${titleY}" fill="#0f172a" font-size="0.24" font-weight="800">${esc(label)}</text>`,
      showSub
        ? `<text class="t boxSub" x="${bx + 0.06}" y="${subY}" font-size="0.19" fill="#334155">${esc(sub)}</text>`
        : "",
    ].join("\n");
  };

  // Midpoints for line anchors
  const midA = rowA + nodeH / 2;
  const midB = rowB + nodeH / 2;
  const midC2 = c2x + nodeW / 2;

  return [
    box(c1x, rowA, "React", "Dashboard (HTTP/WS)", "#dbeafe"),
    box(c2x, rowA, "FastAPI", "API + real-time", "#c7d2fe"),
    box(c3x, rowA, "DB + broker", "Timescale + MQTT", "#a5b4fc"),
    box(c1x, rowB, "Door ESP32", "RFID + lock", "#bbf7d0"),
    box(c2x, rowB, "Room ESP32s", "Sensors + actuators", "#86efac"),
    box(c3x, rowB, "Physical model", "Labeled subsystems", "#fde68a"),
    // Horizontal: React → FastAPI → DB+broker
    `<line x1="${c1x + nodeW}" y1="${midA}" x2="${c2x - 0.02}" y2="${midA}" stroke="#475569" stroke-width="0.05" marker-end="url(#arrow)"/>`,
    `<line x1="${c2x + nodeW}" y1="${midA}" x2="${c3x - 0.02}" y2="${midA}" stroke="#475569" stroke-width="0.05" marker-end="url(#arrow)"/>`,
    // Vertical: FastAPI ↔ Room ESP32s (bidirectional shown as two offset lines)
    `<line x1="${midC2 - 0.04}" y1="${rowA + nodeH}" x2="${midC2 - 0.04}" y2="${rowB - 0.02}" stroke="#475569" stroke-width="0.05" marker-end="url(#arrow)"/>`,
    `<line x1="${midC2 + 0.04}" y1="${rowB}" x2="${midC2 + 0.04}" y2="${rowA + nodeH + 0.02}" stroke="#475569" stroke-width="0.05" marker-end="url(#arrow)"/>`,
  ].join("\n");
}

// ── Write output ──────────────────────────────────────────────────────────────

mkdirSync(join(process.cwd(), "docs", "poster-assets"), { recursive: true });
writeFileSync(outPath, makePoster(), "utf8");
console.log(`Wrote ${outPath}`);