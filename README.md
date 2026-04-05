# IDS Project – Runbook

## Overview

This project is a Network Intrusion Detection System (IDS) that detects suspicious network activity using Python (Scapy), sends alerts to a backend (Node.js + Express), stores them in PostgreSQL, and displays them in a React dashboard.

---

## Tech Stack

* **Detection Engines:** Python + Scapy
* **Backend API:** Node.js + Express
* **Database:** PostgreSQL
* **Frontend:** React

---

## Architecture Flow

Python (Detection Engines)
→ POST `/api/alerts`
→ Backend (Express)
→ PostgreSQL (`alerts` table)
→ React Dashboard (polling every 5s)

---

## How to Run the System

### 1. Start PostgreSQL

Make sure PostgreSQL is running and the database exists.

Run the schema:

```sql
\i path/to/ids_schema.sql
```

---

### 2. Start Backend

Navigate to backend folder:

```bash
cd backend
npm install
npm start
```

Server should run on:

```
http://localhost:5000
```

---

### 3. Configure Detection Engines

Inside each Python detector file, set:

```python
BACKEND_URL = "http://<YOUR_IP>:5000/api/alerts"
```

Example:

```python
BACKEND_URL = "http://192.168.1.10:5000/api/alerts"
```

Also verify network interface:

```python
iface = "eth0"  # or your actual interface
```

---

### 4. Run Detection Engines

Each detector runs separately:

```bash
python syn_flood_detector.py
python port_scan_detector.py
python arp_spoofing_detector.py
python icmp_flood_detector.py
python dns_burst_detector.py
```

---

### 5. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Open:

```
http://localhost:5173
```

---

## Testing Attacks

### SYN Flood (Kali)

```bash
hping3 -S --flood -p 80 <TARGET_IP>
```

### Port Scan

```bash
nmap -p 1-1000 <TARGET_IP>
```

### ICMP Flood

```bash
ping -f <TARGET_IP>
```

### DNS Burst

```bash
for i in {1..100}; do nslookup google.com; done
```

---

## Expected Behavior

* Alerts appear in the dashboard within ~5 seconds
* Severity levels: Low / Medium / High / Critical
* Alerts can be resolved or deleted
* Correlation rule triggers "Coordinated Attack" (Port Scan → SYN Flood)

---

## Troubleshooting

### Alerts not showing in UI

* Check backend is running
* Verify correct `BACKEND_URL`
* Ensure frontend polling works

### Python error (timeout / connection refused)

* Backend IP or port incorrect
* Firewall blocking connection

### No packets detected

* Wrong network interface
* Run with sudo/admin

---

## Notes

* System is **rule-based (no machine learning)**
* Alerts are stored in a single `alerts` table
* Detection engines operate independently
* UI updates via polling (no WebSockets)

---

## Future Improvements

* Add WebSocket real-time updates
* Add statistics endpoint
* Move thresholds to DB config
* Add more detection engines

---

## Author

Ofek Kuperman
