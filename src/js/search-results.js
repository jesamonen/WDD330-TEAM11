import { renderListWithTemplate } from "./utils.mjs";

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
            : ""
        }
      </a>
    </li>
  `;
}

const resultsContainer = document.querySelector("#search-results");
const results = JSON.parse(
  sessionStorage.getItem("search-results") || "[]",
);

const heading = document.querySelector(".products h2");

if (results.length > 0) {
  heading.textContent = `Search Results (${results.length} items)`;

  renderListWithTemplate(
    productCardTemplate,
    resultsContainer,
    results,
    "afterbegin",
    true,
  );
} else {
  heading.textContent = "No Search Results";

  resultsContainer.innerHTML = `
    <li>
      <p>No products were found.</p>
    </li>
  `;
}