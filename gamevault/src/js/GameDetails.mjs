/**
 * GameDetails.mjs
 * ---------------------------------------------------------------------------
 * Renders the game detail dialog. It builds its own markup, requests the full
 * RAWG record, then lazily requests screenshots, and it is also the place where
 * "Add to backlog" and the status selector inside the modal are wired up.
 *
 * Accessibility: role="dialog" + aria-modal, Escape to close, backdrop click to
 * close, focus moved into the dialog on open, focus trapped while open, and
 * focus restored to the trigger on close.
 */

import {
  DEFAULT_STATUS,
  STATUSES,
  STATUS_META,
  createEl,
  escapeHtml,
  formatDate,
  formatPlaytime,
  formatRating,
  icon,
  showToast,
  trapFocus,
} from './utils.mjs';

export default class GameDetails {
  /**
   * @param {object} options
   * @param {HTMLElement} options.modalElement the `.modal` container
   * @param {import('./ExternalServices.mjs').default} options.dataSource
   * @param {import('./BacklogManager.mjs').default} options.backlog
   * @param {Function} options.onBacklogChange called after any backlog mutation
   */
  constructor({
    modalElement,
    dataSource,
    backlog,
    onBacklogChange = () => {},
  }) {
    this.modal = modalElement;
    this.dataSource = dataSource;
    this.backlog = backlog;
    this.onBacklogChange = onBacklogChange;

    this.isOpen = false;
    this.game = null;
    this.releaseFocusTrap = null;
    this.lastFocused = null;
    this.isLoading = false;

    this.buildShell();
    this.bindEvents();
  }

  /* =====================================================================
     Shell
     ====================================================================== */

  /** Create the modal markup once and cache references to its slots. */
  buildShell() {
    this.closeButton = createEl('button', {
      className: 'modal__close',
      attrs: { type: 'button', 'aria-label': 'Close game details' },
    });
    this.closeButton.append(icon('close'));

    this.backdrop = createEl('button', {
      className: 'modal__backdrop',
      attrs: {
        type: 'button',
        'aria-label': 'Close game details',
        tabindex: '-1',
      },
    });

    this.body = createEl('div', { className: 'modal__body' });
    this.footer = createEl('div', { className: 'modal__footer' });

    this.dialog = createEl('div', {
      className: 'modal__dialog',
      attrs: {
        role: 'dialog',
        'aria-modal': 'true',
        'aria-labelledby': 'game-detail-title',
      },
    });

    this.dialog.append(this.closeButton, this.body, this.footer);

    if (this.modal) {
      this.modal.replaceChildren(this.backdrop, this.dialog);
      this.modal.hidden = false;
      this.modal.classList.remove('is-open');
    }
  }

  bindEvents() {
    this.closeButton.addEventListener('click', () => this.close());
    this.backdrop.addEventListener('click', () => this.close());

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.isOpen) {
        event.preventDefault();
        this.close();
      }
    });
  }

  /* =====================================================================
     Open / close
     ====================================================================== */

  /** Show loading state then swap in the game once it arrives. */
  async open(gameId) {
    if (!this.modal) {
      return;
    }

    this.gameId = Number(gameId);
    this.lastFocused = document.activeElement;
    this.isOpen = true;
    this.isLoading = true;

    this.modal.hidden = false;
    // Force a reflow so the opening transition runs.
    void this.modal.offsetWidth;
    this.modal.classList.add('is-open');
    document.body.classList.add('is-locked');

    this.releaseFocusTrap = trapFocus(this.dialog);
    this.renderLoading();
    this.closeButton.focus();

    try {
      const game = await this.dataSource.getGameById(this.gameId);
      this.game = game;
      this.isLoading = false;
      this.render(game);
      this.loadScreenshots(game.id);
    } catch (error) {
      this.isLoading = false;
      this.renderError(error.message);
    }
  }

  /** Close the dialog and restore focus. */
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

  /* =====================================================================
     Render — states
     ====================================================================== */

  renderLoading() {
    this.body.replaceChildren(
      createEl('div', { className: 'modal__loading' }, [
        createEl('div', { className: 'spinner' }),
        createEl('p', {
          className: 'text-muted',
          text: 'Loading game details…',
        }),
      ]),
    );
    this.footer.replaceChildren();
  }

  renderError(message) {
    this.body.replaceChildren(
      createEl('div', { className: 'modal__message' }, [
        icon('alert', 'icon state__icon'),
        createEl('h3', { text: 'Could not load this game' }),
        createEl('p', { text: message }),
        createEl('button', {
          className: 'btn btn--primary btn--sm',
          text: 'Try again',
          attrs: { type: 'button' },
        }),
      ]),
    );

    const retry = this.body.querySelector('button');
    retry?.addEventListener('click', () => this.open(this.gameId));

    this.footer.replaceChildren();
  }

  /* =====================================================================
     Render — content
     ====================================================================== */

  render(game) {
    this.body.replaceChildren();

    this.body.append(
      this.buildHero(game),
      createEl('div', { className: 'modal__content' }, [
        createEl('div', {}, [
          this.buildDescription(game),
          this.buildGallerySection(),
        ]),
        createEl('div', {}, [
          this.buildScores(game),
          this.buildMetaGrid(game),
          this.buildTags('Genres', game.genres, 'tag'),
          this.buildTags('Platforms', game.platforms, 'tag tag--platform'),
          this.buildSimpleList('Developers', game.developers),
          this.buildSimpleList('Publishers', game.publishers),
        ]),
      ]),
    );

    this.renderFooter(game);
  }

  /** Hero artwork, title and the two headline scores. */
  buildHero(game) {
    const hero = createEl('div', { className: 'modal__hero' });

    if (game.backgroundImage) {
      hero.append(
        createEl('img', {
          attrs: {
            src: game.backgroundImage,
            alt: '',
            loading: 'eager',
            decoding: 'async',
          },
        }),
      );
    }

    const copy = createEl('div', { className: 'modal__hero-copy' }, [
      createEl('h2', {
        className: 'modal__title',
        text: game.title,
        attrs: { id: 'game-detail-title' },
      }),
    ]);

    const meta = createEl('div', { className: 'modal__hero-meta' });

    if (game.rating > 0) {
      meta.append(
        createEl('span', { className: 'badge badge--star' }, [
          icon('star', 'icon rating__star'),
          `${formatRating(game.rating)} / 5`,
        ]),
      );
    }

    if (game.metacritic) {
      meta.append(
        createEl('span', {
          className: 'badge',
          text: `Metacritic ${game.metacritic}`,
        }),
      );
    }

    meta.append(
      createEl('span', { className: 'badge', text: formatDate(game.released) }),
    );

    if (game.esrb) {
      meta.append(
        createEl('span', { className: 'badge', text: `Rated ${game.esrb}` }),
      );
    }

    copy.append(meta);
    hero.append(copy);
    return hero;
  }

  buildDescription(game) {
    const section = createEl('section', { className: 'modal__section' });
    section.append(
      createEl('h3', {
        className: 'modal__section-title',
        text: 'About',
      }),
    );

    const text =
      game.description || 'No description was provided for this game.';

    const paragraph = createEl('p', {
      className: 'modal__description is-clamped',
      text,
    });

    section.append(paragraph);

    if (text.length > 320) {
      const toggle = createEl('button', {
        className: 'modal__more',
        text: 'Read more',
        attrs: { type: 'button', 'aria-expanded': 'false' },
      });

      toggle.addEventListener('click', () => {
        const clamped = paragraph.classList.toggle('is-clamped');
        toggle.textContent = clamped ? 'Read more' : 'Show less';
        toggle.setAttribute('aria-expanded', String(!clamped));
      });

      section.append(toggle);
    }

    return section;
  }

  /** Two progress bars: RAWG user score and Metacritic. */
  buildScores(game) {
    const section = createEl('section', { className: 'modal__section' });
    section.append(
      createEl('h3', { className: 'modal__section-title', text: 'Scores' }),
    );

    const scores = [
      {
        label: 'RAWG user rating',
        value: game.rating,
        max: 5,
        display:
          game.rating > 0 ? `${formatRating(game.rating)} / 5` : 'Not rated',
      },
      {
        label: 'Metacritic',
        value: game.metacritic || 0,
        max: 100,
        display: game.metacritic ? `${game.metacritic} / 100` : 'No score',
      },
    ];

    scores.forEach((score) => {
      const percent = Math.max(
        0,
        Math.min(100, (score.value / score.max) * 100),
      );
      const tier = percent >= 75 ? 'good' : percent >= 45 ? 'mid' : 'poor';

      const bar = createEl('div', { className: 'score-bar' }, [
        createEl('div', { className: 'score-bar__top' }, [
          createEl('span', { text: score.label }),
          createEl('strong', { text: score.display }),
        ]),
        createEl('div', {
          className: 'score-bar__track',
          attrs: {
            role: 'meter',
            'aria-valuenow': String(Math.round(percent)),
            'aria-valuemin': '0',
            'aria-valuemax': '100',
            'aria-label': score.label,
          },
        }),
      ]);

      const fill = createEl('div', {
        className: `score-bar__fill score-bar__fill--${tier}`,
      });

      fill.style.width = '0%';
      bar.querySelector('.score-bar__track').append(fill);

      // Animate the bar in after the dialog has painted.
      requestAnimationFrame(() => {
        fill.style.width = `${percent}%`;
      });

      section.append(bar);
    });

    return section;
  }

  buildMetaGrid(game) {
    const section = createEl('section', { className: 'modal__section' });
    section.append(
      createEl('h3', { className: 'modal__section-title', text: 'Details' }),
    );

    const cells = [
      { label: 'Released', value: formatDate(game.released) },
      { label: 'Avg. playtime', value: formatPlaytime(game.playtime) },
      { label: 'Rating', value: game.esrb ? `ESRB ${game.esrb}` : 'Not rated' },
      {
        label: 'Metacritic',
        value: game.metacritic ? String(game.metacritic) : '—',
      },
    ];

    const grid = createEl('div', { className: 'meta-grid' });

    cells.forEach((cell) => {
      grid.append(
        createEl('div', { className: 'meta-grid__cell' }, [
          createEl('span', { className: 'meta-grid__label', text: cell.label }),
          createEl('span', {
            className: `meta-grid__value${cell.value === '—' ? ' meta-grid__value--muted' : ''}`,
            text: cell.value,
          }),
        ]),
      );
    });

    section.append(grid);
    return section;
  }

  buildTags(title, values, tagClass) {
    const section = createEl('section', { className: 'modal__section' });
    section.append(
      createEl('h3', { className: 'modal__section-title', text: title }),
    );

    if (!values || values.length === 0) {
      section.append(
        createEl('p', { className: 'text-muted', text: 'Not listed.' }),
      );
      return section;
    }

    const list = createEl('div', { className: 'tag-list' });

    values.forEach((value) => {
      list.append(createEl('span', { className: tagClass, text: value }));
    });

    section.append(list);
    return section;
  }

  buildSimpleList(title, values) {
    if (!values || values.length === 0) {
      return createEl('span', { className: 'modal__section', hidden: true });
    }

    const section = createEl('section', { className: 'modal__section' });
    section.append(
      createEl('h3', { className: 'modal__section-title', text: title }),
      createEl('p', { className: 'text-muted', text: values.join(', ') }),
    );

    return section;
  }

  /** Gallery shell — filled in once the screenshot request resolves. */
  buildGallerySection() {
    const section = createEl('section', { className: 'modal__section' });
    this.gallerySection = section;

    section.append(
      createEl('h3', {
        className: 'modal__section-title',
        text: 'Screenshots',
      }),
      createEl('div', { className: 'modal__loading' }, [
        createEl('div', { className: 'spinner' }),
        createEl('p', {
          className: 'text-muted',
          text: 'Loading screenshots…',
        }),
      ]),
    );

    return section;
  }

  /** Populate the gallery with the fetched screenshots. */
  renderGallery(images) {
    if (!this.gallerySection) {
      return;
    }

    if (!images || images.length === 0) {
      this.gallerySection.replaceChildren(
        createEl('h3', {
          className: 'modal__section-title',
          text: 'Screenshots',
        }),
        createEl('p', {
          className: 'text-muted',
          text: 'No screenshots available for this game.',
        }),
      );
      return;
    }

    const track = createEl('div', { className: 'gallery__track' });

    images.forEach((image, index) => {
      track.append(
        createEl('div', { className: 'gallery__item' }, [
          createEl('img', {
            attrs: {
              src: image,
              alt: `Screenshot ${index + 1} of ${images.length}`,
              loading: 'lazy',
              decoding: 'async',
            },
          }),
        ]),
      );
    });

    const prev = createEl('button', {
      className: 'icon-button',
      attrs: { type: 'button', 'aria-label': 'Previous screenshots' },
    });
    prev.append(icon('chevronLeft'));

    const next = createEl('button', {
      className: 'icon-button',
      attrs: { type: 'button', 'aria-label': 'Next screenshots' },
    });
    next.append(icon('chevronRight'));

    const scrollBy = (direction) => {
      const amount = track.clientWidth * 0.85 * direction;
      track.scrollBy({ left: amount, behavior: 'smooth' });
    };

    prev.addEventListener('click', () => scrollBy(-1));
    next.addEventListener('click', () => scrollBy(1));

    this.gallerySection.replaceChildren(
      createEl('h3', {
        className: 'modal__section-title',
        text: 'Screenshots',
      }),
      createEl('div', { className: 'gallery' }, [
        track,
        createEl('div', { className: 'gallery__nav' }, [prev, next]),
      ]),
    );
  }

  /** Fetch screenshots in the background and swap them in. */
  async loadScreenshots(gameId) {
    // Ignore results that arrive after the user has moved on.
    if (this.gameId !== gameId || !this.isOpen) {
      return;
    }

    const images = await this.dataSource.getScreenshots(gameId);

    if (this.gameId === gameId && this.isOpen) {
      this.renderGallery(images);
    }
  }

  /* =====================================================================
     Footer — backlog actions
     ====================================================================== */

  renderFooter(game) {
    this.footer.replaceChildren();

    const saved = this.backlog ? this.backlog.getById(game.id) : null;

    const primaryButton = createEl('button', {
      className: `btn ${saved ? 'btn--ghost' : 'btn--primary'}`,
      attrs: { type: 'button' },
    });

    primaryButton.append(
      saved ? icon('check') : icon('plus'),
      document.createTextNode(saved ? 'In your backlog' : 'Add to backlog'),
    );

    primaryButton.addEventListener('click', () => {
      this.toggleBacklog();
    });

    this.footer.append(primaryButton);

    if (saved) {
      const statusSelect = createEl('select', {
        className: 'select status-select',
        attrs: { 'aria-label': `Playing status for ${escapeHtml(game.title)}` },
      });

      STATUSES.forEach((status) => {
        const option = createEl('option', {
          text: STATUS_META[status].label,
          attrs: { value: status },
        });

        if (saved.status === status) {
          option.selected = true;
        }

        statusSelect.append(option);
      });

      statusSelect.addEventListener('change', () => {
        this.backlog.updateStatus(game.id, statusSelect.value);
        showToast(`Moved to “${STATUS_META[statusSelect.value].label}”.`, {
          type: 'success',
        });
        this.onBacklogChange();
      });

      const removeButton = createEl('button', {
        className: 'btn btn--ghost',
        attrs: {
          type: 'button',
          'aria-label': `Remove ${escapeHtml(game.title)} from backlog`,
        },
      });
      removeButton.append(icon('trash'), document.createTextNode('Remove'));

      removeButton.addEventListener('click', () => {
        this.backlog.remove(game.id);
        showToast('Removed from your backlog.', { type: 'info' });
        this.onBacklogChange();
        this.renderFooter(this.game);
      });

      this.footer.append(statusSelect, removeButton);
    }

    this.footer.append(
      createEl('p', {
        className: 'modal__footer-hint',
        text: saved
          ? `Added ${new Date(saved.addedAt).toLocaleDateString()}`
          : 'Your backlog is saved in this browser.',
      }),
    );
  }

  /** Add or remove the current game, then refresh the footer. */
  toggleBacklog() {
    if (!this.backlog || !this.game) {
      return;
    }

    if (this.backlog.isSaved(this.game.id)) {
      this.backlog.remove(this.game.id);
      showToast('Removed from your backlog.', { type: 'info' });
    } else {
      const result = this.backlog.add(this.game, DEFAULT_STATUS);
      showToast(
        result.added ? 'Added to your backlog.' : 'That game is already saved.',
        { type: result.added ? 'success' : 'info' },
      );
    }

    this.onBacklogChange();
    this.renderFooter(this.game);
  }
}
