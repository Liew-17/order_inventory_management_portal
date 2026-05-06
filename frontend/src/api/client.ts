/**
 * API 客户端封装
 *
 * 状态流转说明：
 * 1. 所有请求都经过 baseURL + interceptors
 * 2. 请求拦截器自动添加 Content-Type
 * 3. 响应拦截器统一处理错误，将后端错误消息透传
 * 4. CORS 问题在后端 FastAPI 中间件配置，前端无需处理
 */

import axios, { type AxiosInstance, type AxiosError } from 'axios';

// 创建 axios 实例，配置 baseURL
// 注意：开发环境指向后端地址，生产环境替换为实际域名
const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  // Use hostname for mobile access
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  return `${protocol}//${hostname}:8000/api/v1`;
};

const apiClient: AxiosInstance = axios.create({
  // 后端 FastAPI 服务的地址 + API 前缀
  baseURL: getApiBaseUrl(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ========== 请求拦截器 ==========
// 所有请求发送前都会经过这里
// 可以在这里添加 token、loading 状态等

apiClient.interceptors.request.use(
  (config) => {
    // 示例：如果有 token，可以在这里添加
    // const token = localStorage.getItem('token');
    // if (token) config.headers.Authorization = `Bearer ${token}`;

    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    // 请求配置错误处理
    return Promise.reject(error);
  }
);

// ========== 响应拦截器 ==========
// 所有响应返回前都会经过这里
// 统一处理错误，将错误信息转换为易读的格式

apiClient.interceptors.response.use(
  (response) => {
    // 2xx 状态码，直接返回数据
    console.log(`[API Response] ${response.status} ${response.config.url}`);
    return response;
  },
  (error: AxiosError) => {
    // 非 2xx 状态码，统一处理

    if (error.response) {
      // 服务器返回了错误状态码（400, 404, 500 等）
      const status = error.response.status;
      const data = error.response.data as { detail?: string | unknown[] | { msg: string; loc: string[] }[] };

      let errorMessage = '请求失败';
      if (typeof data.detail === 'string') {
        errorMessage = data.detail;
      } else if (Array.isArray(data.detail)) {
        errorMessage = data.detail.map((e: { msg: string; loc: string[] }) => `${e.loc.join('.')}: ${e.msg}`).join('; ');
      } else if (data.detail && typeof data.detail === 'object' && 'msg' in (data.detail as object)) {
        const e = data.detail as { msg: string; loc: string[] };
        errorMessage = `${e.loc.join('.')}: ${e.msg}`;
      }

      console.error(`[API Error] ${status}:`, errorMessage);

      switch (status) {
        case 400:
          throw new Error(errorMessage || '请求参数错误');
        case 404:
          throw new Error(errorMessage || '资源不存在');
        case 422:
          throw new Error(errorMessage || '数据验证错误');
        case 500:
          throw new Error(errorMessage || '服务器内部错误');
        default:
          throw new Error(errorMessage || '请求失败');
      }
    } else if (error.request) {
      // 请求已发送但没有收到响应（通常是 CORS 或网络问题）
      console.error('[API Error] No response received:', error.request);
      throw new Error('网络连接失败，请检查网络或后端服务');
    } else {
      // 请求配置本身的错误
      console.error('[API Error] Request setup error:', error.message);
      throw new Error('请求配置错误');
    }
  }
);

export default apiClient;