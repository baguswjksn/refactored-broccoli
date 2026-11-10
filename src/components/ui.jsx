import { useEffect, useRef, useState } from 'react';
import { initials } from '../util';

export function Modal({ title, onClose, children, wide, bare }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className={`modal-head ${bare ? 'modal-head-bare' : ''}`}>
          {!bare && <h2>{title}</h2>}
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

// A confirm step built into the page (browser confirm() dialogs are easy to miss).
export function ConfirmButton({ children, confirmLabel = 'Yes, delete', onConfirm, className = 'btn btn-danger-ghost' }) {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <button type="button" className={className} onClick={() => setAsking(true)}>
        {children}
      </button>
    );
  }
  return (
    <span className="confirm">
      <button type="button" className="btn btn-danger" onClick={() => { setAsking(false); onConfirm(); }}>
        {confirmLabel}
      </button>
      <button type="button" className="btn btn-ghost" onClick={() => setAsking(false)}>
        Cancel
      </button>
    </span>
  );
}

export function Avatar({ name, size = 28 }) {
  return (
    <span
      className="avatar"
      title={name}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials(name)}
    </span>
  );
}

// Text that turns into an input on click; saves on Enter/blur.
export function InlineEdit({ value, onSave, disabled, className = '', multiline, placeholder }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef(null);

  useEffect(() => setDraft(value), [value]);
  useEffect(() => {
    if (editing) ref.current?.select();
  }, [editing]);

  if (!editing || disabled) {
    return (
      <span
        className={`inline-edit ${disabled ? '' : 'editable'} ${className}`}
        onClick={() => !disabled && setEditing(true)}
        tabIndex={disabled ? undefined : 0}
        onKeyDown={(e) => e.key === 'Enter' && !disabled && setEditing(true)}
      >
        {value || <span className="muted">{placeholder}</span>}
      </span>
    );
  }

  const finish = async (save) => {
    setEditing(false);
    const next = draft.trim();
    if (save && next !== (value || '') && (next || multiline)) await onSave(next);
    else setDraft(value);
  };
  const Tag = multiline ? 'textarea' : 'input';
  return (
    <Tag
      ref={ref}
      className={`input inline-input ${className}`}
      value={draft || ''}
      rows={multiline ? 4 : undefined}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => finish(true)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') finish(false);
        if (e.key === 'Enter' && (!multiline || e.metaKey || e.ctrlKey)) finish(true);
      }}
    />
  );
}

// "+ Add something" that expands into a one-field form.
export function AddForm({ label, placeholder, onAdd, className = '' }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');

  if (!open) {
    return (
      <button type="button" className={`add-trigger ${className}`} onClick={() => setOpen(true)}>
        + {label}
      </button>
    );
  }
  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    const ok = await onAdd(text.trim());
    if (ok !== false) setText('');
  };
  return (
    <form className={`add-form ${className}`} onSubmit={submit}>
      <input
        autoFocus
        className="input"
        placeholder={placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
      />
      <div className="row">
        <button className="btn btn-primary">Add</button>
        <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="empty">
      <p>{error.status === 403 || error.status === 404 ? "This page doesn't exist or you don't have access." : error.message}</p>
      {onRetry && (
        <button className="btn" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
