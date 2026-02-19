import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTachometerAlt, faBookOpen, faCog, faSignOutAlt, faPlus, faHome, faCommentAlt, faFileAlt, faNewspaper, faImage, faBars, faCode, faUser, faShoppingBag, faBox, faTicketAlt } from '@fortawesome/free-solid-svg-icons';
import { useTributeContext } from '../../context/TributeContext';

const LayoutAdmin = () => {
    const { settings } = useTributeContext();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const isActive = (path) => location.pathname === path;
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isAdmin = user.role === 'admin' || user.username === 'admin' || user.email?.includes('admin');

    return (
        <div className="flex h-screen bg-gray-100 font-sans">
            {/* Sidebar */}
            <div className={`bg-[#1d2327] text-gray-300 w-64 flex-shrink-0 flex flex-col transition-all duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-64 absolute z-50 h-full'}`}>
                {/* Logo Area */}
                <div className="h-16 flex items-center px-4 bg-[#2c3338] shadow-sm">
                    <Link to="/admin" className="text-white font-bold text-lg flex items-center gap-2">
                        {settings.logo ? (
                            <img src={settings.logo} alt="Logo" className="max-h-12 w-auto" />
                        ) : (
                            <>
                                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-dark text-sm font-serif font-bold">T</div>
                                <span>Tributoo Admin</span>
                            </>
                        )}
                    </Link>
                </div>

                {/* Navigation */}
                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-4">
                    <div className="px-3 mb-2 text-xs uppercase text-gray-500 font-semibold tracking-wider">Main</div>
                    <ul>
                        <li>
                            <Link to="/admin" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${isActive('/admin') ? 'bg-primary text-white' : 'hover:bg-[#2c3338] hover:text-white'}`}>
                                <FontAwesomeIcon icon={faTachometerAlt} className="w-4" />
                                <span>Dashboard</span>
                            </Link>
                        </li>
                    </ul>

                    <div className="px-3 mt-6 mb-2 text-xs uppercase text-gray-500 font-semibold tracking-wider">Content</div>
                    <ul className="space-y-1">
                        <li>
                            <Link to="/admin/memorials" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${isActive('/admin/memorials') ? 'bg-primary text-white' : 'hover:bg-[#2c3338] hover:text-white'}`}>
                                <FontAwesomeIcon icon={faBookOpen} className="w-4" />
                                <span>Memorials</span>
                            </Link>
                        </li>
                        <li>
                            <Link to="/admin/media" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${isActive('/admin/media') ? 'bg-primary text-white' : 'hover:bg-[#2c3338] hover:text-white'}`}>
                                <FontAwesomeIcon icon={faImage} className="w-4" />
                                <span>Media Library</span>
                            </Link>
                        </li>
                        {isAdmin && (
                            <>
                                <li>
                                    <Link to="/admin/pages" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${isActive('/admin/pages') ? 'bg-primary text-white' : 'hover:bg-[#2c3338] hover:text-white'}`}>
                                        <FontAwesomeIcon icon={faFileAlt} className="w-4" />
                                        <span>Pages</span>
                                    </Link>
                                </li>
                                <li>
                                    <Link to="/admin/posts" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${isActive('/admin/posts') ? 'bg-primary text-white' : 'hover:bg-[#2c3338] hover:text-white'}`}>
                                        <FontAwesomeIcon icon={faNewspaper} className="w-4" />
                                        <span>Posts</span>
                                    </Link>
                                </li>
                                <li>
                                    <Link to="/admin/products" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${isActive('/admin/products') ? 'bg-primary text-white' : 'hover:bg-[#2c3338] hover:text-white'}`}>
                                        <FontAwesomeIcon icon={faShoppingBag} className="w-4" />
                                        <span>Products</span>
                                    </Link>
                                </li>
                                <li>
                                    <Link to="/admin/orders" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${isActive('/admin/orders') ? 'bg-primary text-white' : 'hover:bg-[#2c3338] hover:text-white'}`}>
                                        <FontAwesomeIcon icon={faBox} className="w-4" />
                                        <span>Orders</span>
                                    </Link>
                                </li>
                                <li>
                                    <Link to="/admin/voucher-templates" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${isActive('/admin/voucher-templates') ? 'bg-primary text-white' : 'hover:bg-[#2c3338] hover:text-white'}`}>
                                        <FontAwesomeIcon icon={faTicketAlt} className="w-4" />
                                        <span>Voucher Templates</span>
                                    </Link>
                                </li>
                            </>
                        )}
                    </ul>

                    {isAdmin && (
                        <>
                            <div className="px-3 mt-6 mb-2 text-xs uppercase text-gray-500 font-semibold tracking-wider">Appearance</div>
                            <ul className="space-y-1">
                                <li>
                                    <Link to="/admin/menus" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${isActive('/admin/menus') ? 'bg-primary text-white' : 'hover:bg-[#2c3338] hover:text-white'}`}>
                                        <FontAwesomeIcon icon={faBars} className="w-4" />
                                        <span>Menus</span>
                                    </Link>
                                </li>
                            </ul>

                            <div className="px-3 mt-6 mb-2 text-xs uppercase text-gray-500 font-semibold tracking-wider">Social</div>
                            <ul className="space-y-1">
                                <li>
                                    <Link to="/admin/condolences" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${isActive('/admin/condolences') ? 'bg-primary text-white' : 'hover:bg-[#2c3338] hover:text-white'}`}>
                                        <FontAwesomeIcon icon={faCommentAlt} className="w-4" />
                                        <span>Condolence Book</span>
                                    </Link>
                                </li>
                            </ul>

                            <div className="px-3 mt-6 mb-2 text-xs uppercase text-gray-500 font-semibold tracking-wider">System</div>
                            <ul className="space-y-1">
                                <li>
                                    <Link to="/admin/settings" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${isActive('/admin/settings') ? 'bg-primary text-white' : 'hover:bg-[#2c3338] hover:text-white'}`}>
                                        <FontAwesomeIcon icon={faCog} className="w-4" />
                                        <span>Settings</span>
                                    </Link>
                                </li>
                            </ul>
                        </>
                    )}
                    <div className="px-3 mt-6 mb-2 text-xs uppercase text-gray-500 font-semibold tracking-wider">Account</div>
                    <ul className="space-y-1">
                        <li>
                            <Link to="/admin/account" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${isActive('/admin/account') ? 'bg-primary text-white' : 'hover:bg-[#2c3338] hover:text-white'}`}>
                                <FontAwesomeIcon icon={faUser} className="w-4" />
                                <span>My Settings</span>
                            </Link>
                        </li>
                    </ul>
                </nav>

                {/* Footer User */}
                <div className="p-4 bg-[#2c3338] border-t border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-white text-xs font-bold uppercase">
                            {user.username ? user.username.charAt(0) : 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{user.username || 'User'}</p>
                            <p className="text-xs text-gray-500 truncate">{user.email || ''}</p>
                        </div>
                        <button
                            onClick={() => {
                                localStorage.removeItem('token');
                                localStorage.removeItem('user');
                                window.location.href = '/login';
                            }}
                            className="text-gray-400 hover:text-white transition-colors"
                            title="Sign Out"
                        >
                            <FontAwesomeIcon icon={faSignOutAlt} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
                {/* Top Header */}
                <header className="h-16 bg-white shadow-sm flex items-center justify-between px-6 z-10">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-500 hover:text-dark md:hidden">
                            <span className="sr-only">Toggle Sidebar</span>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                        </button>
                        <h1 className="text-lg font-semibold text-gray-800">
                            {location.pathname === '/admin' && 'Dashboard'}
                            {location.pathname === '/admin/memorials' && 'Manage Memorials'}
                            {location.pathname === '/admin/memorials/new' && 'Add New Memorial'}
                            {location.pathname === '/admin/media' && 'Media Library'}
                            {location.pathname === '/admin/menus' && 'Menüs'}
                            {location.pathname.startsWith('/admin/products') && 'E-Commerce / Products'}
                            {location.pathname.startsWith('/admin/settings') && 'Settings'}
                        </h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link to="/" className="text-sm text-gray-600 hover:text-primary flex items-center gap-2">
                            <FontAwesomeIcon icon={faHome} /> Visit Site
                        </Link>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-auto bg-gray-100 p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default LayoutAdmin;
