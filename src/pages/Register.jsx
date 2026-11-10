import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { AuthShell } from './Login';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post('/users', form);
      navigate('/login', { state: { registered: true, email: form.email } });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Create your account" subtitle="Plan work in boards, lists and cards.">
      <form onSubmit={submit} className="stack">
        <label className="field">
          <span>Username</span>
          <input className="input" required autoFocus minLength={3} maxLength={30} pattern="[A-Za-z0-9_.\-]+"
            title="Letters, numbers, _ . -" value={form.username} onChange={set('username')} />
        </label>
        <label className="field">
          <span>Email</span>
          <input className="input" type="email" required value={form.email} onChange={set('email')} />
        </label>
        <label className="field">
          <span>Password</span>
          <input className="input" type="password" required minLength={6} value={form.password} onChange={set('password')} />
          <small className="muted">At least 6 characters.</small>
        </label>
        {error && <div className="note note-error">{error}</div>}
        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Creating…' : 'Create account'}
        </button>
      </form>
      <p className="auth-foot">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </AuthShell>
  );
}
