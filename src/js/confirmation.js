try {
  const order = JSON.parse(sessionStorage.getItem("so-order"));
  if (order) document.querySelector("#confirmation-summary").textContent = `Order ${order.orderNumber} is confirmed. Total: $${Number(order.payload.total).toFixed(2)}.`;
} catch (error) { console.error("Could not read order confirmation", error); }
