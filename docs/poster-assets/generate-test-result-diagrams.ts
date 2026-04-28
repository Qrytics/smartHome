// @ts-nocheck
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

type Requirement = {
  name: string;
  targetMs: number | null;
  measuredMs: number | null;
  testability: "Fully testable" | "Partially testable";
  note: string;
};

const requirements: Requirement[] = [
  {
    name: "Dashboard update",
    targetMs: 1000,
    measuredMs: 19.54,
    testability: "Fully testable",
    note: "Dashboard got the update in 19.54 ms",
  },
  {
    name: "Historical data query",
    targetMs: 2000,
    measuredMs: 7.96,
    testability: "Fully testable",
    note: "History loaded in 7.96 ms (worst normal run)",
  },
  {
    name: "Unauthorized access rejection",
    targetMs: null,
    measuredMs: 11.16,
    testability: "Fully testable",
    note: "30/30 unauthorized cards denied (11.16 ms)",
  },
  {
    name: "Permission revoke",
    targetMs: 100,
    measuredMs: 17.25,
    testability: "Fully testable",
    note: "Card went from allowed to denied in 17.25 ms",
  },
  {
    name: "Sampling rate",
    targetMs: null,
    measuredMs: null,
    testability: "Partially testable",
    note: "Sent data every 1 s, backend accepted 10/10",
  },
  {
    name: "Light update",
    targetMs: 1000,
    measuredMs: null,
    testability: "Partially testable",
    note: "Command/update path is fast, no physical lamp attached",
  },
  {
    name: "Brightness control response",
    targetMs: 300,
    measuredMs: 7.24,
    testability: "Partially testable",
    note: "Brightness command finished in 7.24 ms",
  },
  {
    name: "Daylight response",
    targetMs: 1000,
    measuredMs: 19.1,
    testability: "Partially testable",
    note: "Daylight mode command finished in 19.10 ms",
  },
];

const outDir = join(process.cwd(), "docs", "poster-assets");
mkdirSync(outDir, { recursive: true });

function svgHeader(width: number, height: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
}

function commonStyles(): string {
  return `
<style>
  .title { font: 700 40px Arial, sans-serif; fill: #0f172a; }
  .subtitle { font: 500 22px Arial, sans-serif; fill: #475569; }
  .label { font: 500 22px Arial, sans-serif; fill: #0f172a; }
  .small { font: 400 18px Arial, sans-serif; fill: #334155; }
  .tick { font: 500 18px Arial, sans-serif; fill: #475569; }
  .ok { fill: #16a34a; }
  .warn { fill: #d97706; }
  .bad { fill: #dc2626; }
  .grid { stroke: #e2e8f0; stroke-width: 1; }
  .axis { stroke: #94a3b8; stroke-width: 2; }
  .value { font: 600 21px Arial, sans-serif; fill: #0f172a; }
</style>`;
}

function escapeSvgText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function makeLatencyChartSvg(data: Requirement[]): string {
  const rows = data.filter((d) => d.targetMs !== null && d.measuredMs !== null);
  // Tight left gutter; slightly wider for 22px requirement labels.
  const left = 318;
  // Room for last tick ("2000 ms") and full-width bar value labels on the right.
  const right = 128;
  const chartW = 1282;
  const width = left + chartW + right;
  const top = 26;
  const groupGap = 122;
  const barH = 36;
  const barStackGap = 11;
  const legendBelow = 44;
  const bottomPad = 22;
  const height = top + groupGap * rows.length + legendBelow + bottomPad;

  const maxX = Math.max(
    1,
    ...rows.map((r) => Math.max(r.targetMs!, r.measuredMs!))
  );
  const tickCount = 5;
  const gridTop = top - 12;
  const gridBottom = top + groupGap * rows.length;

  const bandWidth = (value: number) => (value / maxX) * chartW;
  const barWidth = (value: number) => {
    const w = bandWidth(value);
    if (value > 0 && w < 4) {
      return 4;
    }
    return w;
  };

  const contentLines: string[] = [];
  for (let i = 0; i <= tickCount; i += 1) {
    const x = left + (chartW * i) / tickCount;
    const v = (maxX * i) / tickCount;
    if (i > 0) {
      contentLines.push(
        `<line class="grid" x1="${x}" y1="${gridTop}" x2="${x}" y2="${gridBottom}" />`
      );
    }
    const isLast = i === tickCount;
    const tickX = isLast ? left + chartW - 6 : x;
    const tickAnchor = isLast ? "end" : "middle";
    contentLines.push(
      `<text class="tick" x="${tickX}" y="${gridBottom + 28}" text-anchor="${tickAnchor}">${v.toFixed(0)} ms</text>`
    );
  }

  rows.forEach((r, idx) => {
    const targetMs = r.targetMs as number;
    const measuredMs = r.measuredMs as number;
    const groupTop = top + idx * groupGap;
    const yTarget = groupTop;
    const yMeas = groupTop + barH + barStackGap;
    const targetW = barWidth(targetMs);
    const measuredW = barWidth(measuredMs);
    const pass = measuredMs <= targetMs;
    const measuredColor = pass ? "#16a34a" : "#dc2626";

    const nameParts = r.name.length > 32
      ? [r.name.slice(0, 32), r.name.slice(32)]
      : [r.name];

    const labelLineGap = 24;
    nameParts.forEach((line, li) => {
      contentLines.push(
        `<text class="label" x="${left - 14}" y="${groupTop + 26 + li * labelLineGap}" text-anchor="end">${escapeSvgText(
          line
        )}</text>`
      );
    });

    const valDy = Math.round(barH * 0.72);
    contentLines.push(
      `<rect x="${left}" y="${yTarget}" width="${targetW}" height="${barH}" fill="#e2e8f0" rx="3" />`
    );
    contentLines.push(
      `<text class="value" x="${left + targetW + 10}" y="${yTarget + valDy}">${targetMs} ms</text>`
    );

    contentLines.push(
      `<rect x="${left}" y="${yMeas}" width="${measuredW}" height="${barH}" fill="${measuredColor}" rx="2" />`
    );
    contentLines.push(
      `<text class="value" x="${left + measuredW + 10}" y="${yMeas + valDy}">${measuredMs.toFixed(2)} ms</text>`
    );
  });

  const legendY = gridBottom + 34;
  // Legend starts under the y-axis / “0 ms” tick (same x as the axis line).
  const legendTx = left;

  return [
    svgHeader(width, height),
    commonStyles(),
    `<rect width="${width}" height="${height}" fill="#ffffff" />`,
    `<line class="axis" x1="${left}" y1="${gridTop}" x2="${left}" y2="${gridBottom}" />`,
    contentLines.join("\n"),
    `<g transform="translate(${legendTx}, ${legendY})">`,
    `  <rect x="0" y="2" width="30" height="19" fill="#e2e8f0" rx="2" />`,
    `  <text class="label" x="38" y="17">Target ceiling (requirement max)</text>`,
    `  <rect x="418" y="2" width="30" height="19" fill="#16a34a" rx="2" />`,
    `  <text class="label" x="456" y="17">Measured time</text>`,
    `</g>`,
    `</svg>`,
  ].join("\n");
}

function makeCoverageSummarySvg(data: Requirement[]): string {
  const fullItems = data.filter((d) => d.testability === "Fully testable");
  const partialItems = data.filter((d) => d.testability === "Partially testable");

  const width = 1520;
  const lineH = 34;
  const top = 118;
  const x = 44;

  const wrap = (s: string, maxChars: number): string[] => {
    if (s.length <= maxChars) {
      return [s];
    }
    const out: string[] = [];
    let rest = s;
    while (rest.length > 0) {
      out.push(rest.slice(0, maxChars));
      rest = rest.slice(maxChars);
    }
    return out;
  };

  const renderList = (title: string, items: Requirement[], yStart: number, accent: string): { svg: string; endY: number } => {
    let y = yStart;
    let svg = `<text class="label" x="${x}" y="${y}" fill="${accent}">${title}</text>\n`;
    y += 32;
    items.forEach((d) => {
      const detail = `(${d.testability}): ${d.note}`;
      const lines = [
        `• ${d.name}`,
        ...wrap(detail, 88).map((l) => `  ${l}`),
      ];
      lines.forEach((line) => {
        y += lineH;
        svg += `<text class="small" x="${x + 6}" y="${y}">${escapeSvgText(line)}</text>\n`;
      });
      y += 6;
    });
    return { svg, endY: y + 14 };
  };

  const a = renderList("Fully testable (what we validated end-to-end)", fullItems, top, "#0f172a");
  const b = renderList(
    "Partially testable (software path or simulated hardware)",
    partialItems,
    a.endY,
    "#0f172a"
  );

  const height = b.endY + 28;

  return [
    svgHeader(width, height),
    commonStyles(),
    `<rect width="${width}" height="${height}" fill="#ffffff" />`,
    `<text class="title" x="44" y="52">Testability Breakdown (Details)</text>`,
    `<text class="subtitle" x="44" y="86">This replaces percentage-only summaries: list what was covered, and the measured evidence for each line.</text>`,
    a.svg,
    b.svg,
    `</svg>`,
  ].join("\n");
}

function makeEvidenceTableSvg(data: Requirement[]): string {
  const width = 1820;
  const rowH = 78;
  const top = 108;
  const height = top + rowH * (data.length + 1) + 28;

  const col = {
    req: 36,
    target: 480,
    testability: 720,
    evidence: 1000,
    status: 1680,
  };

  let rows = "";
  data.forEach((d, i) => {
    const y = top + rowH * (i + 1);
    const hasCheck =
      d.targetMs !== null && d.measuredMs !== null ? d.measuredMs <= d.targetMs : null;
    const statusText =
      hasCheck === null ? "N/A" : hasCheck ? "PASS" : "MISS";
    const statusColor = hasCheck === null ? "#64748b" : hasCheck ? "#16a34a" : "#dc2626";
    const targetText =
      d.name === "Unauthorized access rejection"
        ? "100% reject"
        : d.name === "Sampling rate"
          ? "1 Hz"
          : d.targetMs !== null
            ? `< ${d.targetMs} ms`
            : "N/A";

    rows += `<rect x="24" y="${y - rowH + 4}" width="${width - 48}" height="${rowH}" fill="${
      i % 2 === 0 ? "#ffffff" : "#f8fafc"
    }" />
`;
    rows += `<text class="small" x="${col.req}" y="${y - 28}">${escapeSvgText(d.name)}</text>
`;
    rows += `<text class="small" x="${col.target}" y="${y - 28}">${escapeSvgText(targetText)}</text>
`;
    rows += `<text class="small" x="${col.testability}" y="${y - 28}">${escapeSvgText(
      d.testability
    )}</text>
`;
    rows += `<text class="small" x="${col.evidence}" y="${y - 28}">${escapeSvgText(d.note)}</text>
`;
    rows += `<text x="${col.status}" y="${y - 28}" font-family="Arial, sans-serif" font-size="19" font-weight="700" fill="${statusColor}">${statusText}</text>
`;
    rows += `<line class="grid" x1="24" y1="${y + 4}" x2="${width - 24}" y2="${y + 4}" />
`;
  });

  return [
    svgHeader(width, height),
    commonStyles(),
    `<rect width="${width}" height="${height}" fill="#ffffff" />`,
    `<text class="title" x="36" y="54">Requirement Evidence Table (Poster Ready)</text>`,
    `<text class="subtitle" x="36" y="88">Directly derived from measured results in your test run summary.</text>`,
    ``,
    `<rect x="24" y="${top - rowH + 4}" width="${width - 48}" height="${rowH}" fill="#e2e8f0" />`,
    `<text class="label" x="${col.req}" y="${top - 28}">Requirement</text>`,
    `<text class="label" x="${col.target}" y="${top - 28}">Target</text>`,
    `<text class="label" x="${col.testability}" y="${top - 28}">Testability</text>`,
    `<text class="label" x="${col.evidence}" y="${top - 28}">Measured evidence</text>`,
    `<text class="label" x="${col.status}" y="${top - 28}">Status</text>`,
    rows,
    `</svg>`,
  ].join("\n");
}

writeFileSync(
  join(outDir, "test-results-latency-vs-target.svg"),
  makeLatencyChartSvg(requirements),
  "utf8"
);
writeFileSync(
  join(outDir, "test-results-coverage-summary.svg"),
  makeCoverageSummarySvg(requirements),
  "utf8"
);
writeFileSync(
  join(outDir, "test-results-evidence-table.svg"),
  makeEvidenceTableSvg(requirements),
  "utf8"
);

console.log("Generated poster SVG files in docs/poster-assets/");
