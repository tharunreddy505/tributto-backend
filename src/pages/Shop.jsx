import React, { useState } from 'react';
import Navbar from '../components/layout/Navbar';
import { useTributeContext } from '../context/TributeContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShoppingBag, faSearch, faFilter, faTimes } from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';

const Shop = () => {
    const { products, isInitialized } = useTributeContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');

    const categories = ['All', ...new Set(products.map(p => p.category).filter(Boolean))];

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = activeCategory === 'All' || p.category === activeCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="min-h-screen bg-[#FAF9F6] selection:bg-primary/30 text-dark">
            <Navbar />

            {/* Hero Header */}
            <div className="bg-[#111111] py-24 text-center mt-[72px] relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    {[...Array(20)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute rounded-full border border-white"
                            style={{
                                width: Math.random() * 300 + 'px',
                                height: Math.random() * 300 + 'px',
                                left: Math.random() * 100 + '%',
                                top: Math.random() * 100 + '%',
                            }}
                        />
                    ))}
                </div>
                <div className="container mx-auto px-6 relative z-10">
                    <h1 className="text-5xl md:text-6xl font-serif text-white mb-6">Our Shop</h1>
                    <p className="text-white/60 max-w-xl mx-auto font-serif italic text-lg leading-relaxed">
                        Thoughtful tokens of remembrance to honor and celebrate the lives of your loved ones.
                    </p>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="container mx-auto px-6 -mt-8 relative z-20">
                <div className="bg-white p-4 md:p-6 rounded-2xl shadow-xl shadow-dark/5 border border-gray-100 flex flex-col md:flex-row gap-6 items-center">
                    <div className="relative flex-1 w-full">
                        <FontAwesomeIcon icon={faSearch} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" />
                        <input
                            type="text"
                            placeholder="What are you looking for?"
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:bg-white focus:border-primary transition-all text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-2 flex-wrap justify-center overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${activeCategory === cat
                                    ? 'bg-primary text-dark shadow-lg shadow-primary/20 scale-105'
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Products Grid */}
            <main className="container mx-auto px-6 py-16">
                {!isInitialized ? (
                    <div className="flex flex-col items-center justify-center py-20 grayscale opacity-40">
                        <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                        <p className="font-serif italic">Curating collection...</p>
                    </div>
                ) : filteredProducts.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
                        {filteredProducts.map(product => (
                            <Link to={`/product/${product.slug || product.id}`} key={product.id} className="group cursor-pointer">
                                <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-white shadow-sm border border-gray-100 relative mb-6 transition-all duration-500 group-hover:-translate-y-2 group-hover:shadow-2xl">
                                    <img
                                        src={product.image_url || "https://images.unsplash.com/photo-1549490349-8643362247b5?q=80&w=2574&auto=format&fit=crop"}
                                        alt={product.name}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 grayscale group-hover:grayscale-0"
                                    />

                                    {/* Quick Actions Overlay */}
                                    <div className="absolute inset-x-4 bottom-4 translate-y-8 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                                        <div className="w-full bg-white text-dark py-4 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-primary transition-colors flex items-center justify-center gap-2">
                                            <FontAwesomeIcon icon={faShoppingBag} />
                                            View Details
                                        </div>
                                    </div>

                                    {/* Category & Type Tags */}
                                    <div className="absolute top-4 left-4 flex flex-col gap-2">
                                        {product.category && (
                                            <span className="bg-[#111111]/80 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-white/10 w-fit">
                                                {product.category}
                                            </span>
                                        )}
                                        {product.is_downloadable && (
                                            <span className="bg-primary text-dark px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest w-fit shadow-lg shadow-primary/20">
                                                Digital
                                            </span>
                                        )}
                                        {product.is_virtual && !product.is_downloadable && (
                                            <span className="bg-white text-dark px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest w-fit border border-gray-100 italic">
                                                Virtual
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="text-center">
                                    <h3 className="text-xl font-serif text-dark mb-2 group-hover:text-primary transition-colors">{product.name}</h3>
                                    <div className="flex items-center justify-center gap-4">
                                        <span className="text-secondary font-bold tracking-widest">€{parseFloat(product.price).toFixed(2)}</span>
                                        {product.stock_type === 'limited' && (
                                            <>
                                                {product.stock <= 5 && product.stock > 0 && (
                                                    <span className="text-[10px] text-red-500 font-bold uppercase">Only {product.stock} left</span>
                                                )}
                                                {product.stock === 0 && (
                                                    <span className="text-[10px] text-gray-400 font-bold uppercase italic">Back soon</span>
                                                )}
                                            </>
                                        )}
                                        {product.stock_type === 'unlimited' && (
                                            <span className="text-[10px] text-green-600/50 font-bold uppercase tracking-tighter">In Stock</span>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-32 border-2 border-dashed border-gray-100 rounded-3xl bg-white/50">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-200">
                            <FontAwesomeIcon icon={faShoppingBag} size="2x" />
                        </div>
                        <h2 className="text-2xl font-serif text-gray-400 mb-2 italic">Nothing matches your search</h2>
                        <button
                            onClick={() => { setSearchTerm(''); setActiveCategory('All'); }}
                            className="text-primary font-bold text-xs uppercase tracking-widest border-b border-primary/20 pb-1 hover:border-primary transition-all"
                        >
                            Reset filters
                        </button>
                    </div>
                )}
            </main>

            {/* Newsletter / CTA Section */}
            <section className="bg-dark py-32 mt-20 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <div className="container mx-auto px-6 text-center max-w-2xl relative z-10">
                    <h2 className="text-4xl font-serif text-white mb-8">Personalized Remembrances</h2>
                    <p className="text-white/40 mb-12 font-serif italic text-lg italic">
                        Can't find exactly what you're looking for? We offer bespoke items tailored to your specific wishes.
                    </p>
                    <button className="px-12 py-4 border border-primary/30 text-primary rounded-full font-bold text-xs uppercase tracking-widest hover:bg-primary hover:text-dark transition-all duration-500">
                        Contact Support
                    </button>
                </div>
            </section>
        </div>
    );
};

export default Shop;
