import { getParam } from './utils.mjs';
import ProductData from './ProductData.mjs';
import ProductDetails from './ProductDetails.mjs';

// 1. Get product ID from the URL (?product=ID)
const productId = getParam('product');

// 2. Create a data source for tents
const dataSource = new ProductData('tents');

// 3. Create ProductDetails instance and initialize
const product = new ProductDetails(productId, dataSource);
product.init();
