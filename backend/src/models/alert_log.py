"""Alert log model — an audit record of every alert attempt."""

import uuid
from datetime import datetime

from sqlalchemy import ARRAY, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.database import Base


class AlertLog(Base):
    """One alert send, retained for auditing and debugging.

    ``target_devices`` stores device IDs as a plain text array rather than a
    join table: rows are written once and never queried by individual target,
    so a join table would add cost without buying anything.
    """

    __tablename__ = "alert_logs"

    alert_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    sender_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False, index=True
    )
    wifi_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("wifi_networks.wifi_id"), nullable=False
    )
    target_devices: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list)
    status: Mapped[str] = mapped_column(String(50), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )

    def __repr__(self) -> str:
        return f"<AlertLog alert_id={self.alert_id} status={self.status}>"
