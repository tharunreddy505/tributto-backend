import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import localforage from 'localforage';
import { API_URL as BASE_API_URL } from '../config';

const TributeContext = createContext();

export const useTributeContext = () => {
    return useContext(TributeContext);
};

export const TributeProvider = ({ children }) => {
    const API_URL = `${BASE_API_URL}/api`;
    const [tributes, setTributes] = useState([]);
    const [pages, setPages] = useState([]);
    const [posts, setPosts] = useState([]);
    const [products, setProducts] = useState([]);
    const [toast, setToast] = useState(null);
    const [settings, setSettings] = useState({
        logo: localStorage.getItem('site_logo') || null,
        site_title: localStorage.getItem('site_title') || 'Online memorial page - tributoo.com',
        site_favicon: localStorage.getItem('site_favicon') || null
    });
    const [media, setMedia] = useState([]);
    const [primaryMenu, setPrimaryMenu] = useState(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [cart, setCart] = useState(() => {
        const savedCart = localStorage.getItem('tributoo_cart');
        return savedCart ? JSON.parse(savedCart) : [];
    });

    useEffect(() => {
        localStorage.setItem('tributoo_cart', JSON.stringify(cart));
    }, [cart]);

    const getAuthHeaders = () => {
        const token = localStorage.getItem('token');
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    };

    const fetchPages = async () => {
        try {
            const res = await fetch(`${API_URL}/pages`);
            const data = await res.json();
            setPages(data);
            return data;
        } catch (e) { console.error("Fetch Pages Error:", e); }
    };

    const fetchPosts = async () => {
        try {
            const res = await fetch(`${API_URL}/posts`);
            const data = await res.json();
            setPosts(data);
            return data;
        } catch (e) { console.error("Fetch Posts Error:", e); }
    };

    const fetchTributes = async () => {
        try {
            const res = await fetch(`${API_URL}/tributes`, { cache: 'no-store' });
            if (!res.ok) throw new Error("Failed to fetch tributes");
            const data = await res.json();
            setTributes(data);
            return data;
        } catch (error) {
            console.error("API Fetch Error:", error);
            throw error;
        }
    };

    const fetchSettings = async () => {
        try {
            const res = await fetch(`${API_URL}/settings`);
            if (!res.ok) throw new Error("Failed to fetch settings");
            const data = await res.json();
            if (data.logo) localStorage.setItem('site_logo', data.logo);
            if (data.site_title) localStorage.setItem('site_title', data.site_title);
            if (data.site_favicon) localStorage.setItem('site_favicon', data.site_favicon);
            setSettings(prev => ({ ...prev, ...data }));
        } catch (error) {
            console.error("Fetch Settings Error:", error);
        }
    };

    const fetchComments = async () => {
        try {
            const res = await fetch(`${API_URL}/comments`);
            if (!res.ok) throw new Error("Failed to fetch comments");
            return await res.json();
        } catch (error) {
            console.error("Fetch Comments Error:", error);
            return [];
        }
    };

    const fetchMedia = async () => {
        try {
            const res = await fetch(`${API_URL}/media`, {
                headers: getAuthHeaders()
            });
            if (!res.ok) throw new Error("Failed to fetch media");
            const data = await res.json();
            setMedia(data);
            return data;
        } catch (error) {
            console.error("Fetch Media Error:", error);
            return [];
        }
    };

    const uploadGlobalMedia = async (type, url, userId) => {
        try {
            const res = await fetch(`${API_URL}/media`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                body: JSON.stringify({ type, url, userId })
            });
            if (!res.ok) throw new Error("Upload failed");
            const data = await res.json();
            setMedia(prev => [data, ...prev]);
            return data;
        } catch (e) { console.error("Upload Global Media Error:", e); }
    };

    const removeMedia = async (id) => {
        try {
            const res = await fetch(`${API_URL}/media/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            if (!res.ok) throw new Error("Delete failed");
            setMedia(prev => prev.filter(m => m.id !== id));
            return true;
        } catch (e) { console.error("Remove Media Error:", e); return false; }
    };

    const fetchProducts = async () => {
        try {
            const res = await fetch(`${API_URL}/products`);
            const data = await res.json();
            setProducts(data);
            return data;
        } catch (e) { console.error("Fetch Products Error:", e); }
    };

    const addProduct = async (productData) => {
        try {
            const res = await fetch(`${API_URL}/products`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                body: JSON.stringify(productData)
            });
            const data = await res.json();
            await fetchProducts();
            return data;
        } catch (e) { console.error("Add Product Error:", e); }
    };

    const updateProduct = async (id, productData) => {
        try {
            const res = await fetch(`${API_URL}/products/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                body: JSON.stringify(productData)
            });
            const data = await res.json();
            await fetchProducts();
            return data;
        } catch (e) { console.error("Update Product Error:", e); }
    };

    const deleteProduct = async (id) => {
        try {
            await fetch(`${API_URL}/products/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            await fetchProducts();
            return true;
        } catch (e) { console.error("Delete Product Error:", e); return false; }
    };

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
    };

    const updateSettings = async (newSettings) => {
        try {
            const res = await fetch(`${API_URL}/settings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify(newSettings)
            });
            if (!res.ok) throw new Error("Failed to update settings");

            if (newSettings.logo) localStorage.setItem('site_logo', newSettings.logo);
            if (newSettings.site_title) localStorage.setItem('site_title', newSettings.site_title);
            if (newSettings.site_favicon) localStorage.setItem('site_favicon', newSettings.site_favicon);

            setSettings(prev => ({ ...prev, ...newSettings }));
            return true;
        } catch (error) {
            console.error("Update Settings Error:", error);
            return false;
        }
    };

    const addPage = async (pageData) => {
        try {
            const res = await fetch(`${API_URL}/pages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify(pageData)
            });
            const data = await res.json();
            await fetchPages();
            return data;
        } catch (e) { console.error(e); }
    };

    const updatePage = async (id, pageData) => {
        try {
            await fetch(`${API_URL}/pages/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify(pageData)
            });
            await fetchPages();
        } catch (e) { console.error(e); }
    };

    const deletePage = async (id) => {
        try {
            await fetch(`${API_URL}/pages/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            await fetchPages();
        } catch (e) { console.error(e); }
    };

    const addPost = async (postData) => {
        try {
            const res = await fetch(`${API_URL}/posts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify(postData)
            });
            const data = await res.json();
            await fetchPosts();
            return data;
        } catch (e) { console.error(e); }
    };

    const updatePost = async (id, postData) => {
        try {
            await fetch(`${API_URL}/posts/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify(postData)
            });
            await fetchPosts();
        } catch (e) { console.error(e); }
    };

    const deletePost = async (id) => {
        try {
            await fetch(`${API_URL}/posts/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            await fetchPosts();
        } catch (e) { console.error(e); }
    };

    const fetchMenus = async () => {
        try {
            const res = await fetch(`${API_URL}/menus`);
            return await res.json();
        } catch (e) { console.error(e); return []; }
    };

    const fetchMenu = async (id) => {
        try {
            const res = await fetch(`${API_URL}/menus/${id}`);
            return await res.json();
        } catch (e) { console.error(e); return null; }
    };

    const addMenu = async (menuData) => {
        try {
            const res = await fetch(`${API_URL}/menus`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify(menuData)
            });
            return await res.json();
        } catch (e) { console.error(e); }
    };

    const updateMenu = async (id, menuData) => {
        try {
            const res = await fetch(`${API_URL}/menus/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify(menuData)
            });
            if (!res.ok) {
                const errorData = await res.text();
                throw new Error(errorData || "Failed to update menu");
            }
            return await res.json();
        } catch (e) {
            console.error("Update Menu Error:", e);
            throw e;
        }
    };

    const reorderMedia = async (tributeId, mediaIds) => {
        try {
            const res = await fetch(`${API_URL}/tributes/${tributeId}/media/reorder`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify({ order: mediaIds })
            });
            if (!res.ok) throw new Error("Reorder failed");
            await fetchTributes();
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    };

    const deleteMenu = async (id) => {
        try {
            await fetch(`${API_URL}/menus/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
        } catch (e) { console.error(e); }
    };

    const fetchMenuByLocation = async (location) => {
        try {
            const res = await fetch(`${API_URL}/menus/location/${location}`);
            const data = await res.json();
            if (location === 'primary') setPrimaryMenu(data);
            return data;
        } catch (e) { console.error(e); return null; }
    };

    const migrationStarted = React.useRef(false);

    useEffect(() => {
        const init = async () => {
            if (migrationStarted.current) return;
            migrationStarted.current = true;

            try {
                await fetchTributes();
                await fetchPages();
                await fetchPosts();
                await fetchProducts();
                await fetchMedia();
                await fetchSettings();
                await fetchMenuByLocation('primary');

                const migrationComplete = await localforage.getItem('migration_complete');
                if (migrationComplete) {
                    await fetchTributes();
                    setIsInitialized(true);
                    return;
                }

                const apiData = await fetchTributes();
                if (apiData.length === 0) {
                    const localData = await localforage.getItem('tributes');
                    if (localData && localData.length > 0) {
                        for (const t of localData) {
                            try {
                                const res = await fetch(`${API_URL}/tributes`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(t)
                                });
                                const newTribute = await res.json();

                                if (t.comments) {
                                    for (const c of t.comments) {
                                        await fetch(`${API_URL}/tributes/${newTribute.id}/comments`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ name: c.name, text: c.text || c.comment })
                                        });
                                    }
                                }
                                if (t.images) {
                                    for (const img of t.images) {
                                        await fetch(`${API_URL}/tributes/${newTribute.id}/media`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ type: 'image', url: img })
                                        });
                                    }
                                }
                                if (t.videos) {
                                    for (const vid of t.videos) {
                                        await fetch(`${API_URL}/tributes/${newTribute.id}/media`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ type: 'video', url: vid })
                                        });
                                    }
                                }
                            } catch (e) { console.error("Migration failed", e); }
                        }
                        await localforage.setItem('migration_complete', true);
                        await localforage.removeItem('tributes');
                        await fetchTributes();
                    }
                }
            } catch (error) {
                console.error("Initialization error:", error);
            }
            setIsInitialized(true);
        };
        init();
    }, []);

    useEffect(() => {
        if (settings.site_title) {
            document.title = settings.site_title;
        }
        if (settings.site_favicon) {
            let link = document.querySelector("link[rel~='icon']");
            if (!link) {
                link = document.createElement('link');
                link.rel = 'icon';
                document.getElementsByTagName('head')[0].appendChild(link);
            }
            link.href = settings.site_favicon;
        }
    }, [settings.site_title, settings.site_favicon]);

    const addTribute = async (tributeData) => {
        try {
            const res = await fetch(`${API_URL}/tributes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify(tributeData)
            });
            if (!res.ok) throw new Error("Failed to add tribute");
            const newTribute = await res.json();
            await fetchTributes();
            return newTribute;
        } catch (error) {
            console.error("Add tribute error:", error);
            return null;
        }
    };

    const deleteTribute = async (id) => {
        try {
            await fetch(`${API_URL}/tributes/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            await fetchTributes();
        } catch (e) { console.error(e); }
    };

    const updateTribute = async (id, updatedData) => {
        try {
            const res = await fetch(`${API_URL}/tributes/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify(updatedData)
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Update failed");
            }
            await fetchTributes();
            return true;
        } catch (e) {
            console.error("Update Tribute Error:", e);
            return false;
        }
    };

    const addComment = async (id, commentData) => {
        try {
            await fetch(`${API_URL}/tributes/${id}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(commentData)
            });
            await fetchTributes();
        } catch (e) { console.error(e); }
    };

    const addMedia = async (id, type, url) => {
        try {
            const res = await fetch(`${API_URL}/tributes/${id}/media`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify({ type, url })
            });
            if (!res.ok) throw new Error("Upload failed");
            await fetchTributes();
            await fetchMedia();
            return true;
        } catch (e) { console.error(e); return false; }
    };


    const removeComment = async (commentId) => {
        try {
            const res = await fetch(`${API_URL}/comments/${commentId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error("Delete failed");
            await fetchTributes();
            return true;
        } catch (e) { console.error(e); return false; }
    };

    const updateComment = async (id, commentData) => {
        try {
            const res = await fetch(`${API_URL}/comments/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(commentData)
            });
            if (!res.ok) throw new Error("Update failed");
            await fetchTributes();
            return true;
        } catch (e) { console.error(e); return false; }
    };

    const incrementViewCount = (id) => {
        setTributes(prev => prev.map(t => String(t.id) === String(id) ? { ...t, views: (t.views || 0) + 1 } : t));
        updateTribute(id, { views: (tributes.find(t => String(t.id) === String(id))?.views || 0) + 1 });
    };

    const addToCart = (product, quantity = 1, metadata = {}) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id && JSON.stringify(item.metadata) === JSON.stringify(metadata));
            if (existing) {
                return prev.map(item =>
                    (item.id === product.id && JSON.stringify(item.metadata) === JSON.stringify(metadata))
                        ? { ...item, quantity: item.quantity + quantity }
                        : item
                );
            }
            return [...prev, { ...product, quantity, metadata }];
        });
        showToast(`${product.name} added to cart!`, 'success');
    };

    const removeFromCart = (id, metadata = {}) => {
        setCart(prev => prev.filter(item => !(item.id === id && JSON.stringify(item.metadata) === JSON.stringify(metadata))));
    };

    const updateCartQuantity = (id, quantity, metadata = {}) => {
        if (quantity < 1) return removeFromCart(id, metadata);
        setCart(prev => prev.map(item =>
            (item.id === id && JSON.stringify(item.metadata) === JSON.stringify(metadata))
                ? { ...item, quantity }
                : item
        ));
    };

    const clearCart = () => setCart([]);

    return (
        <TributeContext.Provider value={{
            tributes, pages, posts, settings, media, primaryMenu, isInitialized,
            addTribute, deleteTribute, updateTribute, incrementViewCount,
            addComment, removeComment, updateComment, fetchComments,
            addMedia, uploadGlobalMedia, removeMedia, fetchMedia,
            updateSettings, fetchSettings,
            fetchPages, addPage, updatePage, deletePage,
            fetchPosts, addPost, updatePost, deletePost,
            fetchMenus, fetchMenu, addMenu, updateMenu, deleteMenu, fetchMenuByLocation,
            fetchProducts, addProduct, updateProduct, deleteProduct, products,
            showToast, toast, setToast, reorderMedia,
            cart, addToCart, removeFromCart, updateCartQuantity, clearCart
        }}>
            {children}
        </TributeContext.Provider>
    );
};
