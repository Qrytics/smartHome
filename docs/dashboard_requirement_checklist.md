# Dashboard Requirement Checklist

This checklist maps the design report requirements to dashboard/backend implementation targets.

## Core visibility and control

- [ ] **Environmental telemetry in near real time**
  - Dashboard cards/charts for temperature, humidity, pressure.
  - Analytics history view for at least 24h ranges.
- [ ] **Lighting telemetry and control**
  - Ambient light and lux charts.
  - Dimmer, relay, and daylight harvest controls.
- [ ] **Access control**
  - RFID policy card management.
  - Access audit log with granted/denied status and timestamps.
- [ ] **Single-room HVAC controls**
  - Setpoint control.
  - Fan command output/status visibility.
  - Current temperature versus setpoint indicators.

## Reliability and demo behavior

- [ ] **Per-section data source control**
  - Real or demo mode per section.
  - Auto fallback from real to demo on startup when source is unavailable.
- [ ] **Clear error handling**
  - Explicit "Connection Error" state in real mode when a section is disconnected.
  - Section-level status metadata (ok, fallback, error).

## Rules engine and automation

- [ ] **Rules builder**
  - Dedicated Automation Rules page.
  - Left-to-right drag/drop style composition (trigger -> condition -> action).
- [ ] **Rules execution path**
  - Backend CRUD endpoints for rule lifecycle.
  - Runtime evaluation on sensor/access events.
  - Dispatches real actuator commands for lighting, fan, and door lock actions.
- [ ] **RFID and door lock support**
  - RFID outcomes can be used as rule triggers/conditions.
  - Lock/unlock door actions available with safety checks.
- [ ] **Suggested starter automation**
  - One-click default ruleset template that can be loaded, edited, and enabled.

## UX and deployment

- [ ] **Consistency pass**
  - Wording and badge terms are consistent across Dashboard, TopBar, Sidebar, and section pages.
  - Buttons and panel actions have clear context-specific labels.
  - Layout sizing/overflow is stable at demo laptop resolutions.
- [ ] **RPi post-pull setup quality**
  - Setup/deploy scripts include app dependency installation steps.
  - Docs reflect reproducible "git pull -> install -> run" flow.
