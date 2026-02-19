import React, { useEffect, useState } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock, faSpinner } from '@fortawesome/free-solid-svg-icons';

const CheckoutForm = ({ amount, onSuccess }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [message, setMessage] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    useEffect(() => {
        if (!stripe) {
            return;
        }

        const clientSecret = new URLSearchParams(window.location.search).get(
            "payment_intent_client_secret"
        );

        if (!clientSecret) {
            return;
        }

        stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent }) => {
            switch (paymentIntent.status) {
                case "succeeded":
                    setMessage("Payment succeeded!");
                    setIsSuccess(true);
                    break;
                case "processing":
                    setMessage("Your payment is processing.");
                    break;
                case "requires_payment_method":
                    setMessage("Your payment was not successful, please try again.");
                    break;
                default:
                    setMessage("Something went wrong.");
                    break;
            }
        });
    }, [stripe]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!stripe || !elements) {
            // Stripe.js has not yet loaded.
            return;
        }

        setIsLoading(true);

        const { error, paymentIntent } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                // Make sure to change this to your payment completion page
                return_url: `${window.location.origin}/checkout`,
            },
            redirect: 'if_required', // Avoid redirect if not strictly necessary
        });

        if (error) {
            if (error.type === "card_error" || error.type === "validation_error") {
                setMessage(error.message);
            } else {
                setMessage("An unexpected error occurred.");
            }
            setIsSuccess(false);
        } else if (paymentIntent && paymentIntent.status === "succeeded") {
            setMessage("Payment succeeded! Your voucher will be emailed to you shortly.");
            setIsSuccess(true);
            onSuccess(paymentIntent);
        } else {
            setMessage("Payment processing...");
            setIsSuccess(false);
        }

        setIsLoading(false);
    };

    const paymentElementOptions = {
        layout: "tabs",
    };

    return (
        <form id="payment-form" onSubmit={handleSubmit} className="space-y-6">
            <PaymentElement id="payment-element" options={paymentElementOptions} className="mb-6" />

            {message && (
                <div id="payment-message" className={`text-sm font-medium flex items-center gap-2 ${isSuccess ? 'text-green-600' : 'text-red-500'
                    }`}>
                    {isSuccess ? '✅' : '⚠️'} {message}
                </div>
            )}

            <button
                disabled={isLoading || !stripe || !elements}
                id="submit"
                className="w-full bg-primary text-dark py-4 rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-dark hover:text-white transition-all duration-300 shadow-xl shadow-primary/20 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isLoading ? (
                    <>
                        <FontAwesomeIcon icon={faSpinner} spin />
                        Processing...
                    </>
                ) : (
                    <>
                        <FontAwesomeIcon icon={faLock} />
                        Pay €{amount.toFixed(2)}
                    </>
                )}
            </button>
        </form>
    );
};

export default CheckoutForm;
