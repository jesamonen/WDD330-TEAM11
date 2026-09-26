import ProductData from "./ProductData.mjs";
import ProductList from "./ProductList.mjs";
import { getParam } from "./utils.mjs";

const category = (getParam("category") || "tents").toLowerCase();

const dataSource = new ProductData();

const listElement = document.querySelector(".product-list");

const productList = new ProductList(
  category,
  dataSource,
  listElement,
);

const title = document.querySelector(".products h2");

const categoryName = category
  .split("-")
  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
  .join(" ");

title.textContent = `${categoryName}`;
const breadcrumb = document.querySelector(".breadcrumbs");
if (breadcrumb) breadcrumb.innerHTML = `<a href="/">Home</a> / ${categoryName}`;

const sort = document.querySelector("#sort");
const render = async () => {
  try {
    const products = await dataSource.getData(category);
    if (sort.value === "name") products.sort((a, b) => a.Name.localeCompare(b.Name));
    if (sort.value === "price-asc") products.sort((a, b) => Number(a.FinalPrice) - Number(b.FinalPrice));
    if (sort.value === "price-desc") products.sort((a, b) => Number(b.FinalPrice) - Number(a.FinalPrice));
    productList.renderList(products);
  } catch (error) {
    listElement.innerHTML = '<li role="alert">Products could not be loaded. Please try again later.</li>';
    console.error(error);
  }
};
sort.addEventListener("change", render);
render();

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
