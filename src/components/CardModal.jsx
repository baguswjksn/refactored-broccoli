import { useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import { attempt, coverStyle, dueStatus, LABEL_COLORS, safeUrl, timeAgo, toLocalInput, useLoad } from '../util';
import { AddForm, Avatar, ConfirmButton, InlineEdit, Modal } from './ui';

const COVER_COLORS = ['#3b5bdb', '#0ca678', '#f59f00', '#e8590c', '#e03131', '#ae3ec9', '#495057'];

function Section({ title, children, action }) {
  return (
    <section className="card-section">
      <div className="card-section-head">
        <h3>{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function Labels({ card, canEdit, run }) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [color, setColor] = useState(LABEL_COLORS[0]);
  const base = `/card/${card.card_id}/label`;

  const add = async (e) => {
    e.preventDefault();
    if (await run(() => api.post(base, { title: title.trim(), color }))) {
      setTitle('');
      setAdding(false);
    }
  };

  return (
    <div className="side-block">
      <h4>Labels</h4>
      <div className="chips">
        {card.labels.map((l) => (
          <span key={l.label_id} className="label-chip label-lg" style={{ background: l.color }}>
            {l.label_title || ' '}
            {canEdit && <button aria-label={`Remove label ${l.label_title}`} onClick={() => run(() => api.del(`${base}/${l.label_id}`))}>✕</button>}
          </span>
        ))}
        {canEdit && !adding && <button className="chip-add" onClick={() => setAdding(true)}>+</button>}
      </div>
      {adding && (
        <form className="stack-sm popover" onSubmit={add}>
          <input className="input" autoFocus placeholder="Label name" value={title} onChange={(e) => setTitle(e.target.value)} />
          <div className="swatches">
            {LABEL_COLORS.map((c) => (
              <button key={c} type="button" className={`swatch ${c === color ? 'on' : ''}`} style={{ background: c }}
                onClick={() => setColor(c)} aria-label={`Color ${c}`} />
            ))}
          </div>
          <div className="row">
            <button className="btn btn-primary">Add label</button>
            <button type="button" className="btn btn-ghost" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}

function Members({ card, canEdit, collaborators, run }) {
  const assigned = new Set(card.members.map((m) => m.user_id));
  const available = collaborators.filter((c) => !assigned.has(c.user_id));
  return (
    <div className="side-block">
      <h4>Members</h4>
      <div className="chips">
        {card.members.map((m) => (
          <span key={m.member_id} className="member-chip">
            <Avatar name={m.member_username} size={24} />
            {m.member_username}
            {canEdit && (
              <button aria-label={`Unassign ${m.member_username}`} onClick={() => run(() => api.del(`/card/${card.card_id}/member/${m.member_id}`))}>✕</button>
            )}
          </span>
        ))}
        {card.members.length === 0 && !canEdit && <span className="muted small">Nobody yet</span>}
      </div>
      {canEdit && available.length > 0 && (
        <select className="input input-sm" value="" onChange={(e) => run(() => api.post(`/card/${card.card_id}/member`, { user_id: Number(e.target.value) }))}>
          <option value="">Assign someone…</option>
          {available.map((c) => <option key={c.user_id} value={c.user_id}>{c.user_username}</option>)}
        </select>
      )}
    </div>
  );
}

function DueDate({ card, canEdit, run }) {
  const base = `/card/${card.card_id}/date`;
  const save = (value) => {
    if (!value) return;
    return card.date
      ? run(() => api.put(`${base}/${card.date.id}`, { deadline: value }))
      : run(() => api.post(base, { deadline: value }));
  };
  const status = dueStatus(card.date?.deadline);
  return (
    <div className="side-block">
      <h4>Due date</h4>
      {canEdit ? (
        <div className="row">
          <input type="datetime-local" className={`input input-sm due-input due-${status}`}
            value={card.date ? toLocalInput(card.date.deadline) : ''} onChange={(e) => save(e.target.value)} />
          {card.date && <button className="icon-btn" aria-label="Remove due date" onClick={() => run(() => api.del(`${base}/${card.date.id}`))}>✕</button>}
        </div>
      ) : (
        <span className={`due-text due-${status}`}>{card.date ? new Date(card.date.deadline).toLocaleString() : 'None'}</span>
      )}
      {status === 'overdue' && <small className="due-overdue-text">Overdue</small>}
    </div>
  );
}

function Cover({ card, canEdit, run }) {
  const [url, setUrl] = useState('');
  const base = `/card/${card.card_id}/cover`;
  const set = (cover) => run(() => (card.cover ? api.put(base, { cover }) : api.post(base, { cover })));
  if (!canEdit) return null;
  return (
    <div className="side-block">
      <h4>Cover</h4>
      <div className="swatches">
        {COVER_COLORS.map((c) => (
          <button key={c} className={`swatch ${card.cover?.cover === c ? 'on' : ''}`} style={{ background: c }}
            onClick={() => set(c)} aria-label={`Cover color ${c}`} />
        ))}
      </div>
      <form className="row" onSubmit={(e) => { e.preventDefault(); if (url.trim()) set(url.trim()).then(() => setUrl('')); }}>
        <input className="input input-sm" type="url" placeholder="or image URL" value={url} onChange={(e) => setUrl(e.target.value)} />
      </form>
      {card.cover && <button className="link-btn" onClick={() => run(() => api.del(base))}>Remove cover</button>}
    </div>
  );
}

function Checklist({ card, canEdit, run }) {
  const items = card.checklist;
  const done = items.filter((i) => i.status_id === 2).length;
  const base = `/card/${card.card_id}/checklist`;
  return (
    <Section title="Checklist" action={items.length > 0 && <span className="muted small">{done}/{items.length}</span>}>
      {items.length > 0 && (
        <div className="progress" aria-label={`${done} of ${items.length} done`}>
          <div style={{ width: `${(done / items.length) * 100}%` }} />
        </div>
      )}
      <ul className="checklist">
        {items.map((item) => (
          <li key={item.checklist_id} className={item.status_id === 2 ? 'done' : ''}>
            <input type="checkbox" checked={item.status_id === 2} disabled={!canEdit}
              aria-label={item.checklist_title}
              onChange={(e) => run(() => api.put(`${base}/${item.checklist_id}/${e.target.checked ? 'done' : 'not-yet'}`))} />
            <InlineEdit value={item.checklist_title} disabled={!canEdit}
              onSave={(title) => run(() => api.put(`${base}/${item.checklist_id}/title`, { title }))} />
            {canEdit && <button className="icon-btn" aria-label="Delete item" onClick={() => run(() => api.del(`${base}/${item.checklist_id}`))}>✕</button>}
          </li>
        ))}
      </ul>
      {canEdit && <AddForm label="Add an item" placeholder="Item" onAdd={(title) => run(() => api.post(base, { title }))} />}
    </Section>
  );
}

function Attachments({ card, canEdit, run }) {
  const [form, setForm] = useState(null);
  const base = `/card/${card.card_id}/attachments`;
  const add = async (e) => {
    e.preventDefault();
    if (await run(() => api.post(base, { name: form.name || form.file_path, file_path: form.file_path }))) setForm(null);
  };
  if (!canEdit && card.attachments.length === 0) return null;
  return (
    <Section title="Links & attachments">
      <ul className="attachments">
        {card.attachments.map((a) => (
          <li key={a.id}>
            {safeUrl(a.file_path) ? <a href={safeUrl(a.file_path)} target="_blank" rel="noreferrer noopener">{a.name}</a> : <span>{a.name}</span>}
            <span className="muted small">{timeAgo(a.created_at)}</span>
            {canEdit && <button className="icon-btn" aria-label={`Remove ${a.name}`} onClick={() => run(() => api.del(`${base}/${a.id}`))}>✕</button>}
          </li>
        ))}
      </ul>
      {canEdit && !form && <button className="add-trigger" onClick={() => setForm({ name: '', file_path: '' })}>+ Add a link</button>}
      {form && (
        <form className="stack-sm" onSubmit={add}>
          <input className="input" type="url" required autoFocus placeholder="https://…" value={form.file_path}
            onChange={(e) => setForm({ ...form, file_path: e.target.value })} />
          <input className="input" placeholder="Name (optional)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div className="row">
            <button className="btn btn-primary">Add</button>
            <button type="button" className="btn btn-ghost" onClick={() => setForm(null)}>Cancel</button>
          </div>
        </form>
      )}
    </Section>
  );
}

function Comments({ card, canEdit, run }) {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const base = `/card/${card.card_id}/comment`;
  const isOwner = card.board_privilege === 3;

  const add = async (e) => {
    e.preventDefault();
    if (text.trim() && (await run(() => api.post(base, { comment: text.trim() })))) setText('');
  };

  return (
    <Section title="Comments">
      {canEdit && (
        <form className="comment-form" onSubmit={add}>
          <Avatar name={user.username} size={30} />
          <textarea className="input" rows={2} placeholder="Write a comment…" value={text} onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.metaKey || e.ctrlKey) && add(e)} />
          <button className="btn btn-primary" disabled={!text.trim()}>Save</button>
        </form>
      )}
      <ul className="comments">
        {card.comments.map((c) => {
          const mine = c.user_id === user.user_id;
          return (
            <li key={c.comment_id}>
              <Avatar name={c.username} size={30} />
              <div className="comment-body">
                <div><strong>{c.username}</strong> <span className="muted small">{timeAgo(c.comment_created_at)}</span></div>
                <InlineEdit multiline value={c.comment} disabled={!mine}
                  onSave={(comment) => run(() => api.put(`${base}/${c.comment_id}`, { comment }))} className="comment-text" />
                {(mine || isOwner) && (
                  <ConfirmButton className="link-btn" confirmLabel="Delete" onConfirm={() => run(() => api.del(`${base}/${c.comment_id}`))}>
                    Delete
                  </ConfirmButton>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

export default function CardModal({ cardId, lists, collaborators, onClose, onChange }) {
  const card = useLoad(() => api.get(`/card/${cardId}`), [cardId]);

  // Runs a mutation, then refreshes both this card and the board behind it.
  const run = async (action) => {
    const ok = await attempt(action);
    if (ok) {
      card.reload();
      onChange();
    }
    return ok;
  };

  if (card.error) {
    return <Modal title="Card" onClose={onClose}><p>{card.error.message}</p></Modal>;
  }
  if (!card.data) {
    return <Modal title="Loading…" onClose={onClose}><p className="muted">Loading…</p></Modal>;
  }

  const c = card.data;
  const canEdit = c.board_privilege >= 2;
  const cardPath = `/list/${c.list_id}/card/${c.card_id}`;
  const cover = coverStyle(c.cover?.cover);

  return (
    <Modal title={c.title} onClose={onClose} wide bare>
      {cover && (
        <div className="modal-cover" style={cover} />
      )}
      <div className="card-detail-head">
        <h2 className="card-detail-title">
          <InlineEdit value={c.title} disabled={!canEdit} onSave={(title) => run(() => api.put(cardPath, { title }))} />
        </h2>
        <div className="muted small">
          in list{' '}
          {canEdit ? (
            <select className="input input-inline" value={c.list_id}
              onChange={(e) => run(() => api.put(cardPath, { list_id: Number(e.target.value) }))} aria-label="Move to list">
              {lists.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
            </select>
          ) : (
            <strong>{c.list_title}</strong>
          )}
        </div>
      </div>

      <div className="card-detail">
        <div className="card-main">
          <Section title="Description">
            <InlineEdit multiline value={c.description || ''} disabled={!canEdit} placeholder={canEdit ? 'Add a more detailed description…' : 'No description'}
              onSave={(description) => run(() => api.put(cardPath, { description }))} className="block description" />
          </Section>
          <Checklist card={c} canEdit={canEdit} run={run} />
          <Attachments card={c} canEdit={canEdit} run={run} />
          <Comments card={c} canEdit={canEdit} run={run} />
          <Section title="Activity">
            <ul className="activity">
              {c.activity.map((a) => (
                <li key={a.id}>
                  <strong>{a.user_username}</strong> {a.detailed} <span className="muted small">· {timeAgo(a.created_at)}</span>
                </li>
              ))}
            </ul>
          </Section>
        </div>
        <aside className="card-side">
          <Members card={c} canEdit={canEdit} collaborators={collaborators} run={run} />
          <Labels card={c} canEdit={canEdit} run={run} />
          <DueDate card={c} canEdit={canEdit} run={run} />
          <Cover card={c} canEdit={canEdit} run={run} />
          {canEdit && (
            <div className="side-block">
              <ConfirmButton confirmLabel="Delete card"
                onConfirm={() => attempt(() => api.del(`/card/${c.card_id}`), 'Card deleted').then((ok) => ok && (onClose(), onChange()))}>
                Delete card
              </ConfirmButton>
            </div>
          )}
        </aside>
      </div>
    </Modal>
  );
}
