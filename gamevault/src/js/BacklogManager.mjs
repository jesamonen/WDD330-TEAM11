/**
 * BacklogManager.mjs
 * ---------------------------------------------------------------------------
 * Owns *every* localStorage operation for the user's backlog. No view code
 * touches storage directly — it asks this manager, then re-renders. That keeps
 * the persisted data in exactly one shape and one place.
 *
 * Stored entry shape (per requirement 4 — id, title, image and status):
 *   {
 *     id: number,
 *     title: string,
 *     backgroundImage: string|null,
 *     rating: number,
 *     metacritic: number|null,
 *     released: string|null,
 *     genres: string[],
 *     platforms: string[],
 *     status: 'plan-to-play' | 'currently-playing' | 'completed',
 *     addedAt: string (ISO),
 *     updatedAt: string (ISO)
 *   }
 */

import {
  DEFAULT_STATUS,
  STATUSES,
  STATUS_META,
  STORAGE_KEYS,
  createEl,
  createState,
  escapeHtml,
  formatDate,
  getLocalStorage,
  icon,
  prefersReducedMotion,
  setLocalStorage,
  showToast,
  trapFocus,
  wait,
} from './utils.mjs';

/** Convert a normalised RAWG game (or a plain object) into a saved entry. */
function toEntry(game, status) {
  return {
    id: Number(game.id),
    title: game.title || 'Untitled',
    backgroundImage: game.backgroundImage || null,
    rating: Number(game.rating) || 0,
    metacritic: Number(game.metacritic) || null,
    released: game.released || null,
    genres: Array.isArray(game.genres) ? game.genres.slice(0, 5) : [],
    platforms: Array.isArray(game.platforms) ? game.platforms.slice(0, 5) : [],
    status,
    addedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export default class BacklogManager {
  /**
   * @param {object} options
   * @param {string} options.key  localStorage key to use
   */
  constructor({ key = STORAGE_KEYS.BACKLOG } = {}) {
    this.key = key;
    this.listeners = new Set();
    this.lastStorageError = null;

    // Keep multiple open tabs in sync.
    window.addEventListener('storage', (event) => {
      if (event.key === this.key) {
        this.emit('sync');
      }
    });
  }

  /* ---------------------------------------------------------------------
     Persistence
     ---------------------------------------------------------------------- */

  /** All saved games, newest first. Always returns an array. */
  getAll() {
    const stored = getLocalStorage(this.key, []);
    return Array.isArray(stored)
      ? stored.filter((entry) => entry && entry.id)
      : [];
  }

  /** Persist the array and let subscribers know. Returns false on failure. */
  save(entries) {
    const ok = setLocalStorage(this.key, entries);
    this.lastStorageError = ok ? null : 'Browser storage is full or blocked.';
    this.emit('change', entries);
    return ok;
  }

  /* ---------------------------------------------------------------------
     Queries
     ---------------------------------------------------------------------- */

  /** Find one saved game by RAWG id, or null. */
  getById(id) {
    const numericId = Number(id);
    return this.getAll().find((entry) => entry.id === numericId) || null;
  }

  /** True when the game is already in the backlog. */
  isSaved(id) {
    return this.getById(id) !== null;
  }

  /** Every saved game matching a status, or everything when status is 'all'. */
  getByStatus(status = 'all') {
    const entries = this.getAll();

    if (status === 'all') {
      return entries;
    }

    return entries.filter((entry) => entry.status === status);
  }

  /** Totals for the stat cards on the backlog page. */
  counts() {
    const entries = this.getAll();
    const counts = { total: entries.length };

    STATUSES.forEach((status) => {
      counts[status] = entries.filter(
        (entry) => entry.status === status,
      ).length;
    });

    return counts;
  }

  /* ---------------------------------------------------------------------
     Mutations
     ---------------------------------------------------------------------- */

  /**
   * Add a game to the backlog.
   * @returns {{added: boolean, entry: object|null, reason: string|null}}
   */
  add(game, status = DEFAULT_STATUS) {
    const numericId = Number(game.id);

    if (!Number.isFinite(numericId)) {
      return { added: false, entry: null, reason: 'invalid' };
    }

    const entries = this.getAll();

    if (entries.some((existing) => existing.id === numericId)) {
      return {
        added: false,
        entry: this.getById(numericId),
        reason: 'duplicate',
      };
    }

    const safeStatus = STATUSES.includes(status) ? status : DEFAULT_STATUS;
    const entry = toEntry(game, safeStatus);

    entries.unshift(entry);
    this.save(entries);

    return { added: true, entry, reason: null };
  }

  /** Remove a game. Returns true when something was actually removed. */
  remove(id) {
    const numericId = Number(id);
    const entries = this.getAll();
    const remaining = entries.filter((entry) => entry.id !== numericId);

    if (remaining.length === entries.length) {
      return false;
    }

    this.save(remaining);
    return true;
  }

  /**
   * Move a game to a different status.
   * @returns {object|null} the updated entry, or null when the id is unknown
   */
  updateStatus(id, status) {
    if (!STATUSES.includes(status)) {
      return null;
    }

    const numericId = Number(id);
    const entries = this.getAll();
    const entry = entries.find((item) => item.id === numericId);

    if (!entry) {
      return null;
    }

    entry.status = status;
    entry.updatedAt = new Date().toISOString();
    this.save(entries);

    return entry;
  }

  /** Toggle between "Plan to Play" and "Completed" from a card button. */
  toggleCompleted(id) {
    const entry = this.getById(id);

    if (!entry) {
      return null;
    }

    return this.updateStatus(
      id,
      entry.status === 'completed' ? 'plan-to-play' : 'completed',
    );
  }

  /** Wipe the backlog (used by the "clear all" control). */
  clear() {
    this.save([]);
  }

  /* ---------------------------------------------------------------------
     Backlog Roulette
     ---------------------------------------------------------------------- */

  /**
   * Pick one random game from the Plan to Play list. Falls back to any saved
   * game when nothing is planned, so the button always has a purpose.
   *
   * @returns {{game: object|null, pool: string}}
   */
  spin() {
    const planned = this.getByStatus('plan-to-play');

    if (planned.length > 0) {
      const pool = 'plan-to-play';
      return { game: this.randomFrom(planned), pool };
    }

    const everything = this.getAll();

    if (everything.length > 0) {
      return { game: this.randomFrom(everything), pool: 'all' };
    }

    return { game: null, pool: 'empty' };
  }

  /** Pick a random element from a non-empty array. */
  static pickRandom(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  /** Instance helper so subclasses/tests can override the randomness. */
  randomFrom(list) {
    return BacklogManager.pickRandom(list);
  }

  /* ---------------------------------------------------------------------
     Change notification
     ---------------------------------------------------------------------- */

  /**
   * Subscribe to backlog changes.
   * @param {Function} listener called with (entries, eventName)
   * @returns {Function} unsubscribe
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(eventName = 'change', payload = this.getAll()) {
    this.listeners.forEach((listener) => {
      try {
        listener(payload, eventName);
      } catch (error) {
        console.error('Backlog listener failed', error);
      }
    });
  }

  /** Label + colour for a status id. */
  static statusMeta(status) {
    return STATUS_META[status] || STATUS_META[DEFAULT_STATUS];
  }
}

/* ===========================================================================
   BacklogView — the UI for backlog/index.html
   ===========================================================================
   Lives here on purpose: it is the only consumer of BacklogManager, so keeping
   it in the same module guarantees the page never reads or writes localStorage
   directly.
   ========================================================================= */

export class BacklogView {
  /**
   * @param {object} options
   * @param {BacklogManager} options.manager
   * @param {HTMLElement} options.listElement   container for the backlog grid
   * @param {HTMLElement} options.stateElement  `.state` block for empty states
   * @param {HTMLElement} options.statsElement  container for the stat cards
   * @param {HTMLElement} options.tabsElement   status filter tab list
   * @param {HTMLElement} options.countLabel    optional "N games" text
   * @param {Function}    options.onOpenDetails opens the game detail modal
   */
  constructor({
    manager,
    listElement,
    stateElement = null,
    statsElement = null,
    tabsElement = null,
    countLabel = null,
    onOpenDetails = () => {},
  }) {
    this.manager = manager;
    this.listElement = listElement;
    this.statsElement = statsElement;
    this.tabsElement = tabsElement;
    this.countLabel = countLabel;
    this.onOpenDetails = onOpenDetails;
    this.stateElement = stateElement;

    this.filter = 'all';
    this.state = createState(stateElement);

    this.bindEvents();
    this.manager.subscribe(() => this.render());
  }

  bindEvents() {
    this.tabsElement?.addEventListener('click', (event) => {
      const tab =
        event.target instanceof Element
          ? event.target.closest('[data-status-filter]')
          : null;

      if (!tab) {
        return;
      }

      this.filter = tab.dataset.statusFilter;
      this.render();
    });

    this.listElement.addEventListener('click', (event) => {
      const target =
        event.target instanceof Element
          ? event.target.closest('[data-action]')
          : null;

      if (!target) {
        return;
      }

      const card = target.closest('[data-backlog-id]');

      if (!card) {
        return;
      }

      const gameId = Number(card.dataset.backlogId);

      if (target.dataset.action === 'details') {
        this.onOpenDetails(gameId);
        return;
      }

      if (target.dataset.action === 'remove') {
        const title =
          card.querySelector('.backlog-card__title')?.textContent ||
          'this game';
        this.manager.remove(gameId);
        showToast(`Removed “${title}” from your backlog.`, { type: 'info' });
        return;
      }

      if (target.dataset.action === 'toggle-done') {
        const entry = this.manager.toggleCompleted(gameId);

        if (entry) {
          showToast(
            entry.status === 'completed'
              ? `Completed “${entry.title}”. Nice!`
              : `Moved “${entry.title}” back to Plan to Play.`,
            { type: 'success' },
          );
        }
      }
    });

    this.listElement.addEventListener('change', (event) => {
      const select = event.target;

      if (
        !(select instanceof HTMLSelectElement) ||
        select.dataset.action !== 'status'
      ) {
        return;
      }

      const card = select.closest('[data-backlog-id]');

      if (!card) {
        return;
      }

      const entry = this.manager.updateStatus(
        Number(card.dataset.backlogId),
        select.value,
      );

      if (entry) {
        card.dataset.status = entry.status;
        showToast(`“${entry.title}” → ${STATUS_META[entry.status].label}`, {
          type: 'success',
        });
      }
    });
  }

  /* ---------------------------------------------------------------------
     Rendering
     ---------------------------------------------------------------------- */

  render() {
    this.renderStats();
    this.renderTabs();
    this.renderList();
  }

  renderStats() {
    if (!this.statsElement) {
      return;
    }

    const counts = this.manager.counts();

    const cards = [
      {
        key: 'total',
        label: 'Games saved',
        value: counts.total,
        className: 'total',
      },
      {
        key: 'plan-to-play',
        label: STATUS_META['plan-to-play'].label,
        value: counts['plan-to-play'],
        className: 'plan',
      },
      {
        key: 'currently-playing',
        label: STATUS_META['currently-playing'].label,
        value: counts['currently-playing'],
        className: 'playing',
      },
      {
        key: 'completed',
        label: STATUS_META.completed.label,
        value: counts.completed,
        className: 'completed',
      },
    ];

    this.statsElement.innerHTML = cards
      .map(
        (card) => `
          <div class="stat-card stat-card--${card.className}">
            <p class="stat-card__value">${card.value}</p>
            <p class="stat-card__label">${card.label}</p>
          </div>`,
      )
      .join('');
  }

  renderTabs() {
    if (!this.tabsElement) {
      return;
    }

    const counts = this.manager.counts();
    const tabs = [
      { id: 'all', label: 'All', count: counts.total },
      {
        id: 'plan-to-play',
        label: 'Plan to Play',
        count: counts['plan-to-play'],
      },
      {
        id: 'currently-playing',
        label: 'Playing',
        count: counts['currently-playing'],
      },
      { id: 'completed', label: 'Completed', count: counts.completed },
    ];

    this.tabsElement.innerHTML = tabs
      .map(
        (tab) => `
          <button class="chip" type="button" data-status-filter="${tab.id}"
                  aria-pressed="${tab.id === this.filter}">
            ${tab.label} <span class="pagination__status">(${tab.count})</span>
          </button>`,
      )
      .join('');
  }

  /** HTML for one saved game. */
  cardTemplate(entry) {
    const status = STATUS_META[entry.status] || STATUS_META[DEFAULT_STATUS];
    const art = entry.backgroundImage
      ? `<img src="${escapeHtml(entry.backgroundImage)}" alt="" loading="lazy" decoding="async" width="120" height="160">`
      : '<span class="game-card__art-placeholder">No art</span>';

    const options = STATUSES.map(
      (value) =>
        `<option value="${value}" ${value === entry.status ? 'selected' : ''}>${STATUS_META[value].label}</option>`,
    ).join('');

    const meta = [
      entry.year || formatDate(entry.released),
      entry.platforms[0] || '',
      entry.rating > 0 ? `\u2605 ${entry.rating.toFixed(1)}` : '',
    ]
      .filter(Boolean)
      .join(' \u2022 ');

    return `
      <article class="backlog-card" data-backlog-id="${entry.id}" data-status="${escapeHtml(entry.status)}">
        <div class="backlog-card__head">
          <button class="backlog-card__media" type="button" data-action="details"
                  aria-label="View details for ${escapeHtml(entry.title)}">${art}</button>
          <div class="backlog-card__info">
            <h3 class="backlog-card__title">${escapeHtml(entry.title)}</h3>
            <p class="backlog-card__meta">${escapeHtml(meta)}</p>
            <p><span class="badge ${status.badge}">${status.label}</span></p>
          </div>
        </div>
        <div class="backlog-card__foot">
          <label class="visually-hidden" for="status-${entry.id}">Status for ${escapeHtml(entry.title)}</label>
          <select class="select status-select" id="status-${entry.id}" data-action="status">
            ${options}
          </select>
          <button class="btn btn--ghost btn--sm" type="button" data-action="toggle-done"
                  title="Mark as ${entry.status === 'completed' ? 'planned again' : 'completed'}">
            ${entry.status === 'completed' ? 'Planned again' : 'Complete'}
          </button>
          <button class="btn btn--ghost btn--sm" type="button" data-action="remove"
                  aria-label="Remove ${escapeHtml(entry.title)} from backlog">
            Remove
          </button>
          <p class="backlog-card__date">Added ${formatDate(entry.addedAt)}</p>
        </div>
      </article>`;
  }

  renderList() {
    const entries = this.manager.getByStatus(this.filter);

    if (this.countLabel) {
      this.countLabel.textContent = `${entries.length} game${entries.length === 1 ? '' : 's'}`;
    }

    if (entries.length === 0) {
      this.listElement.replaceChildren();

      const isEmptyBacklog = this.manager.getAll().length === 0;

      this.state.show({
        icon: isEmptyBacklog ? 'stack' : 'filter',
        title: isEmptyBacklog
          ? 'Your backlog is empty'
          : `Nothing in ${STATUS_META[this.filter]?.label || 'this filter'}`,
        message: isEmptyBacklog
          ? 'Search for a game on the Discover page and press “+ Backlog” to save it here. Everything stays in this browser.'
          : 'Try a different status tab, or move a game into this list.',
      });
      return;
    }

    this.state.hide();

    const grid = document.createElement('div');
    grid.className = 'card-grid card-grid--backlog';
    grid.innerHTML = entries.map((entry) => this.cardTemplate(entry)).join('');
    this.listElement.replaceChildren(grid);
  }
}

/* ===========================================================================
   BacklogRoulette — requirement 7
   ===========================================================================
   Randomly picks one game from the Plan to Play list. The dialog is built in
   JavaScript so the module works no matter which page hosts it.
   ========================================================================= */

export class BacklogRoulette {
  /**
   * @param {object} options
   * @param {BacklogManager} options.manager
   * @param {HTMLElement}  options.modalElement `.modal--roulette` container
   * @param {HTMLButtonElement} options.triggerButton
   * @param {Function} options.onOpenDetails
   * @param {Function} options.onStatusChange called with (id, status)
   */
  constructor({
    manager,
    modalElement,
    triggerButton,
    onOpenDetails = () => {},
    onStatusChange = () => {},
  }) {
    this.manager = manager;
    this.modal = modalElement;
    this.triggerButton = triggerButton;
    this.onOpenDetails = onOpenDetails;
    this.onStatusChange = onStatusChange;

    this.isOpen = false;
    this.isSpinning = false;
    this.releaseFocusTrap = null;
    this.lastFocused = null;

    if (!this.modal) {
      return;
    }

    this.build();
    this.bindEvents();
  }

  /** True when the spinner has anything worth spinning. */
  get hasCandidates() {
    return this.manager.getAll().length > 0;
  }

  build() {
    this.backdrop = createEl('button', {
      className: 'modal__backdrop',
      attrs: {
        type: 'button',
        'aria-label': 'Close Backlog Roulette',
        tabindex: '-1',
      },
    });

    this.iconSlot = createEl('div', { className: 'roulette-dialog__icon' });
    this.iconSlot.append(icon('dice'));

    this.body = createEl('div', { className: 'modal__body' });
    this.actions = createEl('div', { className: 'roulette-dialog__actions' });

    this.dialog = createEl('div', {
      className: 'modal__dialog',
      attrs: {
        role: 'dialog',
        'aria-modal': 'true',
        'aria-labelledby': 'roulette-title',
        'aria-describedby': 'roulette-hint',
      },
    });

    this.dialog.append(this.iconSlot, this.body, this.actions);
    this.modal.replaceChildren(this.backdrop, this.dialog);
    this.modal.hidden = true;
    this.renderIdle();
  }

  bindEvents() {
    this.backdrop.addEventListener('click', () => this.close());

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.isOpen) {
        event.preventDefault();
        this.close();
      }
    });
  }

  /* ---------------------------------------------------------------------
     Render states
     ---------------------------------------------------------------------- */

  renderIdle() {
    const poolSize = this.manager.getByStatus('plan-to-play').length;

    this.body.replaceChildren(
      createEl('h2', {
        className: 'roulette-dialog__title',
        text: 'Backlog Roulette',
        attrs: { id: 'roulette-title' },
      }),
      createEl('p', {
        className: 'modal__message',
        text: this.hasCandidates
          ? `Let the dice choose from your ${
              poolSize > 0
                ? `${poolSize} game${poolSize === 1 ? '' : 's'} in Plan to Play`
                : 'saved games (nothing is in Plan to Play yet)'
            }.`
          : 'Your backlog is empty, so there is nothing to spin yet.',
        attrs: { id: 'roulette-hint' },
      }),
    );

    const spinButton = createEl('button', {
      className: 'btn btn--primary',
      text: 'Spin the wheel',
      attrs: { type: 'button' },
    });
    spinButton.disabled = !this.hasCandidates;
    spinButton.addEventListener('click', () => this.spin());

    this.actions.replaceChildren(
      spinButton,
      createEl('button', {
        className: 'btn btn--ghost',
        text: 'Close',
        attrs: { type: 'button' },
      }),
    );

    this.actions.lastElementChild.addEventListener('click', () => this.close());

    if (this.triggerButton) {
      this.triggerButton.disabled = !this.hasCandidates;
      this.triggerButton.title = this.hasCandidates
        ? 'Pick a random game from your Plan to Play list'
        : 'Save at least one game to use Backlog Roulette';
    }
  }

  renderSpinning() {
    this.iconSlot.classList.add('is-spinning');

    const status = STATUS_META['plan-to-play'].label;

    this.body.replaceChildren(
      createEl('h2', {
        className: 'roulette-dialog__title',
        text: 'Rolling…',
        attrs: { id: 'roulette-title' },
      }),
      createEl('p', {
        className: 'modal__message',
        text: `Searching your ${status.toLowerCase()} list.`,
        attrs: { id: 'roulette-hint' },
      }),
    );

    this.actions.replaceChildren();
  }

  /** Show the chosen game with follow-up actions. */
  renderResult(game, pool) {
    this.iconSlot.classList.remove('is-spinning');

    const art = game.backgroundImage
      ? createEl('img', {
          className: 'roulette-dialog__art',
          attrs: {
            src: game.backgroundImage,
            alt: `Cover art for ${escapeHtml(game.title)}`,
          },
        })
      : null;

    const meta = createEl('div', { className: 'roulette-dialog__meta' });

    if (game.rating > 0) {
      meta.append(
        createEl('span', { className: 'badge badge--star' }, [
          icon('star', 'icon rating__star'),
          game.rating.toFixed(1),
        ]),
      );
    }

    meta.append(
      createEl('span', { className: 'badge', text: formatDate(game.released) }),
    );

    if (game.genres[0]) {
      meta.append(
        createEl('span', { className: 'badge', text: game.genres[0] }),
      );
    }

    if (game.platforms[0]) {
      meta.append(
        createEl('span', { className: 'badge', text: game.platforms[0] }),
      );
    }

    this.body.replaceChildren(
      createEl('h2', {
        className: 'roulette-dialog__title',
        text: game.title,
        attrs: { id: 'roulette-title' },
      }),
      art,
      meta,
      createEl('p', {
        className: 'modal__message',
        text:
          pool === 'all'
            ? 'Picked from everything in your backlog, because nothing was marked Plan to Play.'
            : 'Picked from your Plan to Play list.',
        attrs: { id: 'roulette-hint' },
      }),
    );

    const detailsButton = createEl('button', {
      className: 'btn btn--ghost',
      text: 'Game details',
      attrs: { type: 'button' },
    });
    detailsButton.addEventListener('click', () => {
      this.close();
      this.onOpenDetails(game.id);
    });

    const startButton = createEl('button', {
      className: 'btn btn--success',
      text: 'I’m playing this',
      attrs: { type: 'button' },
    });
    startButton.addEventListener('click', () => {
      this.manager.updateStatus(game.id, 'currently-playing');
      this.onStatusChange();
      this.close();
      showToast(`“${game.title}” is now Currently Playing.`, {
        type: 'success',
      });
    });

    const againButton = createEl('button', {
      className: 'btn btn--primary',
      text: 'Spin again',
      attrs: { type: 'button' },
    });
    againButton.addEventListener('click', () => this.spin());

    this.actions.replaceChildren(againButton, detailsButton, startButton);
  }

  /* ---------------------------------------------------------------------
     Behaviour
     ---------------------------------------------------------------------- */

  /** Open the dialog (called by the "Backlog Roulette" button). */
  open() {
    if (!this.modal) {
      return;
    }

    this.lastFocused = document.activeElement;
    this.isOpen = true;
    this.renderIdle();

    this.modal.hidden = false;
    void this.modal.offsetWidth;
    this.modal.classList.add('is-open');
    document.body.classList.add('is-locked');

    this.releaseFocusTrap = trapFocus(this.dialog);
    this.dialog.querySelector('button:not([disabled])')?.focus();
  }

  close() {
    if (!this.isOpen) {
      return;
    }

    this.isOpen = false;
    this.modal.classList.remove('is-open');
    this.modal.hidden = true;
    document.body.classList.remove('is-locked');
    this.releaseFocusTrap?.();
    this.releaseFocusTrap = null;

    if (this.lastFocused && typeof this.lastFocused.focus === 'function') {
      this.lastFocused.focus();
    }
  }

  /** Run the animation, then reveal the pick. */
  async spin() {
    if (this.isSpinning) {
      return;
    }

    const { game, pool } = this.manager.spin();

    if (!game) {
      showToast('Add a game to your backlog first.', { type: 'info' });
      this.renderIdle();
      return;
    }

    this.isSpinning = true;
    this.renderSpinning();

    const delay = prefersReducedMotion() ? 0 : 900;
    const startedAt = Date.now();

    // Pace the spinner so it feels deliberate even on reduced-motion devices.
    while (Date.now() - startedAt < delay) {
      await wait(120);
    }

    this.isSpinning = false;
    this.renderResult(game, pool);
  }
}
