import ProductData from "./ProductData.mjs";
import ProductList from "./ProductList.mjs";
import { getParam } from "./utils.mjs";

const category = getParam("category");

const dataSource = new ProductData();

const listElement = document.querySelector(".product-list");

const productList = new ProductList(
  category,
  dataSource,
  listElement,
);

productList.init();

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