const form = document.querySelector(".login-form");
const baseURL = import.meta.env.VITE_SERVER_URL || "";

if (form) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.querySelector("#email").value;
    const password = document.querySelector("#password").value;

    try {
      const endpoint = `${baseURL.replace(/\/$/, "")}/login`;
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      let data = {};
      try {
        data = await response.json();
      } catch (jsonErr) {
        // Fallback if backend doesn't return JSON
      }

      if (!response.ok) {
        throw new Error(data.message || `Login failed (${response.status})`);
      }

      console.log("Login successful:", data);

      if (data.token) {
        localStorage.setItem("authToken", data.token);
      }

      // Redirect after login (e.g., to home or checkout)
      window.location.href = "/";

    } catch (error) {
      console.error("Login failed:", error);
      alert(error.message);
    }
  });
}