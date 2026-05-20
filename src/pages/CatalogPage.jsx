import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import LoadingState from '../components/LoadingState';
import PageShell from '../components/PageShell';
import ProductCard from '../components/ProductCard';
import { api } from '../lib/api';

export default function CatalogPage() {
  const [query, setQuery] = useState('');
  const [jastiperId, setJastiperId] = useState('');
  const [searchMode, setSearchMode] = useState('product');
  const [activeCategory, setActiveCategory] = useState('All');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      setLoading(true);
      setError('');

      try {
        const data = searchMode === 'jastiper' && jastiperId.trim()
          ? await api.listProductsByJastiper(jastiperId.trim())
          : await api.listProducts(deferredQuery);
        if (!cancelled) {
          setProducts(data);
          setActiveCategory('All');
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProducts();

    return () => {
      cancelled = true;
    };
  }, [deferredQuery, jastiperId, searchMode]);

  const categories = useMemo(() => {
    const values = new Set(
      products
        .map((product) => product.category || product.originLocation || '')
        .filter(Boolean),
    );
    return ['All', ...Array.from(values)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (activeCategory === 'All') {
      return products;
    }

    return products.filter(
      (product) => (product.category || product.originLocation || '') === activeCategory,
    );
  }, [activeCategory, products]);

  return (
    <PageShell active="browse" showSearch>
      <section className="space-y-8">
        <article className="overflow-hidden rounded-[32px] border border-white/10 bg-[#13112A]/80 p-8 shadow-[0_0_36px_rgba(0,240,255,0.08)]">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan/20 bg-cyan/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-cyan">
                <span className="material-symbols-outlined text-base">sensors</span>
                Flash Sale Directory
              </span>
              <h1 className="text-4xl font-black tracking-tight text-white">Browse the newest limited drops.</h1>
              <p className="max-w-2xl text-base text-slate-300">
                This page follows the newly attached storefront UI while querying the existing Inventory service and
                preserving the Milestone 75 checkout path.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex rounded-[20px] border border-white/10 bg-white/5 p-1">
                {['product', 'jastiper'].map((mode) => (
                  <button
                    key={mode}
                    className={`flex-1 rounded-[16px] px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] ${
                      searchMode === mode ? 'bg-cyan text-[#0B0914]' : 'text-slate-300'
                    }`}
                    onClick={() => setSearchMode(mode)}
                    type="button"
                  >
                    {mode === 'product' ? 'Product' : 'Jastiper'}
                  </button>
                ))}
              </div>
              {searchMode === 'product' ? (
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Product Search</span>
                  <div className="flex items-center gap-3 rounded-[20px] border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-md">
                    <span className="material-symbols-outlined text-cyan">search</span>
                    <input
                      className="w-full bg-transparent text-base text-white outline-none placeholder:text-slate-500"
                      placeholder="Search limited items..."
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                    />
                  </div>
                </label>
              ) : (
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Jastiper ID</span>
                  <div className="flex items-center gap-3 rounded-[20px] border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-md">
                    <span className="material-symbols-outlined text-cyan">person_search</span>
                    <input
                      className="w-full bg-transparent text-base text-white outline-none placeholder:text-slate-500"
                      placeholder="Browse products from a Jastiper..."
                      value={jastiperId}
                      onChange={(event) => setJastiperId(event.target.value)}
                    />
                  </div>
                </label>
              )}
            </div>
          </div>
        </article>

        <section className="space-y-4">
          <div className="flex flex-wrap gap-3">
            {categories.map((category) => (
              <button
                key={category}
                className={`rounded-full px-5 py-2.5 text-sm font-bold uppercase tracking-[0.16em] transition-all ${
                  activeCategory === category
                    ? 'border border-fuchsia-400/30 bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white shadow-[0_0_18px_rgba(217,0,255,0.24)]'
                    : 'border border-white/10 bg-white/5 text-slate-300 hover:border-cyan/30 hover:text-cyan'
                }`}
                onClick={() => setActiveCategory(category)}
                type="button"
              >
                {category}
              </button>
            ))}
          </div>

          {loading && <LoadingState label="Loading catalog..." />}
          {error && <div className="rounded-[22px] border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div>}

          {!loading && !error && filteredProducts.length === 0 && (
            <div className="rounded-[24px] border border-dashed border-white/15 bg-white/5 p-12 text-center text-slate-400">
              No products matched this search.
            </div>
          )}

          {!loading && filteredProducts.length > 0 && (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>
      </section>
    </PageShell>
  );
}
