import { useState } from 'react';
import { createPaymentOrder, verifyPayment } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useCelebration } from '../context/CelebrationContext';

// Encapsulates the transition / checkout logic
export function useCheckout() {
  const { user } = useAuth();
  const { refreshCart } = useCart();
  const { startCelebration } = useCelebration();
  const [status, setStatus] = useState({ stage: 'idle', message: '' }); // idle | processing | success | error

  const startCheckout = async (deliveryDetails) => {
    setStatus({ stage: 'processing', message: 'Preparing your order...' });

    const orderData = await createPaymentOrder(deliveryDetails);
    if (!orderData.success) {
      setStatus({ stage: 'error', message: orderData.message || 'Could not start checkout.' });
      return;
    }

    if (typeof window.Razorpay === 'undefined') {
      setStatus({
        stage: 'error',
        message: 'Payment library failed to load. Check your internet connection and try again.'
      });
      return;
    }

    const options = {
      key: orderData.keyId,
      amount: orderData.amount,
      currency: orderData.currency,
      name: 'ShopSphere',
      description: 'Order payment',
      order_id: orderData.orderId,
      prefill: {
        name: user?.username || '',
        email: user?.email || ''
      },
      theme: { color: '#7a1530' },
      handler: async (response) => {
        setStatus({ stage: 'processing', message: 'Verifying your payment...' });
        const verifyData = await verifyPayment({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature
        });

        if (verifyData.success) {
          setStatus({ stage: 'success', message: 'Payment successful! Your order is confirmed.' });
          startCelebration();
          await refreshCart();
        } else {
          setStatus({ stage: 'error', message: verifyData.message || 'Payment verification failed.' });
        }
      },
      modal: {
        // Person closed the popup without paying — not an error, just reset.
        ondismiss: () => setStatus({ stage: 'idle', message: '' })
      }
    };

    const razorpayInstance = new window.Razorpay(options);
    razorpayInstance.open();
    setStatus({ stage: 'idle', message: '' });
  };

  const resetStatus = () => setStatus({ stage: 'idle', message: '' });

  return { status, startCheckout, resetStatus };
}
