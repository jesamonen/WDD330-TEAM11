import { addProductToCart } from './utils.mjs';

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
      .getElementById('addToCart')
      .addEventListener('click', () => this.addToCart());
  }

  addToCart() {
    addProductToCart(this.product);
  }

  renderProductDetails() {
    document.querySelector('.product-detail h3').textContent =
      this.product.Brand.Name;

    document.querySelector('.product-detail h2').textContent =
      this.product.Name;

    const image = document.querySelector('.product-detail img');

    image.src = this.product.Images.PrimaryLarge;
    image.alt = this.product.Name;

    document.querySelector('.product-card__price').textContent =
      `$${this.product.FinalPrice}`;

    const discount = document.querySelector('.product-detail__discount');

    if (this.product.FinalPrice < this.product.SuggestedRetailPrice) {
      discount.textContent = `Save $${(
        this.product.SuggestedRetailPrice - this.product.FinalPrice
      ).toFixed(2)}`;
    } else {
      discount.textContent = '';
    }

    document.querySelector('.product__color').textContent =
      this.product.Colors[0].ColorName;

    document.querySelector('.product__description').textContent =
      this.product.Description;
  }
}