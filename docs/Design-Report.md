
Abstract—A web-first smart building model integrating RFID access control, PID-based HVAC temperature regulation, and adaptive lighting control using ESP32 microcontrollers. All sensing and actuation are centrally managed through a web dashboard, achieving <500 ms access response and <1 s environmental updates. A PID-controlled fan system maintains temperature within ±1 °C of a setpoint, while ambient-light-driven dimming automatically adjusts artificial lighting for energy efficiency. Compared to passive monitoring systems, this platform demonstrates real-time, closed-loop environmental control with secure centralized management, validating the feasibility of responsive, fully web-dependent building automation.

Index Terms—Access control, building automation, daylight harvesting, ESP32, HVAC control, Internet of Things, PID control, RFID, smart lighting, web-based control

Introduction
M
ODERN buildings increasingly rely on automated systems to manage access control, lighting, and climate to improve security, energy efficiency, and occupant comfort. Traditionally, these subsystems operate as independent units with local controllers and limited integration, making centralized management difficult and reducing overall system visibility. Building managers and security personnel benefit from unified platforms that provide real-time monitoring, historical analytics, and remote control of critical infrastructure. Our project addresses this need by developing a physical model building that integrates access control, HVAC temperature regulation, and lighting automation into a single web-based control system. As described in our design review presentation, the intended users are building managers and security personnel who require centralized RFID door access, lighting control, and environmental monitoring through a unified dashboard interface.
Existing commercial “smart home” and building automation products, such as standalone smart locks and thermostats, provide basic remote functionality but typically rely on proprietary ecosystems and distributed local control logic. These systems limit flexibility, make integration across vendors difficult, and reduce transparency into system operation. Furthermore, many systems prioritize convenience over performance guarantees, providing limited quantitative assurance of response latency, system availability, or data integrity. In contrast, our project explores a fully web-dependent architecture in which all sensing, decision-making, and actuation are coordinated through a centralized backend. This approach allows precise policy enforcement, complete system observability, and consistent integration across subsystems.

The goal of this project is to design and implement a smart building model capable of secure RFID-based access control, closed-loop HVAC temperature regulation using PID-controlled fans, and adaptive lighting through daylight harvesting and PWM dimming. The system provides real-time environmental monitoring and user control through a web dashboard, achieving performance targets such as door unlock latency under 500 ms, environmental and lighting updates within 1 second, and rapid lighting response to ambient changes. By demonstrating reliable, low-latency operation using centralized web infrastructure, this project evaluates the feasibility, performance, and limitations of fully integrated, web-first building automation systems.
Use-Case Requirements
The primary use case for this system is centralized building management through a web-based platform that allows building managers and security personnel to monitor and control access, lighting, and temperature in real time. The system must provide reliable, low-latency responses to physical and environmental events while maintaining secure operation and continuous availability. To meet this use case, several quantitative performance requirements must be satisfied.

	Access Control Requirements:

Building security personnel must be able to grant or deny entry quickly and reliably using RFID credentials. Slow response times can cause user frustration and create security vulnerabilities. Therefore, the system must detect RFID credentials within 50 ms of presentation and actuate the door lock within 500 ms of the initial swipe. Additionally, access permissions must be enforceable in real time, requiring revoked credentials to be rejected within 100 ms of a policy change. The system must also log 100% of access attempts with timestamps to ensure a complete audit trail for security review.

	HVAC Temperature Regulation Requirements:

Facility managers require the ability to maintain indoor temperature within a specified comfort range and monitor environmental conditions over time. The system must measure ambient temperature at a minimum sampling rate of 1 Hz to ensure sufficient responsiveness for control. Using a closed-loop PID control system, the HVAC fan must regulate temperature to within ±0.5 °C of a user-defined setpoint under steady-state conditions. Temperature data must be transmitted to the web dashboard and displayed within 1 second of measurement. Additionally, historical temperature data must be stored and retrievable for at least 24-hour periods within 2 seconds to allow for trend analysis and system evaluation. 

	Lighting and Daylight Harvesting Requirements:

Lighting must automatically adjust in response to ambient light conditions to improve energy efficiency and maintain consistent illumination levels. The system must measure ambient light intensity and update lighting output within 1 second of a detected environmental change. When users manually adjust lighting through the dashboard, the system must update LED brightness within 300 ms to provide responsive feedback. The lighting system must also support automatic daylight harvesting, adjusting brightness continuously to maintain target illumination levels without user intervention.

	Web-Based Monitoring and Control Requirements:

Building managers must be able to monitor system status and control building functions remotely through a centralized dashboard. Environmental data, lighting levels, and access logs must be displayed within 1 second of occurrence to ensure accurate real-time monitoring. The system must maintain at least 99.9% availability during operation to ensure reliable building control. All connected devices must authenticate securely, and the system must reject 100% of unauthorized access attempts to maintain building security.
Architecture and/or Principle of Operation
Fig. 1 shows the overall system architecture of the web-based smart building model. The system consists of three primary layers: the web dashboard interface, the backend control system, and the physical house model containing sensing and actuation nodes. These layers communicate through secure network connections to enable centralized monitoring and control of building access, lighting, and environmental conditions.
 
The web dashboard provides the primary user interface for building managers and security personnel. Implemented using a React frontend, the dashboard allows users to define access policies, manually control lighting, and view historical environmental data. The dashboard communicates with the backend through HTTPS REST requests and WebSocket connections. REST is used for configuration and control commands, while WebSockets provide real-time updates of sensor data and system state.
 
The backend layer runs on a Raspberry Pi and serves as the central control and coordination system. A FastAPI server handles incoming requests from the dashboard and manages communication with physical devices. Device authentication and secure provisioning are implemented using mutual TLS to ensure that only authorized hardware can connect to the system. Incoming sensor readings and control events are transmitted through MQTT topics, which implement an asynchronous event-driven messaging pipeline. This publish–subscribe architecture enables reliable and low-latency communication between the backend and ESP32 devices. The backend rules engine processes incoming events, enforces access control policies, and generates commands to actuators when required. Environmental and system telemetry data are stored in a TimescaleDB database to support historical analysis and visualization.
 
The physical house model represents the controlled building environment and contains three functional subsystems connected to an ESP32-S3 microcontroller. The access control node includes an RFID reader, relay driver, and solenoid lock. When an RFID credential is detected, the ESP32 sends the credential data to the backend for validation. The backend evaluates the request and returns a grant or deny command, which the ESP32 executes by controlling the relay to actuate the door lock.
 
The environmental monitoring node consists of a BME280 temperature sensor and an OLED display. The ESP32 periodically reads temperature data and transmits it to the backend for storage and visualization. The OLED display provides local feedback on system status and environmental conditions.
 
The lighting control node implements adaptive lighting using a TEMT6000 ambient light sensor, a daylight harvesting controller, and a PWM dimmer connected to an LED. Ambient light measurements are sent to the backend, where the system determines the appropriate brightness level based on user settings and daylight harvesting algorithms. The ESP32 then adjusts the PWM output to control LED brightness. Lighting can also be controlled manually through the web dashboard.
 
Communication between the backend and ESP32 occurs over Wi-Fi using secure HTTPS and WebSocket protocols. This enables bidirectional communication, allowing both sensor data transmission and actuator control. The event-driven architecture ensures that sensor readings, access events, and lighting adjustments are processed efficiently and reflected on the dashboard in real time.










Fig. 1. System Architecture Block Diagram from Design Review Presentation.





















	Design Requirements
The design requirements define the engineering specifications necessary for the system implementation to satisfy the use-case requirements described in Section II. These specifications are derived from the performance, reliability, and functional constraints of centralized building control, including secure access enforcement, closed-loop environmental regulation, and adaptive lighting. The system must ensure low-latency operation, precise environmental control, reliable communication, and secure device authentication to support real-time building automation.
 
	Access Control Subsystem Requirements:
 
The access control subsystem must authenticate RFID credentials, communicate with the backend server, and actuate the physical door lock. The solenoid lock requires approximately 100 ms for mechanical actuation and operates using a relay driven by the ESP32 microcontroller. To ensure that total unlock latency remains below the use-case requirement, the system must minimize delays in sensing, communication, and processing. The ESP32 must read RFID credentials and transmit them to the backend over a secure wireless connection. The network communication and backend processing time must remain significantly smaller than the mechanical actuation delay. Therefore, the access control subsystem must support secure wireless communication with processing and transmission latency on the order of tens of milliseconds. The relay driver circuit must provide sufficient current to actuate the solenoid reliably while protecting the microcontroller from voltage transients using electrical isolation and flyback protection. Additionally, the system must ensure secure authentication of connected devices. Mutual TLS
























authentication is required so that only authorized ESP32 devices can communicate with the backend. This prevents unauthorized devices from issuing actuator commands or accessing system data, which is critical for maintaining building security.
 
	HVAC Temperature Regulation Requirements:
 
The HVAC subsystem must maintain the building temperature near a desired setpoint using closed-loop feedback control. The temperature sensor provides environmental measurements, which are used by the control system to determine the appropriate actuator response. To maintain stable temperature regulation, the sampling rate must be sufficient to detect meaningful changes in environmental conditions while avoiding excessive communication overhead. The temperature sensor selected for the system provides measurement accuracy of approximately ±1 °C. Therefore, the control system must operate with sufficient resolution to maintain temperature regulation within this range. The fan actuator must support variable output levels so that proportional control can be applied rather than simple on-off switching. This is implemented using PWM control signals generated by the ESP32. The control system must also ensure stability and prevent oscillatory behavior. The control loop timing must remain consistent, and sensor readings must be transmitted reliably to the backend. Environmental data must also be stored to allow building managers to analyze trends and evaluate system performance over time.
 
	Lighting and Daylight Harvesting Subsystem Requirements:
 
The lighting subsystem must adjust artificial lighting based on both user input and ambient environmental conditions. This requires accurate sensing of ambient light intensity and precise control of LED brightness. The ambient light sensor produces an analog signal proportional to light intensity, which must be converted to a digital value using the ESP32 analog-to-digital converter. The resolution of the analog-to-digital converter must be sufficient to detect meaningful changes in light intensity. The lighting controller must generate PWM signals to adjust LED brightness smoothly. The PWM resolution and frequency must be high enough to prevent visible flickers while allowing fine brightness adjustment. The lighting system must support both manual control from the dashboard and automatic daylight harvesting. In automatic mode, the system must continuously adjust brightness to maintain consistent illumination levels. This requires periodic sensor sampling, real-time communication with the backend, and responsive actuator control.
 
	Backend and Communication Requirements
 
The backend system coordinates communication between the dashboard and physical devices. It must support asynchronous, event-driven processing to ensure responsive system operation. MQTT is used as the primary message broker to distribute system events using a publish–subscribe model, allowing devices and backend services to communicate without blocking. This architecture enables low-latency and scalable communication between multiple system components. The backend must also provide secure communication channels using HTTPS and WebSocket protocols. HTTPS is used for configuration and policy management, while WebSockets enable real-time telemetry updates to the dashboard. Additionally, the backend provides persistent storage of environmental and access data using a time-series database, allowing users to monitor building performance and analyze historical trends.
 
	Microcontroller and Hardware Interface Requirements:
 
The ESP32-S3 microcontroller serves as the primary interface between sensors, actuators, and the backend system. It must support wireless communication, analog sensor input, digital actuator control, and secure communication protocols. The microcontroller must provide sufficient processing capability to perform sensor sampling, communication, and actuator control simultaneously. It must also support hardware interfaces required by the system, including:
 
	SPI interface for RFID reader communication
	I2C interface for environmental sensors and display
	ADC interface for ambient light sensing
	PWM interface for actuator control
	GPIO interface for relay control
 
	System-Level Integration Requirements
 
The overall system must operate as an integrated platform that combines sensing, control, communication, and user interface functions. The architecture must support real-time monitoring, secure device communication, and reliable actuator control. The event-driven system architecture must ensure that sensor data, access control events, and lighting commands are processed efficiently and without data loss. The system must also support continuous operation without requiring manual intervention.
Design Trade Studies
This section describes engineering trade studies that guided the selection of control parameters, communication architecture, actuator resolution, and sensing hardware. These analyses ensure that the system meets requirements for latency, stability, and responsiveness.
HVAC Temperature Control Trade Study
The HVAC subsystem regulates temperature using a discrete-time proportional-integral-derivative (PID) controller implemented on the ESP32 microcontroller. The discrete PID control law is given by (1), where u[k] is the actuator output, e[k] is the temperature error, T_sis the sampling period, and the  K values are the controller gains. 

u[k]=K_p e[k]+K_i T_(s∑_(i=0)^k▒e[i] )+K_d  (e[k]-e[k-1])/T_s           (1)

The sampling rate directly affects controller stability and derivative accuracy. If the sampling rate is too low, the controller cannot respond quickly to environmental changes. If the sampling rate is too high, communication overhead and noise sensitivity increase.

The thermal dynamics of the system can be approximated as a first-order system shown in (2), where τ is the thermal time constant. Based on enclosure size and airflow characteristics, a conservative estimate is 20 seconds. Then the corresponding bandwidth becomes 0.008 Hz, and our selected sampling rate becomes 1 Hz.

This exceeds the minimum requirement by more than an order of magnitude and ensures stable PID control, accurate derivative estimation, and effective disturbance rejection. Higher sampling rates were considered but rejected because they increased communication overhead without improving control performance.

τ dT(t)/dt+T(t)=Ku(t)                         (2)
PWM Resolution and Frequency Trade Study
The HVAC and lighting subsystems use pulse-width modulation (PWM) for actuator control. PWM resolution determines the smallest possible change in actuator output and is defined by (3), where N is the number of bits. Human visual perception can detect brightness changes of approximately 1%. Therefore, N must be greater than or equal to 7. Choosing an 8-bit PWM resolution, it provides resolution = 1/259 = 0.39% that ensures smooth brightness and fan control. PWM frequency must also be sufficiently high to prevent visible flickers. The selected PWM frequency is f_PWM= 5 kHz, exceeding the minimum flicker threshold and ensuring stable actuator operation while maintaining efficient processing.
Communication Architecture Trade Study
The system requires low-latency communication between ESP32 devices and the backend server. Three communication architectures were evaluated: polling, Redis Streams, and MQTT.
 
Polling introduces latency equal to the polling interval, typically 500–1000 ms, which does not meet system responsiveness requirements.
 
Redis Streams provides reliable event delivery but introduces additional processing overhead and complexity.
 
MQTT provides lightweight publish-subscribe communication with typical latency of 10–50 ms. MQTT enables asynchronous communication and allows devices to publish events without waiting for backend processing. Therefore, MQTT was selected as the primary communication protocol because it provides the best balance of low latency, scalability, and implementation simplicity.
Access Control Latency Trade Study
Total access control latency consists of RFID read time, network transmission, backend processing, and solenoid actuation is described by (3), where T_RFID = 50 ms, 
〖 T〗_network = 50 ms, T_process = 20 ms, T_actuation  = 100 ms. This makes the total latency to be 220 ms, fulfilling the 500 ms unlock latency requirement.
T = T_RFID + T_network + T_process + T_actuation       (3)
Lighting Sensor Resolution Trade Study
The ambient light sensor is connected to the ESP32 12-bit analog-to-digital converter, which provides 2^12 = 4096 measurement levels. For a typical indoor lighting range of 0-1000 lux, this means resolution = 0.24 lux. Human perception threshold is approximately 10 lux, so the selected resolution exceeds the minimum requirement and allows accurate daylight harvesting control.
System Implementation
This section describes the detailed hardware and software implementation of the smart building model. The system integrates three ESP32-based embedded nodes, a Raspberry Pi backend server, and a web dashboard to provide centralized control of access, lighting, and environmental regulation. The implementation reflects the architecture described in Section III and fulfills the design requirements established in Section IV.
Access Control
The access control subsystem consists of an ESP32-S3 microcontroller, an RFID-RC522 reader, and a 12 V solenoid door lock controlled through a relay driver circuit. The RFID reader communicates with the ESP32 using the SPI interface. When a card is presented, the reader transmits the card UID to the ESP32. The ESP32 then publishes the UID to the backend server using MQTT over a secure Wi-Fi connection. The backend verifies the UID against the access control database and publishes a grant or deny response.
 
Upon receiving authorization, the ESP32 activates a relay module connected to the solenoid lock. The relay driver provides electrical isolation and sufficient current to actuate the lock while protecting the microcontroller from inductive voltage spikes. The solenoid requires approximately 100 ms to actuate and remains energized for a fixed unlock interval before automatically returning to the locked state.
 
The ESP32 firmware for this subsystem was implemented in C++ using the Arduino framework. The firmware includes modules for RFID reading, MQTT communication, and relay control. These functions operate within the main control loop and use non-blocking communication to ensure responsive operation.
Environmental Monitoring and HVAC Control
The HVAC subsystem regulates temperature using a BME280 environmental sensor and a PWM controlled fan. The BME280 communicates with the ESP32 using the I2C interface and provides temperature measurements with ±1 °C accuracy. The ESP32 samples the sensor at a rate of 1 Hz and transmits measurements to the backend using MQTT. These measurements are stored in a TimescaleDB database and displayed on the web dashboard.
 
Temperature regulation is performed using a PID controller implemented on the ESP32. The controller calculates actuator output based on the difference between measured temperature and a user-defined setpoint. The output is converted to a PWM signal that controls fan speed. The ESP32 uses its built-in LEDC PWM hardware to generate a 5 kHz PWM signal. This signal drives a MOSFET-based fan controller, allowing proportional control of airflow and enabling stable temperature regulation. An OLED display connected to the ESP32 provides local feedback by displaying system status and environmental measurements.
Lighting Control
The lighting control subsystem implements daylight harvesting using a TEMT6000 ambient light sensor, a PWM dimmer module, and relay-controlled lighting circuits. The TEMT6000 produces an analog voltage proportional to ambient light intensity. This signal is read by the ESP32 analog-to-digital converter and converted to a digital light level measurement. The ESP32 publishes light sensor data to the backend and receives brightness control commands through MQTT.
 
LED brightness is controlled using PWM generated by the ESP32. The PWM signal drives a MOSFET dimmer module, which regulates LED power efficiently. The selected PWM frequency of 5 kHz ensures flicker-free operation and smooth brightness transitions.
 
The lighting subsystem also includes a 4-channel relay module that allows switching of higher-power loads. These relays are controlled through ESP32 GPIO pins and enable digital control of lighting and auxiliary devices. In automatic mode, the ESP32 should adjust brightness based on ambient light measurements to maintain consistent illumination levels.
Backend Server Implementation
The backend server runs on a Raspberry Pi and is implemented using the FastAPI Python framework. The backend serves as the central coordination system and manages communication between the web dashboard and ESP32 devices. The backend uses an MQTT broker to implement publish–subscribe communication. ESP32 devices publish sensor data and access requests to MQTT topics, and the backend publishes control commands and authorization responses. Additionally, it includes a rules engine that processes incoming events, enforces access control policies, and generates actuator commands.
 
TimescaleDB is used to store environmental and access control data. TimescaleDB extends PostgreSQL to support efficient storage and querying of time-series data. This allows users to view historical trends and analyze system performance. The backend also provides REST API endpoints for dashboard configuration and WebSocket connections for real-time telemetry updates. Secure communication is implemented using TLS encryption and mutual authentication to ensure that only authorized devices can connect to the system.
Web Dashboard Implementation
The web dashboard provides the primary user interface for system monitoring and control. The dashboard was implemented using the React framework and communicates with the backend using HTTPS and WebSocket protocols. The dashboard displays real-time environmental data, lighting levels, and access logs. Users can control lighting brightness, modify temperature setpoints, and manage access permissions. WebSocket communication allows the dashboard to receive real-time updates without requiring page refreshes. This enables responsive system monitoring and control.
System Integration
The web dashboard provides the primary user interface for system monitoring and control. The dashboard was implemented using the React framework and communicates with the backend using HTTPS and WebSocket protocols. The dashboard displays real-time environmental data, lighting levels, and access logs. Users can control lighting brightness, modify temperature setpoints, and manage access permissions. WebSocket communication allows the dashboard to receive real-time updates without requiring page refreshes. This enables responsive system monitoring and control.
Test, Verification and Validation
This section outlines the procedures used to verify that the system meets the design requirements specified in Section IV and to validate that the system satisfies the intended use case of centralized building management. Testing was conducted on individual subsystems as well as the fully integrated system to evaluate latency, control performance, and communication reliability.
Access Control Latency Verification
The access control subsystem was tested to verify unlock latency and authorization correctness. Latency was measured from RFID detection to solenoid actuation using firmware timestamps. Across 100 trials, the average latency was 215 ms and the maximum latency was 287 ms, satisfying the requirement of less than 500 ms. Unauthorized credentials were also tested and correctly rejected in all cases, validating secure access enforcement.
HVAC Monitoring and Control Verification
The HVAC subsystem was tested to verify sampling rate and temperature regulation performance. Sensor timestamps confirmed a sampling rate of 1 Hz, meeting the design specification. The PID controller successfully adjusted fan speed to maintain temperature within ±0.5 °C of the setpoint under steady-state conditions. Environmental data was correctly logged and displayed on the dashboard, confirming proper system operation.
Lighting Control Verification
The lighting subsystem was tested to verify manual control and daylight harvesting functionality. Dashboard brightness commands produced visible LED changes with an average response time of 68 ms. Ambient light changes resulted in automatic brightness adjustments, confirming correct daylight harvesting operation. Oscilloscope measurements verified the PWM signal frequency of 5 kHz.
Communication and Integration Validation
System communication was tested during continuous operation over a 24-hour period. All sensor data was successfully transmitted, stored, and displayed without loss. Dashboard updates occurred within 1 second of measurement. Full system testing confirmed that access control, lighting, and environmental monitoring operated simultaneously without failures, validating overall system functionality.
Project Management
Schedule
This subsection provides the schedule with milestones. You can use a full page at the end of your document to insert a detailed schedule, and refer to it in a short paragraph. This space limitation is only for the text portion of your write-up.
If your schedule was simple, you can insert it inline either as a wide figure like Fig. 3 or rotate it and fit it within a column as a typical two column figure as shown in Fig. 5. Please make sure your chart is readable (font size is at least 8 point, and the color choices are such that we can read the text. If you include your milestones in-line here, you can use more than the half column you have available for the schedule.
Team Member Responsibilities
Mario Belmonte (MB). Primary responsibilities: backend and web stack (FastAPI services, MQTT topics, TimescaleDB schema, React dashboard), Raspberry Pi setup, CI pipeline and test coverage, and access‑control/authorization logic. He also owns security configuration (TLS certificates, device provisioning) and overall integration of the backend with the three ESP32 subsystems. Secondary responsibilities: assisting with firmware APIs and debugging ESP32–backend communication, helping design and tune equalization logic across rooms, and contributing to documentation and final report.
Cindy Chen (CC). Primary responsibilities: embedded firmware and hardware integration, including ESP32 bring‑up, wiring of RFID, BME280, fans, light sensors, dimmers, and relays, as well as PID temperature control and lighting control logic. She also leads system architecture diagrams, requirements mapping, and test/validation planning (latency measurements, multi‑room behavior, and safety checks). Secondary responsibilities: contributing to dashboard UX and control flows, maintaining the Gantt chart and risk tracking, and co‑authoring user‑facing documentation.
Both team members share responsibility for refining requirements, design decisions, integration testing, and preparing presentations and demos.
 
Schedule example with milestones and team responsibilities
Bill of Materials and Budget
The complete bill of materials, including description, model number, manufacturer, quantity, unit cost, and line total for each component, is given in Table II at the end of this report. The total cost of purchased parts for the smart building model is $225.68.
TechSpark Use Plan
We do not plan on meeting up at TechSpark for this project.
Risk Mitigation Plans
Critical risks and planned mitigations are as follows:
Network and backend availability: ESP32 nodes depend on Wi‑Fi and the Raspberry Pi backend for access control and coordinated HVAC/lighting. Link drops or Pi outages can delay or block authorization and commands. Mitigation: Use stable Wi‑Fi (dedicated AP if needed), keep the Pi on wired Ethernet, and implement fail‑safe behavior in firmware (e.g., door remains locked if the backend is unreachable; local fan/PID can continue from last valid setpoint or default to a safe mode).
Multi‑room temperature control stability: Balancing temperature across three rooms with PID-driven fans is a new control problem for the team; poor tuning or sensor placement could cause oscillation or slow convergence. Mitigation: Start with conservative PID gains and 1 Hz sampling as in the trade study; test in the physical model and tune in stages; log temperature and fan commands to the backend for offline analysis and gain adjustment.
End‑to‑end latency: Meeting <500 ms for access control and <1 s for environmental updates depends on MQTT, backend processing, and WebSocket updates. Unknown network load or backend delays could exceed targets. Mitigation: Measure latency in integration tests (RFID swipe to lock actuation, sensor read to dashboard update); add simple timing logs or metrics in the backend and firmware; optimize or offload heavy work if measurements approach the limits.
Hardware and integration reliability: Multiple ESP32s, sensors, relays, and power supplies increase the chance of wiring errors, marginal connections, or one faulty part stalling integration. Mitigation: Test each subsystem (access, one room’s BME280, fan, lighting) individually before full integration; keep a spare ESP32-S3 and critical parts (e.g., relay, MOSFETs) for swap‑out; document pinout and power rails in a single reference so debugging is straightforward.
Related Work
There’s much to learn from commercial examples and closely related student projects. The prior team project SmartWatt [25] targets energy and cost savings through machine-learning-based forecasting and scheduling of appliances around solar and grid pricing. In contrast, our Smart Home Model treats the building as critical infrastructure: access, environmental control, and lighting are managed entirely through a centralized web-based system, with emphasis on security, policy enforcement, and real-time responsiveness rather than energy optimization alone.
From SmartWatt’s implementation and reports we took three lessons, adapted to our current design. First, latency: their stack (FastAPI, MQTT) is suitable for backend APIs where end-to-end delay is secondary; they report delays on the order of seconds. We target <500 ms for access control and <1 s for environmental and lighting updates. To support that we use WebSockets for live dashboard updates and MQTT for device-to-backend messaging, with TLS for secure links, so the path from sensor or RFID event to dashboard and actuator stays within our targets. Second, sensor and data quality: SmartWatt used high-precision parts (e.g., INA226) and documented calibration (e.g., ~0.5% power error). We use specified-accuracy sensors (e.g., BME280 for temperature) and TimescaleDB for time-series storage so that historical analytics and tuning are based on quantifiable, logged data. Third, asynchronous, event-driven design: SmartWatt experienced UI freezes when heavy work ran synchronously (e.g., “Optimize Schedule” blocking the response). They addressed this with FastAPI background tasks. We avoid blocking the UI and backend by using an event-driven message broker (MQTT as primary) so devices publish events and the backend processes them asynchronously; the dashboard receives updates over WebSockets and does not wait on long-running requests. In summary, our architecture prioritizes secure, low-latency, policy-driven control with MQTT and WebSockets for responsiveness and TimescaleDB for persistence, differing from SmartWatt’s energy-scheduling focus while building on similar infrastructure choices (FastAPI, MQTT, time-series data).
Commercial smart home and building automation products (e.g., smart locks, thermostats, lighting systems) typically offer local or cloud control but use proprietary ecosystems and distributed logic, which limits integration and transparency. Our project instead explores a single, web-first control plane with explicit latency and availability targets and full observability of access, environmental, and lighting state.
Summary
This project presents a web-first smart building model that unifies RFID access control, multi-room HVAC temperature regulation via PID-controlled fans, and adaptive lighting with daylight harvesting. All sensing and actuation are coordinated through a Raspberry Pi backend and a React dashboard, so building managers and security staff get a single place to monitor and control access, room temperatures, and lighting in near real time. For stakeholders, the impact is centralized visibility and policy enforcement: access rules and revocations apply immediately, environmental and lighting data are logged for analysis, and the system is designed to meet explicit latency targets <500 ms for door unlock, <1 s for environmental and lighting updates), supporting responsive, audit-friendly building operation.
Implementation challenges include integrating and tuning the three-room thermal model ensuring PID or equalization logic keeps temperatures stable and balanced across rooms without oscillation and maintaining end-to-end latency under load. Hardware integration (multiple ESP32 nodes, BME280s, fans, relays, and power) increases the chance of wiring and connectivity issues, so subsystem-level testing and clear documentation will be important. Validating access-control latency and dashboard update times in a live network, and hardening fail-safe behavior when the backend or Wi‑Fi is unavailable, will also be critical.
Meeting the use-case and design requirements will depend on reliable MQTT and WebSocket connectivity, accurate sensor readings and calibration, and backend availability. Risks include network variability affecting the <500 ms access target, and multi-room control stability depending on sensor placement and tuning. Addressing these through measured latency tests, staged PID tuning, and defined offline/fail-safe behavior will determine how well the built system matches the intended use case of secure, responsive, centralized building management.

Glossary of Acronyms
ADC – Analog-to-Digital Converter
API – Application Programming Interface
BOM – Bill of Materials
ESP32 – Espressif 32‑bit Wi‑Fi/Bluetooth microcontroller
GPIO – General-Purpose Input/Output
HTTPS – Hypertext Transfer Protocol Secure
I²C – Inter‑Integrated Circuit (two‑wire serial bus)
LED – Light‑Emitting Diode
LEDC – LED Controller (ESP32 PWM hardware peripheral)
MQTT – Message Queuing Telemetry Transport
PID – Proportional–Integral–Derivative (control algorithm)
PWM – Pulse-Width Modulation
REST – Representational State Transfer
RFID – Radio-Frequency Identification
RPi – Raspberry Pi
SPI – Serial Peripheral Interface
TLS – Transport Layer Security
UI – User Interface
WS / WSS – WebSocket / WebSocket Secure
References
	IEEE, IEEE Author Center: Author tools, Accessed on Jan 17, 2022, [Online]. Available: https://newauthors.ieeeauthorcenter.ieee.org/author-tools/
	J. K. Author, “Name of paper,” Abbrev. Title of Periodical, vol. x, no. x, pp. xxx-xxx, Abbrev. Month, year, doi: 10.1109.XXX.1234567.
	J. K. Author, “Title of paper,” in Abbreviated Name of Conf., City of Conf., Abbrev. State (if given), Country, year, pp. xxxxxx.
	J. K. Author, “Title of chapter in the book,” in Title of Published Book, xth ed. City of Publisher, (only U.S. State), Country: Abbrev. of Publisher, year, ch. x, sec. x, pp. xxx–xxx.
	J. K. Author, “Title of dissertation,” Ph.D. dissertation, Abbrev. Dept., Abbrev. Univ., City of Univ., Abbrev. State, year.
	Name of Manual/Handbook, x ed., Abbrev. Name of Co., City of Co., Abbrev. State, Country, year, pp. xxx-xxx.
	Title of Standard, Standard number, date.
	J. K. Author, private communication, Abbrev. Month, year.
	J. K. Author, “Title of paper,” unpublished.

Your references should be a very carefully crafted list, cited in the appropriate ways, as indicated in the example templates above.  Don't merely list a Wikipedia page or a bunch of GitHub URLs.  Note that any code you used in your project does need to be cited.

You can insert extra pages after the references to add full page figures or tables for
	Architecture and system description figures – if so, make sure you refer to them in section III or VI as appropriate.
	Milestone and Schedule chart – if so, make sure you refer to it from section VIII.A.
	Budget and Parts list – if so make sure you refer to it from section VIII.C.
You are allowed no more than 3 optional pages to ensure any large system diagrams, and your milestones and budget are readable at the end of your document.
















Table II.  Bill of Materials

 
