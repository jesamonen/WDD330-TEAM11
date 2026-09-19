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
  }

  addProductToCart() {
    let cart = getLocalStorage("so-cart");

    if (!Array.isArray(cart)) {
      cart = [];
    }

    cart.push(this.product);
    setLocalStorage("so-cart", cart);
  }

  renderProductDetails() {
    document.querySelector(".product-detail h3").textContent =
     this.product.Brand.Name;

    document.querySelector(".product-detail h2").textContent =
      this.product.Name;

    const image = document.querySelector(".product-detail img");
    image.src = this.product.Image;
    image.alt = this.product.Name;

    document.querySelector(".product-card__price").textContent =
      `$${this.product.FinalPrice}`;
        const discount = document.querySelector(".product-detail__discount");

        if (this.product.FinalPrice < this.product.SuggestedRetailPrice) {
        discount.textContent = `Save $${(
            this.product.SuggestedRetailPrice - this.product.FinalPrice
        ).toFixed(2)}`;
        } else {
        discount.textContent = "";
        }

    document.querySelector(".product__color").textContent =
      this.product.Colors[0].ColorName;

    document.querySelector(".product__description").textContent =
      this.product.Description;

    document
      .getElementById("addToCart")
      .addEventListener("click", () => this.addProductToCart());
  }
}