from fastapi import APIRouter
from app.api.v1.products import router as products_router
from app.api.v1.orders import router as orders_router
from app.api.v1.payments import router as payments_router

api_router = APIRouter()

api_router.include_router(products_router)
api_router.include_router(orders_router)
api_router.include_router(payments_router)
