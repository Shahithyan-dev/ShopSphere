import { createContext, useContext, useState, useCallback } from 'react';
import { getCart, addToCart as apiAddToCart, removeFromCart as apiRemoveFromCart } from '../api/client';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);

  const refreshCart = useCallback(async () => {
    if (!user) {
      setItems([]);
      return;
    }
    const data = await getCart();
    if (data.success) setItems(data.items);
  }, [user]);

  const addItem = async (productId, quantity = 1) => {
    const data = await apiAddToCart(productId, quantity);
    if (data.success) await refreshCart();
    return data;
  };

  const removeItem = async (cartId) => {
    await apiRemoveFromCart(cartId);
    await refreshCart();
  };

  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider value={{ items, totalCount, totalPrice, refreshCart, addItem, removeItem }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
