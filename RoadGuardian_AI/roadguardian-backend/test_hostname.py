import socket

# This is the hostname that is currently failing.
# You MUST replace this with the correct one from your Supabase dashboard.
HOSTNAME_TO_TEST = "db.puxreqmxvmdoypaltwpq.supabase.co"

def test_hostname_resolution():
    """
    Tests if a given hostname can be resolved to an IP address.
    This is the most basic network check.
    """
    print(f"Attempting to resolve hostname: {HOSTNAME_TO_TEST}")
    try:
        # Try to get the IP address for the hostname
        ip_address = socket.gethostbyname(HOSTNAME_TO_TEST)
        print(f"✅ SUCCESS: Hostname resolved to IP address: {ip_address}")
        print("This means the hostname is correct and reachable.")
    except socket.gaierror:
        # This is the exact error your application is getting (getaddrinfo failed)
        print(f"❌ FAILURE: Could not resolve hostname '{HOSTNAME_TO_TEST}'.")
        print("This confirms the hostname is WRONG.")
        print("Please go to your Supabase project's database settings and copy the correct host.")

if __name__ == "__main__":
    test_hostname_resolution()
