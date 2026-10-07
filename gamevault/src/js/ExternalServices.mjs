/**
 * ExternalServices.mjs
 * ---------------------------------------------------------------------------
 * The only module in GameVault that talks to the network. Everything else
 * receives plain arrays of objects from this file, which keeps the API shapes
 * in one place and makes the rest of the app easy to test.
 *
 * Sources
 *   RAWG      https://api.rawg.io/api   — game discovery, details, screenshots
 *   CheapShark https://www.cheapshark.com/api/1.0 — store discounts
 *
 * Every method is `async` and rejects with an `ApiError`, so callers only ever
 * need a single try/catch.
 */

import { stripHtml } from './utils.mjs';

/* ===========================================================================
   Configuration
   ========================================================================= */

const RAWG_BASE = 'https://api.rawg.io/api';
const CHEAPSHARK_BASE = 'https://www.cheapshark.com/api/1.0';

/** Request timeout in milliseconds. */
const REQUEST_TIMEOUT = 12000;

/** Minimum gap between outgoing requests (RAWG throttles bursts). */
const MIN_REQUEST_SPACING = 220;

/** In-memory cache lifetime in milliseconds. */
const CACHE_TTL = 5 * 60 * 1000;

/** Page size used by every paginated grid. RAWG max is 40. */
export const PAGE_SIZE = 20;

/**
 * Curated genre filters. Values are real RAWG genre ids pulled from
 * `GET /genres` so the `genres=` query parameter stays valid.
 */
export const GENRE_OPTIONS = [
  { id: 5, name: 'RPG' },
  { id: 4, name: 'Action' },
  { id: 3, name: 'Adventure' },
  { id: 10, name: 'Strategy' },
  { id: 2, name: 'Shooter' },
  { id: 83, name: 'Platformer' },
  { id: 51, name: 'Indie' },
  { id: 1, name: 'Racing' },
  { id: 15, name: 'Sports' },
  { id: 6, name: 'Fighting' },
  { id: 14, name: 'Simulation' },
  { id: 7, name: 'Puzzle' },
  { id: 40, name: 'Casual' },
  { id: 11, name: 'Arcade' },
];

/**
 * Curated platform filters, matching the wireframes (PC / PlayStation / Xbox
 * / Switch). `ids` holds every RAWG platform id that belongs to that family so
 * a player selecting "PlayStation" still sees PS4 and PS5 titles.
 */
export const PLATFORM_OPTIONS = [
  { id: 'all', name: 'All Platforms', ids: [] },
  { id: 'pc', name: 'PC', ids: [4, 5, 6, 55] },
  { id: 'playstation', name: 'PlayStation', ids: [187, 18, 16, 27] },
  { id: 'xbox', name: 'Xbox', ids: [186, 1, 14, 80] },
  { id: 'switch', name: 'Nintendo Switch', ids: [7] },
  { id: 'mobile', name: 'Mobile', ids: [3, 21] },
];

/** Sort options for the game grid, mapped to RAWG `ordering` values. */
export const SORT_OPTIONS = [
  { id: 'rating', name: 'Highest Rated', ordering: '-rating' },
  { id: 'released-desc', name: 'Newest First', ordering: '-released' },
  { id: 'released-asc', name: 'Oldest First', ordering: 'released' },
  { id: 'name-asc', name: 'Title A – Z', ordering: 'name' },
  { id: 'name-desc', name: 'Title Z – A', ordering: '-name' },
];

/** Sort options for the deals grid, mapped to CheapShark `sortBy` values. */
export const DEAL_SORT_OPTIONS = [
  { id: 'rating', name: 'Best Deal Rating', sortBy: 'Deal Rating' },
  { id: 'savings', name: 'Biggest Savings', sortBy: 'Savings' },
  { id: 'price-asc', name: 'Lowest Sale Price', sortBy: 'Price' },
  { id: 'recent', name: 'Recently Updated', sortBy: 'Recent' },
];

/* ===========================================================================
   Errors
   ========================================================================= */

/** Normalised error thrown for every failed request. */
export class ApiError extends Error {
  constructor(message, { status = 0, code = 'request_failed', cause } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    if (cause) {
      this.cause = cause;
    }
  }
}

function humaniseError(error) {
  switch (error.status) {
    case 401:
    case 403:
      return {
        code: 'invalid_key',
        message:
          'The RAWG API key was rejected. Copy .env.sample to .env and add your own free key.',
      };
    case 404:
      return { code: 'not_found', message: 'That game could not be found.' };
    case 429:
      return {
        code: 'rate_limited',
        message:
          'Too many requests to the game database. Wait a moment and try again.',
      };
    default:
      break;
  }

  if (error.code === 'network') {
    return {
      code: 'network',
      message: 'You appear to be offline. Check your connection and try again.',
    };
  }

  if (error.code === 'timeout') {
    return {
      code: 'timeout',
      message: 'The game database took too long to respond. Please try again.',
    };
  }

  return {
    code: 'server_error',
    message: 'The game database is having trouble right now. Please try again.',
  };
}

/* ===========================================================================
   Shared fetch helpers
   ========================================================================= */

/** Serialises outgoing requests so the API is never hit in bursts. */
function createThrottle(spacing) {
  let chain = Promise.resolve();
  let last = 0;

  return function schedule(task) {
    const run = chain.then(async () => {
      const wait = Math.max(0, last + spacing - Date.now());

      if (wait > 0) {
        await new Promise((resolve) => {
          setTimeout(resolve, wait);
        });
      }

      last = Date.now();
      return task();
    });

    // Keep the chain alive even when a request rejects.
    chain = run.catch(() => {});
    return run;
  };
}

const throttle = createThrottle(MIN_REQUEST_SPACING);

/** Simple TTL cache so repeated navigation does not re-hit the network. */
const responseCache = new Map();

function readCache(key) {
  const entry = responseCache.get(key);

  if (!entry) {
    return undefined;
  }

  if (Date.now() - entry.savedAt > CACHE_TTL) {
    responseCache.delete(key);
    return undefined;
  }

  return entry.value;
}

function writeCache(key, value) {
  responseCache.set(key, { savedAt: Date.now(), value });
  return value;
}

/** Empty every cached API response (used by the "retry" buttons). */
export function clearApiCache() {
  responseCache.clear();
}

/* ===========================================================================
   Data shaping
   ========================================================================= */

/**
 * Convert a raw RAWG game into the compact, predictable shape the rest of the
 * application renders. Keeping this in one place means the card, the modal and
 * the backlog all agree on field names.
 */
export function normaliseGame(raw = {}) {
  const genres = Array.isArray(raw.genres)
    ? raw.genres.map((genre) => genre.name).filter(Boolean)
    : [];

  const parentGenres = Array.isArray(raw.parent_genres)
    ? raw.parent_genres.map((genre) => genre.name).filter(Boolean)
    : [];

  const platforms = Array.isArray(raw.platforms)
    ? raw.platforms
        .filter((entry) => entry && entry.platform)
        .map((entry) => entry.platform.name)
        .filter(Boolean)
    : [];

  const screenshots = Array.isArray(raw.short_screenshots)
    ? raw.short_screenshots.map((shot) => shot.image).filter(Boolean)
    : [];

  const allGenres = genres.length > 0 ? genres : parentGenres;

  return {
    id: Number(raw.id),
    slug: raw.slug || '',
    title: raw.name || 'Untitled',
    released: raw.released || null,
    year: raw.released ? String(raw.released).slice(0, 4) : null,
    backgroundImage: raw.background_image || null,
    rating: Number(raw.rating) || 0,
    metacritic: Number(raw.metacritic) || null,
    playtime: Number(raw.playtime) || 0,
    esrb: raw.esrb_rating && raw.esrb_rating.code ? raw.esrb_rating.code : null,
    genres: allGenres,
    platforms,
    screenshots,
    developers: Array.isArray(raw.developers)
      ? raw.developers.map((entry) => entry.name).filter(Boolean)
      : [],
    publishers: Array.isArray(raw.publishers)
      ? raw.publishers.map((entry) => entry.name).filter(Boolean)
      : [],
    description: raw.description ? stripHtml(raw.description) : '',
    website: raw.website || '',
    raw,
  };
}

/** Convert a raw CheapShark deal into the shape DealFinder renders. */
export function normaliseDeal(raw = {}) {
  return {
    id: raw.dealID || `${raw.gameID}-${raw.storeID}`,
    title: raw.title || 'Unknown game',
    internalName: raw.internalName || '',
    gameId: raw.gameID || '',
    storeId: raw.storeID || '',
    store: raw.storeName || '',
    salePrice: Number(raw.salePrice) || 0,
    normalPrice: Number(raw.normalPrice) || 0,
    savings: Number.parseFloat(raw.savings) || 0,
    savingsPercent: Math.round(Number.parseFloat(raw.savings) || 0),
    metacriticScore: raw.metacriticScore ? Number(raw.metacriticScore) : null,
    steamRatingText: raw.steamRatingText || '',
    steamRatingPercent: raw.steamRatingPercent
      ? Number(raw.steamRatingPercent)
      : null,
    steamRatingCount: raw.steamRatingCount
      ? Number(raw.steamRatingCount)
      : null,
    thumb: raw.thumb || '',
    releaseDate: raw.releaseDate ? Number(raw.releaseDate) : null,
    dealRating: Number(raw.dealRating) || 0,
    isOnSale: raw.isOnSale === '1' || raw.isOnSale === 1,
    url: raw.metacriticLink
      ? `https://www.cheapshark.com${raw.metacriticLink}`
      : '',
  };
}

/* ===========================================================================
   ExternalServices
   ========================================================================= */

export default class ExternalServices {
  constructor(apiKey = import.meta.env.VITE_RAWG_API_KEY) {
    this.apiKey = apiKey || '';
  }

  /** True when a RAWG key is available. */
  get hasApiKey() {
    return Boolean(this.apiKey);
  }

  /** Guard used before any request that needs the key. */
  requireApiKey() {
    if (!this.hasApiKey) {
      throw new ApiError(
        'No RAWG API key configured. Copy .env.sample to .env and add your free key.',
        { code: 'missing_key' },
      );
    }
  }

  /**
   * Core fetch wrapper: adds the RAWG key, enforces a timeout, parses JSON,
   * and converts every failure into a human-readable `ApiError`.
   */
  async request(url, { base = RAWG_BASE, cache = true, ...options } = {}) {
    if (cache) {
      const cached = readCache(url);

      if (cached !== undefined) {
        return cached;
      }
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    const endpoint =
      base === RAWG_BASE && !url.includes('key=')
        ? `${RAWG_BASE}${url}${url.includes('?') ? '&' : '?'}key=${encodeURIComponent(this.apiKey)}`
        : `${base}${url}`;

    try {
      const response = await throttle(() =>
        fetch(endpoint, { ...options, signal: controller.signal }),
      );

      if (!response.ok) {
        const error = new ApiError(
          `Request failed with status ${response.status}`,
          {
            status: response.status,
            code: 'http_error',
          },
        );
        const friendly = humaniseError(error);
        throw new ApiError(friendly.message, {
          status: response.status,
          code: friendly.code,
          cause: error,
        });
      }

      const data = await response.json();
      return cache ? writeCache(url, data) : data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      const isAbort = error && error.name === 'AbortError';
      const friendly = humaniseError({
        code: isAbort ? 'timeout' : 'network',
        status: 0,
      });

      throw new ApiError(friendly.message, {
        code: friendly.code,
        cause: error,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  /* -------------------------------------------------------------------------
     RAWG — games
     ---------------------------------------------------------------------- */

  /** Build a query string from defined values only. */
  static buildQuery(params = {}) {
    return Object.entries(params)
      .filter(
        ([, value]) => value !== undefined && value !== null && value !== '',
      )
      .map(
        ([key, value]) =>
          `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
      )
      .join('&');
  }

  /**
   * Search and filter games.
   *
   * @param {object}  options
   * @param {string}  options.search     free-text title search
   * @param {number[]} options.genres    RAWG genre ids
   * @param {number[]} options.platforms RAWG platform ids
   * @param {string}  options.ordering   RAWG ordering string
   * @param {number}  options.minRating  minimum RAWG rating (0-5)
   * @param {number}  options.page       1-based page number
   * @param {number}  options.pageSize   results per page (max 40)
   */
  async getGames({
    search = '',
    genres = [],
    platforms = [],
    ordering = '-rating',
    minRating = 0,
    page = 1,
    pageSize = PAGE_SIZE,
  } = {}) {
    this.requireApiKey();

    const query = ExternalServices.buildQuery({
      search: search.trim(),
      genres: genres.length > 0 ? genres.join(',') : undefined,
      platforms: platforms.length > 0 ? platforms.join(',') : undefined,
      ordering,
      page: Math.max(1, page),
      page_size: Math.min(40, Math.max(1, pageSize)),
    });

    const payload = await this.request(`/games?${query}`);
    const results = (payload.results || []).map(normaliseGame);

    return {
      games:
        minRating > 0
          ? results.filter((game) => game.rating >= minRating)
          : results,
      total: minRating > 0 ? results.length : Number(payload.count) || 0,
      page: Math.max(1, page),
      pageSize,
      totalPages: Math.ceil(
        (Number(payload.count) || 0) / Math.max(1, pageSize),
      ),
    };
  }

  /** High-rated, recently released games used for the landing page. */
  getPopularGames(options = {}) {
    return this.getGames({
      ordering: '-rating',
      pageSize: PAGE_SIZE,
      ...options,
    });
  }

  /** Full detail payload for one game. */
  async getGameById(id) {
    this.requireApiKey();

    if (!Number.isFinite(Number(id))) {
      throw new ApiError('Invalid game id.', { code: 'bad_request' });
    }

    const payload = await this.request(`/games/${id}`);
    return normaliseGame(payload);
  }

  /**
   * Screenshots need their own request — `/games/{id}` does not include them.
   * Failures are swallowed so the modal still opens without a gallery.
   */
  async getScreenshots(id) {
    try {
      const payload = await this.request(`/games/${id}/screenshots`);
      return (payload || []).map((shot) => shot.image).filter(Boolean);
    } catch {
      return [];
    }
  }

  /** Full genre list from RAWG (used to label sidebar checkboxes). */
  async getGenres() {
    const payload = await this.request('/genres');
    return (payload.results || []).map((genre) => ({
      id: genre.id,
      name: genre.name,
    }));
  }

  /** Full platform list from RAWG (used by the mobile quick filters). */
  async getPlatforms() {
    const payload = await this.request('/platforms');
    return (payload.results || []).map((platform) => ({
      id: platform.id,
      name: platform.name,
    }));
  }

  /* -------------------------------------------------------------------------
     CheapShark — deals
     ---------------------------------------------------------------------- */

  /**
   * Discounted games.
   *
   * @param {object} options
   * @param {string} options.storeId  CheapShark store id, '' for all stores
   * @param {string} options.sortBy   CheapShark sortBy value
   * @param {number} options.page     1-based page number
   * @param {number} options.pageSize results per page
   */
  async getDeals({
    storeId = '',
    sortBy = 'Deal Rating',
    page = 1,
    pageSize = PAGE_SIZE,
  } = {}) {
    const query = ExternalServices.buildQuery({
      storeID: storeId,
      sortBy,
      page: Math.max(1, page),
      pageSize: Math.min(100, Math.max(1, pageSize)),
    });

    const payload = await this.request(`/deals?${query}`, {
      base: CHEAPSHARK_BASE,
    });

    const deals = (payload || []).map(normaliseDeal);

    return {
      deals,
      page: Math.max(1, page),
      pageSize,
    };
  }

  /** Active stores, used to build the store filter. */
  async getStores() {
    const payload = await this.request('/stores', { base: CHEAPSHARK_BASE });
    return (payload || [])
      .filter((store) => store.isActive)
      .map((store) => ({
        id: store.storeID,
        name: store.storeName,
      }));
  }

  /** Look up live discounts for a specific game title. */
  async getDealsByTitle(title) {
    if (!title || !title.trim()) {
      return [];
    }

    const query = ExternalServices.buildQuery({
      title: title.trim(),
      sortBy: 'Savings',
    });

    const payload = await this.request(`/deals?${query}`, {
      base: CHEAPSHARK_BASE,
    });
    return (payload || []).map(normaliseDeal);
  }
}
