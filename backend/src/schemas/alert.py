"""Request and response contracts for alert endpoints."""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from src.utils.constants import AlertStatus


class SendAlertRequest(BaseModel):
    """Body of POST /alerts/send.

    An empty device_ids list means every device on the sender network.
    """

    device_ids: list[uuid.UUID] = Field(default_factory=list)


class AlertDeliveryStatus(BaseModel):
    """Per-device outcome of one alert."""

    device_id: uuid.UUID
    device_name: str | None
    status: AlertStatus
    error_code: str | None = None


class SendAlertResponse(BaseModel):
    """Result of POST /alerts/send."""

    alert_id: uuid.UUID
    delivery_status: list[AlertDeliveryStatus]


class AlertLogResponse(BaseModel):
    """One row from the alert history."""

    model_config = {"from_attributes": True}

    alert_id: uuid.UUID
    target_devices: list[str]
    status: AlertStatus
    created_at: datetime
