export async function loadHeader() {
  const header = document.querySelector("header");

  if (!header) return;

  try {
    const response = await fetch("/partials/header.html");

    if (!response.ok) {
      throw new Error("Could not load header");
    }

    header.innerHTML = await response.text();

    document.dispatchEvent(new CustomEvent("headerLoaded"));
  } catch (error) {
    console.error("Header error:", error);
  }
}

loadHeader();