

async function convertToJson(res) {
  const jsonResponse = await res.json();

  if (res.ok) {
    return jsonResponse;
  }

  throw {
    name: "servicesError",
    message: jsonResponse,
  };
}

const baseURL = import.meta.env.VITE_SERVER_URL;

export default class ExternalServices {
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
async checkout(order) {
    const response = await fetch(`${baseURL}checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(order),
    });

    return convertToJson(response);
  }
}
