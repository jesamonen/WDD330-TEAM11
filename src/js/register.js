const form = document.querySelector(".register-form");

const baseURL = import.meta.env.VITE_SERVER_URL;

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = document.querySelector("#name").value;
  const email = document.querySelector("#email").value;
  const address = document.querySelector("#address").value;
  const password = document.querySelector("#password").value;

  try {
    const response = await fetch(`${baseURL}users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        email,
        address,
        password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Registration failed");
    }

    console.log("Registration successful:", data);

    alert("Registration successful!");


    window.location.href = "/login/";
  } catch (error) {
    console.error("Registration failed:", error);
    alert(error.message);
  }
});