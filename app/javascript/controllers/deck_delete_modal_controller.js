import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["modal", "form", "deckName"]

  open(event) {
    const trigger = event.currentTarget
    const deletePath = trigger.dataset.deletePath
    const deckTitle = trigger.dataset.deckTitle || "this deck"

    if (this.hasFormTarget && deletePath) {
      this.formTarget.action = deletePath
    }

    if (this.hasDeckNameTarget) {
      this.deckNameTarget.textContent = deckTitle
    }

    this.modalTarget.style.display = "flex"
    this.modalTarget.setAttribute("aria-hidden", "false")
  }

  close() {
    this.modalTarget.style.display = "none"
    this.modalTarget.setAttribute("aria-hidden", "true")
  }

  ignoreModalClick(event) {
    event.stopPropagation()
  }
}
