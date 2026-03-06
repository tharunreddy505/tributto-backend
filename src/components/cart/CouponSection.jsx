import React, { useState } from 'react';
import { useTributeContext } from '../../context/TributeContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTag, faXmark } from '@fortawesome/free-solid-svg-icons';

const CouponSection = () => {
    const { applyCoupon, appliedCoupon, removeCoupon } = useTributeContext();
    const [isOpen, setIsOpen] = useState(false);
    const [couponCode, setCouponCode] = useState('');
    const [loading, setLoading] = useState(false);

    const handleApplyCoupon = async (e) => {
        e.preventDefault();
        if (!couponCode.trim()) return;

        setLoading(true);
        const result = await applyCoupon(couponCode);
        setLoading(false);

        if (result.success) {
            setCouponCode('');
            setIsOpen(false);
        }
    };

    if (appliedCoupon) {
        return (
            <div className="w-full mb-8 animate-in fade-in duration-500">
                <div className="bg-green-50 border border-green-100 p-4 md:p-5 flex items-center justify-between gap-3 text-sm md:text-base rounded-lg">
                    <div className="flex items-center gap-3">
                        <FontAwesomeIcon icon={faTag} className="text-green-600" />
                        <p className="text-green-800 font-medium">
                            Coupon <span className="font-bold">"{appliedCoupon.code}"</span> applied:
                            <span className="ml-2 font-bold">-€{appliedCoupon.discount.toFixed(2)}</span>
                        </p>
                    </div>
                    <button
                        onClick={removeCoupon}
                        className="text-green-600 hover:text-green-800 transition-colors p-1"
                        title="Remove Coupon"
                    >
                        <FontAwesomeIcon icon={faXmark} />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full mb-8 animate-in fade-in duration-500">
            {/* Toggle Banner */}
            <div
                className="bg-white border border-gray-100 p-4 md:p-5 flex items-center gap-3 text-sm md:text-base cursor-pointer hover:bg-gray-50 transition-all group"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="w-5 h-5 border border-gray-300 rounded-[2px] flex-shrink-0 flex items-center justify-center group-hover:border-primary transition-colors bg-white shadow-sm">
                    {/* Empty square matching WordPress style */}
                </div>
                <p className="text-gray-500 font-medium">
                    Have a coupon or gift card? <span className="text-[#c59d5f] font-bold hover:underline transition-all">Click here to enter your code</span>
                </p>
            </div>

            {/* Collapsible Form */}
            {isOpen && (
                <div className="mt-4 p-6 bg-white border border-gray-100 animate-in slide-in-from-top-2 duration-300">
                    <form onSubmit={handleApplyCoupon} className="flex flex-col md:flex-row gap-4">
                        <input
                            type="text"
                            placeholder="Coupon code"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value)}
                            className="flex-1 px-4 py-3 border border-gray-200 outline-none focus:border-dark transition-all text-sm"
                            disabled={loading}
                        />
                        <button
                            type="submit"
                            disabled={loading || !couponCode.trim()}
                            className="bg-[#c59d5f] text-white px-10 py-3 font-bold text-xs uppercase tracking-widest hover:bg-[#b08b54] transition-all whitespace-nowrap disabled:opacity-50"
                        >
                            {loading ? 'Applying...' : 'Apply Coupon'}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default CouponSection;
