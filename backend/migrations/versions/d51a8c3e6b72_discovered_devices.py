"""devices seen on the WiFi but not registered

Adds discovered_devices: what a phone reported seeing on its network.

Identified by (wifi_id, ip_address), not by MAC. A MAC would be the obvious
key and is not obtainable: Android has blocked /proc/net/arp since API 29, and
neither mDNS nor an HTTP probe reveals one. A nullable MAC column keyed on
would collapse a whole network into a single row.

Revision ID: d51a8c3e6b72
Revises: c4d9e2b71a05
Create Date: 2026-09-05 14:40:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "d51a8c3e6b72"
down_revision: str | None = "c4d9e2b71a05"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Apply this migration."""
    op.create_table(
        "discovered_devices",
        sa.Column("discovered_id", sa.UUID(as_uuid=True), nullable=False),
        sa.Column("wifi_id", sa.UUID(as_uuid=True), nullable=False),
        sa.Column("ip_address", sa.String(length=45), nullable=False),
        sa.Column("device_name", sa.String(length=255), nullable=True),
        sa.Column("device_type", sa.String(length=50), nullable=True),
        sa.Column("discovered_via", sa.String(length=20), nullable=False),
        sa.Column(
            "first_seen", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "last_seen", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(["wifi_id"], ["wifi_networks.wifi_id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("discovered_id"),
        sa.UniqueConstraint("wifi_id", "ip_address", name="uq_discovered_wifi_ip"),
    )
    op.create_index(
        op.f("ix_discovered_devices_wifi_id"), "discovered_devices", ["wifi_id"], unique=False
    )


def downgrade() -> None:
    """Revert this migration."""
    op.drop_index(op.f("ix_discovered_devices_wifi_id"), table_name="discovered_devices")
    op.drop_table("discovered_devices")
