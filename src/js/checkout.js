import CheckoutProcess from "./CheckoutProcess.mjs";
import { setLocalStorage } from "./utils.mjs";
const form = document.querySelector("#checkout-form");
const output = document.querySelector("#order-totals");
const process = new CheckoutProcess(form, output);
process.render();
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const button = form.querySelector("button[type=submit]");
  button.disabled = true;
  const message = document.querySelector("#checkout-message");
  message.textContent = "Submitting your order…";
  message.className = "notice";
  try {
    const { result, payload } = await process.checkout();
    const orderNumber = result.orderNumber || result.orderId || result.id || `SO-${Date.now()}`;
    sessionStorage.setItem("so-order", JSON.stringify({ orderNumber, payload }));
    setLocalStorage("so-cart", []);
    window.location.assign("/checkout/confirmation.html");
  } catch (error) {
    message.textContent = error.message || "We could not submit your order. Please try again.";
    message.className = "notice error";
    button.disabled = false;
  }
});
