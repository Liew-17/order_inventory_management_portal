import uuid
from datetime import datetime
from enum import Enum as PyEnum
from typing import Optional, List

from sqlmodel import SQLModel, Field, Relationship


class OrderStatus(str, PyEnum):
    PENDING_PAYMENT = "PENDING_PAYMENT"
    PAYMENT_UNDER_REVIEW = "PAYMENT_UNDER_REVIEW"
    COMPLETED = "COMPLETED"


class Product(SQLModel, table=True):
    __tablename__ = "products"

    id: Optional[int] = Field(default=None, primary_key=True)
    sku: str = Field(unique=True, nullable=False, index=True)
    name: str = Field(nullable=False)
    price: float = Field(nullable=False)
    stock_balance: int = Field(nullable=False, ge=0)
    image_path: Optional[str] = Field(default=None)
    updated_at: Optional[datetime] = Field(default_factory=datetime.utcnow)


class Order(SQLModel, table=True):
    __tablename__ = "orders"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    total_amount: float = Field(nullable=False)
    status: OrderStatus = Field(default=OrderStatus.PENDING_PAYMENT)
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)

    items: List["OrderItem"] = Relationship(back_populates="order")
    payment_receipt: Optional["PaymentReceipt"] = Relationship(back_populates="order")


class OrderItem(SQLModel, table=True):
    __tablename__ = "order_items"

    id: Optional[int] = Field(default=None, primary_key=True)
    order_id: str = Field(foreign_key="orders.id", nullable=False)
    product_id: int = Field(foreign_key="products.id", nullable=False)
    quantity: int = Field(nullable=False, gt=0)
    price_at_time: float = Field(nullable=False)

    order: Optional[Order] = Relationship(back_populates="items")
    product: Optional[Product] = Relationship()


class PaymentReceipt(SQLModel, table=True):
    __tablename__ = "payment_receipts"

    id: Optional[int] = Field(default=None, primary_key=True)
    order_id: str = Field(unique=True, foreign_key="orders.id", nullable=False)
    file_path: str = Field(nullable=False)
    uploaded_at: Optional[datetime] = Field(default_factory=datetime.utcnow)

    order: Optional[Order] = Relationship(back_populates="payment_receipt")
