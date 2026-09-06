# Project Specification

# City-Wide Vehicle Intelligence & Investigation Platform

## Problem

Modern cities have many CCTV and ANPR cameras, but camera systems often operate as isolated sources.

A vehicle seen at one location may be difficult to trace across the city.

The platform will connect authorized vehicle observations into a unified city-wide intelligence system.

---

# 1. High-Precision OCR / ANPR

The system receives vehicle observations from multiple camera sources.

For each vehicle observation, the system should attempt to determine:

- license plate
- plate confidence
- vehicle type
- make
- model
- colour
- timestamp
- camera
- location
- direction

The system should support multiple vehicles and lanes.

The prototype should demonstrate multi-lane vehicle processing.

OCR accuracy must be measured against test data.

Do not claim greater than 90% accuracy unless the prototype has actually demonstrated it on an appropriate test dataset.

---

# 2. Multi-Camera Trajectory Reconstruction

Users can search for a vehicle.

Example:

Vehicle:
HR26AB1234

The system returns:

10:05 - Camera A
10:17 - Camera B
10:29 - Camera D
10:47 - Camera F

The system plots these sightings chronologically on a city map.

Each sighting contains:

- camera
- location
- timestamp
- direction
- plate
- confidence

The trajectory should visually connect the sightings.

---

# 3. City Traffic Analytics

The dashboard must provide:

## Traffic Heatmap

Display vehicle density geographically.

## Average Speed

Estimate vehicle speed between camera observations where suitable.

## Route Density

Display frequently travelled routes.

## Traffic Flow Trends

Show vehicle counts over time.

Examples:

- morning peak
- afternoon
- evening peak
- night

## Congestion Detection

Identify locations where:

- vehicle density is high
- average speed is low
- flow changes significantly

---

# 4. Alert System

The platform continuously evaluates vehicle observations.

Alerts include:

### Stolen Vehicle

A reported stolen vehicle is detected.

### Watchlist

A vehicle matches an authorized watchlist.

### Possible Plate Clone

The same plate appears at geographically incompatible locations within an impossible time interval.

### Wrong-Way

Vehicle movement conflicts with road direction.

### Restricted Zone

Vehicle enters an authority-defined restricted area.

### Incident Association

Vehicle appears near an active incident location/time.

### Significant Trajectory Anomaly

Vehicle movement violates a predefined objective rule.

Every alert must show evidence.

---

# 5. Vehicle Re-identification

When license plate information is unavailable or appears changed, compare vehicle appearance.

Signals may include:

- make
- model
- colour
- vehicle type
- body shape
- visible damage
- stickers
- rims
- roof accessories
- other persistent visual characteristics

The system returns:

Potential Match: 82%

Human verification required.

---

# 6. Stolen Vehicle Citizen Portal

Citizen creates an account.

Citizen registers vehicle.

Vehicle record contains:

- registration number
- make
- model
- colour
- vehicle type
- verification status

Citizen can select:

REPORT VEHICLE STOLEN

The vehicle status becomes:

STOLEN — ACTIVE CASE

The system searches subsequent observations for potential matches.

---

# 7. Investigation Mode

Authorized police user selects an alert or vehicle.

The investigation screen shows:

- vehicle identity
- plate
- confidence
- vehicle appearance
- sightings
- camera locations
- timestamps
- trajectory
- map
- related alerts
- supporting evidence
- possible stolen-vehicle match
- possible plate-clone indicators

The investigator can:

- mark under investigation
- verify match
- reject match
- add notes
- close investigation

---

# 8. Camera Network

The platform supports:

- ANPR cameras
- fixed CCTV cameras
- PTZ cameras
- traffic cameras
- enforcement cameras
- toll/checkpoint cameras
- other authorized camera sources

The prototype will simulate these sources.

No physical hardware is required.

---

# 9. External Data

The architecture should support authorized external data such as:

- toll/checkpoint records
- authorized traffic systems
- participating private camera sources

For the prototype these sources will be simulated.

---

# 10. Dashboard

Police dashboard should contain:

- active alerts
- high priority alerts
- live/simulated camera activity
- vehicle search
- city map
- traffic heatmap
- traffic analytics
- recent vehicle sightings
- investigation cases

---

# 11. Citizen Dashboard

Citizen dashboard should contain:

- registered vehicles
- vehicle verification
- stolen vehicle reporting
- active stolen cases
- case status
- relevant notifications

---

# 12. Security

Implement:

- JWT authentication
- role-based authorization
- protected APIs
- audit logs

Roles:

- citizen
- police/traffic officer
- supervisor/admin

---

# 13. Prototype Data

Use generated/simulated data.

Example cameras:

CAM-001
CAM-002
CAM-003
CAM-004
CAM-005
CAM-006

Generate realistic vehicle sightings across these cameras.

The demo should contain several scenarios:

1. Normal vehicle journey
2. Stolen vehicle detected
3. Changed plate vehicle detected
4. Possible plate cloning
5. Wrong-way event
6. Restricted-zone entry
7. Traffic congestion
8. High-density traffic period

---

# 14. Demo Story

The main demonstration should tell this story:

A vehicle is reported stolen.

The city system continues watching all authorized camera feeds.

The stolen vehicle is detected.

The system notices that the plate does not match the registered plate.

Vehicle appearance still produces a strong potential match.

The system generates an alert.

The investigator opens the alert.

The platform displays:

- evidence
- confidence
- camera
- timestamp
- trajectory
- map

The investigator follows the vehicle's city-wide movement.

The system also demonstrates traffic analytics and another anomaly such as possible plate cloning.

The human investigator makes the final decision.