# 轻量级订货与库存管理门户 - 商品管理前端需求 

**Context for AI Assistant (Claude Code):** 
> This file is located at `/features/product_management/frontend.md`. It is a feature extension. You must reference and strictly adhere to the base UI/UX principles and tech stack defined in the file named "frontend_requirements_v2.md".

## 1. 模块概览
此文档扩展了现有的前端应用，引入了“商品管理 (Product Management)”模块。请确保所有新增 UI 严格遵守移动端优先 (Mobile-First) 和全英文 UI 文本的要求。

## 2. 导航与入口规划 (Navigation & Entry Point)
为了将管理模块融入现有系统，我们需要在现有的**商品大厅页 (`/`)** 顶部导航栏进行调整：
- **当前布局**: 顶部为搜索框与“我的订单 (My Orders)”按钮。
- **新增布局**: 在“My Orders”旁边，新增一个 **"Manage Products"** 或一个代表设置的齿轮图标按钮。点击后路由跳转至 `/admin/products`。

## 3. 核心页面与路由设计 (Pages & Routes)

### 3.1 商品管理列表页 (Admin Product List) - `/admin/products`
- **UI 布局**:
  - 顶部导航提供一个返回前台的 **"Back to Shop"** 按钮和一个醒目的 **"Add New Product"** 按钮。
  - 下方使用 List 或简化版 Grid 显示现有商品。
- **列表元素**: 每个项需显示 Product Name, SKU, Price, 和当前 Stock。
- **操作**: 每个项提供一个 **"Edit / Manage"** 按钮，点击跳转至该商品的详情管理页。

### 3.2 添加商品模态框或页面 (Create Product Form) - `/admin/products/new`
- **UI 布局**: 居中的表单卡片。
- **表单字段**:
  - `Product Name` (Text input)
  - `Unit Price` (Number input, step="0.01")
  - `Initial Stock` (Number input, min="0")
  - *注：SKU 字段由后端自动生成，前端表单无需包含此字段。*
- **数据交互**: 提交时调用 `POST /api/v1/admin/products`。成功后使用 Toast 提示 "Product added successfully"，并路由回退至列表页。

### 3.3 商品编辑与库存管理页 (Edit Product & Stock) - `/admin/products/:id/edit`
- **UI 布局**: 分为两个主要卡片区域 (Mobile 视角下上下堆叠)。
- **区域 1: 基础信息与图片上传 (Image Upload)**
  - 显示当前商品信息。
  - 提供一个类似支付凭证上传的 **Dropzone / Upload UI**。
  - 数据交互: 选择文件后调用 `POST /api/v1/admin/products/{id}/image`。上传成功后页面需刷新显示新图片。
- **区域 2: 库存调整 (Stock Adjustment)**
  - 显示当前获取到的可用库存 (Current Stock)。
  - 提供两个按钮和一个输入框：**"Add Stock (+)"** 和 **"Reduce Stock (-)"**。
  - **业务逻辑约束**: 前端不能直接修改并提交绝对数字。用户输入一个数量 (例如 `5`)，点击 "Reduce Stock"，前端向后端发送 `{"adjustment": -5}`。
  -**数据交互**: 提交时调用 `PATCH /api/v1/admin/products/{product_id}/stock`。
  - **错误处理**: 如果后端返回 400 错误（例如减库存导致库存为负），前端需通过红色 Toast 提示 "Insufficient stock to reduce"。

## 4. 状态反馈与用户体验 (UX Requirements)
- **统一交互**: 必须复用基础需求文档中的 Toast 组件进行状态反馈。
- **安全锁**: “Reduce Stock” 按钮如果计算出用户输入的数值大于屏幕上当前显示的库存量，可以提前在前端禁用该按钮 (Disable) 并标灰，双重保证并发安全。