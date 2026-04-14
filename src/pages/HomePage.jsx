import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import LoadingState from '../components/LoadingState';
import { useSession } from '../context/SessionContext';
import { api } from '../lib/api';

export default function HomePage() {
  const { isAuthenticated } = useSession();
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadHealth() {
      try {
        const data = await api.getHealth();
        if (!cancelled) {
          setHealth(data);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadHealth();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="page page--home">
      <div className="hero-grid">
        <article className="hero-panel hero-panel--primary">
          <p className="eyebrow">Project scope</p>
          <h1>Milestone 25% and 50% only.</h1>
          <p className="lead">
            This app focuses on the flows that matter for the demo: account access, product browsing,
            checkout with voucher input, wallet validation, inventory validation, and visible order results.
          </p>
          <div className="hero-actions">
            <Link className="button" to={isAuthenticated ? '/products' : '/register'}>
              {isAuthenticated ? 'Browse products' : 'Start with register'}
            </Link>
            {!isAuthenticated && (
              <Link className="button button--secondary" to="/login">
                Use demo login
              </Link>
            )}
          </div>
        </article>

        <article className="hero-panel">
          <p className="eyebrow">What is included</p>
          <ul className="checklist">
            <li>Register and log in with a stable demo session flow.</li>
            <li>Browse a usable product catalog and open product details.</li>
            <li>Use a wallet page with immediate top-up for demo purposes.</li>
            <li>Validate vouchers against the live Voucher service.</li>
            <li>Complete or fail checkout with clear order outcomes.</li>
          </ul>
        </article>
      </div>

      <div className="grid-two">
        <article className="card">
          <div className="section-head">
            <div>
              <p className="eyebrow">Milestone 25%</p>
              <h2>Foundation demo</h2>
            </div>
            <span className="pill pill--accent">Required</span>
          </div>
          <ul className="checklist">
            <li>Register page and login page are both present.</li>
            <li>Products can be browsed and opened in detail view.</li>
            <li>Checkout always includes a voucher code field.</li>
            <li>Submitting checkout creates an order record immediately.</li>
          </ul>
        </article>

        <article className="card">
          <div className="section-head">
            <div>
              <p className="eyebrow">Milestone 50%</p>
              <h2>Integrated checkout demo</h2>
            </div>
            <span className="pill pill--success">Required</span>
          </div>
          <ul className="checklist">
            <li>Inventory is checked before payment is recorded.</li>
            <li>Voucher validation and claim use the live voucher deployment.</li>
            <li>Wallet balance is validated before the order becomes paid.</li>
            <li>Success and failure both update visible order/payment outcomes.</li>
          </ul>
        </article>
      </div>

      <article className="card">
        <div className="section-head">
          <div>
            <p className="eyebrow">Environment snapshot</p>
            <h2>Current integration mode</h2>
          </div>
        </div>

        {loading && <LoadingState label="Checking service modes…" />}

        {!loading && health && (
          <>
            <div className="grid-two">
              {Object.entries(health.services).map(([serviceName, details]) => (
                <section className="service-panel" key={serviceName}>
                  <div className="service-panel__top">
                    <strong>{serviceName}</strong>
                    <span
                      className={`pill ${
                        details.mode === 'live' ? 'pill--success' : details.mode === 'degraded' ? 'pill--warn' : ''
                      }`}
                    >
                      {details.mode}
                    </span>
                  </div>
                  <p className="muted">{details.note}</p>
                </section>
              ))}
            </div>

            <div className="demo-bar">
              <span>
                Demo login: <strong>{health.demoCredentials.email}</strong> /{' '}
                <strong>{health.demoCredentials.password}</strong>
              </span>
              <span>
                Demo voucher: <strong>{health.demoVoucherCode}</strong>
              </span>
            </div>
          </>
        )}
      </article>
    </section>
  );
}
