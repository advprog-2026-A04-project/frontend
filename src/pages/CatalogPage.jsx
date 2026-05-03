import { useDeferredValue, useEffect, useState } from 'react';
import LoadingState from '../components/LoadingState';
import ProductCard from '../components/ProductCard';
import { api } from '../lib/api';

export default function CatalogPage() {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      setLoading(true);
      setError('');

      try {
        const data = await api.listProducts(deferredQuery);
        if (!cancelled) {
          setProducts(data);
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
  }, [deferredQuery]);

  return (
    <section className="page">
      <article className="card card--hero">
        <div className="section-head">
          <div>
            <p className="eyebrow">Catalog</p>
            <h1>Browse demo-ready products</h1>
          </div>
          <span className="pill pill--accent">Inventory checked at checkout</span>
        </div>

        <label className="field field--search">
          <span>Search</span>
          <input
            className="input"
            placeholder="Try sneakers, beauty, Singapore, or a jastiper name"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </article>

      {loading && <LoadingState label="Loading catalog..." />}
      {error && <div className="notice notice--danger">{error}</div>}

      {!loading && !error && products.length === 0 && (
        <div className="empty-state">
          <h2>No products matched that search.</h2>
          <p>Try a broader keyword or clear the search input.</p>
        </div>
      )}

      {!loading && products.length > 0 && (
        <div className="product-grid">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
}
