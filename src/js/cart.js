import { getLocalStorage, setLocalStorage, updateCartCount } from "./utils.mjs";

const list = document.querySelector(".product-list");
function renderCartContents() {
  const items = getLocalStorage("so-cart") || [];
  list.innerHTML = items.map((item) => `<li class="cart-card divider">
    <img class="cart-card__image" src="${item.Images?.PrimaryMedium || item.Image || ""}" alt="${item.Name}">
    <h2 class="card__name">${item.Name}</h2><p>${item.Colors?.[0]?.ColorName || ""}</p>
    <div class="cart-card__quantity"><button type="button" class="qty-minus" data-id="${item.Id}" aria-label="Decrease quantity">−</button>
    <span>${Number(item.quantity) || 1}</span><button type="button" class="qty-plus" data-id="${item.Id}" aria-label="Increase quantity">+</button></div>
    <p class="cart-card__price">$${(Number(item.FinalPrice) * (Number(item.quantity) || 1)).toFixed(2)}</p>
    <button type="button" class="cart-card__remove" data-id="${item.Id}">Remove</button></li>`).join("");
  const footer = document.querySelector(".cart-footer");
  footer.classList.toggle("hide", items.length === 0);
  const subtotal = items.reduce((sum, item) => sum + Number(item.FinalPrice) * (Number(item.quantity) || 1), 0);
  document.querySelector(".cart-total").textContent = `Subtotal: $${subtotal.toFixed(2)}`;
  if (!items.length) list.innerHTML = '<li>Your cart is empty. <a href="/">Continue shopping</a></li>';
  updateCartCount();
}
list.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-id]");
  if (!button) return;
  let items = getLocalStorage("so-cart") || [];
  const item = items.find((entry) => String(entry.Id) === button.dataset.id);
  if (button.classList.contains("cart-card__remove")) items = items.filter((entry) => String(entry.Id) !== button.dataset.id);
  else if (item) item.quantity = Math.max(1, (Number(item.quantity) || 1) + (button.classList.contains("qty-plus") ? 1 : -1));
  setLocalStorage("so-cart", items);
  renderCartContents();
});
renderCartContents();
