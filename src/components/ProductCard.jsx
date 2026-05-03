import { Link } from 'react-router-dom';
import { formatCurrency } from '../lib/format';
import ProductImage from './ProductImage';

export default function ProductCard({ product }) {
  return (
    <article className="product-card">
      <div className="product-card__media">
        <ProductImage product={product} />
      </div>
      <div className="product-card__body">
        <div className="pill-row">
          <span className="pill">{product.category || product.originLocation || 'Limited drop'}</span>
          <span className={`pill ${product.stock <= 3 ? 'pill--warn' : 'pill--success'}`}>
            Stock {product.stock}
          </span>
        </div>
        <h3>{product.name}</h3>
        <p className="muted">{product.description}</p>
        <div className="product-card__meta">
          <strong>{formatCurrency(product.price)}</strong>
          <span>{product.originLocation}</span>
        </div>
        <Link className="button button--secondary button--block" to={`/products/${product.id}`}>
          View details
        </Link>
      </div>
    </article>
  );
}
