
import { renderListWithTemplate } from "./utils.mjs";

function productCardTemplate(product) {
  return `
    <li class="product-card">
      <a href="../product_pages/?product=${product.Id}">
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

    this.renderList(list);

    const breadcrumbs = document.querySelector(".breadcrumbs");

    const categoryName = this.category
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    breadcrumbs.textContent =
      "Home → " + categoryName + " → (" + list.length + " items)";

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
  }
}

