import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { inventoryApi, orderApi, voucherPromoApi, voucherPromoPost } from '../../api/axiosInstance';

const formatRupiah = (num) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);

function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Order form
  const [quantity, setQuantity] = useState(1);
  const [ordering, setOrdering] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [orderError, setOrderError] = useState(null);

  // Voucher
  const [vouchers, setVouchers] = useState([]);
  const [selectedVoucher, setSelectedVoucher] = useState('');
  const [voucherDiscount, setVoucherDiscount] = useState(0);
  const [voucherValid, setVoucherValid] = useState(null);

  useEffect(() => {
    loadProduct();
    loadVouchers();
  }, [id]);

  const loadProduct = async () => {
    setLoading(true);
    try {
      const res = await inventoryApi.get(`/api/products/${id}`);
      setProduct(res.data);
    } catch (err) {
      setError('Produk tidak ditemukan.');
    } finally {
      setLoading(false);
    }
  };

  const loadVouchers = async () => {
    try {
      const res = await voucherPromoApi.get('/vouchers/active');
      setVouchers(res.data || []);
    } catch {
      // Voucher service might be unavailable
    }
  };

  const subtotal = product ? product.price * quantity : 0;
  const total = Math.max(0, subtotal - voucherDiscount);

  const handleValidateVoucher = async () => {
    if (!selectedVoucher) return;
    try {
      const res = await voucherPromoPost('/vouchers/validate', {
        code: selectedVoucher,
        orderAmount: subtotal,
      });
      if (res.data?.valid) {
        setVoucherDiscount(res.data.discountAmount || 0);
        setVoucherValid(true);
      } else {
        setVoucherDiscount(0);
        setVoucherValid(false);
      }
    } catch {
      setVoucherDiscount(0);
      setVoucherValid(false);
    }
  };

  const handleOrder = async () => {
    setOrdering(true);
    setOrderError(null);
    setOrderSuccess(null);
    try {
      // 1. Reserve stock in inventory
      await inventoryApi.post(`/api/products/${id}/reserve`, null, {
        params: { quantity },
      });

      // 2. Create order
      const orderPayload = {
        productId: product.id,
        productName: product.name,
        quantity,
        pricePerItem: product.price,
        totalAmount: total,
        voucherCode: selectedVoucher || null,
        discountAmount: voucherDiscount,
      };
      await orderApi.post('/api/orders', orderPayload);

      // 3. Claim voucher if used
      if (selectedVoucher && voucherValid) {
        try {
          await voucherPromoPost('/vouchers/claim', {
            code: selectedVoucher,
            orderId: `ORDER-${Date.now()}`,
            orderAmount: subtotal,
          });
        } catch {
          // Voucher claim failed but order succeeded
        }
      }

      setOrderSuccess('Order berhasil dibuat!');
      setTimeout(() => navigate('/orders'), 2000);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error?.message || 'Gagal membuat order.';
      setOrderError(msg);
    } finally {
      setOrdering(false);
    }
  };

  if (loading) {
    return (
      <div className="font-display bg-background-dark text-slate-100 min-h-screen flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="font-display bg-background-dark text-slate-100 min-h-screen flex flex-col items-center justify-center gap-4">
        <span className="material-symbols-outlined text-6xl text-red-400">error</span>
        <p className="text-lg">{error || 'Produk tidak ditemukan'}</p>
        <button onClick={() => navigate('/inventory')} className="bg-primary text-white px-6 py-2 rounded-xl font-bold">
          Kembali
        </button>
      </div>
    );
  }

  return (
    <div className="font-display bg-background-dark text-slate-100 min-h-screen">
      <div className="px-4 lg:px-40 py-8 max-w-[1000px] mx-auto">
        {/* Back */}
        <button onClick={() => navigate('/inventory')} className="flex items-center gap-2 text-slate-400 hover:text-primary mb-6 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
          Kembali ke Katalog
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Product Image */}
          <div className="aspect-square rounded-2xl bg-gradient-to-br from-primary/20 to-purple-900/40 flex items-center justify-center border border-border-dark">
            <span className="material-symbols-outlined text-[120px] text-primary/40">shopping_bag</span>
          </div>

          {/* Product Info */}
          <div className="flex flex-col gap-4">
            <h1 className="text-3xl font-bold">{product.name}</h1>
            <p className="text-primary text-3xl font-bold">{formatRupiah(product.price)}</p>

            <div className="flex gap-2 flex-wrap">
              {product.stock <= 3 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-md">Limited</span>
              )}
              {product.stock <= 5 && (
                <span className="bg-yellow-400 text-black text-xs font-bold px-2 py-1 rounded-md">War</span>
              )}
              <span className="bg-emerald-500/10 text-emerald-400 text-xs font-bold px-2.5 py-1 rounded-md border border-emerald-500/20">
                Stok: {product.stock}
              </span>
            </div>

            <p className="text-slate-300 leading-relaxed">{product.description}</p>

            <div className="flex flex-col gap-2 text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">location_on</span>
                {product.originLocation}
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                {product.purchaseDate}
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">person</span>
                Jastiper: {product.jastiperId}
              </div>
            </div>

            <hr className="border-border-dark my-2" />

            {/* Quantity */}
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-slate-300">Jumlah:</span>
              <div className="flex items-center border border-border-dark rounded-xl overflow-hidden">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="px-4 py-2 bg-surface-dark hover:bg-primary/20 transition-colors text-lg font-bold">-</button>
                <span className="px-6 py-2 bg-surface-dark text-lg font-bold min-w-[60px] text-center">{quantity}</span>
                <button onClick={() => setQuantity(Math.min(product.stock, quantity + 1))} className="px-4 py-2 bg-surface-dark hover:bg-primary/20 transition-colors text-lg font-bold">+</button>
              </div>
            </div>

            {/* Voucher */}
            {vouchers.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-300">Voucher:</span>
                <div className="flex gap-2">
                  <select
                    value={selectedVoucher}
                    onChange={(e) => { setSelectedVoucher(e.target.value); setVoucherValid(null); setVoucherDiscount(0); }}
                    className="flex-1 bg-surface-dark border border-border-dark rounded-xl px-4 py-2 text-slate-100 focus:outline-none focus:border-primary"
                  >
                    <option value="">Tanpa voucher</option>
                    {vouchers.map((v) => (
                      <option key={v.code} value={v.code}>
                        {v.code} — {v.discountType === 'PERCENT' ? `${v.discountValue}%` : formatRupiah(v.discountValue)} (min {formatRupiah(v.minSpend)})
                      </option>
                    ))}
                  </select>
                  <button onClick={handleValidateVoucher} disabled={!selectedVoucher} className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors">
                    Validasi
                  </button>
                </div>
                {voucherValid === true && <p className="text-sm text-emerald-400">Voucher valid! Diskon: {formatRupiah(voucherDiscount)}</p>}
                {voucherValid === false && <p className="text-sm text-red-400">Voucher tidak valid untuk order ini.</p>}
              </div>
            )}

            {/* Order Summary */}
            <div className="bg-surface-dark border border-border-dark rounded-xl p-4 flex flex-col gap-2">
              <div className="flex justify-between text-sm text-slate-400">
                <span>Subtotal ({quantity}x)</span>
                <span>{formatRupiah(subtotal)}</span>
              </div>
              {voucherDiscount > 0 && (
                <div className="flex justify-between text-sm text-emerald-400">
                  <span>Diskon voucher</span>
                  <span>-{formatRupiah(voucherDiscount)}</span>
                </div>
              )}
              <hr className="border-border-dark" />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-primary">{formatRupiah(total)}</span>
              </div>
            </div>

            {/* Order Button */}
            {orderSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm text-center">{orderSuccess}</div>
            )}
            {orderError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">{orderError}</div>
            )}

            <button
              onClick={handleOrder}
              disabled={ordering || product.stock === 0}
              className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2 text-lg"
            >
              {ordering ? (
                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
              ) : (
                <>
                  <span className="material-symbols-outlined">shopping_cart</span>
                  {product.stock === 0 ? 'Stok Habis' : 'Order Sekarang'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductDetailPage;
