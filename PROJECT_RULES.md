# Project Rules

## Project

City-Wide Vehicle Intelligence & Investigation Platform for Smart India Hackathon 2026.

## Core Objective

Build a software-only city-wide vehicle intelligence platform that connects vehicle observations from multiple authorized camera sources and helps authorized police and traffic personnel investigate potentially relevant vehicles, reconstruct trajectories, detect traffic events, identify stolen vehicles, detect possible plate cloning, and analyze city-wide traffic.

The system is an investigation assistant.

Core principle:

"AI watches everything. Humans decide what matters."

The system must never automatically label a person or vehicle as criminal.

AI-generated results must be presented as:
- Potential match
- Potential violation
- Potential anomaly
- Investigation lead
- Human verification required

## Mandatory SIH Requirements

The implementation MUST explicitly include:

1. High-Precision OCR / ANPR Module
2. Multi-Camera Trajectory Reconstruction Engine
3. City Traffic Analytics Dashboard
4. Real-Time Alert System

These are mandatory and must not be removed or treated as optional.

## Technology Stack

Frontend:
- React
- JavaScript
- HTML
- CSS
- Tailwind CSS where useful

Backend:
- Node.js
- Express.js

Database:
- MongoDB

Maps:
- Leaflet
- OpenStreetMap

Charts:
- Recharts

Authentication:
- JWT

## AI

Use practical accessible/free AI models or APIs where possible.

Do not train large AI models from scratch.

Do not introduce unnecessary AI infrastructure.

## Technologies NOT to introduce without explicit approval

Do NOT introduce:

- Python
- PyTorch
- TensorFlow
- FastAPI
- PostgreSQL
- Kubernetes
- Kafka
- complicated microservices
- complicated cloud infrastructure
- TypeScript

Keep the implementation understandable for a student team familiar with React, JavaScript, Node.js and MongoDB.

## Prototype Requirement

The prototype must be 100% software.

Do NOT require:

- physical cameras
- sensors
- drones
- robots
- IoT devices
- specialized hardware

Camera feeds may be simulated using prerecorded videos or generated vehicle observation data.

External sources such as toll/checkpoint systems may be simulated through APIs or generated datasets.

## Main Modules

The application should support:

- Authentication
- Role-based access
- Police Dashboard
- Citizen Portal
- Vehicle Registration
- Stolen Vehicle Reporting
- Camera Management
- Simulated Camera Feeds
- Vehicle Detection
- ANPR/OCR
- Vehicle Sightings
- Vehicle Search
- Vehicle Re-identification
- Vehicle Trajectory
- GIS Map
- Alert System
- Investigation Mode
- Traffic Analytics
- Traffic Violation Evidence
- Toll/Checkpoint Integration

## Vehicle Intelligence

A vehicle may be linked across cameras using multiple signals:

- license plate
- vehicle make
- vehicle model
- vehicle colour
- vehicle type
- visible appearance characteristics
- damage
- stickers
- body characteristics
- location
- timestamp

Vehicle re-identification must produce a confidence score.

Never claim certainty when the system only has a probabilistic match.

## Stolen Vehicle Workflow

Citizens can:

1. Register a vehicle.
2. Verify vehicle information.
3. Report the vehicle as stolen.
4. View case status.

When a vehicle is reported stolen:

- mark the case as ACTIVE
- search new vehicle sightings
- compare plate
- compare vehicle appearance
- compare make/model
- compare colour
- compare location/time
- generate potential matches

The system must support the possibility that a stolen vehicle is using a changed or cloned plate.

## Plate Cloning / Impossible Travel

The system may compare:

Camera A:
10:05

Camera B:
10:12

If the realistic minimum travel time between cameras is 40 minutes, generate:

"Potential plate cloning or data inconsistency."

Do not automatically conclude that cloning occurred.

Possible causes include:

- cloned plate
- OCR error
- timestamp error
- data issue

## Traffic Analytics

The dashboard must include:

- traffic heatmap
- average vehicle speed
- route density
- traffic flow trends
- congestion areas
- camera activity
- vehicle counts

Where possible, speed can be estimated using distance and time between camera observations.

## Alerts

High priority:

- stolen vehicle match
- watchlist match
- possible plate cloning
- vehicle associated with active incident

Medium priority:

- restricted-zone entry
- wrong-way movement
- significant trajectory anomaly

Low priority:

- routine traffic violations
- congestion/stoppage events

Every alert must contain:

- severity
- timestamp
- vehicle
- location
- reason
- confidence
- supporting evidence
- recommended investigation action

## Human Verification

The system must always allow an authorized human operator to:

- inspect evidence
- review camera footage
- review trajectory
- review confidence
- accept/reject an AI lead
- mark alert as investigated

The system must not automatically convict or punish anyone.

## Privacy and Security

Implement:

- authentication
- role-based access
- audit logging
- protected APIs
- configurable data retention
- minimum necessary stored metadata

Do not use real personal or vehicle information in the prototype.

## UI

The UI must look like a serious enterprise/government command platform.

Prioritize:

- clear information hierarchy
- map visualization
- live-looking activity
- alert prioritization
- investigation workflow
- responsive design
- professional dashboard

Avoid unnecessary decorative UI.

## Development Philosophy

Build incrementally.

Do not rewrite working modules unnecessarily.

After each major module:

1. run the application
2. test functionality
3. fix errors
4. verify existing functionality
5. continue

Do not make unsupported claims such as 100% AI accuracy.

The prototype should demonstrate measurable functionality rather than fake claims.