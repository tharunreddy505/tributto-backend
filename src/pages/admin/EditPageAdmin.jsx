import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faArrowLeft, faEye, faLink } from '@fortawesome/free-solid-svg-icons';
import { useTributeContext } from '../../context/TributeContext';
import { decodeHtml } from '../../utils/htmlUtils';
import { Editor } from '@tinymce/tinymce-react';
import VisualBuilder from '../../components/admin/VisualBuilder';
import MediaPickerModal from '../../components/admin/MediaPickerModal';

const EditPageAdmin = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { pages, addPage, updatePage, showToast } = useTributeContext();

    const [formData, setFormData] = useState({
        title: '',
        content: '',
        slug: '',
        status: 'published'
    });
    const [loading, setLoading] = useState(false);
    const [isBuilderOpen, setIsBuilderOpen] = useState(false);
    const [mediaPicker, setMediaPicker] = useState({ isOpen: false, callback: null, type: 'image' });

    useEffect(() => {
        if (id) {
            const page = pages.find(p => String(p.id) === String(id));
            if (page) {
                setFormData({
                    title: decodeHtml(page.title),
                    content: page.content || '',
                    slug: page.slug,
                    status: page.status
                });
            }
        }
    }, [id, pages]);

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        if (id) {
            await updatePage(id, formData);
            showToast("Page updated successfully!", "success");
        } else {
            await addPage(formData);
            showToast("Page created successfully!", "success");
        }
        setLoading(false);
        navigate('/admin/pages');
    };

    const handleBuilderSave = (content) => {
        setFormData({ ...formData, content });
        setIsBuilderOpen(false);
    };

    const generateSlug = () => {
        const slug = formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        setFormData({ ...formData, slug });
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-20">
            {isBuilderOpen && (
                <VisualBuilder
                    initialHtml={formData.content}
                    onSave={handleBuilderSave}
                    onClose={() => setIsBuilderOpen(false)}
                />
            )}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link to="/admin/pages" className="w-10 h-10 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center text-gray-500 hover:text-primary transition-colors">
                        <FontAwesomeIcon icon={faArrowLeft} />
                    </Link>
                    <h2 className="text-2xl font-bold text-gray-800">{id ? 'Edit Page' : 'Add New Page'}</h2>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="bg-primary text-white px-6 py-2 rounded-md font-bold hover:bg-opacity-90 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        <FontAwesomeIcon icon={faSave} />
                        {loading ? 'Saving...' : 'Save Page'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Page Title</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                onBlur={!id ? generateSlug : undefined}
                                className="w-full text-xl font-bold border-b border-gray-200 py-2 outline-none focus:border-primary transition-colors"
                                placeholder="Enter title here"
                                required
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-xs font-bold text-gray-500 uppercase">Content</label>
                                <button
                                    type="button"
                                    onClick={() => setIsBuilderOpen(true)}
                                    className="text-xs bg-[#D4AF37]/10 text-[#D4AF37] px-3 py-1 rounded-full font-bold hover:bg-[#D4AF37] hover:text-white transition-all border border-[#D4AF37]/30"
                                >
                                    {formData.content.includes('<style>') ? 'Re-open Visual Builder' : 'Launch Visual Builder (Elementor Mode)'}
                                </button>
                            </div>

                            {formData.content.includes('<style>') ? (
                                <div className="relative group">
                                    <div className="absolute inset-0 bg-gray-50/50 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <p className="text-gray-500 font-medium mb-4">This page uses Visual Builder layout.</p>
                                        <button
                                            type="button"
                                            onClick={() => setIsBuilderOpen(true)}
                                            className="bg-[#D4AF37] text-white px-6 py-2 rounded-full font-bold shadow-lg hover:scale-105 transition-transform"
                                        >
                                            Edit with Visual Builder
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (window.confirm('Switching to Manual Editor might break your Visual Builder layout. Continue?')) {
                                                    setFormData({ ...formData, content: formData.content.replace(/<style>.*?<\/style>/s, '') });
                                                }
                                            }}
                                            className="mt-4 text-xs text-red-400 hover:underline"
                                        >
                                            Reset to simple text
                                        </button>
                                    </div>
                                    <div className="opacity-50 pointer-events-none">
                                        <Editor
                                            apiKey={import.meta.env.VITE_TINYMCE_KEY}
                                            value={formData.content}
                                            disabled={true}
                                            init={{
                                                height: 400,
                                                menubar: false,
                                                toolbar: false,
                                                readonly: true,
                                                branding: false,
                                                content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px; } .row { display: flex; } .cell { flex: 1; }'
                                            }}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <Editor
                                    apiKey={import.meta.env.VITE_TINYMCE_KEY}
                                    value={formData.content}
                                    init={{
                                        height: 500,
                                        menubar: true,
                                        extended_valid_elements: 'style[*],div[*],span[*],section[*],header[*],footer[*],nav[*]',
                                        valid_children: '+body[style]',
                                        plugins: [
                                            'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                                            'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                                            'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount',
                                            'emoticons', 'directionality'
                                        ],
                                        toolbar: 'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | forecolor backcolor | link image media table | alignleft aligncenter alignright alignjustify | numlist bullist indent outdent | emoticons charmap | removeformat | help',
                                        content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px; } .row { display: flex; gap: 20px; padding: 10px; } .cell { flex: 1; min-height: 50px; }',
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
                            )}
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
                                    placeholder="page-slug"
                                />
                            </div>
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

export default EditPageAdmin;
