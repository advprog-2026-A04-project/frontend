import { Link, NavLink } from 'react-router-dom';
import { formatCurrency } from '../lib/format';
import { useSession } from '../context/SessionContext';

function navClass(active, current) {
  return [
    'text-sm font-bold uppercase tracking-[0.18em] transition-colors',
    active === current
      ? 'text-cyan drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]'
      : 'text-slate-300 hover:text-white',
  ].join(' ');
}

export default function PrimaryHeader({ active = 'home', walletBalance = null, showSearch = false }) {
  const { isAuthenticated, user } = useSession();
  const avatarSeed = encodeURIComponent(user?.username || user?.email || 'json');

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#13112A]/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link className="flex items-center gap-3 text-white" to="/">
            <span className="material-symbols-outlined text-3xl text-cyan drop-shadow-[0_0_10px_rgba(0,240,255,0.6)]">
              bolt
            </span>
            <div>
              <div className="text-2xl font-black uppercase tracking-tight text-white">JSON</div>
              <div className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Limited Drops</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 lg:flex">
            <NavLink className={navClass(active, 'home')} to="/">
              Home
            </NavLink>
            <NavLink className={navClass(active, 'browse')} to="/browse">
              Flash Sale
            </NavLink>
            {isAuthenticated && (
              <>
                <NavLink className={navClass(active, 'orders')} to="/orders">
                  My Orders
                </NavLink>
                <NavLink className={navClass(active, 'wallet')} to="/wallet">
                  Wallet
                </NavLink>
                <NavLink className={navClass(active, 'profile')} to="/profile">
                  Profile
                </NavLink>
                {user?.role === 'JASTIPER' && (
                  <>
                    <NavLink className={navClass(active, 'jastiper')} to="/jastiper/catalog">
                      Catalog
                    </NavLink>
                    <NavLink className={navClass(active, 'jastiper')} to="/jastiper/orders">
                      Jastiper
                    </NavLink>
                  </>
                )}
                {user?.role === 'ADMIN' && (
                  <NavLink className={navClass(active, 'admin')} to="/admin">
                    Admin
                  </NavLink>
                )}
              </>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {showSearch && (
            <label className="hidden h-11 min-w-[250px] items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 text-slate-400 xl:flex">
              <span className="material-symbols-outlined text-base">search</span>
              <span className="text-sm">Search limited items...</span>
            </label>
          )}

          {isAuthenticated && walletBalance !== null && (
            <div className="hidden items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-emerald-300 md:flex">
              <span className="material-symbols-outlined text-base">account_balance_wallet</span>
              <span className="text-sm font-bold">{formatCurrency(walletBalance)}</span>
            </div>
          )}

          {isAuthenticated ? (
            <>
              <div className="hidden rounded-full border border-cyan/20 bg-cyan/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-cyan md:block">
                {user?.role}
              </div>
              <Link
                className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-cyan/40 bg-[#0B0914] shadow-[0_0_14px_rgba(0,240,255,0.2)]"
                to="/profile"
              >
                <img
                  alt="Profile avatar"
                  className="h-full w-full object-cover"
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`}
                />
              </Link>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-bold uppercase tracking-[0.18em] text-slate-200 transition-colors hover:border-cyan/40 hover:text-cyan"
                to="/login"
              >
                Login
              </Link>
              <Link
                className="rounded-full bg-gradient-to-r from-cyan to-blue-500 px-5 py-2.5 text-sm font-bold uppercase tracking-[0.18em] text-[#0B0914] shadow-[0_0_18px_rgba(0,240,255,0.35)] transition-opacity hover:opacity-90"
                to="/register"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
