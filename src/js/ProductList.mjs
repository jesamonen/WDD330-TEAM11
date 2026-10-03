import { renderListWithTemplate } from "./utils.mjs";

function productCardTemplate(product) {
  return `
    <li class="product-card">
      <a href="../product_pages/?product=${product.Id}" class="product-card__link">
        <picture>
          <source
            media="(min-width: 800px)"
            srcset="${product.Images.PrimaryLarge}"
          />

          <img
            src="${product.Images.PrimaryMedium}"
            alt="${product.Name}"
            loading="lazy"
          />
        </picture>

        <h3 class="card__brand">${product.Brand.Name}</h3>
        <h2 class="card__name">${product.Name}</h2>
        <p class="product-card__price">$${product.FinalPrice}</p>

        ${
          product.FinalPrice < product.SuggestedRetailPrice
            ? `<p class="product-card__discount">
                Save $${(
                  product.SuggestedRetailPrice - product.FinalPrice
                ).toFixed(2)}
              </p>`
            : ""
        }
      </a>

      <button
        type="button"
        class="quick-view-button"
        data-product-id="${product.Id}"
      >
        Quick View
      </button>
    </li>
  `;
}

export default class ProductList {
  constructor(category, dataSource, listElement) {
    this.category = category;
    this.dataSource = dataSource;
    this.listElement = listElement;
  }

  async init() {
    const list = await this.dataSource.getData(this.category);

    this.products = list;
    this.renderList(list);

    const breadcrumbs = document.querySelector(".breadcrumbs");

    const categoryName = this.category
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    breadcrumbs.textContent =
      "Home → " + categoryName + " → (" + list.length + " items)";

    this.setupQuickView();

    return list;
  }

  renderList(list) {
    renderListWithTemplate(
      productCardTemplate,
      this.listElement,
      list,
      "afterbegin",
      true,
    );

    this.setupQuickView();
  }

  setupQuickView() {
    const quickViewButtons =
      this.listElement.querySelectorAll(".quick-view-button");

    quickViewButtons.forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();

        const productId = button.dataset.productId;

        const product = this.products.find(
          (item) => String(item.Id) === String(productId),
        );

        if (product) {
          this.showQuickView(product);
        }
      });
    });
  }

  showQuickView(product) {
    const existingModal = document.querySelector(".quick-view-modal");

    if (existingModal) {
      existingModal.remove();
    }

    const discount =
      product.FinalPrice < product.SuggestedRetailPrice
        ? `<p class="quick-view__discount">
            Save $${(
              product.SuggestedRetailPrice - product.FinalPrice
            ).toFixed(2)}
          </p>`
        : "";

    const color =
      product.Colors && product.Colors.length > 0
        ? `<p class="quick-view__color">
            Color: ${product.Colors[0].ColorName}
          </p>`
        : "";

    const modal = document.createElement("div");

    modal.className = "quick-view-modal";

    modal.innerHTML = `
      <div class="quick-view-modal__content" role="dialog" aria-modal="true">
        <button
          type="button"
          class="quick-view-modal__close"
          aria-label="Close quick view"
        >
          &times;
        </button>

        <div class="quick-view__image">
          <img
            src="${product.Images.PrimaryMedium}"
            alt="${product.Name}"
          />
        </div>

        <div class="quick-view__details">
          <p class="quick-view__brand">${product.Brand.Name}</p>

          <h2 class="quick-view__name">
            ${product.Name}
          </h2>

          <p class="quick-view__price">
            $${product.FinalPrice}
          </p>

          ${discount}

          ${color}

          <p class="quick-view__description">
            ${product.Description || "No description available."}
          </p>

          <a
            class="quick-view__details-link"
            href="../product_pages/?product=${product.Id}"
          >
            View Full Details
          </a>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const closeButton = modal.querySelector(
      ".quick-view-modal__close",
    );

    closeButton.addEventListener("click", () => {
      modal.remove();
    });

    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        modal.remove();
      }
    });

    document.addEventListener(
      "keydown",
      function closeOnEscape(event) {
        if (event.key === "Escape") {
          modal.remove();

          document.removeEventListener(
            "keydown",
            closeOnEscape,
          );
        }
      },
    );
  }
}