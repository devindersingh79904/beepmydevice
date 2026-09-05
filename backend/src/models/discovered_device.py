"""Discovered device model — something seen on the WiFi, not registered to it."""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base

if TYPE_CHECKING:
    from src.models.wifi_network import WiFiNetwork


class DiscoveredDevice(Base):
    """Something a phone saw on the network that is not a registered device.

    These rows are *observations*, not devices. They carry no push token and
    can never be alerted -- a discovered smart TV has no app on it to ring.
    What they are for is telling the admin what else is on the network, so the
    dashboard can say "and here are four things you have not installed the app
    on yet" instead of implying the registered list is the whole house.

    **The scan runs on a phone, never on the server.** The API is a cloud
    relay: an ARP or subnet scan there enumerates the hosting provider's
    network, not the user's home, and would never see a single one of these.
    So a client on the network scans and submits, and this table is the record
    of what it submitted.

    Identity is ``(wifi_id, ip_address)`` rather than a MAC address, because a
    MAC is not obtainable. Android has blocked ``/proc/net/arp`` since API 29
    and neither mDNS nor an HTTP probe reveals one, so a MAC column would be
    null for every row -- and keying on it, as the obvious design does, would
    collapse the entire network into one row. IP is weaker (DHCP reassigns it)
    but it is real.
    """

    __tablename__ = "discovered_devices"
    __table_args__ = (
        # One row per address per network. A rescan updates rather than
        # accumulating a new row every time the user presses the button.
        UniqueConstraint("wifi_id", "ip_address", name="uq_discovered_wifi_ip"),
    )

    discovered_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    wifi_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("wifi_networks.wifi_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    ip_address: Mapped[str] = mapped_column(String(45), nullable=False)
    # Whatever the scan could learn. mDNS gives a real name; an HTTP probe
    # gives nothing, and the client sends null rather than inventing one.
    device_name: Mapped[str | None] = mapped_column(String(255))
    device_type: Mapped[str | None] = mapped_column(String(50))
    # How this was seen: MDNS or SWEEP. Kept because the two differ in what
    # they can be trusted to have found -- an mDNS name is self-reported by the
    # device, a sweep result is only "something answered here".
    discovered_via: Mapped[str] = mapped_column(String(20), nullable=False)
    first_seen: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_seen: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    wifi_network: Mapped["WiFiNetwork"] = relationship(back_populates="discovered_devices")

    def __repr__(self) -> str:
        return f"<DiscoveredDevice ip={self.ip_address} name={self.device_name}>"
