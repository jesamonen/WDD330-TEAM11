import { getParam, setLocalStorage, getLocalStorage } from './utils.mjs';
import ProductData from './ProductData.mjs';
import ProductDetails from './ProductDetails.mjs';

// 1. Get product ID from the URL (?product=ID)
const productId = getParam('product');

// 2. Create a data source for tents
const dataSource = new ProductData('tents');

// 3. Create ProductDetails instance and initialize
const product = new ProductDetails(productId, dataSource);
product.init();

// 4. Add to Cart functionality
function addToCart(productData) {
    // Get existing cart or start empty
    let cart = getLocalStorage('so-cart') || [];

    // Add product to cart
    cart.push(productData);

    // Save back to localStorage
    setLocalStorage('so-cart', cart);
}

// 5. Attach event listener to button
document.querySelector("#addToCart").addEventListener("click", async () => {
    // Get product data from ProductDetails instance
    const productData = await product.getProduct();
    // Ensure getProduct() returns an object shaped like:
    // {
    //   Id: "985RF",
    //   Name: "Talus Tent - 4-Person, 3-Season",
    //   Image: "../images/tents/northface-talus-4.jpg",
    //   FinalPrice: 199.99,
    //   Colors: [{ ColorName: "Golden Oak/Saffron Yellow" }],
    //   quantity: 1
    // }

    // Add to cart
    addToCart(productData);
});
