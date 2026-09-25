export default class Alert {
  constructor(alert) {
    this.type = alert.type;
    this.message = alert.message;
  }

  render(parent) {
    const alertElement = document.createElement('div');

    alertElement.classList.add('alert', `alert-${this.type}`);

    alertElement.textContent = this.message;

    parent.appendChild(alertElement);
  }
}