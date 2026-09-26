import { renderListWithTemplate } from "./utils.mjs";

function productCardTemplate(product) {
  const image = product.Images?.PrimaryMedium || product.Image || "";
  const brand = product.Brand?.Name || product.Name.split(" ")[0];
  return `
    <li class="product-card">
      <a href="../product_pages/?product=${product.Id}">
        <img
          src="${image}"
          alt="${product.Name}"
        />
        <h3 class="card__brand">${brand}</h3>
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
      <button type="button" class="quick-view-button" data-product-id="${product.Id}">
        Quick view
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
    try {
      const list = await this.dataSource.getData(this.category);
      this.renderList(list);
      return list;
    } catch (error) {
      this.listElement.innerHTML = `<li role="status">Products could not be loaded. Please try again later.</li>`;
      console.error(error);
      return [];
    }
  }

  renderList(list) {
    if (!list.length) {
      this.listElement.innerHTML = '<li role="status">No products found in this category.</li>';
      return;
    }
    renderListWithTemplate(
      productCardTemplate,
      this.listElement,
      list,
      "afterbegin",
      true,
    );
  }
}
