# 轻量级订货与库存管理门户 - 商品管理后端需求 (V1.1)

**Context for AI Assistant (Claude Code):** 
> This file is located at `/features/product_management/backend.md`. It is a feature extension. You must reference and strictly adhere to the base database and backend architecture defined in the file named "backend_db_requirements_v1.md".

## 1. 模块概览
本模块属于后台管理（Admin）功能，允许管理员添加新商品、修改商品基础信息、上传商品图片、安全地调整库存（增/减），以及下架（软删除）商品。此模块需完全融入现有的 FastAPI 和 PostgreSQL 架构。

## 2. 核心业务逻辑实现与数据表扩展

### 2.1 数据库扩展: 引入软删除 (Soft Delete)
为防止物理删除导致历史订单数据冲突，禁止物理删除商品。需在 `products` 表新增 `is_active` (BOOLEAN, 默认 `TRUE`)。前端商店大厅必须过滤仅显示 `is_active = TRUE` 的商品。

### 2.2 SKU 自动生成逻辑 (SKU Generation)
后端在创建商品时自动生成唯一编码，格式建议为 `SKU-{YYYYMMDD}-{4位随机字符}`。需利用数据库 `UNIQUE` 约束确保唯一性。

### 2.3 并发安全的库存调整 (Concurrency-Safe Stock Adjustment)
严禁前端传递计算后的绝对库存值。必须传递相对变化值（`adjustment`），并执行原子更新：`UPDATE products SET stock_balance = stock_balance + :adjustment WHERE id = :id AND (stock_balance + :adjustment) >= 0`。若更新行数为 0，则返回 `400 Bad Request`。

## 3. API 接口定义 (Admin APIs)

#### 模块 D: 添加新商品 (Create Product)
**接口**: `POST /api/v1/admin/products`
**功能**: 注册新商品入库，自动生成 SKU，默认状态为 `active`。
**【请求体】**: 
```json
[
  { 
    "name": "Wireless Mouse", 
    "price": 25.50, 
    "initial_stock": 100 
  }
]
```

#### 模块 E: 修改商品基础信息 (Update Product Info)
**接口**: `PUT /api/v1/admin/products/{product_id}`
**功能**: 仅用于更新商品名称和价格。
**【请求体】**: 
```json
[
  { 
    "name": "Wireless Mouse Pro", 
    "price": 29.90 
  }
]
```

#### 模块 F: 商品图片上传 (Upload Product Image)
**接口**: `POST /api/v1/admin/products/{product_id}/image`
**功能**: 为指定商品上传展示图片。
**请求格式**: `multipart/form-data` (复用支付凭证上传逻辑)。

#### 模块 G: 调整库存 (Adjust Stock)
**接口**: `PATCH /api/v1/admin/products/{product_id}/stock`
**功能**: 安全地增加或减少现有库存。
**【请求体】**: 
```json
[
  { 
    "adjustment": -5 
  }
]
```
*(注：正数表示入库/增加，负数表示出库/报损)*

#### 模块 H: 下架/软删除商品 (Soft Delete Product)
**接口**: `DELETE /api/v1/admin/products/{product_id}`
**功能**: 将 `is_active` 更新为 `FALSE`，从前台隐藏但保留历史记录。