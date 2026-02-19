import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTributeContext } from '../context/TributeContext';
import Navbar from '../components/layout/Navbar';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShieldAlt, faLock, faChevronRight, faArrowLeft, faCreditCard, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import CheckoutForm from '../components/checkout/CheckoutForm';

// Initialize Stripe outside of component
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

import { API_URL } from '../config';

const CheckoutPage = () => {
    const { cart, clearCart, showToast } = useTributeContext();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [clientSecret, setClientSecret] = useState("");
    const [formData, setFormData] = useState({
        email: '',
        firstName: '',
        lastName: '',
        address: '',
        city: '',
        zipCode: '',
        country: 'Italy',
    });

    const subtotal = cart.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
    const shipping = 0;
    const total = subtotal + shipping;

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
            // Validate shipping info here if needed

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

    const handleSuccess = async (paymentIntent) => {
        try {
            await fetch(`${API_URL}/api/orders`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    total,
                    paymentIntentId: paymentIntent.id,
                    items: cart
                }),
            });
            showToast("Order placed successfully!", "success");
            clearCart();
            navigate('/');
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
                        <div className="mb-12 flex items-center gap-4 text-[10px] font-bold uppercase tracking-[0.2em]">
                            <span className={step >= 1 ? 'text-primary' : 'text-gray-300'}>Contact & Shipping</span>
                            <FontAwesomeIcon icon={faChevronRight} className="text-gray-200" size="xs" />
                            <span className={step >= 2 ? 'text-primary' : 'text-gray-300'}>Payment Method</span>
                        </div>

                        {step === 1 ? (
                            <form className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <section>
                                    <h2 className="text-2xl font-serif mb-8 flex items-center gap-3">
                                        Contact Information
                                        <div className="h-px flex-1 bg-dark/5" />
                                    </h2>
                                    <div className="space-y-6">
                                        <div className="relative group">
                                            <input
                                                type="email"
                                                name="email"
                                                placeholder="Email Address"
                                                className="w-full bg-white border border-dark/5 rounded-2xl px-6 py-4 outline-none focus:border-primary transition-all shadow-sm"
                                                value={formData.email}
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                    </div>
                                </section>

                                <section>
                                    <h2 className="text-2xl font-serif mb-8 flex items-center gap-3">
                                        Shipping Details
                                        <div className="h-px flex-1 bg-dark/5" />
                                    </h2>
                                    <div className="grid grid-cols-2 gap-6">
                                        <input
                                            type="text"
                                            name="firstName"
                                            placeholder="First Name"
                                            className="bg-white border border-dark/5 rounded-2xl px-6 py-4 outline-none focus:border-primary transition-all shadow-sm"
                                            value={formData.firstName}
                                            onChange={handleInputChange}
                                        />
                                        <input
                                            type="text"
                                            name="lastName"
                                            placeholder="Last Name"
                                            className="bg-white border border-dark/5 rounded-2xl px-6 py-4 outline-none focus:border-primary transition-all shadow-sm"
                                            value={formData.lastName}
                                            onChange={handleInputChange}
                                        />
                                        <input
                                            type="text"
                                            name="address"
                                            placeholder="Address"
                                            className="col-span-2 bg-white border border-dark/5 rounded-2xl px-6 py-4 outline-none focus:border-primary transition-all shadow-sm"
                                            value={formData.address}
                                            onChange={handleInputChange}
                                        />
                                        <input
                                            type="text"
                                            name="city"
                                            placeholder="City"
                                            className="bg-white border border-dark/5 rounded-2xl px-6 py-4 outline-none focus:border-primary transition-all shadow-sm"
                                            value={formData.city}
                                            onChange={handleInputChange}
                                        />
                                        <input
                                            type="text"
                                            name="zipCode"
                                            placeholder="Zip Code"
                                            className="bg-white border border-dark/5 rounded-2xl px-6 py-4 outline-none focus:border-primary transition-all shadow-sm"
                                            value={formData.zipCode}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                </section>

                                <div className="pt-10">
                                    <button
                                        type="button"
                                        onClick={handlePaymentStep}
                                        className="w-full bg-dark text-white py-6 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-primary hover:text-dark transition-all duration-500 shadow-xl shadow-dark/10"
                                    >
                                        Continue to Payment
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
                                        {clientSecret ? (
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
