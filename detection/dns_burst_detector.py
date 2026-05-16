from collections import defaultdict, deque
from datetime import datetime
import time
import requests

from scapy.all import sniff, IP, UDP, DNS

# =========================
# Benchmarking
# =========================
_packets_processed = 0
_start_time = time.time()

BACKEND_URL = "http://YOUR_HOST_IP:5000/api/alerts"
INTERFACE = "eth0"

TIME_WINDOW_SECONDS = 60
LOW_THRESHOLD = 20
MEDIUM_THRESHOLD = 50
ALERT_COOLDOWN_SECONDS = 30

# key = (source_ip, destination_ip)
dns_queries_by_pair = defaultdict(deque)
last_alert_time_by_pair = {}


def cleanup_old_queries(pair: tuple[str, str], current_time: float) -> None:
    queries = dns_queries_by_pair[pair]
    while queries and current_time - queries[0] > TIME_WINDOW_SECONDS:
        queries.popleft()


def should_send_alert(pair: tuple[str, str], current_time: float) -> bool:
    last_time = last_alert_time_by_pair.get(pair)
    if last_time is None:
        return True
    return current_time - last_time >= ALERT_COOLDOWN_SECONDS


def classify_severity(query_count: int) -> tuple[int, str]:
    if query_count >= MEDIUM_THRESHOLD:
        return 5, "medium"
    return 3, "low"


def send_alert(source_ip: str, destination_ip: str, query_count: int) -> None:
    severity_value, severity_label = classify_severity(query_count)

    payload = {
        "type": "DNS Burst",
        "severity": severity_value,
        "source_ip": source_ip,
        "destination_ip": destination_ip,
        "source_port": None,
        "destination_port": 53,
        "protocol": "UDP",
        "description": (
            f"Suspicious DNS query burst detected: {query_count} DNS queries in "
            f"{TIME_WINDOW_SECONDS} seconds ({severity_label})"
        ),
        "details": {
            "dns_query_count": query_count,
            "time_window": TIME_WINDOW_SECONDS,
            "low_threshold": LOW_THRESHOLD,
            "medium_threshold": MEDIUM_THRESHOLD,
            "severity_label": severity_label,
            "detected_at": datetime.utcnow().isoformat() + "Z"
        },
        "packet_count": query_count,
        "resolved": False
    }

    try:
        response = requests.post(BACKEND_URL, json=payload, timeout=5)
        response.raise_for_status()
        print(
            f"[ALERT SENT] DNS Burst | {source_ip} -> {destination_ip} | "
            f"count={query_count} | severity={severity_label} | status={response.status_code}"
        )
    except requests.RequestException as error:
        print(f"[ALERT ERROR] Failed to send DNS burst alert: {error}")


def process_packet(packet) -> None:
    global _packets_processed, _start_time
    _packets_processed += 1
    if _packets_processed % 1000 == 0:
        _elapsed = time.time() - _start_time
        _rate = _packets_processed / _elapsed if _elapsed > 0 else 0
        print(f"[BENCHMARK] Processed {_packets_processed} packets | Rate: {_rate:.0f} pkt/s | Elapsed: {_elapsed:.1f}s")
    if not packet.haslayer(IP) or not packet.haslayer(UDP) or not packet.haslayer(DNS):
        return

    ip_layer = packet[IP]
    udp_layer = packet[UDP]
    dns_layer = packet[DNS]

    # Only DNS queries to port 53
    if udp_layer.dport != 53:
        return

    # qr = 0 means query, qr = 1 means response
    if dns_layer.qr != 0:
        return

    source_ip = ip_layer.src
    destination_ip = ip_layer.dst
    current_time = time.time()

    pair = (source_ip, destination_ip)

    dns_queries_by_pair[pair].append(current_time)
    cleanup_old_queries(pair, current_time)

    query_count = len(dns_queries_by_pair[pair])

    print(
        f"[DNS] {source_ip} -> {destination_ip}:53 | "
        f"queries_in_window={query_count}"
    )

    if query_count >= LOW_THRESHOLD and should_send_alert(pair, current_time):
        send_alert(source_ip, destination_ip, query_count)
        last_alert_time_by_pair[pair] = current_time


def main() -> None:
    print("Starting DNS Burst detector...")
    print(f"Interface: {INTERFACE}")
    print(
        f"Thresholds: low={LOW_THRESHOLD}, medium={MEDIUM_THRESHOLD} "
        f"in {TIME_WINDOW_SECONDS} seconds"
    )
    print("Listening for DNS queries...\n")

    sniff(
        filter="udp port 53",
        prn=process_packet,
        store=False,
        iface=INTERFACE,
    )


if __name__ == "__main__":
    main()