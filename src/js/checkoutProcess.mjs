
import { getLocalStorage } from "./utils.mjs";

export default class CheckoutProcess {
  constructor(key, outputSelector) {
    this.key = key;
    this.outputSelector = outputSelector;
    this.list = [];
    this.itemTotal = 0;
    this.shipping = 0;
    this.tax = 0;
    this.orderTotal = 0;
  }

init() {
  this.list = getLocalStorage(this.key) || [];
  this.calculateItemSubTotal();
}

  calculateItemSubTotal() {
    this.itemTotal = this.list.reduce(
      (total, item) =>
        total + Number(item.FinalPrice) * (item.quantity || 1),
      0,
    );

    const subtotal = document.querySelector(
      `${this.outputSelector} #subtotal`,
    );

    subtotal.textContent = `$${this.itemTotal.toFixed(2)}`;
  }

  calculateTax() {
  this.tax = this.itemTotal * 0.06;

  const tax = document.querySelector(
    `${this.outputSelector} #tax`,
  );

  tax.textContent = `$${this.tax.toFixed(2)}`;
}

calculateShipping() {
  const itemCount = this.list.reduce(
    (total, item) => total + (item.quantity || 1),
    0,
  );

  if (itemCount > 0) {
    this.shipping = 10 + (itemCount - 1) * 2;
  } else {
    this.shipping = 0;
  }

  const shipping = document.querySelector(
    `${this.outputSelector} #shipping`,
  );

  shipping.textContent = `$${this.shipping.toFixed(2)}`;
}

calculateOrderTotal() {
  this.orderTotal = this.itemTotal + this.tax + this.shipping;

  const orderTotal = document.querySelector(
    `${this.outputSelector} #order-total`,
  );

  orderTotal.textContent = `$${this.orderTotal.toFixed(2)}`;
}

packageItems() {
  return this.list.map((item) => ({
    id: item.Id,
    name: item.Name,
    price: item.FinalPrice,
    quantity: item.quantity || 1,
  }));
}
checkout(form) {
  const formData = new FormData(form);

  const data = Object.fromEntries(formData);

  data.orderDate = new Date().toISOString();
  data.items = this.packageItems();
  data.orderTotal = this.orderTotal;
  data.shipping = this.shipping;
  data.tax = this.tax;

  return data;
}
}

