const REGISTER_CTA_KEY = "sleepOutsideRegisterDismissed";

function showRegistrationCTA() {
  if (localStorage.getItem(REGISTER_CTA_KEY)) {
    return;
  }

  const overlay = document.createElement("div");
  overlay.className = "register-cta-overlay";

  overlay.innerHTML = `
    <div class="register-cta" role="dialog" aria-modal="true" aria-labelledby="register-cta-title">
      <button class="register-cta__close" aria-label="Close registration offer"  type="button">
        &times;
      </button>

      <div class="register-cta__content">
        <h2 id="register-cta-title">Join SleepOutside!</h2>

        <p>
          Create an account today and get access to exclusive offers,
          updates, and our latest outdoor gear.
        </p>

       <p class="register-cta__giveaway">
        🎁 Register now for a chance to participate in our giveaway!
      </p>

        <a class="register-cta__button" href="/register/index.html">
           Register Now
        </a>

        <button class="register-cta__later">
          Maybe Later
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const closeButton = overlay.querySelector(".register-cta__close");
  const laterButton = overlay.querySelector(".register-cta__later");

  function closeCTA() {
    localStorage.setItem(REGISTER_CTA_KEY, "true");
    overlay.remove();
  }

  closeButton.addEventListener("click", closeCTA);
  laterButton.addEventListener("click", closeCTA);

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closeCTA();
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(showRegistrationCTA, 1500);
});