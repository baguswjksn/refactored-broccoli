import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import CardModal from '../components/CardModal';
import { AddForm, Avatar, ConfirmButton, ErrorState, InlineEdit } from '../components/ui';
import { attempt, backgroundFor, coverStyle, dueStatus, PRIVILEGES, shortDate, useLoad } from '../util';
import { toggleStar } from './Home';
import { BackgroundPicker } from './Workspace';

// Index at which to insert, given the pointer position and the item elements.
function dropIndex(container, selector, pointer, axis) {
  const items = [...container.querySelectorAll(selector)];
  for (let i = 0; i < items.length; i++) {
    const r = items[i].getBoundingClientRect();
    const mid = axis === 'y' ? r.top + r.height / 2 : r.left + r.width / 2;
    if (pointer < mid) return i;
  }
  return items.length;
}

function CardTile({ card, onOpen, draggable, onDragStart, onDragEnd, dragging }) {
  const due = dueStatus(card.deadline);
  return (
    <div
      className={`card ${dragging ? 'dragging' : ''}`}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      onKeyDown={(e) => e.key === 'Enter' && onOpen()}
      tabIndex={0}
      role="button"
      aria-label={`Open card ${card.title}`}
    >
      {coverStyle(card.cover) && <div className="card-cover" style={coverStyle(card.cover)} />}
      {card.labels.length > 0 && (
        <div className="card-labels">
          {card.labels.map((l) => (
            <span key={l.label_id} className="label-chip" style={{ background: l.color }} title={l.label_title}>
              {l.label_title}
            </span>
          ))}
        </div>
      )}
      <div className="card-title">{card.title}</div>
      {(card.deadline || card.description || card.comment_count > 0 || card.checklist_total > 0 || card.attachment_count > 0 || card.members.length > 0) && (
        <div className="card-meta">
          {card.deadline && <span className={`meta due-${due}`}>◷ {shortDate(card.deadline)}</span>}
          {card.description && <span className="meta" title="Has description">≡</span>}
          {card.comment_count > 0 && <span className="meta">💬 {card.comment_count}</span>}
          {card.attachment_count > 0 && <span className="meta">📎 {card.attachment_count}</span>}
          {card.checklist_total > 0 && (
            <span className={`meta ${card.checklist_done === card.checklist_total ? 'meta-done' : ''}`}>
              ☑ {card.checklist_done}/{card.checklist_total}
            </span>
          )}
          <span className="card-members">
            {card.members.map((m) => <Avatar key={m.user_id} name={m.username} size={22} />)}
          </span>
        </div>
      )}
    </div>
  );
}

function BoardMenu({ board, collaborators, onChange, onClose }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [invitee, setInvitee] = useState('');
  const [privilege, setPrivilege] = useState(2);
  const isOwner = board.board_privilege === 3;
  const canEdit = board.board_privilege >= 2;
  const update = (body) => attempt(() => api.put(`/boards/${board.id}`, body)).then((ok) => ok && onChange());

  const addCollaborator = async (e) => {
    e.preventDefault();
    const value = invitee.trim();
    const body = { privilege_id: privilege, ...(value.includes('@') ? { email: value } : { username: value }) };
    if (await attempt(() => api.post(`/boards/${board.id}/collaborator`, body), `${value} added`)) {
      setInvitee('');
      onChange();
    }
  };

  return (
    <aside className="board-menu">
      <div className="board-menu-head">
        <strong>Board menu</strong>
        <button className="icon-btn" onClick={onClose} aria-label="Close menu">✕</button>
      </div>

      {canEdit && (
        <section>
          <h3>Background</h3>
          <BackgroundPicker value={board.background} onChange={(background) => update({ background })} />
          <h3>Visibility</h3>
          <select className="input" value={board.visibility_id} onChange={(e) => update({ visibility: Number(e.target.value) })}>
            <option value={2}>Workspace members can view</option>
            <option value={1}>Private</option>
          </select>
        </section>
      )}

      <section>
        <h3>People with access</h3>
        <div className="collab-list">
          {collaborators.map((c) => (
            <div key={c.user_id} className="collab">
              <Avatar name={c.user_username} size={28} />
              <span className="collab-name">
                {c.user_username}
                {c.user_id === board.owner_id && <span className="muted small"> · owner</span>}
              </span>
              {isOwner && c.user_id !== board.owner_id ? (
                <select className="input input-sm" value={c.privilege_id}
                  onChange={(e) => attempt(() => api.put(`/boards/${board.id}/collaborator/${c.user_id}`, { privilege_id: Number(e.target.value) })).then(onChange)}>
                  {Object.entries(PRIVILEGES).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </select>
              ) : (
                <span className="muted small">{PRIVILEGES[c.privilege_id]}</span>
              )}
              {isOwner && c.user_id !== board.owner_id && (
                <button className="icon-btn" aria-label={`Remove ${c.user_username}`}
                  onClick={() => attempt(() => api.del(`/boards/${board.id}/collaborator/${c.user_id}`)).then(onChange)}>✕</button>
              )}
            </div>
          ))}
        </div>
        {board.visibility_id === 2 && <p className="muted small">Members of {board.workspace_name} can also view this board.</p>}
        {isOwner && (
          <form className="stack-sm" onSubmit={addCollaborator}>
            <input className="input" required placeholder="Username or email" value={invitee} onChange={(e) => setInvitee(e.target.value)} />
            <div className="row">
              <select className="input" value={privilege} onChange={(e) => setPrivilege(Number(e.target.value))}>
                {Object.entries(PRIVILEGES).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
              <button className="btn btn-primary">Add</button>
            </div>
          </form>
        )}
      </section>

      <section>
        <p className="muted small">
          Your access: {PRIVILEGES[board.board_privilege]} {board.owner_username && `· created by ${board.owner_username === user.username ? 'you' : board.owner_username}`}
        </p>
        {isOwner && (
          <ConfirmButton confirmLabel="Delete forever"
            onConfirm={async () => (await attempt(() => api.del(`/boards/${board.id}`), 'Board deleted')) && navigate(`/w/${board.workspace_id}`)}>
            Delete board
          </ConfirmButton>
        )}
      </section>
    </aside>
  );
}

export default function Board() {
  const { boardId } = useParams();
  const [openCard, setOpenCard] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [drag, setDrag] = useState(null); // { type: 'card'|'list', id, fromList }
  const [dropAt, setDropAt] = useState(null); // { listId, index } for cards, { index } for lists
  const boardRef = useRef(null);

  const data = useLoad(async () => {
    const [board, lists, cards, collaborators] = await Promise.all([
      api.get(`/boards/${boardId}`),
      api.get(`/boards/${boardId}/list`),
      api.get(`/boards/${boardId}/cards`),
      api.get(`/boards/${boardId}/collaborator`),
    ]);
    return { board, lists, cards, collaborators };
  }, [boardId]);

  if (data.error) return <main className="page"><ErrorState error={data.error} /></main>;
  if (!data.data) return <div className="page-loading">Loading…</div>;
  const { board, lists, cards, collaborators } = data.data;
  const canEdit = board.board_privilege >= 2;
  const starred = Boolean(Number(board.is_starred));
  const cardsIn = (listId) => cards.filter((c) => c.list_id === listId);
  // Drop indexes count only items that are not being dragged.
  const visibleLists = lists.filter((l) => !(drag?.type === "list" && l.id === drag.id));

  const reload = data.reload;

  // ---- drag & drop -------------------------------------------------------
  const endDrag = () => {
    setDrag(null);
    setDropAt(null);
  };

  const onListBodyDragOver = (e, listId) => {
    if (drag?.type !== 'card') return;
    e.preventDefault();
    e.stopPropagation();
    const index = dropIndex(e.currentTarget, '.card:not(.dragging)', e.clientY, 'y');
    if (dropAt?.listId !== listId || dropAt?.index !== index) setDropAt({ listId, index });
  };

  const onCardDrop = async (e, listId) => {
    e.preventDefault();
    e.stopPropagation();
    if (drag?.type !== 'card' || !dropAt) return endDrag();
    const { id, fromList } = drag;
    const index = dropAt.index;
    endDrag();
    // Optimistic reorder so the card lands immediately.
    const moving = cards.find((c) => c.card_id === id);
    const rest = cards.filter((c) => c.card_id !== id);
    const target = rest.filter((c) => c.list_id === listId);
    const before = target[index];
    const next = [...rest];
    next.splice(before ? next.indexOf(before) : next.length, 0, { ...moving, list_id: listId });
    data.setData({ ...data.data, cards: next });
    await attempt(() => api.put(`/list/${fromList}/card/${id}`, { list_id: listId, position: index }));
    reload();
  };

  const onBoardDragOver = (e) => {
    if (drag?.type !== 'list') return;
    e.preventDefault();
    const index = dropIndex(boardRef.current, '.list:not(.dragging)', e.clientX, 'x');
    if (dropAt?.index !== index) setDropAt({ index });
  };

  const onListDrop = async (e) => {
    if (drag?.type !== 'list') return;
    e.preventDefault();
    const { id } = drag;
    const index = dropAt?.index ?? 0;
    endDrag();
    const moving = lists.find((l) => l.id === id);
    const next = lists.filter((l) => l.id !== id);
    next.splice(index, 0, moving);
    data.setData({ ...data.data, lists: next });
    await attempt(() => api.put(`/list/${id}/order`, { position: index }));
    reload();
  };

  // ---- actions -----------------------------------------------------------
  const addList = (title) => attempt(() => api.post(`/boards/${boardId}/list`, { title })).then((ok) => (ok && reload(), ok));
  const addCard = (listId, title) => attempt(() => api.post(`/list/${listId}/card`, { title })).then((ok) => (ok && reload(), ok));
  const renameList = (listId, title) => attempt(() => api.put(`/list/${listId}/title`, { title })).then((ok) => ok && reload());
  const deleteList = (listId) => attempt(() => api.del(`/list/${listId}`), 'List deleted').then((ok) => ok && reload());
  const renameBoard = (board_title) => attempt(() => api.put(`/boards/${boardId}`, { board_title })).then((ok) => ok && reload());
  const star = async () => (await toggleStar(board.id, !starred)) && reload();

  const placeholder = <div className="card-placeholder" />;

  return (
    <div className="board-page" style={{ '--board-bg': backgroundFor(board.background) }}>
      <div className="board-bar">
        <h1 className="board-title">
          <InlineEdit value={board.board_title} disabled={!canEdit} onSave={renameBoard} />
        </h1>
        <button className={`board-bar-btn star ${starred ? 'on' : ''}`} onClick={star} aria-label={starred ? 'Unstar' : 'Star'}>★</button>
        <Link className="board-bar-btn" to={`/w/${board.workspace_id}`}>{board.workspace_name}</Link>
        <span className="board-bar-btn static">{board.visibility_id === 2 ? 'Workspace visible' : 'Private'}</span>
        <div className="board-bar-right">
          <div className="avatar-stack">
            {collaborators.slice(0, 5).map((c) => <Avatar key={c.user_id} name={c.user_username} size={28} />)}
          </div>
          {!canEdit && <span className="board-bar-btn static">View only</span>}
          <button className="board-bar-btn" onClick={() => setMenuOpen(!menuOpen)}>⋯ Menu</button>
        </div>
      </div>

      <div className="board-body">
        <div className="lists" ref={boardRef} onDragOver={onBoardDragOver} onDrop={onListDrop}>
          {lists.map((list) => {
            const listCards = cardsIn(list.id);
            const visibleCards = listCards.filter((c) => !(drag?.type === "card" && c.card_id === drag.id));
            const cardGapBefore = dropAt?.listId === list.id ? visibleCards[dropAt.index]?.card_id : undefined;
            const showListGap = drag?.type === "list" && dropAt?.index !== undefined && visibleLists[dropAt.index]?.id === list.id;
            return (
              <div key={list.id} className="list-slot">
                {showListGap && <div className="list-placeholder" />}
                <section
                  className={`list ${drag?.type === 'list' && drag.id === list.id ? 'dragging' : ''}`}
                  aria-label={list.title}
                >
                  <header
                    className="list-head"
                    draggable={canEdit}
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', `list:${list.id}`);
                      setDrag({ type: 'list', id: list.id });
                    }}
                    onDragEnd={endDrag}
                  >
                    <h2><InlineEdit value={list.title} disabled={!canEdit} onSave={(t) => renameList(list.id, t)} /></h2>
                    <span className="list-count">{listCards.length}</span>
                    {canEdit && (
                      <ConfirmButton className="icon-btn list-delete" confirmLabel="Delete list" onConfirm={() => deleteList(list.id)}>
                        <span aria-label="Delete list">🗑</span>
                      </ConfirmButton>
                    )}
                  </header>
                  <div
                    className="list-cards"
                    onDragOver={(e) => onListBodyDragOver(e, list.id)}
                    onDrop={(e) => onCardDrop(e, list.id)}
                  >
                    {listCards.map((card) => (
                      <div key={card.card_id} className="card-slot">
                        {cardGapBefore === card.card_id && placeholder}
                        <CardTile
                          card={card}
                          draggable={canEdit}
                          dragging={drag?.type === 'card' && drag.id === card.card_id}
                          onOpen={() => setOpenCard(card.card_id)}
                          onDragStart={(e) => {
                            e.stopPropagation();
                            e.dataTransfer.effectAllowed = 'move';
                            e.dataTransfer.setData('text/plain', `card:${card.card_id}`);
                            setDrag({ type: 'card', id: card.card_id, fromList: list.id });
                          }}
                          onDragEnd={endDrag}
                        />
                      </div>
                    ))}
                    {dropAt?.listId === list.id && dropAt.index >= visibleCards.length && placeholder}
                  </div>
                  {canEdit && <AddForm label="Add a card" placeholder="Card title" onAdd={(t) => addCard(list.id, t)} className="list-add" />}
                </section>
              </div>
            );
          })}
          {drag?.type === "list" && dropAt?.index >= visibleLists.length && <div className="list-placeholder" />}
          {canEdit && (
            <div className="list list-new">
              <AddForm label={lists.length ? 'Add another list' : 'Add a list'} placeholder="List title" onAdd={addList} />
            </div>
          )}
          {!canEdit && lists.length === 0 && <div className="list list-new muted">This board is empty.</div>}
        </div>
        {menuOpen && <BoardMenu board={board} collaborators={collaborators} onChange={reload} onClose={() => setMenuOpen(false)} />}
      </div>

      {openCard && (
        <CardModal
          cardId={openCard}
          lists={lists}
          collaborators={collaborators}
          onClose={() => setOpenCard(null)}
          onChange={reload}
        />
      )}
    </div>
  );
}
