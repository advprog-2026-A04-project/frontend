import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
      navigate(location.state?.from || '/products', { replace: true });
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
    <section className="page page--auth">
      <article className="auth-card">
        <div className="section-head">
          <div>
            <p className="eyebrow">Account</p>
            <h1>Log in to continue</h1>
          </div>
          <span className="pill pill--success">JWT session</span>
        </div>

        {location.state?.flash && <div className="notice notice--success">{location.state.flash}</div>}

        <form className="form-stack" onSubmit={handleSubmit}>
          <label className="field">
            <span>Email</span>
            <input
              className="input"
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              required
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              className="input"
              type="password"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              required
            />
          </label>

          {error && <div className="notice notice--danger">{error}</div>}

          <button className="button button--block" disabled={submitting} type="submit">
            {submitting ? 'Logging in...' : 'Log in'}
          </button>
        </form>

        <p className="muted">
          Need a buyer account? <Link to="/register">Create one now</Link>.
        </p>
      </article>
    </section>
  );
}
