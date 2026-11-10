import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { Modal } from '../components/ui';
import { attempt, backgroundFor, useLoad } from '../util';

export function BoardTile({ board, onStar }) {
  const starred = Boolean(Number(board.is_starred));
  return (
    <Link to={`/b/${board.board_id ?? board.id}`} className="board-tile" style={{ '--tile-bg': backgroundFor(board.background) }}>
      <span className="board-tile-title">{board.board_title}</span>
      {board.workspace_name && <span className="board-tile-sub">{board.workspace_name}</span>}
      {onStar && (
        <button
          className={`star ${starred ? 'on' : ''}`}
          aria-label={starred ? 'Unstar board' : 'Star board'}
          onClick={(e) => {
            e.preventDefault();
            onStar(board, !starred);
          }}
        >
          ★
        </button>
      )}
    </Link>
  );
}

export async function toggleStar(boardId, star) {
  return attempt(() => (star ? api.post('/boards/star', { board_id: boardId }) : api.del(`/users/star/${boardId}`)));
}

export function CreateWorkspaceModal({ onClose }) {
  const navigate = useNavigate();
  const types = useLoad(() => api.get('/workspace/types'));
  const [form, setForm] = useState({ name: '', type_id: '', description: '' });

  const submit = async (e) => {
    e.preventDefault();
    let id;
    const ok = await attempt(async () => {
      id = (await api.post('/workspace', { ...form, type_id: form.type_id || null })).workspaceId;
    });
    if (ok) navigate(`/w/${id}`);
  };

  return (
    <Modal title="Create workspace" onClose={onClose}>
      <form className="stack" onSubmit={submit}>
        <label className="field">
          <span>Name</span>
          <input className="input" autoFocus required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>
        <label className="field">
          <span>Type</span>
          <select className="input" value={form.type_id} onChange={(e) => setForm({ ...form, type_id: e.target.value })}>
            <option value="">Choose…</option>
            {types.data?.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Description <span className="muted">(optional)</span></span>
          <textarea className="input" rows={3} maxLength={255} value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </label>
        <button className="btn btn-primary">Create workspace</button>
      </form>
    </Modal>
  );
}

function Invitations({ invites, onChange }) {
  const navigate = useNavigate();
  if (!invites?.length) return null;
  const accept = async (inv) => {
    if (await attempt(() => api.post('/workspace/invitation/accept', { invitation_id: inv.invitation_id }), 'Invitation accepted')) {
      navigate(`/w/${inv.workspace_id}`);
    }
  };
  const decline = async (inv) => {
    if (await attempt(() => api.del(`/users/refuse/${inv.invitation_id}`))) onChange();
  };
  return (
    <section className="section">
      <h2 className="section-title">Invitations</h2>
      <div className="invites">
        {invites.map((inv) => (
          <div className="invite" key={inv.invitation_id}>
            <div>
              <strong>{inv.workspace_name}</strong>
              <div className="muted small">Invited by {inv.inviter_user_name}</div>
            </div>
            <div className="row">
              <button className="btn btn-primary" onClick={() => accept(inv)}>Join</button>
              <button className="btn btn-ghost" onClick={() => decline(inv)}>Decline</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [creating, setCreating] = useState(false);
  const data = useLoad(async () => {
    const [workspaces, starred, recent, invites] = await Promise.all([
      api.get('/users/workspace'),
      api.get('/users/starred'),
      api.get('/users/recent'),
      api.get('/users/invite'),
    ]);
    return { workspaces, starred, recent, invites };
  });

  if (data.loading && !data.data) return <div className="page-loading">Loading…</div>;
  const { workspaces = [], starred = [], recent = [], invites = [] } = data.data || {};

  const onStar = async (board, star) => {
    if (await toggleStar(board.board_id, star)) data.reload();
  };

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1>Hi, {user.username}</h1>
          <p className="muted">Here's what you've been working on.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setCreating(true)}>+ New workspace</button>
      </div>

      <Invitations invites={invites} onChange={data.reload} />

      {starred.length > 0 && (
        <section className="section">
          <h2 className="section-title">★ Starred</h2>
          <div className="board-grid">
            {starred.map((b) => <BoardTile key={b.board_id} board={{ ...b, is_starred: 1 }} onStar={onStar} />)}
          </div>
        </section>
      )}

      {recent.length > 0 && (
        <section className="section">
          <h2 className="section-title">Recently viewed</h2>
          <div className="board-grid">
            {recent.map((b) => <BoardTile key={b.board_id} board={b} onStar={onStar} />)}
          </div>
        </section>
      )}

      <section className="section">
        <h2 className="section-title">Your workspaces</h2>
        {workspaces.length === 0 ? (
          <div className="empty">
            <p>You don't have any workspaces yet. A workspace groups boards and the people who work on them.</p>
            <button className="btn btn-primary" onClick={() => setCreating(true)}>Create your first workspace</button>
          </div>
        ) : (
          <div className="workspace-list">
            {workspaces.map((w) => (
              <Link key={w.workspace_id} to={`/w/${w.workspace_id}`} className="workspace-row">
                <span className="ws-mark">{w.workspace_name.slice(0, 1).toUpperCase()}</span>
                <span className="ws-info">
                  <strong>{w.workspace_name}</strong>
                  <span className="muted small">
                    {w.workspace_type || 'Workspace'} · {w.member_count} member{w.member_count === 1 ? '' : 's'} · {w.role_name}
                  </span>
                </span>
                <span className="muted">→</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {creating && <CreateWorkspaceModal onClose={() => setCreating(false)} />}
    </main>
  );
}
