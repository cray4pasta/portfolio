/* ─── PAGE EDIT MODE ─── Open a page with ?edit on the end of its URL to
   move and rewrite its blocks in place, a little like Figma:

   - hover shows what can be edited; click selects it
   - drag to move it; arrow keys nudge 1px (10px with Shift)
   - double-click text to rewrite it; Esc or clicking away finishes
   - "Copy changes" copies every edit, ready to paste to Claude, who writes
     them into the page for real

   Only elements marked data-edit="some-name" take part; data-edit-text
   also lets their words be edited. Edits are kept in this browser while
   you work (so a reload doesn't lose them) and are never shown to visitors:
   without ?edit this file does nothing. */
(function () {
  if (!/[?&]edit\b/.test(location.search)) return;

  const KEY = 'pageEdits:' + location.pathname;
  let edits = {};
  try { edits = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(edits)); } catch (e) {} };

  const items = [...document.querySelectorAll('[data-edit]')];
  const original = new Map(items.map((el) => [el, el.innerHTML]));

  // Moves use the CSS `translate` property, so nothing else about the layout
  // changes, and other scripts can follow along (see 'page-edit:moved')
  const place = (el) => {
    const e = edits[el.dataset.edit] || {};
    el.style.translate = e.x || e.y ? `${e.x || 0}px ${e.y || 0}px` : '';
    dispatchEvent(new CustomEvent('page-edit:moved', { detail: el }));
  };
  for (const el of items) {
    const e = edits[el.dataset.edit];
    if (e && typeof e.text === 'string' && el.hasAttribute('data-edit-text')) el.innerHTML = e.text;
    place(el);
  }

  // ── Look ──
  const style = document.createElement('style');
  style.textContent = `
    [data-edit] { cursor: move; outline: 1px dashed transparent; outline-offset: 4px; transition: outline-color .12s; }
    [data-edit]:hover { outline-color: rgb(24 119 242 / .55); }
    [data-edit].pe-selected { outline: 1.5px solid #1877f2; }
    [data-edit].pe-editing { cursor: text; outline: 1.5px solid #1877f2; background: rgb(24 119 242 / .05); }
    [data-edit] a { pointer-events: none; }
    .pe-bar { position: fixed; left: 50%; bottom: 16px; translate: -50% 0; z-index: 10001; display: flex; gap: 8px; align-items: center;
      padding: 8px 10px; background: #1d1d1f; color: #fff; border-radius: 10px; font: 12px/16px var(--font-sans, system-ui);
      box-shadow: 0 12px 32px -12px rgb(0 0 0 / .4); }
    .pe-bar button { padding: 5px 10px; border: 0; border-radius: 6px; background: #3a3a3c; color: #fff; font: inherit; cursor: pointer; }
    .pe-bar button:hover { background: #4a4a4c; }
    .pe-bar .pe-tip { opacity: .7; margin-right: 4px; }
    .pe-bar, .pe-bar button { white-space: nowrap; }
    @media (max-width: 560px) { .pe-bar .pe-tip { display: none; } }
  `;
  document.head.appendChild(style);

  // ── Selecting, dragging, nudging ──
  let selected = null, editing = null, drag = null;
  const select = (el) => {
    if (selected === el) return;
    if (selected) selected.classList.remove('pe-selected');
    selected = el;
    if (el) el.classList.add('pe-selected');
  };
  const finishEditing = () => {
    if (!editing) return;
    const el = editing;
    editing = null;
    el.contentEditable = 'false';
    el.classList.remove('pe-editing');
    const id = el.dataset.edit;
    if (el.innerHTML !== original.get(el)) (edits[id] ||= {}).text = el.innerHTML;
    else if (edits[id]) delete edits[id].text;
    save();
  };
  const startEditing = (el) => {
    finishEditing();
    editing = el;
    el.classList.add('pe-editing');
    el.contentEditable = 'true';
    el.focus();
  };

  for (const el of items) {
    el.addEventListener('pointerdown', (e) => {
      if (editing === el) return;                   // selecting words, not moving
      finishEditing();
      select(el);
      const prev = edits[el.dataset.edit] || {};
      drag = { el, id: el.dataset.edit, sx: e.clientX, sy: e.clientY, x: prev.x || 0, y: prev.y || 0, moved: false };
      el.setPointerCapture(e.pointerId);
      e.preventDefault();
      e.stopPropagation();
    }, true);
    el.addEventListener('pointermove', (e) => {
      if (!drag || drag.el !== el) return;
      const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
      if (!drag.moved && Math.hypot(dx, dy) < 3) return;   // a click, not a drag
      drag.moved = true;
      const ed = (edits[drag.id] ||= {});
      ed.x = Math.round(drag.x + dx);
      ed.y = Math.round(drag.y + dy);
      place(el);
    });
    el.addEventListener('pointerup', () => { if (drag && drag.el === el) { if (drag.moved) save(); drag = null; } });
    el.addEventListener('dblclick', (e) => {
      if (!el.hasAttribute('data-edit-text')) return;
      e.preventDefault();
      startEditing(el);
    });
    // links inside editable blocks don't navigate while editing the page
    el.addEventListener('click', (e) => e.preventDefault(), true);
  }
  document.addEventListener('pointerdown', (e) => {
    if (e.target.closest('[data-edit], .pe-bar')) return;
    finishEditing();
    select(null);
  });
  document.addEventListener('keydown', (e) => {
    if (editing) {
      if (e.key === 'Escape') { finishEditing(); e.preventDefault(); }
      return;
    }
    if (!selected) return;
    const step = e.shiftKey ? 10 : 1;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (d) {
      const ed = (edits[selected.dataset.edit] ||= {});
      ed.x = (ed.x || 0) + d[0];
      ed.y = (ed.y || 0) + d[1];
      place(selected);
      save();
      e.preventDefault();
    } else if (e.key === 'Enter' && selected.hasAttribute('data-edit-text')) {
      startEditing(selected);
      e.preventDefault();
    } else if (e.key === 'Escape') {
      select(null);
    }
  });

  // ── Toolbar ──
  const bar = document.createElement('div');
  bar.className = 'pe-bar';
  bar.innerHTML = '<span class="pe-tip">Drag to move · double-click text to edit</span>' +
    '<button data-copy>Copy changes</button><button data-reset>Reset</button><button data-done>Done</button>';
  document.body.appendChild(bar);
  const copyBtn = bar.querySelector('[data-copy]');
  copyBtn.addEventListener('click', async () => {
    finishEditing();
    const out = {};
    for (const [id, e] of Object.entries(edits)) {
      const o = {};
      if (e.x || e.y) { o.x = e.x || 0; o.y = e.y || 0; }
      if (typeof e.text === 'string') o.text = e.text;
      if (Object.keys(o).length) out[id] = o;
    }
    const text = 'PAGE EDITS (' + location.pathname + ')\n' + JSON.stringify(out, null, 2);
    try { await navigator.clipboard.writeText(text); copyBtn.textContent = 'Copied'; }
    catch (e) { console.log(text); copyBtn.textContent = 'Logged to console'; }
    setTimeout(() => (copyBtn.textContent = 'Copy changes'), 1500);
  });
  bar.querySelector('[data-reset]').addEventListener('click', () => {
    if (!confirm('Undo every move and text edit on this page?')) return;
    finishEditing();
    edits = {};
    save();
    for (const el of items) { el.innerHTML = original.get(el); place(el); }
  });
  bar.querySelector('[data-done]').addEventListener('click', () => {
    const url = new URL(location.href);
    url.searchParams.delete('edit');
    location.href = url.toString();
  });
})();
