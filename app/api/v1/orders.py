from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, update, cast, String
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_session
from app.models.models import Order, OrderItem, Product, OrderStatus, PaymentReceipt
from app.schemas.schemas import OrderCreate, OrderResponse, OrderItemResponse, PaymentReceiptResponse

router = APIRouter(prefix="/orders", tags=["orders"])


def build_order_response(
    order: Order,
    items: list,
    payment_receipt: PaymentReceipt | None = None,
    products: dict[int, Product] | None = None
) -> OrderResponse:
    """Helper to build OrderResponse with items and optional payment receipt."""
    receipt_response = None
    if payment_receipt:
        receipt_response = PaymentReceiptResponse(
            id=payment_receipt.id,
            order_id=payment_receipt.order_id,
            file_path=payment_receipt.file_path,
            uploaded_at=payment_receipt.uploaded_at.isoformat() if payment_receipt.uploaded_at else None,
        )

    def get_item_response(item: OrderItem) -> OrderItemResponse:
        product_name = None
        if products and item.product_id in products:
            product_name = products[item.product_id].name
        return OrderItemResponse(
            id=item.id,
            product_id=item.product_id,
            product_name=product_name,
            quantity=item.quantity,
            price_at_time=item.price_at_time,
        )

    return OrderResponse(
        id=order.id,
        total_amount=order.total_amount,
        status=order.status,
        created_at=order.created_at.isoformat() if order.created_at else None,
        items=[get_item_response(item) for item in items],
        payment_receipt=receipt_response,
    )


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

    # Fetch products for item names (after commit since products were modified in transaction)
    product_ids_in_order = [item_data["product_id"] for item_data in order_items_data]
    products_result = await session.execute(
        select(Product).where(Product.id.in_(product_ids_in_order))
    )
    products_map = {p.id: p for p in products_result.scalars().all()}

    result = await session.execute(select(Order).where(Order.id == new_order.id))
    created_order = result.scalar_one()

    items_result = await session.execute(
        select(OrderItem).where(OrderItem.order_id == created_order.id)
    )
    items = items_result.scalars().all()

    return build_order_response(created_order, items, None, products_map)


@router.get("", response_model=list[OrderResponse])
async def list_orders(
    order_id: str | None = Query(None, description="Filter by order ID"),
    status: str | None = Query(None, description="Filter by status"),
    session: AsyncSession = Depends(get_session),
):
    """
    Get list of orders with optional filters.
    - If order_id is provided, returns only that specific order
    - If status is provided, filters by order status
    """
    query = select(Order)

    if order_id:
        query = query.where(Order.id == order_id)
    elif status:
        # Cast status column to text for comparison since DB stores VARCHAR
        query = query.where(cast(Order.status, String) == status)

    query = query.order_by(Order.created_at.desc())

    result = await session.execute(query)
    orders = result.scalars().all()

    # Fetch items and payment receipt for each order
    orders_with_items = []
    for order in orders:
        items_result = await session.execute(
            select(OrderItem).where(OrderItem.order_id == order.id)
        )
        items = items_result.scalars().all()

        # Fetch products for item names
        product_ids = list(set(item.product_id for item in items))
        products_result = await session.execute(
            select(Product).where(Product.id.in_(product_ids)))
        products_map = {p.id: p for p in products_result.scalars().all()}

        receipt_result = await session.execute(
            select(PaymentReceipt).where(PaymentReceipt.order_id == order.id)
        )
        receipt = receipt_result.scalar_one_or_none()

        orders_with_items.append(build_order_response(order, items, receipt, products_map))

    return orders_with_items


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: str,
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    items_result = await session.execute(
        select(OrderItem).where(OrderItem.order_id == order_id)
    )
    items = items_result.scalars().all()

    receipt_result = await session.execute(
        select(PaymentReceipt).where(PaymentReceipt.order_id == order_id)
    )
    receipt = receipt_result.scalar_one_or_none()

    # Fetch products for item names
    product_ids = list(set(item.product_id for item in items))
    products_result = await session.execute(
        select(Product).where(Product.id.in_(product_ids)))
    products_map = {p.id: p for p in products_result.scalars().all()}

    return build_order_response(order, items, receipt, products_map)
