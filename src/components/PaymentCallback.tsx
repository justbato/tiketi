import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';

export default function PaymentCallback() {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const reference = params.get('reference') || params.get('trxref') || '';
    const [state, setState] = useState<'checking' | 'paid' | 'failed'>('checking');

    useEffect(() => {
        if (!reference) {
            setState('failed');
            return;
        }
        let cancelled = false;
        let attempts = 0;

        const check = async () => {
            attempts++;
            const res = await api.orders.verifyPayment(reference);
            if (cancelled) return;
            if (res?.status === 'paid') {
                setState('paid');
                setTimeout(() => {
                    navigate('/tickets/' + encodeURIComponent(reference), { replace: true });
                }, 1200);
                return;
            }
            if (attempts >= 10) {
                setState('failed');
                return;
            }
            setTimeout(check, 2500);
        };

        check();
        return () => {
            cancelled = true;
        };
    }, [reference, navigate]);

    return (
        <div
            className="min-h-screen flex items-center justify-center px-4"
            style={{ backgroundColor: 'var(--bg-primary)' }}
        >
            <div className="max-w-md w-full text-center">
                {state === 'checking' && (
                    <>
                        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                            Confirming your payment...
                        </h2>
                        <p className="text-sm text-text-secondary">Please do not close this page.</p>
                    </>
                )}
                {state === 'paid' && (
                    <>
                        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                            Payment confirmed
                        </h2>
                        <p className="text-sm text-text-secondary">Opening your tickets...</p>
                    </>
                )}
                {state === 'failed' && (
                    <>
                        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                            We could not confirm your payment yet
                        </h2>
                        <p className="text-sm text-text-secondary mb-4">
                            If you were charged, your tickets will appear shortly. Use your order reference
                            {reference ? ` (${reference})` : ''} and email to retrieve them.
                        </p>
                        <button
                            onClick={() => navigate(reference ? '/tickets/' + encodeURIComponent(reference) : '/events')}
                            className="px-5 py-2 rounded-xl font-semibold text-sm"
                            style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                        >
                            Find my tickets
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}