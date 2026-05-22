import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageShell from '../components/PageShell';
import { useSession } from '../context/SessionContext';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { logout, submitKyc, updateProfile, user } = useSession();
  const avatarSeed = encodeURIComponent(user?.username || user?.email || 'json');
  const [form, setForm] = useState({
    username: user?.username || '',
    fullName: user?.fullName || '',
  });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [kycForm, setKycForm] = useState({ fullName: user?.fullName || '', documentUrl: '', note: '' });
  const [submittingKyc, setSubmittingKyc] = useState(false);

  useEffect(() => {
    setForm({
      username: user?.username || '',
      fullName: user?.fullName || '',
    });
  }, [user?.fullName, user?.username]);

  useEffect(() => {
    setKycForm((current) => ({
      ...current,
      fullName: current.fullName || user?.fullName || '',
    }));
  }, [user?.fullName]);

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  async function handleSaveProfile(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    try {
      await updateProfile({
        username: form.username,
        fullName: form.fullName,
      });
      setMessage('Profile updated successfully.');
    } catch (submissionError) {
      setError(submissionError.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmitKyc(event) {
    event.preventDefault();
    setSubmittingKyc(true);
    setError('');
    setMessage('');

    try {
      const fullName = kycForm.fullName.trim();
      if (!fullName || fullName.split(/\s+/).length < 2) {
        throw new Error('Full name is required for KYC verification.');
      }

      if (fullName !== (user?.fullName || '').trim()) {
        const profilePayload = user?.username ? { username: user.username, fullName } : { fullName };
        await updateProfile(profilePayload);
        setForm((current) => ({ ...current, fullName }));
      }

      const nextUser = await submitKyc({
        fullName,
        documentUrl: kycForm.documentUrl,
        note: kycForm.note,
      });
      setMessage(`KYC submitted for admin review. Current status: ${nextUser.kycStatus || 'PENDING'}.`);
      setKycForm({ fullName: nextUser.fullName || fullName, documentUrl: '', note: '' });
    } catch (submissionError) {
      setError(submissionError.message);
    } finally {
      setSubmittingKyc(false);
    }
  }

  return (
    <PageShell active="profile">
      <section className="space-y-8">
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-[28px] border border-white/10 bg-white/5 p-8 backdrop-blur-md">
            <div className="flex flex-col gap-6 md:flex-row md:items-center">
              <div className="h-28 w-28 overflow-hidden rounded-full border border-cyan/30 bg-[#13112A] p-1 shadow-[0_0_25px_rgba(0,240,255,0.15)]">
                <img
                  alt="Profile avatar"
                  className="h-full w-full rounded-full object-cover"
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`}
                />
              </div>
              <div className="flex-1 space-y-2">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">Profile</p>
                <h1 className="text-3xl font-black tracking-tight text-white">{user?.fullName || user?.username}</h1>
                <p className="text-sm text-slate-400">
                  @{user?.username} | {user?.email}
                </p>
                <div className="flex flex-wrap gap-3 pt-2">
                  <span className="rounded-full border border-cyan/20 bg-cyan/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-cyan">
                    {user?.role}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-300">
                    KYC {user?.kycStatus || 'NOT_SUBMITTED'}
                  </span>
                  {user?.banned && (
                    <span className="rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-rose-200">
                      Banned
                    </span>
                  )}
                </div>
              </div>
            </div>
          </article>

          <article className="rounded-[28px] border border-white/10 bg-white/5 p-8 backdrop-blur-md">
            <div className="mb-6">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Edit Profile</p>
              <h2 className="mt-2 text-2xl font-black text-white">Keep your buyer identity current.</h2>
              <p className="mt-3 text-sm text-slate-400">This form now uses the Auth service profile update endpoint.</p>
            </div>

            {message && (
              <div className="mb-5 rounded-[20px] border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
                {message}
              </div>
            )}

            {error && (
              <div className="mb-5 rounded-[20px] border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-200">
                {error}
              </div>
            )}

            <form className="space-y-5" onSubmit={handleSaveProfile}>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-bold text-white">Username</span>
                <input
                  className="rounded-[20px] border border-white/10 bg-white/5 px-5 py-4 text-white outline-none placeholder:text-slate-500"
                  type="text"
                  value={form.username}
                  onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
                  required
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-bold text-white">Full name</span>
                <input
                  className="rounded-[20px] border border-white/10 bg-white/5 px-5 py-4 text-white outline-none placeholder:text-slate-500"
                  type="text"
                  value={form.fullName}
                  onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
                  placeholder="Shown across the storefront"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-bold text-white">Email</span>
                <input
                  className="rounded-[20px] border border-white/10 bg-[#13112A]/75 px-5 py-4 text-slate-400 outline-none"
                  type="email"
                  value={user?.email || ''}
                  disabled
                  readOnly
                />
              </label>

              <button
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan to-blue-500 px-6 py-4 text-sm font-black uppercase tracking-[0.18em] text-[#0B0914] shadow-[0_0_22px_rgba(0,240,255,0.35)] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={saving}
                type="submit"
              >
                <span className="material-symbols-outlined text-base">save</span>
                {saving ? 'Saving Profile...' : 'Save Profile'}
              </button>
            </form>
          </article>
        </div>

        <article className="rounded-[28px] border border-white/10 bg-white/5 p-8 backdrop-blur-md" data-testid="kyc-panel">
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Jastiper KYC</p>
            <h2 className="mt-2 text-2xl font-black text-white">Submit upgrade evidence.</h2>
            <p className="mt-3 text-sm text-slate-400">
              Current status: {user?.kycStatus || 'NOT_SUBMITTED'}
            </p>
          </div>
          <form className="space-y-5" onSubmit={handleSubmitKyc}>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-bold text-white">Legal name</span>
              <input
                className="rounded-[20px] border border-white/10 bg-white/5 px-5 py-4 text-white outline-none placeholder:text-slate-500"
                data-testid="kyc-full-name"
                type="text"
                value={kycForm.fullName}
                onChange={(event) => setKycForm((current) => ({ ...current, fullName: event.target.value }))}
                placeholder="Use the full name from your identity document"
                required
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-bold text-white">Document URL</span>
              <input
                className="rounded-[20px] border border-white/10 bg-white/5 px-5 py-4 text-white outline-none placeholder:text-slate-500"
                data-testid="kyc-document-url"
                type="url"
                value={kycForm.documentUrl}
                onChange={(event) => setKycForm((current) => ({ ...current, documentUrl: event.target.value }))}
                placeholder="https://..."
                required
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-bold text-white">Note</span>
              <textarea
                className="min-h-24 rounded-[20px] border border-white/10 bg-white/5 px-5 py-4 text-white outline-none placeholder:text-slate-500"
                data-testid="kyc-note"
                value={kycForm.note}
                onChange={(event) => setKycForm((current) => ({ ...current, note: event.target.value }))}
                placeholder="Tell admin why this account should become a Jastiper"
              />
            </label>
            <button
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan to-blue-500 px-6 py-4 text-sm font-black uppercase tracking-[0.18em] text-[#0B0914] shadow-[0_0_22px_rgba(0,240,255,0.35)] disabled:cursor-not-allowed disabled:opacity-50"
              data-testid="submit-kyc-button"
              disabled={submittingKyc}
              type="submit"
            >
              <span className="material-symbols-outlined text-base">verified_user</span>
              {submittingKyc ? 'Submitting KYC...' : 'Submit KYC'}
            </button>
          </form>
        </article>

        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {user?.role !== 'ADMIN' && (
            <>
              <Link className="rounded-[24px] border border-white/10 bg-white/5 p-6 transition-colors hover:border-cyan/40 hover:bg-white/10" to="/wallet">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan/20 text-cyan">
                  <span className="material-symbols-outlined">account_balance_wallet</span>
                </div>
                <h2 className="text-lg font-bold text-white">Wallet</h2>
                <p className="mt-2 text-sm text-slate-400">Top up, inspect balance, and review transaction history.</p>
              </Link>

              <Link className="rounded-[24px] border border-white/10 bg-white/5 p-6 transition-colors hover:border-fuchsia-400/40 hover:bg-white/10" to="/orders">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-fuchsia-500/20 text-fuchsia-300">
                  <span className="material-symbols-outlined">shopping_bag</span>
                </div>
                <h2 className="text-lg font-bold text-white">Orders</h2>
                <p className="mt-2 text-sm text-slate-400">Track order lifecycle, refunds, and post-completion ratings.</p>
              </Link>
            </>
          )}

          {(user?.role === 'JASTIPER' || user?.role === 'ADMIN') && (
            <Link
              className="rounded-[24px] border border-white/10 bg-white/5 p-6 transition-colors hover:border-cyan/40 hover:bg-white/10"
              to="/jastiper/orders"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/20 text-cyan">
                <span className="material-symbols-outlined">inventory</span>
              </div>
              <h2 className="text-lg font-bold text-white">Jastiper Queue</h2>
              <p className="mt-2 text-sm text-slate-400">Process Paid, Purchased, Shipped, and Completed transitions.</p>
            </Link>
          )}

          {user?.role === 'ADMIN' && (
            <Link className="rounded-[24px] border border-white/10 bg-white/5 p-6 transition-colors hover:border-cyan/40 hover:bg-white/10" to="/admin">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-300">
                <span className="material-symbols-outlined">admin_panel_settings</span>
              </div>
              <h2 className="text-lg font-bold text-white">Admin Console</h2>
              <p className="mt-2 text-sm text-slate-400">Monitor orders and manage voucher lifecycle safely.</p>
            </Link>
          )}

          <button
            className="rounded-[24px] border border-white/10 bg-white/5 p-6 text-left transition-colors hover:border-rose-400/40 hover:bg-white/10"
            onClick={handleLogout}
            type="button"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-300">
              <span className="material-symbols-outlined">logout</span>
            </div>
            <h2 className="text-lg font-bold text-white">Logout</h2>
            <p className="mt-2 text-sm text-slate-400">End the current JWT session and clear persisted browser state.</p>
          </button>
        </section>
      </section>
    </PageShell>
  );
}
