import { loadHeaderFooter } from "./utils.mjs";

loadHeaderFooter().catch((error) => console.error("Could not load site chrome", error));
