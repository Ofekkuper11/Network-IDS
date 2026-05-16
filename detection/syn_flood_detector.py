from collections import defaultdict, deque
from datetime import datetime
import time
import requests

from scapy.all import sniff, IP, TCP

# =========================
# Benchmarking
# =========================
_packets_processed = 0
_start_time = time.time()

# =========================
# Configuration
# =========================
BACKEND_URL = "http://YOUR_HOST_IP:5000/api/alerts"
TIME_WINDOW_SECONDS = 10
SYN_THRESHOLD = 20
ALERT_COOLDOWN_SECONDS = 15

# =========================
# State
# =========================
syn_packets_by_ip = defaultdict(deque)
last_alert_time_by_ip = {}

# =========================
# Helper Functions
# =========================
def cleanup_old_packets(ip: str, current_time: float) -> None:
    packet_times = syn_packets_by_ip[ip]
    while packet_times and current_time - packet_times[0] > TIME_WINDOW_SECONDS:
        packet_times.popleft()


def should_send_alert(ip: str, current_time: float) -> bool:
    last_alert_time = last_alert_time_by_ip.get(ip)
    if last_alert_time is None:
        return True
    return current_time - last_alert_time >= ALERT_COOLDOWN_SECONDS


def send_alert(source_ip: str, destination_ip: str, destination_port: int, syn_count: int) -> None:
    payload = {
        "type": "SYN Flood",
        "severity": 9,
        "source_ip": source_ip,
        "destination_ip": destination_ip,
        "source_port": None,
        "destination_port": destination_port,
        "protocol": "TCP",
        "description": f"SYN flood suspected: {syn_count} SYN packets in {TIME_WINDOW_SECONDS} seconds",
        "details": {
            "syn_count": syn_count,
            "time_window": TIME_WINDOW_SECONDS,
            "threshold": SYN_THRESHOLD,
            "detected_at": datetime.utcnow().isoformat() + "Z"
        },
        "packet_count": syn_count,
        "resolved": False
    }

    try:
        response = requests.post(BACKEND_URL, json=payload, timeout=5)
        response.raise_for_status()
        print(f"[ALERT SENT] {source_ip} -> {destination_ip}:{destination_port} | count={syn_count} | status={response.status_code}")
    except requests.RequestException as error:
        print(f"[ALERT ERROR] Failed to send alert: {error}")
# =========================
# Detection Logic
# =========================
def process_packet(packet) -> None:
    global _packets_processed, _start_time
    _packets_processed += 1
    if _packets_processed % 1000 == 0:
        _elapsed = time.time() - _start_time
        _rate = _packets_processed / _elapsed if _elapsed > 0 else 0
        print(f"[BENCHMARK] Processed {_packets_processed} packets | Rate: {_rate:.0f} pkt/s | Elapsed: {_elapsed:.1f}s")
    if not packet.haslayer(IP) or not packet.haslayer(TCP):
        return

    ip_layer = packet[IP]
    tcp_layer = packet[TCP]

    # SYN only, without ACK
    is_syn = (tcp_layer.flags & 0x02) != 0
    is_ack = (tcp_layer.flags & 0x10) != 0

    if not is_syn or is_ack:
        return

    source_ip = ip_layer.src
    destination_ip = ip_layer.dst
    destination_port = tcp_layer.dport
    current_time = time.time()

    syn_packets_by_ip[source_ip].append(current_time)
    cleanup_old_packets(source_ip, current_time)

    syn_count = len(syn_packets_by_ip[source_ip])

    print(f"[SYN] {source_ip} -> {destination_ip}:{destination_port} | window_count={syn_count}")

    if syn_count >= SYN_THRESHOLD and should_send_alert(source_ip, current_time):
        send_alert(source_ip, destination_ip, destination_port, syn_count)
        last_alert_time_by_ip[source_ip] = current_time
# =========================
# Main
# =========================
def main() -> None:
    print("Starting SYN Flood detector...")
    print(f"Threshold: {SYN_THRESHOLD} SYN packets in {TIME_WINDOW_SECONDS} seconds")
    print("Listening for TCP SYN packets...\n")

    sniff(
        filter="tcp",
        prn=process_packet,
        store=False,
        iface="eth0"
    )


if __name__ == "__main__":
    main()