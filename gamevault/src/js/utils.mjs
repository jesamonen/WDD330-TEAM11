/**
 * utils.mjs
 * ---------------------------------------------------------------------------
 * Reusable, dependency-free helpers shared across every GameVault module:
 * DOM selection, localStorage access, formatters, debouncing, escaping and
 * the loading / error / empty state renderers.
 *
 * Nothing in this file knows about a specific API or view — it is the lowest
 * layer of the application.
 */

/** localStorage keys used across the app, centralised to avoid typos. */
export const STORAGE_KEYS = {
  BACKLOG: 'gamevault.backlog',
  THEME: 'gamevault.theme',
  FILTERS: 'gamevault.filters',
  DEAL_FILTERS: 'gamevault.dealFilters',
};

/** Human readable labels + accent colours for the three backlog statuses. */
export const STATUS_META = {
  'plan-to-play': {
    label: 'Plan to Play',
    short: 'Planned',
    badge: 'badge--accent',
    color: '#6366F1',
  },
  'currently-playing': {
    label: 'Currently Playing',
    short: 'Playing',
    badge: '',
    color: '#F59E0B',
  },
  completed: {
    label: 'Completed',
    short: 'Done',
    badge: 'badge--success',
    color: '#22C55E',
  },
};

/** Ordered list of valid status ids. */
export const STATUSES = Object.keys(STATUS_META);

/** Default status applied to a newly added game. */
export const DEFAULT_STATUS = 'plan-to-play';

/* ===========================================================================
   DOM helpers
   ========================================================================= */

/** querySelector wrapper that throws a helpful error when nothing matches. */
export function qs(selector, parent = document) {
  const element = parent.querySelector(selector);

  if (!element) {
    throw new Error(`utils.qs: no element matched "${selector}"`);
  }

  return element;
}

/** querySelector wrapper that returns null instead of throwing. */
export function query(selector, parent = document) {
  return parent.querySelector(selector);
}

/** querySelectorAll wrapper — always returns a real array. */
export function qsa(selector, parent = document) {
  return Array.from(parent.querySelectorAll(selector));
}

/** Create an element with optional class, dataset, attributes and children. */
export function createEl(tag, options = {}) {
  const { className, text, html, dataset, attrs, children } = options;
  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  if (text !== undefined) {
    element.textContent = text;
  }

  if (html !== undefined) {
    element.innerHTML = html;
  }

  if (dataset) {
    Object.entries(dataset).forEach(([key, value]) => {
      element.dataset[key] = value;
    });
  }

  if (attrs) {
    Object.entries(attrs).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== false) {
        element.setAttribute(key, value === true ? '' : value);
      }
    });
  }

  if (Array.isArray(children)) {
    children
      .filter(Boolean)
      .forEach((child) =>
        element.append(
          typeof child === 'string' ? document.createTextNode(child) : child,
        ),
      );
  }

  return element;
}

/** Escape a string so it can be safely injected via innerHTML. */
export function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Parse a JSON string attribute (e.g. data-payload) without throwing. */
export function readJsonAttr(value, fallback = {}) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

/** Remove every child of an element. */
export function clear(element) {
  if (element) {
    element.replaceChildren();
  }
}

/* ===========================================================================
   localStorage helpers
   ========================================================================= */

/**
 * Read and parse a localStorage value. Returns `fallback` when the key is
 * missing, JSON is invalid, or storage is unavailable (private browsing).
 */
export function getLocalStorage(key, fallback = null) {
  try {
    const raw = window.localStorage.getItem(key);

    if (raw === null) {
      return fallback;
    }

    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/** Serialise and store a value. Returns true when the write succeeded. */
export function setLocalStorage(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/** Delete a localStorage key, ignoring storage errors. */
export function removeLocalStorage(key) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* storage unavailable — nothing to clean up */
  }
}

/* ===========================================================================
   Formatters
   ========================================================================= */

/** Turn a RAWG release date (`2019-02-21` or `null`) into a readable date. */
export function formatDate(dateString) {
  if (!dateString) {
    return 'TBA';
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return String(dateString);
  }

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Turn a CheapShark unix timestamp (seconds) into a readable date. */
export function formatUnixDate(seconds) {
  const value = Number(seconds);

  if (!Number.isFinite(value) || value <= 0) {
    return 'TBA';
  }

  return formatDate(new Date(value * 1000).toISOString());
}

/** Format a price, e.g. 24.99 -> "$24.99". */
export function formatPrice(value, currency = 'USD') {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return '--';
  }

  return amount.toLocaleString(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  });
}

/** Format an average playtime in hours, e.g. 62 -> "62h", 0 -> "Unknown". */
export function formatPlaytime(hours) {
  const value = Number(hours);

  if (!Number.isFinite(value) || value <= 0) {
    return 'Unknown';
  }

  return `${Math.round(value)}h`;
}

/** Format a 0-5 RAWG rating; returns an em dash when there is no score. */
export function formatRating(rating) {
  const value = Number(rating);

  if (!Number.isFinite(value) || value <= 0) {
    return '--';
  }

  return value.toFixed(1);
}

/** Format a 0-100 rating as a percentage. */
export function formatPercent(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return '--';
  }

  return `${Math.round(number)}%`;
}

/** Clamp a number between a minimum and maximum. */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/** Turn a slug into a Title Case label, e.g. "role-playing" -> "Role Playing". */
export function titleCase(value = '') {
  return String(value)
    .split(/[\s-_]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** Strip HTML tags from a description so plain text can be displayed. */
export function stripHtml(html = '') {
  const doc = new DOMParser().parseFromString(String(html), 'text/html');
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
}

/* ===========================================================================
   Behaviour helpers
   ========================================================================= */

/** Delay execution until `delay` ms have passed without another call. */
export function debounce(callback, delay = 300) {
  let timer;

  return function debounced(...args) {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => callback.apply(this, args), delay);
  };
}

/** True when the visitor asked for reduced motion. */
export function prefersReducedMotion() {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** Promise-based sleep — handy for pacing the roulette animation. */
export function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/**
 * Trap Tab focus inside a container so keyboard users cannot tab out of an
 * open dialog. Returns a function that removes the listeners again.
 */
export function trapFocus(container) {
  const focusableSelector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');

  function handleKeydown(event) {
    if (event.key !== 'Tab') {
      return;
    }

    const focusable = qsa(focusableSelector, container).filter(
      (element) =>
        element.offsetParent !== null || element === document.activeElement,
    );

    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  container.addEventListener('keydown', handleKeydown);

  return () => container.removeEventListener('keydown', handleKeydown);
}

/* ===========================================================================
   Loading / error / empty state renderers
   ========================================================================= */

/** Wire up a `.state` block so `show()` and `hide()` drive it. */
export function createState(element) {
  const iconSlot = query('.state__icon', element);
  const titleSlot = query('.state__title', element);
  const messageSlot = query('.state__message', element);
  const actionSlot = query('.state__action', element);
  const spinnerSlot = query('.state__spinner', element);

  function hide() {
    element.classList.remove('is-visible');
    element.setAttribute('aria-hidden', 'true');
  }

  function show({
    icon: iconName,
    title = '',
    message = '',
    action = null,
    loading = false,
  }) {
    if (spinnerSlot) {
      spinnerSlot.hidden = !loading;
    }

    if (iconSlot) {
      iconSlot.hidden = loading;

      if (iconName) {
        iconSlot.innerHTML = `<span class="icon">${ICONS[iconName] || ICONS.info}</span>`;
      }
    }

    if (titleSlot) {
      titleSlot.textContent = title;
      titleSlot.hidden = !title;
    }

    if (messageSlot) {
      messageSlot.textContent = message;
      messageSlot.hidden = !message;
    }

    if (actionSlot) {
      actionSlot.replaceChildren();

      if (action && typeof action.onClick === 'function') {
        const button = createEl('button', {
          className: 'btn btn--primary btn--sm',
          text: action.label,
          attrs: { type: 'button' },
        });
        button.addEventListener('click', action.onClick);
        actionSlot.append(button);
        actionSlot.hidden = false;
      } else {
        actionSlot.hidden = true;
      }
    }

    element.classList.add('is-visible');
    element.setAttribute('aria-hidden', 'false');
  }

  return { element, show, hide };
}

/** Build the placeholder cards shown while data is loading. */
export function buildSkeletonCards(count = 12, variant = 'game') {
  const wrapper = document.createElement('div');
  wrapper.className = 'card-grid';
  wrapper.setAttribute('aria-hidden', 'true');

  for (let index = 0; index < count; index += 1) {
    const card = createEl('div', {
      className: variant === 'deal' ? 'skeleton-card' : 'skeleton-card',
    });

    const mediaClass =
      variant === 'deal'
        ? 'skeleton skeleton-deal-card__media'
        : 'skeleton skeleton-card__media';
    const bodyClass =
      variant === 'deal' ? 'skeleton-deal-card__body' : 'skeleton-card__body';

    card.append(
      createEl('div', { className: mediaClass }),
      createEl('div', { className: bodyClass }, [
        createEl('div', {
          className: 'skeleton skeleton-card__line skeleton-card__line--title',
        }),
        createEl('div', {
          className: 'skeleton skeleton-card__line skeleton-card__line--meta',
        }),
        createEl('div', {
          className: 'skeleton skeleton-card__line',
          html: '&nbsp;',
        }),
      ]),
    );

    wrapper.append(card);
  }

  return wrapper;
}

/* ===========================================================================
   Toasts
   ========================================================================= */

/**
 * Show a short-lived toast. Falls back to a console warning when the page has
 * no `.toast-region` container so nothing is ever swallowed silently.
 */
export function showToast(message, { type = 'info', duration = 3200 } = {}) {
  const region = document.querySelector('.toast-region');

  if (!region) {
    return;
  }

  const toast = createEl('div', {
    className: `toast toast--${type}`,
    attrs: { role: 'status', 'aria-live': 'polite' },
  });

  const iconEl = createEl('span', {
    className: 'icon',
    html: ICONS[
      type === 'error' ? 'alert' : type === 'success' ? 'check' : 'info'
    ],
    attrs: { 'aria-hidden': 'true' },
  });

  toast.append(iconEl, createEl('span', { text: message }));

  const closeButton = createEl('button', {
    className: 'toast__close',
    text: '×',
    attrs: { type: 'button', 'aria-label': 'Dismiss notification' },
  });

  const dismiss = () => {
    window.clearTimeout(timer);
    toast.classList.remove('is-visible');
    window.setTimeout(() => toast.remove(), 220);
  };

  closeButton.addEventListener('click', dismiss);
  toast.append(closeButton);
  region.append(toast);

  requestAnimationFrame(() => toast.classList.add('is-visible'));
  const timer = window.setTimeout(dismiss, duration);
}

/* ===========================================================================
   Inline SVG icon library
   ========================================================================= */

export const ICONS = {
  search:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  close:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/></svg>',
  stack:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16v13H4z"/><path d="M8 4h8l3 3"/><path d="M9 13h6"/></svg>',
  tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12V4h8l9 9-8 8-9-9Z"/><circle cx="7.5" cy="8" r="1.4"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 3 2.6 5.6 6 .8-4.4 4.2 1.1 6.1-5.3-3-5.3 3 1.1-6.1L3.4 9.4l6-.8L12 3Z"/></svg>',
  heart:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20s-7-4.4-7-9.2A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.8C19 15.6 12 20 12 20Z"/></svg>',
  check:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m4.5 12.5 5 5 10-11"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  trash:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13"/></svg>',
  dice: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="3.5" width="17" height="17" rx="4"/><circle cx="8.5" cy="8.5" r="1.1" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.1" fill="currentColor"/><circle cx="12" cy="12" r="1.1" fill="currentColor"/></svg>',
  alert:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 4 2.5 20h19L12 4Z"/><path d="M12 10v4M12 17h.01"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"/></svg>',
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  filter:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M7 12h10M10 18h4"/></svg>',
  chevronDown:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg>',
  chevronLeft:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m14 6-6 6 6 6"/></svg>',
  chevronRight:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m10 6 6 6-6 6"/></svg>',
  external:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6"/><path d="M20 4 11 13"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4.5v15l12-7.5-12-7.5Z"/></svg>',
  trophy:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M7 6H4v1.5A3.5 3.5 0 0 0 7.5 11"/><path d="M17 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5"/><path d="M12 14v3M9 20h6"/></svg>',
  image:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="15" rx="2.5"/><circle cx="8.5" cy="10" r="1.6"/><path d="m4 17 5-5 4.5 4.5L17 13l3 3.5"/></svg>',
  clock:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/></svg>',
  refresh:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8 8 0 1 0-.6 4"/><path d="M20 4v7h-7"/></svg>',
  shield:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 5 6v6c0 4.2 2.9 7.7 7 9 4.1-1.3 7-4.8 7-9V6l-7-3Z"/></svg>',
  library:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5v14"/><path d="M8 5v14"/><path d="m12 6 4 13"/><path d="m18 6-4 13"/></svg>',
};

/** Inline SVG string for an icon name; falls back to the info icon. */
export function icon(name, className = 'icon') {
  const markup = ICONS[name] || ICONS.info;
  const wrapper = document.createElement('span');

  wrapper.className = className;
  wrapper.innerHTML = markup;
  wrapper.setAttribute('aria-hidden', 'true');

  return wrapper;
}
