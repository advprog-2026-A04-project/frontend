import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { orderApi } from '../../api/axiosInstance';

const formatRupiah = (num) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);

const statusColors = {
  PENDING: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  CONFIRMED: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  SHIPPED: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  DELIVERED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  CANCELLED: 'bg-red-500/10 text-red-400 border-red-500/20',
};

function OrderListPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await orderApi.get('/api/orders');
      const data = res.data?.data || res.data || [];
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Gagal memuat daftar order. Service mungkin belum aktif.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="font-display bg-background-dark text-slate-100 min-h-screen">
      <div className="px-4 lg:px-40 py-8 max-w-[1000px] mx-auto">
        <h1 className="text-3xl font-bold mb-6 flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-3xl">receipt_long</span>
          My Orders
        </h1>

        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{error}</div>
        )}

        {loading && (
          <div className="flex justify-center py-20">
            <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        )}

        {!loading && !error && orders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <span className="material-symbols-outlined text-6xl mb-4">shopping_cart</span>
            <p className="text-lg font-medium">Belum ada order</p>
            <button onClick={() => navigate('/inventory')} className="mt-4 bg-primary text-white px-6 py-2 rounded-xl font-bold">
              Mulai Belanja
            </button>
          </div>
        )}

        {!loading && orders.length > 0 && (
          <div className="flex flex-col gap-4">
            {orders.map((order) => (
              <div
                key={order.id || order.orderId}
                onClick={() => navigate(`/orders/${order.id || order.orderId}`)}
                className="bg-surface-dark border border-border-dark rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-primary/50 hover:shadow-[0_0_20px_rgba(242,13,185,0.15)] transition-all cursor-pointer"
              >
                <div className="flex flex-col gap-1">
                  <p className="font-bold text-lg">{order.productName || `Order #${order.id || order.orderId}`}</p>
                  <p className="text-sm text-slate-400">
                    {order.quantity}x &middot; {order.createdAt ? new Date(order.createdAt).toLocaleDateString('id-ID') : ''}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border ${statusColors[order.status] || statusColors.PENDING}`}>
                    {order.status || 'PENDING'}
                  </span>
                  <p className="text-primary font-bold text-lg">{formatRupiah(order.totalAmount || 0)}</p>
                  <span className="material-symbols-outlined text-slate-500">chevron_right</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default OrderListPage;
