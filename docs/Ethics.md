# Ethics Assignment - Mario Belmonte

## Step 1: Reading and Reflection

### 1. Why does Langdon Winner think artifacts have politics?
= Langdon Winner's main claim is that technology isn't neutral by default as one would normally believe, but rather inherently societal influences. There's 2 forms of this, one where the tech has its influence pushed into its creation, and one where the tech is incapable of functioning as intended unless it inhabits a specific social environment. 
= A memorable example of how design choices embed power/authority is the low-hanging overpasses of Long Island, New York. At the time, the lower class relied heavily on public transit. This meant that through the planning of these constructions they were able to segregate by class and discriminate in favor of those who owned their own vehicles. 
= Tech/structures like these can be semi-permanent. This is impertinent when considering that their presence can set forth a new standard in the affected area. 

### 2. Technology in your lifetime with a political outcome
= What affects me the most is the never-ending dopamine rush I get when scrolling through YouTube shorts and Instagram reel feeds. They've encroached on my life to the point where hours will be wasted without that being my intention. Part of the blame falls on me but what I want to focus on are the recommendation algorithms. 
= Building a recommendation algorithm that optimizes retention is in it of itself influentially polarizing. As humans, the type of content that provokes the most reaction is violence and empathy. 
= Being capable of manufacturing tailored algorithms means you can also choose whether to divide or unite the people. Echo chambers affirming similar destructive political beliefs can form. Whether this continues is entirely up to the engineers and their rich patrons. Power is served to those who can afford it through the capacity for mass subliminal influence. 

### 3–5. Emerging technology: Facial recognition for access control and public surveillance
#### 3. Technology
= Facial recognition tech uses cameras with machine learning software trained on countless tagged videos of people's faces to identify others. It compares the analyzed facial vectors to those stored in a database to get their identity. 
= Access control is an application of facial recognition that's often integrated into door readers, cell phones, and laptops. When someone approaches, the device snaps a picture of their face, matches them to a database, and either grants or denies access without requiring some sort of a physical token or password. 
= Facial recognition software excels at public surveillance. When integrated into street cameras, campuses, and any other public space cameras, the video streams are scanned live through something like a Kafka stream. If anyone's face matches that of one on a watch list, it's possible to track them down. 

#### 4. Ideal users and ideal use case
= Building and campus security need this management system for access to offices, labs, dormitories, etc. 
= Law enforcement can make heavy use of surveillance systems to expedite the searching process for criminals gone into hiding or even on the run. 
= At the enterprise level, the IT department and device manufacturers utilize facial authentication for their products like phones and laptops to protect users' personal data. 
= Imagine a research building using facial recognition software on their doors for security purposes. Managing access into restricted areas, only authorized staff are admitted into the database. The system is configured to process their facial vectors and cross reference the secured database within an internal server. The system should verify their face and unlock the door in under a second to avoid scenarios when carrying equipment during an urgency are lagging behind. 
= Users benefit by having a fast, hands-free entry way and avoiding the problem of losing their access badges. Security teams have better audit logs to parse through for tracking individuals. 

#### 5. Most vulnerable and worst‑case scenario
= Imagine a situation like China where there's 5 cameras set up at every street corner with facial id tracking software. As of now it's used for every purpose already mentioned previously, but it's also misappropriated for setting up systems like social credit scoring where every little thing you do in public could potentially cause an infraction that goes on your permanent record and affects every aspect of your life. Sounds good on paper, but in practice this causes the common public to develop a feeling of paranoia and allows for unjust rulings to go through, biased towards those who pay for their infractions to be ignored. 
= Racial and ethnic minority groups are going to have higher error rates due to disproportionate exposure and representation for the system to learn from. Activists, journalists, and protest participants can be identified and marked as risks to the country for going against the standard which could lead to mistreatment. 
= I think most of the fault should fall on the city operators and police leaders for choosing to deploy, setting the various thresholds, deciding the watch list, and appealing processes to prevent faults. 

### 6. Safety issues from “What is Red Teaming?”
= We hear about misuse, robustness failures, social harms, security behavior, and goal miss-specification. 
= Bias: This is about systems that perform worse on certain demographic groups which lead to unfair error rates. 
= Contextual failures: We lose accuracy with poor lighting, angles, the inclusion of motion blur, or low-res specs. It's common in public camera deployments and rases false positives/negatives which puts every piece of evidence gathered through it into question. 
= A standard test can show that the system works in a controlled environment. Red-teaming probes every aspect: how it fails, who, and how it can be exploited. Facial recognition software introduces high-stakes risks that can potentially allow for unregulated mass surveillance. We need edge-case testing, it's just too important for hasty deployment. 

### 7. Power/interest stakeholder chart
= Stakeholder 1: Intended Users
  * Power: High - They decide whether to use the system, its configs on a daily basis, and what actions should be taken based on the matches.
  * Interest: High - This tool directly affects operations, liability, workload, and perceived effectiveness.
  * Grid position: High power, high interest.
= Stakeholder 2: Technology Designers
  * Power: High - Being in direct handling of the system's capabilities and limits, it's easy to influence how it's marketed and deployed.
  * Interest: Medium - They care about the adoption of the tech, the reputation, and business ventures.
  * Grid position: High power, medium interest
= Stakeholder 3: Society at Large
  * Power: Low - As individuals, the common people have limited control. Something could potentially come from unified collective voting, advocacy, lawsuits, and media attention but this is comically unachievable. 
  * Interest: High - The outcomes affect privacy, encroach on freedom of movement and free speech, and inject a risk of discrimination. 
  * Grid position: Low power, high interest.

### 8. Global, economic, environmental, and societal context
For **facial recognition for access control and public surveillance**:

#### a. Global context
= Cross-border impacts/inequality: Large facial recognition systems are often developed and hosted by companies in high-income countries which inherently introduces class bias. Additionally, by deploying said models to undeveloped governments in remote regions, this introduces problems that go unhandled due to a lack of legal safeguards. 
= Face data collected in one country could be reused elsewhere with/without consent since it's all stored through a cloud database that can be easily monopolized. 
= * Restrict the export of the tech to countries with inhumane regimes to prevent ailment towards worsening the people's quality of life.
  * Instead of sending the data off to a remote cloud server for processing, we can opt for local, on-device processes that favor privacy.

#### b. Economic context
= Cities, campuses, and companies pay for hardware, software licenses, and maintenance on a consistent basis. A small set of vendors and cloud providers have managed to establish themselves to collect most of the revenue available in the market. Lower paid jobs like a security guard can now be automated by cameras; I predict lower instances of low skill jobs and fewer high paid technical/admin roles. 
= High costs and proprietary API microservices can inadvertently cause heavy reliance on other companies to maintain uptime. Small orgs and poor regions wouldn't be capable of affording the best infrastructure for their business.
= * Integrate pricing and governance that contractually tie revenue with responsible use. 
  * Retraining and up-skilling should be prioritized over firing and rehiring. 

#### c. Environmental context
= Training and running these large facial recognition models, constantly streaming video and storage, consumes a significant amount of energy. 
= We're provided with high uptime, high res, multi-camera analytics but raise emissions and hardware e-waste.
= * Opting for modular, repairable hardware. 
  * Set limits to stop constant unnecessary long-term storage and processing. 

#### d. Societal context
= Facial recognition normalizes being identified and tracked in public. This idea of inherent anonymity when minding your own business is dissolved. Communities, neighborhoods may feel as though they're under constant watch which could lead to a deeper mistrust of institutions. This could affect the general public's autonomy and democratic participation in fear of persecution. 
= The global exporting of surveillance tech, concentrated vendor power, and high energy use, all serve to amplify societal harms when these systems are deployed with poor governance in place. An infrastructure built to secure can cause power imbalances and widen the gaps between groups/countries. 
= * Ban real-time public surveillance and mandate transparency reports showing the audit logs.
  * Establish independent review boards for cases like these and clear appeal processes for people who are wrongly flagged by the system. 

---

## Step 2: Project Exercise – Smart Home Building OS

### 1. Problem your project seeks to solve
= Our project is marketed towards building managers looking to unify fragmented, unmanageable systems for access, lighting, and environmental control. To do this, we built a web-first control platform that serves as a smart building OS. Our system turns a scattered set of subsystems into a cohesive, scalable infrastructure that can be deployed in different rooms or buildings without per‑machine software installs.

### 2. Ideal user or customer
= The ideal users are building managers and campus facilities teams designing offices, shared workspaces, dorms, or lab buildings that lack an integrated building management system. Access‑control and safety teams benefit from having all the door events, policies, and logs in one authenticated dashboard instead of badge readers scattered throughout the building(s). This system can scale from a single academic building to a small campus or chain of buildings.

### 3. Most vulnerable to failure or misapplication
= The ones who are most vulnerable to a failure are the occupants of the building who aren't in control of the system (eg. residents, students, staff, visitors). If the RFID access system were to fail through a misconfiguration or incorrect policy setting, it can prevent people from freely entering rooms or worse, slow down emergency exits. Since our web dashboard comes with detailed logging, under the wrong hands this could be misappropriated to conduct surveillance and track individuals' routines. The people left vulnerable are those lower in the hierarchy of positions. For that reason we emphasize transparency in the logs and clear role-based permissions. 

### 4. Ideal data set vs available data
= Ideally, we'd have a long-term database set up for our per-room temperature, humidity, light measurements, occupancy, power metering, and labeled history that links specific events to sensor traces. This data would allow for the tuning of PID controllers, enable energy savings through the daylight harvesting, and improve the early detection of anomalies. Our current prototype works with a small number of sensors and nodes: BME280 environmental sensors and light sensors on ESP32‑S3 boards, plus access logs and actuation events stored in TimescaleDB. Access and environmental logs can reveal patterns about when spaces are occupied and who comes and goes, we need to treat them as sensitive data. To ethically deploy this system we'd need retention policies, limited access to logs, and clear communication to occupants about what is collected and why.

### 5. Public health, safety, and welfare

#### a. Public health
= The BME280‑based sensing allows for real‑time climate data that can warn us of overheating, poor ventilation, or HVAC failures. These issues matter more for vulnerable populations like the elderly or those with respiratory conditions. Our design uses PID‑based temperature regulation and daylight‑responsive lighting to keep conditions  stable and closer to recommended comfort levels instead of depending on manual adjustments. The web‑based architecture is meant to make the thorough sensing and control achievable with common hardware and open‑source software. There's still a trade‑off between the cost and complexity of deploying more sensors and smarter control versus using simple thermostats.

#### b. Public safety 
= Safety‑wise, the RFID access subsystem (reader, relay, and lock controlled through the backend) is one of the core deliverables. It mimics the entrance of a house or lab and is supposed to ensure that only authorized people can enter. Since the actuation is affected by a server-side authorization, an attacker who tries to tamper with an ESP32 node can't just unlock the door without going through the backend. There's also a divisive problem we face with this, defaulting doors to locked when the backend or network is down protects against unauthorized entry but could delay exit in a fire or other emergency. Our design assumes that our system sits alongside code‑compliant exit mechanisms like crash bars and that logs, health checks, and monitoring help operators detect failures early rather than discovering them only during a crisis.

#### c. Public welfare
= A centralized web‑first system that lets a small group of administrators control access and lighting schedules can improve energy efficiency and make spaces more comfortable if used well, but it can also feel overbearing or unfair if the policies aren't communicated transparently or are biased. The activity logs that promote accountability can simultaneously feel like encroaching surveillance if only administrators see them. Our blog write‑up emphasizes making audit logs visible to users where appropriate, using role‑based access control for policy changes, and designing an interface that is understandable for non‑experts so we don’t create a divide between tech‑savvy and ordinary occupants. Economically, we chose common hardware and open‑source software to keep costs low, making it more realistic for smaller organizations or schools to adopt systems that support both comfort and energy savings instead of only high‑end commercial solutions.