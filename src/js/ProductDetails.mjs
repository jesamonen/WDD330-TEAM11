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
    }

    // Method to expose the loaded product object to product.js
    getProduct() {
        return this.product;
    }

    renderProductDetails() {
        if (!this.product) {
            console.error('No product found for ID:', this.productId);
            return;
        }

        // 1. Access Brand.Name (Brand is a nested object in JSON)
        document.querySelector('.productBrand').textContent = this.product.Brand.Name;

        // 2. Prevent double brand names in the title
        document.querySelector('.productName').textContent = this.product.NameWithoutBrand || this.product.Name;

        // 3. Set image src and alt attributes
        const img = document.querySelector('.productImage');
        img.src = this.product.Image;
        img.alt = this.product.NameWithoutBrand || this.product.Name;

        // 4. Set price and primary color
        document.querySelector('.productPrice').textContent = `$${this.product.FinalPrice}`;
        document.querySelector('.productColor').textContent = this.product.Colors[0].ColorName;

        // 5. Use innerHTML to parse HTML tags inside DescriptionHtmlSimple
        document.querySelector('.productDescription').innerHTML = this.product.DescriptionHtmlSimple;

        // 6. Set dataset ID on the button
        const addBtn = document.getElementById('addToCart');
        if (addBtn) {
            addBtn.dataset.id = this.product.Id;
        }
    }
}