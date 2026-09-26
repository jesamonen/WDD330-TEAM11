import ExternalServices from "./ExternalServices.mjs";

const dataSource = new ExternalServices();

function setupSearch() {
  const searchForm = document.querySelector("#navbar-search");
  const searchInput = document.querySelector("#navbar-search-input");

  if (!searchForm || !searchInput) {
    console.log("Search form not found.");
    return;
  }

  searchForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const searchTerm = searchInput.value.trim().toLowerCase();

    if (!searchTerm) {
      return;
    }

    try {
      const categories = [
        "tents",
        "backpacks",
        "sleeping-bags",
        "hammocks",
      ];

      const results = [];

      for (const category of categories) {
        const products = await dataSource.getData(category);

        const categoryMatch =
          category.includes(searchTerm) ||
          category.replace("-", " ").includes(searchTerm);

        if (categoryMatch) {
          results.push(...products);
          continue;
        }

        const matches = products.filter((product) => {
          const productName = product.Name.toLowerCase();
          const brandName = product.Brand.Name.toLowerCase();

          return (
            productName.includes(searchTerm) ||
            brandName.includes(searchTerm)
          );
        });

        results.push(...matches);
      }

      if (results.length === 0) {
        alert(`No products found for "${searchTerm}".`);
        return;
      }

      sessionStorage.setItem(
        "search-results",
        JSON.stringify(results),
      );

      window.location.href = "/search.html";
    } catch (error) {
      console.error("Search failed:", error);
      alert("Sorry, the search could not be completed.");
    }
  });
}

// The header is loaded by header.js
document.addEventListener("headerLoaded", setupSearch);


setupSearch();