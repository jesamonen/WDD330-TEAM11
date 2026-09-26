import Alert from "./Alert.js";

async function loadAlerts() {
  try {
    const response = await fetch("/json/alerts.json");

    if (!response.ok) {
      throw new Error("Could not load alerts");
    }

    const alerts = await response.json();

    const alertContainer = document.querySelector(".alert-list");

    if (!alertContainer) return;

    alerts.forEach((alertData) => {
      const alert = new Alert(alertData);
      alert.render(alertContainer);
    });
  } catch (error) {
    console.log(error.message);
  }
}

loadAlerts();
