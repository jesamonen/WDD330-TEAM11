export async function loadFooter() {
  const footer = document.querySelector("footer");

  if (!footer) return;

  try {
    const response = await fetch("/partials/footer.html");

    if (!response.ok) {
      throw new Error("Could not load footer");
    }

    footer.innerHTML = await response.text();
  } catch (error) {
    console.error("Footer error:", error);
  }
}

loadFooter();