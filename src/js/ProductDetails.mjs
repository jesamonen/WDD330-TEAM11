
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

    const existingProduct = cart.find(
      (item) => String(item.Id) === String(this.product.Id),
    );

    if (existingProduct) {
      existingProduct.quantity =
        (existingProduct.quantity || 1) + 1;
    } else {
      cart.push({
        ...this.product,
        quantity: 1,
      });
    }

    setLocalStorage("so-cart", cart);
  }

  renderProductDetails() {
    const product = this.product;

    const productBrand = document.querySelector(
      ".product-detail h3",
    );

    const productName = document.querySelector(
      ".product-detail h2",
    );

    const productImage = document.querySelector(
      ".product-detail img",
    );

    const productPrice = document.querySelector(
      ".product-card__price",
    );

    const productDiscount = document.querySelector(
      ".product-detail__discount",
    );

    const productColor = document.querySelector(
      ".product__color",
    );

    const productDescription = document.querySelector(
      ".product__description",
    );

    // Brand
    productBrand.textContent = product.Brand.Name;

    // Product name
    productName.textContent = product.Name;

    // Product image
    productImage.src = product.Images.PrimaryMedium;
    productImage.alt = product.Name;

    // Product price
    productPrice.textContent = `$${product.FinalPrice}`;

    // Discount
    if (product.FinalPrice < product.SuggestedRetailPrice) {
      const savings =
        product.SuggestedRetailPrice - product.FinalPrice;

      productDiscount.textContent = `Save $${savings.toFixed(2)}`;
    } else {
      productDiscount.textContent = "";
    }

    // Color
    if (product.Colors && product.Colors.length > 0) {
      productColor.textContent =
        `Color: ${product.Colors[0].ColorName}`;
    } else {
      productColor.textContent = "";
    }

    // Description
    productDescription.textContent = product.Description;
  }
}

