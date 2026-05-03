import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import LoadingState from '../components/LoadingState';
import ProductImage from '../components/ProductImage';
import { api } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/format';

export default function ProductDetailPage() {
  const navigate = useNavigate();
  const { productId } = useParams();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadProduct() {
      setLoading(true);
      setError('');

      try {
        const data = await api.getProduct(productId);
        if (!cancelled) {
          setProduct(data);
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

    loadProduct();

    return () => {
      cancelled = true;
    };
  }, [productId]);

  if (loading) {
    return <LoadingState label="Loading product..." />;
  }

  if (error || !product) {
    return <div className="notice notice--danger">{error || 'Product not found.'}</div>;
  }

  return (
    <section className="page">
      <article className="detail-layout">
        <div className="detail-media">
          <ProductImage product={product} />
        </div>

        <div className="detail-copy">
          <div className="pill-row">
            <span className="pill">{product.category || product.originLocation || 'Limited drop'}</span>
            <span className={`pill ${product.stock <= 3 ? 'pill--warn' : 'pill--success'}`}>
              Stock {product.stock}
            </span>
          </div>

          <h1>{product.name}</h1>
          <p className="lead lead--compact">{product.description}</p>

          <div className="metric-grid">
            <div className="metric-card">
              <span>Price</span>
              <strong>{formatCurrency(product.price)}</strong>
            </div>
            <div className="metric-card">
              <span>Origin</span>
              <strong>{product.originLocation}</strong>
            </div>
            <div className="metric-card">
              <span>Buyer window</span>
              <strong>{formatDate(product.purchaseDate)}</strong>
            </div>
          </div>

          <label className="field">
            <span>Quantity</span>
            <input
              className="input input--small"
              max={product.stock}
              min={1}
              type="number"
              value={quantity}
              onChange={(event) => setQuantity(Number(event.target.value))}
            />
          </label>

          <div className="button-row">
            <button
              className="button"
              onClick={() => navigate(`/checkout?productId=${product.id}&qty=${quantity}`)}
              type="button"
            >
              Buy now
            </button>
            <Link className="button button--secondary" to="/products">
              Back to products
            </Link>
          </div>
        </div>
      </article>
    </section>
  );
}
