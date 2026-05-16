import time
import requests
from scapy.all import sniff, IP

# =========================
# Benchmarking
# =========================
_packets_processed = 0
_start_time = time.time()

BACKEND_URL = "http://YOUR_IP:5000/api/alerts"

WINDOW_SECONDS = 10
ANOMALY_FACTOR = 3
MIN_BASELINE = 5

IP_STATS = {}

def send_alert(ip, current_rate, baseline):
    payload = {
        "type": "Traffic Anomaly",
        "severity": 3,
        "source_ip": ip,
        "protocol": "IP",
        "description": "Abnormal traffic spike detected",
        "details": {
            "current_rate": current_rate,
            "baseline_rate": baseline,
            "threshold": baseline * ANOMALY_FACTOR
        }
    }

    try:
        requests.post(BACKEND_URL, json=payload, timeout=3)
    except Exception as e:
        print("Failed to send alert:", e)

def handle_packet(packet):
    global _packets_processed, _start_time
    _packets_processed += 1
    if _packets_processed % 1000 == 0:
        _elapsed = time.time() - _start_time
        _rate = _packets_processed / _elapsed if _elapsed > 0 else 0
        print(f"[BENCHMARK] Processed {_packets_processed} packets | Rate: {_rate:.0f} pkt/s | Elapsed: {_elapsed:.1f}s")
    if not packet.haslayer(IP):
        return

    src_ip = packet[IP].src
    now = time.time()

    entry = IP_STATS.get(src_ip)

    if entry is None:
        IP_STATS[src_ip] = {
            "timestamps": [now],
            "baseline": 0,
            "last_alert": 0
        }
        return

    entry["timestamps"].append(now)

    # ניקוי חלון זמן
    entry["timestamps"] = [
        t for t in entry["timestamps"]
        if now - t <= WINDOW_SECONDS
    ]

    current_rate = len(entry["timestamps"]) / WINDOW_SECONDS

    # עדכון baseline פשוט (ממוצע רץ)
    if entry["baseline"] == 0:
        entry["baseline"] = current_rate
    else:
        entry["baseline"] = (entry["baseline"] * 0.9) + (current_rate * 0.1)

    baseline = entry["baseline"]

    if baseline < MIN_BASELINE:
        return

    # זיהוי חריגה
    if current_rate > baseline * ANOMALY_FACTOR:
        if now - entry["last_alert"] > 30:
            send_alert(src_ip, current_rate, baseline)
            entry["last_alert"] = now

if __name__ == "__main__":
    sniff(prn=handle_packet, store=False)