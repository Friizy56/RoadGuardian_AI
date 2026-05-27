import socket

# This is the Supabase database host used by the application.
HOSTNAME_TO_TEST = "db.puxreqmxvmdoypaltwpq.supabase.co"


def test_hostname_resolution():
    """
    Tests whether a hostname can be resolved to one or more IP addresses.
    This supports both IPv4 and IPv6 resolution.
    """
    print(f"Attempting to resolve hostname: {HOSTNAME_TO_TEST}")
    try:
        results = socket.getaddrinfo(HOSTNAME_TO_TEST, 5432)
        addresses = sorted({result[4][0] for result in results})
        print(f"✅ SUCCESS: Hostname resolved to: {', '.join(addresses)}")
        print("This means the hostname is valid and DNS resolution is working.")
    except socket.gaierror as exc:
        print(f"❌ FAILURE: Could not resolve hostname '{HOSTNAME_TO_TEST}': {exc}")
        print("This indicates a DNS or network issue, not necessarily an incorrect hostname.")
        print("Check IPv6 connectivity, DNS configuration, or your network path to Supabase.")

if __name__ == "__main__":
    test_hostname_resolution()
