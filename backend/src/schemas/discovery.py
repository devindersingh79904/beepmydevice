"""Request and response contracts for WiFi discovery endpoints."""

import ipaddress
import uuid
from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from src.utils.constants import MAX_DISCOVERED_PER_SCAN, DiscoverySource
from src.utils.validators import MAC_ADDRESS_PATTERN


class DiscoveredDeviceInput(BaseModel):
    """One observation from a client's scan.

    Everything here is a *claim by the scanning phone*, not a fact the server
    can check, so it is validated at the edge and never used for authorization.
    What decides access is the ``wifi_mac`` on the enclosing submission, which
    is checked against a network the caller actually administers.
    """

    ip_address: str = Field(max_length=45)
    # mDNS reports a name; a sweep usually cannot, and the client sends null
    # rather than inventing "Device-42" so the dashboard can say "unnamed"
    # honestly.
    device_name: str | None = Field(default=None, max_length=255)
    device_type: str | None = Field(default=None, max_length=50)
    discovered_via: DiscoverySource

    @field_validator("ip_address")
    @classmethod
    def _validate_ip(cls, value: str) -> str:
        """Reject anything that is not an IP address.

        This value is displayed to the admin and used as half the row's
        identity, so a free-text field here would let a scanning client write
        arbitrary strings into someone's dashboard.
        """
        try:
            ipaddress.ip_address(value)
        except ValueError as exc:
            raise ValueError("must be an IP address") from exc
        return value


class ScanSubmission(BaseModel):
    """Body of POST /devices/scan.

    Sent by a phone that is *on* the network it is describing. The server
    cannot perform this scan itself -- it is a cloud relay, and a scan there
    enumerates the datacenter -- so this endpoint is the only way these rows
    ever appear.
    """

    wifi_mac: str
    devices: list[DiscoveredDeviceInput] = Field(max_length=MAX_DISCOVERED_PER_SCAN)

    @field_validator("wifi_mac")
    @classmethod
    def _validate_mac(cls, value: str) -> str:
        """Reject a malformed MAC before it is used to look up a network."""
        if not MAC_ADDRESS_PATTERN.match(value):
            raise ValueError("must be a MAC address, e.g. 00:1A:2B:3C:4D:5E")
        return value


class DiscoveredDeviceResponse(BaseModel):
    """One row of GET /devices/discovered."""

    model_config = {"from_attributes": True}

    discovered_id: uuid.UUID
    ip_address: str
    device_name: str | None
    device_type: str | None
    discovered_via: str
    first_seen: datetime
    last_seen: datetime
