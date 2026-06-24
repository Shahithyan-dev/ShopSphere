// Thin wrapper around fetch so every call shares the same base settings:
// JSON headers, credentials included (needed for the session cookie), and
// consistent error handling. Every page imports from here instead of calling
// fetch() directly, so the backend integration lives in one place.

async function request(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });

  let data;
  try {
    data = await res.json();
  } catch {
    data = { success: false, message: 'Unexpected server response.' };
  }
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: 'DELETE' })
};

// --- Auth ---
export const getSession = () => api.get('/me');
export const login = (identifier, password) => api.post('/auth/login', { identifier, password });
export const signup = (username, email, password) => api.post('/auth/signup', { username, email, password });
export const logout = () => api.post('/auth/logout');

// --- Products ---
export const getProducts = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return api.get(`/products${query ? `?${query}` : ''}`);
};
export const getProductById = (id) => api.get(`/products/${id}`);
export const getCategories = () => api.get('/products/categories');
export const getTopRated = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return api.get(`/products/top-rated${query ? `?${query}` : ''}`);
};

// --- Cart ---
export const getCart = () => api.get('/products/cart');
export const addToCart = (productId, quantity = 1) => api.post('/products/cart', { productId, quantity });
export const removeFromCart = (cartId) => api.delete(`/products/cart/${cartId}`);

// --- Admin product management ---
export const adminGetProduct = (id) => api.get(`/products/admin/${id}`);
export const adminCreateProduct = (product) => api.post('/products/admin', product);
export const adminUpdateProduct = (id, product) => api.put(`/products/admin/${id}`, product);
export const adminDeleteProduct = (id) => api.delete(`/products/admin/${id}`);

// --- Payment (Razorpay) ---
export const createPaymentOrder = (payload) => api.post('/payment/create-order', payload || {});
export const verifyPayment = (payload) => api.post('/payment/verify', payload);
export const getOrders = () => api.get('/payment/orders');
export const adminGetOrders = () => api.get('/payment/admin/orders');
export const adminUpdateOrderStatus = (orderId, status) => api.put(`/payment/admin/orders/${orderId}/status`, { status });

// --- Admin Delivery OTP ---
export const adminSendDeliveryOtp = (orderId) => api.post(`/admin/orders/${orderId}/send-otp`);
export const adminVerifyDeliveryOtp = (orderId, otp) => api.post(`/admin/orders/${orderId}/verify-otp`, { otp });
export const getOtpStatus = () => api.get('/otp/status');
export const requestOtp = (phone) => api.post('/otp/request', { phone });
export const verifyOtp = (code) => api.post('/otp/verify', { code });
