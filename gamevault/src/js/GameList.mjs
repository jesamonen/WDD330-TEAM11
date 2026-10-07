/**
 * GameList.mjs
 * ---------------------------------------------------------------------------
 * Builds and drives the discover page: it renders game cards, reads the
 * filter/sort controls, calls ExternalServices and turns the response into
 * loading / error / empty states.
 *
 * It also owns the search box behaviour (debounced), pagination, filter
 * persistence and URL query-string sync so a search can be shared or reloaded.
 */

import {
  GENRE_OPTIONS,
  PLATFORM_OPTIONS,
  PAGE_SIZE,
  SORT_OPTIONS,
} from './ExternalServices.mjs';
import {
  buildSkeletonCards,
  createState,
  escapeHtml,
  formatRating,
  debounce,
  showToast,
} from './utils.mjs';

const MAX_PAGE_BUTTONS = 5;

/** Turn a list of page numbers into a trimmed window around the current page. */
export function pageWindow(current, total, size = MAX_PAGE_BUTTONS) {
  if (total <= size) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const half = Math.floor(size / 2);
  let start = Math.max(1, current - half);
  const end = Math.min(total, start + size - 1);

  start = Math.max(1, end - size + 1);

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

/** Default filter state. */
function defaultFilters() {
  return {
    search: '',
    genres: [],
    platform: 'all',
    minRating: 0,
    sort: 'rating',
    page: 1,
  };
}

export default class GameList {
  /**
   * @param {HTMLElement} listElement container that receives the card grid
   * @param {import('./ExternalServices.mjs').default} dataSource API service
   * @param {object} options
   */
  constructor(listElement, dataSource, options = {}) {
    this.listElement = listElement;
    this.dataSource = dataSource;
    this.backlog = options.backlog || null;
    this.onOpenDetails = options.onOpenDetails || (() => {});
    this.onResultsChange = options.onResultsChange || (() => {});
    this.stateElement = options.stateElement || null;
    this.paginationElement = options.paginationElement || null;

    this.filters = defaultFilters();
    this.totalGames = 0;
    this.totalPages = 1;
    this.isLoading = false;
    this.onControlsChange = options.onControlsChange || null;

    this.state = this.stateElement
      ? createState(this.stateElement)
      : { show: () => {}, hide: () => {} };
  }

  /* =====================================================================
     Filter state
     ====================================================================== */

  /** Merge a partial update into the active filters and reset pagination. */
  setFilters(patch = {}) {
    this.filters = { ...this.filters, ...patch, page: 1 };
  }

  /** The current filters, with platform + sort resolved to API values. */
  resolveQuery() {
    const platform = PLATFORM_OPTIONS.find(
      (option) => option.id === this.filters.platform,
    );
    const sort = SORT_OPTIONS.find((option) => option.id === this.filters.sort);
    const hasSearch = this.filters.search.trim().length > 0;

    return {
      search: this.filters.search.trim(),
      genres: this.filters.genres,
      platforms: platform && platform.ids.length > 0 ? platform.ids : [],
      ordering: sort ? sort.ordering : '-rating',
      minRating: Number(this.filters.minRating) || 0,
      page: this.filters.page,
      pageSize: PAGE_SIZE,
      // When a user types a search, relevance beats rating.
      sortOverride: hasSearch && !sort ? 'name' : null,
    };
  }

  /** Number of active filters, used for the "Filters (2)" button. */
  activeFilterCount() {
    let count = 0;

    if (this.filters.genres.length > 0) count += 1;
    if (this.filters.platform && this.filters.platform !== 'all') count += 1;
    if (Number(this.filters.minRating) > 0) count += 1;
    if (this.filters.sort && this.filters.sort !== 'rating') count += 1;

    return count;
  }

  /** Human-readable description of what is currently on screen. */
  describeFilters() {
    const parts = [];

    if (this.filters.search.trim()) {
      parts.push(`results for "${this.filters.search.trim()}"`);
    }

    if (this.filters.genres.length > 0) {
      const names = this.filters.genres
        .map((id) => {
          const genre = GENRE_OPTIONS.find((option) => option.id === id);
          return genre ? genre.name : null;
        })
        .filter(Boolean);
      parts.push(`in ${names.join(', ')}`);
    }

    if (this.filters.platform && this.filters.platform !== 'all') {
      const platform = PLATFORM_OPTIONS.find(
        (option) => option.id === this.filters.platform,
      );
      if (platform) {
        parts.push(`on ${platform.name}`);
      }
    }

    if (Number(this.filters.minRating) > 0) {
      parts.push(`rated ${this.filters.minRating}+`);
    }

    return parts.length > 0 ? parts.join(' ') : 'popular games right now';
  }

  /* =====================================================================
     Rendering — states
     ====================================================================== */

  showSkeleton(count = 12) {
    this.listElement.replaceChildren(buildSkeletonCards(count));
  }

  showError(message, retry) {
    this.listElement.replaceChildren();

    if (!this.stateElement) {
      this.showEmpty(message, 'error');
      return;
    }

    this.state.show({
      icon: 'alert',
      title: 'We could not load games',
      message,
      action: { label: 'Try again', onClick: retry },
    });
  }

  showEmpty(message, variant = 'empty') {
    this.listElement.replaceChildren();

    if (!this.stateElement) {
      return;
    }

    if (variant === 'error') {
      this.state.show({
        icon: 'alert',
        title: 'Something went wrong',
        message,
      });
      return;
    }

    this.state.show({
      icon: 'search',
      title: 'No games found',
      message,
      action: {
        label: 'Clear filters',
        onClick: () => this.onFilterChange({ resetAll: true }),
      },
    });
  }

  hideStates() {
    this.state.hide();
  }

  /* =====================================================================
     Rendering — cards
     ====================================================================== */

  /** Build the HTML for a single game card. */
  cardTemplate(game) {
    const saved = this.backlog ? this.backlog.isSaved(game.id) : false;

    const art = game.backgroundImage
      ? `<img class="game-card__art" src="${escapeHtml(game.backgroundImage)}" alt="${escapeHtml(game.title)} cover art" loading="lazy" decoding="async" width="300" height="400">`
      : `<span class="game-card__art-placeholder" aria-hidden="true">No artwork</span>`;

    const rating =
      game.rating > 0
        ? `<span class="game-card__rating" title="RAWG rating ${formatRating(game.rating)} of 5">
           <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.6 5.6 6 .8-4.4 4.2 1.1 6.1-5.3-3-5.3 3 1.1-6.1L3.4 9.4l6-.8L12 3Z"/></svg>
           ${formatRating(game.rating)}
         </span>`
        : '';

    const savedBadge = saved
      ? `<span class="game-card__saved" title="In your backlog"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m4.5 12.5 5 5 10-11"/></svg><span class="visually-hidden">Saved to backlog</span></span>`
      : '';

    const genres = game.genres
      .slice(0, 2)
      .map((genre) => `<span class="tag">${escapeHtml(genre)}</span>`)
      .join('');

    const platforms = game.platforms
      .slice(0, 2)
      .map((platform) => escapeHtml(platform));
    const year = game.year || 'TBA';
    const metaParts = [year, ...platforms].join(
      ' <span class="game-card__meta-sep">•</span> ',
    );

    return `
      <article class="game-card" data-game-id="${game.id}">
        <button class="game-card__media" type="button" data-action="details"
                aria-label="View details for ${escapeHtml(game.title)}">
          ${art}
          ${rating}
          <span class="game-card__overlay">View details</span>
        </button>
        ${savedBadge}
        <div class="game-card__body">
          <h3 class="game-card__title">${escapeHtml(game.title)}</h3>
          <p class="game-card__meta">${metaParts || 'Platform unknown'}</p>
          ${genres ? `<div class="game-card__genres">${genres}</div>` : ''}
        </div>
        <div class="game-card__actions">
          <button class="btn btn--ghost btn--sm" type="button" data-action="details">
            Details
          </button>
          <button class="btn ${saved ? 'btn--ghost' : 'btn--primary'} btn--sm"
                  type="button" data-action="${saved ? 'remove' : 'add'}"
                  aria-label="${saved ? `Remove ${escapeHtml(game.title)} from backlog` : `Add ${escapeHtml(game.title)} to backlog`}">
            ${saved ? 'Saved' : '+ Backlog'}
          </button>
        </div>
      </article>`;
  }

  /** Render a grid of games. */
  renderCards(games) {
    if (!games || games.length === 0) {
      this.showEmpty(
        `No games matched ${this.describeFilters()}. Try a different search or clear the filters.`,
      );
      this.onResultsChange({ count: 0, total: 0, page: this.filters.page });
      return;
    }

    this.hideStates();

    const grid = document.createElement('div');
    grid.className = 'card-grid';
    grid.innerHTML = games.map((game) => this.cardTemplate(game)).join('');

    this.listElement.replaceChildren(grid);
    this.onResultsChange({
      count: games.length,
      total: this.totalGames,
      page: this.filters.page,
    });
  }

  /* =====================================================================
     Rendering — pagination
     ====================================================================== */

  renderPagination() {
    const host = this.paginationElement;

    if (!host) {
      return;
    }

    if (this.totalPages <= 1) {
      host.replaceChildren();
      host.classList.remove('is-visible');
      return;
    }

    host.classList.add('is-visible');
    host.innerHTML = `
      <button class="btn btn--ghost btn--sm" type="button" data-page-nav="prev"
              ${this.filters.page <= 1 ? 'disabled' : ''}>Previous</button>
      <div class="pagination__dots">
        ${pageWindow(this.filters.page, this.totalPages)
          .map(
            (page) =>
              `<button class="pagination__dot" type="button" data-page="${page}"
                 aria-current="${page === this.filters.page ? 'true' : 'false'}"
                 aria-label="Go to page ${page}">${page}</button>`,
          )
          .join('')}
      </div>
      <button class="btn btn--ghost btn--sm" type="button" data-page-nav="next"
              ${this.filters.page >= this.totalPages ? 'disabled' : ''}>Next</button>
      <p class="pagination__status" role="status">Page ${this.filters.page} of ${this.totalPages}</p>`;
  }

  /* =====================================================================
     Data loading
     ====================================================================== */

  /** Fetch the current page and render it. */
  async load({ resetPage = false } = {}) {
    if (resetPage) {
      this.filters.page = 1;
    }

    if (this.isLoading) {
      return;
    }

    this.isLoading = true;
    this.showSkeleton();
    this.renderPagination();

    const query = this.resolveQuery();

    try {
      const result = await this.dataSource.getGames({
        search: query.search,
        genres: query.genres,
        platforms: query.platforms,
        ordering: query.ordering,
        minRating: query.minRating,
        page: query.page,
        pageSize: query.pageSize,
      });

      this.totalGames = result.total;
      this.totalPages = Math.max(1, result.totalPages);

      // A page number past the end (after changing filters) snaps back.
      if (this.filters.page > this.totalPages) {
        this.filters.page = this.totalPages;
        this.isLoading = false;
        await this.load();
        return;
      }

      this.renderCards(result.games);
      this.renderPagination();
      this.syncUrl();
    } catch (error) {
      this.showError(error.message, () => this.load({ resetPage: true }));
    } finally {
      this.isLoading = false;
    }
  }

  /** Refresh the "saved" styling without another network request. */
  refreshSavedState() {
    if (!this.backlog) {
      return;
    }

    const grid = this.listElement.querySelector('.card-grid');

    if (!grid) {
      return;
    }

    Array.from(grid.querySelectorAll('[data-game-id]')).forEach((card) => {
      const gameId = Number(card.dataset.gameId);
      const saved = this.backlog.isSaved(gameId);
      const actionButton = card.querySelector(
        '[data-action="add"], [data-action="remove"]',
      );

      if (card.querySelector('.game-card__saved')) {
        if (!saved) {
          card.querySelector('.game-card__saved').remove();
        }
      } else if (saved) {
        const badge = document.createElement('span');
        badge.className = 'game-card__saved';
        badge.title = 'In your backlog';
        badge.innerHTML =
          '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m4.5 12.5 5 5 10-11"/></svg>';
        card.append(badge);
      }

      if (actionButton) {
        const isSaved = actionButton.dataset.action === 'remove';
        actionButton.dataset.action = isSaved ? 'remove' : 'add';
        actionButton.classList.toggle('btn--ghost', isSaved);
        actionButton.classList.toggle('btn--primary', !isSaved);
        actionButton.textContent = isSaved ? 'Saved' : '+ Backlog';
      }
    });
  }

  /* =====================================================================
     URL + storage sync
     ====================================================================== */

  /** Write the active search into the query string (no page reload). */
  syncUrl() {
    if (!window.history?.replaceState) {
      return;
    }

    const params = new URLSearchParams(window.location.search);

    if (this.filters.search.trim()) {
      params.set('search', this.filters.search.trim());
    } else {
      params.delete('search');
    }

    if (this.filters.genres.length > 0) {
      params.set('genres', this.filters.genres.join(','));
    } else {
      params.delete('genres');
    }

    if (this.filters.platform !== 'all') {
      params.set('platform', this.filters.platform);
    } else {
      params.delete('platform');
    }

    if (this.filters.sort !== 'rating') {
      params.set('sort', this.filters.sort);
    } else {
      params.delete('sort');
    }

    const query = params.toString();
    const nextUrl = `${window.location.pathname}${query ? `?${query}` : ''}`;
    window.history.replaceState({}, '', nextUrl);
  }

  /** Adopt filters found in the URL so shared links restore the view. */
  hydrateFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const patch = {};

    const search = params.get('search');
    const genres = params.get('genres');
    const platform = params.get('platform');
    const sort = params.get('sort');

    if (search) patch.search = search;
    if (genres) {
      patch.genres = genres
        .split(',')
        .map((value) => Number(value))
        .filter((value) => GENRE_OPTIONS.some((option) => option.id === value));
    }
    if (platform && PLATFORM_OPTIONS.some((option) => option.id === platform)) {
      patch.platform = platform;
    }
    if (sort && SORT_OPTIONS.some((option) => option.id === sort)) {
      patch.sort = sort;
    }

    if (Object.keys(patch).length > 0) {
      this.filters = { ...this.filters, ...patch };
      return true;
    }

    return false;
  }

  /* =====================================================================
     Events
     ====================================================================== */

  /** Card click delegation (details / add / remove). */
  handleListClick(event) {
    const target =
      event.target instanceof Element
        ? event.target.closest('[data-action]')
        : null;

    if (!target || !this.listElement.contains(target)) {
      return;
    }

    const card = target.closest('[data-game-id]');

    if (!card) {
      return;
    }

    const gameId = Number(card.dataset.gameId);

    if (target.dataset.action === 'details') {
      this.onOpenDetails(gameId);
      return;
    }

    if (!this.backlog) {
      return;
    }

    if (target.dataset.action === 'add') {
      const result = this.backlog.add({
        id: gameId,
        title: card.querySelector('.game-card__title')?.textContent || 'Game',
        backgroundImage: card.querySelector('.game-card__art')?.src || null,
      });

      showToast(
        result.reason === 'duplicate'
          ? 'That game is already in your backlog.'
          : 'Added to your backlog.',
        { type: result.reason === 'duplicate' ? 'info' : 'success' },
      );

      this.refreshSavedState();
      return;
    }

    if (target.dataset.action === 'remove') {
      this.backlog.remove(gameId);
      showToast('Removed from your backlog.', { type: 'info' });
      this.refreshSavedState();
    }
  }

  /** Pagination click delegation. */
  handlePaginationClick(event) {
    const target =
      event.target instanceof Element
        ? event.target.closest('[data-page], [data-page-nav]')
        : null;

    if (!target || !this.paginationElement?.contains(target)) {
      return;
    }

    let nextPage = this.filters.page;

    if (target.dataset.page) {
      nextPage = Number(target.dataset.page);
    } else if (target.dataset.pageNav === 'prev') {
      nextPage = Math.max(1, this.filters.page - 1);
    } else if (target.dataset.pageNav === 'next') {
      nextPage = Math.min(this.totalPages, this.filters.page + 1);
    }

    if (nextPage !== this.filters.page) {
      this.filters.page = nextPage;
      this.load();
      this.listElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  /** Called by main.js whenever any filter control changes. */
  onFilterChange(patch = {}) {
    if (patch.resetAll) {
      this.filters = { ...defaultFilters(), search: this.filters.search };
    }

    if (Object.keys(patch).length > 0) {
      this.setFilters(patch);
    }

    this.load({ resetPage: true });
    this.onControlsChange?.();
  }

  /** Debounced search handler shared by the header and hero inputs. */
  createSearchHandler() {
    return debounce((value) => {
      this.filters.search = value;
      this.onFilterChange();
    }, 380);
  }
}
