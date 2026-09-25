// wrapper for querySelector...returns matching element
export function qs(selector, parent = document) {
  return parent.querySelector(selector);
}

// retrieve data from localstorage
export function getLocalStorage(key) {
  return JSON.parse(localStorage.getItem(key));
}

// save data to local storage
export function setLocalStorage(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

// set a listener for both touchend and click
export function setClick(selector, callback) {
  qs(selector).addEventListener('touchend', (event) => {
    event.preventDefault();
    callback();
  });
  qs(selector).addEventListener('click', callback);
}

// read a query string parameter from the current page URL
export function getParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

// read the raw text of a template partial
export async function loadTemplate(path) {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error('Could not load template: ' + path);
  }

  return await response.text();
}

// inject the header/footer partials and refresh the cart count
export async function loadHeaderFooter() {
  const headerTemplate = await loadTemplate('../partials/header.html');
  const footerTemplate = await loadTemplate('../partials/footer.html');

  const header = document.querySelector('#main-header');
  const footer = document.querySelector('#main-footer');

  if (header) {
    header.innerHTML = headerTemplate;
  }

  if (footer) {
    footer.innerHTML = footerTemplate;
  }

  updateCartCount();
}

// add a product to the cart, consolidating duplicate products into a quantity
export function addProductToCart(product) {
  let cart = getLocalStorage('so-cart');

  if (!Array.isArray(cart)) {
    cart = [];
  }

  const existing = cart.find((item) => item.Id === product.Id);

  if (existing) {
    existing.quantity = (existing.quantity || 1) + 1;
  } else {
    const item = { ...product };
    item.quantity = 1;
    cart.push(item);
  }

  setLocalStorage('so-cart', cart);
  updateCartCount();

  return cart;
}

// reflect the total number of items in the cart badge
export function updateCartCount() {
  const cart = getLocalStorage('so-cart');
  const countElement = document.querySelector('#cart-count, .cart-count');

  if (!countElement) {
    return;
  }

  if (!Array.isArray(cart)) {
    countElement.textContent = 0;
    return;
  }

  countElement.textContent = cart.reduce(
    (sum, item) => sum + Number(item.quantity || 1),
    0,
  );
}

// build a display alert banner and prepend it to the main element
export function alertMessage(message, scroll = true) {
  const alert = document.createElement('div');
  alert.classList.add('alert');
  alert.textContent = message;

  const main = document.querySelector('main');
  main.prepend(alert);

  if (scroll) {
    alert.scrollIntoView();
  }
}

// render a list using a template function
export function renderListWithTemplate(
  templateFn,
  parentElement,
  list,
  position = 'afterbegin',
  clear = false,
) {
  if (clear) {
    parentElement.innerHTML = '';
  }

  const html = list.map(templateFn).join('');
  parentElement.insertAdjacentHTML(position, html);
}

// convert form data into a plain object keyed by field name
export function formDataToJSON(formElement) {
  const formData = new FormData(formElement);
  const converted = {};

  formData.forEach((value, key) => {
    converted[key] = value;
  });

  return converted;
}