
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

    document
      .getElementById("addToCart")
      .addEventListener("click", this.addToCart.bind(this));
  }

  
addToCart() {
  let cart = getLocalStorage("so-cart");

  if (!Array.isArray(cart)) {
    cart = [];
  }

  // Look for the same product already in the cart.
  // String() makes the comparison work whether the ID is
  // stored as a number or a string.
  const existingProduct = cart.find(
    (item) => String(item.Id) === String(this.product.Id),
  );

  if (existingProduct) {
    // Product already exists: increase its quantity.
    existingProduct.quantity =
      (existingProduct.quantity || 1) + 1;
  } else {
    // Product is new: add it with quantity 1.
    cart.push({
      ...this.product,
      quantity: 1,
    });
  }
   // Save the updated cart

  setLocalStorage("so-cart", cart);
}

 

  renderProductDetails() {
    // Rendering logic...
  }
}

