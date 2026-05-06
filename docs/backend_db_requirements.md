# 轻量级订货与库存管理门户 - 后端与数据库系统需求文档

## 1. 项目概览
本项目旨在 3-4 天内构建一个供前线业务员使用的订货系统。后端核心任务是管理库存准确性、处理订单事务以及存储支付凭证。

## 2. 技术栈 (Tech Stack)
- **语言**: Python 3.10+
- **框架**: FastAPI (利用其异步性能处理并发请求)
- **数据库**: PostgreSQL (用于强一致性事务支持)
- **ORM**: SQLModel 或 SQLAlchemy (建议使用异步驱动 `asyncpg`)
- **验证**: Pydantic v2
- **文件处理**: `python-multipart` (用于处理支付凭证上传)

## 3. 数据库模型设计 (Database Schema)

### 3.1 商品表 `products`
| 字段名 | 类型 | 描述 | 约束 |
| :--- | :--- | :--- | :--- |
| `id` | UUID/INT | 主键 | PRIMARY KEY |
| `sku` | VARCHAR | 商品编码（自动生成） | UNIQUE, NOT NULL |
| `name` | VARCHAR | 商品名称 | NOT NULL |
| `price` | DECIMAL | 单价 | NOT NULL, > 0 |
| `stock_balance` | INTEGER | 当前可用库存 | NOT NULL, >= 0 |
| `image_path` | VARCHAR | 商品图片路径 | NULLABLE |
| `is_active` | BOOLEAN | 是否上架（软删除标记） | NOT NULL, DEFAULT TRUE |
| `updated_at` | TIMESTAMP | 最后更新时间 | DEFAULT NOW() |

### 3.2 订单表 `orders`
| 字段名 | 类型 | 描述 | 约束 |
| :--- | :--- | :--- | :--- |
| `id` | UUID | 唯一订单 ID | PRIMARY KEY |
| `total_amount` | DECIMAL | 订单总额 | NOT NULL |
| `status` | ENUM | 状态 | PENDING_PAYMENT, PAYMENT_UNDER_REVIEW, COMPLETED |
| `created_at` | TIMESTAMP | 下单时间 | DEFAULT NOW() |

### 3.3 订单明细表 `order_items`
| 字段名 | 类型 | 描述 | 约束 |
| :--- | :--- | :--- | :--- |
| `id` | INT | 主键 | PRIMARY KEY |
| `order_id` | UUID | 关联订单 | FOREIGN KEY |
| `product_id` | INT | 关联商品 | FOREIGN KEY |
| `quantity` | INTEGER | 订购数量 | > 0 |
| `price_at_time` | DECIMAL | 下单时单价 | 记录快照价格 |

### 3.4 支付凭证表 `payment_receipts`
| 字段名 | 类型 | 描述 | 约束 |
| :--- | :--- | :--- | :--- |
| `id` | INT | 主键 | PRIMARY KEY |
| `order_id` | UUID | 关联订单 | FOREIGN KEY, UNIQUE |
| `file_path` | VARCHAR | 文件存储路径或 URL | NOT NULL |
| `uploaded_at` | TIMESTAMP | 上传时间 | DEFAULT NOW() |

## 4. API 接口定义 (Function APIs)

### 模块 A: 实时库存查询
- **接口名称**: **`GET /api/v1/products`**
- **功能**: 获取所有已上架商品（`is_active = TRUE`）的列表及其当前 `stock_balance`。
- **业务逻辑**: 支持简单的分页或关键词搜索（按名称或 SKU）。

### 模块 B: 购物车与下单流
- **接口名称**: **`POST /api/v1/orders`**
- **功能**: 提交购物车内容生成订单。
- **请求体**: `[ { "product_id": 1, "quantity": 5 }, ... ]`
- **关键业务逻辑 (Database Transaction)**:
    1. 开启数据库事务。
    2. 检查每件商品的 `stock_balance` 是否满足需求。
    3. 若满足，扣减 `products` 表库存：`stock_balance = stock_balance - quantity`。
    4. 若任一商品库存不足，立即回滚事务并返回 `400 Bad Request`。
    5. 创建 `orders` 记录，初始状态设为 `PENDING_PAYMENT`。
    6. 写入 `order_items` 快照。
    7. 提交事务，返回生成的 `Order ID`。

### 模块 C: 支付凭证上传
- **接口名称**: **`POST /api/v1/orders/{order_id}/payment`**
- **功能**: 上传付款水单（图片/PDF）。
- **请求格式**: `multipart/form-data`
- **关键业务逻辑**:
    1. 验证 `order_id` 是否存在且当前状态为 `PENDING_PAYMENT`。
    2. 异步保存文件至本地存储或云存储。
    3. 在 `payment_receipts` 表插入记录。
    4. **更新状态**: 将订单状态更新为 `PAYMENT_UNDER_REVIEW`。
    5. 返回上传成功的确认信息。

- **辅助接口**: **`GET /api/v1/orders/{order_id}`**
- **功能**: 前端轮询或查询订单当前状态及明细。

### 模块 D: 添加新商品 (Admin)
- **接口名称**: **`POST /api/v1/admin/products`**
- **功能**: 注册新商品入库，自动生成 SKU，默认 `is_active = TRUE`。
- **请求体**:
    ```json
    [{ "name": "Wireless Mouse", "price": 25.50, "initial_stock": 100 }]
    ```
- **SKU 格式**: `SKU-{YYYYMMDD}-{4位随机字符}`（例：`SKU-20260506-A7X2`）

### 模块 E: 修改商品基础信息 (Admin)
- **接口名称**: **`PUT /api/v1/admin/products/{product_id}`**
- **功能**: 仅更新商品名称和价格。
- **请求体**:
    ```json
    [{ "name": "Wireless Mouse Pro", "price": 29.90 }]
    ```

### 模块 F: 商品图片上传 (Admin)
- **接口名称**: **`POST /api/v1/admin/products/{product_id}/image`**
- **功能**: 为指定商品上传展示图片。
- **请求格式**: `multipart/form-data`

### 模块 G: 调整库存 (Admin)
- **接口名称**: **`PATCH /api/v1/admin/products/{product_id}/stock`**
- **功能**: 安全地增加或减少现有库存（相对值调整，防止并发问题）。
- **请求体**:
    ```json
    [{ "adjustment": -5 }]
    ```
- **并发安全逻辑**:
    ```sql
    UPDATE products
    SET stock_balance = stock_balance + :adjustment
    WHERE id = :id
      AND is_active = TRUE
      AND (stock_balance + :adjustment) >= 0
    ```
    - 若更新行数为 0，返回 `400 Bad Request`（商品不存在、未上架或库存将为负）。
    - 正数 `adjustment` 表示入库/增加，负数表示出库/报损。

### 模块 H: 下架/软删除商品 (Admin)
- **接口名称**: **`DELETE /api/v1/admin/products/{product_id}`**
- **功能**: 将 `is_active` 更新为 `FALSE`，从前台隐藏但保留历史记录。

## 5. 开发建议 (For Claude AI Assistant)
1. **并发处理**: 在扣减库存时，建议使用 SQL 的 `UPDATE ... WHERE stock_balance >= quantity` 来防止竞态条件。
2. **错误处理**: 需定义统一的错误响应格式，特别是库存不足、订单不存在等业务异常。
3. **CORS 配置**: 考虑到 Vite 前端开发，后端需配置 `fastapi.middleware.cors` 以允许跨域请求。
4. **软删除**: 严禁物理删除商品，所有商品下架均使用 `is_active = FALSE` 软删除。
5. **SKU 唯一性**: 依赖数据库 `UNIQUE` 约束确保自动生成的 SKU 不冲突。
