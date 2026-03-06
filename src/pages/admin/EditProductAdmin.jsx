import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTributeContext } from '../../context/TributeContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faArrowLeft, faImage, faTrash, faXmark } from '@fortawesome/free-solid-svg-icons';
import { Editor } from '@tinymce/tinymce-react';

import { compressImage } from '../../utils/imageOptimizer';

const EditProductAdmin = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { products, addProduct, updateProduct, showToast, isInitialized } = useTributeContext();
    const [loading, setLoading] = useState(false);
    const [productSearch, setProductSearch] = useState('');
    const [showProductResults, setShowProductResults] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        description: '',
        price: '',
        stock: '0',
        stock_type: 'limited',
        category: '',
        image_url: null,
        is_virtual: false,
        is_downloadable: false,
        download_url: '',
        is_voucher: false,
        is_lifetime: false,
        is_simple: false,
        voucher_expiration: 'never',
        own_expiration_time: '30',
        allow_free_shipping: false,
        voucher_products: [],
        voucher_categories: []
    });

    const [previews, setPreviews] = useState({
        image: null
    });

    useEffect(() => {
        if (id && isInitialized) {
            const product = products.find(p => String(p.id) === id);
            if (product) {
                setFormData({
                    name: product.name,
                    slug: product.slug,
                    description: product.description || '',
                    price: product.price,
                    stock: product.stock.toString(),
                    stock_type: product.stock_type || 'limited',
                    category: product.category || '',
                    image_url: product.image_url,
                    is_virtual: product.is_virtual || false,
                    is_downloadable: product.is_downloadable || false,
                    download_url: product.download_url || '',
                    is_voucher: product.is_voucher || false,
                    is_lifetime: product.is_lifetime || false,
                    is_simple: product.is_simple || false,
                    voucher_expiration: product.voucher_expiration || 'never',
                    own_expiration_time: product.own_expiration_time || '30',
                    allow_free_shipping: product.allow_free_shipping || false,
                    voucher_products: Array.isArray(product.voucher_products) ? product.voucher_products : (product.voucher_products ? JSON.parse(product.voucher_products) : []),
                    voucher_categories: Array.isArray(product.voucher_categories) ? product.voucher_categories : (product.voucher_categories ? JSON.parse(product.voucher_categories) : [])
                });
            }
        }
    }, [id, products, isInitialized]);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => {
            const updates = { ...prev, [name]: type === 'checkbox' ? checked : value };
            if (name === 'name' && !id) {
                updates.slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            }
            return updates;
        });
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData(prev => ({ ...prev, image_url: file }));
            if (previews.image && previews.image.startsWith('blob:')) URL.revokeObjectURL(previews.image);
            setPreviews({ image: URL.createObjectURL(file) });
            // Revoke previous object URL if it exists
            if (previews.image && previews.image.startsWith('blob:')) {
                URL.revokeObjectURL(previews.image);
            }
            setFormData(prev => ({ ...prev, image_url: file })); // Store the File object
            setPreviews({ image: URL.createObjectURL(file) }); // Create object URL for preview
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        // Prep data & compress image if new
        let imagePayload = formData.image_url;
        if (formData.image_url instanceof File) {
            imagePayload = await compressImage(formData.image_url, { maxWidth: 1200, quality: 0.8 });
        }

        const payload = {
            ...formData,
            image_url: imagePayload
        };

        try {
            if (id) {
                await updateProduct(id, payload);
                showToast("Product updated successfully!", "success");
            } else {
                await addProduct(payload);
                showToast("Product created successfully!", "success");
            }
            navigate('/admin/products');
        } catch (err) {
            showToast("Failed to save product", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl mx-auto">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <Link to="/admin/products" className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-gray-100 text-gray-400 hover:text-primary transition-all">
                        <FontAwesomeIcon icon={faArrowLeft} />
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-800">{id ? 'Edit Product' : 'Create New Product'}</h1>
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="bg-primary text-white px-8 py-2.5 rounded-lg font-bold shadow-md hover:bg-opacity-90 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                    <FontAwesomeIcon icon={faSave} />
                    {loading ? 'Saving...' : 'Save Product'}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Product Name</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                required
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:border-primary transition-all"
                                placeholder="e.g. Memory Candle"
                            />
                        </div>

                        <div className="flex items-center gap-6 pt-2">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    name="is_virtual"
                                    checked={formData.is_virtual}
                                    onChange={handleInputChange}
                                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <span className="text-sm font-medium text-gray-700 group-hover:text-primary transition-colors">Virtual</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    name="is_downloadable"
                                    checked={formData.is_downloadable}
                                    onChange={handleInputChange}
                                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <span className="text-sm font-medium text-gray-700 group-hover:text-primary transition-colors">Downloadable</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    name="is_voucher"
                                    checked={formData.is_voucher}
                                    onChange={handleInputChange}
                                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <span className="text-sm font-medium text-gray-700 group-hover:text-primary transition-colors">Gift Voucher</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    name="is_lifetime"
                                    checked={formData.is_lifetime}
                                    onChange={handleInputChange}
                                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <span className="text-sm font-medium text-gray-700 group-hover:text-primary transition-colors">Lifetime Subscription</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    name="is_simple"
                                    checked={formData.is_simple}
                                    onChange={handleInputChange}
                                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <span className="text-sm font-medium text-gray-700 group-hover:text-primary transition-colors">Simple Product</span>
                            </label>
                        </div>

                        {formData.is_downloadable && (
                            <div className="pt-4 border-t border-gray-100">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Download URL / File Link</label>
                                <input
                                    type="text"
                                    name="download_url"
                                    value={formData.download_url}
                                    onChange={handleInputChange}
                                    placeholder="https://example.com/file.pdf"
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:border-primary transition-all font-mono text-xs"
                                />
                                <p className="text-[10px] text-gray-400 mt-1 italic">Enter the link the customer receives after purchase.</p>
                            </div>
                        )}

                        {formData.is_voucher && (
                            <div className="pt-6 border-t border-gray-100 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                                        Voucher Configuration
                                    </h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Expiration time</label>
                                        <select
                                            name="voucher_expiration"
                                            value={formData.voucher_expiration}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:border-primary transition-all bg-white"
                                        >
                                            <option value="never">never</option>
                                            <option value="7">7 days</option>
                                            <option value="14">14 days</option>
                                            <option value="30">30 days</option>
                                            <option value="60">60 days</option>
                                            <option value="90">90 days</option>
                                            <option value="365">365 days</option>
                                            <option value="custom">Set your own date</option>
                                        </select>
                                    </div>

                                    <div className="flex items-end pb-2">
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                name="allow_free_shipping"
                                                checked={formData.allow_free_shipping}
                                                onChange={handleInputChange}
                                                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                                            />
                                            <span className="text-sm font-medium text-gray-700 group-hover:text-primary transition-colors">Allow free shipping</span>
                                        </label>
                                    </div>
                                </div>

                                {formData.voucher_expiration === 'custom' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-1 duration-200">
                                        <div className="relative">
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Own expiration time</label>
                                            <input
                                                type="number"
                                                name="own_expiration_time"
                                                value={formData.own_expiration_time}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:border-primary transition-all bg-white"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Products</label>
                                        <div className="relative">
                                            <div className="min-h-[42px] p-1.5 flex flex-wrap gap-2 rounded-lg border border-gray-200 bg-white focus-within:border-primary transition-all cursor-text" onClick={() => document.getElementById('product-search-input').focus()}>
                                                {formData.voucher_products.map(productId => {
                                                    const product = products.find(p => String(p.id) === String(productId));
                                                    if (!product) return null;
                                                    return (
                                                        <span key={productId} className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-gray-300 bg-gray-100 text-[11px] font-medium text-gray-700 leading-none">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setFormData(prev => ({
                                                                        ...prev,
                                                                        voucher_products: prev.voucher_products.filter(id => String(id) !== String(productId))
                                                                    }));
                                                                }}
                                                                className="hover:text-red-500 transition-colors"
                                                            >
                                                                <FontAwesomeIcon icon={faXmark} />
                                                            </button>
                                                            {product.name} (#{product.id})
                                                        </span>
                                                    );
                                                })}
                                                <input
                                                    id="product-search-input"
                                                    type="text"
                                                    value={productSearch}
                                                    onChange={(e) => {
                                                        setProductSearch(e.target.value);
                                                        setShowProductResults(true);
                                                    }}
                                                    onFocus={() => setShowProductResults(true)}
                                                    placeholder={formData.voucher_products.length === 0 ? "Search for products..." : ""}
                                                    className="flex-1 min-w-[80px] bg-transparent outline-none border-none p-1 text-sm text-gray-700"
                                                />
                                            </div>

                                            {showProductResults && (productSearch || true) && (
                                                <>
                                                    <div className="fixed inset-0 z-10" onClick={() => setShowProductResults(false)}></div>
                                                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto overflow-x-hidden">
                                                        {products
                                                            .filter(p =>
                                                                !p.is_voucher &&
                                                                String(p.id) !== String(id) &&
                                                                !formData.voucher_products.includes(String(p.id)) &&
                                                                (p.name.toLowerCase().includes(productSearch.toLowerCase()) || String(p.id).includes(productSearch))
                                                            )
                                                            .map(p => (
                                                                <button
                                                                    key={p.id}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setFormData(prev => ({
                                                                            ...prev,
                                                                            voucher_products: [...prev.voucher_products, String(p.id)]
                                                                        }));
                                                                        setProductSearch('');
                                                                        setShowProductResults(false);
                                                                    }}
                                                                    className="w-full text-left px-4 py-3 hover:bg-primary hover:text-white transition-colors flex items-center justify-between group"
                                                                >
                                                                    <span className="font-medium text-sm">{p.name} (#{p.id})</span>
                                                                </button>
                                                            ))}
                                                        {products.filter(p => !p.is_voucher && String(p.id) !== String(id) && !formData.voucher_products.includes(String(p.id)) && (p.name.toLowerCase().includes(productSearch.toLowerCase()) || String(p.id).includes(productSearch))).length === 0 && (
                                                            <div className="px-4 py-3 text-sm text-gray-500 italic">No products found</div>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Product categories</label>
                                        <input
                                            type="text"
                                            name="voucher_categories"
                                            value={Array.isArray(formData.voucher_categories) ? formData.voucher_categories.join(', ') : formData.voucher_categories}
                                            onChange={(e) => {
                                                const values = e.target.value.split(',').map(v => v.trim()).filter(v => v !== '');
                                                setFormData(prev => ({ ...prev, voucher_categories: values }));
                                            }}
                                            placeholder="Gifts, Flowers (comma separated)"
                                            className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:border-primary transition-all"
                                        />
                                        <p className="text-[10px] text-gray-400 mt-2 italic">Specific categories this voucher applies to.</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">URL Slug</label>
                            <input
                                type="text"
                                name="slug"
                                value={formData.slug}
                                onChange={handleInputChange}
                                required
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:border-primary transition-all text-xs text-gray-400 font-mono bg-gray-50"
                                placeholder="product-slug"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Description</label>
                            <Editor
                                apiKey={import.meta.env.VITE_TINYMCE_KEY}
                                value={formData.description}
                                init={{
                                    height: 300,
                                    menubar: false,
                                    plugins: ['link', 'lists', 'table', 'wordcount'],
                                    toolbar: 'undo redo | formatselect | bold italic | alignleft aligncenter alignright | bullist numlist outdent indent | link'
                                }}
                                onEditorChange={(content) => setFormData(prev => ({ ...prev, description: content }))}
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
                        <h3 className="font-bold text-sm text-gray-800 border-b border-gray-50 pb-2 uppercase tracking-wider">Pricing & Inventory</h3>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Price (€)</label>
                            <input
                                type="number"
                                step="0.01"
                                name="price"
                                value={formData.price}
                                onChange={handleInputChange}
                                required
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:border-primary transition-all"
                                placeholder="0.00"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Inventory Management</label>
                            <select
                                name="stock_type"
                                value={formData.stock_type}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:border-primary transition-all mb-4"
                            >
                                <option value="limited">Limited (Track Stock)</option>
                                <option value="unlimited">Unlimited Stock</option>
                            </select>

                            {formData.stock_type === 'limited' && (
                                <div className="animate-in fade-in duration-300">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Stock Level</label>
                                    <input
                                        type="number"
                                        name="stock"
                                        value={formData.stock}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:border-primary transition-all"
                                    />
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Category</label>
                            <input
                                type="text"
                                name="category"
                                value={formData.category}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:border-primary transition-all"
                                placeholder="e.g. Gifts, Flowers"
                            />
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
                        <h3 className="font-bold text-sm text-gray-800 border-b border-gray-50 pb-2 uppercase tracking-wider">Product Image</h3>
                        <div
                            className="aspect-square rounded-lg border-2 border-dashed border-gray-100 bg-gray-50 flex items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all overflow-hidden relative group"
                            onClick={() => document.getElementById('product-image').click()}
                        >
                            {formData.image_url ? (
                                <>
                                    <img src={formData.image_url} alt="Product" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-bold">
                                        Change Image
                                    </div>
                                </>
                            ) : (
                                <div className="text-center">
                                    <FontAwesomeIcon icon={faImage} className="text-gray-300 text-3xl mb-2" />
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Click to upload</p>
                                </div>
                            )}
                        </div>
                        <input type="file" id="product-image" className="hidden" accept="image/*" onChange={handleImageUpload} />
                        {formData.image_url && (
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, image_url: null }))}
                                className="w-full py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded transition-colors flex items-center justify-center gap-2"
                            >
                                <FontAwesomeIcon icon={faTrash} />
                                Remove Image
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </form>
    );
};

export default EditProductAdmin;
