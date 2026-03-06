import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { orderApi } from '../../api/axiosInstance';

const formatRupiah = (num) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);

function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadOrder();
  }, [id]);

  const loadOrder = async () => {
    setLoading(true);
    try {
      const res = await orderApi.get(`/api/orders/${id}`);
      setOrder(res.data?.data || res.data);
    } catch {
      setError('Order tidak ditemukan.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="font-display bg-background-dark text-slate-100 min-h-screen flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="font-display bg-background-dark text-slate-100 min-h-screen flex flex-col items-center justify-center gap-4">
        <span className="material-symbols-outlined text-6xl text-red-400">error</span>
        <p className="text-lg">{error}</p>
        <button onClick={() => navigate('/orders')} className="bg-primary text-white px-6 py-2 rounded-xl font-bold">Kembali</button>
      </div>
    );
  }

  return (
    <div className="font-display bg-background-dark text-slate-100 min-h-screen">
      <div className="px-4 lg:px-40 py-8 max-w-[800px] mx-auto">
        <button onClick={() => navigate('/orders')} className="flex items-center gap-2 text-slate-400 hover:text-primary mb-6 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
          Kembali ke Orders
        </button>

        <div className="bg-surface-dark border border-border-dark rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Order #{order.id || order.orderId || id}</h1>
            <span className="text-sm font-bold px-3 py-1 rounded-full border bg-primary/10 text-primary border-primary/20">
              {order.status || 'PENDING'}
            </span>
          </div>

          <hr className="border-border-dark" />

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-400">Produk</p>
              <p className="font-bold">{order.productName || '-'}</p>
            </div>
            <div>
              <p className="text-slate-400">Jumlah</p>
              <p className="font-bold">{order.quantity || '-'}</p>
            </div>
            <div>
              <p className="text-slate-400">Harga Satuan</p>
              <p className="font-bold">{order.pricePerItem ? formatRupiah(order.pricePerItem) : '-'}</p>
            </div>
            <div>
              <p className="text-slate-400">Voucher</p>
              <p className="font-bold">{order.voucherCode || 'Tidak ada'}</p>
            </div>
            {order.discountAmount > 0 && (
              <div>
                <p className="text-slate-400">Diskon</p>
                <p className="font-bold text-emerald-400">-{formatRupiah(order.discountAmount)}</p>
              </div>
            )}
            <div>
              <p className="text-slate-400">Total</p>
              <p className="font-bold text-primary text-xl">{formatRupiah(order.totalAmount || 0)}</p>
            </div>
          </div>

          {order.createdAt && (
            <>
              <hr className="border-border-dark" />
              <p className="text-xs text-slate-500">Dibuat: {new Date(order.createdAt).toLocaleString('id-ID')}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default OrderDetailPage;
