import html
import os
import re
import secrets
import string
import uuid
from typing import Dict, Iterable, List, Optional

import bcrypt
import bleach
from cryptography.fernet import Fernet

FORBIDDEN_PATTERNS: List[re.Pattern[str]] = [
    re.compile(pattern, re.IGNORECASE)
    for pattern in [
        r"<\s*script",
        r"select\s+.*from",
        r"delete\s+from",
        r"drop\s+table",
        r"insert\s+into",
        r"--",
    ]
]

DEFAULT_PASSWORD = "uvu"
WORD_LIST = [
    "sage",
    "valley",
    "trail",
    "river",
    "pine",
    "willow",
    "summit",
    "canyon",
]


class SanitizationError(ValueError):
    """Raised when input contains disallowed content."""


class PasswordPatternError(ValueError):
    """Raised when a password pattern cannot be parsed."""


def sanitize_plaintext(value: str) -> str:
    cleaned = bleach.clean(value, strip=True, tags=[], attributes={}, styles=[])
    cleaned = html.escape(cleaned, quote=True)
    for pattern in FORBIDDEN_PATTERNS:
        if pattern.search(cleaned):
            raise SanitizationError("Input contains forbidden content")
    return cleaned


def generate_uuid() -> str:
    return str(uuid.uuid4())


def get_fernet(key: str) -> Fernet:
    return Fernet(key.encode())


def hash_passphrase(passphrase: str) -> str:
    return bcrypt.hashpw(passphrase.encode(), bcrypt.gensalt()).decode()


def verify_passphrase(passphrase: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(passphrase.encode(), hashed.encode())
    except ValueError:
        return False


def build_secret_payload(ciphertext: bytes, passphrase_hash: str, one_time: bool) -> Dict[str, str]:
    return {
        "ciphertext": ciphertext.decode(),
        "passphrase_hash": passphrase_hash,
        "one_time": str(one_time).lower(),
    }


def parse_one_time(value: str) -> bool:
    return value.lower() == "true"


def generate_password_from_pattern(pattern: str) -> str:
    if not pattern:
        raise PasswordPatternError("Pattern cannot be empty")

    index = 0
    result: List[str] = []
    length = len(pattern)

    while index < length:
        token = pattern[index]
        index += 1

        count = 1
        if index < length and pattern[index] == "*":
            index += 1
            number_start = index
            while index < length and pattern[index].isdigit():
                index += 1
            if number_start == index:
                raise PasswordPatternError("Missing multiplier after '*'")
            count = int(pattern[number_start:index])
            if count <= 0:
                raise PasswordPatternError("Multiplier must be positive")

        generator = _get_generator_for_token(token)
        result.extend(generator(count))

    return "".join(result)


def _get_generator_for_token(token: str):
    token_map = {
        "w": _generate_words,
        "W": lambda count: (word.capitalize() for word in _generate_words(count)),
        "n": _generate_numbers,
        "s": _generate_separators,
        "r": _generate_random_chars,
        "S": _generate_special_chars,
        "a": _generate_alphanumerics,
    }
    if token not in token_map:
        raise PasswordPatternError(f"Unsupported token '{token}'")
    return token_map[token]


def _generate_words(count: int) -> Iterable[str]:
    for _ in range(count):
        yield secrets.choice(WORD_LIST)


def _generate_numbers(count: int) -> Iterable[str]:
    digits = string.digits
    for _ in range(count):
        yield secrets.choice(digits)


def _generate_separators(count: int) -> Iterable[str]:
    for _ in range(count):
        yield "-"


def _generate_random_chars(count: int) -> Iterable[str]:
    charset = string.ascii_letters + string.digits
    for _ in range(count):
        yield secrets.choice(charset)


def _generate_special_chars(count: int) -> Iterable[str]:
    charset = "!@#$%^&*()_+[]{}?"
    for _ in range(count):
        yield secrets.choice(charset)


def _generate_alphanumerics(count: int) -> Iterable[str]:
    charset = string.ascii_letters + string.digits
    for _ in range(count):
        yield secrets.choice(charset)
