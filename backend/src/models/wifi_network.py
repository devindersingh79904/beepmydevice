"""WiFi network model — the alert group boundary."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base


class WiFiNetwork(Base):
    """A home network, identified by its router's MAC address.

    This is the unit of authorization for the whole system: two devices may be
    alerted together if and only if they share a ``wifi_id``. ``mac_address``
    is unique, so the same physical router maps to exactly one row.
    """

    __tablename__ = "wifi_networks"

    wifi_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True
    )
    network_name: Mapped[str | None] = mapped_column(String(255))
    mac_address: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="wifi_networks")  # noqa: F821
    devices: Mapped[list["Device"]] = relationship(  # noqa: F821
        back_populates="wifi_network", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<WiFiNetwork wifi_id={self.wifi_id} name={self.network_name}>"
