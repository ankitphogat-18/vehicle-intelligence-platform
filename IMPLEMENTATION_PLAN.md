# Implementation Plan

## Phase 1 — Project Foundation

Create:

client/
server/

Frontend:

React + JavaScript

Backend:

Node.js + Express.js

Database:

MongoDB

Set up:

- environment configuration
- API structure
- frontend routing
- backend server
- MongoDB connection
- basic error handling

---

# Phase 2 — Authentication

Implement:

- login
- registration
- JWT authentication
- protected routes
- role-based access

Roles:

citizen
police
admin

---

# Phase 3 — Database Models

Create MongoDB models for:

User
Vehicle
VehicleSighting
Camera
Alert
Investigation
Incident
StolenVehicleCase
TrafficRecord
AuditLog

Keep schemas simple and practical.

---

# Phase 4 — Simulated Camera Network

Create a simulated camera system.

Support:

- multiple cameras
- camera locations
- camera type
- simulated vehicle detections
- timestamps
- direction
- plate
- vehicle attributes

Create a page showing camera activity.

Use prerecorded video or simulated observation data.

Do not require physical hardware.

---

# Phase 5 — ANPR / OCR

Implement the ANPR workflow.

Input:

vehicle image/frame

Output:

plate
confidence
vehicle attributes
timestamp
camera

Support multiple vehicles/lane observations.

Include a mechanism to evaluate OCR results against test data.

---

# Phase 6 — Vehicle Linking

Implement vehicle observation linking.

Use:

- plate
- vehicle type
- make
- model
- colour
- appearance attributes
- time
- location

Produce a vehicle identity / potential match.

---

# Phase 7 — Trajectory Engine

Given a vehicle:

1. find sightings
2. order by timestamp
3. identify cameras
4. calculate movement
5. create route sequence
6. display trajectory on map

---

# Phase 8 — GIS

Use:

Leaflet
OpenStreetMap

Implement:

- camera markers
- vehicle sightings
- trajectory lines
- alerts
- heatmap
- restricted zones

---

# Phase 9 — Traffic Analytics

Implement:

- vehicle count
- route density
- average speed
- traffic heatmap
- traffic flow trends
- congestion indicators

Use Recharts for graphs.

---

# Phase 10 — Alert Engine

Implement objective rules:

- stolen vehicle
- watchlist
- wrong-way
- restricted zone
- possible plate clone
- impossible travel
- incident association
- significant predefined trajectory anomaly

Alerts must include:

severity
reason
confidence
vehicle
location
timestamp
evidence

---

# Phase 11 — Stolen Vehicle System

Citizen:

- register vehicle
- report stolen

Police:

- view stolen vehicles
- see potential matches
- inspect evidence
- investigate

Support changed plate detection through appearance matching.

---

# Phase 12 — Investigation Mode

Create a dedicated investigation page.

Show:

- vehicle information
- sightings
- trajectory
- map
- evidence
- alerts
- confidence
- timeline
- investigation notes

Allow:

- verify
- reject
- investigate
- close

---

# Phase 13 — Traffic Violations

Add evidence workflows for:

- wrong-way
- red-light/stop-line
- helmet violation where supported by available visual data
- speeding where reliable data exists

The prototype should generate evidence records.

Do not claim that the prototype can legally issue real fines.

---

# Phase 14 — Demo Scenarios

Create deterministic demo scenarios.

Scenario 1:
Normal journey.

Scenario 2:
Stolen vehicle.

Scenario 3:
Changed plate.

Scenario 4:
Possible plate clone.

Scenario 5:
Wrong-way.

Scenario 6:
Restricted zone.

Scenario 7:
Traffic congestion.

---

# Phase 15 — UI/UX

Create an enterprise-grade command-center interface.

Important screens:

- Login
- Police Dashboard
- Camera Network
- Vehicle Search
- Vehicle Details
- Trajectory Investigation
- Alerts
- Investigation Mode
- Traffic Analytics
- Citizen Dashboard
- Vehicle Registration
- Stolen Vehicle Report

Prioritize functionality and clarity.

---

# Phase 16 — Testing

Test:

- authentication
- authorization
- APIs
- database
- vehicle search
- trajectory
- map
- alerts
- stolen vehicle workflow
- analytics
- demo scenarios

Fix errors before moving forward.

---

# Phase 17 — Final Polish

Improve:

- responsiveness
- loading states
- empty states
- error messages
- accessibility
- visual hierarchy
- dashboard polish
- demo experience

Do not rewrite stable functionality unnecessarily.

---

# Development Order

Follow phases sequentially.

Do not implement advanced features before the foundation is stable.

After each major phase:

1. run application
2. test
3. fix errors
4. verify existing features
5. continue

Do not ask unnecessary questions.

Use reasonable decisions based on PROJECT_RULES.md and PROJECT_SPEC.md.