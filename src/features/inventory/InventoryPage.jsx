import { useState, useEffect } from 'react';
import { inventoryApi } from '../../api/axiosInstance';

const formatRupiah = (num) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
};

const getStockBadgeStyle = (stock) => {
  if (stock <= 2) return 'bg-red-500/10 text-red-500 dark:text-red-400 border-red-500/20';
  if (stock <= 5) return 'bg-orange-500/10 text-orange-500 dark:text-orange-400 border-orange-500/20';
  return 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/20';
};

function InventoryPage() {
  const [products, setProducts] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchTab, setSearchTab] = useState('product'); // 'product' | 'jastiper'
  const [jastiperInput, setJastiperInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      let res;
      if (searchTab === 'product') {
        res = await inventoryApi.get('/api/products/search', {
          params: { keyword: searchKeyword || undefined },
        });
      } else {
        if (!jastiperInput.trim()) {
          setProducts([]);
          setLoading(false);
          return;
        }
        res = await inventoryApi.get(`/api/products/jastipers/${encodeURIComponent(jastiperInput.trim())}`);
      }
      setProducts(res.data);
    } catch (err) {
      setError('Gagal memuat produk. Pastikan backend Inventory berjalan.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchTab === 'product') {
      const timer = setTimeout(() => fetchProducts(), 300);
      return () => clearTimeout(timer);
    }
  }, [searchKeyword, searchTab]);

  const handleJastiperSearch = (e) => {
    e.preventDefault();
    fetchProducts();
  };

  return (
    <div className="font-display bg-background-dark text-slate-100 min-h-screen">
      <div className="px-4 lg:px-40 flex flex-1 justify-center py-5">
        <div className="flex flex-col w-full max-w-[1200px] flex-1">

          {/* Header */}
          <header className="flex flex-col md:flex-row items-center justify-between whitespace-nowrap border-b border-solid border-border-dark px-4 md:px-10 py-4 gap-4 md:gap-0 bg-surface-dark/50 backdrop-blur-md rounded-2xl mb-6 shadow-sm">
            <div className="flex items-center gap-4 text-primary">
              <span className="material-symbols-outlined text-3xl">bolt</span>
              <h2 className="text-2xl font-bold leading-tight tracking-tight uppercase bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-500">JSON</h2>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
                <span className="material-symbols-outlined text-primary text-sm">location_on</span>
                <span className="text-sm font-medium">Jakarta, ID</span>
              </div>
              <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 text-emerald-400">
                <span className="material-symbols-outlined text-sm">account_balance_wallet</span>
                <span className="text-sm font-bold">Rp 2.500.000</span>
              </div>
              <button className="relative p-2 rounded-full hover:bg-white/5 transition-colors">
                <span className="material-symbols-outlined text-slate-200">notifications</span>
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-primary rounded-full animate-pulse"></span>
              </button>
              <div className="w-10 h-10 rounded-full border-2 border-primary/50 bg-primary/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">person</span>
              </div>
            </div>
          </header>

          {/* Search */}
          <div className="px-4 py-3 mb-4">
            {searchTab === 'product' ? (
              <label className="flex flex-col w-full h-14 relative group">
                <div className="flex w-full flex-1 items-stretch rounded-xl h-full shadow-sm group-hover:shadow-md transition-shadow">
                  <div className="text-slate-300 flex border-2 border-r-0 border-border-dark bg-surface-dark items-center justify-center pl-4 rounded-l-xl transition-colors group-focus-within:border-primary">
                    <span className="material-symbols-outlined">search</span>
                  </div>
                  <input
                    className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-slate-100 focus:outline-0 focus:ring-0 border-2 border-l-0 border-border-dark bg-surface-dark focus:border-primary h-full placeholder:text-slate-500 px-4 rounded-l-none pl-2 text-lg font-medium transition-colors"
                    placeholder="Cari nama barang limited..."
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                  />
                </div>
              </label>
            ) : (
              <form onSubmit={handleJastiperSearch} className="flex flex-col w-full h-14 relative group">
                <div className="flex w-full flex-1 items-stretch rounded-xl h-full shadow-sm group-hover:shadow-md transition-shadow">
                  <div className="text-slate-300 flex border-2 border-r-0 border-border-dark bg-surface-dark items-center justify-center pl-4 rounded-l-xl transition-colors group-focus-within:border-primary">
                    <span className="material-symbols-outlined">person_search</span>
                  </div>
                  <input
                    className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-slate-100 focus:outline-0 focus:ring-0 border-2 border-l-0 border-border-dark bg-surface-dark focus:border-primary h-full placeholder:text-slate-500 px-4 rounded-l-none pl-2 text-lg font-medium transition-colors"
                    placeholder="Masukkan ID jastiper..."
                    value={jastiperInput}
                    onChange={(e) => setJastiperInput(e.target.value)}
                  />
                  <button type="submit" className="bg-primary hover:bg-primary/90 text-white font-bold px-6 rounded-r-xl transition-colors">
                    Cari
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Tabs */}
          <div className="pb-4">
            <div className="flex border-b-2 border-border-dark px-4 gap-8">
              <button
                onClick={() => setSearchTab('product')}
                className={`flex flex-col items-center justify-center border-b-[3px] pb-3 pt-2 transition-colors ${
                  searchTab === 'product'
                    ? 'border-b-primary text-primary'
                    : 'border-b-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                <p className="text-sm font-bold tracking-wide uppercase">By Product</p>
              </button>
              <button
                onClick={() => setSearchTab('jastiper')}
                className={`flex flex-col items-center justify-center border-b-[3px] pb-3 pt-2 transition-colors ${
                  searchTab === 'jastiper'
                    ? 'border-b-primary text-primary'
                    : 'border-b-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                <p className="text-sm font-bold tracking-wide uppercase">By Jastiper</p>
              </button>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="mx-4 mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center py-20">
              <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && products.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <span className="material-symbols-outlined text-6xl mb-4">inventory_2</span>
              <p className="text-lg font-medium">Belum ada produk</p>
              <p className="text-sm">Coba cari dengan kata kunci lain</p>
            </div>
          )}

          {/* Product Grid */}
          {!loading && products.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-4">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="flex flex-col bg-surface-dark rounded-2xl overflow-hidden border border-border-dark shadow-lg hover:shadow-[0_0_20px_rgba(242,13,185,0.2)] hover:border-primary/50 transition-all duration-300 group"
                >
                  {/* Image placeholder */}
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-primary/20 to-purple-900/40">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="material-symbols-outlined text-6xl text-primary/40 group-hover:scale-110 transition-transform duration-500">
                        shopping_bag
                      </span>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                    {/* Badges */}
                    <div className="absolute top-3 left-3 flex gap-2">
                      {product.stock <= 3 && (
                        <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider shadow-sm flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">timer</span>
                          Limited
                        </span>
                      )}
                      {product.stock <= 5 && (
                        <span className="bg-yellow-400 text-black text-xs font-bold px-2 py-1 rounded-md shadow-sm flex items-center">
                          <span className="material-symbols-outlined text-[14px]">bolt</span>
                          War
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-5 flex flex-col gap-3">
                    <h3 className="font-bold text-lg leading-tight line-clamp-2">{product.name}</h3>
                    <div className="flex items-center justify-between">
                      <p className="text-primary font-bold text-xl">{formatRupiah(product.price)}</p>
                      <span className={`text-xs font-semibold px-2 py-1 rounded border ${getStockBadgeStyle(product.stock)}`}>
                        Sisa {product.stock}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">location_on</span>
                      {product.originLocation}
                    </div>
                    <button className="w-full mt-2 bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-sm">visibility</span>
                      Lihat Detail
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default InventoryPage;
