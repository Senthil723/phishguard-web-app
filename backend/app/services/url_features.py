
import ipaddress
import math
import re
from collections import Counter
from urllib.parse import urlsplit, unquote


SUSPICIOUS_WORDS = {
    "login", "signin", "verify", "verification", "account",
    "secure", "update", "password", "banking", "wallet",
    "confirm", "authentication", "authenticate", "suspended",
    "billing", "payment", "recover", "webscr", "ebayisapi",
}

FEATURE_NAMES = [
    "url_length",
    "hostname_length",
    "path_length",
    "query_length",
    "fragment_length",
    "dot_count",
    "subdomain_count",
    "digit_count",
    "letter_count",
    "special_character_count",
    "hyphen_count",
    "underscore_count",
    "at_count",
    "question_mark_count",
    "equal_count",
    "ampersand_count",
    "percent_count",
    "slash_count",
    "https",
    "has_ip_address",
    "hostname_entropy",
    "path_depth",
    "tld_length",
    "has_punycode",
    "suspicious_keyword_count",
    "encoded_character_count",
    "query_parameter_count",
    "has_fragment",
    "has_port",
]


def calculate_entropy(value: str) -> float:
    """Calculate Shannon character entropy."""
    if not value:
        return 0.0

    counts = Counter(value)
    length = len(value)

    return -sum(
        (count / length) * math.log2(count / length)
        for count in counts.values()
    )


def extract_url_features(url: str) -> dict[str, float]:
    """Extract numeric features from a URL without visiting the website."""

    if not isinstance(url, str) or not url.strip():
        raise ValueError("A non-empty URL is required.")

    url = url.strip()

    if len(url) > 8192:
        raise ValueError("URL is too long.")

    parsed = urlsplit(url)
    hostname = (parsed.hostname or "").lower()
    path = parsed.path or ""
    query = parsed.query or ""
    fragment = parsed.fragment or ""

    if not hostname:
        raise ValueError("URL must contain a valid hostname.")

    try:
        ipaddress.ip_address(hostname)
        has_ip = 1.0
    except ValueError:
        has_ip = 0.0

    labels = hostname.split(".")
    tld = labels[-1] if len(labels) > 1 else ""

    if has_ip:
        subdomain_count = 0
    else:
        subdomain_count = max(0, len(labels) - 2)

    decoded_url = unquote(url)
    suspicious_count = sum(
        len(re.findall(rf"(?i)(?<![a-z]){re.escape(word)}(?![a-z])", decoded_url))
        for word in SUSPICIOUS_WORDS
    )

    try:
        has_port = 1.0 if parsed.port is not None else 0.0
    except ValueError:
        has_port = 1.0

    return {
        "url_length": float(len(url)),
        "hostname_length": float(len(hostname)),
        "path_length": float(len(path)),
        "query_length": float(len(query)),
        "fragment_length": float(len(fragment)),
        "dot_count": float(url.count(".")),
        "subdomain_count": float(subdomain_count),
        "digit_count": float(sum(char.isdigit() for char in url)),
        "letter_count": float(sum(char.isalpha() for char in url)),
        "special_character_count": float(
            sum(not char.isalnum() for char in url)
        ),
        "hyphen_count": float(url.count("-")),
        "underscore_count": float(url.count("_")),
        "at_count": float(url.count("@")),
        "question_mark_count": float(url.count("?")),
        "equal_count": float(url.count("=")),
        "ampersand_count": float(url.count("&")),
        "percent_count": float(url.count("%")),
        "slash_count": float(url.count("/")),
        "https": float(parsed.scheme.lower() == "https"),
        "has_ip_address": has_ip,
        "hostname_entropy": calculate_entropy(hostname),
        "path_depth": float(len([part for part in path.split("/") if part])),
        "tld_length": float(len(tld)),
        "has_punycode": float("xn--" in hostname),
        "suspicious_keyword_count": float(suspicious_count),
        "encoded_character_count": float(
            len(re.findall(r"%[0-9a-fA-F]{2}", url))
        ),
        "query_parameter_count": float(
            len([part for part in query.split("&") if part])
        ),
        "has_fragment": float(bool(fragment)),
        "has_port": has_port,
    }
