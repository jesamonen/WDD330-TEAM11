import { getLocalStorage, setLocalStorage } from "./utils.mjs";

export default class ProductDetails {
  constructor(productId, dataSource) {
    this.productId = productId;
    this.dataSource = dataSource;
    this.product = {};
  }

  async init() {
    this.product = await this.dataSource.findProductById(this.productId);
    this.renderProductDetails();

    // Bind 'this' context so the callback can access this.product and this.addToCart
    document
      .getElementById("addToCart")
      .addEventListener("click", this.addToCart.bind(this));
  }

  addToCart() {
    // 1. Read existing cart or fallback to empty array
    let cart = getLocalStorage("so-cart");
    if (!Array.isArray(cart)) {
      cart = [];
    }

    // 2. Push product to the array
    cart.push(this.product);

    // 3. Persist updated array back to localStorage
    setLocalStorage("so-cart", cart);
  }

  renderProductDetails() {
    // Rendering logic...
  }
}