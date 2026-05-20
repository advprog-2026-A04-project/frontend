import { Link, useNavigate } from 'react-router-dom';
import PageShell from '../components/PageShell';
import { useSession } from '../context/SessionContext';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { logout, user } = useSession();
  const avatarSeed = encodeURIComponent(user?.username || user?.email || 'json');

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  return (
    <PageShell active="profile">
      <section className="space-y-8">
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
                  Milestone 75 Demo
                </span>
              </div>
            </div>
          </div>
        </article>

        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
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

          {user?.role === 'ADMIN' ? (
            <Link className="rounded-[24px] border border-white/10 bg-white/5 p-6 transition-colors hover:border-cyan/40 hover:bg-white/10" to="/admin">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-300">
                <span className="material-symbols-outlined">admin_panel_settings</span>
              </div>
              <h2 className="text-lg font-bold text-white">Admin Console</h2>
              <p className="mt-2 text-sm text-slate-400">Monitor orders and manage voucher lifecycle safely.</p>
            </Link>
          ) : (
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
          )}
        </section>
      </section>
    </PageShell>
  );
}
