import CheckoutProcess from './CheckoutProcess.mjs';

const checkoutProcess = new CheckoutProcess(
  'so-cart',
  '.checkout-summary',
);

checkoutProcess.init();

const zipInput = document.querySelector('#zip');

zipInput.addEventListener('blur', () => {
  checkoutProcess.calculateItemSummary();
  checkoutProcess.calculateOrdertotal();
});

document
  .querySelector('#checkout')
  .addEventListener('submit', (event) => {
    event.preventDefault();
    checkoutProcess.checkout();
  });