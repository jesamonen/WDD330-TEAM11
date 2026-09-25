import ExternalServices from './ExternalServices.mjs';
import {
  getLocalStorage,
  formDataToJSON,
  alertMessage,
} from './utils.mjs';

const taxRate = 0.06;
const firstItemShipping = 10;
const eachExtraItemShipping = 2;

export default class CheckoutProcess {
  constructor(key, outputSelector) {
    this.key = key;
    this.outputSelector = outputSelector;
    this.list = [];
    this.itemTotal = 0;
    this.tax = 0;
    this.shipping = 0;
    this.orderTotal = 0;
  }

  init() {
    this.list = getLocalStorage(this.key) || [];
  }

  calculateItemSummary() {
    const summary = this.list.reduce((sum, item) => (
        sum +
        Number(item.FinalPrice) * Number(item.quantity || 1)
      ), 0);

    this.itemTotal = summary;
  }

  calculateOrdertotal() {
    this.tax = this.itemTotal * taxRate;

    const totalItems = this.list.reduce(
      (sum, item) => sum + Number(item.quantity || 1),
      0,
    );

    this.shipping =
      firstItemShipping +
      Math.max(0, totalItems - 1) * eachExtraItemShipping;

    this.orderTotal = this.itemTotal + this.tax + this.shipping;

    this.displayOrderTotals();
  }

  displayOrderTotals() {
    const summary = document.querySelector(this.outputSelector);

    summary.querySelector('.checkout-subtotal').textContent =
      `Subtotal: $${this.itemTotal.toFixed(2)}`;
    summary.querySelector('.checkout-tax').textContent =
      `Tax: $${this.tax.toFixed(2)}`;
    summary.querySelector('.checkout-shipping').textContent =
      `Shipping: $${this.shipping.toFixed(2)}`;
    summary.querySelector('.checkout-total').textContent =
      `Order Total: $${this.orderTotal.toFixed(2)}`;
  }

  async checkout() {
    const formElement = document.forms['checkout'];
    const json = formDataToJSON(formElement);

    json.orderDate = new Date().toISOString();
    json.tax = this.tax.toFixed(2);
    json.shipping = this.shipping.toFixed(2);
    json.orderTotal = this.orderTotal.toFixed(2);
    json.items = this.list;

    const services = new ExternalServices();

    try {
      const result = await services.checkout(json);

      localStorage.removeItem(this.key);
      location.assign(
        `../checkout/success.html?orderId=${result.OrderId}`,
      );
    } catch (err) {
      this.reportErrors(err);
    }
  }

  reportErrors(err) {
    let messages = [];

    try {
      const parsed = JSON.parse(err.message);

      if (Array.isArray(parsed)) {
        messages = parsed;
      } else if (parsed && parsed.message) {
        messages = [parsed.message];
      } else {
        messages = [err.message];
      }
    } catch (parseError) {
      messages = [err.message];
    }

    messages.forEach((message) => alertMessage(message, false));
  }
}