"""add geo device columns and tags

Revision ID: 0002
Revises: 0001
Create Date: 2026-04-24

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add geo/device columns to click_events
    op.add_column("click_events", sa.Column("country", sa.String(2), nullable=True))
    op.add_column("click_events", sa.Column("city", sa.String(100), nullable=True))
    op.add_column(
        "click_events", sa.Column("device_type", sa.String(20), nullable=True)
    )
    op.add_column("click_events", sa.Column("os_name", sa.String(50), nullable=True))
    op.add_column("click_events", sa.Column("browser", sa.String(50), nullable=True))

    # Create tags table
    op.create_table(
        "tags",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(50), nullable=False),
        sa.Column("color", sa.String(7), nullable=True),
        sa.Column(
            "user_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint("name", "user_id", name="uq_tag_name_user"),
    )

    # Create url_tags association table
    op.create_table(
        "url_tags",
        sa.Column(
            "url_id",
            UUID(as_uuid=True),
            sa.ForeignKey("urls.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "tag_id",
            UUID(as_uuid=True),
            sa.ForeignKey("tags.id", ondelete="CASCADE"),
            primary_key=True,
        ),
    )


def downgrade() -> None:
    op.drop_table("url_tags")
    op.drop_table("tags")
    op.drop_column("click_events", "browser")
    op.drop_column("click_events", "os_name")
    op.drop_column("click_events", "device_type")
    op.drop_column("click_events", "city")
    op.drop_column("click_events", "country")
