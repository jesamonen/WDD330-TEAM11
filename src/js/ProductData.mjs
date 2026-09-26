function convertToJson(res) {
  if (res.ok) {
    return res.json();
  }

  throw new Error("Bad Response");
}


const baseURL = import.meta.env.VITE_SERVER_URL;


export default class ProductData {

  async getData(category) {
    try {
      const response = await fetch(`${baseURL}products/search/${category}`);
      const data = await convertToJson(response);
      if (Array.isArray(data.Result) && data.Result.length) return data.Result;
    } catch (error) {
      console.warn("Product API unavailable; using local catalog.", error);
    }
    if (!["tents", "backpacks", "sleeping-bags"].includes(category)) return [];
    const response = await fetch(`/json/${category}.json`);
    return await convertToJson(response);
  }


  async findProductById(id) {
    const response = await fetch(
      `${baseURL}product/${id}`
    );

    const data = await convertToJson(response);

    return data.Result;
  }
}
