from collections import defaultdict, deque
from datetime import datetime
import time
import requests

from scapy.all import sniff, IP, ICMP

# =========================
# Benchmarking
# =========================
_packets_processed = 0
_start_time = time.time()

BACKEND_URL = "http://YOUR_HOST_IP:5000/api/alerts"
INTERFACE = "eth0"

TIME_WINDOW_SECONDS = 10
MEDIUM_THRESHOLD = 30
HIGH_THRESHOLD = 80
ALERT_COOLDOWN_SECONDS = 15

# key = (source_ip, destination_ip)
icmp_packets_by_pair = defaultdict(deque)
last_alert_time_by_pair = {}


def cleanup_old_packets(pair: tuple[str, str], current_time: float) -> None:
    packet_times = icmp_packets_by_pair[pair]
    while packet_times and current_time - packet_times[0] > TIME_WINDOW_SECONDS:
        packet_times.popleft()


def should_send_alert(pair: tuple[str, str], current_time: float) -> bool:
    last_time = last_alert_time_by_pair.get(pair)
    if last_time is None:
        return True
    return current_time - last_time >= ALERT_COOLDOWN_SECONDS


def classify_severity(packet_count: int) -> tuple[int, str]:
    if packet_count >= HIGH_THRESHOLD:
        return 8, "high"
    return 5, "medium"


def send_alert(source_ip: str, destination_ip: str, packet_count: int) -> None:
    severity_value, severity_label = classify_severity(packet_count)

    payload = {
        "type": "ICMP Flood",
        "severity": severity_value,
        "source_ip": source_ip,
        "destination_ip": destination_ip,
        "source_port": None,
        "destination_port": None,
        "protocol": "ICMP",
        "description": (
            f"ICMP flood suspected: {packet_count} ICMP packets in "
            f"{TIME_WINDOW_SECONDS} seconds ({severity_label})"
        ),
        "details": {
            "icmp_count": packet_count,
            "time_window": TIME_WINDOW_SECONDS,
            "medium_threshold": MEDIUM_THRESHOLD,
            "high_threshold": HIGH_THRESHOLD,
            "severity_label": severity_label,
            "detected_at": datetime.utcnow().isoformat() + "Z",
        },
        "packet_count": packet_count,
        "resolved": False,
    }

    try:
        response = requests.post(BACKEND_URL, json=payload, timeout=5)
        response.raise_for_status()
        print(
            f"[ALERT SENT] ICMP Flood | {source_ip} -> {destination_ip} | "
            f"count={packet_count} | severity={severity_label} | status={response.status_code}"
        )
    except requests.RequestException as error:
        print(f"[ALERT ERROR] Failed to send ICMP alert: {error}")


def process_packet(packet) -> None:
    global _packets_processed, _start_time
    _packets_processed += 1
    if _packets_processed % 1000 == 0:
        _elapsed = time.time() - _start_time
        _rate = _packets_processed / _elapsed if _elapsed > 0 else 0
        print(f"[BENCHMARK] Processed {_packets_processed} packets | Rate: {_rate:.0f} pkt/s | Elapsed: {_elapsed:.1f}s")
    if not packet.haslayer(IP) or not packet.haslayer(ICMP):
        return

    ip_layer = packet[IP]
    icmp_layer = packet[ICMP]

    # optional: focus only on echo request (ping)
    if icmp_layer.type != 8:
        return

    source_ip = ip_layer.src
    destination_ip = ip_layer.dst
    current_time = time.time()

    pair = (source_ip, destination_ip)

    icmp_packets_by_pair[pair].append(current_time)
    cleanup_old_packets(pair, current_time)

    packet_count = len(icmp_packets_by_pair[pair])

    print(
        f"[ICMP] {source_ip} -> {destination_ip} | "
        f"count_in_window={packet_count}"
    )

    if packet_count >= MEDIUM_THRESHOLD and should_send_alert(pair, current_time):
        send_alert(source_ip, destination_ip, packet_count)
        last_alert_time_by_pair[pair] = current_time


def main() -> None:
    print("Starting ICMP Flood detector...")
    print(f"Interface: {INTERFACE}")
    print(
        f"Thresholds: medium={MEDIUM_THRESHOLD}, high={HIGH_THRESHOLD} "
        f"in {TIME_WINDOW_SECONDS} seconds"
    )
    print("Listening for ICMP traffic...\n")

    sniff(
        filter="icmp",
        prn=process_packet,
        store=False,
        iface=INTERFACE,
    )


if __name__ == "__main__":
    main()