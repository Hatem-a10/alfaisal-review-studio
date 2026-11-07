"""Print a salted Review Studio admin password hash. Never echoes the password."""
import getpass
import hashlib
import secrets
import sys

if not sys.stdin.isatty():
    sys.exit("Run in an interactive terminal.")

password = getpass.getpass("New admin password: ")
if not password or len(password) > 256:
    sys.exit("Enter a nonempty password of at most 256 characters.")
if password != getpass.getpass("Confirm admin password: "):
    sys.exit("Passwords do not match.")

salt = secrets.token_bytes(16)
digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 600_000)
print(f"pbkdf2-sha256$600000${salt.hex()}${digest.hex()}")
