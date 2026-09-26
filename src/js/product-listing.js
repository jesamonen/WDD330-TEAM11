import ExternalServices from "./ExternalServices.mjs";
import ProductList from "./ProductList.mjs";
import { getParam } from "./utils.mjs";

async function initProductListing() {
  const category = getParam("category");

  const dataSource = new ExternalServices();

  const listElement = document.querySelector(".product-list");

  const productList = new ProductList(
    category,
    dataSource,
    listElement,
  );

  const products = await productList.init();

  const title = document.querySelector(".products h2");

  const categoryName = category
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  title.textContent = `Top Products: ${categoryName}`;

  const searchInput = document.querySelector("#search");
  const searchButton = document.querySelector("#searchButton");

  searchButton.addEventListener("click", () => {
    const searchTerm = searchInput.value.toLowerCase().trim();

    const cards = document.querySelectorAll(".product-card");

    cards.forEach((card) => {
      const productName = card
        .querySelector(".card__name")
        .textContent.toLowerCase();

      const brandName = card
        .querySelector(".card__brand")
        .textContent.toLowerCase();

      if (
        productName.includes(searchTerm) ||
        brandName.includes(searchTerm)
      ) {
        card.style.display = "";
      } else {
        card.style.display = "none";
      }
    });
  });

  const sortSelect = document.querySelector("#sort");

  sortSelect.addEventListener("change", () => {
    const sortValue = sortSelect.value;

    const sortedProducts = [...products];

    if (sortValue === "name-asc") {
      sortedProducts.sort((a, b) =>
        a.Name.localeCompare(b.Name),
      );
    }

    if (sortValue === "name-desc") {
      sortedProducts.sort((a, b) =>
        b.Name.localeCompare(a.Name),
      );
    }

    if (sortValue === "price-asc") {
      sortedProducts.sort(
        (a, b) => Number(a.FinalPrice) - Number(b.FinalPrice),
      );
    }

    if (sortValue === "price-desc") {
      sortedProducts.sort(
        (a, b) => Number(b.FinalPrice) - Number(a.FinalPrice),
      );
    }

    productList.renderList(sortedProducts);
  });
}

initProductListing();