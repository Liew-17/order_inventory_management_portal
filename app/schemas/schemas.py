from pydantic import BaseModel, Field
from app.models.models import OrderStatus


class ProductBase(BaseModel):
    sku: str
    name: str
    price: float = Field(gt=0)
    stock_balance: int = Field(ge=0)
    image_path: str | None = None


class ProductResponse(ProductBase):
    id: int
    updated_at: str | None = None

    class Config:
        from_attributes = True


class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)


class OrderItemResponse(BaseModel):
    id: int
    product_id: int
    quantity: int
    price_at_time: float

    class Config:
        from_attributes = True


class OrderCreate(BaseModel):
    items: list[OrderItemCreate]


class OrderResponse(BaseModel):
    id: str
    total_amount: float
    status: OrderStatus
    created_at: str | None = None
    items: list[OrderItemResponse] = []

    class Config:
        from_attributes = True


class PaymentReceiptResponse(BaseModel):
    id: int
    order_id: str
    file_path: str
    uploaded_at: str | None = None

    class Config:
        from_attributes = True


class ErrorResponse(BaseModel):
    detail: str
