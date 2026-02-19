import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faArrowLeft, faImage, faLink, faUpload, faPlus } from '@fortawesome/free-solid-svg-icons';
import { useTributeContext } from '../../context/TributeContext';
import { decodeHtml } from '../../utils/htmlUtils';
import { Editor } from '@tinymce/tinymce-react';
import MediaPickerModal from '../../components/admin/MediaPickerModal';
import { API_URL } from '../../config';

const EditPostAdmin = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { posts, addPost, updatePost, showToast } = useTributeContext();

    const [formData, setFormData] = useState({
        title: '',
        content: '',
        slug: '',
        status: 'published',
        featured_image: '',
        categories: [],
        tags: []
    });
    const [tagInput, setTagInput] = useState('');

    // Dynamic categories
    const [availableCategories, setAvailableCategories] = useState([]);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [showCategoryInput, setShowCategoryInput] = useState(false);

    const [loading, setLoading] = useState(false);
    const [mediaPicker, setMediaPicker] = useState({ isOpen: false, callback: null, type: 'image' });

    // Fetch categories on mount
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await fetch(`${API_URL}/api/categories`);
                if (res.ok) {
                    const data = await res.json();
                    setAvailableCategories(data);
                }
            } catch (err) {
                console.error("Failed to fetch categories", err);
            }
        };
        fetchCategories();
    }, []);

    useEffect(() => {
        if (id) {
            const post = posts.find(p => String(p.id) === String(id));
            if (post) {
                setFormData({
                    title: decodeHtml(post.title),
                    content: post.content || '',
                    slug: post.slug,
                    status: post.status,
                    featured_image: post.featured_image || '',
                    categories: post.categories || [],
                    tags: post.tags || []
                });
            }
        }
    }, [id, posts]);

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        if (id) {
            await updatePost(id, formData);
            showToast("Post updated successfully!", "success");
        } else {
            await addPost(formData);
            showToast("Post created successfully!", "success");
        }
        setLoading(false);
        navigate('/admin/posts');
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData({ ...formData, featured_image: reader.result });
            };
            reader.readAsDataURL(file);
        }
    };

    const generateSlug = () => {
        const slug = formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        setFormData({ ...formData, slug });
    };

    const handleCategoryToggle = (categoryName) => {
        const cats = formData.categories || [];
        if (cats.includes(categoryName)) {
            setFormData({ ...formData, categories: cats.filter(c => c !== categoryName) });
        } else {
            setFormData({ ...formData, categories: [...cats, categoryName] });
        }
    };

    const handleAddNewCategory = async () => {
        if (!newCategoryName.trim()) return;

        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            const res = await fetch(`${API_URL}/categories`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newCategoryName.trim() })
            });

            if (res.ok) {
                const newCat = await res.json();
                // Add to available list if not already there
                if (!availableCategories.some(c => c.name === newCat.name)) {
                    setAvailableCategories([...availableCategories, newCat]);
                }
                // Automatically select the new category
                handleCategoryToggle(newCat.name);
                setNewCategoryName('');
                showToast("Category added successfully!", "success");
            } else {
                showToast("Failed to add category.", "error");
            }
        } catch (err) {
            console.error("Failed to add category", err);
            showToast("Error connecting to server.", "error");
        }
    };

    const handleAddTag = () => {
        if (!tagInput.trim()) return;
        const tags = formData.tags || [];
        if (!tags.includes(tagInput.trim())) {
            setFormData({ ...formData, tags: [...tags, tagInput.trim()] });
        }
        setTagInput('');
    };

    const removeTag = (tag) => {
        setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-20">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link to="/admin/posts" className="w-10 h-10 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center text-gray-500 hover:text-primary transition-colors">
                        <FontAwesomeIcon icon={faArrowLeft} />
                    </Link>
                    <h2 className="text-2xl font-bold text-gray-800">{id ? 'Edit Post' : 'Add New Post'}</h2>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="bg-primary text-white px-6 py-2 rounded-md font-bold hover:bg-opacity-90 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        <FontAwesomeIcon icon={faSave} />
                        {loading ? 'Saving...' : 'Save Post'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Post Title</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                onBlur={!id ? generateSlug : undefined}
                                className="w-full text-xl font-bold border-b border-gray-200 py-2 outline-none focus:border-primary transition-colors"
                                placeholder="Enter post title"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Content</label>
                            <Editor
                                apiKey={import.meta.env.VITE_TINYMCE_KEY}
                                value={formData.content}
                                init={{
                                    height: 500,
                                    menubar: true,
                                    plugins: [
                                        'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                                        'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                                        'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount',
                                        'emoticons', 'directionality'
                                    ],
                                    toolbar: 'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | forecolor backcolor | link image media table | alignleft aligncenter alignright alignjustify | numlist bullist indent outdent | emoticons charmap | removeformat | help',
                                    content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
                                    branding: false,
                                    promotion: false,
                                    file_picker_callback: (callback, value, meta) => {
                                        setMediaPicker({
                                            isOpen: true,
                                            callback: callback,
                                            type: meta.filetype === 'media' ? 'video' : 'image'
                                        });
                                    }
                                }}
                                onEditorChange={(content) => setFormData(prev => ({ ...prev, content }))}
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 space-y-4">
                        <h3 className="font-bold text-gray-700 border-b border-gray-100 pb-2">Publish Settings</h3>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status</label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                className="w-full border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                            >
                                <option value="published">Published</option>
                                <option value="draft">Draft</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Permalink / Slug</label>
                            <div className="relative">
                                <FontAwesomeIcon icon={faLink} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                                <input
                                    type="text"
                                    value={formData.slug}
                                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                    className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded text-xs outline-none focus:ring-1 focus:ring-primary"
                                    placeholder="post-slug"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 space-y-4">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                            <h3 className="font-bold text-gray-700">Categories</h3>
                            <button
                                type="button"
                                onClick={() => setShowCategoryInput(!showCategoryInput)}
                                className="text-xs text-primary font-bold flex items-center gap-1 hover:underline"
                            >
                                <FontAwesomeIcon icon={faPlus} />
                                Add New
                            </button>
                        </div>

                        {showCategoryInput && (
                            <div className="flex gap-2 mb-3 bg-gray-50 p-2 rounded">
                                <input
                                    type="text"
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    className="flex-1 border border-category-200 rounded px-2 py-1 text-xs outline-none focus:border-primary"
                                    placeholder="New Category Name"
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    onClick={(e) => { e.preventDefault(); handleAddNewCategory(); }}
                                    className="bg-primary text-white text-xs px-2 py-1 rounded font-bold"
                                >
                                    Add
                                </button>
                            </div>
                        )}

                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {availableCategories.length > 0 ? (
                                availableCategories.map(cat => (
                                    <label key={cat.id} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer hover:text-dark">
                                        <input
                                            type="checkbox"
                                            checked={(formData.categories || []).includes(cat.name)}
                                            onChange={() => handleCategoryToggle(cat.name)}
                                            className="rounded text-primary focus:ring-primary"
                                        />
                                        {cat.name}
                                    </label>
                                ))
                            ) : (
                                <p className="text-gray-400 text-xs italic">No categories found.</p>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 space-y-4">
                        <h3 className="font-bold text-gray-700 border-b border-gray-100 pb-2">Tags</h3>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                                className="w-full border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                                placeholder="Add tag..."
                            />
                            <button
                                onClick={(e) => { e.preventDefault(); handleAddTag(); }}
                                className="bg-gray-100 text-gray-600 px-3 py-2 rounded text-sm hover:bg-gray-200 font-bold"
                            >
                                Add
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {(formData.tags || []).map(tag => (
                                <span key={tag} className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs flex items-center gap-1 group">
                                    {tag}
                                    <button onClick={() => removeTag(tag)} className="text-gray-400 hover:text-red-500">
                                        &times;
                                    </button>
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 space-y-4">
                        <h3 className="font-bold text-gray-700 border-b border-gray-100 pb-2">Featured Image</h3>

                        <div
                            className="border-2 border-dashed border-gray-200 rounded-lg p-4 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                            onClick={() => document.getElementById('featured-image-upload').click()}
                        >
                            {formData.featured_image ? (
                                <img src={formData.featured_image} alt="Featured" className="w-full h-32 object-cover rounded mb-2" />
                            ) : (
                                <div className="text-gray-400 text-center py-4">
                                    <FontAwesomeIcon icon={faImage} size="2x" className="mb-2" />
                                    <p className="text-xs">Click to upload image</p>
                                </div>
                            )}
                            <input
                                type="file"
                                id="featured-image-upload"
                                className="hidden"
                                accept="image/*"
                                onChange={handleImageUpload}
                            />
                            <button type="button" className="text-xs font-bold text-primary flex items-center gap-1 mt-2">
                                <FontAwesomeIcon icon={faUpload} />
                                {formData.featured_image ? 'Change Image' : 'Select Image'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <MediaPickerModal
                isOpen={mediaPicker.isOpen}
                type={mediaPicker.type}
                onClose={() => setMediaPicker({ ...mediaPicker, isOpen: false })}
                onSelect={(m) => {
                    mediaPicker.callback(m.url, { title: m.name });
                    setMediaPicker({ ...mediaPicker, isOpen: false });
                }}
            />
        </div>
    );
};

export default EditPostAdmin;
