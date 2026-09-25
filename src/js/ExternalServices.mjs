function convertToJson(res) {
  if (res.ok) {
    return res.json();
  }

  if (res.status === 404) {
    throw new Error('Resource not found');
  }

  // attempt to read the server's error payload and surface it to the UI
  return res.json().then((data) => {
    throw new Error(JSON.stringify(data));
  });
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
    const response = await fetch(`${baseURL}product/${id}`);
    const data = await convertToJson(response);
    return data.Result;
  }

  async checkout(payload) {
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    };

    const response = await fetch(`${baseURL}checkout/`, options);
    return await convertToJson(response);
  }
}