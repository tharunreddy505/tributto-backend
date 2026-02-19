import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useParams, useLocation, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from './components/layout/Layout';
import LandingPage from './pages/LandingPage';
import MemorialPage from './pages/MemorialPage';
import MemorialsPage from './pages/MemorialsPage';
import PageView from './pages/PageView';
import LayoutAdmin from './components/admin/LayoutAdmin';
import DashboardAdmin from './pages/admin/DashboardAdmin';
import MemorialsListAdmin from './pages/admin/MemorialsListAdmin';
import CreateMemorialAdmin from './pages/admin/CreateMemorialAdmin';
import EditMemorialAdmin from './pages/admin/EditMemorialAdmin';
import SettingsAdmin from './pages/admin/SettingsAdmin';
import CondolenceAdmin from './pages/admin/CondolenceAdmin';
import OrdersListAdmin from './pages/admin/OrdersListAdmin';
import PagesListAdmin from './pages/admin/PagesListAdmin';
import EditPageAdmin from './pages/admin/EditPageAdmin';
import PostsListAdmin from './pages/admin/PostsListAdmin';
import EditPostAdmin from './pages/admin/EditPostAdmin';
import MediaAdmin from './pages/admin/MediaAdmin';
import MenusAdmin from './pages/admin/MenusAdmin';
import UsersListAdmin from './pages/admin/UsersListAdmin';
import AuthPage from './pages/AuthPage';
import AccountAdmin from './pages/admin/AccountAdmin';
import ProductsAdmin from './pages/admin/ProductsAdmin';
import EditProductAdmin from './pages/admin/EditProductAdmin';
import VoucherTemplateAdmin from './pages/admin/VoucherTemplateAdmin';
import Shop from './pages/Shop';
import ProductPage from './pages/ProductPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import { useTributeContext } from './context/TributeContext';
import Toast from './components/ui/Toast';

const supportedLanguages = ['en', 'de', 'it'];

// Component to handle language setting based on URL
const LanguageWrapper = ({ lang, children }) => {
  const { i18n } = useTranslation();

  useEffect(() => {
    // If a lang prop is provided, use it
    if (lang && supportedLanguages.includes(lang)) {
      if (i18n.language !== lang) {
        i18n.changeLanguage(lang);
      }
    } else {
      // Otherwise default to english
      if (i18n.language !== 'en') {
        i18n.changeLanguage('en');
      }
    }
  }, [lang, i18n]);

  return children;
};

import BlogPage from './pages/BlogPage';
import PostView from './pages/PostView';

// Main application routes (localized)
const AppRoutes = () => {
  return (
    <Routes>
      <Route index element={<Layout><LandingPage /></Layout>} />
      <Route path="memorials" element={<MemorialsPage />} />
      <Route path="memorial/:id" element={<MemorialPage />} />
      <Route path="blog" element={<BlogPage />} />
      <Route path="shop" element={<Shop />} />
      <Route path="product/:id" element={<ProductPage />} />
      <Route path="cart" element={<CartPage />} />
      <Route path="checkout" element={<CheckoutPage />} />
      <Route path="post/:slug" element={<PostView />} />
      <Route path="login" element={<AuthPage mode="login" />} />
      <Route path="register" element={<AuthPage mode="register" />} />
      <Route path=":slug" element={<PageView />} />
    </Routes>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const isAdmin = user.role === 'admin' || user.username === 'admin' || user.email?.includes('admin');

  if (adminOnly && !isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return children;
};

const GlobalToast = () => {
  const { toast, setToast } = useTributeContext();
  if (!toast) return null;
  return <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Admin Routes - Global, not localized in URL for now */}
        <Route path="/admin" element={
          <ProtectedRoute>
            <LayoutAdmin />
          </ProtectedRoute>
        }>
          <Route index element={<DashboardAdmin />} />
          <Route path="memorials" element={<MemorialsListAdmin />} />
          <Route path="memorials/new" element={<CreateMemorialAdmin />} />
          <Route path="memorials/edit/:id" element={<EditMemorialAdmin />} />
          <Route path="media" element={<ProtectedRoute adminOnly><MediaAdmin /></ProtectedRoute>} />
          <Route path="menus" element={<ProtectedRoute adminOnly><MenusAdmin /></ProtectedRoute>} />
          <Route path="condolences" element={<CondolenceAdmin />} />
          <Route path="pages" element={<ProtectedRoute adminOnly><PagesListAdmin /></ProtectedRoute>} />
          <Route path="pages/new" element={<ProtectedRoute adminOnly><EditPageAdmin /></ProtectedRoute>} />
          <Route path="pages/edit/:id" element={<ProtectedRoute adminOnly><EditPageAdmin /></ProtectedRoute>} />
          <Route path="posts" element={<ProtectedRoute adminOnly><PostsListAdmin /></ProtectedRoute>} />
          <Route path="posts/new" element={<ProtectedRoute adminOnly><EditPostAdmin /></ProtectedRoute>} />
          <Route path="posts/edit/:id" element={<ProtectedRoute adminOnly><EditPostAdmin /></ProtectedRoute>} />
          <Route path="settings" element={<ProtectedRoute adminOnly><SettingsAdmin /></ProtectedRoute>} />
          <Route path="users" element={<ProtectedRoute adminOnly><UsersListAdmin /></ProtectedRoute>} />
          <Route path="products" element={<ProtectedRoute adminOnly><ProductsAdmin /></ProtectedRoute>} />
          <Route path="products/new" element={<ProtectedRoute adminOnly><EditProductAdmin /></ProtectedRoute>} />
          <Route path="products/edit/:id" element={<ProtectedRoute adminOnly><EditProductAdmin /></ProtectedRoute>} />
          <Route path="orders" element={<ProtectedRoute adminOnly><OrdersListAdmin /></ProtectedRoute>} />
          <Route path="voucher-templates" element={<ProtectedRoute adminOnly><VoucherTemplateAdmin /></ProtectedRoute>} />
          <Route path="account" element={<AccountAdmin />} />
        </Route>

        {/* Explicit Language Routes - ONLY match if path starts with /de/ or /it/ */}
        <Route path="/de/*" element={<LanguageWrapper lang="de"><AppRoutes /></LanguageWrapper>} />
        <Route path="/it/*" element={<LanguageWrapper lang="it"><AppRoutes /></LanguageWrapper>} />

        {/* Default Language Routes (English/Root) 
            Do NOT use a wrapper that consumes a path segment. 
            Just render AppRoutes directly which will match paths against the root.
        */}
        <Route path="/*" element={<LanguageWrapper lang="en"><AppRoutes /></LanguageWrapper>} />
      </Routes>
      <GlobalToast />
    </Router>
  );
}

export default App;
