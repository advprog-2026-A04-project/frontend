import { Link, useLocation, useNavigate } from 'react-router-dom';

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const links = [
    { to: '/inventory', label: 'Katalog', icon: 'shopping_bag' },
    { to: '/orders', label: 'Orders', icon: 'receipt_long' },
    { to: '/vouchers', label: 'Voucher', icon: 'confirmation_number' },
  ];

  return (
    <nav className="font-display bg-surface-dark/80 backdrop-blur-md border-b border-border-dark px-4 md:px-10 py-3 sticky top-0 z-50">
      <div className="max-w-[1200px] mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 text-primary">
          <span className="material-symbols-outlined text-2xl">bolt</span>
          <span className="text-xl font-bold uppercase tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-500">JSON</span>
        </Link>
        <div className="flex items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                location.pathname.startsWith(link.to)
                  ? 'bg-primary/10 text-primary'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{link.icon}</span>
              <span className="hidden sm:inline">{link.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
