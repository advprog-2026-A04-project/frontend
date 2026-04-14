import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext';

function navigationClassName({ isActive }) {
  return `nav-link ${isActive ? 'nav-link--active' : ''}`.trim();
}

export default function AppShell() {
  const navigate = useNavigate();
  const { isAuthenticated, logout, user } = useSession();

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="brand-block">
          <NavLink className="brand" to="/">
            <span className="brand__mark">25/50</span>
            <span>
              <strong>JSON Frontend</strong>
              <small>Milestone demo only</small>
            </span>
          </NavLink>
          <p className="brand-copy">
            Register, login, browse, top up, and finish checkout with live voucher validation.
          </p>
        </div>

        <nav className="nav-bar">
          <NavLink className={navigationClassName} to="/">
            Home
          </NavLink>
          {isAuthenticated && (
            <>
              <NavLink className={navigationClassName} to="/products">
                Products
              </NavLink>
              <NavLink className={navigationClassName} to="/wallet">
                Wallet
              </NavLink>
              <NavLink className={navigationClassName} to="/orders">
                Orders
              </NavLink>
            </>
          )}
        </nav>

        <div className="header-actions">
          {isAuthenticated ? (
            <>
              <div className="user-chip">
                <span>{user.username}</span>
                <small>{user.email}</small>
              </div>
              <button className="button button--ghost" onClick={handleLogout} type="button">
                Log out
              </button>
            </>
          ) : (
            <>
              <NavLink className="button button--ghost" to="/login">
                Log in
              </NavLink>
              <NavLink className="button" to="/register">
                Register
              </NavLink>
            </>
          )}
        </div>
      </header>

      <main className="page-shell">
        <Outlet />
      </main>
    </div>
  );
}
