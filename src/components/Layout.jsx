import { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { attempt, timeAgo } from '../util';
import { Avatar } from './ui';

function useClickOutside(onOutside) {
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => ref.current && !ref.current.contains(e.target) && onOutside();
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onOutside]);
  return ref;
}

function Notifications() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const ref = useClickOutside(() => setOpen(false));

  const load = () => api.get('/users/notification').then(setItems).catch(() => {});
  useEffect(() => {
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, []);

  const clear = () => attempt(async () => {
    await api.del('/users/notification');
    setItems([]);
  });

  return (
    <div className="dropdown" ref={ref}>
      <button className="icon-btn topbar-btn" onClick={() => setOpen(!open)} aria-label="Notifications">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {items.length > 0 && <span className="badge">{items.length}</span>}
      </button>
      {open && (
        <div className="dropdown-menu notifications">
          <div className="dropdown-head">
            <strong>Notifications</strong>
            {items.length > 0 && (
              <button className="link-btn" onClick={clear}>
                Clear all
              </button>
            )}
          </div>
          {items.length === 0 && <p className="muted pad">You're all caught up.</p>}
          {items.map((n) => (
            <div key={n.id} className="notification">
              <div>{n.notification}</div>
              <small className="muted">{timeAgo(n.created_at)}</small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const ref = useClickOutside(() => setOpen(false));

  return (
    <div className="dropdown" ref={ref}>
      <button className="icon-btn topbar-btn" onClick={() => setOpen(!open)} aria-label="Account">
        <Avatar name={user.username} size={30} />
      </button>
      {open && (
        <div className="dropdown-menu">
          <div className="dropdown-head">
            <div>
              <strong>{user.username}</strong>
              <div className="muted small">{user.email}</div>
            </div>
          </div>
          <button className="menu-item" onClick={() => { setOpen(false); navigate('/profile'); }}>
            Profile & settings
          </button>
          <button className="menu-item" onClick={logout}>
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

function Toasts() {
  const [toasts, setToasts] = useState([]);
  useEffect(() => {
    const onToast = (e) => {
      const id = Math.random();
      setToasts((t) => [...t, { id, ...e.detail }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
    };
    window.addEventListener('pm:toast', onToast);
    return () => window.removeEventListener('pm:toast', onToast);
  }, []);
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.kind}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}

export default function Layout() {
  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
          </span>
          Tasklane
        </Link>
        <nav className="topbar-nav">
          <Link to="/">Home</Link>
        </nav>
        <div className="topbar-right">
          <Notifications />
          <UserMenu />
        </div>
      </header>
      <Outlet />
      <Toasts />
    </div>
  );
}
