import os
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_session
from app.core.config import get_settings
from app.models.models import Order, PaymentReceipt, OrderStatus
from app.schemas.schemas import PaymentReceiptResponse

router = APIRouter(prefix="/orders", tags=["orders"])
settings = get_settings()


async def save_file_background(file: UploadFile, destination: str):
    os.makedirs(os.path.dirname(destination), exist_ok=True)
    with open(destination, "wb") as f:
        content = await file.read()
        f.write(content)


@router.post("/{order_id}/payment", response_model=PaymentReceiptResponse, status_code=201)
async def upload_payment_receipt(
    order_id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status != OrderStatus.PENDING_PAYMENT:
        raise HTTPException(
            status_code=400,
            detail=f"Order status must be PENDING_PAYMENT, current status: {order.status}",
        )

    existing_receipt = await session.execute(
        select(PaymentReceipt).where(PaymentReceipt.order_id == order_id)
    )
    if existing_receipt.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Payment receipt already uploaded")

    file_ext = os.path.splitext(file.filename or "")[1] or ".bin"
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)

    background_tasks.add_task(save_file_background, file, file_path)

    receipt = PaymentReceipt(order_id=order_id, file_path=file_path)
    session.add(receipt)

    order.status = OrderStatus.PAYMENT_UNDER_REVIEW

    await session.commit()

    return PaymentReceiptResponse(
        id=receipt.id,
        order_id=order_id,
        file_path=file_path,
        uploaded_at=receipt.uploaded_at.isoformat() if receipt.uploaded_at else None,
    )
