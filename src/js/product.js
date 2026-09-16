import { getParam, setLocalStorage, getLocalStorage } from './utils.mjs';
import ProductData from './ProductData.mjs';
import ProductDetails from './ProductDetails.mjs';

const productId = getParam('product');
const category = getParam('category') || 'tents'; // default to tents if not provided

const dataSource = new ProductData(category);
const product = new ProductDetails(productId, dataSource);
product.init();

function addToCart(productData) {
    let cart = getLocalStorage('so-cart') || [];
    cart.push(productData);
    setLocalStorage('so-cart', cart);
}

const addBtn = document.querySelector("#addToCart");
if (addBtn) {
    addBtn.addEventListener("click", async () => {
        const productData = await product.getProduct();
        productData.quantity = 1;
        addToCart(productData);
    });
}
