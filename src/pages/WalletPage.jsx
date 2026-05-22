import { useCallback, useEffect, useMemo, useState } from 'react';
import LoadingState from '../components/LoadingState';
import PageShell from '../components/PageShell';
import { useSession } from '../context/SessionContext';
import { api } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/format';

export default function WalletPage() {
  const { user } = useSession();
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [amount, setAmount] = useState(1000000);
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

  const topupTotal = useMemo(
    () => transactions.filter((transaction) => transaction.type === 'TOPUP').reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0),
    [transactions],
  );
  const paymentTotal = useMemo(
    () =>
      transactions
        .filter((transaction) => transaction.type === 'PAYMENT')
        .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0),
    [transactions],
  );

  async function handleTopUp(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      const result = await api.topUpWallet(user.id, amount);
      setWallet(result.wallet);
      setTransactions(result.transactions);
      setMessage(`Top-up request ${result.requestId} was submitted for admin approval.`);
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
    <PageShell active="wallet" walletBalance={wallet?.balance ?? null}>
      <section className="space-y-8">
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="space-y-6">
            <article className="card--hero overflow-hidden rounded-[30px] border border-white/10 bg-gradient-to-br from-[#191A3D] to-[#13112A] p-8 shadow-[0_0_30px_rgba(0,240,255,0.08)]">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Wallet Balance</p>
              <h1 className="mt-4 text-4xl font-black tracking-tight text-white">{formatCurrency(wallet?.balance)}</h1>
              <p className="mt-3 text-sm text-slate-400">Top-up, payment, and refund history stay visible here for Milestone 75 verification.</p>
            </article>

            <article className="rounded-[30px] border border-white/10 bg-white/5 p-8 backdrop-blur-md">
              <h2 className="text-xl font-black text-white">Quick stats</h2>
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-400">Total top up</span>
                  <strong className="text-lg text-emerald-300">+{formatCurrency(topupTotal)}</strong>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-400">Total spent</span>
                  <strong className="text-lg text-fuchsia-300">-{formatCurrency(paymentTotal)}</strong>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-400">Entries</span>
                  <strong className="text-lg text-white">{transactions.length}</strong>
                </div>
              </div>
            </article>
          </div>

          <div className="space-y-6">
            <article className="rounded-[30px] border border-white/10 bg-white/5 p-8 backdrop-blur-md">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan/15 text-cyan">
                  <span className="material-symbols-outlined">add_circle</span>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Top up</p>
                  <h2 className="text-2xl font-black text-white">Request balance top-up</h2>
                </div>
              </div>

              <form className="space-y-5" onSubmit={handleTopUp}>
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-bold text-white">Amount</span>
                  <input
                    className="rounded-[20px] border border-white/10 bg-[#13112A]/75 px-5 py-4 text-white outline-none"
                    min={10000}
                    step={10000}
                    type="number"
                    value={amount}
                    onChange={(event) => setAmount(Number(event.target.value))}
                  />
                </label>

                <div className="grid grid-cols-3 gap-3">
                  {[50000, 100000, 500000].map((preset) => (
                    <button
                      key={preset}
                      className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-200 hover:border-cyan/30 hover:text-cyan"
                      onClick={() => setAmount(preset)}
                      type="button"
                    >
                      {formatCurrency(preset)}
                    </button>
                  ))}
                </div>

                {message && <div className="rounded-[20px] border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">{message}</div>}
                {error && <div className="rounded-[20px] border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div>}

                <button
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan to-blue-500 px-6 py-4 text-sm font-black uppercase tracking-[0.18em] text-[#0B0914] shadow-[0_0_22px_rgba(0,240,255,0.35)] disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={submitting}
                  type="submit"
                >
                  <span className="material-symbols-outlined text-base">account_balance_wallet</span>
                  {submitting ? 'Processing...' : 'Top Up Wallet'}
                </button>
              </form>
            </article>

            <article className="rounded-[30px] border border-white/10 bg-white/5 p-8 backdrop-blur-md">
              <div className="mb-6 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">History</p>
                  <h2 className="text-2xl font-black text-white">Wallet transaction history</h2>
                </div>
              </div>

              {transactions.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-white/15 bg-[#13112A]/55 p-10 text-center text-slate-400">
                  No wallet transactions yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {transactions.map((transaction) => {
                    const positive = ['TOPUP', 'REFUND'].includes(transaction.type);
                    return (
                      <div
                        className="flex flex-col gap-4 rounded-[24px] border border-white/10 bg-[#13112A]/75 p-5 sm:flex-row sm:items-center sm:justify-between"
                        key={transaction.id}
                      >
                        <div className="flex items-start gap-4">
                          <div
                            className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                              positive ? 'bg-emerald-500/15 text-emerald-300' : 'bg-fuchsia-500/15 text-fuchsia-300'
                            }`}
                          >
                            <span className="material-symbols-outlined">
                              {transaction.type === 'TOPUP'
                                ? 'add'
                                : transaction.type === 'PAYMENT'
                                  ? 'shopping_cart'
                                  : 'undo'}
                            </span>
                          </div>
                          <div>
                            <h3 className="text-base font-black text-white">{transaction.type}</h3>
                            <p className="mt-1 text-sm text-slate-400">
                              {transaction.refType} #{transaction.refId}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">{formatDate(transaction.createdAt)}</p>
                          </div>
                        </div>

                        <div className="text-left sm:text-right">
                          <p className={`text-lg font-black ${positive ? 'text-emerald-300' : 'text-fuchsia-300'}`}>
                            {positive ? '+' : '-'}
                            {formatCurrency(transaction.amount)}
                          </p>
                          <span className="mt-2 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-300">
                            {transaction.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </article>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
