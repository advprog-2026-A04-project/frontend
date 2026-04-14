import { startTransition, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import LoadingState from '../components/LoadingState';
import { api } from '../lib/api';
import { formatCurrency } from '../lib/format';

export default function CheckoutPage() {
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
    voucherCode: 'MILESTONE10',
  });
  const [voucherPreview, setVoucherPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [validatingVoucher, setValidatingVoucher] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const subtotal = useMemo(() => {
    if (!product) {
      return 0;
    }

    return product.price * form.quantity;
  }, [product, form.quantity]);

  const previewTotal = Math.max(subtotal - Number(voucherPreview?.discountAmount || 0), 0);

  useEffect(() => {
    let cancelled = false;

    async function loadCheckoutState() {
      setLoading(true);
      setError('');

      try {
        const [productResult, walletResult, voucherResult] = await Promise.all([
          api.getProduct(productId),
          api.getWallet(),
          api.listActiveVouchers(),
        ]);

        if (!cancelled) {
          setProduct(productResult.product);
          setWallet(walletResult);
          setVouchers(voucherResult.items);
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
  }, [productId]);

  async function handleVoucherCheck() {
    if (!form.voucherCode.trim()) {
      setVoucherPreview(null);
      return;
    }

    setValidatingVoucher(true);
    setError('');

    try {
      const result = await api.validateVoucher({
        code: form.voucherCode,
        orderAmount: subtotal,
      });
      setVoucherPreview(result);
    } catch (validationError) {
      setError(validationError.message);
    } finally {
      setValidatingVoucher(false);
    }
  }

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
        navigate(`/orders/${result.order.id}`, {
          state: {
            flash: result.message,
            success: result.success,
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
    return <LoadingState label="Preparing checkout…" />;
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
                  onChange={(event) => {
                    setForm((current) => ({ ...current, quantity: Number(event.target.value) }));
                    setVoucherPreview(null);
                  }}
                />
              </label>

              <label className="field">
                <span>Voucher code</span>
                <input
                  className="input"
                  placeholder="MILESTONE10"
                  value={form.voucherCode}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, voucherCode: event.target.value.toUpperCase() }));
                    setVoucherPreview(null);
                  }}
                />
              </label>
            </div>

            <button
              className="button button--secondary"
              disabled={validatingVoucher}
              onClick={handleVoucherCheck}
              type="button"
            >
              {validatingVoucher ? 'Checking voucher…' : 'Validate voucher'}
            </button>

            {voucherPreview && (
              <div className={`notice ${voucherPreview.valid ? 'notice--success' : 'notice--danger'}`}>
                {voucherPreview.valid
                  ? `Voucher valid. Discount ${formatCurrency(voucherPreview.discountAmount)}.`
                  : voucherPreview.message}
              </div>
            )}

            {error && <div className="notice notice--danger">{error}</div>}

            <button className="button button--block" disabled={submitting} type="submit">
              {submitting ? 'Processing checkout…' : 'Create order and pay'}
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
                <span>Discount</span>
                <strong>{formatCurrency(voucherPreview?.discountAmount || 0)}</strong>
              </div>
              <div className="summary-row summary-row--total">
                <span>Total to pay</span>
                <strong>{formatCurrency(previewTotal)}</strong>
              </div>
              <div className="summary-row">
                <span>Wallet balance</span>
                <strong>{formatCurrency(wallet?.balance)}</strong>
              </div>
            </div>
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
