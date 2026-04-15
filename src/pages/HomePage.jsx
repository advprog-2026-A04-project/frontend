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
      const data = await api.getHealth();
      if (!cancelled) {
        setHealth(data);
        setLoading(false);
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
          <h1>Milestone 25% and 50% with the real services.</h1>
          <p className="lead">
            This frontend talks directly to the real Auth/Profile, Inventory, Wallet, Order, and
            Voucher deployments. It focuses only on the flows required for Milestone 25% and 50%.
          </p>
          <div className="hero-actions">
            <Link className="button" to={isAuthenticated ? '/products' : '/register'}>
              {isAuthenticated ? 'Browse products' : 'Start with register'}
            </Link>
            {!isAuthenticated && (
              <Link className="button button--secondary" to="/login">
                Sign in
              </Link>
            )}
          </div>
        </article>

        <article className="hero-panel">
          <p className="eyebrow">What is included</p>
          <ul className="checklist">
            <li>Register and log in through Auth/Profile with bearer-token auth.</li>
            <li>Browse inventory products and open product details.</li>
            <li>Use Wallet balance and top-up to support the payment flow.</li>
            <li>Submit voucher codes to Order for real integrated validation.</li>
            <li>Complete or fail checkout with visible order outcomes.</li>
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
            <li>Submitting checkout creates an order through the real Order service.</li>
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
            <li>Order orchestrates Inventory, Voucher, and Wallet during checkout.</li>
            <li>Inventory stock is checked before payment is recorded.</li>
            <li>Voucher validation and claim happen inside the real checkout path.</li>
            <li>Success and failure both produce clear, visible outcomes.</li>
          </ul>
        </article>
      </div>

      <article className="card">
        <div className="section-head">
          <div>
            <p className="eyebrow">Environment snapshot</p>
            <h2>Configured service health</h2>
          </div>
        </div>

        {loading && <LoadingState label="Checking service health..." />}

        {!loading && health && (
          <>
            <div className="grid-two">
              {health.services.map((service) => (
                <section className="service-panel" key={service.key}>
                  <div className="service-panel__top">
                    <strong>{service.name}</strong>
                    <span className={`pill ${service.status === 'UP' ? 'pill--success' : 'pill--warn'}`}>
                      {service.status}
                    </span>
                  </div>
                  <p className="muted">{service.note}</p>
                  <p className="muted">{service.detail}</p>
                  <a href={service.baseUrl} rel="noreferrer" target="_blank">
                    {service.baseUrl}
                  </a>
                </section>
              ))}
            </div>

            <div className="demo-bar">
              <span>Register a fresh account or sign in with an existing buyer account.</span>
              <span>Voucher validation is finalized by Order during checkout.</span>
            </div>
          </>
        )}
      </article>
    </section>
  );
}
