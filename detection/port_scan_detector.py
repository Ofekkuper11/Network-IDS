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

BACKEND_URL = "http://YOUR_HOST_IP:5000/api/alerts"
TIME_WINDOW_SECONDS = 60
PORT_SCAN_THRESHOLD = 10
ALERT_COOLDOWN_SECONDS = 30
INTERFACE = "eth0"

scan_attempts_by_ip = defaultdict(deque)
last_alert_time_by_ip = {}


def cleanup_old_attempts(source_ip: str, current_time: float) -> None:
    attempts = scan_attempts_by_ip[source_ip]
    while attempts and current_time - attempts[0][0] > TIME_WINDOW_SECONDS:
        attempts.popleft()


def should_send_alert(source_ip: str, current_time: float) -> bool:
    last_time = last_alert_time_by_ip.get(source_ip)
    if last_time is None:
        return True
    return current_time - last_time >= ALERT_COOLDOWN_SECONDS


def send_alert(source_ip: str, destination_ip: str, unique_ports: list[int]) -> None:
    payload = {
        "type": "Port Scan",
        "severity": 7,
        "source_ip": source_ip,
        "destination_ip": destination_ip,
        "source_port": None,
        "destination_port": None,
        "protocol": "TCP",
        "description": f"Port scan suspected: {len(unique_ports)} unique SYN probes in {TIME_WINDOW_SECONDS} seconds",
        "details": {
            "ports_scanned": unique_ports,
            "unique_port_count": len(unique_ports),
            "time_window": TIME_WINDOW_SECONDS,
            "threshold": PORT_SCAN_THRESHOLD,
            "detected_at": datetime.utcnow().isoformat() + "Z"
        },
        "packet_count": len(unique_ports),
        "resolved": False
    }

    try:
        response = requests.post(BACKEND_URL, json=payload, timeout=5)
        response.raise_for_status()
        print(f"[ALERT SENT] Port Scan | {source_ip} -> {destination_ip} | unique_ports={len(unique_ports)} | status={response.status_code}")
    except requests.RequestException as error:
        print(f"[ALERT ERROR] Failed to send port scan alert: {error}")


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

    is_syn = tcp_layer.flags & 0x02 != 0
    is_ack = tcp_layer.flags & 0x10 != 0

    if not is_syn or is_ack:
        return

    source_ip = ip_layer.src
    destination_ip = ip_layer.dst
    destination_port = tcp_layer.dport
    current_time = time.time()

    scan_attempts_by_ip[source_ip].append((current_time, destination_port, destination_ip))
    cleanup_old_attempts(source_ip, current_time)

    attempts = scan_attempts_by_ip[source_ip]
    unique_ports = sorted({entry[1] for entry in attempts})

    print(f"[SCAN] {source_ip} -> {destination_ip}:{destination_port} | unique_ports_in_window={len(unique_ports)}")

    if len(unique_ports) >= PORT_SCAN_THRESHOLD and should_send_alert(source_ip, current_time):
        send_alert(source_ip, destination_ip, unique_ports)
        last_alert_time_by_ip[source_ip] = current_time


def main() -> None:
    print("Starting Port Scan detector...")
    print(f"Interface: {INTERFACE}")
    print(f"Threshold: {PORT_SCAN_THRESHOLD} unique ports in {TIME_WINDOW_SECONDS} seconds")
    print("Listening for TCP SYN packets...\n")

    sniff(
        filter="tcp",
        prn=process_packet,
        store=False,
        iface=INTERFACE
    )


if __name__ == "__main__":
    main()