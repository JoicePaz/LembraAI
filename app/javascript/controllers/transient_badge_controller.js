import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = {
    timeout: { type: Number, default: 3000 },
  }

  connect() {
    this.timer = setTimeout(() => {
      this.element.style.opacity = "0"
      setTimeout(() => {
        this.element.remove()
      }, 300)
    }, this.timeoutValue)
  }

  disconnect() {
    if (this.timer) clearTimeout(this.timer)
  }
}
