import { getLocalStorage } from './utils.mjs';

function renderCartContents() {
  // Get cart items from local storage, default to empty array if null
  const cartItems = getLocalStorage('so-cart') || [];

  // Handle empty cart case
  if (cartItems.length === 0) {
    document.querySelector('.product-list').innerHTML = "<p>Your cart is empty</p>";
    return;
  }

  // Build HTML for each item
  const htmlItems = cartItems.map((item) => cartItemTemplate(item));
  document.querySelector('.product-list').innerHTML = htmlItems.join('');
}

function cartItemTemplate(item) {
  const newItem = `<li class="cart-card divider">
    <a href="#" class="cart-card__image">
      <img src="${item.Image}" alt="${item.Name}" />
    </a>
    <a href="#">
      <h2 class="card__name">${item.Name}</h2>
    </a>
    <p class="cart-card__color">${item.Colors[0].ColorName}</p>
    <p class="cart-card__quantity">qty: ${item.quantity || 1}</p>
    <p class="cart-card__price">$${item.FinalPrice}</p>
  </li>`;

  return newItem;
}

// Render cart contents on page load
renderCartContents();
