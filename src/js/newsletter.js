const NEWSLETTER_KEY = "sleepOutsideNewsletter";

const newsletterForm = document.querySelector("#newsletter-form");
const newsletterMessage = document.querySelector("#newsletter-message");

if (newsletterForm && newsletterMessage) {
  newsletterForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const emailInput = document.querySelector("#newsletter-email");
    const email = emailInput.value.trim();

    if (!email) {
      newsletterMessage.textContent = "Please enter your email address.";
      return;
    }

    localStorage.setItem(NEWSLETTER_KEY, email);

    newsletterMessage.textContent =
      "Thank you for subscribing to our newsletter!";

    newsletterForm.reset();
  });
}