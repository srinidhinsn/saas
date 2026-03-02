import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { CreditCard, Smartphone, QrCode, Loader2, CheckCircle, XCircle, X, Wallet, Building2 } from 'lucide-react';

/**
 * Razorpay Payment Component
 * Supports: Card, UPI (QR + VPA), Net Banking, Wallet, Split Payments
 */
const RazorpayPayment = ({ 
  amount,                    // Total amount in INR
  orderId,                   // Your order ID
  clientId,
  token,
  splitPayments = [],        // Array of { method, amount } for split payments
  isSplitPayment = false,
  onPaymentSuccess,
  onPaymentFailure,
  onClose,
  customerDetails = {}       // { name, email, phone }
}) => {
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [upiMode, setUpiMode] = useState('qr'); // 'qr' or 'vpa'
  const [upiId, setUpiId] = useState('');
  const [currentPaymentIndex, setCurrentPaymentIndex] = useState(0);
  const [completedPayments, setCompletedPayments] = useState([]);
  const [paymentStatus, setPaymentStatus] = useState('idle'); // 'idle', 'processing', 'success', 'failed'

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onerror = () => {
      toast.error('Failed to load Razorpay. Please check your internet connection.');
    };
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  /**
   * Create Razorpay Order on Backend
   */
  const createRazorpayOrder = async (paymentAmount) => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BILLING_SERVICE_URL}/${clientId}/invoice/razorpay`,
        {
          amount: Math.round(paymentAmount * 100), // Convert to paise
          currency: 'INR',
          receipt: `order_${orderId}_${Date.now()}`,
          notes: {
            order_id: orderId,
            client_id: clientId,
          }
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      return response.data.data;
    } catch (error) {
      console.error('Failed to create Razorpay order:', error);
      throw new Error(error.response?.data?.detail || 'Failed to create payment order');
    }
  };

  /**
   * Verify Payment on Backend
   */
  

  /**
   * Open Razorpay Checkout
   */
  const openRazorpayCheckout = (razorpayOrder, options = {}) => {
    return new Promise((resolve, reject) => {
      if (!window.Razorpay) {
        reject(new Error('Razorpay SDK not loaded'));
        return;
      }

      const defaultOptions = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: clientId.toUpperCase(),
        description: `Order #${orderId}`,
        order_id: razorpayOrder.id,
        
        prefill: {
          name: customerDetails.name || 'Customer',
          email: customerDetails.email || '',
          contact: customerDetails.phone || '',
        },

        handler: function (response) {
          resolve(response);
        },

        modal: {
          ondismiss: function() {
            reject(new Error('Payment cancelled by user'));
          }
        },

        theme: {
          color: '#667EEA'
        },
      };

      const finalOptions = { ...defaultOptions, ...options };
      const razorpay = new window.Razorpay(finalOptions);
      razorpay.open();
    });
  };

  /**
   * Handle Single Payment
   */
  const handleSinglePayment = async () => {
    setLoading(true);
    setPaymentStatus('processing');

    try {
      // Step 1: Create Razorpay Order
      const razorpayOrder = await createRazorpayOrder(amount);

      // Step 2: Configure payment method specific options
      const methodOptions = {};
      
      if (paymentMethod === 'upi') {
        methodOptions.method = 'upi';
        if (upiMode === 'vpa' && upiId) {
          methodOptions['upi[flow]'] = 'collect';
          methodOptions['upi[vpa]'] = upiId;
        } else {
          methodOptions['upi[flow]'] = 'qr';
        }
      } else if (paymentMethod === 'card') {
        methodOptions.method = 'card';
      } else if (paymentMethod === 'netbanking') {
        methodOptions.method = 'netbanking';
      } else if (paymentMethod === 'wallet') {
        methodOptions.method = 'wallet';
      }

      // Step 3: Open Razorpay Checkout
    // Step 3: Open Razorpay Checkout
const response = await openRazorpayCheckout(razorpayOrder, methodOptions);

// Step 4: VERIFY PAYMENT HERE (THIS IS THE FIX)
await axios.post(
  `${import.meta.env.VITE_API_BILLING_SERVICE_URL}/${clientId}/invoice/verify`,
  {
    document_id: orderId,   // invoice id coming from parent
    razorpay_payment_id: response.razorpay_payment_id,
    razorpay_order_id: response.razorpay_order_id,
    razorpay_signature: response.razorpay_signature
  },
  {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  }
);

setPaymentStatus('success');

// Inform parent only AFTER successful verification
onPaymentSuccess && onPaymentSuccess(response);

    } catch (error) {
      console.error('Payment failed:', error);
      setPaymentStatus('failed');
      const errorMessage = error.message || 'Payment failed';
      toast.error(errorMessage);
      onPaymentFailure && onPaymentFailure({ error: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle Split Payment
   * Process multiple payments sequentially
   */
  const handleSplitPayment = async () => {
    setLoading(true);
    setPaymentStatus('processing');
    const payments = [];

    try {
      // Filter only Razorpay payments (exclude Cash/Due)
      const razorpayPayments = splitPayments.filter(
        split => !['Cash', 'Due'].includes(split.method)
      );

      if (razorpayPayments.length === 0) {
        toast.error('No online payments to process');
        return;
      }

      // Process each payment sequentially
      for (let i = 0; i < razorpayPayments.length; i++) {
        const split = razorpayPayments[i];
        setCurrentPaymentIndex(i + 1);

        toast.info(`Processing payment ${i + 1} of ${razorpayPayments.length}: ${split.method} - ₹${split.amount}`);

        // Create Razorpay order for this split
        const razorpayOrder = await createRazorpayOrder(split.amount);

        // Determine payment method
        let method = split.method.toLowerCase();
        if (method.includes('upi')) method = 'upi';
        else if (method.includes('card')) method = 'card';

        const methodOptions = {};
        if (method === 'upi') {
          methodOptions.method = 'upi';
          methodOptions['upi[flow]'] = 'qr';
        } else if (method === 'card') {
          methodOptions.method = 'card';
        }

        // Open checkout for this payment
        const response = await openRazorpayCheckout(razorpayOrder, {
          ...methodOptions,
          description: `Split Payment ${i + 1}/${razorpayPayments.length} - Order #${orderId}`,
        });

        // Verify this payment
        const verificationData = {
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
          order_id: orderId,
          amount: split.amount,
          payment_method: split.method,
          split_index: i,
        };

        payments.push({
          method: split.method,
          amount: split.amount,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_order_id: response.razorpay_order_id,
        });

        // Track completed payment
        const completedPayment = {
          method: split.method,
          amount: split.amount,
          status: 'completed',
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_order_id: response.razorpay_order_id,
        };

        payments.push(completedPayment);
        setCompletedPayments(prev => [...prev, completedPayment]);

        toast.success(`Payment ${i + 1} completed: ₹${split.amount}`);
      }

      // Add Cash/Due payments (offline)
      const offlinePayments = splitPayments
        .filter(split => ['Cash', 'Due'].includes(split.method))
        .map(split => ({
          method: split.method,
          amount: split.amount,
          status: 'completed',
          payment_id: `offline_${Date.now()}`,
        }));

      payments.push(...offlinePayments);

      // All payments successful
      setPaymentStatus('success');
      toast.success('All payments completed successfully!');
      
      onPaymentSuccess && onPaymentSuccess({
        split_payments: payments,
        total_amount: amount,
        order_id: orderId,
        is_split_payment: true,
      });

    } catch (error) {
      console.error('Split payment failed:', error);
      setPaymentStatus('failed');
      const errorMessage = error.message || 'Split payment failed';
      toast.error(`${errorMessage}. ${payments.length} of ${splitPayments.length} completed.`);
      
      onPaymentFailure && onPaymentFailure({
        error: errorMessage,
        completed_payments: payments,
        failed_at_index: payments.length,
      });
    } finally {
      setLoading(false);
      setCurrentPaymentIndex(0);
    }
  };

  /**
   * Main payment handler
   */
  const handlePayment = () => {
    if (isSplitPayment) {
      handleSplitPayment();
    } else {
      handleSinglePayment();
    }
  };

  // Don't show if payment is successful (let parent handle close)


  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative">
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 disabled:opacity-50"
        >
          <X size={24} />
        </button>

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-5 rounded-t-2xl">
          <h2 className="text-2xl font-bold text-white">Payment</h2>
          <p className="text-blue-100 text-sm mt-1">
            {isSplitPayment ? 'Split Payment Mode' : 'Secure Payment via Razorpay'}
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Amount Display */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-200">
            <div className="text-sm text-gray-600 mb-1">
              {isSplitPayment ? 'Total Amount' : 'Amount to Pay'}
            </div>
            <div className="text-3xl font-bold text-gray-800">₹{amount.toFixed(2)}</div>
            {isSplitPayment && (
              <div className="text-xs text-gray-500 mt-1">
                {splitPayments.length} payment(s) • Order #{orderId}
              </div>
            )}
          </div>

          {/* Split Payment Progress */}
          {isSplitPayment && loading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Processing Payment</span>
                <span>{currentPaymentIndex} of {splitPayments.filter(s => !['Cash', 'Due'].includes(s.method)).length}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${(currentPaymentIndex / splitPayments.filter(s => !['Cash', 'Due'].includes(s.method)).length) * 100}%` 
                  }}
                />
              </div>
            </div>
          )}

          {/* Single Payment - Method Selection */}
          {!isSplitPayment && !loading && (
            <>
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-700">Select Payment Method</label>
                <div className="grid grid-cols-2 gap-3">
                  
                  {/* Card */}
                  <button
                    onClick={() => setPaymentMethod('card')}
                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                      paymentMethod === 'card' 
                        ? 'border-blue-500 bg-blue-50 shadow-md' 
                        : 'border-gray-200 hover:border-blue-300 hover:shadow-sm'
                    }`}
                  >
                    <CreditCard size={24} className={paymentMethod === 'card' ? 'text-blue-600' : 'text-gray-400'} />
                    <span className={`font-medium text-sm ${paymentMethod === 'card' ? 'text-blue-700' : 'text-gray-600'}`}>
                      Card
                    </span>
                  </button>

                  {/* UPI */}
                  <button
                    onClick={() => setPaymentMethod('upi')}
                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                      paymentMethod === 'upi' 
                        ? 'border-green-500 bg-green-50 shadow-md' 
                        : 'border-gray-200 hover:border-green-300 hover:shadow-sm'
                    }`}
                  >
                    <Smartphone size={24} className={paymentMethod === 'upi' ? 'text-green-600' : 'text-gray-400'} />
                    <span className={`font-medium text-sm ${paymentMethod === 'upi' ? 'text-green-700' : 'text-gray-600'}`}>
                      UPI
                    </span>
                  </button>

                  {/* Net Banking */}
                  <button
                    onClick={() => setPaymentMethod('netbanking')}
                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                      paymentMethod === 'netbanking' 
                        ? 'border-purple-500 bg-purple-50 shadow-md' 
                        : 'border-gray-200 hover:border-purple-300 hover:shadow-sm'
                    }`}
                  >
                    <Building2 size={24} className={paymentMethod === 'netbanking' ? 'text-purple-600' : 'text-gray-400'} />
                    <span className={`font-medium text-sm ${paymentMethod === 'netbanking' ? 'text-purple-700' : 'text-gray-600'}`}>
                      Net Banking
                    </span>
                  </button>

                  {/* Wallet */}
                  <button
                    onClick={() => setPaymentMethod('wallet')}
                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                      paymentMethod === 'wallet' 
                        ? 'border-orange-500 bg-orange-50 shadow-md' 
                        : 'border-gray-200 hover:border-orange-300 hover:shadow-sm'
                    }`}
                  >
                    <Wallet size={24} className={paymentMethod === 'wallet' ? 'text-orange-600' : 'text-gray-400'} />
                    <span className={`font-medium text-sm ${paymentMethod === 'wallet' ? 'text-orange-700' : 'text-gray-600'}`}>
                      Wallet
                    </span>
                  </button>

                </div>
              </div>

              {/* UPI Mode Selection */}
              {paymentMethod === 'upi' && (
                <div className="space-y-3 p-4 bg-green-50 rounded-xl border border-green-200">
                  <label className="text-sm font-semibold text-gray-700">UPI Payment Mode</label>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setUpiMode('qr'); setUpiId(''); }}
                      className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                        upiMode === 'qr' 
                          ? 'border-green-500 bg-green-100' 
                          : 'border-gray-200 bg-white hover:border-green-300'
                      }`}
                    >
                      <QrCode size={20} className="mx-auto mb-1 text-green-600" />
                      <div className={`text-xs font-medium ${upiMode === 'qr' ? 'text-green-700' : 'text-gray-600'}`}>
                        Scan QR
                      </div>
                    </button>

                    <button
                      onClick={() => setUpiMode('vpa')}
                      className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                        upiMode === 'vpa' 
                          ? 'border-green-500 bg-green-100' 
                          : 'border-gray-200 bg-white hover:border-green-300'
                      }`}
                    >
                      <Smartphone size={20} className="mx-auto mb-1 text-green-600" />
                      <div className={`text-xs font-medium ${upiMode === 'vpa' ? 'text-green-700' : 'text-gray-600'}`}>
                        Enter UPI ID
                      </div>
                    </button>
                  </div>

                  {/* UPI ID Input */}
                  {upiMode === 'vpa' && (
                    <div className="mt-3">
                      <input
                        type="text"
                        placeholder="yourname@upi"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Enter your UPI ID (e.g., yourname@paytm)
                      </p>
                    </div>
                  )}

                  {upiMode === 'qr' && (
                    <div className="mt-2 text-xs text-gray-600 bg-white p-3 rounded-lg border border-green-200">
                      ℹ️ A QR code will appear in the next step. Scan it with any UPI app to complete payment.
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Split Payment Info */}
          {isSplitPayment && !loading && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Payments to Process</label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {splitPayments.map((split, idx) => (
                  <div 
                    key={idx} 
                    className={`flex justify-between items-center p-3 rounded-lg border ${
                      ['Cash', 'Due'].includes(split.method)
                        ? 'bg-gray-50 border-gray-200'
                        : 'bg-blue-50 border-blue-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {!['Cash', 'Due'].includes(split.method) && (
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                      )}
                      <span className="font-medium text-gray-700">{split.method}</span>
                    </div>
                    <span className="font-bold text-gray-800">₹{split.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                💡 Cash and Due payments will be recorded offline. Razorpay payments will be processed sequentially.
              </p>
            </div>
          )}

          {/* Payment Status */}
          {paymentStatus === 'failed' && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <XCircle size={20} className="text-red-600" />
              <span className="text-sm text-red-700 font-medium">Payment failed. Please try again.</span>
            </div>
          )}

          {/* Pay Button */}
          <button
            onClick={handlePayment}
            disabled={loading || (paymentMethod === 'upi' && upiMode === 'vpa' && !upiId)}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <CheckCircle size={20} />
                <span>Pay ₹{amount.toFixed(2)}</span>
              </>
            )}
          </button>

          {/* Security Note */}
          <div className="text-center text-xs text-gray-500">
            🔒 Secured by Razorpay • Your payment information is encrypted
          </div>
        </div>
      </div>
    </div>
  );
};

export default RazorpayPayment;