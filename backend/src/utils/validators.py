"""Reusable input validators.

Validation itself lives in the Pydantic schemas in ``src.schemas``: they run at
the API edge, report every bad field at once, and are what the OpenAPI spec is
generated from. This module holds only what those schemas share and what the
services need at runtime.

It once also carried a parallel set of ``validate_*`` functions returning error
entries. Nothing called them -- every rule they described was already enforced
by a schema -- and a second, unreachable copy of the validation rules is worse
than none: it drifts from the enforced one and reads as though it still guards
something.
"""

import re

MAC_ADDRESS_PATTERN = re.compile(r"^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$")


def normalize_mac_address(mac_address: str) -> str:
    """Normalise a MAC to uppercase colon-separated form for storage/comparison."""
    return mac_address.replace("-", ":").upper()
