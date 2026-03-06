import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTributeContext } from '../context/TributeContext';
import Navbar from '../components/layout/Navbar';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShieldAlt, faLock, faChevronRight, faArrowLeft, faCreditCard, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import CheckoutForm from '../components/checkout/CheckoutForm';
import CouponSection from '../components/cart/CouponSection';
import { useTranslation } from 'react-i18next';
import { Country, State } from 'country-state-city';

// Initialize Stripe outside of component
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

import { API_URL } from '../config';

const CheckoutPage = () => {
    const { cart, clearCart, showToast, appliedCoupon } = useTributeContext();
    const { i18n } = useTranslation();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [clientSecret, setClientSecret] = useState("");
    const [shipToDifferentAddress, setShipToDifferentAddress] = useState(false);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        companyName: '',
        country: 'Italy',
        address: '',
        apartment: '',
        city: '',
        state: '',
        zipCode: '',
        phone: '',
        email: '',
        orderNotes: '',
        shippingFirstName: '',
        shippingLastName: '',
        shippingCompanyName: '',
        shippingCountry: 'Italy',
        shippingAddress: '',
        shippingApartment: '',
        shippingCity: '',
        shippingState: '',
        shippingZipCode: ''
    });

    const subtotal = cart.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
    const shipping = 0;
    const discount = appliedCoupon ? appliedCoupon.discount : 0;
    const total = Math.max(0, subtotal + shipping - discount);

    const countries = React.useMemo(() => Country.getAllCountries(), []);
    const availableStates = React.useMemo(() => {
        const selectedCountryData = countries.find(c => c.name === formData.country);
        return selectedCountryData ? State.getStatesOfCountry(selectedCountryData.isoCode) : [];
    }, [formData.country, countries]);

    const shippingAvailableStates = React.useMemo(() => {
        const selectedCountryData = countries.find(c => c.name === formData.shippingCountry);
        return selectedCountryData ? State.getStatesOfCountry(selectedCountryData.isoCode) : [];
    }, [formData.shippingCountry, countries]);

    if (cart.length === 0) {
        return (
            <div className="min-h-screen bg-[#FAF9F6] pt-40 px-6 text-center">
                <Navbar />
                <h1 className="text-3xl font-serif mb-6">Your bag is empty</h1>
                <Link to="/shop" className="text-primary font-bold uppercase tracking-widest text-xs">Return to Collection</Link>
            </div>
        );
    }

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handlePaymentStep = async () => {
        if (step === 1) {
            // Validate billing info here
            if (
                !formData.email || !formData.firstName || !formData.lastName ||
                !formData.address || !formData.city || !formData.zipCode ||
                !formData.country || !formData.phone
            ) {
                showToast("Please fill in all required billing fields", "warning");
                return;
            }

            if (shipToDifferentAddress) {
                if (
                    !formData.shippingFirstName || !formData.shippingLastName ||
                    !formData.shippingAddress || !formData.shippingCity ||
                    !formData.shippingZipCode || !formData.shippingCountry
                ) {
                    showToast("Please fill in all required shipping fields", "warning");
                    return;
                }
            }

            if (total === 0) {
                setStep(2);
                return;
            }

            // Create PaymentIntent
            try {
                const res = await fetch(`${API_URL}/api/create-payment-intent`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ amount: total }),
                });
                const data = await res.json();
                setClientSecret(data.clientSecret);
                setStep(2);
            } catch (error) {
                console.error("Payment setup failed:", error);
                showToast("Could not initiate payment. Please try again.", "error");
            }
        }
    };

    const handleFreeCheckout = async () => {
        await handleSuccess({ id: 'free_checkout_' + Date.now() });
    };

    const handleSuccess = async (paymentIntent) => {
        try {
            await fetch(`${API_URL}/api/orders`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    shipToDifferentAddress,
                    total,
                    paymentIntentId: paymentIntent.id,
                    items: cart,
                    couponCode: appliedCoupon ? appliedCoupon.code : null,
                    language: i18n.language
                }),
            });

            // ── Create pending memorial if user filled the form before subscribing ──
            const pendingDraft = sessionStorage.getItem('pending_memorial_draft');
            let newlyCreatedTributeId = null;
            if (pendingDraft) {
                try {
                    const draft = JSON.parse(pendingDraft);
                    const token = localStorage.getItem('token');
                    const headers = {
                        'Content-Type': 'application/json',
                        ...(token ? { Authorization: `Bearer ${token}` } : {})
                    };

                    // Create the tribute
                    const tributeRes = await fetch(`${API_URL}/api/tributes`, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({ ...draft, isPaidDraft: true })
                    });

                    if (tributeRes.ok) {
                        const newTribute = await tributeRes.json();
                        newlyCreatedTributeId = newTribute.id;
                        // Upload gallery images
                        if (draft.images?.length > 0) {
                            for (const img of draft.images) {
                                await fetch(`${API_URL}/api/tributes/${newTribute.id}/media`, {
                                    method: 'POST',
                                    headers,
                                    body: JSON.stringify({ type: 'image', url: img })
                                });
                            }
                        }
                        // Upload gallery videos
                        if (draft.videos?.length > 0) {
                            for (const vid of draft.videos) {
                                await fetch(`${API_URL}/api/tributes/${newTribute.id}/media`, {
                                    method: 'POST',
                                    headers,
                                    body: JSON.stringify({ type: 'video', url: vid })
                                });
                            }
                        }
                        showToast(`Memorial "${draft.name}" published successfully!`, 'success');
                    }
                    sessionStorage.removeItem('pending_memorial_draft');
                } catch (draftErr) {
                    console.error('Failed to create memorial from draft:', draftErr);
                    showToast('Payment succeeded but memorial creation failed. Please contact support.', 'warning');
                }
            } else {
                showToast("Order placed successfully!", "success");
            }

            // ── Auto-activate subscription for memorial_subscription cart items ──
            try {
                const subItem = cart.find(i => i.metadata?.type === 'memorial_subscription');
                if (subItem) {
                    const token = localStorage.getItem('token');
                    await fetch(`${API_URL}/api/subscriptions/renew`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            ...(token ? { Authorization: `Bearer ${token}` } : {})
                        },
                        body: JSON.stringify({
                            payment_intent_id: paymentIntent.id,
                            product_id: subItem.id,
                            memorial_name: subItem.metadata?.memorial_name,
                            memorial_id: newlyCreatedTributeId || subItem.metadata?.memorial_id,
                            language: i18n.language,
                            coupon_applied: !!appliedCoupon,
                            coupon_code: appliedCoupon ? appliedCoupon.code : null
                        })
                    });
                }
            } catch (subErr) {
                console.error('Subscription activation error (non-blocking):', subErr);
            }

            clearCart();
            navigate('/admin/memorials');
        } catch (error) {
            console.error("Order save failed:", error);
            showToast("Payment successful but order saving failed. Please contact support.", "warning");
        }
    };

    const appearance = {
        theme: 'stripe',
        variables: {
            colorPrimary: '#D4AF37',
            colorBackground: '#ffffff',
            colorText: '#1A1A1A',
            fontFamily: '"Manrope", sans-serif',
            borderRadius: '12px',
        },
    };

    return (
        <div className="min-h-screen bg-[#FAF9F6] text-dark pb-20">
            <Navbar />

            <div className="container mx-auto px-6 pt-40 lg:pt-48">
                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-20">

                    {/* Left: Checkout Form */}
                    <div className="lg:w-2/3">
                        <CouponSection />

                        <div className="mb-12 flex items-center gap-4 text-[10px] font-bold uppercase tracking-[0.2em]">
                            <span className={step >= 1 ? 'text-primary' : 'text-gray-300'}>Contact & Shipping</span>
                            <FontAwesomeIcon icon={faChevronRight} className="text-gray-200" size="xs" />
                            <span className={step >= 2 ? 'text-primary' : 'text-gray-300'}>Payment Method</span>
                        </div>

                        {step === 1 ? (
                            <form className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <section className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500 bg-white p-6 md:p-10 rounded-[2rem] shadow-xl shadow-dark/5 border border-dark/5">
                                    <h2 className="text-[18px] font-bold text-gray-800 mb-6 font-sans">
                                        Billing details
                                    </h2>
                                    <div className="grid grid-cols-2 gap-x-6 gap-y-4 font-sans">
                                        <div>
                                            <label className="block text-[14px] text-gray-700 mb-1.5 font-medium">First name <abbr className="text-red-500 no-underline" title="required">*</abbr></label>
                                            <input
                                                type="text"
                                                name="firstName"
                                                className="w-full bg-white border border-[#ccc] rounded-[3px] px-3 py-2 outline-none focus:border-[#000] focus:ring-1 focus:ring-[#000] transition-colors text-[15px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]"
                                                value={formData.firstName}
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[14px] text-gray-700 mb-1.5 font-medium">Last name <abbr className="text-red-500 no-underline" title="required">*</abbr></label>
                                            <input
                                                type="text"
                                                name="lastName"
                                                className="w-full bg-white border border-[#ccc] rounded-[3px] px-3 py-2 outline-none focus:border-[#000] focus:ring-1 focus:ring-[#000] transition-colors text-[15px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]"
                                                value={formData.lastName}
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                        <div className="col-span-2 mt-1">
                                            <label className="block text-[14px] text-gray-700 mb-1.5 font-medium">Company name (optional)</label>
                                            <input
                                                type="text"
                                                name="companyName"
                                                className="w-full bg-white border border-[#ccc] rounded-[3px] px-3 py-2 outline-none focus:border-[#000] focus:ring-1 focus:ring-[#000] transition-colors text-[15px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]"
                                                value={formData.companyName}
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                        <div className="col-span-2 mt-1 relative">
                                            <label className="block text-[14px] text-gray-700 mb-1.5 font-medium">Country / Region <abbr className="text-red-500 no-underline" title="required">*</abbr></label>
                                            <select
                                                name="country"
                                                className="w-full bg-white border border-[#ccc] rounded-[3px] px-3 py-2 outline-none focus:border-[#000] focus:ring-1 focus:ring-[#000] transition-colors text-[15px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)] appearance-none pr-8 cursor-pointer"
                                                value={formData.country}
                                                onChange={handleInputChange}
                                            >
                                                {countries.map((c) => (
                                                    <option key={c.isoCode} value={c.name}>{c.name}</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-3 bottom-0 top-[30px] pointer-events-none flex items-center text-[#d4af37] text-[10px]">▼</div>
                                        </div>
                                        <div className="col-span-2 mt-1">
                                            <label className="block text-[14px] text-gray-700 mb-1.5 font-medium">Street address <abbr className="text-red-500 no-underline" title="required">*</abbr></label>
                                            <input
                                                type="text"
                                                name="address"
                                                placeholder="House number and street name"
                                                className="w-full bg-white border border-[#ccc] rounded-[3px] px-3 py-2 outline-none focus:border-[#000] focus:ring-1 focus:ring-[#000] transition-colors text-[15px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)] mb-3"
                                                value={formData.address}
                                                onChange={handleInputChange}
                                            />
                                            <input
                                                type="text"
                                                name="apartment"
                                                placeholder="Apartment, suite, unit, etc. (optional)"
                                                className="w-full bg-white border border-[#ccc] rounded-[3px] px-3 py-2 outline-none focus:border-[#000] focus:ring-1 focus:ring-[#000] transition-colors text-[15px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]"
                                                value={formData.apartment}
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                        <div className="col-span-2 mt-1">
                                            <label className="block text-[14px] text-gray-700 mb-1.5 font-medium">Postcode / ZIP <abbr className="text-red-500 no-underline" title="required">*</abbr></label>
                                            <input
                                                type="text"
                                                name="zipCode"
                                                className="w-full bg-white border border-[#ccc] rounded-[3px] px-3 py-2 outline-none focus:border-[#000] focus:ring-1 focus:ring-[#000] transition-colors text-[15px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]"
                                                value={formData.zipCode}
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                        <div className="col-span-2 mt-1">
                                            <label className="block text-[14px] text-gray-700 mb-1.5 font-medium">Town / City <abbr className="text-red-500 no-underline" title="required">*</abbr></label>
                                            <input
                                                type="text"
                                                name="city"
                                                className="w-full bg-white border border-[#ccc] rounded-[3px] px-3 py-2 outline-none focus:border-[#000] focus:ring-1 focus:ring-[#000] transition-colors text-[15px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]"
                                                value={formData.city}
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                        <div className="col-span-2 mt-1 relative">
                                            <label className="block text-[14px] text-gray-700 mb-1.5 font-medium">State / County (optional)</label>
                                            {availableStates.length > 0 ? (
                                                <>
                                                    <select
                                                        name="state"
                                                        className="w-full bg-white border border-[#ccc] rounded-[3px] px-3 py-2 outline-none focus:border-[#000] focus:ring-1 focus:ring-[#000] transition-colors text-[15px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)] appearance-none pr-8 cursor-pointer"
                                                        value={formData.state}
                                                        onChange={handleInputChange}
                                                    >
                                                        <option value="">Select an option...</option>
                                                        {availableStates.map((s) => (
                                                            <option key={s.isoCode} value={s.name}>{s.name}</option>
                                                        ))}
                                                    </select>
                                                    <div className="absolute right-3 bottom-0 top-[30px] pointer-events-none flex items-center text-[#d4af37] text-[10px]">▼</div>
                                                </>
                                            ) : (
                                                <input
                                                    type="text"
                                                    name="state"
                                                    placeholder="State / County"
                                                    className="w-full bg-white border border-[#ccc] rounded-[3px] px-3 py-2 outline-none focus:border-[#000] focus:ring-1 focus:ring-[#000] transition-colors text-[15px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]"
                                                    value={formData.state}
                                                    onChange={handleInputChange}
                                                />
                                            )}
                                        </div>
                                        <div className="col-span-2 mt-1">
                                            <label className="block text-[14px] text-gray-700 mb-1.5 font-medium">Phone <abbr className="text-red-500 no-underline" title="required">*</abbr></label>
                                            <input
                                                type="tel"
                                                name="phone"
                                                className="w-full bg-white border border-[#ccc] rounded-[3px] px-3 py-2 outline-none focus:border-[#000] focus:ring-1 focus:ring-[#000] transition-colors text-[15px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]"
                                                value={formData.phone}
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                        <div className="col-span-2 mt-1">
                                            <label className="block text-[14px] text-gray-700 mb-1.5 font-medium">Email address <abbr className="text-red-500 no-underline" title="required">*</abbr></label>
                                            <input
                                                type="email"
                                                name="email"
                                                className="w-full bg-white border border-[#ccc] rounded-[3px] px-3 py-2 outline-none focus:border-[#000] focus:ring-1 focus:ring-[#000] transition-colors text-[15px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]"
                                                value={formData.email}
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-8 pt-6 border-t border-gray-200">
                                        <label className="flex items-center gap-3 cursor-pointer mb-6 group">
                                            <input
                                                type="checkbox"
                                                className="w-[18px] h-[18px] text-[#000] border-[#ccc] rounded-[2px] focus:ring-[#000]"
                                                checked={shipToDifferentAddress}
                                                onChange={(e) => setShipToDifferentAddress(e.target.checked)}
                                            />
                                            <span className="text-[17px] font-bold text-gray-800">Ship to a different address?</span>
                                        </label>

                                        {shipToDifferentAddress && (
                                            <div className="grid grid-cols-2 gap-x-6 gap-y-4 font-sans mb-6">
                                                <div>
                                                    <label className="block text-[14px] text-gray-700 mb-1.5 font-medium">First name <abbr className="text-red-500 no-underline" title="required">*</abbr></label>
                                                    <input
                                                        type="text"
                                                        name="shippingFirstName"
                                                        className="w-full bg-white border border-[#ccc] rounded-[3px] px-3 py-2 outline-none focus:border-[#000] focus:ring-1 focus:ring-[#000] transition-colors text-[15px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]"
                                                        value={formData.shippingFirstName}
                                                        onChange={handleInputChange}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[14px] text-gray-700 mb-1.5 font-medium">Last name <abbr className="text-red-500 no-underline" title="required">*</abbr></label>
                                                    <input
                                                        type="text"
                                                        name="shippingLastName"
                                                        className="w-full bg-white border border-[#ccc] rounded-[3px] px-3 py-2 outline-none focus:border-[#000] focus:ring-1 focus:ring-[#000] transition-colors text-[15px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]"
                                                        value={formData.shippingLastName}
                                                        onChange={handleInputChange}
                                                    />
                                                </div>
                                                <div className="col-span-2 mt-1">
                                                    <label className="block text-[14px] text-gray-700 mb-1.5 font-medium">Company name (optional)</label>
                                                    <input
                                                        type="text"
                                                        name="shippingCompanyName"
                                                        className="w-full bg-white border border-[#ccc] rounded-[3px] px-3 py-2 outline-none focus:border-[#000] focus:ring-1 focus:ring-[#000] transition-colors text-[15px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]"
                                                        value={formData.shippingCompanyName}
                                                        onChange={handleInputChange}
                                                    />
                                                </div>
                                                <div className="col-span-2 mt-1 relative">
                                                    <label className="block text-[14px] text-gray-700 mb-1.5 font-medium">Country / Region <abbr className="text-red-500 no-underline" title="required">*</abbr></label>
                                                    <select
                                                        name="shippingCountry"
                                                        className="w-full bg-white border border-[#ccc] rounded-[3px] px-3 py-2 outline-none focus:border-[#000] focus:ring-1 focus:ring-[#000] transition-colors text-[15px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)] appearance-none pr-8 cursor-pointer"
                                                        value={formData.shippingCountry}
                                                        onChange={handleInputChange}
                                                    >
                                                        {countries.map((c) => (
                                                            <option key={c.isoCode} value={c.name}>{c.name}</option>
                                                        ))}
                                                    </select>
                                                    <div className="absolute right-3 bottom-0 top-[30px] pointer-events-none flex items-center text-[#d4af37] text-[10px]">▼</div>
                                                </div>
                                                <div className="col-span-2 mt-1">
                                                    <label className="block text-[14px] text-gray-700 mb-1.5 font-medium">Street address <abbr className="text-red-500 no-underline" title="required">*</abbr></label>
                                                    <input
                                                        type="text"
                                                        name="shippingAddress"
                                                        placeholder="House number and street name"
                                                        className="w-full bg-white border border-[#ccc] rounded-[3px] px-3 py-2 outline-none focus:border-[#000] focus:ring-1 focus:ring-[#000] transition-colors text-[15px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)] mb-3"
                                                        value={formData.shippingAddress}
                                                        onChange={handleInputChange}
                                                    />
                                                    <input
                                                        type="text"
                                                        name="shippingApartment"
                                                        placeholder="Apartment, suite, unit, etc. (optional)"
                                                        className="w-full bg-white border border-[#ccc] rounded-[3px] px-3 py-2 outline-none focus:border-[#000] focus:ring-1 focus:ring-[#000] transition-colors text-[15px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]"
                                                        value={formData.shippingApartment}
                                                        onChange={handleInputChange}
                                                    />
                                                </div>
                                                <div className="col-span-2 mt-1">
                                                    <label className="block text-[14px] text-gray-700 mb-1.5 font-medium">Postcode / ZIP <abbr className="text-red-500 no-underline" title="required">*</abbr></label>
                                                    <input
                                                        type="text"
                                                        name="shippingZipCode"
                                                        className="w-full bg-white border border-[#ccc] rounded-[3px] px-3 py-2 outline-none focus:border-[#000] focus:ring-1 focus:ring-[#000] transition-colors text-[15px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]"
                                                        value={formData.shippingZipCode}
                                                        onChange={handleInputChange}
                                                    />
                                                </div>
                                                <div className="col-span-2 mt-1">
                                                    <label className="block text-[14px] text-gray-700 mb-1.5 font-medium">Town / City <abbr className="text-red-500 no-underline" title="required">*</abbr></label>
                                                    <input
                                                        type="text"
                                                        name="shippingCity"
                                                        className="w-full bg-white border border-[#ccc] rounded-[3px] px-3 py-2 outline-none focus:border-[#000] focus:ring-1 focus:ring-[#000] transition-colors text-[15px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]"
                                                        value={formData.shippingCity}
                                                        onChange={handleInputChange}
                                                    />
                                                </div>
                                                <div className="col-span-2 mt-1 relative">
                                                    <label className="block text-[14px] text-gray-700 mb-1.5 font-medium">State / County (optional)</label>
                                                    {shippingAvailableStates.length > 0 ? (
                                                        <>
                                                            <select
                                                                name="shippingState"
                                                                className="w-full bg-white border border-[#ccc] rounded-[3px] px-3 py-2 outline-none focus:border-[#000] focus:ring-1 focus:ring-[#000] transition-colors text-[15px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)] appearance-none pr-8 cursor-pointer"
                                                                value={formData.shippingState}
                                                                onChange={handleInputChange}
                                                            >
                                                                <option value="">Select an option...</option>
                                                                {shippingAvailableStates.map((s) => (
                                                                    <option key={s.isoCode} value={s.name}>{s.name}</option>
                                                                ))}
                                                            </select>
                                                            <div className="absolute right-3 bottom-0 top-[30px] pointer-events-none flex items-center text-[#d4af37] text-[10px]">▼</div>
                                                        </>
                                                    ) : (
                                                        <input
                                                            type="text"
                                                            name="shippingState"
                                                            placeholder="State / County"
                                                            className="w-full bg-white border border-[#ccc] rounded-[3px] px-3 py-2 outline-none focus:border-[#000] focus:ring-1 focus:ring-[#000] transition-colors text-[15px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]"
                                                            value={formData.shippingState}
                                                            onChange={handleInputChange}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        <div className="mt-4 font-sans">
                                            <label className="block text-[14px] text-gray-700 mb-1.5 font-medium">Order notes (optional)</label>
                                            <textarea
                                                name="orderNotes"
                                                placeholder="Notes about your order, e.g. special notes for delivery."
                                                className="w-full bg-white border border-[#ccc] rounded-[3px] px-3 py-2 outline-none focus:border-[#000] focus:ring-1 focus:ring-[#000] transition-colors text-[15px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)] min-h-[90px]"
                                                value={formData.orderNotes}
                                                onChange={handleInputChange}
                                            ></textarea>
                                        </div>
                                    </div>
                                </section>

                                <div className="pt-10">
                                    <button
                                        type="button"
                                        onClick={handlePaymentStep}
                                        className="w-full bg-dark text-white py-6 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-primary hover:text-dark transition-all duration-500 shadow-xl shadow-dark/10"
                                    >
                                        {total === 0 ? 'Complete Order' : 'Continue to Payment'}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                                <section>
                                    <h2 className="text-2xl font-serif mb-8 flex items-center gap-3">
                                        Payment Method
                                        <div className="h-px flex-1 bg-dark/5" />
                                    </h2>

                                    <div className="bg-white p-6 md:p-10 rounded-[2rem] shadow-xl shadow-dark/5 border border-dark/5 space-y-8">
                                        {total === 0 ? (
                                            <div className="text-center py-6">
                                                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                                    <FontAwesomeIcon icon={faShieldAlt} className="text-green-600 text-3xl" />
                                                </div>
                                                <h3 className="text-xl font-serif mb-2">Order fully covered</h3>
                                                <p className="text-gray-400 text-sm mb-8">Your coupon has covered the entire amount. No payment is required.</p>
                                                <button
                                                    onClick={handleFreeCheckout}
                                                    className="w-full bg-primary text-dark py-6 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-dark hover:text-white transition-all duration-500"
                                                >
                                                    Confirm & Place Order
                                                </button>
                                            </div>
                                        ) : clientSecret ? (
                                            <Elements options={{ clientSecret, appearance }} stripe={stripePromise}>
                                                <CheckoutForm amount={total} onSuccess={handleSuccess} />
                                            </Elements>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                                                <FontAwesomeIcon icon={faSpinner} spin size="2x" className="mb-4 text-primary" />
                                                <p>Initializing Secure Payment...</p>
                                            </div>
                                        )}
                                    </div>
                                </section>

                                <div className="mt-8">
                                    <button
                                        type="button"
                                        onClick={() => setStep(1)}
                                        className="text-gray-400 font-bold uppercase tracking-widest text-[10px] hover:text-dark transition-colors flex items-center justify-center gap-2 w-full"
                                    >
                                        <FontAwesomeIcon icon={faArrowLeft} size="xs" />
                                        Back to Shipping
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right: Order Summary */}
                    <div className="lg:w-1/3">
                        <div className="sticky top-40 bg-white p-10 rounded-[2.5rem] shadow-2xl shadow-dark/5 border border-dark/5">
                            <h2 className="text-2xl font-serif mb-8">Order Summary</h2>

                            <div className="space-y-6 mb-8 max-h-[40vh] overflow-y-auto pr-4 custom-scrollbar">
                                {cart.map((item, idx) => (
                                    <div key={idx} className="flex gap-4 items-center">
                                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0">
                                            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover grayscale" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-dark truncate">{item.name}</p>
                                            <p className="text-xs text-secondary mt-1">{item.quantity} × €{parseFloat(item.price).toFixed(2)}</p>
                                        </div>
                                        <p className="text-sm font-bold">€{(parseFloat(item.price) * item.quantity).toFixed(2)}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-4 pt-8 border-t border-dark/5">
                                <div className="flex justify-between text-sm italic font-serif text-gray-400">
                                    <span>Subtotal</span>
                                    <span>€{subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm italic font-serif text-gray-400">
                                    <span>Shipping</span>
                                    <span className="text-green-600 font-bold">Complimentary</span>
                                </div>
                                {appliedCoupon && (
                                    <div className="flex justify-between text-sm animate-in slide-in-from-top-1 duration-200">
                                        <span className="text-primary font-serif italic">Coupon Discount ({appliedCoupon.code})</span>
                                        <span className="text-primary font-bold">- €{appliedCoupon.discount.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-end pt-4">
                                    <span className="text-lg font-serif">Total Due</span>
                                    <span className="text-3xl font-bold tracking-tighter text-dark">€{total.toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="mt-10 pt-10 border-t border-dark/5 flex items-center gap-4 text-gray-400">
                                <FontAwesomeIcon icon={faLock} className="text-primary" />
                                <p className="text-[10px] font-serif italic">Your data is secured by industry standard SSL encryption.</p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default CheckoutPage;
