import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useSession();

  const [form, setForm] = useState({
    email: location.state?.email || 'demo@json.app',
    password: 'Demo123!',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await login(form);
      navigate(location.state?.from || '/products');
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
          <span className="pill pill--success">Demo-ready</span>
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
            {submitting ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <div className="demo-bar demo-bar--stack">
          <span>
            Demo account: <strong>demo@json.app</strong>
          </span>
          <span>
            Password: <strong>Demo123!</strong>
          </span>
        </div>

        <p className="muted">
          Need a fresh user? <Link to="/register">Create one now</Link>.
        </p>
      </article>
    </section>
  );
}
