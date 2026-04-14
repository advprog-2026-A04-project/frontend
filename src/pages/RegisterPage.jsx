import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useSession();
  const [form, setForm] = useState({
    email: '',
    username: '',
    password: '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);

    try {
      const result = await register(form);
      setMessage(result.message);
      navigate('/login', {
        state: {
          flash: result.message,
          email: form.email,
        },
      });
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
            <h1>Create a buyer account</h1>
          </div>
        </div>

        <form className="form-stack" onSubmit={handleSubmit}>
          <label className="field">
            <span>Email</span>
            <input
              className="input"
              name="email"
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              required
            />
          </label>

          <label className="field">
            <span>Username</span>
            <input
              className="input"
              name="username"
              type="text"
              value={form.username}
              onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
              required
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              className="input"
              name="password"
              type="password"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              required
            />
          </label>

          {message && <div className="notice notice--success">{message}</div>}
          {error && <div className="notice notice--danger">{error}</div>}

          <button className="button button--block" disabled={submitting} type="submit">
            {submitting ? 'Creating account…' : 'Register'}
          </button>
        </form>

        <p className="muted">
          Already have an account? <Link to="/login">Log in here</Link>.
        </p>
      </article>
    </section>
  );
}
