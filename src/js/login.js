const form = document.querySelector(".login-form");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.querySelector("#email").value;
  const password = document.querySelector("#password").value;

  console.log("Email:", email);
  console.log("Password:", password);
});