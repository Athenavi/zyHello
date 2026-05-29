"""
AES encryption/decryption — Python equivalent of AES.java.

Uses `cryptography` library (AES/ECB/PKCS5 padding, Base64 output).
"""
import base64
import os
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import padding
from cryptography.hazmat.backends import default_backend


# Default key (same as Java: "REBUILD2018")
_DEFAULT_KEY = "REBUILD2018"


def _get_pass_key() -> str:
    """Get AES key from environment or use default."""
    return os.environ.get("RB_PASS", _DEFAULT_KEY)


def _normalize_key(key: str) -> bytes:
    """Pad or truncate key to exactly 16 bytes (AES-128)."""
    key = key.ljust(16, "0")[:16]
    return key.encode("utf-8")


def encrypt(plaintext: str, key: str | None = None) -> str:
    """
    AES/ECB/PKCS5 encrypt → Base64 string.

    Args:
        plaintext: Text to encrypt.
        key: Optional 16-char key. Uses default if not provided.

    Returns:
        Base64-encoded ciphertext string.
    """
    if key is None:
        key = _get_pass_key()

    key_bytes = _normalize_key(key)
    data = plaintext.encode("utf-8")

    # PKCS7 padding (equivalent to Java PKCS5Padding for AES)
    padder = padding.PKCS7(128).padder()
    padded_data = padder.update(data) + padder.finalize()

    cipher = Cipher(algorithms.AES(key_bytes), modes.ECB(), backend=default_backend())
    encryptor = cipher.encryptor()
    ciphertext = encryptor.update(padded_data) + encryptor.finalize()

    return base64.b64encode(ciphertext).decode("utf-8")


def decrypt(ciphertext_b64: str, key: str | None = None) -> str:
    """
    Base64 input → AES/ECB/PKCS5 decrypt → plaintext.

    Args:
        ciphertext_b64: Base64-encoded ciphertext.
        key: Optional 16-char key. Uses default if not provided.

    Returns:
        Decrypted plaintext string.

    Raises:
        ValueError: If decryption fails.
    """
    if key is None:
        key = _get_pass_key()

    key_bytes = _normalize_key(key)
    ciphertext = base64.b64decode(ciphertext_b64)

    cipher = Cipher(algorithms.AES(key_bytes), modes.ECB(), backend=default_backend())
    decryptor = cipher.decryptor()
    padded_data = decryptor.update(ciphertext) + decryptor.finalize()

    # Remove PKCS7 padding
    unpadder = padding.PKCS7(128).unpadder()
    data = unpadder.update(padded_data) + unpadder.finalize()

    return data.decode("utf-8")


def decrypt_quietly(ciphertext_b64: str) -> str | None:
    """Decrypt, returning None on failure instead of raising."""
    try:
        return decrypt(ciphertext_b64)
    except Exception:
        return None
