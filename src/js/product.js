import { setLocalStorage } from './utils.mjs';
import ProductData from './ProductData.mjs';

const dataSource = new ProductData('tents');

function addProductToCart(product) {
  // 1. Get existing cart data or default to empty array
  let cart = JSON.parse(localStorage.getItem("so-cart")) || [];

  // 2. Ensure cart is strictly an Array
  if (!Array.isArray(cart)) {
    cart = [];
  }

  // 3. Push product and update localStorage
  cart.push(product);
  localStorage.setItem("so-cart", JSON.stringify(cart));
}

// add to cart button event handler
async function addToCartHandler(e) {
  const product = await dataSource.findProductById(e.target.dataset.id);
  addProductToCart(product);
}

// add listener to Add to Cart button
document
  .getElementById('addToCart')
  .addEventListener('click', addToCartHandler);
