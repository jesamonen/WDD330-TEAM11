import { renderListWithTemplate } from './utils.mjs';

function productCardTemplate(product) {
  return `
    <li class="product-card">
      <a href="../product_pages/?product=${product.Id}">
        <img
          src="${product.Images.PrimaryMedium}"
          alt="${product.Name}"
        />
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
            : ''
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
    this.list = [];
  }

  async init() {
    this.list = await this.dataSource.getData(this.category);
    this.renderList(this.list);

    const sortSelect = document.querySelector('#sort-by');

    if (sortSelect) {
      sortSelect.addEventListener('change', () => {
        this.renderList(this.sortList(this.list, sortSelect.value));
      });
    }
  }

  // keep only featured items, falling back to the first four products
  filterList(list) {
    const featured = list.filter((item) => item.Featured === true);

    return featured.length > 0 ? featured : list.slice(0, 4);
  }

  // sort a copy of the list by name or price
  sortList(list, sortBy) {
    const sorted = [...list];

    if (sortBy === 'name') {
      sorted.sort((a, b) => a.Name.localeCompare(b.Name));
    } else if (sortBy === 'price') {
      sorted.sort(
        (a, b) => Number(a.FinalPrice) - Number(b.FinalPrice),
      );
    }

    return sorted;
  }

  renderList(list) {
    renderListWithTemplate(
      productCardTemplate,
      this.listElement,
      list,
      'afterbegin',
      true,
    );
  }
}