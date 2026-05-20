import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import BackgroundBlobs from '../components/BackgroundBlobs';
import { useSession } from '../context/SessionContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, login } = useSession();
  const [form, setForm] = useState({
    email: location.state?.email || '',
    password: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(location.state?.from || '/browse', { replace: true });
    }
  }, [isAuthenticated, location.state, navigate]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await login(form);
    } catch (submissionError) {
      setError(submissionError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0B0914] text-white">
      <BackgroundBlobs />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[1fr_460px] lg:items-center">
          <section className="space-y-6">
            <Link className="inline-flex items-center gap-3 text-white" to="/">
              <span className="material-symbols-outlined text-4xl text-cyan drop-shadow-[0_0_10px_rgba(0,240,255,0.6)]">
                bolt
              </span>
              <div>
                <div className="text-3xl font-black uppercase tracking-tight">JSON</div>
                <div className="text-xs font-bold uppercase tracking-[0.26em] text-slate-500">JaStip Online Nasional</div>
              </div>
            </Link>
            <div className="space-y-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan/20 bg-cyan/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-cyan">
                <span className="material-symbols-outlined text-base">login</span>
                Buyer, Jastiper, Admin Access
              </span>
              <h1 className="text-5xl font-black tracking-tight text-white">Log in to continue.</h1>
              <p className="max-w-xl text-lg leading-8 text-slate-300">
                The UI follows the newer attached storefront. Session handling still uses the existing Auth service,
                JWT token persistence, and Milestone 75 role-aware navigation.
              </p>
            </div>
          </section>

          <article className="rounded-[32px] border border-white/10 bg-[#13112A]/80 p-8 shadow-[0_0_40px_rgba(0,240,255,0.08)] backdrop-blur-md sm:p-10">
            <div className="mb-8">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Account</p>
              <h2 className="mt-2 text-3xl font-black text-white">Log in</h2>
              <p className="mt-3 text-sm text-slate-400">Use a buyer, jastiper, or admin account from the active environment.</p>
            </div>

            {location.state?.flash && (
              <div className="mb-5 rounded-[20px] border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
                {location.state.flash}
              </div>
            )}

            {error && (
              <div className="mb-5 rounded-[20px] border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-200">
                {error}
              </div>
            )}

            <form className="space-y-5" onSubmit={handleSubmit}>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-bold text-white">Email</span>
                <input
                  className="rounded-[20px] border border-white/10 bg-white/5 px-5 py-4 text-white outline-none placeholder:text-slate-500"
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  required
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-bold text-white">Password</span>
                <input
                  className="rounded-[20px] border border-white/10 bg-white/5 px-5 py-4 text-white outline-none placeholder:text-slate-500"
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                  required
                />
              </label>

              <button
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan to-blue-500 px-6 py-4 text-sm font-black uppercase tracking-[0.18em] text-[#0B0914] shadow-[0_0_22px_rgba(0,240,255,0.35)] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={submitting}
                type="submit"
              >
                <span className="material-symbols-outlined text-base">login</span>
                {submitting ? 'Logging In...' : 'Log In'}
              </button>
            </form>

            <p className="mt-6 text-sm text-slate-400">
              Need a buyer account?{' '}
              <Link className="font-bold text-cyan hover:text-white" to="/register">
                Create one now
              </Link>
              .
            </p>
          </article>
        </div>
      </div>
    </div>
  );
}
