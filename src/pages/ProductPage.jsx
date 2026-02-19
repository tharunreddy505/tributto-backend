import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTributeContext } from '../context/TributeContext';
import Navbar from '../components/layout/Navbar';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShoppingBag, faArrowLeft, faMinus, faPlus } from '@fortawesome/free-solid-svg-icons';

const ProductPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { products, isInitialized, settings, addToCart } = useTributeContext();
    const [product, setProduct] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (isInitialized) {
            const found = products.find(p => String(p.id) === id || p.slug === id);
            if (found) setProduct(found);
        }
    }, [id, products, isInitialized]);

    if (!isInitialized || !product) {
        return (
            <div className="min-h-screen bg-[#FAF9F6]">
                <Navbar />
                <div className="flex items-center justify-center h-[60vh]">
                    <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
            </div>
        );
    }

    const isVoucher = product.is_voucher;

    const handleAddToCart = () => {
        addToCart(product, quantity, isVoucher ? { message } : {});
        navigate('/cart');
    };

    return (
        <div className="min-h-screen bg-[#F5F5F7] text-[#333] selection:bg-primary/20">
            <Navbar />

            <div className="container mx-auto px-4 md:px-8 py-24 md:py-32 mt-[72px]">
                {/* Product Detail Card */}
                <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-sm overflow-hidden flex flex-col md:flex-row items-stretch">

                    {/* Left: Product Image */}
                    <div className="md:w-1/2 p-4 md:p-8 flex items-center justify-center bg-gray-50/50">
                        <div className={`w-full h-full rounded-lg overflow-hidden ${isVoucher ? 'aspect-square shadow-lg' : 'aspect-[4/5]'}`}>
                            <img
                                src={product.image_url || "https://images.unsplash.com/photo-1549490349-8643362247b5?q=80&w=2574&auto=format&fit=crop"}
                                alt={product.name}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    </div>

                    {/* Right: Product Info */}
                    <div className="md:w-1/2 p-8 md:p-12 space-y-6 flex flex-col">
                        <div className="space-y-2">
                            <h1 className="text-2xl md:text-3xl font-serif text-[#445566] tracking-tight">{product.name}</h1>
                            <div className="text-xl md:text-2xl text-[#333] font-sans">
                                € {parseFloat(product.price).toFixed(2)}
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex items-center border border-gray-200 rounded overflow-hidden h-12">
                                <input
                                    type="number"
                                    value={quantity}
                                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                    className="w-12 text-center font-bold text-dark outline-none h-full"
                                />
                            </div>

                            <button
                                onClick={handleAddToCart}
                                className="flex-1 bg-[#C68533] text-white py-3 px-6 rounded font-bold text-xs uppercase tracking-widest hover:bg-[#B57422] transition-colors flex items-center justify-center gap-2 h-12"
                            >
                                <FontAwesomeIcon icon={faShoppingBag} className="text-sm" />
                                Add to Cart
                            </button>
                        </div>

                        {isVoucher && (
                            <div className="space-y-4 pt-4">
                                <h3 className="text-lg font-sans text-[#333]">Recipient message (optional)</h3>
                                <div className="relative">
                                    <textarea
                                        className="w-full p-4 border border-gray-300 rounded outline-none focus:border-[#C68533] transition-all min-h-[120px] text-sm resize-none"
                                        placeholder=""
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                    />
                                    <p className="text-[11px] text-gray-500 mt-1">
                                        This Text will be displayed in the voucher
                                    </p>
                                </div>
                            </div>
                        )}

                        {isVoucher && (
                            <div className="mt-auto pt-8 flex justify-start">
                                <div className="border border-gray-200 px-4 py-2 rounded text-[11px] font-bold text-gray-400">
                                    Tributoo
                                </div>
                            </div>
                        )}

                        {!isVoucher && (
                            <div className="prose prose-slate max-w-none text-gray-600 text-sm italic" dangerouslySetInnerHTML={{ __html: product.description }} />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductPage;
