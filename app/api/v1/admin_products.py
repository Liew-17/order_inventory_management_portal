import os
import random
import string
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from pydantic import BaseModel, Field
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.database import get_session
from app.models.models import Product
from app.schemas.schemas import ProductResponse

router = APIRouter(prefix="/admin/products", tags=["admin/products"])
settings = get_settings()


def generate_sku() -> str:
    date_str = datetime.utcnow().strftime("%Y%m%d")
    random_chars = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"SKU-{date_str}-{random_chars}"


async def save_file_background(file: UploadFile, destination: str):
    os.makedirs(os.path.dirname(destination), exist_ok=True)
    with open(destination, "wb") as f:
        content = await file.read()
        f.write(content)


# --- Schemas ---

class ProductCreate(BaseModel):
    name: str = Field(min_length=1)
    price: float = Field(gt=0)
    initial_stock: int = Field(ge=0)


class ProductUpdate(BaseModel):
    name: str = Field(min_length=1)
    price: float = Field(gt=0)


class StockAdjust(BaseModel):
    adjustment: int


# --- Module D: Create Product ---

@router.post("", response_model=ProductResponse, status_code=201)
async def create_product(
    products_data: list[ProductCreate],
    session: AsyncSession = Depends(get_session),
):
    created = []
    for product_data in products_data:
        sku = generate_sku()
        product = Product(
            sku=sku,
            name=product_data.name,
            price=product_data.price,
            stock_balance=product_data.initial_stock,
            is_active=True,
        )
        session.add(product)
        created.append(product)

    await session.commit()
    for product in created:
        await session.refresh(product)

    return [ProductResponse.model_validate(p) for p in created]


# --- Module E: Update Product ---

@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: int,
    product_data: ProductUpdate,
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(Product).where(Product.id == product_id)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    product.name = product_data.name
    product.price = product_data.price
    product.updated_at = datetime.utcnow()

    await session.commit()
    await session.refresh(product)
    return ProductResponse.model_validate(product)


# --- Module F: Upload Product Image ---

@router.post("/{product_id}/image", status_code=201)
async def upload_product_image(
    product_id: int,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(Product).where(Product.id == product_id)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    file_ext = os.path.splitext(file.filename or "")[1] or ".bin"
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)

    background_tasks.add_task(save_file_background, file, file_path)

    product.image_path = file_path
    product.updated_at = datetime.utcnow()
    await session.commit()

    return {"message": "Image uploaded", "image_path": file_path}


# --- Module G: Adjust Stock ---

@router.patch("/{product_id}/stock", response_model=ProductResponse)
async def adjust_stock(
    product_id: int,
    stock_data: StockAdjust,
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        update(Product)
        .where(Product.id == product_id)
        .where(Product.is_active == True)
        .where(Product.stock_balance + stock_data.adjustment >= 0)
        .values(
            stock_balance=Product.stock_balance + stock_data.adjustment,
            updated_at=datetime.utcnow()
        )
        .returning(Product.stock_balance)
    )
    updated_row = result.first()
    if updated_row is None:
        await session.rollback()
        raise HTTPException(
            status_code=400,
            detail="Stock adjustment failed: product not found, inactive, or would go negative",
        )

    await session.commit()

    result = await session.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one()
    return ProductResponse.model_validate(product)


# --- Module H: Soft Delete Product ---

@router.delete("/{product_id}", status_code=204)
async def soft_delete_product(
    product_id: int,
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(Product).where(Product.id == product_id)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    product.is_active = False
    product.updated_at = datetime.utcnow()
    await session.commit()
