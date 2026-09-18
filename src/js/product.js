import { getParam, getLocalStorage, setLocalStorage } from './utils.mjs';
import ProductData from './ProductData.mjs';
import ProductDetails from './ProductDetails.mjs';

const productId = getParam('product');
const category = getParam('category') || 'tents';

const dataSource = new ProductData(category);
const product = new ProductDetails(productId, dataSource);

// Save item to cart in local storage
function addToCart(productData) {
    let cart = getLocalStorage('so-cart') || [];
    
    // Maintain quantity tracking
    const itemToSave = { ...productData, quantity: 1 };
    
    cart.push(itemToSave);
    setLocalStorage('so-cart', cart);
    console.log(`${itemToSave.Name} added to cart`);
}

// Initialize page and attach click listener after data fetches
async function initPage() {
    if (!productId) {
        console.error('No product parameter found in URL. Try appending ?product=880RR');
        return;
    }

    await product.init();

    const addBtn = document.querySelector('#addToCart');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            const productData = product.getProduct();
            addToCart(productData);
        });
    }
}

initPage();