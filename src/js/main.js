import Alert from './Alert.js';
import ExternalServices from './ExternalServices.mjs';
import ProductList from './ProductList.mjs';
import { loadHeaderFooter } from './utils.mjs';

loadHeaderFooter();

async function loadTopProducts() {
  const listElement = document.querySelector('#top-products');

  if (!listElement) {
    return;
  }

  const dataSource = new ExternalServices();
  const productList = new ProductList('tents', dataSource, listElement);

  try {
    const list = await dataSource.getData('tents');
    productList.renderList(productList.filterList(list));
  } catch (error) {
    // homepage featured section is optional; skip silently if it fails
  }
}

async function loadAlerts() {
  try {
    const response = await fetch('/json/alerts.json');

    if (!response.ok) {
      throw new Error('Could not load alerts');
    }

    const alerts = await response.json();
    const alertContainer = document.querySelector('.alert-list');

    if (!alertContainer) {
      return;
    }

    alerts.forEach((alertData) => {
      const alert = new Alert(alertData);
      alert.render(alertContainer);
    });
  } catch (error) {
    // alerts are decorative; failing to load them is not fatal
  }
}

loadTopProducts();
loadAlerts();