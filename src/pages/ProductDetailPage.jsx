import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import LoadingState from '../components/LoadingState';
import PageShell from '../components/PageShell';
import ProductImage from '../components/ProductImage';
import { useSession } from '../context/SessionContext';
import { api } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/format';
import { findProductReviewFromOrders, readStoredProductReview } from '../lib/productReviews';

export default function ProductDetailPage() {
  const navigate = useNavigate();
  const { productId } = useParams();
  const { isAuthenticated, user } = useSession();
  const [product, setProduct] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [productReview, setProductReview] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const isAdmin = user?.role === 'ADMIN';
  const canCheckout = isAuthenticated && !isAdmin;

  useEffect(() => {
    let cancelled = false;

    async function loadProduct() {
      setLoading(true);
      setError('');

      try {
        const productPromise = api.getProduct(productId);
        const walletPromise = user && !isAdmin ? api.getWallet(user.id) : Promise.resolve(null);
        const ordersPromise = user?.role === 'TITIPER' ? api.listOrders().catch(() => []) : Promise.resolve([]);
        const [productResult, walletResult, orderResult] = await Promise.all([productPromise, walletPromise, ordersPromise]);

        if (!cancelled) {
          setProduct(productResult);
          setWallet(walletResult);
          setProductReview(
            findProductReviewFromOrders(orderResult, productId, user?.id)
              || readStoredProductReview(productId, user?.id),
          );
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
  }, [isAdmin, productId, user]);

  if (loading) {
    return <LoadingState label="Loading product..." />;
  }

  if (error || !product) {
    return (
      <PageShell active="browse">
        <div className="rounded-[22px] border border-rose-400/20 bg-rose-500/10 p-6 text-rose-200">
          {error || 'Product not found.'}
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell active="browse" walletBalance={wallet?.balance ?? null}>
      <section className="space-y-8">
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
          <Link className="hover:text-cyan" to="/">
            Home
          </Link>
          <span>/</span>
          <Link className="hover:text-cyan" to="/browse">
            Flash Sale
          </Link>
          <span>/</span>
          <span className="text-white">{product.category || product.originLocation || 'Product detail'}</span>
        </div>

        <article className="detail-layout grid gap-8 lg:grid-cols-[1fr_0.95fr]">
          <div className="overflow-hidden rounded-[30px] border border-white/10 bg-white/5 p-3 backdrop-blur-md">
            <div className="relative overflow-hidden rounded-[24px]">
              <ProductImage className="aspect-[4/4.4] h-full w-full object-cover" product={product} />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B0914]/70 via-transparent to-transparent" />
              <div className="absolute left-5 top-5 flex flex-wrap gap-2">
                <span className="rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-fuchsia-200">
                  Limited
                </span>
                <span
                  className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${
                    product.stock <= 3
                      ? 'border-rose-400/30 bg-rose-500/10 text-rose-300'
                      : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300'
                  }`}
                >
                  {product.stock > 0 ? `${product.stock} units` : 'Out of stock'}
                </span>
              </div>
            </div>
          </div>

          <div className="detail-copy space-y-6">
            <div className="space-y-4 rounded-[30px] border border-white/10 bg-white/5 p-8 backdrop-blur-md">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-cyan/20 bg-cyan/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-cyan">
                  {product.category || 'Limited Drop'}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-300">
                  {product.originLocation || 'Global'}
                </span>
              </div>

              <div>
                <h1 className="text-4xl font-black tracking-tight text-white">{product.name}</h1>
                <p className="mt-4 text-base leading-7 text-slate-300">{product.description}</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[22px] border border-white/10 bg-[#13112A]/75 p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Price</p>
                  <p className="mt-2 text-3xl font-black text-cyan">{formatCurrency(product.price)}</p>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-[#13112A]/75 p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Purchase Date</p>
                  <p className="mt-2 text-lg font-bold text-white">{formatDate(product.purchaseDate)}</p>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-[#13112A]/75 p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Return Date</p>
                  <p className="mt-2 text-lg font-bold text-white">{formatDate(product.returnDate)}</p>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-[#13112A]/75 p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Origin</p>
                  <p className="mt-2 text-lg font-bold text-white">{product.originLocation || '-'}</p>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-[#13112A]/75 p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Jastiper ID</p>
                  <p className="mt-2 text-lg font-bold text-white">{product.jastiperId ?? '-'}</p>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-[#13112A]/75 p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Rating</p>
                  <p className="mt-2 text-lg font-bold text-white">
                    {product.avgRating ? `${Number(product.avgRating).toFixed(1)} / 5` : 'New drop'}
                  </p>
                </div>
              </div>
            </div>

            {productReview && (
              <div className="rounded-[30px] border border-emerald-400/20 bg-emerald-500/10 p-8 backdrop-blur-md" data-testid="product-review-summary">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">Your submitted review</p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[22px] border border-white/10 bg-[#13112A]/65 p-5">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Product rating</p>
                    <p className="mt-2 text-lg font-bold text-white">{productReview.productRating}/5</p>
                  </div>
                  <div className="rounded-[22px] border border-white/10 bg-[#13112A]/65 p-5">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Jastiper rating</p>
                    <p className="mt-2 text-lg font-bold text-white">{productReview.jastiperRating}/5</p>
                  </div>
                </div>
                <p className="mt-4 rounded-[20px] border border-white/10 bg-[#13112A]/65 p-4 text-sm text-slate-200">
                  {productReview.comment || 'No comment.'}
                </p>
              </div>
            )}

            <div className="space-y-5 rounded-[30px] border border-white/10 bg-white/5 p-8 backdrop-blur-md">
              {wallet && (
                <div className="rounded-[22px] border border-emerald-400/20 bg-emerald-500/10 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">Wallet Balance</p>
                  <p className="mt-2 text-xl font-black text-white">{formatCurrency(wallet.balance)}</p>
                </div>
              )}

              <div>
                <label className="mb-3 block text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                  Quantity
                </label>
                <div className="flex items-center gap-4">
                  <button
                    className="flex h-12 w-12 items-center justify-center rounded-full border border-cyan/30 bg-cyan/10 text-cyan transition-colors hover:bg-cyan/20"
                    onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                    type="button"
                  >
                    <span className="material-symbols-outlined">remove</span>
                  </button>
                  <div className="min-w-16 text-center text-2xl font-black text-white">{quantity}</div>
                  <button
                    className="flex h-12 w-12 items-center justify-center rounded-full border border-cyan/30 bg-cyan/10 text-cyan transition-colors hover:bg-cyan/20"
                    onClick={() => setQuantity((current) => Math.min(product.stock, current + 1))}
                    type="button"
                  >
                    <span className="material-symbols-outlined">add</span>
                  </button>
                </div>
              </div>

              <div className="rounded-[22px] border border-white/10 bg-[#13112A]/75 p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-400">Estimated total</span>
                  <strong className="text-2xl font-black text-white">{formatCurrency(product.price * quantity)}</strong>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan to-blue-500 px-6 py-3 text-sm font-black uppercase tracking-[0.18em] text-[#0B0914] shadow-[0_0_22px_rgba(0,240,255,0.35)] disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={product.stock < 1 || isAdmin}
                  onClick={() =>
                    navigate(
                      canCheckout
                        ? `/checkout?productId=${product.id}&qty=${quantity}`
                        : '/login',
                      {
                        state: canCheckout
                          ? undefined
                          : {
                              from: `/checkout?productId=${product.id}&qty=${quantity}`,
                            },
                      },
                    )
                  }
                  type="button"
                >
                  <span className="material-symbols-outlined text-base">shopping_cart_checkout</span>
                  {isAdmin ? 'Admin Cannot Checkout' : isAuthenticated ? 'Checkout Now' : 'Log In to Checkout'}
                </button>
                <Link
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white transition-colors hover:border-cyan/30 hover:text-cyan"
                  to="/browse"
                >
                  <span className="material-symbols-outlined text-base">arrow_back</span>
                  Back to Catalog
                </Link>
              </div>
            </div>
          </div>
        </article>
      </section>
    </PageShell>
  );
}
