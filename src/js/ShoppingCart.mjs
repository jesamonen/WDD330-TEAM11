import { getLocalStorage, setLocalStorage, updateCartCount } from './utils.mjs';

export default class ShoppingCart {
  constructor(
    key = 'so-cart',
    listSelector = '.product-list',
    footerSelector = '.cart-footer',
    totalSelector = '.cart-total',
  ) {
    this.key = key;
    this.listSelector = listSelector;
    this.footerSelector = footerSelector;
    this.totalSelector = totalSelector;
  }

  init() {
    this.renderCartContents();
  }

  getCartItems() {
    return getLocalStorage(this.key) || [];
  }

  renderCartContents() {
    const cartItems = this.getCartItems();
    const listElement = document.querySelector(this.listSelector);

    listElement.innerHTML = cartItems
      .map((item) => this.cartItemTemplate(item))
      .join('');

    this.updateTotal(cartItems);
    this.addRemoveListeners();
  }

  updateTotal(cartItems) {
    const cartFooter = document.querySelector(this.footerSelector);
    const cartTotal = document.querySelector(this.totalSelector);

    if (cartItems.length > 0) {
      const total = cartItems.reduce(
        (sum, item) =>
          sum + Number(item.FinalPrice) * Number(item.quantity || 1),
        0,
      );

      cartTotal.textContent = `Total: $${total.toFixed(2)}`;
      cartFooter.classList.remove('hide');
    } else {
      cartTotal.textContent = 'Total: $0.00';
      cartFooter.classList.add('hide');
    }
  }

  cartItemTemplate(item) {
    return `<li class="cart-card divider">
      <a href="#" class="cart-card__image">
        <img
          src="${item.Images.PrimaryMedium}"
          alt="${item.Name}"
        />
      </a>

      <a href="#">
        <h2 class="card__name">${item.Name}</h2>
      </a>

      <p class="cart-card__color">
        ${item.Colors[0].ColorName}
      </p>

      <div class="cart-card__quantity">
        <button class="qty-minus" data-id="${item.Id}">-</button>
        <span>${item.quantity || 1}</span>
        <button class="qty-plus" data-id="${item.Id}">+</button>
      </div>

      <p class="cart-card__price">
        $${item.FinalPrice}
      </p>

      <span class="cart-card__remove" data-id="${item.Id}">X</span>
    </li>`;
  }

  removeFromCart(id) {
    let cartItems = this.getCartItems();
    cartItems = cartItems.filter((item) => item.Id !== id);
    setLocalStorage(this.key, cartItems);
    this.renderCartContents();
    updateCartCount();
  }

  updateQuantity(id, change) {
    const cartItems = this.getCartItems();
    const cartItem = cartItems.find((item) => item.Id === id);

    if (cartItem) {
      cartItem.quantity = (cartItem.quantity || 1) + change;

      if (cartItem.quantity < 1) {
        cartItem.quantity = 1;
      }
    }

    setLocalStorage(this.key, cartItems);
    this.renderCartContents();
    updateCartCount();
  }

  addRemoveListeners() {
    const removeButtons = document.querySelectorAll('.cart-card__remove');

    removeButtons.forEach((button) => {
      button.addEventListener('click', () => {
        this.removeFromCart(button.dataset.id);
      });
    });

    const plusButtons = document.querySelectorAll('.qty-plus');

    plusButtons.forEach((button) => {
      button.addEventListener('click', () => {
        this.updateQuantity(button.dataset.id, 1);
      });
    });

    const minusButtons = document.querySelectorAll('.qty-minus');

    minusButtons.forEach((button) => {
      button.addEventListener('click', () => {
        this.updateQuantity(button.dataset.id, -1);
      });
    });
  }
}