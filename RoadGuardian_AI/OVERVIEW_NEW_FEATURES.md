# RoadGuardian AI - Complete Feature Overview

## 📊 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + TypeScript)                │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Dashboard   │  │  Heatmap     │  │ WhatsApp Pages ⭐NEW  │  │
│  │  (Citizens)  │  │  (Analytics) │  │ ├─ Simulator        │  │
│  └──────────────┘  └──────────────┘  │ └─ Messages         │  │
│  ┌──────────────┐  ┌──────────────┐  └──────────────────────┘  │
│  │  Report      │  │  Authority   │  ┌──────────────────────┐  │
│  │  (New Hazard)│  │  Dashboard   │  │ WhatsApp Integration │  │
│  └──────────────┘  └──────────────┘  │ Real-time Updates    │  │
│                                        └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓ HTTP/WebSocket
┌─────────────────────────────────────────────────────────────────┐
│              BACKEND (FastAPI + SQLAlchemy) 🔧 ENHANCED        │
│                                                                   │
│  API Routes:                                                     │
│  ├─ /hazards                    (CRUD operations)               │
│  ├─ /hazards/heatmap            (Spatial analytics)             │
│  ├─ /hazards/dashboard          (Real-time reports)             │
│  ├─ /hazards/predict-hotspots ⭐NEW (ML predictions)            │
│  ├─ /hazards/recurring-patterns ⭐NEW (Pattern detection)       │
│  ├─ /whatsapp/webhook ⭐NEW     (Twilio integration)            │
│  ├─ /whatsapp/webhook (GET)     (Health check)                  │
│  └─ /tenders                    (Contract management)           │
│                                                                   │
│  Service Layer (Business Logic):                                │
│  ├─ HazardService               (Core operations)               │
│  ├─ WeatherService ⭐ENHANCED   (Real-time weather)             │
│  ├─ TrafficService ⭐ENHANCED   (Traffic simulation)            │
│  ├─ NotificationService ⭐NEW   (Alert dispatch)                │
│  └─ PredictionService ⭐NEW     (Analytics & forecasting)       │
│                                                                   │
│  Database Models:                                               │
│  ├─ User                        (Citizen & authority accounts)  │
│  ├─ Hazard ⭐ENHANCED           (Reports + tracking)            │
│  └─ GamificationBadge           (Achievement tracking)          │
│                                                                   │
│  WebSocket Manager:                                             │
│  └─ Real-time hazard broadcasts ⭐ENHANCED                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓ External APIs
┌─────────────────────────────────────────────────────────────────┐
│                    INTEGRATIONS                                  │
│  ├─ Twilio WhatsApp API ⭐NEW                                    │
│  ├─ OpenWeatherMap API ⭐NEW                                     │
│  ├─ Nominatim Reverse Geocoding                                │
│  └─ ngrok Tunneling                                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 What's New: Feature-by-Feature

### **1️⃣ WhatsApp Integration (Complete New Module)**

#### **Frontend UI**

📍 **Location:** `roadguardian-frontend/src/pages/WhatsAppSimulator.tsx`

- **Visual:** WhatsApp-styled chat interface
- **Features:**
  - Message input box
  - Green bubbles for user messages
  - White bubbles for bot responses
  - Real-time message parsing
  - Phone number field

📍 **Location:** `roadguardian-frontend/src/pages/WhatsAppMessages.tsx`

- **Visual:** Dashboard-style message feed
- **Features:**
  - Real-time hazard report cards
  - Filter tabs: All / Pending / Resolved
  - Summary statistics
  - Color-coded hazard types
  - Auto-refresh every 5 seconds
  - Coordinates display
  - Severity score badges

#### **Navigation**

📍 **Location:** `roadguardian-frontend/src/components/layout/Sidebar.tsx`

```
Quick Links
├─ Citizen Overview
├─ Lodge New Report
├─ Geospatial Analytics
├─ Civic Leaderboard
├─ My Records & Badges
├─ WhatsApp Simulator ⭐NEW
└─ WhatsApp Messages ⭐NEW
```

#### **Backend Endpoint**

📍 **Location:** `roadguardian-backend/app/routes/whatsapp.py`

```
GET  /whatsapp/webhook
     └─ Health check endpoint
        Response: {"status": "ok", "message": "..."}

POST /whatsapp/webhook
     ├─ Input: Form data from Twilio
     │  ├─ From (phone number)
     │  ├─ Body (message text)
     │  ├─ Latitude
     │  ├─ Longitude
     │  └─ MediaUrl0 (optional image)
     │
     ├─ Processing:
     │  ├─ 1. Parse form data
     │  ├─ 2. Auto-create/find proxy user
     │  ├─ 3. Detect hazard type from message
     │  ├─ 4. Create hazard record
     │  ├─ 5. Broadcast via WebSocket
     │  └─ 6. Return TwiML response
     │
     └─ Response: TwiML XML with Ticket ID
```

#### **Data Flow**

```
User sends WhatsApp message to Twilio
        ↓
Twilio calls /whatsapp/webhook (POST)
        ↓
Backend parses form data:
├─ From: "whatsapp:+919876543210"
├─ Body: "huge pothole at main street"
├─ Lat: 13.0827
└─ Lng: 80.2707
        ↓
Auto-create User:
├─ Email: "919876543210@whatsapp.roadguardian.gov"
├─ Role: "citizen"
└─ Full Name: "WhatsApp Citizen (+919876543210)"
        ↓
Detect Hazard Type (pattern matching):
├─ "pothole" → hazard_type: "pothole" ✓
├─ "flood/water" → "waterlogging"
├─ "crack" → "crack"
└─ etc...
        ↓
Create Hazard Record in DB:
├─ user_id: (proxy user)
├─ hazard_type: "pothole"
├─ latitude: 13.0827
├─ longitude: 80.2707
├─ description: "[WhatsApp Report] huge pothole at main street"
├─ confidence_score: 0.85
├─ severity_score: (calculated)
├─ urgency_level: (calculated)
└─ status: "pending"
        ↓
WebSocket Broadcast:
├─ Type: "new_hazard"
└─ Data: Full hazard object to all connected clients
        ↓
Return TwiML Response to User:
└─ "✅ Thank you! Your pothole report has been received.
     Ticket ID: #15. Our AI has routed this to the Road Department."
        ↓
Dashboard Updates Automatically:
├─ WhatsAppMessages page receives update
├─ New card appears in real-time
└─ Auto-refresh shows ticket in list
```

---

### **2️⃣ Enhanced Hazard Service**

#### **Location:** `roadguardian-backend/app/services/hazard_service.py`

#### **New Functions Added**

```python
✅ reverse_geocode(lat, lng)
   └─ Converts coordinates → human-readable address

✅ calculate_distance(lat1, lng1, lat2, lng2)
   └─ Haversine formula for distance calculation

✅ create_hazard(db, user_id, data, image_url)
   └─ Creates hazard + calculates severity + broadcasts

✅ calculate_severity_score(hazard_type, confidence,
                             traffic_density, weather_condition)
   └─ Returns 0.0-10.0 based on:
      ├─ Hazard type multiplier (pothole: 3.0, divider: 2.5)
      ├─ Confidence score (0.0-1.0)
      ├─ Traffic density modifier (0.0-2.0)
      └─ Weather modifier (0.0-2.5)
```

#### **Severity Calculation Example**

```
Pothole detected from WhatsApp:
├─ Base severity (pothole): 3.0
├─ Confidence: 0.85
├─ Weather: Clear (modifier 0.0)
├─ Traffic: Peak hours 8-10 AM (modifier 2.0)
└─ Final Score: 3.0 × 0.85 × (1.0 + 2.0) = 7.65/10 ⭐
```

#### **Urgency Levels**

```
Severity 0-3   → "low"      (Blue status)
Severity 3-6   → "medium"   (Yellow status)
Severity 6-8   → "high"     (Orange status)
Severity 8-10  → "critical" (Red status) 🚨
```

---

### **3️⃣ Prediction Service (Analytics Engine)**

#### **Location:** `roadguardian-backend/app/services/prediction_service.py`

#### **Endpoint: Hotspot Prediction**

```
GET /hazards/predict-hotspots?days_lookback=30

Response:
{
  "predicted_hotspots": [
    {
      "latitude": 13.08,
      "longitude": 80.27,
      "risk_level": "high",
      "expected_hazards_per_week": 2.5,
      "peak_time_hour": 8,
      "avg_severity": 7.2,
      "common_type": "pothole",
      "recommended_budget_allocation_inr": 180000.0
    }
  ],
  "confidence": 0.85,
  "analysis_period_days": 30,
  "total_hazards_analyzed": 47
}
```

#### **Endpoint: Recurring Patterns**

```
GET /hazards/recurring-patterns

Response:
{
  "recurring_patterns": [
    {
      "location": "Central Station Road, Chennai",
      "hazard_type": "pothole",
      "occurrences": 5,
      "last_reported": "2026-05-30",
      "coordinates": [13.0827, 80.2707],
      "suggested_action": "Permanent repair required"
    }
  ],
  "total_patterns_found": 3
}
```

#### **How It Works**

```
Algorithm:
1. Fetch all hazards from last N days (status: verified/resolved)
2. Cluster by location (0.01° grid = ~1.1km area)
3. Identify high-frequency grids (≥3 hazards)
4. Calculate recency trend (reports in last 7 days)
5. Determine average severity + peak hour
6. Recommend budget allocation based on severity × count
7. Return sorted by risk level
```

---

### **4️⃣ Weather & Traffic Integration**

#### **Location:** `roadguardian-backend/app/services/weather_service.py`

#### **Weather Service**

```
Function: get_weather_condition(lat, lng)

API: OpenWeatherMap (requires OPENWEATHER_API_KEY in .env)

Returns:
{
  "condition": "rain",           // Current condition
  "severity_modifier": 2.0,      // Impact on hazard severity
  "temperature": 28.5,           // Celsius
  "humidity": 65                 // Percentage
}

Severity Modifiers:
├─ thunderstorm: 2.5 (most dangerous)
├─ rain: 2.0
├─ snow: 1.5
├─ drizzle: 1.5
├─ fog: 1.0
├─ clouds: 0.5
└─ clear: 0.0 (no modifier)

Fallback (no API key):
└─ Returns clear weather by default
```

#### **Traffic Service**

```
Function: get_traffic_density(lat, lng)

Algorithm: Time-of-day based simulation (no real-time data)

Peak Hours (Heavy Traffic):
├─ 8:00 AM - 10:00 AM  → modifier: 2.0 (commute to work)
└─ 5:00 PM - 7:00 PM   → modifier: 2.0 (commute from work)

Midday (Moderate Traffic):
└─ 11:00 AM - 4:00 PM  → modifier: 1.0

Off-Peak (Light Traffic):
├─ 10:00 PM - 8:00 AM  → modifier: 0.0
└─ Also midnight rush is 0.0

Returns:
{
  "density": "high",
  "severity_modifier": 2.0,
  "source": "mock"
}
```

---

### **5️⃣ Notification Service (Alert System)**

#### **Location:** `roadguardian-backend/app/services/notification_service.py`

#### **Function: Emergency Dispatch**

```python
dispatch_emergency_alert(hazard_id, severity, location, hazard_type)

Triggers when: severity_score ≥ 8.0 (critical)

Actions:
├─ Log critical alert with full details
├─ In production: Would send:
│  ├─ SMS to Highway Patrol
│  ├─ Email to Municipal Corporation
│  └─ Push notification to authority app
└─ Mock implementation for testing
```

#### **Example Log Output**

```
🚨 EMERGENCY DISPATCH TRIGGERED 🚨
Hazard ID: 42
Type: POTHOLE
Severity: 8.5/10.0
Location: Central Station Road, Chennai
Action: Auto-dispatching Highway Patrol to barricade area immediately.
```

---

### **6️⃣ Database Model Enhancements**

#### **Location:** `roadguardian-backend/app/models/hazard.py`

#### **Hazard Table - New Columns**

```sql
CREATE TABLE hazards (
  -- Core Fields
  id INT PRIMARY KEY
  user_id INT FOREIGN KEY
  hazard_type VARCHAR(50)
  latitude FLOAT
  longitude FLOAT
  description VARCHAR(1000)
  image_url VARCHAR(255)
  location_address VARCHAR(255) ⭐NEW

  -- AI Scoring
  severity_score FLOAT
  confidence_score FLOAT
  urgency_level VARCHAR(50)

  -- Status Tracking
  status VARCHAR(50)                 ⭐NEW ENUM
  created_at DATETIME
  resolved_at DATETIME
  assigned_to VARCHAR(100)           ⭐NEW
  assigned_at DATETIME               ⭐NEW

  -- Resolution Data
  resolved_by_id INT FOREIGN KEY     ⭐NEW
  resolved_image_url VARCHAR(255)    ⭐NEW
  resolution_notes VARCHAR(1000)     ⭐NEW

  -- Department Routing
  sla_deadline DATETIME              ⭐NEW
  sla_breached BOOLEAN               ⭐NEW
  linked_department VARCHAR(100)     ⭐NEW
  department_ticket_id VARCHAR(100)  ⭐NEW
  budget_estimate FLOAT              ⭐NEW
)
```

#### **Status Enum**

```
"pending"     → Just received, not yet assigned
"verified"    → Authority confirmed it exists
"in_progress" → Work started on resolution
"resolved"    → Fixed and closed
"duplicate"   → Same issue already reported
"false_alarm" → Not a valid hazard
```

---

### **7️⃣ API Route Changes**

#### **New Endpoints**

```
POST /whatsapp/webhook
     └─ Receive WhatsApp messages from Twilio

GET  /whatsapp/webhook
     └─ Health check

GET  /hazards/predict-hotspots?days_lookback=30
     └─ Get AI-predicted high-risk zones

GET  /hazards/recurring-patterns
     └─ Get recurring hazard locations

GET  /hazards/dashboard
     └─ Real-time hazard feed for dashboard
```

#### **Enhanced Endpoints**

```
GET  /hazards
     ├─ Now includes WhatsApp reports
     └─ Filtered by [WhatsApp Report] in description

POST /hazards
     ├─ Called from WhatsApp webhook
     └─ Auto-calculates severity + urgency

GET  /hazards/{id}
     ├─ Now includes: SLA status, department assignment
     └─ Shows budget estimate
```

---

## 🎨 UI/UX Changes

### **Navigation Sidebar**

```
Before:
├─ Citizen Overview
├─ Lodge New Report
├─ Geospatial Analytics
├─ Civic Leaderboard
└─ My Records & Badges

After:
├─ Citizen Overview
├─ Lodge New Report
├─ Geospatial Analytics
├─ Civic Leaderboard
├─ My Records & Badges
├─ WhatsApp Simulator ⭐NEW (Test webhook locally)
└─ WhatsApp Messages ⭐NEW (Real-time incoming reports)
```

### **Dashboard Changes**

#### **WhatsApp Simulator Page**

- **URL:** `http://localhost:5173/whatsapp-demo`
- **Purpose:** Test WhatsApp webhook without Twilio account
- **Features:**
  ```
  ┌─────────────────────────────────────┐
  │  RoadGuardian AI (Govt Bot)          │
  │  Official Government Bot             │
  ├─────────────────────────────────────┤
  │                                      │
  │  Send a message to report a road     │
  │  hazard (e.g. 'huge pothole...')     │
  │                                      │
  │  [Green chat bubble: "test pothole   │
  │   at market road"] ✓✓                │
  │                                      │
  │  [White chat bubble: "✅ Thank you!  │
  │   Your pothole report received.      │
  │   Ticket ID: #15"]                   │
  │                                      │
  ├─────────────────────────────────────┤
  │  [Input: "Type a message..."]   [📤] │
  │                                      │
  │  Status: "Message sent successfully!"│
  └─────────────────────────────────────┘
  ```

#### **WhatsApp Messages Dashboard**

- **URL:** `http://localhost:5173/whatsapp-messages`
- **Purpose:** View all incoming WhatsApp reports in real-time
- **Features:**
  ```
  ┌─────────────────────────────────────┐
  │  WhatsApp Reports                    │
  │  Real-time road hazard reports       │
  ├─────────────────────────────────────┤
  │                                      │
  │  [All(5)] [Pending(5)] [Resolved(0)]│
  │                                      │
  ├─────────────────────────────────────┤
  │                                      │
  │  ┌─ Report #15 - May 30, 11:16 PM  │
  │  │  POTHOLE    Severity: 6.0/10     │
  │  │  Status: ⏳ Pending              │
  │  │  "test pothole at market road"   │
  │  │  📍 Lat: 13.0827, Lng: 80.2707   │
  │  ├─ Report #14 - May 30, 11:13 PM  │
  │  │  POTHOLE    Severity: 6.0/10     │
  │  │  "Very huge pothole near..."     │
  │  └─ [more cards...]                │
  │                                      │
  ├─────────────────────────────────────┤
  │  Total Reports: 5                    │
  │  Pending: 5                          │
  │  Resolved: 0                         │
  │  Most Common: pothole                │
  └─────────────────────────────────────┘
  ```

---

## 🔄 Data Flow Examples

### **Example 1: User Reports via WhatsApp**

```
1. User sends WhatsApp: "huge pothole near main street"

2. Twilio receives and forwards to backend:
   POST /whatsapp/webhook
   Form Data:
   ├─ From: "whatsapp:+919876543210"
   ├─ Body: "huge pothole near main street"
   ├─ Latitude: "13.0827"
   └─ Longitude: "80.2707"

3. Backend Processing:
   ├─ Create/find user: "919876543210@whatsapp.roadguardian.gov"
   ├─ Detect hazard: "pothole" ✓
   ├─ Reverse geocode: "Central Station Road, Chennai"
   ├─ Get weather: "clear" (modifier 0.0)
   ├─ Get traffic: "peak_hours" (modifier 2.0)
   └─ Calculate severity:
      3.0 (pothole) × 0.85 (confidence) × (1 + 2.0) = 7.65/10

4. Create Hazard Record:
   {
     "hazard_type": "pothole",
     "severity_score": 7.65,
     "urgency_level": "high",
     "status": "pending",
     "location_address": "Central Station Road, Chennai",
     "linked_department": "Road Department",
     "sla_deadline": "2026-05-31 08:00" (next 24h)
   }

5. WebSocket Broadcast:
   All connected clients receive:
   { "type": "new_hazard", "data": {...} }

6. Return Response to WhatsApp User:
   "✅ Thank you! Ticket ID: #15 routed to Road Department"

7. Dashboard Updates:
   ├─ WhatsAppMessages page: New card appears
   ├─ Dashboard: Hazard count incremented
   ├─ Heatmap: New point added to map
   └─ Authority Dashboard: Alert notification sent
```

### **Example 2: Hotspot Prediction**

```
1. Authority requests: GET /hazards/predict-hotspots?days_lookback=30

2. Service queries database:
   ├─ Get all hazards from last 30 days
   ├─ Status = "verified" or "resolved"
   └─ Count: 47 hazards

3. Spatial Clustering (0.01° grid):
   ├─ Grid (13.08, 80.27): 8 potholes → HIGH RISK
   ├─ Grid (13.09, 80.28): 5 cracks   → MEDIUM RISK
   └─ Grid (13.07, 80.26): 3 debris   → MEDIUM RISK

4. Calculate Risk Metrics:
   For each grid:
   ├─ Recent reports (7 days): 2-3 → "high" risk
   ├─ Average severity: 7.2/10
   ├─ Peak reporting hour: 8 AM
   └─ Budget needed: ₹180,000

5. Return to Authority Dashboard:
   {
     "predicted_hotspots": [
       {
         "location": "Central Station Road",
         "risk_level": "high",
         "expected_repairs_per_week": 2.5,
         "budget_allocation": "₹180,000"
       }
     ],
     "confidence": 0.85
   }

6. Authority Action:
   ├─ Deploy maintenance crew to hotspot
   ├─ Allocate budget from predictions
   └─ Monitor for duplicate issues
```

---

## 📋 File Structure Overview

```
roadguardian-backend/
├─ app/
│  ├─ routes/
│  │  ├─ whatsapp.py ⭐NEW
│  │  ├─ hazards.py
│  │  └─ tenders.py
│  │
│  ├─ services/
│  │  ├─ hazard_service.py (ENHANCED)
│  │  ├─ weather_service.py ⭐NEW (split from hazard_service)
│  │  ├─ prediction_service.py ⭐NEW
│  │  └─ notification_service.py ⭐NEW
│  │
│  ├─ models/
│  │  └─ hazard.py (ENHANCED with SLA, dept fields)
│  │
│  └─ ai_engine/
│     ├─ vision.py (YOLOv8 image detection)
│     └─ voice.py (Whisper audio transcription)
│
├─ main.py
└─ requirements.txt (NEW: aiohttp for API calls)

roadguardian-frontend/
├─ src/
│  ├─ pages/
│  │  ├─ WhatsAppSimulator.tsx ⭐NEW
│  │  ├─ WhatsAppMessages.tsx ⭐NEW
│  │  ├─ Dashboard.tsx
│  │  ├─ AuthorityDashboard.tsx
│  │  └─ [other pages...]
│  │
│  ├─ components/
│  │  └─ layout/
│  │     └─ Sidebar.tsx (UPDATED - new nav items)
│  │
│  └─ services/
│     └─ [API calls]
│
├─ package.json
└─ vite.config.ts
```

---

## 🧪 Testing Workflow

```
Test Flow for New Developer:

1. Setup Backend:
   ✓ python -m venv .venv
   ✓ pip install -r requirements.txt
   ✓ Set OPENWEATHER_API_KEY in .env
   ✓ python main.py

2. Setup Frontend:
   ✓ npm install
   ✓ npm run dev

3. Test WhatsApp Simulator:
   ✓ Navigate to http://localhost:5173/whatsapp-demo
   ✓ Type: "test pothole at market road"
   ✓ Click send
   ✓ Verify bot response: "Ticket ID: #15"

4. Check Dashboard:
   ✓ Navigate to http://localhost:5173/whatsapp-messages
   ✓ New report should appear within 5 seconds
   ✓ Verify all fields populate correctly

5. Check Backend Logs:
   ✓ "📱 Raw form data received" ✓
   ✓ "✅ User created/found" ✓
   ✓ "🔍 Detected hazard type: pothole" ✓
   ✓ "✅ Hazard created: #15" ✓
   ✓ "✅ WhatsApp response sent successfully" ✓

6. Verify Database:
   ✓ New Hazard record in hazards table
   ✓ Status = "pending"
   ✓ severity_score = ~6-8 (varies by traffic)
   ✓ linked_department = "Road Department"
```

---

## 🚀 Deployment Checklist

- [ ] Set `OPENWEATHER_API_KEY` in production .env
- [ ] Configure Twilio webhook URL pointing to ngrok tunnel
- [ ] Enable CORS for ngrok domain in FastAPI
- [ ] Update `.gitignore` to exclude `.venv_py311` ✓
- [ ] Run database migrations for new columns ✓
- [ ] Test all three new endpoints with sample data
- [ ] Verify WebSocket connections broadcast correctly
- [ ] Load test with 100+ concurrent messages
- [ ] Monitor database query performance
- [ ] Set up error logging/monitoring

---

## 📞 Quick Reference: Where to Add Features

| Feature          | Location | File                                |
| ---------------- | -------- | ----------------------------------- |
| New API endpoint | Backend  | `app/routes/[module].py`            |
| Business logic   | Backend  | `app/services/[service].py`         |
| Database field   | Backend  | `app/models/hazard.py`              |
| New page/form    | Frontend | `src/pages/[Page].tsx`              |
| Nav link         | Frontend | `src/components/layout/Sidebar.tsx` |
| API client call  | Frontend | `src/services/api.ts`               |
| Real-time update | Backend  | `app/utils/websocket.py`            |
