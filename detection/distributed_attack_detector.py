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
SUBNET_SCAN_THRESHOLD = 30  # סך פורטים מכל הרשת ביחד
ALERT_COOLDOWN_SECONDS = 60
INTERFACE = "eth0"

# המפתח כאן הוא Subnet ולא IP בודד
subnet_scan_attempts = defaultdict(deque)
last_alert_time_by_subnet = {}

def get_subnet(ip: str) -> str:
    parts = ip.split(".")
    return f"{parts[0]}.{parts[1]}.{parts[2]}.0/24"

def cleanup_old_attempts(subnet: str, current_time: float) -> None:
    attempts = subnet_scan_attempts[subnet]
    while attempts and current_time - attempts[0][0] > TIME_WINDOW_SECONDS:
        attempts.popleft()


def should_send_alert(subnet: str, current_time: float) -> bool:
    last_time = last_alert_time_by_subnet.get(subnet)
    if last_time is None:
        return True
    return current_time - last_time >= ALERT_COOLDOWN_SECONDS

def send_alert(subnet: str, destination_ip: str, 
               unique_ports: list, unique_sources: list) -> None:
    payload = {
        "type": "Distributed Port Scan",
        "severity": 9,
        "source_ip": subnet,
        "destination_ip": destination_ip,
        "source_port": None,
        "destination_port": None,
        "protocol": "TCP",
        "description": f"Distributed scan from subnet {subnet}: "
                      f"{len(unique_sources)} IPs scanned "
                      f"{len(unique_ports)} unique ports in {TIME_WINDOW_SECONDS}s",
        "details": {
            "subnet": subnet,
            "unique_source_ips": unique_sources,
            "source_ip_count": len(unique_sources),
            "ports_scanned": unique_ports,
            "unique_port_count": len(unique_ports),
            "time_window": TIME_WINDOW_SECONDS,
            "threshold": SUBNET_SCAN_THRESHOLD,
            "detected_at": datetime.utcnow().isoformat() + "Z"
        },
        "packet_count": len(unique_ports),
        "resolved": False
    }

    try:
        response = requests.post(BACKEND_URL, json=payload, timeout=5)
        response.raise_for_status()
        print(f"[ALERT SENT] Distributed Port Scan | "
              f"subnet={subnet} | sources={len(unique_sources)} | "
              f"ports={len(unique_ports)}")
    except requests.RequestException as error:
        print(f"[ALERT ERROR] {error}")

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

    # ההבדל המרכזי – מחשבים את ה-Subnet
    subnet = get_subnet(source_ip)

    subnet_scan_attempts[subnet].append(
        (current_time, destination_port, source_ip)
    )
    cleanup_old_attempts(subnet, current_time)

    attempts = subnet_scan_attempts[subnet]
    unique_ports = sorted({entry[1] for entry in attempts})
    unique_sources = sorted({entry[2] for entry in attempts})

    print(f"[DISTRIBUTED] subnet={subnet} | "
          f"sources={len(unique_sources)} | ports={len(unique_ports)}")

    # מתריע רק כשיש יותר מ-IP אחד – אחרת זה סתם Port Scan רגיל
    if (len(unique_ports) >= SUBNET_SCAN_THRESHOLD and 
        len(unique_sources) >= 2 and
        should_send_alert(subnet, current_time)):
        
        send_alert(subnet, destination_ip, unique_ports, unique_sources)
        last_alert_time_by_subnet[subnet] = current_time


def main() -> None:
    print("Starting Distributed Port Scan detector...")
    print(f"Interface: {INTERFACE}")
    print(f"Threshold: {SUBNET_SCAN_THRESHOLD} unique ports from same subnet")
    print("Listening...\n")

    sniff(
        filter="tcp",
        prn=process_packet,
        store=False,
        iface=INTERFACE
    )


if __name__ == "__main__":
    main()