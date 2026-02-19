import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBox, faCheck, faClock, faTimes, faEye, faXmark, faEnvelope, faMapMarkerAlt, faCalendarAlt, faShoppingBag } from '@fortawesome/free-solid-svg-icons';
import { useTributeContext } from '../../context/TributeContext';
import { API_URL } from '../../config';

const OrdersListAdmin = () => {
    const { showToast } = useTributeContext();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/orders`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (Array.isArray(data)) {
                setOrders(data);
            }
        } catch (error) {
            console.error("Failed to fetch orders:", error);
            showToast("Failed to load orders", "error");
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'paid':
                return <span className="px-2 py-1 text-xs font-bold rounded bg-green-100 text-green-700 flex items-center gap-1 w-fit"><FontAwesomeIcon icon={faCheck} /> Paid</span>;
            case 'pending':
                return <span className="px-2 py-1 text-xs font-bold rounded bg-yellow-100 text-yellow-700 flex items-center gap-1 w-fit"><FontAwesomeIcon icon={faClock} /> Pending</span>;
            case 'cancelled':
                return <span className="px-2 py-1 text-xs font-bold rounded bg-red-100 text-red-700 flex items-center gap-1 w-fit"><FontAwesomeIcon icon={faTimes} /> Cancelled</span>;
            case 'shipped':
                return <span className="px-2 py-1 text-xs font-bold rounded bg-blue-100 text-blue-700 flex items-center gap-1 w-fit"><FontAwesomeIcon icon={faBox} /> Shipped</span>;
            default:
                return <span className="px-2 py-1 text-xs font-bold rounded bg-gray-100 text-gray-700">{status}</span>;
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-400">Loading orders...</div>;
    }

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                    <FontAwesomeIcon icon={faBox} className="text-primary" />
                    Orders
                </h2>
                <div className="text-sm text-gray-500">
                    Total: <span className="font-bold text-dark">{orders.length}</span>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider border-b border-gray-100">
                            <th className="p-4 font-semibold">Order ID</th>
                            <th className="p-4 font-semibold">Date</th>
                            <th className="p-4 font-semibold">Customer</th>
                            <th className="p-4 font-semibold">Total</th>
                            <th className="p-4 font-semibold">Status</th>
                            <th className="p-4 font-semibold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {orders.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="p-8 text-center text-gray-400 italic">No orders found.</td>
                            </tr>
                        ) : (
                            orders.map((order) => (
                                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4 font-mono text-xs text-gray-500">#{order.id}</td>
                                    <td className="p-4 text-sm text-gray-600">
                                        {new Date(order.created_at).toLocaleDateString()}
                                        <div className="text-xs text-gray-400">{new Date(order.created_at).toLocaleTimeString()}</div>
                                    </td>
                                    <td className="p-4">
                                        <div className="font-bold text-gray-800 text-sm">{order.customer_name}</div>
                                        <div className="text-xs text-gray-400">{order.customer_email}</div>
                                    </td>
                                    <td className="p-4 font-bold text-gray-800">€ {parseFloat(order.total_amount).toFixed(2)}</td>
                                    <td className="p-4">{getStatusBadge(order.status)}</td>
                                    <td className="p-4 text-right">
                                        <button
                                            onClick={() => setSelectedOrder(order)}
                                            className="text-gray-400 hover:text-primary transition-colors p-2"
                                            title="View Details"
                                        >
                                            <FontAwesomeIcon icon={faEye} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Order Details Modal */}
            {selectedOrder && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="text-xl font-serif font-bold text-dark flex items-center gap-3">
                                Order #{selectedOrder.id}
                                {getStatusBadge(selectedOrder.status)}
                            </h3>
                            <button
                                onClick={() => setSelectedOrder(null)}
                                className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-300 transition-colors"
                            >
                                <FontAwesomeIcon icon={faXmark} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-8">
                            {/* Customer & Shipping Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 border-b border-gray-100 pb-2">Customer</h4>
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                                            {selectedOrder.customer_name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-dark">{selectedOrder.customer_name}</p>
                                            <a href={`mailto:${selectedOrder.customer_email}`} className="text-sm text-gray-500 hover:text-primary flex items-center gap-2">
                                                <FontAwesomeIcon icon={faEnvelope} size="xs" />
                                                {selectedOrder.customer_email}
                                            </a>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 border-b border-gray-100 pb-2">Shipping Address</h4>
                                    <div className="flex items-start gap-3 text-sm text-gray-600">
                                        <FontAwesomeIcon icon={faMapMarkerAlt} className="mt-1 text-gray-400" />
                                        <div>
                                            {selectedOrder.address && (
                                                <>
                                                    <p>{selectedOrder.address.address}</p>
                                                    <p>{selectedOrder.address.zipCode} {selectedOrder.address.city}</p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-gray-600 mt-2">
                                        <FontAwesomeIcon icon={faCalendarAlt} className="text-gray-400" />
                                        <span>Ordered on {new Date(selectedOrder.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Order Items */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 border-b border-gray-100 pb-2">Order Items</h4>
                                <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                                    {selectedOrder.items && selectedOrder.items.map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-white rounded-lg border border-gray-200 flex items-center justify-center text-gray-300">
                                                    <FontAwesomeIcon icon={faShoppingBag} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm text-dark">{item.product_name}</p>
                                                    <p className="text-xs text-secondary">{item.quantity} × €{parseFloat(item.price).toFixed(2)}</p>
                                                </div>
                                            </div>
                                            <div className="font-bold text-dark text-sm">
                                                €{(parseFloat(item.price) * item.quantity).toFixed(2)}
                                            </div>
                                        </div>
                                    ))}

                                    <div className="border-t border-gray-200 pt-4 flex justify-between items-end">
                                        <div className="text-right w-full">
                                            <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Total Amount</p>
                                            <p className="text-2xl font-bold text-primary">€ {parseFloat(selectedOrder.total_amount).toFixed(2)}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end">
                            <button
                                onClick={() => setSelectedOrder(null)}
                                className="px-6 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors"
                            >
                                Close Details
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrdersListAdmin;
