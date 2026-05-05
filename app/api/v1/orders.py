from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.db.database import get_session
from app.models.models import Order, OrderItem, Product, OrderStatus
from app.schemas.schemas import OrderCreate, OrderResponse, OrderItemResponse

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post("", response_model=OrderResponse, status_code=201)
async def create_order(
    order_data: OrderCreate,
    session: AsyncSession = Depends(get_session),
):
    if not order_data.items:
        raise HTTPException(status_code=400, detail="Order must contain at least one item")

    async with session.begin():
        product_ids = [item.product_id for item in order_data.items]
        products_result = await session.execute(
            select(Product).where(Product.id.in_(product_ids))
        )
        products = {p.id: p for p in products_result.scalars().all()}

        if len(products) != len(product_ids):
            raise HTTPException(status_code=400, detail="Some products not found")

        order_items_data = []
        total_amount = 0.0

        for item in order_data.items:
            product = products[item.product_id]
            if product.stock_balance < item.quantity:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient stock for product {product.sku}. Available: {product.stock_balance}",
                )

            result = await session.execute(
                update(Product)
                .where(Product.id == item.product_id)
                .where(Product.stock_balance >= item.quantity)
                .values(stock_balance=Product.stock_balance - item.quantity)
                .returning(Product.stock_balance)
            )
            updated_row = result.first()
            if updated_row is None:
                raise HTTPException(
                    status_code=400,
                    detail=f"Concurrent update conflict for product {product.sku}",
                )

            order_items_data.append(
                {
                    "product_id": item.product_id,
                    "quantity": item.quantity,
                    "price_at_time": product.price,
                }
            )
            total_amount += product.price * item.quantity

        new_order = Order(total_amount=total_amount, status=OrderStatus.PENDING_PAYMENT)
        session.add(new_order)
        await session.flush()

        for item_data in order_items_data:
            order_item = OrderItem(order_id=new_order.id, **item_data)
            session.add(order_item)

        await session.commit()

    result = await session.execute(select(Order).where(Order.id == new_order.id))
    created_order = result.scalar_one()

    items_result = await session.execute(
        select(OrderItem).where(OrderItem.order_id == created_order.id)
    )
    items = items_result.scalars().all()

    return OrderResponse(
        id=created_order.id,
        total_amount=created_order.total_amount,
        status=created_order.status,
        created_at=created_order.created_at.isoformat() if created_order.created_at else None,
        items=[
            OrderItemResponse(
                id=item.id,
                product_id=item.product_id,
                quantity=item.quantity,
                price_at_time=item.price_at_time,
            )
            for item in items
        ],
    )


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: str,
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_orNone()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    items_result = await session.execute(
        select(OrderItem).where(OrderItem.order_id == order_id)
    )
    items = items_result.scalars().all()

    return OrderResponse(
        id=order.id,
        total_amount=order.total_amount,
        status=order.status,
        created_at=order.created_at.isoformat() if order.created_at else None,
        items=[
            OrderItemResponse(
                id=item.id,
                product_id=item.product_id,
                quantity=item.quantity,
                price_at_time=item.price_at_time,
            )
            for item in items
        ],
    )
