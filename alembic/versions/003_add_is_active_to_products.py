"""Add is_active to products (soft delete)

Revision ID: 003
Revises: 002
Create Date: 2026-05-06

"""
from alembic import op
import sqlalchemy as sa

revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('products', sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'))


def downgrade() -> None:
    op.drop_column('products', 'is_active')
