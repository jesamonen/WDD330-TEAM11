/**
 * DealFinder.mjs
 * ---------------------------------------------------------------------------
 * Powers the deals page. It loads the CheapShark store list for the filter,
 * then requests discounted games and renders them as deal cards showing the
 * sale price, the original price and the percentage saved.
 *
 * CheapShark returns a flat array, so "pagination" here simply advances the
 * `page` query parameter, which behaves like an offset.
 */

import { DEAL_SORT_OPTIONS, PAGE_SIZE } from './ExternalServices.mjs';
import {
  buildSkeletonCards,
  createState,
  debounce,
  escapeHtml,
  formatPercent,
  formatPrice,
  showToast,
} from './utils.mjs';

export default class DealFinder {
  /**
   * @param {object} options
   * @param {HTMLElement} options.gridElement   container for the deal cards
   * @param {HTMLElement} options.stateElement  `.state` block for messages
   * @param {HTMLElement} options.storeFilterElement container for store chips
   * @param {import('./ExternalServices.mjs').default} options.dataSource
   */
  constructor({
    gridElement,
    stateElement = null,
    storeFilterElement = null,
    paginationElement = null,
    sortSelect = null,
    searchInput = null,
    resultsLabel = null,
    dataSource,
  }) {
    this.gridElement = gridElement;
    this.dataSource = dataSource;
    this.storeFilterElement = storeFilterElement;
    this.paginationElement = paginationElement;
    this.sortSelect = sortSelect;
    this.searchInput = searchInput;
    this.resultsLabel = resultsLabel;

    this.state = stateElement
      ? createState(stateElement)
      : { show: () => {}, hide: () => {} };

    this.storeId = '';
    this.sortId = 'rating';
    this.searchTerm = '';
    this.page = 1;
    this.totalPages = 1;
    this.isLoading = false;
    this.stores = [];
    this.storeNames = new Map();

    this.bindEvents();
  }

  /* =====================================================================
     Bootstrap
     ====================================================================== */

  /** Load the store filter, then the first page of deals. */
  async init() {
    await this.loadStores();
    await this.load();
  }

  bindEvents() {
    this.sortSelect?.addEventListener('change', () => {
      this.sortId = this.sortSelect.value;
      this.page = 1;
      this.load();
    });

    if (this.searchInput) {
      const handler = debounce(() => {
        this.searchTerm = this.searchInput.value.trim();
        this.page = 1;
        this.load();
      }, 420);

      this.searchInput.addEventListener('input', handler);

      this.searchInput.form?.addEventListener('submit', (event) => {
        event.preventDefault();
        this.searchTerm = this.searchInput.value.trim();
        this.page = 1;
        this.load();
      });
    }

    this.storeFilterElement?.addEventListener('click', (event) => {
      const chip =
        event.target instanceof Element
          ? event.target.closest('[data-store-id]')
          : null;

      if (!chip) {
        return;
      }

      this.storeId = chip.dataset.storeId;
      this.page = 1;
      this.updateActiveChip();
      this.load();
    });

    this.paginationElement?.addEventListener('click', (event) => {
      const target =
        event.target instanceof Element
          ? event.target.closest('[data-deal-page]')
          : null;

      if (!target) {
        return;
      }

      const next = Number(target.dataset.dealPage);

      if (Number.isFinite(next) && next !== this.page) {
        this.page = next;
        this.load();
        this.gridElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  /* =====================================================================
     Stores
     ====================================================================== */

  async loadStores() {
    try {
      this.stores = await this.dataSource.getStores();
      this.stores.forEach((store) => this.storeNames.set(store.id, store.name));
      this.renderStoreFilter();
    } catch {
      // The store filter is a nicety; the deals grid still works without it.
      this.stores = [];
    }
  }

  renderStoreFilter() {
    if (!this.storeFilterElement) {
      return;
    }

    const options = [{ id: '', name: 'All stores' }, ...this.stores];

    this.storeFilterElement.innerHTML = options
      .map(
        (store) => `
          <button class="chip" type="button" data-store-id="${escapeHtml(store.id)}"
                  aria-pressed="${store.id === this.storeId}">
            ${escapeHtml(store.name)}
          </button>`,
      )
      .join('');
  }

  updateActiveChip() {
    if (!this.storeFilterElement) {
      return;
    }

    this.storeFilterElement
      .querySelectorAll('[data-store-id]')
      .forEach((chip) => {
        chip.setAttribute(
          'aria-pressed',
          String(chip.dataset.storeId === this.storeId),
        );
      });
  }

  /* =====================================================================
     Rendering
     ====================================================================== */

  showSkeleton() {
    this.state.hide();
    this.gridElement.replaceChildren(buildSkeletonCards(12, 'deal'));
  }

  showError(message) {
    this.gridElement.replaceChildren();
    this.state.show({
      icon: 'alert',
      title: 'Deals are unavailable right now',
      message,
      action: { label: 'Try again', onClick: () => this.load() },
    });
    this.renderPagination();
  }

  /** HTML for a single deal card. */
  dealTemplate(deal) {
    const storeName =
      deal.store || this.storeNames.get(deal.storeId) || 'Web store';
    const steamPercent =
      deal.steamRatingPercent !== null && deal.steamRatingPercent > 0
        ? `${formatPercent(deal.steamRatingPercent)} ${deal.steamRatingText}`.trim()
        : deal.steamRatingText || '';

    const dealUrl = `https://www.cheapshark.com/redirect?dealID=${encodeURIComponent(deal.id)}`;

    return `
      <article class="deal-card">
        <a class="deal-card__media" href="${dealUrl}" target="_blank" rel="noopener noreferrer"
           aria-label="Open the ${escapeHtml(storeName)} deal for ${escapeHtml(deal.title)}">
          ${
            deal.thumb
              ? `<img class="deal-card__art" src="${escapeHtml(deal.thumb)}" alt="" loading="lazy" decoding="async" width="464" height="261">`
              : '<span class="game-card__art-placeholder">No preview</span>'
          }
          <span class="deal-card__savings">-${Math.round(deal.savings)}%</span>
          <span class="deal-card__store">${escapeHtml(storeName)}</span>
        </a>
        <div class="deal-card__body">
          <h3 class="deal-card__title">${escapeHtml(deal.title)}</h3>
          <div class="deal-card__scores">
            ${
              deal.metacriticScore
                ? `<span class="deal-card__score"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M7 6H4v1.5A3.5 3.5 0 0 0 7.5 11"/><path d="M17 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5"/><path d="M12 14v3M9 20h6"/></svg>${deal.metacriticScore}</span>`
                : ''
            }
            ${
              steamPercent
                ? `<span class="deal-card__score deal-card__score--steam"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8 15 2.2-3 2 2.6L14.5 11 16 15"/></svg>${escapeHtml(steamPercent)}</span>`
                : ''
            }
          </div>
          <div class="deal-card__price">
            <span class="deal-card__price-now">${formatPrice(deal.salePrice)}</span>
            <span class="deal-card__price-was">${formatPrice(deal.normalPrice)}</span>
          </div>
        </div>
        <div class="deal-card__actions">
          <a class="btn btn--success btn--block btn--sm" href="${dealUrl}" target="_blank" rel="noopener noreferrer">
            View deal
          </a>
        </div>
      </article>`;
  }

  renderDeals(deals) {
    if (deals.length === 0) {
      this.gridElement.replaceChildren();
      this.state.show({
        icon: 'tag',
        title: 'No deals found',
        message: this.searchTerm
          ? `We could not find a discount for “${this.searchTerm}”. Try another title.`
          : 'There are no active discounts for this store right now. Try another store.',
        action: { label: 'Reset filters', onClick: () => this.reset() },
      });
      this.renderPagination();
      this.updateResultsLabel(0);
      return;
    }

    this.state.hide();

    const grid = document.createElement('div');
    grid.className = 'card-grid';
    grid.innerHTML = deals.map((deal) => this.dealTemplate(deal)).join('');

    this.gridElement.replaceChildren(grid);
    this.updateResultsLabel(deals.length);
    this.renderPagination();
  }

  updateResultsLabel(count) {
    if (!this.resultsLabel) {
      return;
    }

    const storeName =
      this.storeId === ''
        ? 'all stores'
        : this.storeNames.get(this.storeId) || 'this store';

    this.resultsLabel.textContent = this.searchTerm
      ? `${count} discount${count === 1 ? '' : 's'} for “${this.searchTerm}”`
      : `${count} deal${count === 1 ? '' : 's'} from ${storeName}`;
  }

  renderPagination() {
    if (!this.paginationElement) {
      return;
    }

    if (this.totalPages <= 1) {
      this.paginationElement.replaceChildren();
      this.paginationElement.classList.remove('is-visible');
      return;
    }

    const pages = [];
    const half = 2;
    let start = Math.max(1, this.page - half);
    const end = Math.min(this.totalPages, start + 4);
    start = Math.max(1, end - 4);

    for (let page = start; page <= end; page += 1) {
      pages.push(page);
    }

    this.paginationElement.classList.add('is-visible');
    this.paginationElement.innerHTML = `
      <button class="btn btn--ghost btn--sm" type="button" data-deal-page="${Math.max(1, this.page - 1)}"
              ${this.page <= 1 ? 'disabled' : ''}>Previous</button>
      <div class="pagination__dots">
        ${pages
          .map(
            (page) =>
              `<button class="pagination__dot" type="button" data-deal-page="${page}"
                 aria-current="${page === this.page ? 'true' : 'false'}"
                 aria-label="Go to deals page ${page}">${page}</button>`,
          )
          .join('')}
      </div>
      <button class="btn btn--ghost btn--sm" type="button" data-deal-page="${Math.min(this.totalPages, this.page + 1)}"
              ${this.page >= this.totalPages ? 'disabled' : ''}>Next</button>`;
  }

  /* =====================================================================
     Data loading
     ====================================================================== */

  reset() {
    this.storeId = '';
    this.searchTerm = '';
    this.page = 1;
    this.sortId = 'rating';

    if (this.searchInput) {
      this.searchInput.value = '';
    }

    if (this.sortSelect) {
      this.sortSelect.value = 'rating';
    }

    this.updateActiveChip();
    this.load();
  }

  async load() {
    if (this.isLoading) {
      return;
    }

    this.isLoading = true;
    this.showSkeleton();

    try {
      const sort = DEAL_SORT_OPTIONS.find(
        (option) => option.id === this.sortId,
      );
      const sortBy = sort ? sort.sortBy : 'Deal Rating';

      if (this.searchTerm) {
        // Title search returns its own (much shorter) list.
        const deals = await this.dataSource.getDealsByTitle(this.searchTerm);
        this.totalPages = 1;
        this.renderDeals(deals.slice(0, PAGE_SIZE * 2));
      } else {
        const result = await this.dataSource.getDeals({
          storeId: this.storeId,
          sortBy,
          page: this.page,
          pageSize: PAGE_SIZE,
        });

        // CheapShark caps the catalogue at 10,000 deals (~500 pages).
        this.totalPages = Math.min(500, Math.ceil(10000 / PAGE_SIZE));
        this.renderDeals(result.deals);
      }
    } catch (error) {
      this.showError(error.message || 'We could not reach the deals service.');
      showToast('Could not load deals.', { type: 'error' });
    } finally {
      this.isLoading = false;
    }
  }
}
