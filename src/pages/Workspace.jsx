import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { Avatar, ConfirmButton, ErrorState, InlineEdit, Modal } from '../components/ui';
import { attempt, BACKGROUNDS, backgroundFor, useLoad } from '../util';
import { BoardTile, toggleStar } from './Home';

export function BackgroundPicker({ value, onChange }) {
  return (
    <div className="bg-picker" role="radiogroup" aria-label="Background">
      {Object.keys(BACKGROUNDS).map((id) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={Number(value) === Number(id)}
          className={`bg-swatch ${Number(value) === Number(id) ? 'on' : ''}`}
          style={{ background: backgroundFor(id) }}
          onClick={() => onChange(Number(id))}
        />
      ))}
    </div>
  );
}

function CreateBoardModal({ workspaceId, onClose }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ board_title: '', background: 1, visibility: 2 });

  const submit = async (e) => {
    e.preventDefault();
    let id;
    if (await attempt(async () => { id = (await api.post(`/workspace/${workspaceId}/board`, form)).boardId; })) {
      navigate(`/b/${id}`);
    }
  };

  return (
    <Modal title="Create board" onClose={onClose}>
      <form className="stack" onSubmit={submit}>
        <div className="board-preview" style={{ '--tile-bg': backgroundFor(form.background) }}>
          <span>{form.board_title || 'Board title'}</span>
        </div>
        <label className="field">
          <span>Title</span>
          <input className="input" autoFocus required value={form.board_title}
            onChange={(e) => setForm({ ...form, board_title: e.target.value })} />
        </label>
        <div className="field">
          <span>Background</span>
          <BackgroundPicker value={form.background} onChange={(background) => setForm({ ...form, background })} />
        </div>
        <label className="field">
          <span>Visibility</span>
          <select className="input" value={form.visibility} onChange={(e) => setForm({ ...form, visibility: Number(e.target.value) })}>
            <option value={2}>Workspace: every member can view it</option>
            <option value={1}>Private: only people you add</option>
          </select>
        </label>
        <button className="btn btn-primary">Create board</button>
      </form>
    </Modal>
  );
}

function Members({ workspaceId, myRole }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const members = useLoad(() => api.get(`/workspace/${workspaceId}/members`), [workspaceId]);
  const [invitee, setInvitee] = useState('');
  const isAdmin = myRole === 'owner' || myRole === 'admin';

  const invite = async (e) => {
    e.preventDefault();
    const value = invitee.trim();
    const body = { workspace_id: workspaceId, ...(value.includes('@') ? { email: value } : { username: value }) };
    if (await attempt(() => api.post('/workspace/invite', body), `Invitation sent to ${value}`)) setInvitee('');
  };

  const remove = async (m) => {
    const self = m.user_id === user.user_id;
    if (await attempt(() => api.del(`/workspace/${workspaceId}/member/${m.membership_id}/kick`), self ? 'You left the workspace' : 'Member removed')) {
      self ? navigate('/') : members.reload();
    }
  };

  const promote = async (m) => {
    if (await attempt(() => api.put(`/workspace/${workspaceId}/member/${m.membership_id}/promote`), `${m.user_username} is now an admin`)) {
      members.reload();
    }
  };

  const canRemove = (m) => {
    const self = m.user_id === user.user_id;
    if (myRole === 'owner') return !self;
    if (self) return true;
    return myRole === 'admin' && m.role_name === 'client';
  };

  return (
    <div className="stack">
      {isAdmin && (
        <form className="invite-form" onSubmit={invite}>
          <input className="input" required placeholder="Username or email" value={invitee} onChange={(e) => setInvitee(e.target.value)} />
          <button className="btn btn-primary">Invite</button>
        </form>
      )}
      <div className="member-list">
        {members.data?.map((m) => (
          <div className="member" key={m.membership_id}>
            <Avatar name={m.user_username} size={34} />
            <div className="member-info">
              <strong>{m.user_username}{m.user_id === user.user_id && <span className="muted"> (you)</span>}</strong>
              <span className="muted small">{m.user_email}</span>
            </div>
            <span className={`role role-${m.role_name}`}>{m.role_name}</span>
            <div className="row">
              {isAdmin && m.role_name === 'client' && (
                <button className="btn btn-ghost" onClick={() => promote(m)}>Make admin</button>
              )}
              {canRemove(m) && (
                <ConfirmButton confirmLabel={m.user_id === user.user_id ? 'Leave' : 'Remove'} onConfirm={() => remove(m)}>
                  {m.user_id === user.user_id ? 'Leave' : 'Remove'}
                </ConfirmButton>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Settings({ workspace, onChange }) {
  const navigate = useNavigate();
  const types = useLoad(() => api.get('/workspace/types'));
  const id = workspace.id;
  const save = (path, body) => attempt(() => api.put(`/workspace/${id}/${path}`, body), 'Saved').then((ok) => ok && onChange());

  return (
    <div className="stack settings">
      <label className="field">
        <span>Type</span>
        <select className="input" value={workspace.type_id || ''} onChange={(e) => save('type', { type_id: e.target.value })}>
          <option value="" disabled>Choose…</option>
          {types.data?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </label>
      <div className="field">
        <span>Description</span>
        <InlineEdit multiline value={workspace.description || ''} placeholder="Add a description…"
          onSave={(description) => save('description', { description })} className="block" />
      </div>
      {workspace.user_role_on_workspace === 'owner' && (
        <div className="danger-zone">
          <div>
            <strong>Delete workspace</strong>
            <p className="muted small">Permanently deletes every board, list and card in this workspace.</p>
          </div>
          <ConfirmButton confirmLabel="Delete forever"
            onConfirm={async () => (await attempt(() => api.del(`/workspace/${id}`), 'Workspace deleted')) && navigate('/')}>
            Delete workspace
          </ConfirmButton>
        </div>
      )}
    </div>
  );
}

export default function Workspace() {
  const { workspaceId } = useParams();
  const [tab, setTab] = useState('boards');
  const [creating, setCreating] = useState(false);
  const ws = useLoad(() => api.get(`/workspace/${workspaceId}`), [workspaceId]);
  const boards = useLoad(() => api.get(`/workspace/${workspaceId}/boards`), [workspaceId]);

  if (ws.error) return <main className="page"><ErrorState error={ws.error} /></main>;
  if (!ws.data) return <div className="page-loading">Loading…</div>;
  const workspace = ws.data;
  const role = workspace.user_role_on_workspace;
  const isAdmin = role === 'owner' || role === 'admin';

  const onStar = async (board, star) => (await toggleStar(board.board_id, star)) && boards.reload();

  return (
    <main className="page">
      <div className="page-head">
        <div className="ws-head">
          <span className="ws-mark ws-mark-lg">{workspace.workspace_name.slice(0, 1).toUpperCase()}</span>
          <div>
            <h1>
              <InlineEdit value={workspace.workspace_name} disabled={!isAdmin}
                onSave={(name) => attempt(() => api.put(`/workspace/${workspaceId}/name`, { name })).then((ok) => ok && ws.reload())} />
            </h1>
            <p className="muted small">
              {workspace.type_name || 'Workspace'} · {workspace.member_count} member{workspace.member_count === 1 ? '' : 's'} · you are {role}
            </p>
          </div>
        </div>
      </div>

      <div className="tabs" role="tablist">
        {['boards', 'members', ...(isAdmin ? ['settings'] : [])].map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={`tab ${tab === t ? 'on' : ''}`} onClick={() => setTab(t)}>
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'boards' && (
        <div className="board-grid">
          {boards.data?.map((b) => <BoardTile key={b.board_id} board={{ ...b, workspace_name: null }} onStar={onStar} />)}
          <button className="board-tile board-tile-new" onClick={() => setCreating(true)}>+ Create board</button>
        </div>
      )}
      {tab === 'members' && <Members workspaceId={workspaceId} myRole={role} />}
      {tab === 'settings' && <Settings workspace={workspace} onChange={ws.reload} />}

      {creating && <CreateBoardModal workspaceId={workspaceId} onClose={() => setCreating(false)} />}
    </main>
  );
}
