import Alert from "./Alert.js";
import { getLocalStorage } from "./utils.mjs";

function updateCartCount() {
  const cartItems = getLocalStorage("so-cart") || [];
  const cartCount = document.querySelector(".cart-count");

  if (cartCount) {
    cartCount.textContent = cartItems.length;
  }
}

document.addEventListener("headerLoaded", updateCartCount);

updateCartCount();

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