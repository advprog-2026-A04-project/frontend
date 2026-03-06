import { useState, useEffect } from 'react';
import { voucherPromoApi } from '../../api/axiosInstance';

const formatRupiah = (num) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);

function VoucherListPage() {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadVouchers();
  }, []);

  const loadVouchers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await voucherPromoApi.get('/vouchers/active');
      setVouchers(res.data || []);
    } catch (err) {
      setError('Gagal memuat voucher. Service mungkin belum aktif.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="font-display bg-background-dark text-slate-100 min-h-screen">
      <div className="px-4 lg:px-40 py-8 max-w-[1000px] mx-auto">
        <h1 className="text-3xl font-bold mb-6 flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-3xl">confirmation_number</span>
          Voucher & Promo
        </h1>

        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{error}</div>
        )}

        {loading && (
          <div className="flex justify-center py-20">
            <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        )}

        {!loading && !error && vouchers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <span className="material-symbols-outlined text-6xl mb-4">loyalty</span>
            <p className="text-lg font-medium">Belum ada voucher aktif</p>
            <p className="text-sm">Nantikan promo menarik dari kami!</p>
          </div>
        )}

        {!loading && vouchers.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {vouchers.map((v) => (
              <div key={v.code} className="bg-surface-dark border border-border-dark rounded-2xl overflow-hidden hover:border-primary/50 transition-all">
                <div className="bg-gradient-to-r from-primary/20 to-purple-900/30 px-5 py-3 flex items-center justify-between">
                  <span className="font-mono font-bold text-lg tracking-wider text-primary">{v.code}</span>
                  <span className="material-symbols-outlined text-primary">confirmation_number</span>
                </div>
                <div className="p-5 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <span className="bg-primary text-white text-xl font-bold px-4 py-2 rounded-xl">
                      {v.discountType === 'PERCENT' ? `${v.discountValue}%` : formatRupiah(v.discountValue)}
                    </span>
                    <span className="text-sm text-slate-400">OFF</span>
                  </div>
                  <div className="text-sm text-slate-400 flex flex-col gap-1">
                    <p>Min. belanja: {formatRupiah(v.minSpend)}</p>
                    <p>Sisa kuota: <span className="text-primary font-bold">{v.quotaRemaining}</span></p>
                    <p>Berlaku: {new Date(v.startAt).toLocaleDateString('id-ID')} - {new Date(v.endAt).toLocaleDateString('id-ID')}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default VoucherListPage;
