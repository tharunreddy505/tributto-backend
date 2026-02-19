import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTributeContext } from '../context/TributeContext';
import Navbar from '../components/layout/Navbar';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faMinus, faPlus, faArrowLeft, faShoppingBag, faShieldAlt, faTruck, faUndo, faArrowRight, faCreditCard } from '@fortawesome/free-solid-svg-icons';

const CartPage = () => {
    const { cart, removeFromCart, updateCartQuantity, showToast } = useTributeContext();
    const navigate = useNavigate();

    const subtotal = cart.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
    const shipping = 0;
    const total = subtotal + shipping;

    if (cart.length === 0) {
        return (
            <div className="min-h-screen bg-[#FAF9F6] text-dark">
                <Navbar />
                <div className="container mx-auto px-6 py-40 flex flex-col items-center justify-center text-center">
                    <div className="relative mb-10">
                        <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-2xl shadow-dark/5 border border-gray-100">
                            <FontAwesomeIcon icon={faShoppingBag} className="text-gray-200 text-5xl" />
                        </div>
                        <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-primary rounded-full border-4 border-[#FAF9F6] flex items-center justify-center text-dark text-xs font-bold shadow-lg">0</div>
                    </div>
                    <h1 className="text-4xl font-serif text-dark mb-4">Your legacy basket is empty</h1>
                    <p className="text-gray-400 max-w-md mx-auto italic font-serif text-lg mb-12">
                        Collect meaningful tokens of remembrance to honor those who matter most.
                    </p>
                    <Link to="/shop" className="bg-dark text-white px-12 py-5 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-primary hover:text-dark transition-all duration-500 shadow-xl shadow-dark/10">
                        Explore Collection
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FAF9F6] text-dark selection:bg-primary/20 pb-40">
            <Navbar />

            <div className="container mx-auto px-6 pt-40 lg:pt-48">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-16 border-b border-dark/5 pb-10">
                    <div>
                        <Link to="/shop" className="inline-flex items-center gap-2 text-gray-400 hover:text-primary transition-colors mb-4 text-xs font-bold uppercase tracking-widest">
                            <FontAwesomeIcon icon={faArrowLeft} />
                            Return to Shop
                        </Link>
                        <h1 className="text-5xl md:text-6xl font-serif text-dark tracking-tight">Shopping Bag <span className="text-primary font-serif">.</span></h1>
                    </div>
                    <div className="text-right">
                        <p className="text-gray-400 font-serif italic text-lg">{cart.length} {cart.length === 1 ? 'Item' : 'Items'} ready for memorial</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-16">

                    {/* Cart Items List */}
                    <div className="xl:col-span-8 space-y-12">
                        <div className="space-y-8">
                            {cart.map((item, index) => (
                                <div key={`${item.id}-${index}`} className="group flex flex-col md:flex-row items-center gap-8 lg:gap-12 p-8 bg-white rounded-[2rem] shadow-xl shadow-dark/5 border border-gray-50/50 hover:shadow-2xl hover:shadow-dark/10 transition-all duration-500 hover:-translate-y-1">
                                    {/* Product Image */}
                                    <div className="w-full md:w-44 aspect-square rounded-2xl overflow-hidden bg-[#F5F5F7] shadow-inner relative flex-shrink-0">
                                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover grayscale transition-all duration-700 group-hover:grayscale-0 group-hover:scale-110" />
                                        {item.is_voucher && (
                                            <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-[8px] font-bold text-dark uppercase tracking-widest border border-dark/5">Voucher</div>
                                        )}
                                    </div>

                                    {/* Product Info */}
                                    <div className="flex-1 flex flex-col h-full py-2">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="text-2xl font-serif text-dark mb-1 group-hover:text-primary transition-colors duration-300">{item.name}</h3>
                                                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{item.category || 'Legacy Collection'}</p>
                                            </div>
                                            <button
                                                onClick={() => removeFromCart(item.id, item.metadata)}
                                                className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 hover:border-red-100 transition-all duration-300 shadow-sm"
                                                title="Remove"
                                            >
                                                <FontAwesomeIcon icon={faTrash} size="xs" />
                                            </button>
                                        </div>

                                        {item.metadata?.message && (
                                            <div className="mb-6 p-4 bg-gray-50/50 rounded-xl border border-dark/5 italic text-gray-400 text-sm font-serif">
                                                “ {item.metadata.message} ”
                                            </div>
                                        )}

                                        <div className="mt-auto flex flex-wrap items-center justify-between gap-6">
                                            {/* Quantity Controls */}
                                            <div className="flex items-center gap-6 bg-dark text-white rounded-full px-6 py-2 shadow-xl shadow-dark/10">
                                                <button
                                                    onClick={() => updateCartQuantity(item.id, item.quantity - 1, item.metadata)}
                                                    className="w-4 h-4 flex items-center justify-center text-white/40 hover:text-primary transition-colors"
                                                >
                                                    <FontAwesomeIcon icon={faMinus} size="xs" />
                                                </button>
                                                <span className="w-6 text-center font-bold text-sm tracking-tighter">{item.quantity}</span>
                                                <button
                                                    onClick={() => updateCartQuantity(item.id, item.quantity + 1, item.metadata)}
                                                    className="w-4 h-4 flex items-center justify-center text-white/40 hover:text-primary transition-colors"
                                                >
                                                    <FontAwesomeIcon icon={faPlus} size="xs" />
                                                </button>
                                            </div>

                                            {/* Total Piece */}
                                            <div className="text-right">
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">{item.quantity} × €{parseFloat(item.price).toFixed(2)}</p>
                                                <p className="text-2xl font-bold text-dark tracking-tight">€ {(parseFloat(item.price) * item.quantity).toFixed(2)}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Trust Badges */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-10 border-t border-dark/5">
                            <div className="flex items-center gap-4 group">
                                <div className="w-12 h-12 rounded-2xl bg-white shadow-xl shadow-dark/5 border border-gray-50 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                    <FontAwesomeIcon icon={faShieldAlt} />
                                </div>
                                <div className="text-xs">
                                    <h4 className="font-bold text-dark uppercase tracking-widest mb-1">Encrypted</h4>
                                    <p className="text-gray-400 font-serif italic">100% Secure payments</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 group">
                                <div className="w-12 h-12 rounded-2xl bg-white shadow-xl shadow-dark/5 border border-gray-50 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                    <FontAwesomeIcon icon={faTruck} />
                                </div>
                                <div className="text-xs">
                                    <h4 className="font-bold text-dark uppercase tracking-widest mb-1">Delivered</h4>
                                    <p className="text-gray-400 font-serif italic">Global shipping available</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 group">
                                <div className="w-12 h-12 rounded-2xl bg-white shadow-xl shadow-dark/5 border border-gray-50 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                    <FontAwesomeIcon icon={faUndo} />
                                </div>
                                <div className="text-xs">
                                    <h4 className="font-bold text-dark uppercase tracking-widest mb-1">Refined</h4>
                                    <p className="text-gray-400 font-serif italic">30 day return policy</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Order Summary Checkout */}
                    <div className="xl:col-span-4">
                        <div className="sticky top-40 bg-dark text-white p-10 md:p-12 rounded-[2.5rem] shadow-2xl shadow-dark/30 overflow-hidden group">
                            {/* Abstract Design Elements */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none group-hover:bg-primary/20 transition-all duration-700" />
                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -ml-16 -mb-16 pointer-events-none" />

                            <h2 className="text-3xl font-serif mb-10 relative">Order Details <span className="text-primary">.</span></h2>

                            <div className="space-y-6 mb-12 relative border-b border-white/10 pb-10">
                                <div className="flex justify-between text-sm">
                                    <span className="text-white/40 font-serif italic">Subtotal</span>
                                    <span className="font-bold tracking-tight">€ {subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-white/40 font-serif italic">Estimated Shipping</span>
                                    <span className="text-primary font-bold uppercase text-[10px] tracking-widest">Calculated at next step</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-white/40 font-serif italic">Taxes</span>
                                    <span className="text-white/60 font-bold uppercase text-[10px] tracking-widest">Always Included</span>
                                </div>
                            </div>

                            <div className="flex justify-between items-end mb-12 relative">
                                <span className="text-lg font-serif">Total Due</span>
                                <div className="text-right">
                                    <span className="text-4xl font-bold text-primary tracking-tighter">€ {total.toFixed(2)}</span>
                                    <p className="text-[9px] text-white/30 uppercase tracking-[0.2em] font-bold mt-1">Free Delivery over €100</p>
                                </div>
                            </div>

                            <Link
                                to="/checkout"
                                className="w-full bg-white text-dark py-6 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-primary transition-all duration-500 shadow-xl flex items-center justify-center gap-4 relative group hover:scale-[1.02] active:scale-95"
                            >
                                Secure Checkout
                                <FontAwesomeIcon icon={faArrowRight} className="group-hover:translate-x-2 transition-transform" />
                            </Link>

                            <div className="mt-8 relative text-center">
                                <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest">Multiple Payment Options Available</p>
                                <div className="flex justify-center gap-4 mt-4 opacity-20 group-hover:opacity-40 transition-opacity">
                                    <div className="h-4 w-8 bg-white/50 rounded-sm" />
                                    <div className="h-4 w-8 bg-white/50 rounded-sm" />
                                    <div className="h-4 w-8 bg-white/50 rounded-sm" />
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default CartPage;
