import Alert from "./Alert.js";
import ProductData from "./ProductData.mjs";
import ProductList from "./ProductList.mjs";
import { getLocalStorage } from "./utils.mjs";
const dataSource = new ProductData("tents");
const listElement = document.querySelector(".product-list");
const productList = new ProductList("tents", dataSource, listElement);
productList.init();

const cartItems = getLocalStorage("so-cart") || [];
const cartCount = document.querySelector(".cart-count");

cartCount.textContent = cartItems.length;

async function loadAlerts() {
  try {
    const response = await fetch("/json/alerts.json");

    if (!response.ok) {
      throw new Error("Could not load alerts");
    }

    const alerts = await response.json();

    const alertContainer = document.querySelector(".alert-list");

    if (!alertContainer) return;

    alerts.forEach((alertData) => {
      const alert = new Alert(alertData);
      alert.render(alertContainer);
    });
  } catch (error) {
    console.log(error.message);
  }
}

loadAlerts();