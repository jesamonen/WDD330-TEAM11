function convertToJson(res) {
  if (res.ok) {
    return res.json();
  }

  throw new Error("Bad Response");
}

const baseURL = import.meta.env.VITE_SERVER_URL;

export default class ProductData {
  async getData(category) {
    const response = await fetch(
      `${baseURL}products/search/${category}`,
    );

    const data = await convertToJson(response);

    return data.Result;
  }

  async findProductById(id) {
    const response = await fetch(
      `${baseURL}product/${id}`,
    );

    const data = await convertToJson(response);

    return data.Result;
  }

  async searchProducts(searchTerm) {
    const categories = [
      "tents",
      "backpacks",
      "sleeping-bags",
      "hammocks",
    ];

    const search = searchTerm.toLowerCase().trim();

    const results = [];

    for (const category of categories) {
      const products = await this.getData(category);

      const categoryName = category.toLowerCase();

      const categoryMatches =
        categoryName.includes(search) ||
        search.includes(categoryName.replace("-", " "));

      if (categoryMatches) {
        results.push(...products);
        continue;
      }

      const matches = products.filter((product) => {
        const productName = product.Name.toLowerCase();
        const brandName = product.Brand.Name.toLowerCase();

        return (
          productName.includes(search) ||
          brandName.includes(search)
        );
      });

      results.push(...matches);
    }

    return results;
  }
}