import { getLocalStorage, setLocalStorage } from "./utils.mjs";


// Render cart contents
function renderCartContents() {
  const cartItems = getLocalStorage("so-cart") || [];

  const htmlItems = cartItems.map((item) => cartItemTemplate(item));

  document.querySelector(".product-list").innerHTML = htmlItems.join("");

  const cartFooter = document.querySelector(".cart-footer");
  const cartTotal = document.querySelector(".cart-total");


  if (cartItems.length > 0) {

    const total = cartItems.reduce(
      (sum, item) =>
        sum + Number(item.FinalPrice) * (item.quantity || 1),
      0,
    );

    cartTotal.textContent = `Total: $${total.toFixed(2)}`;

    cartFooter.classList.remove("hide");

  } else {

    cartTotal.textContent = "Total: $0.00";

    cartFooter.classList.add("hide");
  }


  addRemoveListeners();
}



// Cart item template
function cartItemTemplate(item) {

  return `<li class="cart-card divider">

  <a href="#" class="cart-card__image">
    <img
      src="${item.Images.PrimaryMedium}"
      alt="${item.Name}"
    />
  </a>


  <a href="#">
    <h2 class="card__name">${item.Name}</h2>
  </a>


  <p class="cart-card__color">
    ${item.Colors[0].ColorName}
  </p>


  <div class="cart-card__quantity">

    <button class="qty-minus" data-id="${item.Id}">
      -
    </button>

    <span>
      ${item.quantity || 1}
    </span>

    <button class="qty-plus" data-id="${item.Id}">
      +
    </button>

  </div>


  <p class="cart-card__price">
    $${item.FinalPrice}
  </p>


  <span class="cart-card__remove" data-id="${item.Id}">
    X
  </span>


</li>`;
}



// Remove item
function removeFromCart(id) {

  let cartItems = getLocalStorage("so-cart") || [];

  cartItems = cartItems.filter((item) => item.Id !== id);

  setLocalStorage("so-cart", cartItems);

  renderCartContents();
}



// Update quantity
function updateQuantity(id, change) {

  let cartItems = getLocalStorage("so-cart") || [];

  const item = cartItems.find((item) => item.Id === id);


  if (item) {

    item.quantity = (item.quantity || 1) + change;


    if (item.quantity < 1) {
      item.quantity = 1;
    }

  }


  setLocalStorage("so-cart", cartItems);

  renderCartContents();

}



// Add button listeners
function addRemoveListeners() {


  const removeButtons = document.querySelectorAll(".cart-card__remove");


  removeButtons.forEach((button) => {

    button.addEventListener("click", () => {

      removeFromCart(button.dataset.id);

    });

  });



  const plusButtons = document.querySelectorAll(".qty-plus");


  plusButtons.forEach((button) => {

    button.addEventListener("click", () => {

      updateQuantity(button.dataset.id, 1);

    });

  });



  const minusButtons = document.querySelectorAll(".qty-minus");


  minusButtons.forEach((button) => {

    button.addEventListener("click", () => {

      updateQuantity(button.dataset.id, -1);

    });

  });

}


renderCartContents();