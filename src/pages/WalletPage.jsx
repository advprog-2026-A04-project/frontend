import { useCallback, useEffect, useState } from 'react';
import LoadingState from '../components/LoadingState';
import { useSession } from '../context/SessionContext';
import { api } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/format';

export default function WalletPage() {
  const { user } = useSession();
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [amount, setAmount] = useState(1_000_000);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadWalletState = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [walletData, transactionData] = await Promise.all([
        api.getWallet(user.id),
        api.listWalletTransactions(user.id),
      ]);
      setWallet(walletData);
      setTransactions(transactionData);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    loadWalletState();
  }, [loadWalletState]);

  async function handleTopUp(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      const result = await api.topUpWallet(user.id, amount);
      setWallet(result.wallet);
      setTransactions(result.transactions);
      setMessage(`Top-up request ${result.requestId} was marked successful.`);
    } catch (submissionError) {
      setError(submissionError.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <LoadingState label="Loading wallet..." />;
  }

  return (
    <section className="page">
      <div className="grid-two">
        <article className="card card--hero">
          <p className="eyebrow">Wallet</p>
          <h1>{formatCurrency(wallet?.balance)}</h1>
          <p className="lead lead--compact">
            Wallet mutations stay visible here: top-up, payment, refund, and the transaction history required by milestone 75%.
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
              {submitting ? 'Processing...' : 'Top up wallet'}
            </button>
          </form>
        </article>
      </div>

      <article className="card">
        <div className="section-head">
          <div>
            <p className="eyebrow">History</p>
            <h2>Wallet transaction history</h2>
          </div>
        </div>

        {transactions.length === 0 ? (
          <div className="empty-state">
            <h2>No wallet transactions yet.</h2>
            <p>Top-up, payment, and refund mutations will appear here.</p>
          </div>
        ) : (
          <div className="order-list">
            {transactions.map((transaction) => (
              <div className="service-panel" key={transaction.id}>
                <div className="service-panel__top">
                  <strong>{transaction.type}</strong>
                  <span className={`status-pill status-pill--${String(transaction.status || '').toLowerCase()}`}>
                    {transaction.status}
                  </span>
                </div>
                <div className="summary-list">
                  <div className="summary-row">
                    <span>Direction</span>
                    <strong>{transaction.direction}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Amount</span>
                    <strong>{formatCurrency(transaction.amount)}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Reference</span>
                    <strong>{transaction.refType} #{transaction.refId}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Created</span>
                    <strong>{formatDate(transaction.createdAt)}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </article>
    </section>
  );
}
