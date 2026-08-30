"""Device model — a registered phone, tablet, laptop or desktop."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base
from src.utils.constants import DeviceStatus


class Device(Base):
    """A device that can be alerted.

    ``push_token`` is the Firebase (Android) or APNs (iOS) token used to
    deliver the beep. It is refreshed by the client whenever the platform
    rotates it, so it must never be treated as a stable identifier.

    ``user_id`` is nullable, and that is what distinguishes the two kinds of
    device:

    * **Owned** -- registered by a signed-in user, who is the network admin and
      may send alerts.
    * **Guest** -- auto-registered with no account. Belongs to a ``wifi_id`` but
      to no user. Receives alerts, and cannot send them because sending
      requires a user token it does not have.

    Guest-ness is derived from ``user_id`` rather than stored in its own
    column, so the two can never disagree.
    """

    __tablename__ = "devices"

    device_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    # Null for guest devices, which belong to a network but to no account.
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=True, index=True
    )
    wifi_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("wifi_networks.wifi_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    device_name: Mapped[str | None] = mapped_column(String(255))
    device_type: Mapped[str] = mapped_column(String(50), nullable=False)
    device_os_version: Mapped[str | None] = mapped_column(String(50))
    push_token: Mapped[str | None] = mapped_column(String(500))
    battery_level: Mapped[int | None] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(50), default=DeviceStatus.OFFLINE.value)
    last_heartbeat: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped["User | None"] = relationship(back_populates="devices")  # noqa: F821
    wifi_network: Mapped["WiFiNetwork"] = relationship(back_populates="devices")  # noqa: F821

    @property
    def is_guest(self) -> bool:
        """True when this device auto-registered without an account.

        A guest may receive alerts but never send them.
        """
        return self.user_id is None

    def __repr__(self) -> str:
        return f"<Device device_id={self.device_id} name={self.device_name} status={self.status}>"
