import time
import requests
from scapy.all import sniff, ARP

# =========================
# Benchmarking
# =========================
_packets_processed = 0
_start_time = time.time()

BACKEND_URL = "http://YOUR_HOST_IP:5000/api/alerts"
INTERFACE = "eth0"

ARP_STATE = {}
CHANGE_WINDOW_SECONDS = 300
FAST_CHANGE_SECONDS = 60
ALERT_COOLDOWN_SECONDS = 120


def cleanup_old_changes(changes, now):
    return [c for c in changes if now - c["timestamp"] <= CHANGE_WINDOW_SECONDS]


def should_alert(entry, now):
    changes = cleanup_old_changes(entry["changes"], now)
    entry["changes"] = changes

    distinct_macs = len(entry["seen_macs"])
    recent_changes = len(changes)

    if distinct_macs < 2:
        return False

    if recent_changes == 0:
        return False

    last_change_age = now - changes[-1]["timestamp"]

    fast_change = last_change_age <= FAST_CHANGE_SECONDS
    repeated_change = recent_changes >= 2

    cooldown_ok = (now - entry["last_alert_time"]) >= ALERT_COOLDOWN_SECONDS

    return cooldown_ok and (fast_change or repeated_change)


def send_alert(sender_ip, entry):
    latest_change = entry["changes"][-1]

    payload = {
        "type": "ARP Spoofing",
        "severity": 8,
        "source_ip": sender_ip,
        "destination_ip": None,
        "source_port": None,
        "destination_port": None,
        "protocol": "ARP",
        "description": f"Possible ARP spoofing detected: IP {sender_ip} changed MAC address",
        "details": {
            "current_mac": entry["current_mac"],
            "seen_macs": list(entry["seen_macs"]),
            "change_count_window": len(entry["changes"]),
            "latest_change": {
                "old_mac": latest_change["old_mac"],
                "new_mac": latest_change["new_mac"],
                "timestamp": latest_change["timestamp"]
            }
        },
        "packet_count": len(entry["changes"]),
        "resolved": False
    }

    try:
        response = requests.post(BACKEND_URL, json=payload, timeout=3)
        response.raise_for_status()
        print(f"[ALERT SENT] ARP Spoofing | {sender_ip} | status={response.status_code}")
    except requests.RequestException as e:
        print(f"Failed to send alert: {e}")


def handle_arp_reply(packet):
    sender_ip = packet[ARP].psrc
    sender_mac = packet[ARP].hwsrc.lower().strip()
    now = time.time()

    if not sender_ip or not sender_mac:
        return

    entry = ARP_STATE.get(sender_ip)

    if entry is None:
        ARP_STATE[sender_ip] = {
            "current_mac": sender_mac,
            "first_seen": now,
            "last_seen": now,
            "seen_macs": {sender_mac},
            "changes": [],
            "last_alert_time": 0
        }
        return

    entry["last_seen"] = now

    if entry["current_mac"] == sender_mac:
        return

    old_mac = entry["current_mac"]

    entry["changes"].append({
        "old_mac": old_mac,
        "new_mac": sender_mac,
        "timestamp": now
    })

    entry["current_mac"] = sender_mac
    entry["seen_macs"].add(sender_mac)
    entry["changes"] = cleanup_old_changes(entry["changes"], now)

    print(
        f"[ARP CHANGE] {sender_ip} | {old_mac} -> {sender_mac} | "
        f"changes_in_window={len(entry['changes'])}"
    )

    if should_alert(entry, now):
        send_alert(sender_ip, entry)
        entry["last_alert_time"] = now


def handle_packet(packet):
    global _packets_processed, _start_time
    _packets_processed += 1
    if _packets_processed % 1000 == 0:
        _elapsed = time.time() - _start_time
        _rate = _packets_processed / _elapsed if _elapsed > 0 else 0
        print(f"[BENCHMARK] Processed {_packets_processed} packets | Rate: {_rate:.0f} pkt/s | Elapsed: {_elapsed:.1f}s")
    if packet.haslayer(ARP) and packet[ARP].op == 2:
        handle_arp_reply(packet)


if __name__ == "__main__":
    print("Starting ARP Spoofing detector...")
    print(f"Listening on interface: {INTERFACE}")
    sniff(filter="arp", prn=handle_packet, store=False, iface=INTERFACE)