import { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import LoadingState from '../components/LoadingState';
import PageShell from '../components/PageShell';
import ProductImage from '../components/ProductImage';
import { useSession } from '../context/SessionContext';
import { api } from '../lib/api';
import { formatCurrency } from '../lib/format';

export default function CheckoutPage() {
  const { user } = useSession();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const productId = searchParams.get('productId');
  const initialQty = Number(searchParams.get('qty') || 1);

  const [product, setProduct] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [vouchers, setVouchers] = useState([]);
  const [form, setForm] = useState({
    quantity: initialQty,
    shippingAddress: 'Jl. Mawar No. 1, Jakarta',
    voucherCode: '',
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Generate one idempotency key per checkout session — stable across re-renders,
  // resets only when the user navigates away and comes back.
  const idempotencyKeyRef = useRef(crypto.randomUUID());

  const subtotal = useMemo(() => (product ? product.price * form.quantity : 0), [form.quantity, product]);
  const normalizedVoucherCode = form.voucherCode.trim().toUpperCase();
  const matchedVoucher = useMemo(
    () => vouchers.find((voucher) => voucher.code === normalizedVoucherCode) || null,
    [normalizedVoucherCode, vouchers],
  );
  const estimatedDiscount = useMemo(() => {
    if (!matchedVoucher) {
      return 0;
    }

    if (subtotal < Number(matchedVoucher.minSpend || 0)) {
      return 0;
    }

    const rawValue = Number(matchedVoucher.discountValue || 0);
    if (matchedVoucher.discountType === 'PERCENT') {
      return Math.floor((subtotal * rawValue) / 100);
    }

    return rawValue;
  }, [matchedVoucher, subtotal]);
  const estimatedTotal = Math.max(subtotal - estimatedDiscount, 0);

  useEffect(() => {
    let cancelled = false;

    async function loadCheckoutState() {
      setLoading(true);
      setError('');

      try {
        const [productResult, walletResult, voucherResult] = await Promise.all([
          api.getProduct(productId),
          api.getWallet(user.id),
          api.listActiveVouchers(),
        ]);

        if (!cancelled) {
          setProduct(productResult);
          setWallet(walletResult);
          setVouchers(voucherResult);
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

    if (productId) {
      loadCheckoutState();
    }

    return () => {
      cancelled = true;
    };
  }, [productId, user.id]);

  async function handleSubmit(event) {
    event?.preventDefault?.();

    // Prevent double-submit if already processing
    if (submitting) return;

    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      if (!product) {
        throw new Error('Product is not ready for checkout yet.');
      }

      const result = await api.checkout({
        productId: product.id,
        quantity: form.quantity,
        shippingAddress: form.shippingAddress,
        voucherCode: form.voucherCode,
        idempotencyKey: idempotencyKeyRef.current,
      });

      startTransition(() => {
        navigate(`/success?orderId=${result.id}`, {
          state: {
            flash: 'Checkout completed successfully and the order is now paid.',
            success: true,
          },
        });
      });
    } catch (submissionError) {
      setError(submissionError.message);
      setSubmitting(false);
    }
  }

  if (!productId) {
    return (
      <PageShell active="browse">
        <div className="rounded-[22px] border border-rose-400/20 bg-rose-500/10 p-6 text-rose-200">
          No product was selected. <Link to="/browse">Go back to the catalog.</Link>
        </div>
      </PageShell>
    );
  }

  if (loading) {
    return <LoadingState label="Preparing checkout..." />;
  }

  if (error && !product) {
    return (
      <PageShell active="browse">
        <div className="rounded-[22px] border border-rose-400/20 bg-rose-500/10 p-6 text-rose-200">{error}</div>
      </PageShell>
    );
  }

  return (
    <PageShell active="browse" walletBalance={wallet?.balance ?? null}>
      <section className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Checkout</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-white">Complete your order.</h1>
          </div>
          <Link className="text-sm font-bold uppercase tracking-[0.18em] text-cyan" to={`/product/${product.id}`}>
            Back to Product
          </Link>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <article className="rounded-[30px] border border-white/10 bg-white/5 p-6 backdrop-blur-md sm:p-8">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan/15 text-cyan">
                  <span className="material-symbols-outlined">shopping_bag</span>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Order Item</p>
                  <h2 className="text-2xl font-black text-white">Selected drop</h2>
                </div>
              </div>

              <div className="flex flex-col gap-5 rounded-[24px] border border-white/10 bg-[#13112A]/75 p-4 sm:flex-row">
                <div className="w-full overflow-hidden rounded-[20px] sm:w-40">
                  <ProductImage className="aspect-square h-full w-full object-cover" product={product} />
                </div>
                <div className="flex flex-1 flex-col justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-black text-white">{product.name}</h3>
                    <p className="mt-2 text-sm text-slate-400">{product.description}</p>
                  </div>
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Unit price</p>
                      <p className="mt-2 text-2xl font-black text-cyan">{formatCurrency(product.price)}</p>
                    </div>
                    <label className="flex flex-col gap-2">
                      <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Quantity</span>
                      <input
                        className="w-32 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
                        max={product.stock}
                        min={1}
                        type="number"
                        value={form.quantity}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, quantity: Number(event.target.value) }))
                        }
                      />
                    </label>
                  </div>
                </div>
              </div>
            </article>

            <article className="rounded-[30px] border border-white/10 bg-white/5 p-6 backdrop-blur-md sm:p-8">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-fuchsia-500/15 text-fuchsia-300">
                  <span className="material-symbols-outlined">local_shipping</span>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Shipping</p>
                  <h2 className="text-2xl font-black text-white">Delivery details</h2>
                </div>
              </div>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-bold text-white">Shipping address</span>
                <textarea
                  className="min-h-32 rounded-[24px] border border-white/10 bg-[#13112A]/75 px-5 py-4 text-white outline-none"
                  value={form.shippingAddress}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, shippingAddress: event.target.value }))
                  }
                  required
                />
              </label>
            </article>
          </form>

          <aside className="space-y-6">
            <article className="rounded-[30px] border border-white/10 bg-white/5 p-6 backdrop-blur-md sm:p-8">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300">
                  <span className="material-symbols-outlined">sell</span>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Voucher</p>
                  <h2 className="text-2xl font-black text-white">Apply a code</h2>
                </div>
              </div>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-bold text-white">Voucher code</span>
                <input
                  className="rounded-[20px] border border-white/10 bg-[#13112A]/75 px-5 py-4 text-white outline-none placeholder:text-slate-500"
                  placeholder="MILESTONE10"
                  value={form.voucherCode}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, voucherCode: event.target.value.toUpperCase() }))
                  }
                />
              </label>

              {normalizedVoucherCode && (
                <div
                  className={`mt-4 rounded-[20px] border p-4 text-sm ${
                    matchedVoucher
                      ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200'
                      : 'border-rose-400/20 bg-rose-500/10 text-rose-200'
                  }`}
                >
                  {matchedVoucher
                    ? `Code ${matchedVoucher.code} is currently active. Final validation and quota claim happen during checkout.`
                    : 'This code is not in the active voucher list. Order will reject invalid vouchers.'}
                </div>
              )}

              <div className="mt-5 space-y-3">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Public active vouchers</p>
                <div className="space-y-3">
                  {vouchers.length === 0 && <p className="text-sm text-slate-400">No active vouchers were returned.</p>}
                  {vouchers.map((voucher) => (
                    <div className="rounded-[20px] border border-white/10 bg-[#13112A]/75 p-4" key={voucher.code}>
                      <div className="flex items-center justify-between gap-3">
                        <strong className="text-sm font-black uppercase tracking-[0.16em] text-white">{voucher.code}</strong>
                        <span className="rounded-full border border-cyan/20 bg-cyan/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-cyan">
                          {voucher.discountType}
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-slate-400">
                        Discount {voucher.discountValue}
                        {voucher.discountType === 'PERCENT' ? '%' : ''} | min spend {formatCurrency(voucher.minSpend || 0)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </article>

            <article className="rounded-[30px] border border-white/10 bg-white/5 p-6 backdrop-blur-md sm:p-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-400">Subtotal</span>
                  <strong className="text-lg text-white">{formatCurrency(subtotal)}</strong>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-400">Estimated discount</span>
                  <strong className="text-lg text-emerald-300">{formatCurrency(estimatedDiscount)}</strong>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-400">Wallet balance</span>
                  <strong className="text-lg text-white">{formatCurrency(wallet?.balance)}</strong>
                </div>
                <div className="border-t border-white/10 pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-base font-bold text-white">Estimated total</span>
                    <strong className="text-3xl font-black text-cyan">{formatCurrency(estimatedTotal)}</strong>
                  </div>
                </div>
              </div>

              {message && <div className="mt-4 rounded-[20px] border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">{message}</div>}
              {error && <div className="mt-4 rounded-[20px] border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div>}

              <button
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan to-blue-500 px-6 py-4 text-sm font-black uppercase tracking-[0.18em] text-[#0B0914] shadow-[0_0_22px_rgba(0,240,255,0.35)] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={submitting}
                onClick={handleSubmit}
                type="submit"
              >
                <span className="material-symbols-outlined text-base">shopping_cart_checkout</span>
                {submitting ? 'Processing Checkout...' : 'Checkout Now'}
              </button>

              {submitting && (
                <p className="mt-3 text-center text-xs text-slate-500">
                  Please wait — do not click again or refresh the page.
                </p>
              )}
            </article>
          </aside>
        </div>
      </section>
    </PageShell>
  );
}