import { Link } from 'react-router-dom';
import { formatCurrency } from '../lib/format';
import ProductImage from './ProductImage';

export default function ProductCard({ product }) {
  return (
    <article className="product-card group overflow-hidden rounded-[24px] border border-white/10 bg-white/5 backdrop-blur-md transition-all duration-300 hover:border-cyan/30 hover:bg-white/10">
      <Link className="relative block aspect-[4/3] overflow-hidden" to={`/product/${product.id}`}>
        <ProductImage
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          product={product}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0914]/85 via-transparent to-transparent" />
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <span className="rounded-full border border-cyan/20 bg-cyan/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-cyan">
            {product.category || product.originLocation || 'Limited drop'}
          </span>
          <span
            className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${
              product.stock <= 3
                ? 'border-rose-400/30 bg-rose-500/10 text-rose-300'
                : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300'
            }`}
          >
            Stock {product.stock}
          </span>
        </div>
      </Link>

      <div className="space-y-4 p-5">
        <div>
          <h3 className="line-clamp-2 text-lg font-bold text-white transition-colors group-hover:text-cyan">
            {product.name}
          </h3>
          <p className="mt-2 line-clamp-2 text-sm text-slate-400">{product.description}</p>
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            Jastiper ID: {product.jastiperId ?? '-'}
          </p>
        </div>

        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Price</p>
            <strong className="text-xl font-black text-cyan">{formatCurrency(product.price)}</strong>
          </div>
          <span className="text-xs font-medium text-slate-400">{product.originLocation || 'Global pickup'}</span>
        </div>

        <Link
          className="flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white transition-all hover:border-cyan/30 hover:bg-cyan/15 hover:text-cyan"
          to={`/product/${product.id}`}
        >
          <span className="material-symbols-outlined text-base">shopping_cart</span>
          View details
        </Link>
      </div>
    </article>
  );
}
