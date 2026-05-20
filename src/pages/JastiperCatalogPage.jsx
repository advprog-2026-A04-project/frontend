import { useCallback, useEffect, useMemo, useState } from 'react';
import LoadingState from '../components/LoadingState';
import PageShell from '../components/PageShell';
import { api } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/format';

const EMPTY_FORM = {
  name: '',
  description: '',
  price: 100000,
  stock: 1,
  originLocation: '',
  purchaseDate: '',
  returnDate: '',
};

function toProductPayload(form) {
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    price: Number(form.price),
    stock: Number(form.stock),
    originLocation: form.originLocation.trim(),
    purchaseDate: form.purchaseDate,
    returnDate: form.returnDate,
  };
}

function toForm(product) {
  return {
    name: product.name || '',
    description: product.description || '',
    price: Number(product.price || 0),
    stock: Number(product.stock || 0),
    originLocation: product.originLocation || '',
    purchaseDate: product.purchaseDate || '',
    returnDate: product.returnDate || '',
  };
}

export default function JastiperCatalogPage() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingProductId, setEditingProductId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const totalStock = useMemo(
    () => products.reduce((total, product) => total + Number(product.stock || 0), 0),
    [products],
  );

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      setProducts(await api.listMyProducts());
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function startEdit(product) {
    setEditingProductId(product.id);
    setForm(toForm(product));
    setMessage('');
    setError('');
  }

  function resetForm() {
    setEditingProductId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setBusyKey('catalog-form');
    setError('');
    setMessage('');

    try {
      const payload = toProductPayload(form);
      if (editingProductId) {
        await api.updateProduct(editingProductId, payload);
        setMessage('Product updated.');
      } else {
        await api.createProduct(payload);
        setMessage('Product created.');
      }
      resetForm();
      await loadProducts();
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setBusyKey('');
    }
  }

  async function handleDelete(productId) {
    setBusyKey(`delete-${productId}`);
    setError('');
    setMessage('');

    try {
      await api.deleteProduct(productId);
      setMessage('Product deleted.');
      if (editingProductId === productId) {
        resetForm();
      }
      await loadProducts();
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setBusyKey('');
    }
  }

  if (loading) {
    return <LoadingState label="Loading catalog manager..." />;
  }

  return (
    <PageShell active="jastiper">
      <section className="space-y-6">
        <article className="card card--hero">
          <div className="section-head">
            <div>
              <p className="eyebrow">Jastiper Catalog</p>
              <h1>Manage products and stock</h1>
            </div>
            <span className="pill pill--accent">{products.length} products</span>
          </div>
          <div className="summary-list">
            <div className="summary-row">
              <span>Total Stock</span>
              <strong>{totalStock}</strong>
            </div>
          </div>
        </article>

        {message && <div className="notice notice--success">{message}</div>}
        {error && <div className="notice notice--danger">{error}</div>}

        <div className="grid-two">
          <article className="card">
            <div className="section-head">
              <div>
                <p className="eyebrow">Product Form</p>
                <h2>{editingProductId ? 'Edit product' : 'Create product'}</h2>
              </div>
              {editingProductId && (
                <button className="button button--ghost" onClick={resetForm} type="button">
                  Reset
                </button>
              )}
            </div>

            <form className="form-stack" onSubmit={handleSubmit}>
              <label className="field">
                <span>Name</span>
                <input className="input" required value={form.name} onChange={(event) => updateField('name', event.target.value)} />
              </label>
              <label className="field">
                <span>Description</span>
                <textarea
                  className="input min-h-28"
                  required
                  value={form.description}
                  onChange={(event) => updateField('description', event.target.value)}
                />
              </label>
              <div className="grid-two">
                <label className="field">
                  <span>Price</span>
                  <input
                    className="input"
                    min={1}
                    required
                    type="number"
                    value={form.price}
                    onChange={(event) => updateField('price', event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Stock</span>
                  <input
                    className="input"
                    min={0}
                    required
                    type="number"
                    value={form.stock}
                    onChange={(event) => updateField('stock', event.target.value)}
                  />
                </label>
              </div>
              <label className="field">
                <span>Origin Location</span>
                <input
                  className="input"
                  required
                  value={form.originLocation}
                  onChange={(event) => updateField('originLocation', event.target.value)}
                />
              </label>
              <div className="grid-two">
                <label className="field">
                  <span>Purchase Date</span>
                  <input
                    className="input"
                    required
                    type="date"
                    value={form.purchaseDate}
                    onChange={(event) => updateField('purchaseDate', event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Return Date</span>
                  <input
                    className="input"
                    required
                    type="date"
                    value={form.returnDate}
                    onChange={(event) => updateField('returnDate', event.target.value)}
                  />
                </label>
              </div>
              <button className="button button--block" disabled={busyKey === 'catalog-form'} type="submit">
                {editingProductId ? 'Update product' : 'Create product'}
              </button>
            </form>
          </article>

          <article className="card">
            <div className="section-head">
              <div>
                <p className="eyebrow">My Products</p>
                <h2>Catalog entries</h2>
              </div>
            </div>
            <div className="order-list">
              {products.map((product) => (
                <article className="service-panel" key={product.id}>
                  <div className="service-panel__top">
                    <div>
                      <strong>{product.name}</strong>
                      <p className="muted">{product.originLocation} | stock {product.stock}</p>
                    </div>
                    <strong>{formatCurrency(product.price)}</strong>
                  </div>
                  <p className="muted">
                    Window {formatDate(product.purchaseDate)} - {formatDate(product.returnDate)}
                  </p>
                  <div className="button-row">
                    <button className="button button--secondary" onClick={() => startEdit(product)} type="button">
                      Edit
                    </button>
                    <button
                      className="button button--ghost"
                      disabled={busyKey === `delete-${product.id}`}
                      onClick={() => handleDelete(product.id)}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
              {products.length === 0 && (
                <div className="empty-state">
                  <h2>No products yet.</h2>
                  <p>Create the first catalog entry to start receiving orders.</p>
                </div>
              )}
            </div>
          </article>
        </div>
      </section>
    </PageShell>
  );
}
