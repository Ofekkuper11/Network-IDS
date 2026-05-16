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

Each detector runs separately (requires sudo):

```bash
sudo python syn_flood_detector.py
sudo python port_scan_detector.py
sudo python arp_spoofing_detector.py
sudo python icmp_flood_detector.py
sudo python dns_burst_detector.py
sudo python traffic_anomaly_detector.py
sudo python distributed_attack_detector.py
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
hping3 --icmp --flood <TARGET_IP>
```

### DNS Burst

```bash
for i in {1..100}; do dig google.com @<TARGET_IP>; done
```

### ARP Spoofing

```bash
arpspoof -i eth0 -t <TARGET_IP> <GATEWAY_IP>
```

### Distributed Port Scan

Run from multiple Kali terminals simultaneously, each with a different source IP (or use separate VMs):

```bash
# Terminal 1
nmap -p 1-500 <TARGET_IP>

# Terminal 2
nmap -p 501-1000 <TARGET_IP>
```

The engine triggers when 2+ IPs from the same /24 subnet scan 30+ unique ports combined.

---

## Benchmarking

All 7 detection engines include built-in performance measurement. Every 1000 packets processed, the engine prints:

```
[BENCHMARK] Processed 1000 packets | Rate: 3241 pkt/s | Elapsed: 0.3s
[BENCHMARK] Processed 2000 packets | Rate: 3198 pkt/s | Elapsed: 0.6s
```

To benchmark a specific engine, run it while sending a flood from Kali:

```bash
# Terminal 1 – run engine
sudo python syn_flood_detector.py

# Terminal 2 (Kali) – generate traffic
hping3 -S --flood <TARGET_IP>
```

Watch the `[BENCHMARK]` lines to measure real throughput.

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