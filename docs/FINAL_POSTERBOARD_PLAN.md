# Smart Home Final Posterboard Plan (Print-Ready)

Aligned with `docs/8_FinalPosterGuidance.pdf`.

## Non-Negotiable Requirements (from course guidance)

- Poster size must be **30 in (W) x 40 in (H)**.
- Minimum font size:
  - **24 pt** for normal text
  - **18 pt only for occasional labels**
- Required content blocks:
  - Product pitch (text block)
  - System block diagram (or hardware + software diagrams)
  - Pictures of final product with labels/captions
  - Graphs/tables of test results tied back to requirements
- Deliverables:
  - Upload **PowerPoint + PDF** to WordPress as its own post
  - Upload **PDF** to Canvas

## Recommended Poster Layout (Top to Bottom)

Keep this simple and readable at a distance. Three vertical columns works best.

- **Top header (full width):**
  - Project title
  - Team names
  - One-line value proposition
- **Left column:** Product pitch + use case requirements
- **Center column:** System diagram(s) + data/control flow
- **Right column:** Hardware/software photos with heavy labeling
- **Bottom row (full width or split 2 panels):** Test results (graphs/tables) + conclusions

## Exact Content to Place on Poster

## 1) Header Block (top, full width)

Title:
- **Smart Home Model: Web-First Building Management System**

Subtitle:
- **Secure RFID Access + Real-Time Environmental and Lighting Control**

Team:
- Mario Belmonte, Cindy Chen

One-liner:
- A physical building model whose critical functions are controlled through a web platform with low-latency policy enforcement and live telemetry.

## 2) Product Pitch Block (required text-only block)

Use this text (adjust only if you have newer measured numbers):

> Building managers and security staff often rely on fragmented tools for access control and environmental monitoring.  
> Our project demonstrates a **web-first smart building system** where a physical model home is operated through a centralized dashboard.  
> We target four core requirements:
> - **Access latency:** RFID swipe to lock actuation in **<500 ms (95th percentile)**  
> - **Dashboard responsiveness:** sensor updates in **<1 s average**  
> - **Policy enforcement:** permission revocation propagation in **<100 ms**  
> - **Data reliability:** **100% logging** of telemetry and access events in TimescaleDB
>
> The final system integrates ESP32 edge nodes, FastAPI services, MQTT/Redis messaging, WebSockets, and TimescaleDB to deliver low-latency control with auditable behavior.

Formatting tip:
- Put the numeric goals in bold so judges can scan quickly.

## 3) System Block Diagram Block (required)

Include one clear diagram with arrows. If crowded, split into two diagrams:

- **Hardware diagram**:
  - ESP32 Door Node -> RFID-RC522 -> Solenoid lock relay
  - ESP32 Room Nodes (x3) -> BME280, TEMT6000, dimmer, fan relay
  - Local network + laptop/RPi host
- **Software/data flow diagram**:
  - React dashboard <-> FastAPI backend (HTTP/WebSocket)
  - FastAPI <-> broker (MQTT/Redis)
  - FastAPI <-> TimescaleDB
  - Event flows for:
    - access check
    - sensor ingest
    - lighting command

Required annotation on diagram:
- Label major latency path(s): access flow and sensor-to-dashboard flow.

## 4) Pictures Block (required, with many labels)

Use 4 to 6 images with captions and callouts:

- Full model house shot (label each node/major subsystem)
- Door control close-up (RFID reader, relay, solenoid)
- One room-node close-up (sensor + dimmer + relay)
- Backend/frontend running screenshot (dashboard pages)
- Optional under-the-hood wiring photo
- Optional CAD model screenshot (if available)

Caption style (one line each):
- "Door node with RFID authentication and fail-secure lock control."
- "Room node measuring environment and executing daylight-harvest dimming."

Mandatory labeling checklist:
- Every board/module in photo has a text label.
- Each label >= 18 pt after final poster scaling.

## 5) Test Results Block (required and must tie to pitch)

This is the highest-value judging block. Use 3 to 5 visuals max.

Recommended visuals:
- **Graph A:** Access latency distribution (histogram or box plot)
  - Include median, 95th percentile, max
  - Explicit "target = 500 ms"
- **Graph B:** Sensor-to-dashboard latency over trials
  - Include average and worst-case
  - Explicit "target = 1 s"
- **Graph C:** Revocation propagation timing
  - Include average + pass/fail against 100 ms target
- **Table D:** Reliability outcomes
  - Data capture rate, failed events, uptime/test duration

Tie-back sentence (put under each graph):
- "This result directly validates Requirement R# from our product pitch."

## 6) Engineering Challenges + Trade-Offs (small section)

Use 3 bullets max:
- Balancing low-latency control with secure communication and validation.
- Maintaining real-time UX while persisting high-frequency telemetry.
- Integrating multi-node hardware/software in a demo-safe, fail-secure design.

## 7) Final Conclusion / Demo Hook

Use a short close:

> Our final prototype shows that web-first control of physical building functions is feasible with sub-second responsiveness, policy-driven security, and complete event visibility.

Optional:
- Add QR code to repo/demo video.

## Poster Build Steps (Do This in Order)

1. Open the class poster template and set canvas to 30x40 in.
2. Place fixed section boxes first (header, pitch, diagram, photos, results).
3. Fill text blocks from this doc.
4. Import diagrams and images at native quality.
5. Verify all text sizes:
   - normal >= 24 pt
   - labels >= 18 pt
6. Do a 100% zoom readability pass from 4 to 6 feet away.
7. Export:
   - `.pptx`
   - `.pdf` (high quality / print quality)

## 24-Hour Final Checklist (Before Printing)

- [ ] Poster is exactly 30x40 in.
- [ ] All required four content categories are present.
- [ ] Product pitch has bolded requirement outcomes.
- [ ] Diagrams are not blurry and labels are readable.
- [ ] Every photo has title/caption + labels.
- [ ] Test visuals explicitly map to requirements.
- [ ] No tiny legends/axes under 18 pt.
- [ ] Team names and project title are obvious from distance.
- [ ] Exported both PPT and PDF.
- [ ] Uploaded PPT+PDF to WordPress post.
- [ ] Uploaded PDF to Canvas.
- [ ] Sent final PDF to print (or tested print preview at full size).

## Quick "If You Are Short on Time" Version

If you're in crunch mode, prioritize in this exact order:

1. Product pitch block with bolded outcomes.
2. One clean system diagram with readable labels.
3. Three strong result visuals tied to goals (<500 ms, <1 s, <100 ms, logging rate).
4. Four labeled product photos.
5. Final checklist + export + upload.

Anything extra (comparison section, future work, long background) is optional.

## TypeScript-Generated Test Result Graphics

I added a TS generator so your test visuals are reproducible and editable:

- Script: `docs/poster-assets/generate-test-result-diagrams.ts`

Run from repo root:

- `npx --yes tsx "docs/poster-assets/generate-test-result-diagrams.ts"`

Generated files:

- `docs/poster-assets/test-results-latency-vs-target.svg`
- `docs/poster-assets/test-results-coverage-summary.svg`
- `docs/poster-assets/test-results-evidence-table.svg`

Use these SVGs directly in PowerPoint (they stay sharp when resized).

## Full-canvas layout mockup (30×40 in)

For a one-glance view of the planned poster layout (correct canvas size, section blocks, and embedded test assets), use:

- Output: `docs/poster-assets/poster-mockup-30x40in.svg`
- Script: `docs/poster-assets/generate-poster-mockup.ts`

Regenerate from repo root:

- `npx --yes tsx "docs/poster-assets/generate-poster-mockup.ts"`

Open the SVG in a browser or vector tool to check spacing. In PowerPoint, **Insert → Pictures** for the test-result SVGs if linked previews do not show.
