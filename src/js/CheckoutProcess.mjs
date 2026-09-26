import { getLocalStorage } from "./utils.mjs";

const baseURL = import.meta.env.VITE_SERVER_URL || "https://wdd330-backend.onrender.com/";
const money = (value) => Number(value).toFixed(2);

export default class CheckoutProcess {
  constructor(form, output) {
    this.form = form;
    this.output = output;
    this.cart = getLocalStorage("so-cart") || [];
  }

  calculate() {
    const subtotal = this.cart.reduce((sum, item) => sum + Number(item.FinalPrice) * (Number(item.quantity) || 1), 0);
    const shipping = subtotal ? (subtotal >= 50 ? 0 : 10) : 0;
    const tax = subtotal * 0.06;
    return { subtotal, shipping, tax, total: subtotal + shipping + tax };
  }

  render() {
    const totals = this.calculate();
    this.output.innerHTML = `<p>Subtotal: $${money(totals.subtotal)}</p><p>Shipping: $${money(totals.shipping)}</p><p>Estimated tax: $${money(totals.tax)}</p><strong>Order total: $${money(totals.total)}</strong>`;
    return totals;
  }

  async checkout() {
    if (!this.cart.length) throw new Error("Your cart is empty. Add products before checking out.");
    const formData = new FormData(this.form);
    const customer = Object.fromEntries(formData.entries());
    const totals = this.calculate();
    const payload = { ...customer, items: this.cart, ...totals };
    const response = await fetch(`${baseURL.replace(/\/?$/, "/")}checkout`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`Checkout failed (${response.status}). Please try again.`);
    const result = await response.json().catch(() => ({}));
    return { result, payload };
  }
}
