# BinBuddy Spec

## Product
A smart waste-sorting station for shared spaces that identifies an item before disposal, tells the user where it belongs, detects where it was actually dropped, and reports sorting quality and station insights.

## Core value
Reduce sorting mistakes at shared bin stations and provide measurable waste-sorting insights.

## Demo scope
- Single tabletop station
- One camera view
- Three disposal zones: left / middle / right
- Zones represent recycle / compost / garbage
- Poster LEDs indicate correct disposal method
- LCD shows live feedback and station counter
- Dashboard shows station insights

## Business logic

### 1. Detection start
- Station waits in low-power mode
- Ultrasonic sensor detects a nearby person
- Detection session begins

### 2. Item identification
- Camera captures the item in hand
- System classifies the item type
- System maps the item to a disposal method using the active local rules preset
- If model confidence is below configurable threshold, image is sent to LLM fallback classification
- Final output: item type + correct disposal method

### 3. User guidance
- Corresponding LED turns on for recycle / compost / garbage
- LCD displays item and disposal method
- Session is now waiting for disposal

### 4. Disposal detection
- System continuously tracks hand zone: left / middle / right
- System continuously checks whether a hand is present
- A drop event occurs when a hand was present and then disappears
- Actual disposal zone is the most recent tracked hand zone before disappearance

### 5. Correctness logic
- Correct bin = disposal method from classification
- Actual bin = detected drop zone
- If correct bin matches actual bin, attempt is successful
- Otherwise, attempt is incorrect

### 6. Event creation
Each disposal attempt creates one event containing:
- station id
- timestamp
- predicted item
- correct disposal method
- actual disposal zone
- success / failure
- model confidence
- whether LLM fallback was used

### 7. Station counter
LCD station counter shows cumulative station activity.

Default:
- correct bin to use if session is ongoing
- total correct sorts

### 8. Metrics

#### Directly tracked and displayed
- total attempts
- total correct sorts
- first-try correct rate
- participation / compliance score
- top contamination items
- worst times of day
- bin purity by hour / day
- floor / building leaderboard

Definitions:
- **first-try correct rate** = correct sorts / total attempts
- **participation / compliance score** = overall station success rate shown as a headline score
- **top contamination items** = items most often sorted into the wrong zone
- **worst times of day** = time periods with the lowest success rate
- **bin purity by hour / day** = percent of attempts for a disposal method that were correct in that time period
- **floor / building leaderboard** = ranking of locations by compliance score

#### Insights users can infer from the data
These are not separate KPIs. Users determine them by comparing historical or grouped dashboard data.
- before / after signage impact
- behavior trend after campaigns
- compare locations / stations
- compare picture vs text signage
- compare placement near exits vs food areas
- A/B test signage / layout changes

## Dashboard business features
- view stations
- view station status and metadata
- view active rules preset per station
- view disposal event history
- view tracked metrics and historical charts
- filter by station, floor, building, location, and time range
- group and compare stations or locations
- compare signage or layout variants
- support before / after and A/B analysis using historical data

## Live monitoring page
- view live device status
- view current camera feed when active
- view current detected item
- view current disposal decision
- view latest event from the station in real time

## Configurable business rules
- supported item set
- item → disposal-method mapping
- city / province rules preset
- left / middle / right zone mapping
- low-confidence threshold for LLM fallback
- station metadata

## Assumptions
- Demo disposal zones are visual placeholders, not physical bins
- Drop detection is inferred from hand disappearance
- Actual bin detection is approximate and demo-grade
- Item set can be expanded later without changing core business flow

## Non-goals for v1
- Production-grade physical bin verification
- Fully automatic bin opening
- Multi-camera verification
- Full national rule coverage at launch

## Non-business-logic technical notes
Two hardware units:
- ESP8266 + poster LEDs + ultrasonic sensor
- Raspberry Pi 5 + camera + 16x2 LCD

- ESP8266 and Pi communicate over Wi-Fi
- Pi runs offline on-device inference
- LLM is fallback only
- Firebase Firestore is used as the database
- Firebase Cloud Functions is used as the website backend
- Pi sends event and live-status data to Firebase for dashboard and live monitoring
- Dashboard/backend can be cloud hosted