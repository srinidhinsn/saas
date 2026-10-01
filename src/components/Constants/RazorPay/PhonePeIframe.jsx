import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

const PHONEPE_SCRIPT_SRC = 'https://mercury.phonepe.com/web/bundle/checkout.js';

function loadPhonePeScript() {
  return new Promise((resolve, reject) => {
    if (window.PhonePeCheckout) return resolve();
    const existing = document.querySelector(`script[src="${PHONEPE_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', reject);
      return;
    }
    const script = document.createElement('script');
    script.src = PHONEPE_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load PhonePe script'));
    document.body.appendChild(script);
  });
}

const PhonePeIframe = ({
  amount,
  documentId,
  clientId,
  token,
  onPaymentSuccess,
  onPaymentFailure,
}) => {
  const [status, setStatus] = useState('creating');
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    const run = async () => {
      try {
        await loadPhonePeScript();

        const createRes = await axios.post(
          `${import.meta.env.VITE_API_BILLING_SERVICE_URL}/${clientId}/invoice/phonepe?client_id=${clientId}`,
          {
            amount: Math.round(amount * 100),
            document_id: documentId,
            redirect_url: window.location.href,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const { token_url, merchant_order_id } = createRes.data.data;
        setStatus('open');

        window.PhonePeCheckout.transact({
          tokenUrl: token_url,
          type: 'IFRAME',
          callback: async (response) => {
            if (response === 'USER_CANCEL') {
              setStatus('done');
              onPaymentFailure && onPaymentFailure({ error: 'Payment cancelled by user' });
              return;
            }

            setStatus('verifying');
            try {
              const verifyRes = await axios.post(
                `${import.meta.env.VITE_API_BILLING_SERVICE_URL}/${clientId}/invoice/phonepe/verify?client_id=${clientId}`,
                { document_id: documentId, merchant_order_id },
                { headers: { Authorization: `Bearer ${token}` } }
              );
              setStatus('done');
              onPaymentSuccess && onPaymentSuccess(verifyRes.data.data);
            } catch (err) {
              setStatus('done');
              onPaymentFailure && onPaymentFailure({
                error: err.response?.data?.detail || err.message,
              });
            }
          },
        });
      } catch (err) {
        setStatus('done');
        toast.error(err.message || 'Failed to start PhonePe payment');
        onPaymentFailure && onPaymentFailure({ error: err.message });
      }
    };

    run();
  }, []); // no cleanup needed — hasStartedRef already prevents re-entry

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[90] pointer-events-none">
      {status !== 'open' && (
        <div className="bg-white rounded-xl shadow-xl px-6 py-5 flex items-center gap-3 pointer-events-auto">
          {status === 'creating' && (<><Loader2 className="animate-spin" size={20} /><span>Starting PhonePe checkout…</span></>)}
          {status === 'verifying' && (<><Loader2 className="animate-spin" size={20} /><span>Verifying payment…</span></>)}
        </div>
      )}
    </div>
  );
};

export default PhonePeIframe;