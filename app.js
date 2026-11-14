(function () {
  var TASKS_KEY = 'todo.tasks';
  var THEME_KEY = 'todo.theme';
  var SUPABASE_URL = 'https://zhfgcevxcbthqztpflsz.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_BeeHJwzSPXJOJUQNFWLbrA_sS4dU31G';
  var db = window.supabase && typeof window.supabase.createClient === 'function'
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
    : null;
  var remoteQueue = Promise.resolve();

  var boardEl = document.getElementById('board');
  var columns = {
    todo: document.getElementById('list-todo'),
    doing: document.getElementById('list-doing'),
    done: document.getElementById('list-done')
  };
  var counts = {
    todo: document.getElementById('count-todo'),
    doing: document.getElementById('count-doing'),
    done: document.getElementById('count-done')
  };
  var dateStringEl = document.getElementById('date-string');
  var pickDueBtn = document.getElementById('pick-due');
  var dueRow = document.getElementById('due-row');
  var dueChip = document.getElementById('due-chip');
  var dueChipText = document.getElementById('due-chip-text');
  var dueClearBtn = document.getElementById('due-clear');
  var countEl = document.getElementById('count');
  var addForm = document.getElementById('add-form');
  var newTaskInput = document.getElementById('new-task');
  var newDueInput = document.getElementById('new-due');
  var clearBtn = document.getElementById('clear-completed');
  var backupBtn = document.getElementById('backup');
  var restoreBtn = document.getElementById('restore');
  var restoreInput = document.getElementById('restore-file');
  var themeBtn = document.getElementById('theme-toggle');
  var announceEl = document.getElementById('announce');
  var authScreen = document.getElementById('auth-screen');
  var authStatus = document.getElementById('auth-status');
  var authForm = document.getElementById('auth-form');
  var authHeading = document.getElementById('auth-heading');
  var authHelp = document.getElementById('auth-help');
  var authError = document.getElementById('auth-error');
  var authNote = document.getElementById('auth-note');
  var authEmail = document.getElementById('auth-email');
  var authPassword = document.getElementById('auth-password');
  var authSubmit = document.getElementById('auth-submit');
  var authSwitch = document.getElementById('auth-switch');
  var accountEl = document.getElementById('account');
  var accountEmail = document.getElementById('account-email');
  var signOutBtn = document.getElementById('sign-out');
  var footerEl = document.getElementById('app-footer');

  var STATUSES = ['todo', 'doing', 'done'];
  var STATUS_LABEL = { todo: 'To Do', doing: 'Doing', done: 'Done' };

  var tasks = [];
  var currentUserId = null;
  var sessionApplied = false;
  var loadGen = 0;
  var authMode = 'signin';
  var authBusy = false;
  var editingId = null;
  var editReturn = 'text';
  var drag = null;
  var suppressClick = false;
  var themeMedia = window.matchMedia('(prefers-color-scheme: dark)');

  function icon(size, path) {
    return '<svg aria-hidden="true" width="' + size + '" height="' + size + '" viewBox="0 0 24 24"><path fill="currentColor" d="' + path + '"/></svg>';
  }

  var GRIP = icon(18, 'M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z');
  var TRASH = icon(18, 'M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-3.5l-1-1zM18 7H6v12c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7z');
  var ARROW_UP = icon(16, 'M7.41 15.41 12 10.83l4.59 4.58L18 14l-6-6-6 6z');
  var ARROW_DOWN = icon(16, 'M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z');
  var PENCIL = icon(18, 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z');
  var CHECK = icon(16, 'M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z');
  var CLOSE = icon(16, 'M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z');
  var SCHEDULE = icon(12, 'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z');
  var EVENT = icon(12, 'M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z');
  var DONE_ALL = icon(12, 'M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41 6 19l1.41-1.41L1.83 12 .41 13.41z');

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function createId() {
    if (window.crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    return 't-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function tasksKey() {
    return currentUserId ? TASKS_KEY + '.' + currentUserId : null;
  }

  function loadTasks() {
    var key = tasksKey();
    if (!key) return [];
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return [];
      return sanitize(JSON.parse(raw));
    } catch (err) {
      return [];
    }
  }

  function taskStatus(task) {
    if (task && (task.status === 'todo' || task.status === 'doing' || task.status === 'done')) return task.status;
    return task && task.completed === true ? 'done' : 'todo';
  }

  function statusLabel(status) {
    return STATUS_LABEL[status] || 'To Do';
  }

  function neighborStatus(status, delta) {
    var index = STATUSES.indexOf(status) + delta;
    return index >= 0 && index < STATUSES.length ? STATUSES[index] : null;
  }

  function copyTask(task, overrides) {
    overrides = overrides || {};
    var status = overrides.status || taskStatus(task);
    return {
      id: overrides.id || task.id,
      text: overrides.text != null ? overrides.text : task.text,
      completed: status === 'done',
      dueDate: Object.prototype.hasOwnProperty.call(overrides, 'dueDate') ? overrides.dueDate : task.dueDate,
      status: status,
      order: overrides.order != null ? overrides.order : task.order
    };
  }

  function sanitize(list) {
    if (!Array.isArray(list)) return [];
    var seen = Object.create(null);
    var cleaned = [];
    list.forEach(function (item, index) {
      if (!item || typeof item !== 'object') return;
      var text = typeof item.text === 'string' ? item.text.trim() : '';
      if (!text) return;
      var id = typeof item.id === 'string' && item.id && !seen[item.id] ? item.id : createId();
      seen[id] = true;
      var dueDate = null;
      if (typeof item.dueDate === 'string' && isRealDate(item.dueDate)) dueDate = item.dueDate;
      var order = typeof item.order === 'number' && isFinite(item.order) ? item.order : index;
      var status = item.status === 'todo' || item.status === 'doing' || item.status === 'done'
        ? item.status
        : (item.completed === true ? 'done' : 'todo');
      cleaned.push({
        id: id,
        text: text,
        status: status,
        dueDate: dueDate,
        order: order,
        index: index
      });
    });
    cleaned.sort(function (a, b) {
      return a.order - b.order || a.index - b.index;
    });
    var grouped = { todo: [], doing: [], done: [] };
    cleaned.forEach(function (task) { grouped[task.status].push(task); });
    var result = [];
    STATUSES.forEach(function (status) {
      grouped[status].forEach(function (task, index) {
        result.push(copyTask(task, { status: status, order: index }));
      });
    });
    return result;
  }

  function isRealDate(iso) {
    var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!match) return false;
    var year = Number(match[1]);
    var month = Number(match[2]);
    var day = Number(match[3]);
    var date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  }

  function cacheLocal() {
    var key = tasksKey();
    if (!key) return;
    try {
      localStorage.setItem(key, JSON.stringify(tasks));
    } catch (err) {}
  }

  function mergeLegacy(remote) {
    try {
      if (localStorage.getItem('todo.legacyClaimed')) return remote;
      localStorage.setItem('todo.legacyClaimed', currentUserId || '1');
      var raw = localStorage.getItem(TASKS_KEY);
      if (!raw) return remote;
      var legacy = sanitize(JSON.parse(raw));
      var seen = Object.create(null);
      remote.forEach(function (task) { seen[task.id] = true; });
      var extra = legacy.filter(function (task) { return !seen[task.id]; });
      return extra.length ? sanitize(remote.concat(extra)) : remote;
    } catch (err) {
      return remote;
    }
  }

  function taskFromRow(row) {
    return {
      id: row.id,
      text: row.title,
      status: row.status,
      completed: row.status === 'done',
      dueDate: row.due_date || null,
      order: row.position
    };
  }

  function rowFromTask(task) {
    return {
      id: task.id,
      title: task.text,
      status: taskStatus(task),
      due_date: task.dueDate,
      position: task.order,
      updated_at: new Date().toISOString(),
      user_id: currentUserId
    };
  }

  function syncRemote() {
    if (!db) return Promise.reject(new Error('missing client'));
    var snapshot = tasks.map(rowFromTask);
    var keep = Object.create(null);
    snapshot.forEach(function (row) { keep[row.id] = true; });
    return db.from('tasks').select('id').eq('user_id', currentUserId).then(function (existing) {
      if (existing.error) throw existing.error;
      var remove = (existing.data || []).map(function (row) { return row.id; }).filter(function (id) {
        return !keep[id];
      });
      var write = snapshot.length
        ? db.from('tasks').upsert(snapshot)
        : Promise.resolve({ error: null });
      return write.then(function (saved) {
        if (saved.error) throw saved.error;
        if (!remove.length) return;
        return db.from('tasks').delete().in('id', remove).then(function (removed) {
          if (removed.error) throw removed.error;
        });
      });
    });
  }

  function persist() {
    cacheLocal();
    if (!db || !currentUserId) {
      if (!currentUserId) announce('Sign in to save tasks.');
      else announce('Could not save tasks to COMB BOMB BOARD.');
      return;
    }
    remoteQueue = remoteQueue.then(syncRemote).catch(function () {
      announce('Could not save tasks to COMB BOMB BOARD.');
    });
  }

  function savedTheme() {
    try {
      var value = localStorage.getItem(THEME_KEY);
      return value === 'light' || value === 'dark' ? value : null;
    } catch (err) {
      return null;
    }
  }

  function effectiveTheme() {
    var chosen = document.documentElement.getAttribute('data-theme');
    if (chosen === 'light' || chosen === 'dark') return chosen;
    return themeMedia.matches ? 'dark' : 'light';
  }

  function updateThemeButton() {
    var toLight = effectiveTheme() === 'dark';
    themeBtn.setAttribute('aria-label', toLight ? 'Switch to light theme' : 'Switch to dark theme');
  }

  function toggleTheme() {
    var next = effectiveTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch (err) {}
    updateThemeButton();
  }

  /* Calendar day in the user's timezone. YYYY-MM-DD sorts in date order. */
  function localToday() {
    var now = new Date();
    var month = String(now.getMonth() + 1).padStart(2, '0');
    var day = String(now.getDate()).padStart(2, '0');
    return now.getFullYear() + '-' + month + '-' + day;
  }

  function formatDate(iso) {
    var parts = iso.split('-').map(Number);
    var date = new Date(parts[0], parts[1] - 1, parts[2]);
    var options = { month: 'short', day: 'numeric' };
    if (parts[0] !== new Date().getFullYear()) options.year = 'numeric';
    return date.toLocaleDateString(undefined, options);
  }

  function dueInfo(task) {
    if (!task.dueDate) return null;
    var today = localToday();
    if (task.dueDate === today) return { kind: 'today' };
    if (!task.completed && task.dueDate < today) {
      return { kind: 'overdue', dateText: formatDate(task.dueDate) };
    }
    return { kind: 'scheduled', dateText: formatDate(task.dueDate) };
  }

  function columnTasks(status) {
    return tasks.filter(function (task) {
      return taskStatus(task) === status;
    }).sort(function (a, b) {
      return a.order - b.order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    });
  }

  function snapshotIds() {
    var ids = { todo: [], doing: [], done: [] };
    STATUSES.forEach(function (status) {
      ids[status] = columnTasks(status).map(function (task) { return task.id; });
    });
    return ids;
  }

  function applyBoard(idsByStatus) {
    var byId = Object.create(null);
    tasks.forEach(function (task) { byId[task.id] = task; });
    var used = Object.create(null);
    var next = [];
    STATUSES.forEach(function (status) {
      var ids = (idsByStatus[status] || []).slice();
      columnTasks(status).forEach(function (task) {
        var placed = false;
        STATUSES.forEach(function (name) {
          if ((idsByStatus[name] || []).indexOf(task.id) !== -1) placed = true;
        });
        if (!placed) ids.push(task.id);
      });
      ids.forEach(function (id, index) {
        var task = byId[id];
        if (!task || used[id]) return;
        used[id] = true;
        next.push(copyTask(task, { status: status, order: index }));
      });
    });
    tasks.forEach(function (task) {
      if (used[task.id]) return;
      var status = taskStatus(task);
      var order = next.filter(function (item) { return item.status === status; }).length;
      next.push(copyTask(task, { status: status, order: order }));
    });
    return next;
  }


  function quoted(text) {
    return '\u201c' + text + '\u201d';
  }

  function cssEscape(value) {
    if (window.CSS && typeof CSS.escape === 'function') return CSS.escape(value);
    return String(value).replace(/(["\\])/g, '\\$1');
  }

  function reindex(list) {
    return sanitize(list);
  }

  function announce(message) {
    announceEl.textContent = '';
    window.setTimeout(function () {
      announceEl.textContent = message;
    }, 30);
  }

  function countLabel(n) {
    return n === 1 ? '1 task left' : n + ' tasks left';
  }

  function captureFocus() {
    var active = document.activeElement;
    if (!active || !boardEl.contains(active)) return null;
    var item = active.closest('.task');
    if (!item) return null;
    var part = 'text';
    if (active.classList.contains('drag-handle')) part = 'handle';
    else if (active.classList.contains('check')) part = 'check';
    else if (active.classList.contains('edit-task')) part = 'edit';
    else if (active.classList.contains('delete')) part = 'delete';
    else if (active.classList.contains('move-up')) part = 'up';
    else if (active.classList.contains('move-down')) part = 'down';
    else if (active.classList.contains('shift-prev')) part = 'prev';
    else if (active.classList.contains('shift-next')) part = 'next';
    else if (active.classList.contains('edit-text')) part = 'edit-text';
    else if (active.classList.contains('edit-due')) part = 'edit-due';
    else if (active.classList.contains('save')) part = 'save';
    else if (active.classList.contains('cancel')) part = 'cancel';
    return { id: item.dataset.id, part: part };
  }

  function restoreFocus(target, preventScroll) {
    if (!target) return;
    var item = boardEl.querySelector('[data-id="' + cssEscape(target.id) + '"]');
    if (!item) return;
    var selector = {
      handle: '.drag-handle',
      check: '.check',
      edit: '.edit-task',
      delete: '.delete',
      text: '.task-text',
      up: '.move-up',
      down: '.move-down',
      prev: '.shift-prev',
      next: '.shift-next',
      'edit-text': '.edit-text',
      'edit-due': '.edit-due',
      save: '.save',
      cancel: '.cancel'
    }[target.part];
    var node = selector ? item.querySelector(selector) : null;
    if (!node || node.disabled) return;
    node.focus(preventScroll ? { preventScroll: true } : undefined);
  }

  function render(options) {
    options = options || {};
    if (editingId && !findTask(editingId)) editingId = null;

    clearBtn.disabled = !tasks.some(function (task) { return taskStatus(task) === 'done'; });
    updateDateString();

    var focus = options.focus || null;
    if (!options.focus && !options.focusEdit) focus = captureFocus();

    STATUSES.forEach(function (status) {
      var visible = columnTasks(status);
      counts[status].textContent = String(visible.length);
      var list = columns[status];
      var fragment = document.createDocumentFragment();
      visible.forEach(function (task, index) {
        var node = editingId === task.id
          ? renderEditor(task)
          : renderTask(task, index, visible.length);
        node.setAttribute('aria-posinset', String(index + 1));
        node.setAttribute('aria-setsize', String(visible.length));
        fragment.appendChild(node);
      });
      list.replaceChildren(fragment);
    });

    updateThemeButton();

    if (options.focusEdit) {
      var input = boardEl.querySelector('.edit-text');
      if (input) {
        input.focus();
        var end = input.value.length;
        input.setSelectionRange(end, end);
      }
      return;
    }
    restoreFocus(focus, options.preventScroll);
  }

  function renderTask(task, index, total) {
    var status = taskStatus(task);
    var item = el('li', 'task' + (status === 'done' ? ' is-complete' : ''));
    item.dataset.id = task.id;

    var row = el('div', 'task-row');
    var handle = el('button', 'drag-handle');
    handle.type = 'button';
    handle.innerHTML = GRIP;
    handle.setAttribute('aria-keyshortcuts', 'ArrowUp ArrowDown ArrowLeft ArrowRight');
    handle.setAttribute('aria-label', 'Move ' + quoted(task.text) + ', in ' + statusLabel(status) + ', position ' + (index + 1) + ' of ' + total + '. Press the arrow keys to reorder or change columns.');
    row.appendChild(handle);

    var checkLabel = el('label', 'check-hit');
    var check = el('input', 'check');
    check.type = 'checkbox';
    check.checked = task.completed;
    var checkName = el('span', 'sr-only');
    checkName.textContent = task.completed
      ? 'Mark ' + quoted(task.text) + ' incomplete'
      : 'Mark ' + quoted(task.text) + ' complete';
    checkLabel.appendChild(check);
    checkLabel.appendChild(checkName);
    row.appendChild(checkLabel);

    var body = el('div', 'task-body');
    var textBtn = el('button', 'task-text', task.text);
    textBtn.type = 'button';
    textBtn.title = 'Click to edit';
    body.appendChild(textBtn);
    var badge = null;
    if (status === 'done') {
      if (task.dueDate) badge = badgeNode('due-done', EVENT, formatDate(task.dueDate));
    } else if (dueInfo(task)) {
      badge = dueNode(dueInfo(task));
    }
    if (badge) body.appendChild(badge);
    var flow = el('div', 'flow');
    var prevStatus = neighborStatus(status, -1);
    var nextStatus = neighborStatus(status, 1);
    if (prevStatus) {
      var prev = el('button', 'flow-btn shift-prev', '\u2190 ' + statusLabel(prevStatus));
      prev.type = 'button';
      prev.title = 'Move to ' + statusLabel(prevStatus);
      prev.setAttribute('aria-label', 'Move ' + quoted(task.text) + ' to ' + statusLabel(prevStatus));
      flow.appendChild(prev);
    }
    if (nextStatus) {
      var next = el('button', 'flow-btn shift-next', statusLabel(nextStatus) + ' \u2192');
      next.type = 'button';
      next.title = 'Move to ' + statusLabel(nextStatus);
      next.setAttribute('aria-label', 'Move ' + quoted(task.text) + ' to ' + statusLabel(nextStatus));
      flow.appendChild(next);
    }
    body.appendChild(flow);
    row.appendChild(body);

    var tools = el('div', 'task-tools');
    var stack = el('div', 'move-stack');
    var up = el('button', 'move-up');
    up.type = 'button';
    up.innerHTML = ARROW_UP;
    up.title = 'Move up';
    up.disabled = index === 0;
    up.setAttribute('aria-label', 'Move ' + quoted(task.text) + ' up');
    var down = el('button', 'move-down');
    down.type = 'button';
    down.innerHTML = ARROW_DOWN;
    down.title = 'Move down';
    down.disabled = index === total - 1;
    down.setAttribute('aria-label', 'Move ' + quoted(task.text) + ' down');
    stack.appendChild(up);
    stack.appendChild(down);
    tools.appendChild(stack);

    var editBtn = el('button', 'edit-task');
    editBtn.type = 'button';
    editBtn.innerHTML = PENCIL;
    editBtn.title = 'Edit task';
    editBtn.setAttribute('aria-label', 'Edit ' + quoted(task.text));
    tools.appendChild(editBtn);

    var remove = el('button', 'delete');
    remove.type = 'button';
    remove.innerHTML = TRASH;
    remove.title = 'Delete task';
    remove.setAttribute('aria-label', 'Delete ' + quoted(task.text));
    tools.appendChild(remove);
    row.appendChild(tools);

    item.appendChild(row);
    return item;
  }

  function badgeNode(className, iconHtml, text) {
    var node = el('span', 'due ' + className);
    if (iconHtml) node.insertAdjacentHTML('beforeend', iconHtml);
    node.appendChild(document.createTextNode(text));
    return node;
  }

  function dueNode(due) {
    if (due.kind === 'today') return badgeNode('due-today', SCHEDULE, 'Due Today');
    if (due.kind === 'overdue') {
      var node = badgeNode('due-overdue', null, 'Overdue \u2022 ' + due.dateText);
      node.insertBefore(el('span', 'ping'), node.firstChild);
      return node;
    }
    return badgeNode('due-scheduled', EVENT, 'Due: ' + due.dateText);
  }

  function doneNode() {
    return badgeNode('due-done', DONE_ALL, 'Done');
  }

  function renderEditor(task) {
    var item = el('li', 'task is-editing');
    item.dataset.id = task.id;
    var form = el('form', 'edit-form');
    form.autocomplete = 'off';

    var textId = 'edit-text-' + task.id;
    var dueId = 'edit-due-' + task.id;
    var errorId = 'edit-error-' + task.id;

    var textLabel = el('label', 'sr-only', 'Task text');
    textLabel.htmlFor = textId;
    var textInput = el('input', 'edit-text');
    textInput.id = textId;
    textInput.type = 'text';
    textInput.maxLength = 500;
    textInput.value = task.text;
    textInput.setAttribute('aria-describedby', errorId);

    var error = el('p', 'error', 'Enter a task.');
    error.id = errorId;
    error.hidden = true;

    var dueLabel = el('label', null, 'DUE');
    dueLabel.htmlFor = dueId;
    dueLabel.appendChild(el('span', 'sr-only', ' date (optional)'));
    var dueInput = el('input', 'edit-due');
    dueInput.id = dueId;
    dueInput.type = 'date';
    dueInput.value = task.dueDate || '';

    var save = el('button', 'save');
    save.type = 'submit';
    save.innerHTML = CHECK;
    save.title = 'Save';
    save.setAttribute('aria-label', 'Save');
    var cancel = el('button', 'cancel');
    cancel.type = 'button';
    cancel.innerHTML = CLOSE;
    cancel.title = 'Cancel';
    cancel.setAttribute('aria-label', 'Cancel');

    var line = el('div', 'edit-line');
    line.appendChild(textLabel);
    line.appendChild(textInput);
    line.appendChild(save);
    line.appendChild(cancel);

    var dueLine = el('div', 'edit-due-line');
    dueLine.appendChild(dueLabel);
    dueLine.appendChild(dueInput);

    form.appendChild(line);
    form.appendChild(error);
    form.appendChild(dueLine);
    item.appendChild(form);
    return item;
  }

  function findTask(id) {
    return tasks.find(function (task) { return task.id === id; });
  }

  function onAdd(event) {
    event.preventDefault();
    var text = newTaskInput.value.trim();
    if (!text) {
      newTaskInput.setCustomValidity('Enter a task.');
      newTaskInput.reportValidity();
      newTaskInput.focus();
      return;
    }
    newTaskInput.setCustomValidity('');
    var due = newDueInput.value && isRealDate(newDueInput.value) ? newDueInput.value : null;
    var ids = snapshotIds();
    var id = createId();
    tasks.push({
      id: id,
      text: text,
      completed: false,
      dueDate: due,
      status: 'todo',
      order: 0
    });
    ids.todo.unshift(id);
    tasks = applyBoard(ids);
    persist();
    addForm.reset();
    updateDueChip();
    editingId = null;
    render();
    newTaskInput.focus();
    announce('Added ' + quoted(text) + '.');
  }

  function toggleTask(id) {
    var task = findTask(id);
    if (!task) return;
    var dest = taskStatus(task) === 'done' ? 'todo' : 'done';
    var ids = snapshotIds();
    STATUSES.forEach(function (status) {
      ids[status] = ids[status].filter(function (itemId) { return itemId !== id; });
    });
    ids[dest].unshift(id);
    tasks = applyBoard(ids);
    persist();
    render({ focus: { id: id, part: 'check' } });
    var updated = findTask(id);
    announce(taskStatus(updated) === 'done'
      ? 'Marked ' + quoted(updated.text) + ' complete.'
      : 'Marked ' + quoted(updated.text) + ' incomplete.');
  }

  function startEdit(id, returnPart) {
    if (!findTask(id)) return;
    cleanupDrag();
    editingId = id;
    editReturn = returnPart === 'edit' ? 'edit' : 'text';
    render({ focusEdit: true });
  }

  function cancelEdit() {
    var id = editingId;
    var part = editReturn;
    editingId = null;
    render({ focus: id ? { id: id, part: part } : null });
  }

  function saveEdit(form) {
    var item = form.closest('.task');
    var task = findTask(item.dataset.id);
    if (!task) return;
    var textInput = form.querySelector('.edit-text');
    var dueInput = form.querySelector('.edit-due');
    var error = form.querySelector('.error');
    var text = textInput.value.trim();
    if (!text) {
      error.hidden = false;
      textInput.setAttribute('aria-invalid', 'true');
      textInput.focus();
      announce('Enter a task.');
      return;
    }
    task.text = text;
    task.dueDate = dueInput.value && isRealDate(dueInput.value) ? dueInput.value : null;
    task.status = taskStatus(task);
    task.completed = task.status === 'done';
    editingId = null;
    persist();
    render({ focus: { id: task.id, part: editReturn } });
    announce('Saved ' + quoted(text) + '.');
  }

  function deleteTask(id) {
    var task = findTask(id);
    if (!task) return;
    var visible = columnTasks(taskStatus(task));
    var index = visible.findIndex(function (item) { return item.id === id; });
    var next = visible[index + 1] || visible[index - 1];
    tasks = reindex(tasks.filter(function (item) { return item.id !== id; }));
    if (editingId === id) editingId = null;
    persist();
    render(next ? { focus: { id: next.id, part: 'text' } } : { focus: null });
    if (!next) newTaskInput.focus();
    announce('Deleted ' + quoted(task.text) + '.');
  }

  function clearCompleted() {
    var removed = tasks.some(function (task) { return taskStatus(task) === 'done'; });
    if (!removed) return;
    if (editingId) {
      var editing = findTask(editingId);
      if (editing && taskStatus(editing) === 'done') editingId = null;
    }
    tasks = reindex(tasks.filter(function (task) { return taskStatus(task) !== 'done'; }));
    persist();
    render();
    announce('Cleared completed tasks.');
  }

  function moveTask(id, dRow, dCol, focusPart) {
    var task = findTask(id);
    if (!task) return;
    var status = taskStatus(task);
    var column = columnTasks(status);
    var from = column.findIndex(function (item) { return item.id === id; });
    if (from < 0) return;
    var ids = snapshotIds();
    if (dCol) {
      var dest = neighborStatus(status, dCol);
      if (!dest) {
        announce('Already in ' + statusLabel(status) + '. ' + quoted(task.text) + ' stayed in place.');
        return;
      }
      ids[status].splice(from, 1);
      var insertAt = Math.min(Math.max(from, 0), ids[dest].length);
      ids[dest].splice(insertAt, 0, id);
      tasks = applyBoard(ids);
      persist();
      var part = focusPart || 'handle';
      if (part === 'next' && !neighborStatus(dest, 1)) part = 'prev';
      else if (part === 'prev' && !neighborStatus(dest, -1)) part = 'next';
      render({ focus: { id: id, part: part } });
      var place = columnTasks(dest).findIndex(function (item) { return item.id === id; }) + 1;
      announce('Moved ' + quoted(task.text) + ' to ' + statusLabel(dest) + ', position ' + place + ' of ' + columnTasks(dest).length + '.');
      return;
    }
    var to = from + dRow;
    if (to < 0 || to >= column.length) {
      announce((dRow < 0 ? 'Already at the top. ' : 'Already at the bottom. ') + quoted(task.text) + ' stayed in place.');
      return;
    }
    var moved = ids[status].splice(from, 1)[0];
    ids[status].splice(to, 0, moved);
    tasks = applyBoard(ids);
    persist();
    var rowPart = focusPart || 'handle';
    if (column.length < 2) rowPart = 'handle';
    else if (rowPart === 'up' && to === 0) rowPart = 'down';
    else if (rowPart === 'down' && to === column.length - 1) rowPart = 'up';
    render({ focus: { id: id, part: rowPart } });
    announce('Moved ' + quoted(task.text) + ' ' + (dRow < 0 ? 'up' : 'down') + ' to position ' + (to + 1) + ' of ' + column.length + '.');
  }

  function onListClick(event) {
    if (suppressClick) {
      suppressClick = false;
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    var item = event.target.closest('.task');
    if (!item) return;
    var id = item.dataset.id;
    if (event.target.closest('.cancel')) {
      cancelEdit();
      return;
    }
    if (event.target.closest('.delete')) {
      deleteTask(id);
      return;
    }
    if (event.target.closest('.move-up')) {
      moveTask(id, -1, 0, 'up');
      return;
    }
    if (event.target.closest('.move-down')) {
      moveTask(id, 1, 0, 'down');
      return;
    }
    if (event.target.closest('.shift-prev')) {
      moveTask(id, 0, -1, 'prev');
      return;
    }
    if (event.target.closest('.shift-next')) {
      moveTask(id, 0, 1, 'next');
      return;
    }
    if (event.target.closest('.edit-task')) {
      startEdit(id, 'edit');
      return;
    }
    if (event.target.closest('.task-text')) startEdit(id, 'text');
  }

  function onListChange(event) {
    var check = event.target.closest('.check');
    if (!check) return;
    toggleTask(check.closest('.task').dataset.id);
  }

  function onEditSubmit(event) {
    var form = event.target;
    if (!form.classList || !form.classList.contains('edit-form')) return;
    event.preventDefault();
    saveEdit(form);
  }

  function onListKeyDown(event) {
    var editForm = event.target.closest('.edit-form');
    if (editForm && event.key === 'Enter' && event.target.tagName !== 'BUTTON') {
      event.preventDefault();
      if (typeof editForm.requestSubmit === 'function') editForm.requestSubmit();
      else editForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      return;
    }
    if (event.key === 'Escape' && editForm) {
      event.preventDefault();
      cancelEdit();
      return;
    }
    var handle = event.target.closest('.drag-handle');
    if (!handle) return;
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveTask(handle.closest('.task').dataset.id, -1, 0, 'handle');
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveTask(handle.closest('.task').dataset.id, 1, 0, 'handle');
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      moveTask(handle.closest('.task').dataset.id, 0, -1, 'handle');
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      moveTask(handle.closest('.task').dataset.id, 0, 1, 'handle');
    }
  }

  function detachPointer() {
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerCancel);
  }

  function cleanupDrag() {
    if (!drag) return;
    if (drag.scrollRaf) cancelAnimationFrame(drag.scrollRaf);
    detachPointer();
    drag = null;
    document.documentElement.classList.remove('is-dragging');
    Array.prototype.forEach.call(boardEl.querySelectorAll('.column.is-drop'), function (col) {
      col.classList.remove('is-drop');
    });
  }

  function onPointerDown(event) {
    if (event.button !== 0 || drag) return;
    var item = event.target.closest('.task');
    if (!item || !boardEl.contains(item) || item.classList.contains('is-editing')) return;
    if (event.target.closest('.shift-prev, .shift-next, .edit-task, .delete, .check, .check-hit, .move-up, .move-down, .save, .cancel, input, textarea')) return;
    var fromHandle = event.target.closest('.drag-handle');
    if (event.pointerType === 'touch' && !fromHandle) return;
    var handle = item.querySelector('.drag-handle');
    if (!handle) return;
    if (fromHandle) handle.focus({ preventScroll: true });
    drag = {
      pointerId: event.pointerId,
      id: item.dataset.id,
      el: item,
      handle: handle,
      startX: event.clientX,
      startY: event.clientY,
      started: false,
      placeholder: null,
      offsetY: 0,
      lastX: event.clientX,
      lastY: event.clientY,
      scrollDelta: 0,
      scrollRaf: 0
    };
    window.addEventListener('pointermove', onPointerMove, { passive: false });
    try {
      if (handle.setPointerCapture) handle.setPointerCapture(event.pointerId);
    } catch (err) {}
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);
  }

  function beginDrag(clientY) {
    var item = drag.el;
    var scrollY = window.scrollY;
    var rect = item.getBoundingClientRect();
    var placeholder = el('li', 'placeholder', 'Drop here');
    placeholder.setAttribute('aria-hidden', 'true');
    placeholder.style.height = rect.height + 'px';
    item.before(placeholder);
    drag.placeholder = placeholder;
    drag.offsetY = clientY - rect.top;
    item.classList.add('is-dragging');
    item.style.position = 'fixed';
    item.style.top = rect.top + 'px';
    item.style.left = rect.left + 'px';
    item.style.width = rect.width + 'px';
    item.style.height = rect.height + 'px';
    item.style.margin = '0';
    document.documentElement.classList.add('is-dragging');
    drag.started = true;
    /* Keep the placeholder in the old slot so removing the task from flow does not jump the page. */
    if (window.scrollY !== scrollY) window.scrollTo(0, scrollY);
    drag.scrollRaf = requestAnimationFrame(scrollLoop);
  }

  function onPointerMove(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (!drag.started) {
      var dx = event.clientX - drag.startX;
      var dy = event.clientY - drag.startY;
      if (dx * dx + dy * dy < 64) return;
      beginDrag(event.clientY);
    }
    event.preventDefault();
    drag.lastX = event.clientX;
    drag.lastY = event.clientY;
    drag.el.style.top = (event.clientY - drag.offsetY) + 'px';
    placePlaceholder(event.clientX, event.clientY);
    var edge = 56;
    if (event.clientY < edge) drag.scrollDelta = -10;
    else if (event.clientY > window.innerHeight - edge) drag.scrollDelta = 10;
    else drag.scrollDelta = 0;
  }

  function columnAt(x, y) {
    var node = document.elementFromPoint(x, y);
    if (!node || !node.closest) return null;
    var column = node.closest('.column');
    return column && boardEl.contains(column) ? column : null;
  }

  function placePlaceholder(clientX, clientY) {
    if (!drag || !drag.placeholder) return;
    var column = columnAt(clientX, clientY);
    if (!column) return;
    var list = column.querySelector('.list');
    if (!list) return;
    Array.prototype.forEach.call(boardEl.querySelectorAll('.column.is-drop'), function (col) {
      if (col !== column) col.classList.remove('is-drop');
    });
    column.classList.add('is-drop');
    var placeholder = drag.placeholder;
    var items = list.querySelectorAll('.task:not(.is-dragging)');
    var before = null;
    for (var i = 0; i < items.length; i++) {
      var rect = items[i].getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) {
        before = items[i];
        break;
      }
    }
    if (before) {
      if (placeholder.nextElementSibling !== before || placeholder.parentNode !== list) before.before(placeholder);
    } else if (list.lastElementChild !== placeholder) {
      list.appendChild(placeholder);
    }
  }

  function scrollLoop() {
    if (!drag || !drag.started) return;
    if (drag.scrollDelta) {
      window.scrollBy(0, drag.scrollDelta);
      placePlaceholder(drag.lastX, drag.lastY);
    }
    drag.scrollRaf = requestAnimationFrame(scrollLoop);
  }

  function finishDrag(commit) {
    if (!drag) return;
    var state = drag;
    cleanupDrag();
    if (!state.started) return;
    suppressClick = true;
    window.setTimeout(function () { suppressClick = false; }, 400);
    var moved = false;
    if (commit && state.placeholder) {
      var idsByStatus = { todo: [], doing: [], done: [] };
      var seen = Object.create(null);
      STATUSES.forEach(function (status) {
        Array.prototype.forEach.call(columns[status].children, function (child) {
          var id = null;
          if (child === state.placeholder) id = state.id;
          else if (child !== state.el && child.dataset && child.dataset.id) id = child.dataset.id;
          if (!id || seen[id]) return;
          seen[id] = true;
          idsByStatus[status].push(id);
        });
      });
      var before = STATUSES.map(function (status) {
        return status + ':' + columnTasks(status).map(function (task) { return task.id; }).join(',');
      }).join('|');
      var after = STATUSES.map(function (status) {
        return status + ':' + idsByStatus[status].join(',');
      }).join('|');
      if (after !== before && Object.keys(seen).length === tasks.length) {
        tasks = applyBoard(idsByStatus);
        persist();
        moved = true;
      }
    }
    var task = findTask(state.id);
    render({ focus: { id: state.id, part: 'handle' }, preventScroll: true });
    if (moved && task) {
      var status = taskStatus(task);
      var place = columnTasks(status).findIndex(function (item) { return item.id === state.id; }) + 1;
      announce('Moved ' + quoted(task.text) + ' to ' + statusLabel(status) + ', position ' + place + ' of ' + columnTasks(status).length + '.');
    }
  }

  function onPointerUp(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    finishDrag(true);
  }

  function onPointerCancel(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    finishDrag(false);
  }

  var BACKUP_MARK = '--- todo-backup-data ---';

  function duePhrase(task) {
    var info = dueInfo(task);
    if (!info) return '';
    if (info.kind === 'today') return 'Today';
    if (info.kind === 'overdue') return 'Overdue, ' + info.dateText;
    return 'Due ' + info.dateText;
  }

  function backupText() {
    var sorted = [];
    STATUSES.forEach(function (status) {
      columnTasks(status).forEach(function (task) { sorted.push(task); });
    });
    var saved = new Date().toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
    var lines = ['To-do backup', 'Saved: ' + saved, ''];
    if (!sorted.length) {
      lines.push('No tasks.');
    } else {
      sorted.forEach(function (task) {
        var mark = taskStatus(task) === 'done' ? '[x]' : '[ ]';
        var due = duePhrase(task);
        var line = mark + ' (' + statusLabel(taskStatus(task)) + ') ' + task.text;
        lines.push(due ? line + ' - ' + due : line);
      });
    }
    lines.push('');
    lines.push(BACKUP_MARK);
    lines.push(JSON.stringify(sorted.map(function (task) {
      return {
        id: task.id,
        text: task.text,
        completed: taskStatus(task) === 'done',
        dueDate: task.dueDate,
        status: taskStatus(task),
        order: task.order
      };
    }), null, 2));
    lines.push('');
    return lines.join('\n');
  }

  function downloadBackup() {
    var text = backupText();
    var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = 'todo-backup-' + localToday() + '.txt';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    var count = tasks.length;
    announce(count === 1 ? 'Saved a backup of 1 task.' : 'Saved a backup of ' + count + ' tasks.');
  }

  function parseBackup(text) {
    if (typeof text !== 'string') return null;
    var trimmed = text.replace(/^\uFEFF/, '').trim();
    if (!trimmed) return null;
    var lines = trimmed.split(/\r?\n/);
    var at = -1;
    for (var i = lines.length - 1; i >= 0; i--) {
      if (lines[i].trim() === BACKUP_MARK) {
        at = i;
        break;
      }
    }
    var jsonText = at === -1 ? trimmed : lines.slice(at + 1).join('\n').trim();
    if (jsonText.slice(0, 3) === '```') {
      jsonText = jsonText.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '').trim();
    }
    try {
      var data = JSON.parse(jsonText);
      if (data && !Array.isArray(data) && Array.isArray(data.tasks)) data = data.tasks;
      return Array.isArray(data) ? data : null;
    } catch (err) {
      return null;
    }
  }

  function restoreFromFile(file) {
    var reader = new FileReader();
    reader.onload = function () {
      var raw = parseBackup(String(reader.result || ''));
      if (!raw) {
        announce('Could not read that backup. The list was not changed.');
        return;
      }
      var restored = sanitize(raw);
      if (!restored.length && raw.length) {
        announce('That file has no usable tasks. The list was not changed.');
        return;
      }
      var noun = restored.length === 1 ? '1 task' : restored.length + ' tasks';
      var ok = window.confirm('Replace the tasks in this browser with ' + noun + ' from this file?');
      if (!ok) {
        announce('Restore cancelled.');
        return;
      }
      tasks = restored;
      editingId = null;
      cleanupDrag();
      persist();
      render();
      announce('Restored ' + noun + '.');
    };
    reader.onerror = function () {
      announce('Could not read that backup. The list was not changed.');
    };
    reader.readAsText(file);
  }

  function updateDateString() {
    var text = new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    if (!currentUserId) {
      dateStringEl.textContent = text;
      return;
    }
    var open = tasks.filter(function (task) { return taskStatus(task) !== 'done'; }).length;
    var openLabel = open === 1 ? '1 open' : open + ' open';
    dateStringEl.textContent = text + ' \u2022 ' + openLabel;
  }

  function updateDueChip() {
    var value = newDueInput.value;
    var has = !!value && isRealDate(value);
    dueChip.hidden = !has;
    if (has) dueChipText.textContent = 'Due: ' + formatDate(value);
    pickDueBtn.setAttribute('aria-pressed', has ? 'true' : 'false');
    pickDueBtn.setAttribute('aria-label', has ? 'Change due date, currently ' + formatDate(value) : 'Pick due date (optional)');
  }

  function openDuePicker() {
    if (typeof newDueInput.showPicker === 'function') {
      try {
        newDueInput.showPicker();
        return;
      } catch (err) {}
    }
    /* No picker API: show the native date field instead. */
    dueRow.classList.add('show-date');
    newDueInput.tabIndex = 0;
    newDueInput.focus();
  }

  pickDueBtn.addEventListener('click', openDuePicker);
  newDueInput.addEventListener('change', function () {
    updateDueChip();
    if (newDueInput.value) announce('Due date set to ' + formatDate(newDueInput.value) + '.');
  });
  dueClearBtn.addEventListener('click', function () {
    newDueInput.value = '';
    updateDueChip();
    pickDueBtn.focus();
    announce('Due date removed.');
  });

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'n' && event.key !== 'N') return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    var active = document.activeElement;
    if (addForm.hidden) return;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) return;
    event.preventDefault();
    newTaskInput.focus();
    newTaskInput.select();
  });

  newTaskInput.addEventListener('input', function () {
    newTaskInput.setCustomValidity('');
  });
  newTaskInput.addEventListener('keydown', function (event) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    if (typeof addForm.requestSubmit === 'function') addForm.requestSubmit();
    else addForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
  addForm.addEventListener('submit', onAdd);
  clearBtn.addEventListener('click', clearCompleted);
  backupBtn.addEventListener('click', downloadBackup);
  restoreBtn.addEventListener('click', function () {
    restoreInput.value = '';
    restoreInput.click();
  });
  restoreInput.addEventListener('change', function () {
    var file = restoreInput.files && restoreInput.files[0];
    if (file) restoreFromFile(file);
  });
  themeBtn.addEventListener('click', toggleTheme);
  boardEl.addEventListener('click', onListClick, true);
  boardEl.addEventListener('change', onListChange);
  boardEl.addEventListener('input', function (event) {
    if (!event.target.classList.contains('edit-text')) return;
    event.target.removeAttribute('aria-invalid');
    var error = event.target.closest('.edit-form').querySelector('.error');
    if (error) error.hidden = true;
  });
  boardEl.addEventListener('submit', onEditSubmit);
  boardEl.addEventListener('keydown', onListKeyDown);
  boardEl.addEventListener('pointerdown', onPointerDown, { passive: false });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && drag && drag.started) {
      event.preventDefault();
      finishDrag(false);
    }
  });

  if (typeof themeMedia.addEventListener === 'function') {
    themeMedia.addEventListener('change', function () {
      if (!savedTheme()) updateThemeButton();
    });
  } else if (typeof themeMedia.addListener === 'function') {
    themeMedia.addListener(function () {
      if (!savedTheme()) updateThemeButton();
    });
  }

  function showAuthError(message) {
    authError.textContent = message;
    authError.hidden = false;
  }

  function setAuthMode(mode) {
    authMode = mode === 'signup' ? 'signup' : 'signin';
    var signingIn = authMode === 'signin';
    authHeading.textContent = signingIn ? 'Sign in' : 'Create account';
    authSubmit.textContent = signingIn ? 'Sign in' : 'Create account';
    authSwitch.textContent = signingIn ? 'Create an account' : 'Already have an account? Sign in';
    authHelp.textContent = signingIn
      ? 'Your tasks stay with your account.'
      : 'Choose a password of at least 6 characters.';
    authPassword.setAttribute('autocomplete', signingIn ? 'current-password' : 'new-password');
    authError.hidden = true;
  }

  function showAuthForm() {
    authScreen.hidden = false;
    authStatus.hidden = true;
    authForm.hidden = false;
    addForm.hidden = true;
    boardEl.hidden = true;
    footerEl.hidden = true;
    accountEl.hidden = true;
  }

  function showLoading(email) {
    authScreen.hidden = false;
    authForm.hidden = true;
    authStatus.hidden = false;
    authStatus.textContent = 'Loading your tasks\u2026';
    addForm.hidden = true;
    boardEl.hidden = true;
    footerEl.hidden = true;
    accountEl.hidden = false;
    accountEmail.textContent = email || 'Signed in';
    accountEmail.title = email || '';
  }

  function showBoard(email) {
    authScreen.hidden = true;
    addForm.hidden = false;
    boardEl.hidden = false;
    footerEl.hidden = false;
    accountEl.hidden = false;
    accountEmail.textContent = email || 'Signed in';
    accountEmail.title = email || '';
  }

  function loadRemote(email) {
    var gen = loadGen;
    var userId = currentUserId;
    if (!db || !userId) return;
    db.from('tasks')
      .select('id, title, status, due_date, position')
      .eq('user_id', userId)
      .order('position', { ascending: true })
      .then(function (result) {
        if (gen !== loadGen || userId !== currentUserId) return;
        if (result.error) throw result.error;
        var remote = sanitize((result.data || []).map(taskFromRow));
        var merged = mergeLegacy(remote);
        tasks = merged;
        cacheLocal();
        showBoard(email);
        render();
        if (merged.length !== remote.length) persist();
      })
      .catch(function () {
        if (gen !== loadGen || userId !== currentUserId) return;
        tasks = loadTasks();
        showBoard(email);
        render();
        announce('Could not load COMB BOMB BOARD. Showing tasks saved in this browser.');
      });
  }

  function applySession(session) {
    var user = session && session.user;
    var nextId = user ? user.id : null;
    if (nextId === currentUserId && sessionApplied) return;
    sessionApplied = true;
    currentUserId = nextId;
    loadGen += 1;
    editingId = null;
    cleanupDrag();
    if (!nextId) {
      tasks = [];
      showAuthForm();
      render();
      return;
    }
    var email = user.email || 'Signed in';
    tasks = loadTasks();
    showLoading(email);
    loadRemote(email);
  }

  function onAuthSubmit(event) {
    event.preventDefault();
    if (!db || authBusy) return;
    var email = authEmail.value.trim();
    var password = authPassword.value;
    authError.hidden = true;
    authNote.hidden = true;
    if (!email || password.length < 6) {
      showAuthError('Enter your email and a password of at least 6 characters.');
      return;
    }
    authBusy = true;
    authSubmit.disabled = true;
    var request = authMode === 'signup'
      ? db.auth.signUp({ email: email, password: password })
      : db.auth.signInWithPassword({ email: email, password: password });
    request.then(function (result) {
      authBusy = false;
      authSubmit.disabled = false;
      if (result.error) {
        showAuthError(result.error.message || 'Could not sign in.');
        return;
      }
      authPassword.value = '';
      if (authMode === 'signup' && !(result.data && result.data.session)) {
        authNote.hidden = false;
        authNote.textContent = 'Check your email to confirm the account, then sign in.';
        setAuthMode('signin');
      }
    }).catch(function () {
      authBusy = false;
      authSubmit.disabled = false;
      showAuthError('Could not reach the server. Try again.');
    });
  }

  authForm.addEventListener('submit', onAuthSubmit);
  authSwitch.addEventListener('click', function () {
    authNote.hidden = true;
    setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
    authEmail.focus();
  });
  signOutBtn.addEventListener('click', function () {
    if (!db) return;
    signOutBtn.disabled = true;
    db.auth.signOut().then(function () {
      signOutBtn.disabled = false;
    }).catch(function () {
      signOutBtn.disabled = false;
      announce('Could not sign out. Try again.');
    });
  });

  function boot() {
    updateDueChip();
    updateDateString();
    if (!db) {
      authStatus.hidden = false;
      authStatus.textContent = 'Could not reach the server.';
      authForm.hidden = true;
      return;
    }
    db.auth.onAuthStateChange(function (event, session) {
      if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') return;
      applySession(session);
    });
    db.auth.getSession().then(function (result) {
      if (sessionApplied) return;
      if (result.error) {
        showAuthForm();
        showAuthError('Could not check your account. Try again.');
        return;
      }
      applySession(result.data.session);
    }).catch(function () {
      if (sessionApplied) return;
      showAuthForm();
      showAuthError('Could not check your account. Try again.');
    });
  }

  boot();
})();
