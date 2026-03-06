import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTributeContext } from '../../context/TributeContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faCrown, faCheckCircle, faTimesCircle, faHourglass, faInfinity,
    faSyncAlt, faCalendarAlt, faShieldAlt, faCreditCard, faTimes, faSpinner
} from '@fortawesome/free-solid-svg-icons';
import { loadStripe } from '@stripe/stripe-js';
import {
    Elements, CardElement, useStripe, useElements
} from '@stripe/react-stripe-js';
import { useTranslation } from 'react-i18next';
import { API_URL as BASE_API_URL } from '../../config';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
const API_URL = `${BASE_API_URL}/api`;

const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

// ─── Payment Form Inside Modal ──────────────────────────────────────────────
const RenewalPaymentForm = ({ clientSecret, productId, subscriptionId, amount, onSuccess, onClose }) => {
    const stripe = useStripe();
    const elements = useElements();
    const { i18n } = useTranslation();
    const [paying, setPaying] = useState(false);
    const [error, setError] = useState('');

    const handlePay = async (e) => {
        e.preventDefault();
        if (!stripe || !elements) return;
        setPaying(true);
        setError('');

        try {
            const result = await stripe.confirmCardPayment(clientSecret, {
                payment_method: { card: elements.getElement(CardElement) }
            });

            if (result.error) {
                setError(result.error.message);
                setPaying(false);
                return;
            }

            if (result.paymentIntent.status === 'succeeded') {
                // Confirm with backend
                const res = await fetch(`${API_URL}/subscriptions/renew`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                    body: JSON.stringify({
                        payment_intent_id: result.paymentIntent.id,
                        product_id: productId,
                        subscription_id: subscriptionId,
                        language: i18n.language
                    })
                });
                const data = await res.json();
                if (res.ok) {
                    onSuccess(data.subscription);
                } else {
                    setError(data.error || 'Payment verified but subscription update failed.');
                }
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setPaying(false);
        }
    };

    return (
        <form onSubmit={handlePay} className="space-y-5">
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Card Details</label>
                <div className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                    <CardElement
                        options={{
                            style: {
                                base: { fontSize: '15px', color: '#1d2327', fontFamily: 'Arial, sans-serif', '::placeholder': { color: '#aab7c4' } },
                                invalid: { color: '#e74c3c' }
                            }
                        }}
                    />
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 text-sm p-3 rounded-lg">
                    {error}
                </div>
            )}

            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-3 rounded-lg border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-all"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={!stripe || paying}
                    className="flex-1 py-3 rounded-lg bg-[#c59d5f] text-white font-bold hover:bg-[#b08c50] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                    {paying ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faCreditCard} />}
                    {paying ? 'Processing...' : `Pay €${parseFloat(amount).toFixed(2)}`}
                </button>
            </div>
        </form>
    );
};

// ─── Renewal Modal ───────────────────────────────────────────────────────────
const RenewalModal = ({ subscription, onClose, onSuccess }) => {
    const [clientSecret, setClientSecret] = useState(null);
    const [amount, setAmount] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const createIntent = async () => {
            try {
                const res = await fetch(`${API_URL}/subscriptions/create-renewal-intent`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                    body: JSON.stringify({ product_id: subscription.product_id })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to create payment');
                setClientSecret(data.clientSecret);
                setAmount(data.amount);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        createIntent();
    }, [subscription.product_id]);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-[#1d2327] to-[#2c3338] p-6 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#c59d5f]/20 flex items-center justify-center">
                            <FontAwesomeIcon icon={faCreditCard} className="text-[#c59d5f]" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">Renew Subscription</h3>
                            <p className="text-xs text-gray-400">{subscription.product_name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                </div>

                <div className="p-6">
                    {loading ? (
                        <div className="flex flex-col items-center py-8 gap-3">
                            <FontAwesomeIcon icon={faSpinner} spin className="text-3xl text-[#c59d5f]" />
                            <p className="text-gray-500 text-sm">Preparing payment...</p>
                        </div>
                    ) : error ? (
                        <div className="bg-red-50 border border-red-100 text-red-600 text-sm p-4 rounded-lg">{error}</div>
                    ) : clientSecret ? (
                        <Elements stripe={stripePromise} options={{ clientSecret }}>
                            <RenewalPaymentForm
                                clientSecret={clientSecret}
                                productId={subscription.product_id}
                                subscriptionId={subscription.id}
                                amount={amount}
                                onSuccess={onSuccess}
                                onClose={onClose}
                            />
                        </Elements>
                    ) : null}
                </div>
            </div>
        </div>
    );
};

// ─── Subscription Status Card ────────────────────────────────────────────────
const statusConfig = {
    trial: {
        icon: faHourglass,
        label: 'Free Trial',
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        border: 'border-blue-100'
    },
    active: {
        icon: faCheckCircle,
        label: 'Active',
        color: 'text-green-600',
        bg: 'bg-green-50',
        border: 'border-green-100'
    },
    expired: {
        icon: faTimesCircle,
        label: 'Expired',
        color: 'text-red-600',
        bg: 'bg-red-50',
        border: 'border-red-100'
    },
    payment_required: {
        icon: faShieldAlt,
        label: 'Needs Plan',
        color: 'text-amber-600',
        bg: 'bg-amber-50',
        border: 'border-amber-100'
    }
};

// ─── Main Subscription Page ──────────────────────────────────────────────────
const SubscriptionAdmin = () => {
    const navigate = useNavigate();
    const { i18n } = useTranslation();
    const { addToCart, showToast, clearCart } = useTributeContext();
    const [subscriptions, setSubscriptions] = useState([]); // Array of subscriptions
    const [userMemorials, setUserMemorials] = useState([]);
    const [products, setProducts] = useState([]);
    const [selectedProductId, setSelectedProductId] = useState('');
    const [starting, setStarting] = useState(false);
    const [activeRenewSub, setActiveRenewSub] = useState(null); // The specific sub being renewed
    const [message, setMessage] = useState(null);
    const [loading, setLoading] = useState(true);
    const { id: routeId } = useParams();

    const displayedSubscriptions = React.useMemo(() => {
        if (!routeId) return subscriptions;
        return subscriptions.filter(s => String(s.id) === String(routeId));
    }, [subscriptions, routeId]);

    const noAccess = routeId && !loading && displayedSubscriptions.length === 0;

    const fetchSubscriptions = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/subscriptions/my`, {
                headers: getAuthHeaders()
            });
            const data = await res.json();
            setSubscriptions(data.subscriptions || []);
        } catch {
            setSubscriptions([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchUserMemorials = useCallback(async () => {
        try {
            const res = await fetch(`${BASE_API_URL}/api/tributes`, {
                headers: getAuthHeaders()
            });
            const data = await res.json();
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const mine = Array.isArray(data) ? data.filter(t => String(t.userId) === String(user.id) || String(t.user_id) === String(user.id)) : [];
            setUserMemorials(mine);
        } catch {
            setUserMemorials([]);
        }
    }, []);

    const fetchProducts = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/products`);
            const data = await res.json();
            // Only show subscription products (lifetime or voucher marked products)
            const subProducts = data.filter(p => p.is_lifetime || p.is_voucher || p.category?.toLowerCase().includes('subscription'));
            setProducts(subProducts.length > 0 ? subProducts : data);
            if (data.length > 0) setSelectedProductId(String(data[0].id));
        } catch {
            setProducts([]);
        }
    }, []);

    useEffect(() => {
        fetchSubscriptions();
        fetchProducts();
        fetchUserMemorials();
    }, [fetchSubscriptions, fetchProducts, fetchUserMemorials]);

    const startTrial = async () => {
        if (!selectedProductId) return;
        setStarting(true);
        setMessage(null);
        try {
            const res = await fetch(`${API_URL}/subscriptions/trial`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                body: JSON.stringify({
                    product_id: parseInt(selectedProductId),
                    language: i18n.language
                })
            });
            const data = await res.json();
            if (res.ok) {
                setMessage({ type: 'success', text: '🎉 Your 7-day free trial has started! Check your email.' });
                fetchSubscriptions();
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to start trial' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Server error. Please try again.' });
        } finally {
            setStarting(false);
        }
    };

    const handleRenewSuccess = (updatedSub) => {
        setActiveRenewSub(null);
        setMessage({ type: 'success', text: '✅ Subscription renewed successfully! Check your email for confirmation.' });
        fetchSubscriptions();
    };

    // Every memorial should now be covered by a subscription record (real or virtual) from the API
    const hasAnySubscriptions = subscriptions.length > 0;

    // ── Stats computed from loaded subscriptions — matches admin SubscriptionsListAdmin logic ──
    const stats = React.useMemo(() => ({
        trial:    subscriptions.filter(s => s.status === 'trial').length,
        active:   subscriptions.filter(s => s.status === 'active').length,               // ALL active (includes lifetime)
        lifetime: subscriptions.filter(s => Boolean(s.is_lifetime)).length,              // lifetime flag (overlaps with active)
        pending:  subscriptions.filter(s => s.status === 'expired' && !s.paid_start).length, // expired but never paid
        expired:  subscriptions.filter(s => s.status === 'expired' && s.paid_start).length,  // expired after paying
    }), [subscriptions]);

    const formatDate = (d, includeTime = false) => {
        if (!d) return '—';
        const date = new Date(d);
        const now = new Date();

        // Check if today
        const isToday = date.getDate() === now.getDate() &&
            date.getMonth() === now.getMonth() &&
            date.getFullYear() === now.getFullYear();

        if (isToday && !includeTime) return 'Started Today';

        const options = { day: 'numeric', month: 'long', year: 'numeric' };
        if (includeTime) {
            options.hour = '2-digit';
            options.minute = '2-digit';
        }
        return date.toLocaleDateString('en-GB', options).replace(',', '');
    };

    const getRelativeTime = (targetDate) => {
        if (!targetDate) return '';
        const now = new Date();
        const target = new Date(targetDate);
        const diffInMs = target - now;
        const diffInHours = Math.abs(diffInMs) / (1000 * 60 * 60);
        const diffInDays = diffInHours / 24;

        if (diffInMs > 0) {
            if (diffInDays >= 1) return `Ends in ${Math.round(diffInDays)} days`;
            if (diffInHours >= 1) return `Ends in ${Math.round(diffInHours)} hours`;
            return `Ends soon`;
        } else {
            if (diffInDays >= 1) return `Ended ${Math.round(diffInDays)} days ago`;
            if (diffInHours >= 1) return `Ended ${Math.round(diffInHours)} hours ago`;
            return `Ended just now`;
        }
    };

    return (
        <div className="space-y-6 pb-10">
            {/* Header */}
            <div className="max-w-2xl flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 text-xl">
                    <FontAwesomeIcon icon={faCrown} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">My Subscription</h2>
                    <p className="text-sm text-gray-500">Manage your membership and billing</p>
                </div>
            </div>

            {/* Stats — individual cards matching admin dashboard style */}
            {!routeId && !loading && hasAnySubscriptions && (() => {
                const tiles = [
                    { label: 'Trial',    value: stats.trial,    icon: faHourglass,   iconBg: 'bg-blue-50',   iconColor: 'text-blue-500',   activeBorder: 'border-blue-300'   },
                    { label: 'Active',   value: stats.active,   icon: faCheckCircle, iconBg: 'bg-green-50',  iconColor: 'text-green-500',  activeBorder: 'border-green-300'  },
                    { label: 'Lifetime', value: stats.lifetime, icon: faInfinity,    iconBg: 'bg-amber-50',  iconColor: 'text-amber-500',  activeBorder: 'border-amber-300'  },
                    { label: 'Pending',  value: stats.pending,  icon: faSyncAlt,     iconBg: 'bg-orange-50', iconColor: 'text-orange-400', activeBorder: 'border-orange-300' },
                    { label: 'Expired',  value: stats.expired,  icon: faTimesCircle, iconBg: 'bg-red-50',    iconColor: 'text-red-400',    activeBorder: 'border-red-300'    },
                ];
                const maxVal = Math.max(...tiles.map(t => t.value));
                return (
                    <div className="grid grid-cols-5 gap-4">
                        {tiles.map(tile => {
                            const isHighlight = tile.value > 0 && tile.value === maxVal;
                            return (
                                <div
                                    key={tile.label}
                                    className={`bg-white rounded-2xl border-2 px-5 py-4 flex items-center gap-3 shadow-sm transition-all
                                        ${isHighlight ? tile.activeBorder : 'border-gray-100'}`}
                                >
                                    {/* Icon badge */}
                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${tile.iconBg}`}>
                                        <FontAwesomeIcon icon={tile.icon} className={`${tile.iconColor} text-sm`} />
                                    </div>
                                    {/* Number + label */}
                                    <div>
                                        <p className="text-2xl font-bold text-gray-800 leading-none">{tile.value}</p>
                                        <p className="text-xs text-gray-400 font-medium mt-0.5">{tile.label}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                );
            })()}

            {/* Subscriptions List — 2 column grid */}
            <div className={`grid gap-6 ${!routeId && displayedSubscriptions.length > 1 ? 'grid-cols-1 lg:grid-cols-2' : 'max-w-2xl grid-cols-1'}`}>
                {loading ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 flex flex-col items-center">
                        <FontAwesomeIcon icon={faSpinner} spin className="text-[#c59d5f] text-4xl mb-4" />
                        <p className="text-gray-400 font-medium">Loading your subscription details...</p>
                    </div>
                ) : noAccess ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-red-100 flex flex-col items-center">
                        <FontAwesomeIcon icon={faTimesCircle} className="text-red-400 text-6xl mb-4" />
                        <h3 className="text-xl font-bold text-gray-800">Invalid Subscription</h3>
                        <p className="text-gray-400 font-medium px-10">You do not have permission to view this subscription or it does not exist.</p>
                        <button onClick={() => navigate('/admin/subscription')} className="mt-6 text-primary font-bold hover:underline tracking-tight">
                            View my subscriptions
                        </button>
                    </div>
                ) : displayedSubscriptions.map((sub) => {
                    const cfg = statusConfig[sub.status] || statusConfig.expired;
                    return (
                        <div key={sub.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            {/* Status Top Bar */}
                            <div className={`p-6 flex items-center gap-4 border-b ${cfg.bg} ${cfg.border}`}>
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${cfg.bg} border-2 ${cfg.border}`}>
                                    <FontAwesomeIcon icon={cfg.icon} className={`text-xl ${cfg.color}`} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Subscription #{String(sub.id).replace('m-', '')}</p>
                                    <h3 className={`text-xl font-bold ${cfg.color}`}>{cfg.label}</h3>
                                    {sub._virtual && (
                                        <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter mt-1 inline-block">
                                            Trial listing
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Details */}
                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-gray-50 rounded-lg p-4 col-span-2 md:col-span-1">
                                        <p className="text-xs text-gray-400 uppercase font-bold mb-1">Plan</p>
                                        <p className="font-semibold text-gray-800 text-sm">{sub.product_name || 'Tributoo Subscription'}</p>
                                    </div>

                                    {/* Listing Info Row - WordPress Style */}
                                    <div className="bg-amber-50/50 rounded-lg p-4 col-span-2 border border-amber-100/50">
                                        <p className="text-xs text-amber-600/60 uppercase font-bold mb-1">Listing</p>
                                        <div className="flex items-center justify-between">
                                            <p className="font-bold text-amber-800 text-sm">📖 {sub.memorial_name || 'Memorial Listing'}</p>
                                            {sub.memorial_id && (
                                                <a href={`/memorial/${sub.memorial_id}`} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-primary uppercase hover:underline">View Page</a>
                                            )}
                                        </div>
                                    </div>

                                    {sub.status === 'trial' && (
                                        <>
                                            <div className="bg-gray-50 rounded-lg p-3">
                                                <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Started</p>
                                                <p className="font-semibold text-gray-700 text-xs">
                                                    {formatDate(sub.trial_start)}
                                                </p>
                                            </div>
                                            <div className="bg-blue-50/50 rounded-lg p-3 border border-blue-100/30">
                                                <p className="text-[10px] text-blue-400 uppercase font-bold mb-1">Trial Status</p>
                                                <p className="font-bold text-blue-600 text-xs">
                                                    {formatDate(sub.trial_end, true)}
                                                    <span className="block text-[9px] opacity-70 font-bold uppercase mt-0.5">
                                                        {getRelativeTime(sub.trial_end)}
                                                    </span>
                                                </p>
                                            </div>
                                        </>
                                    )}
                                    {sub.status === 'active' && !sub.is_lifetime && (
                                        <div className="bg-green-50 rounded-lg p-4 col-span-2 md:col-span-1">
                                            <p className="text-xs text-green-600 uppercase font-bold mb-1">Valid Until</p>
                                            <p className="font-bold text-green-700 flex items-center gap-2">
                                                <FontAwesomeIcon icon={faCalendarAlt} />
                                                {formatDate(sub.paid_end)}
                                            </p>
                                        </div>
                                    )}
                                    {sub.status === 'active' && sub.is_lifetime && (
                                        <div className="bg-amber-50 rounded-lg p-4 col-span-2 md:col-span-1">
                                            <p className="text-xs text-amber-600 uppercase font-bold mb-1">Expires</p>
                                            <p className="font-bold text-amber-700 flex items-center gap-2">
                                                <FontAwesomeIcon icon={faInfinity} />
                                                Never (Lifetime)
                                            </p>
                                        </div>
                                    )}

                                    {sub.status === 'expired' && (
                                        <div className="bg-red-50/50 rounded-lg p-4 col-span-2 border border-red-100/30">
                                            <p className="text-[10px] text-red-500 uppercase font-bold mb-1">Expired Status</p>
                                            <p className="font-bold text-red-600 text-xs text-center">
                                                {formatDate(sub.paid_end || sub.trial_end, true)}
                                                <span className="block text-[9px] opacity-70 font-bold uppercase mt-0.5">
                                                    {getRelativeTime(sub.paid_end || sub.trial_end)}
                                                </span>
                                            </p>
                                        </div>
                                    )}

                                    {sub.status === 'payment_required' && (
                                        <div className="bg-amber-50/50 rounded-lg p-4 col-span-2 border border-amber-100/30">
                                            <p className="text-[10px] text-amber-500 uppercase font-bold mb-1">Status</p>
                                            <p className="font-bold text-amber-700 text-xs">
                                                Activation Required
                                                <span className="block text-[9px] opacity-70 font-bold uppercase mt-0.5">
                                                    Each memorial requires its own subscription plan.
                                                </span>
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                {!(sub.status === 'active' && sub.is_lifetime) && (
                                    <div className="pt-2">
                                        <button
                                            onClick={() => {
                                                const product = products.find(p => p.id === sub.product_id) || products[0];
                                                if (!product) {
                                                    showToast('Product information not found.', 'error');
                                                    return;
                                                }
                                                // Clear cart and add this specific renewal
                                                clearCart();
                                                addToCart(
                                                    { ...product },
                                                    1,
                                                    {
                                                        memorial_name: sub.memorial_name,
                                                        memorial_id: sub.memorial_id,
                                                        listing: sub.memorial_name,
                                                        subscription_id: sub.id,
                                                        type: 'memorial_subscription'
                                                    }
                                                );
                                                navigate('/checkout');
                                            }}
                                            className="w-full py-3 rounded-xl bg-[#c59d5f] text-white font-bold text-sm hover:bg-[#b08c50] transition-all flex items-center justify-center gap-2"
                                        >
                                            <FontAwesomeIcon icon={faCreditCard} />
                                            {sub.status === 'active' ? 'Upgrade' : (sub.status === 'payment_required' ? 'Activate Now' : 'Reactivate')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}

                {/* If absolutely nothing */}
                {!hasAnySubscriptions && (
                    <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 border-dashed">
                        <FontAwesomeIcon icon={faCrown} className="text-gray-100 text-6xl mb-4" />
                        <p className="text-gray-400 font-medium">No active subscriptions found.</p>
                        <a href="/admin/memorials/new" className="text-primary font-bold hover:underline mt-2 inline-block">+ Create your first listing</a>
                    </div>
                )}
            </div>

            {/* Renewal Modal */}
            {activeRenewSub && (
                <RenewalModal
                    subscription={activeRenewSub}
                    onClose={() => setActiveRenewSub(null)}
                    onSuccess={handleRenewSuccess}
                />
            )}
        </div>
    );
};

export default SubscriptionAdmin;
