/**
 * main.js
 * ---------------------------------------------------------------------------
 * Application entry point.
 *
 * Responsibilities:
 *   1. Restore the saved theme and wire the dark/light switch.
 *   2. Initialise shared chrome: mobile menu, backlog badge, footer year.
 *   3. Route to the right page controller using `<body data-page>`.
 *
 * Each page controller only sets up the DOM that page owns, so the same entry
 * point works for index.html, backlog/index.html and deals/index.html.
 */

import ExternalServices, {
  GENRE_OPTIONS,
  PLATFORM_OPTIONS,
  SORT_OPTIONS,
} from './ExternalServices.mjs';
import GameList from './GameList.mjs';
import GameDetails from './GameDetails.mjs';
import DealFinder from './DealFinder.mjs';
import BacklogManager, {
  BacklogRoulette,
  BacklogView,
} from './BacklogManager.mjs';
import {
  STORAGE_KEYS,
  escapeHtml,
  getLocalStorage,
  qs,
  query,
  qsa,
  setLocalStorage,
  showToast,
} from './utils.mjs';

/* ===========================================================================
   Shared services
   ========================================================================= */

const dataSource = new ExternalServices();
const backlog = new BacklogManager();

/* ===========================================================================
   Theme (requirement 10)
   ========================================================================= */

const THEME_KEY = STORAGE_KEYS.THEME;

function preferredTheme() {
  const saved = getLocalStorage(THEME_KEY, null);

  if (saved === 'light' || saved === 'dark') {
    return saved;
  }

  return typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);

  const meta = document.querySelector('meta[name="theme-color"]');

  if (meta) {
    meta.setAttribute('content', theme === 'light' ? '#F1F5F9' : '#0F172A');
  }

  qsa('[data-theme-toggle]').forEach((button) => {
    button.setAttribute(
      'aria-label',
      theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme',
    );
    button.setAttribute('aria-pressed', String(theme === 'light'));
  });
}

function initTheme() {
  applyTheme(preferredTheme());

  qsa('[data-theme-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      const next =
        document.documentElement.getAttribute('data-theme') === 'light'
          ? 'dark'
          : 'light';

      applyTheme(next);
      setLocalStorage(THEME_KEY, next);
    });
  });
}

/* ===========================================================================
   Shared chrome
   ========================================================================= */

function initMobileMenu() {
  const menu = query('#mobile-menu');
  const toggle = query('[data-nav-toggle]');

  if (!menu || !toggle) {
    return;
  }

  const panel = query('.mobile-menu__panel', menu);

  const setOpen = (open) => {
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', String(!open));
    toggle.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('is-locked', open);

    if (open) {
      panel?.querySelector('a, button')?.focus();
    } else {
      toggle.focus();
    }
  };

  toggle.addEventListener('click', () => {
    setOpen(!menu.classList.contains('is-open'));
  });

  qsa('[data-menu-close]', menu).forEach((button) => {
    button.addEventListener('click', () => setOpen(false));
  });

  // Following a link should never leave the menu covering the page.
  qsa('a', panel || menu).forEach((link) => {
    link.addEventListener('click', () => setOpen(false));
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menu.classList.contains('is-open')) {
      setOpen(false);
    }
  });

  // Reset when the layout switches to the desktop navigation.
  window
    .matchMedia('(min-width: 1024px)')
    .addEventListener('change', (event) => {
      if (event.matches) {
        setOpen(false);
      }
    });
}

/** Paint the backlog count into every badge in the chrome. */
function updateBacklogBadge({ bump = false } = {}) {
  const count = backlog.counts().total;

  qsa('[data-backlog-count]').forEach((badge) => {
    badge.textContent = String(count);
    badge.classList.toggle('is-visible', count > 0);
    badge.setAttribute(
      'aria-label',
      `${count} game${count === 1 ? '' : 's'} in your backlog`,
    );

    if (bump && count > 0) {
      badge.classList.remove('is-bumping');
      void badge.offsetWidth;
      badge.classList.add('is-bumping');
    }
  });

  qsa('[data-backlog-link]').forEach((link) => {
    link.setAttribute(
      'title',
      count > 0
        ? `${count} game${count === 1 ? '' : 's'} in your backlog`
        : 'Your backlog is empty',
    );
  });
}

function initFooter() {
  const year = query('#current-year');

  if (year) {
    year.textContent = String(new Date().getFullYear());
  }
}

/** Warn once on the discover page when no RAWG key is configured. */
function checkApiConfiguration(page) {
  if (dataSource.hasApiKey || page !== 'discover') {
    return;
  }

  showToast(
    'No RAWG API key found — copy .env.sample to .env and add your free key.',
    { type: 'error', duration: 8000 },
  );
}

/* ===========================================================================
   Discover page (requirements 1–3)
   ========================================================================= */

/** Build the genre checkbox list in the sidebar. */
function renderGenreFilters(container) {
  container.innerHTML = GENRE_OPTIONS.map(
    (genre) => `
      <label class="checkbox-row">
        <input type="checkbox" name="genre" value="${genre.id}">
        <span>${escapeHtml(genre.name)}</span>
      </label>`,
  ).join('');
}

/** Build the platform radio group in the sidebar. */
function renderPlatformFilters(container) {
  container.innerHTML = PLATFORM_OPTIONS.map(
    (platform) => `
      <label class="radio-row">
        <input type="radio" name="platform" value="${escapeHtml(platform.id)}"
               ${platform.id === 'all' ? 'checked' : ''}>
        <span>${escapeHtml(platform.name)}</span>
      </label>`,
  ).join('');
}

/** Build the sort dropdowns (sidebar + mobile). */
function renderSortOptions(select) {
  if (!select) {
    return;
  }

  select.innerHTML = SORT_OPTIONS.map(
    (option) =>
      `<option value="${option.id}">${escapeHtml(option.name)}</option>`,
  ).join('');
}

/** Copy the controller's filter state onto every control in the DOM. */
function syncControls(gameList, elements) {
  const { genres, platform, sort, search } = gameList.filters;

  elements.genreInputs.forEach((input) => {
    input.checked = genres.includes(Number(input.value));
  });

  elements.platformInputs.forEach((input) => {
    input.checked = input.value === platform;
  });

  if (elements.sortSelects.sort) {
    elements.sortSelects.sort.value = sort;
  }

  if (elements.sortSelects.mobile) {
    elements.sortSelects.mobile.value = sort;
  }

  if (
    elements.mobileGenre &&
    elements.mobileGenre.value !== (genres[0] ?? '')
  ) {
    elements.mobileGenre.value = genres[0] ? String(genres[0]) : '';
  }

  if (elements.mobilePlatform) {
    elements.mobilePlatform.value = platform;
  }

  elements.searchInputs.forEach((input) => {
    if (document.activeElement !== input && input.value !== search) {
      input.value = search;
    }
  });

  elements.searchInputs.forEach((input) => {
    input.placeholder = search ? `Search "${search}"` : 'Search games…';
  });

  // Clear-search button visibility
  qsa('[data-clear-search]').forEach((button) => {
    button.hidden = !search;
  });
}

function initDiscoverPage() {
  const listElement = qs('#game-list');
  const stateElement = query('#game-list-state');
  const paginationElement = query('#game-pagination');
  const resultsLabel = query('#results-label');

  const genreContainer = query('#genre-filters');
  const platformContainer = query('#platform-filters');
  const sortSelect = query('#sort-select');
  const mobileGenre = query('#mobile-genre');
  const mobilePlatform = query('#mobile-platform');
  const mobileSort = query('#mobile-sort');
  const searchInputs = qsa('[data-search-input]');
  const sidebar = query('#filter-sidebar');
  const filterToggle = query('[data-filter-toggle]');

  const searchHandler = (() => {
    let timer;

    return (value) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(
        () => gameList.onFilterChange({ search: value }),
        380,
      );
    };
  })();

  /* ---- controls ------------------------------------------------------- */

  if (genreContainer) {
    renderGenreFilters(genreContainer);
  }

  if (platformContainer) {
    renderPlatformFilters(platformContainer);
  }

  renderSortOptions(sortSelect);
  renderSortOptions(mobileSort);

  if (mobilePlatform) {
    mobilePlatform.innerHTML = PLATFORM_OPTIONS.map(
      (option) =>
        `<option value="${escapeHtml(option.id)}">${escapeHtml(option.name)}</option>`,
    ).join('');
  }

  if (mobileGenre) {
    mobileGenre.innerHTML = [
      '<option value="">All genres</option>',
      ...GENRE_OPTIONS.map(
        (genre) =>
          `<option value="${genre.id}">${escapeHtml(genre.name)}</option>`,
      ),
    ].join('');
  }

  /* ---- modules -------------------------------------------------------- */

  const details = new GameDetails({
    modalElement: query('#game-modal'),
    dataSource,
    backlog,
    onBacklogChange: () => {
      updateBacklogBadge();
      gameList.refreshSavedState();
    },
  });

  const gameList = new GameList(listElement, dataSource, {
    backlog,
    stateElement,
    paginationElement,
    onOpenDetails: (id) => details.open(id),
    onResultsChange: ({ count, total }) => {
      if (resultsLabel) {
        resultsLabel.textContent =
          total > 0
            ? `${count} of ${total.toLocaleString()} games`
            : `${count} games`;
      }
    },
  });

  const elements = {
    genreInputs: qsa('input[name="genre"]', genreContainer || document),
    platformInputs: qsa(
      'input[name="platform"]',
      platformContainer || document,
    ),
    sortSelects: { sort: sortSelect, mobile: mobileSort },
    mobileGenre,
    mobilePlatform,
    searchInputs,
  };

  gameList.onControlsChange = () => syncControls(gameList, elements);

  /* ---- listeners ------------------------------------------------------ */

  genreContainer?.addEventListener('change', (event) => {
    const input = event.target;

    if (!(input instanceof HTMLInputElement) || input.name !== 'genre') {
      return;
    }

    const id = Number(input.value);
    const selected = elements.genreInputs
      .filter((box) => box.checked)
      .map((box) => Number(box.value));

    gameList.onFilterChange({ genres: selected, __ignored: id });
  });

  platformContainer?.addEventListener('change', (event) => {
    if (event.target instanceof HTMLInputElement) {
      gameList.onFilterChange({ platform: event.target.value });
    }
  });

  mobileGenre?.addEventListener('change', () => {
    const value = mobileGenre.value;
    gameList.onFilterChange({ genres: value ? [Number(value)] : [] });
  });

  mobilePlatform?.addEventListener('change', () => {
    gameList.onFilterChange({ platform: mobilePlatform.value });
  });

  sortSelect?.addEventListener('change', () => {
    gameList.onFilterChange({ sort: sortSelect.value });
  });

  mobileSort?.addEventListener('change', () => {
    gameList.onFilterChange({ sort: mobileSort.value });
  });

  searchInputs.forEach((input) => {
    input.addEventListener('input', () => {
      // Mirror the value into the other search box before filtering.
      searchInputs.forEach((other) => {
        if (other !== input) {
          other.value = input.value;
        }
      });
      searchHandler(input.value);
    });

    input.form?.addEventListener('submit', (event) => {
      event.preventDefault();
      gameList.onFilterChange({ search: input.value });
    });
  });

  qsa('[data-clear-search]').forEach((button) => {
    button.addEventListener('click', () => {
      searchInputs.forEach((input) => {
        input.value = '';
      });
      gameList.onFilterChange({ search: '' });
    });
  });

  qsa('[data-clear-filters]').forEach((button) => {
    button.addEventListener('click', () => {
      searchInputs.forEach((input) => {
        input.value = '';
      });
      gameList.onFilterChange({ resetAll: true });
    });
  });

  // Mobile filter accordion
  filterToggle?.addEventListener('click', () => {
    const expanded = filterToggle.getAttribute('aria-expanded') === 'true';
    filterToggle.setAttribute('aria-expanded', String(!expanded));
    sidebar
      ?.querySelector('.sidebar__body')
      ?.toggleAttribute('hidden', expanded);
  });

  listElement.addEventListener('click', (event) => {
    gameList.handleListClick(event);
  });

  paginationElement?.addEventListener('click', (event) => {
    gameList.handlePaginationClick(event);
  });

  /* ---- first paint ---------------------------------------------------- */

  const fromUrl = gameList.hydrateFromUrl();

  if (fromUrl) {
    searchInputs.forEach((input) => {
      input.value = gameList.filters.search;
    });
  }

  syncControls(gameList, elements);
  gameList.load();

  // Keep cards in sync when the backlog changes on another page/tab.
  backlog.subscribe(() => gameList.refreshSavedState());
}

/* ===========================================================================
   Backlog page (requirements 4–7)
   ========================================================================= */

function initBacklogPage() {
  const details = new GameDetails({
    modalElement: query('#game-modal'),
    dataSource,
    backlog,
    onBacklogChange: () => updateBacklogBadge(),
  });

  const view = new BacklogView({
    manager: backlog,
    listElement: qs('#backlog-list'),
    stateElement: query('#backlog-state'),
    statsElement: query('#backlog-stats'),
    tabsElement: query('#backlog-tabs'),
    countLabel: query('#backlog-count-label'),
    onOpenDetails: (id) => details.open(id),
  });

  const roulette = new BacklogRoulette({
    manager: backlog,
    modalElement: query('#roulette-modal'),
    triggerButton: query('[data-roulette-trigger]'),
    onOpenDetails: (id) => details.open(id),
    onStatusChange: () => updateBacklogBadge(),
  });

  query('[data-roulette-trigger]')?.addEventListener('click', () =>
    roulette.open(),
  );

  qsa('[data-backlog-detail]').forEach((button) => {
    button.addEventListener('click', () =>
      details.open(Number(button.dataset.backlogDetail)),
    );
  });

  view.render();
  roulette.renderIdle();
}

/* ===========================================================================
   Deals page (requirement 8)
   ========================================================================= */

function initDealsPage() {
  const finder = new DealFinder({
    gridElement: qs('#deal-grid'),
    stateElement: query('#deal-state'),
    storeFilterElement: query('#deal-store-filter'),
    paginationElement: query('#deal-pagination'),
    sortSelect: query('#deal-sort'),
    searchInput: query('#deal-search'),
    resultsLabel: query('#deal-results-label'),
    dataSource,
  });

  finder.init();
}

/* ===========================================================================
   Boot
   ========================================================================= */

function init() {
  initTheme();
  initMobileMenu();
  initFooter();
  updateBacklogBadge();

  backlog.subscribe(() => updateBacklogBadge());

  const page = document.body.dataset.page || 'discover';

  checkApiConfiguration(page);

  try {
    if (page === 'discover') {
      initDiscoverPage();
    } else if (page === 'backlog') {
      initBacklogPage();
    } else if (page === 'deals') {
      initDealsPage();
    }
  } catch (error) {
    console.error('GameVault failed to start', error);
    showToast('Something went wrong while starting the page. Try reloading.', {
      type: 'error',
      duration: 6000,
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
