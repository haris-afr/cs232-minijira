import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../api/auth';
import { setSession } from '../auth';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(email, password);
      setSession(data.token, data.user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="card">
        <h1>Welcome back</h1>
        <p className="muted">Sign in to your MiniJira account.</p>
        {error && <div className="error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <button type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p className="muted" style={{ marginTop: 12, textAlign: 'center' }}>
          New here? <Link to="/register">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
