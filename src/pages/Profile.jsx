import { useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import { Avatar, InlineEdit } from '../components/ui';
import { attempt, shortDate } from '../util';

export default function Profile() {
  const { user, refresh } = useAuth();
  const [pw, setPw] = useState({ old_password: '', new_password: '' });

  const save = (field, value) =>
    attempt(() => api.put(`/users/${field}`, { [field]: value }), 'Saved').then((ok) => ok && refresh());

  const changePassword = async (e) => {
    e.preventDefault();
    if (await attempt(() => api.put('/users/password', pw), 'Password changed')) setPw({ old_password: '', new_password: '' });
  };

  return (
    <main className="page page-narrow">
      <div className="profile-head">
        <Avatar name={user.username} size={64} />
        <div>
          <h1>{user.username}</h1>
          <p className="muted small">Member since {shortDate(user.user_created_at)}</p>
        </div>
      </div>

      <section className="panel stack">
        <h2 className="section-title">Profile</h2>
        <div className="field">
          <span>Username</span>
          <InlineEdit value={user.username} onSave={(v) => save('username', v)} className="block" />
        </div>
        <div className="field">
          <span>Email</span>
          <InlineEdit value={user.email} onSave={(v) => save('email', v)} className="block" />
        </div>
        <div className="field">
          <span>Bio</span>
          <InlineEdit multiline value={user.bio || ''} placeholder="Tell your team a little about yourself" onSave={(v) => save('bio', v)} className="block" />
        </div>
      </section>

      <section className="panel">
        <h2 className="section-title">Change password</h2>
        <form className="stack" onSubmit={changePassword}>
          <label className="field">
            <span>Current password</span>
            <input className="input" type="password" required value={pw.old_password} onChange={(e) => setPw({ ...pw, old_password: e.target.value })} />
          </label>
          <label className="field">
            <span>New password</span>
            <input className="input" type="password" required minLength={6} value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })} />
          </label>
          <div><button className="btn btn-primary">Update password</button></div>
        </form>
      </section>
    </main>
  );
}
