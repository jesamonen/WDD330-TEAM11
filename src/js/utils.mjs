// wrapper for querySelector...returns matching element
export function qs(selector, parent = document) {
  return parent.querySelector(selector);
}
// or a more concise version if you are into that sort of thing:
// export const qs = (selector, parent = document) => parent.querySelector(selector);

// retrieve data from localstorage
export function getLocalStorage(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}
// save data to local storage
export function setLocalStorage(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}
// set a listener for both touchend and click
export function setClick(selector, callback) {
  qs(selector).addEventListener("touchend", (event) => {
    event.preventDefault();
    callback();
  });
  qs(selector).addEventListener("click", callback);
}

export function getParam(param) {
  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  return urlParams.get(param);
}

export function renderListWithTemplate(
  templateFn,
  parentElement,
  list,
  position = "afterbegin",
  clear = false,
) {
  if (clear) {
    parentElement.innerHTML = "";
  }

  const html = list.map(templateFn).join("");
  parentElement.insertAdjacentHTML(position, html);
}

export function getCartCount() {
  const cart = getLocalStorage("so-cart");
  return Array.isArray(cart) ? cart.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0) : 0;
}

export async function loadHeaderFooter() {
  const [header, footer] = await Promise.all([
    fetch("/partials/header.html").then((response) => response.text()),
    fetch("/partials/footer.html").then((response) => response.text()),
  ]);
  const headerTarget = document.querySelector("[data-site-header]");
  const footerTarget = document.querySelector("[data-site-footer]");
  if (headerTarget) headerTarget.outerHTML = header;
  if (footerTarget) footerTarget.outerHTML = footer;
  updateCartCount();
}

export function updateCartCount() {
  document.querySelectorAll(".cart-count").forEach((badge) => {
    badge.textContent = getCartCount();
  });
}

window.addEventListener("storage", (event) => {
  if (event.key === "so-cart") updateCartCount();
});
