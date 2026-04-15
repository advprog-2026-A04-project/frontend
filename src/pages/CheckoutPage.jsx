import { startTransition, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import LoadingState from '../components/LoadingState';
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

  const subtotal = useMemo(() => {
    if (!product) {
      return 0;
    }

    return product.price * form.quantity;
  }, [product, form.quantity]);

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

    const rawDiscountValue = Number(matchedVoucher.discountValue || 0);
    if (matchedVoucher.discountType === 'PERCENT') {
      return Math.floor((subtotal * rawDiscountValue) / 100);
    }

    return rawDiscountValue;
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
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const result = await api.checkout({
        productId: product.id,
        quantity: form.quantity,
        shippingAddress: form.shippingAddress,
        voucherCode: form.voucherCode,
      });

      startTransition(() => {
        navigate(`/orders/${result.id}`, {
          state: {
            flash: 'Checkout completed successfully and the order is now paid.',
            success: true,
          },
        });
      });
    } catch (submissionError) {
      setError(submissionError.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!productId) {
    return (
      <div className="notice notice--danger">
        No product was selected. <Link to="/products">Go back to the catalog.</Link>
      </div>
    );
  }

  if (loading) {
    return <LoadingState label="Preparing checkout..." />;
  }

  if (error && !product) {
    return <div className="notice notice--danger">{error}</div>;
  }

  return (
    <section className="page">
      <div className="checkout-grid">
        <article className="card">
          <div className="section-head">
            <div>
              <p className="eyebrow">Checkout</p>
              <h1>Finish milestone 50% flow</h1>
            </div>
            <span className="pill pill--accent">Voucher field included</span>
          </div>

          <form className="form-stack" onSubmit={handleSubmit}>
            <label className="field">
              <span>Shipping address</span>
              <textarea
                className="textarea"
                value={form.shippingAddress}
                onChange={(event) =>
                  setForm((current) => ({ ...current, shippingAddress: event.target.value }))
                }
                required
              />
            </label>

            <div className="grid-two">
              <label className="field">
                <span>Quantity</span>
                <input
                  className="input"
                  max={product.stock}
                  min={1}
                  type="number"
                  value={form.quantity}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, quantity: Number(event.target.value) }))
                  }
                />
              </label>

              <label className="field">
                <span>Voucher code</span>
                <input
                  className="input"
                  placeholder="MILESTONE10"
                  value={form.voucherCode}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, voucherCode: event.target.value.toUpperCase() }))
                  }
                />
              </label>
            </div>

            {normalizedVoucherCode && (
              <div className={`notice ${matchedVoucher ? 'notice--success' : 'notice--danger'}`}>
                {matchedVoucher
                  ? `Code ${matchedVoucher.code} is currently active. Final validation and quota claim happen during checkout.`
                  : 'This code is not in the active voucher list. Order will reject invalid vouchers.'}
              </div>
            )}

            {error && <div className="notice notice--danger">{error}</div>}

            <button className="button button--block" disabled={submitting} type="submit">
              {submitting ? 'Processing checkout...' : 'Create order and pay'}
            </button>
          </form>
        </article>

        <aside className="stack">
          <article className="card">
            <h2>Order summary</h2>
            <div className="summary-list">
              <div className="summary-row">
                <span>Product</span>
                <strong>{product.name}</strong>
              </div>
              <div className="summary-row">
                <span>Subtotal</span>
                <strong>{formatCurrency(subtotal)}</strong>
              </div>
              <div className="summary-row">
                <span>Estimated discount</span>
                <strong>{formatCurrency(estimatedDiscount)}</strong>
              </div>
              <div className="summary-row summary-row--total">
                <span>Estimated total</span>
                <strong>{formatCurrency(estimatedTotal)}</strong>
              </div>
              <div className="summary-row">
                <span>Wallet balance</span>
                <strong>{formatCurrency(wallet?.balance)}</strong>
              </div>
            </div>
            <p className="muted">Order calculates the final payable amount after real voucher validation.</p>
          </article>

          <article className="card">
            <h2>Active vouchers</h2>
            <div className="stack stack--tight">
              {vouchers.length === 0 && <p className="muted">No active vouchers were returned.</p>}
              {vouchers.map((voucher) => (
                <div className="service-panel" key={voucher.code}>
                  <div className="service-panel__top">
                    <strong>{voucher.code}</strong>
                    <span className="pill pill--success">{voucher.discountType}</span>
                  </div>
                  <p className="muted">
                    Discount {voucher.discountValue}
                    {voucher.discountType === 'PERCENT' ? '%' : ''} with minimum spend{' '}
                    {formatCurrency(voucher.minSpend || 0)}.
                  </p>
                </div>
              ))}
            </div>
          </article>
        </aside>
      </div>
    </section>
  );
}
