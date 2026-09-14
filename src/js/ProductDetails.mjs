import { getLocalStorage, setLocalStorage } from './utils.mjs';

export default class ProductDetails {
    constructor(productId, dataSource) {
        this.productId = productId;
        this.dataSource = dataSource;
        this.product = {};
    }

    async init() {
        // Fetch product data by ID
        this.product = await this.dataSource.findProductById(this.productId);

        // Render product details into placeholders
        this.renderProductDetails();

        // Attach Add to Cart event
        document.getElementById('addToCart')
            .addEventListener('click', this.addProductToCart.bind(this));
    }

    addProductToCart() {
        // Get existing cart or default to empty array
        let cartItems = getLocalStorage('so-cart') || [];

        // Push current product into cart
        cartItems.push(this.product);

        // Save back to local storage
        setLocalStorage('so-cart', cartItems);

        console.log(`${this.product.Name} added to cart`);
    }

    renderProductDetails() {
        // Fill placeholders in index.html
        document.querySelector('.productBrand').textContent = this.product.Brand;
        document.querySelector('.productName').textContent = this.product.Name;
        document.querySelector('.productImage').src = this.product.Image;
        document.querySelector('.productPrice').textContent = `$${this.product.FinalPrice}`;
        document.querySelector('.productColor').textContent = this.product.Colors[0].ColorName;
        document.querySelector('.productDescription').textContent = this.product.Description;

        // Add product ID to button for reference
        document.getElementById('addToCart').dataset.id = this.product.Id;
    }
}
