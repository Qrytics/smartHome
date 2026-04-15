# Team_A4_Belmonte_Chen_final_report

**Project:** Smart Home Model - Web-First Building Management System  
**Authors:** Mario Belmonte, Cindy Chen  
**Affiliation:** Department of Electrical and Computer Engineering, Carnegie Mellon University  
**Course:** 18-500 Capstone Design

## Abstract

This final report documents the as-built Smart Home Model, a web-first building management platform integrating RFID access control, environmental monitoring with closed-loop fan control, and adaptive lighting control with daylight harvesting. The system uses ESP32-S3 firmware nodes, a FastAPI backend, a React dashboard, and Dockerized infrastructure (TimescaleDB, MQTT, Redis). Relative to our Design Review report, the architecture was refined for integration reliability and demo readiness: door access validation is implemented through backend authorization APIs, room telemetry/control is implemented through device WebSocket channels, and dashboard-backend integration includes resilient fallback behavior for partially aligned API paths. Current evidence shows strong software interface integration and backend test coverage, while hardware-in-the-loop validation remains partially open for final measured latency and long-duration reliability claims. The report includes updated risk management, ethical analysis, test/verification/validation results, and future work.

## Index Terms

Access control, building automation, daylight harvesting, ESP32-S3, FastAPI, IoT, MQTT, PID control, RFID, TimescaleDB, WebSocket

## 1. Introduction

Modern building management systems must coordinate security, comfort, and efficiency while preserving observability and policy control. Our project goal remained the same as in the Design Review report: demonstrate a centralized, web-first architecture for access control and environmental control with quantitative performance targets.

The final system is intended for building managers and security personnel who need:

- centralized policy management for access control;
- low-latency event visibility and command execution;
- historical telemetry and audit logs;
- clear system state under normal and degraded conditions.

Compared to our Design Review baseline (`docs/Team_A4_Belmonte_Chen_design_report.pdf`), the final project reflects as-built changes:

- implementation consolidated around active backend and frontend routes in the current repository;
- room control moved to combined room-node WebSocket telemetry/command flow;
- card management includes fallback behavior in frontend because of API path mismatch (`/api/policies/cards` vs `/api/access/cards`);
- final validation evidence is split into software-proven results and hardware-in-the-loop pending measurements.

## 2. Use-Case Requirements

The use case remains centralized building management for secure access and responsive environmental control. Requirements are application-driven and quantified.

### 2.1 Access Control

| Requirement | Target |
|---|---|
| RFID-to-actuation response | <= 500 ms |
| Card read detection | <= 50 ms |
| Revocation propagation | <= 100 ms |
| Access logging completeness | 100% of attempts logged |

### 2.2 Environmental Monitoring and Control

| Requirement | Target |
|---|---|
| Temperature sampling | >= 1 Hz |
| Dashboard telemetry update latency | <= 1 s |
| Temperature regulation band (steady-state) | +/- 0.5 C |
| 24-hour historical retrieval | <= 2 s |

### 2.3 Lighting and Daylight Harvesting

| Requirement | Target |
|---|---|
| Manual brightness response | <= 300 ms |
| Ambient-change to control response | <= 1 s |
| Daylight harvesting mode | automatic closed-loop adjustment |

### 2.4 System-Level Reliability and Security

| Requirement | Target |
|---|---|
| Unauthorized access rejection | 100% |
| Operational availability during demo operation | >= 99.9% (target) |
| Secure device communication | authenticated channels only |

## 3. Architecture and/or Principle of Operation

The final architecture has three layers:

1. **Edge firmware nodes** (door-control and room-node ESP32-S3 devices)
2. **Backend control/data plane** (FastAPI, broker integration, TimescaleDB)
3. **Dashboard UI** (React, REST + WebSocket client)

### 3.1 Primary Data Paths

- **Door flow:** RFID read on door node -> `POST /api/access/check` -> allow/deny decision -> relay actuation.
- **Room flow:** room-node connects to `/ws`, publishes telemetry, receives control commands (dimmer/fan/relay/daylight-harvest).
- **Dashboard flow:** frontend calls backend APIs for history/control/logs and consumes real-time updates from `/ws/client`.

### 3.2 Engineering Principles

- asynchronous event handling to reduce blocking in control loops;
- separation of control and observability paths (device WebSocket vs client WebSocket);
- centralized policy enforcement and audit logging for access decisions;
- persistence of telemetry and event data for trend analysis and verification.

### 3.3 As-Built Notes vs Design Review

- Design Review described MQTT-centric coordination; final code demonstrates working room-node WebSocket command/telemetry integration in addition to broker-backed paths.
- Integration is functional for core flows, but one frontend/backend policy-card route mismatch remains and triggers fallback mock storage in UI for some card-management interactions.

## 4. Design Requirements

Design requirements map use-case expectations to implementable subsystem constraints.

### 4.1 Access Subsystem

- door node must perform reliable credential read and backend check request generation;
- backend access API must return deterministic allow/deny decisions and create audit entries;
- actuator path must fail secure when authorization is unavailable;
- card lifecycle operations must remain consistent between UI and backend API definitions.

### 4.2 Environmental and Fan-Control Subsystem

- room-node firmware must sample and publish environmental data at operational cadence;
- command path must support fan and relay control without blocking telemetry;
- storage/query path must support historical retrieval within target window.

### 4.3 Lighting Subsystem

- room-node must accept dimmer/relay/daylight-harvest commands in real time;
- ambient sensor path must support automatic control logic and manual override from dashboard.

### 4.4 Backend/Frontend Integration Requirements

- backend must expose stable API and WebSocket routes for all critical flows;
- frontend must consume and display live updates with resilient reconnect behavior;
- API route contracts must remain aligned across frontend and backend.

## 5. Design Trade Studies

This section updates trade studies from the Design Review and records what was retained in implementation.

### 5.1 Communication Architecture Trade Study

- **Polling:** simple but introduces interval-driven latency and stale state windows.
- **Redis Streams/Broker-first:** strong decoupling and buffering, higher integration complexity.
- **WebSocket-first for live control/telemetry:** low-latency bidirectional flow for connected devices and dashboard.

**As-built decision:** retain asynchronous architecture and use active WebSocket flows for primary room-node and dashboard real-time integration, with broker-backed ingestion paths where implemented.

### 5.2 Access Latency Budget Trade Study

Design Review budget decomposition was retained conceptually:

- RFID read: ~50 ms
- network + backend processing: ~70 ms (order-of-magnitude estimate from DR analysis)
- actuation: ~100 ms

Estimated total remained below 500 ms.  
**Final measured value:** `TODO(access_latency_p95_ms_from_final_trials)`.

### 5.3 Control Resolution Trade Study

- PWM control retained for fan and lighting smoothness.
- Daylight-harvest automation retained with manual override.
- Sampling and actuation trade-offs prioritize stable behavior over aggressive update rates.

## 6. System Implementation

### 6.1 Access Control Implementation

Implemented components:

- door-control firmware path in `firmware/door-control/src/main.cpp`;
- backend access routes in `backend/app/api/access.py`;
- audit retrieval and card-management endpoints in backend access API.

Observed behavior from integration docs:

- door firmware calls `POST /api/access/check` and handles allow/deny decisions;
- backend logs access attempts;
- end-to-end hardware verification depends on connected physical node.

### 6.2 Room Telemetry and Environmental Control Implementation

Implemented components:

- room-node telemetry + command handling in `firmware/room-node/src/main.cpp`;
- device/client WebSocket endpoints in `backend/app/api/websocket.py`;
- state/control handlers in `backend/app/services/websocket_manager.py` and `backend/app/api/lighting.py`.

### 6.3 Dashboard Implementation

Implemented components:

- app/page structure and state management in `frontend/src`;
- API service layer in `frontend/src/services/api.js`;
- realtime feed hook in `frontend/src/hooks/useRealtimeFeed.js`.

Current caveat:

- policy-card calls target `/api/policies/cards` while backend exposes `/api/access/cards`; fallback behavior is implemented in frontend context/mock store to preserve demo flow.

### 6.4 Data and Infrastructure Implementation

- TimescaleDB initialization and seed in `infrastructure/timescaledb`;
- infrastructure stack in `infrastructure/docker-compose.yml`;
- backend, frontend, and docs include deployment/testing instructions.

## 7. Test, Verification and Validation

Following final-report guidance, this section reports as-built evidence and clearly separates verification (design requirements) from validation (use-case outcomes).

### 7.1 Verification of Design Requirements

| Design Requirement | Method | Current Result | Status |
|---|---|---|---|
| Backend access/sensors/lighting route behavior | backend pytest suites (`test_access`, `test_sensors`, `test_lighting`) | 57 passed, 0 failed in cited run | Met (software) |
| Frontend build/test harness operability | frontend test runner invocation | Runs successfully, but no frontend tests present | Partial |
| Room-node real-time command/telemetry integration | source and integration evidence (`/ws`, `/ws/client`) | Implemented and wired | Met (integration evidence) |
| Policy-card contract alignment | frontend vs backend endpoint comparison | mismatch (`/api/policies/cards` vs `/api/access/cards`) with fallback | Not fully met |
| Access latency <= 500 ms p95 | hardware-in-loop timing trials | `TODO(access_latency_verification_final)` | Pending |
| Manual lighting response <= 300 ms | command-to-actuation timing trial | `TODO(lighting_manual_response_ms)` | Pending |
| Historical query <= 2 s for 24 h window | timed query on deployed system | `TODO(history_query_24h_ms)` | Pending |

### 7.2 Validation of Use-Case Requirements

| Use-Case Outcome | Validation Scenario | Current Result | Status |
|---|---|---|---|
| Centralized monitoring/control from dashboard | operate dashboard with backend online | Works for core views and controls; some features use fallback path | Partial |
| Secure authorization path for access decisions | simulate/execute access checks via backend path | Implemented and tested at backend level | Partial (hardware E2E pending) |
| Real-time situational awareness | run dashboard realtime feed against backend/client WebSocket | implemented reconnecting feed and broadcast path | Met (software) |
| Complete auditability | query access logs and sensor history routes | implemented and test-backed route behavior | Met (software) |

### 7.3 Discussion of Unmet/Partially Met Requirements

- The card-management endpoint mismatch is the primary known contract defect.
- Hardware-in-the-loop quantitative latency and long-run reliability measurements are not fully captured in repository evidence at this time.
- Frontend automated test depth is currently low; this limits confidence in UI regressions despite stable backend evidence.

## 8. Project Management

### 8.1 Schedule

The project followed a five-phase schedule over 12 weeks as reflected in `docs/Capstone Ghantt Chart - Sheet1.pdf`:

- Phase 1: architecture, backend API/broker, DB setup
- Phase 2: firmware and frontend build-up
- Phase 3: hardware wiring and subsystem tests
- Phase 4: integration across firmware, backend, and dashboard
- Phase 5: verification, debugging, and demo preparation

### 8.2 Team Member Responsibilities

**Mario Belmonte**

- backend API/services, database integration, dashboard integration, CI/testing setup;
- access control backend logic and integration support.

**Cindy Chen**

- embedded firmware and hardware integration;
- subsystem testing, system architecture artifacts, and risk/schedule tracking.

**Shared**

- requirements refinement, integration testing, demo prep, and report development.

### 8.3 Bill of Materials and Budget

The Design Review BOM listed a total purchased parts cost of **$225.68**.  
Final reconciliation:

- carried-over BOM baseline from Design Review: $225.68;
- delta purchases after DR: `TODO(final_bom_delta_cost_if_any)`;
- final total spend: `TODO(final_bom_total_cost)`.

### 8.4 TechSpark Usage

Based on design report project-management notes, no planned TechSpark usage was required.  
If any additional resource usage occurred after DR, add:

- `TODO(techspark_or_external_resource_usage_sentence_if_needed)`.

### 8.5 Risk Management (Updated)

Key risks and current management outcomes:

1. **Hardware integration risk**  
   Managed with subsystem-level testing and staged integration; remains an active final-demo risk.

2. **Latency target risk**  
   Mitigated through asynchronous architecture and focused control paths; full hardware timing confirmation pending.

3. **Interface contract risk (frontend/backend drift)**  
   Exposed via policy-card mismatch; mitigated short-term with fallback behavior; requires endpoint contract fix for full closure.

4. **Operational dependency risk in web-first architecture**  
   Managed through fail-secure access behavior and documented demo fallback paths.

## 9. Ethical Issues

This project involves security-critical control and monitoring, which creates ethical obligations across public safety, privacy, and system transparency.

### 9.1 Public Health, Safety, and Welfare

- Door access control must fail secure and avoid unsafe unlocked states during backend/network faults.
- Electrical safety (relay/solenoid/flyback protection, power integrity) is essential to avoid hazardous behavior in hardware actuation.
- Environmental control claims must not overstate reliability where hardware validation is still incomplete.

### 9.2 Privacy and Surveillance

- Access logs and telemetry can reveal behavioral patterns; data minimization and retention policies should be explicit.
- User-facing systems should disclose what events are logged and why.

### 9.3 Equity and Responsible Deployment

- Centralized control systems can disadvantage occupants if policy errors or outages occur; manual override and robust incident procedures are ethically important.
- For real deployment, stronger authentication/authorization governance is required than demo-grade assumptions.

### 9.4 Professional Integrity

- We distinguish software-proven evidence from hardware-pending claims and avoid presenting incomplete validations as completed results.

## 10. Related Work

Our Design Review compared this project to SmartWatt and commercial smart-home ecosystems. That framing remains valid in the final report:

- SmartWatt emphasized energy optimization and scheduling; our project emphasizes secure, low-latency infrastructure control.
- Commercial ecosystems provide convenience but often reduce transparency and interoperability.
- Our contribution is a transparent, repository-backed implementation showing practical strengths and limitations of centralized web-first control in a capstone-scale environment.

## 11. Summary

The project successfully implemented the core architecture for a web-first smart building model with integrated access, lighting, and environmental flows. Backend API behavior and key software integration paths are strongly evidenced by tests and implementation artifacts. The final system also surfaces realistic integration limits: hardware-in-the-loop performance proof and API contract cleanup remain necessary to claim full requirement closure.

### 11.1 Future Work

1. close endpoint contract mismatch between frontend and backend card-management APIs;
2. execute and report full hardware-in-the-loop latency and reliability test campaigns;
3. add frontend automated tests for core user flows;
4. strengthen production-grade security controls and operational fallback policies.

### 11.2 Lessons Learned

1. asynchronous architecture improves responsiveness, but interface contracts must be tightly managed to avoid hidden fallback paths;
2. software integration maturity can outpace hardware readiness, so verification plans must explicitly separate both tracks;
3. transparent reporting of partial completion improves engineering credibility and decision quality.

## Glossary of Acronyms

- ADC - Analog-to-Digital Converter
- API - Application Programming Interface
- BOM - Bill of Materials
- CI - Continuous Integration
- ESP32 - Espressif 32-bit Wi-Fi/Bluetooth MCU
- HVAC - Heating, Ventilation, and Air Conditioning
- MQTT - Message Queuing Telemetry Transport
- PID - Proportional-Integral-Derivative
- PWM - Pulse-Width Modulation
- REST - Representational State Transfer
- RFID - Radio-Frequency Identification
- TLS - Transport Layer Security
- UI - User Interface
- WS/WSS - WebSocket/WebSocket Secure

## References

[1] Team A4, "Smart Home Model Design Report," `docs/Team_A4_Belmonte_Chen_design_report.pdf`, 2026.  
[2] 18-500, "Final Report Guidance," `docs/10_FinalReportGuidance.pdf`, 2026.  
[3] 18-500, "Final Report LaTeX Template," `docs/FinalReportTemplate/18-500-FinalReportTemplate.tex`, 2022/2026 use.  
[4] Smart Home repository README, `README.md`.  
[5] Integration status notes, `docs/INTEGRATION_STATUS.md`.  
[6] Testing strategy, `docs/TESTING.md`.  
[7] Integration evidence report, `docs/INTEGRATION_EVIDENCE.md`.  
[8] FastAPI access API implementation, `backend/app/api/access.py`.  
[9] FastAPI websocket API implementation, `backend/app/api/websocket.py`.  
[10] Lighting API implementation, `backend/app/api/lighting.py`.  
[11] Room-node firmware implementation, `firmware/room-node/src/main.cpp`.  
[12] Door-control firmware implementation, `firmware/door-control/src/main.cpp`.  
[13] Frontend API service, `frontend/src/services/api.js`.  
[14] Frontend realtime feed hook, `frontend/src/hooks/useRealtimeFeed.js`.  
[15] Project schedule artifact, `docs/Capstone Ghantt Chart - Sheet1.pdf`.

