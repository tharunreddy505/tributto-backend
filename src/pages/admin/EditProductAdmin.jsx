import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTributeContext } from '../../context/TributeContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faArrowLeft, faImage, faTrash } from '@fortawesome/free-solid-svg-icons';
import { Editor } from '@tinymce/tinymce-react';

const EditProductAdmin = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { products, addProduct, updateProduct, showToast, isInitialized } = useTributeContext();
    const [loading, setLoading] = useState(false);

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
        is_voucher: false
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
                    is_voucher: product.is_voucher || false
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

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                setFormData(prev => ({ ...prev, image_url: reader.result }));
            };
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (id) {
                await updateProduct(id, formData);
                showToast("Product updated successfully!", "success");
            } else {
                await addProduct(formData);
                showToast("Product created successfully!", "success");
            }
            navigate('/admin/products');
        } catch (error) {
            console.error(error);
            showToast("Failed to save product.", "error");
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
