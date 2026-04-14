import { useEffect, useState } from 'react';
import LoadingState from '../components/LoadingState';
import { api } from '../lib/api';
import { formatCurrency } from '../lib/format';

export default function WalletPage() {
  const [wallet, setWallet] = useState(null);
  const [amount, setAmount] = useState(1_000_000);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadWallet() {
      setLoading(true);
      setError('');

      try {
        const data = await api.getWallet();
        if (!cancelled) {
          setWallet(data);
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

    loadWallet();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleTopUp(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      const result = await api.topUpWallet(amount);
      setWallet((current) => ({
        ...(current || { currency: 'IDR' }),
        balance: result.balance,
      }));
      setMessage(`Top-up successful. Transaction ${result.transactionId} added ${formatCurrency(result.amount)}.`);
    } catch (submissionError) {
      setError(submissionError.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <LoadingState label="Loading wallet…" />;
  }

  return (
    <section className="page">
      <div className="grid-two">
        <article className="card card--hero">
          <p className="eyebrow">Wallet</p>
          <h1>{formatCurrency(wallet?.balance)}</h1>
          <p className="lead lead--compact">
            This page exists to support the milestone 50% flow: top up, re-check balance, and retry
            checkout after a failed payment.
          </p>
        </article>

        <article className="card">
          <div className="section-head">
            <div>
              <p className="eyebrow">Top up</p>
              <h2>Add balance instantly</h2>
            </div>
          </div>

          <form className="form-stack" onSubmit={handleTopUp}>
            <label className="field">
              <span>Amount</span>
              <input
                className="input"
                min={10000}
                step={10000}
                type="number"
                value={amount}
                onChange={(event) => setAmount(Number(event.target.value))}
              />
            </label>

            {message && <div className="notice notice--success">{message}</div>}
            {error && <div className="notice notice--danger">{error}</div>}

            <button className="button button--block" disabled={submitting} type="submit">
              {submitting ? 'Processing…' : 'Top up wallet'}
            </button>
          </form>
        </article>
      </div>
    </section>
  );
}
