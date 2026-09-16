import { getLocalStorage } from './utils.mjs';

function renderCartContents() {
  const cartItems = getLocalStorage('so-cart') || [];

  if (cartItems.length === 0) {
    document.querySelector('.product-list').innerHTML = "<p>Your cart is empty</p>";
    document.querySelector('#cart-total').textContent = "$0.00";
    return;
  }

  const htmlItems = cartItems.map((item) => cartItemTemplate(item));
  document.querySelector('.product-list').innerHTML = htmlItems.join('');

  // Calculate and display total
  const total = calculateCartTotal(cartItems);
  document.querySelector('#cart-total').textContent = `$${total.toFixed(2)}`;
}

function cartItemTemplate(item) {
  return `<li class="cart-card divider">
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
}

function calculateCartTotal(cartItems) {
  return cartItems.reduce((sum, item) => {
    const qty = item.quantity || 1;
    return sum + item.FinalPrice * qty;
  }, 0);
}

renderCartContents();
