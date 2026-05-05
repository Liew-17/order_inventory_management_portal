# 轻量级订货与库存管理门户 - 前端需求与 UI/UX 文档 (V1.0)

## 1. 项目概览
本项目是一个供前线业务员和柜台人员使用的前端 Web 应用，核心目标是：快速、移动端友好、操作链路短。前端需要与已提供的后端 API 进行对接。

## 2. 前端技术栈 (Tech Stack)
- **框架**: Vite + React 18 + TypeScript (严格模式)
- **样式**: Tailwind CSS (使用标准实用类，保持 UI 简洁现代)
- **路由**: React Router v6
- **状态管理**: Zustand (用于管理全局购物车状态)
- **API 请求**: Axios 或 Fetch (需封装统一的错误处理和 Base URL)
- **UI 组件库**: 无需重量级组件库，直接使用 Tailwind 编写原生 HTML 元素（或引入极轻量的 headless ui / Radix UI）。

## 3. UI/UX 设计原则
- **Mobile-First (移动端优先)**：业务员通常使用手机或平板操作，所有页面必须完美适配移动端屏幕。
- **状态反馈明确**：库存不足、加入购物车成功、订单提交中、支付凭证上传成功，都必须有明确的 Toast 提示或 Loading 动画。

## 4. 核心页面与路由设计 (Pages & Routes)

### 4.1 商品大厅页 (Product Dashboard) - `/`
- **UI 布局**: 顶部为搜索框，下方为商品卡片网格（Grid）。
- **组件 `ProductCard`**: 
  - 显示商品名称、SKU、价格。
  - **动态库存显示**: 若 `stock_balance > 10` 显示绿色“库存充足”；若 `< 10` 显示橙色“紧张”；若 `= 0` 按钮置灰显示“缺货”。
  - 操作：点击“+”号直接加入全局购物车。
- **数据绑定**: 调用 `GET /api/v1/products`。

### 4.2 购物车与结算悬浮/抽屉 (Cart Drawer) - 全局组件
- **UI 布局**: 点击右下角或导航栏的购物车图标滑出。
- **功能**:
  - 列表展示已选商品、数量加减按钮。
  - 底部显示 `Total Amount`。
  - “Confirm Order” 提交按钮。
- **数据交互**: 点击提交时，触发 `POST /api/v1/orders`。若返回 400（库存不足），前端需拦截并高亮出错的商品。

### 4.3 订单详情与支付上传页 (Order & Payment Page) - `/order/:id`
- **UI 布局**: 
  - 顶部显示 Order ID 和当前状态（如 `PENDING_PAYMENT`）。
  - 中间显示订单明细列表。
  - 底部为 **文件上传区域** (Upload Dropzone)。
- **功能**:
  - 用户点击或拖拽上传汇款单图片。
  - 上传时显示进度条或 Loading 状态。
- **数据交互**: 
  - 页面加载时查询订单状态 `GET /api/v1/orders/{order_id}`。
  - 上传时调用 `POST /api/v1/orders/{order_id}/payment` (注意设置 `Content-Type: multipart/form-data`)。
  - 成功后将页面状态切换为 `PAYMENT_UNDER_REVIEW`，隐藏上传按钮。

## 5. 开发规范建议 (For AI Assistant)
1. **组件拆分**: 请严格遵循单一职责原则，将页面拆分为清晰的子组件（如 `Layout.tsx`, `ProductList.tsx`, `CartItem.tsx`）。
2. **类型定义 (Interfaces)**: 在 `src/types` 目录下统一定义与后端对应的 TypeScript Interface（如 `Product`, `Order`），确保前后端类型契合。
3. **Mock 数据保护**: 在开始对接真实后端 API 前，请先在代码里写一套 Mock 数据，确保 UI 逻辑跑通后再替换为真实请求。