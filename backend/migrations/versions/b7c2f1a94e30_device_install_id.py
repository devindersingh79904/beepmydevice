"""stable install identity for devices

Adds devices.install_id: a value the platform keeps for one app on one device
across reinstalls and push-token rotations.

Without it a device is identified by its push token, which changes every time
the app is reinstalled -- so a reinstall left the old row behind and the phone
appeared in its owner's dashboard twice, three times, once per install.

Nullable and unindexed-unique on purpose. Nullable because a client older than
this column sends nothing, and those registrations must keep working through
the push-token path. Not unique because the same physical device legitimately
holds two rows on one network: one owned, one guest.

Revision ID: b7c2f1a94e30
Revises: aff527dded91
Create Date: 2026-09-05 11:35:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "b7c2f1a94e30"
down_revision: str | None = "aff527dded91"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Apply this migration."""
    op.add_column("devices", sa.Column("install_id", sa.String(length=255), nullable=True))
    # Every registration looks this up, and it is the hot path for a client
    # that reinstalls or rotates its token.
    op.create_index(op.f("ix_devices_install_id"), "devices", ["install_id"], unique=False)


def downgrade() -> None:
    """Revert this migration."""
    op.drop_index(op.f("ix_devices_install_id"), table_name="devices")
    op.drop_column("devices", "install_id")
