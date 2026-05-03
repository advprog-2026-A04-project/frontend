import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import LoadingState from '../components/LoadingState';
import { useSession } from '../context/SessionContext';
import { api } from '../lib/api';

export default function HomePage() {
  const { isAuthenticated, user } = useSession();
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
          <p className="eyebrow">JSON / Milestone 75%</p>
          <h1>Teammate frontend, live services, full order lifecycle.</h1>
          <p className="lead">
            The frontend now targets the official buyer, jastiper, and admin flows from the project brief:
            browse products, pay through wallet, apply vouchers, track order status, process lifecycle updates,
            monitor refunds, and manage vouchers from the admin side.
          </p>
          <div className="hero-actions">
            <Link className="button" to={isAuthenticated ? '/products' : '/register'}>
              {isAuthenticated ? 'Open catalog' : 'Create account'}
            </Link>
            {isAuthenticated ? (
              <Link className="button button--secondary" to="/orders">
                View my orders
              </Link>
            ) : (
              <Link className="button button--secondary" to="/login">
                Log in
              </Link>
            )}
          </div>
        </article>

        <article className="hero-panel">
          <p className="eyebrow">Current role</p>
          <h2>{user ? `${user.fullName || user.username} (${user.role})` : 'Guest session'}</h2>
          <ul className="checklist">
            <li>Buyer flow: register, login, wallet top-up, checkout, history, and order detail.</li>
            <li>Jastiper flow: process Paid, Purchased, Shipped, Completed, and Cancelled transitions.</li>
            <li>Admin flow: monitor orders and manage active, expired, and disabled vouchers.</li>
            <li>Wallet flow: live balance, top-up, mutation history, and refund visibility.</li>
            <li>Voucher flow: public active list plus admin create, edit, extend, quota add, and disable.</li>
          </ul>
        </article>
      </div>

      <div className="grid-two">
        <article className="card">
          <div className="section-head">
            <div>
              <p className="eyebrow">Buyer</p>
              <h2>Checkout and tracking</h2>
            </div>
            <span className="pill pill--accent">Required</span>
          </div>
          <ul className="checklist">
            <li>Browse products and open detail pages backed by Inventory.</li>
            <li>Check out with voucher input through the Order orchestrator.</li>
            <li>See active orders separately from full history.</li>
            <li>Rate completed orders when the backend accepts it.</li>
          </ul>
        </article>

        <article className="card">
          <div className="section-head">
            <div>
              <p className="eyebrow">Operations</p>
              <h2>Lifecycle and control</h2>
            </div>
            <span className="pill pill--success">Required</span>
          </div>
          <ul className="checklist">
            <li>Jastipers can move valid orders through the official lifecycle.</li>
            <li>Cancellation triggers wallet refund and stays idempotent on retries.</li>
            <li>Admins can inspect system-wide orders from a single view.</li>
            <li>Voucher admin management stays inside the Voucher service contract.</li>
          </ul>
        </article>
      </div>

      <article className="card">
        <div className="section-head">
          <div>
            <p className="eyebrow">Environment snapshot</p>
            <h2>Live service reachability</h2>
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
                </section>
              ))}
            </div>

            <div className="demo-bar">
              <span>
                Role-sensitive routes: <strong>/orders</strong>, <strong>/jastiper/orders</strong>, <strong>/admin</strong>
              </span>
              <span>Voucher admin token is required for mutating voucher operations.</span>
            </div>
          </>
        )}
      </article>
    </section>
  );
}
