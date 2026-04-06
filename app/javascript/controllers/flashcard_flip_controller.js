import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["inner", "counter", "button"]
  static values = { cards: Array }

  connect() {
    this.cards = this.cardsValue.length > 0 ? this.cardsValue : []
    this.index = 0
    this._flipped = false
    this.renderCard()
    this.updateCounter()
  }

  disconnect() {
    clearTimeout(this.animationTimeout)
    clearTimeout(this.tapTimeout)
  }

  toggle() {
    if (!this._flipped) {
      this.flipToBack()
      this.playTapAnimation()
      return
    }

    this.goTo(this.wrapIndex(this.index + 1), 1, true)
  }

  next(event) {
    event.preventDefault()
    this.goTo(this.wrapIndex(this.index + 1), 1)
  }

  prev(event) {
    event.preventDefault()
    this.goTo(this.wrapIndex(this.index - 1), -1)
  }

  goTo(index, direction, fromCardInteraction = false) {
    this._flipped = false
    this.innerTarget.dataset.flipped = "false"
    this.buttonTarget.setAttribute("aria-pressed", "false")
    this.buttonTarget.setAttribute("aria-label", "Flip card to show answer")
    this.index = index
    this.renderCard()
    this.updateCounter()
    this.playSwapAnimation(direction, fromCardInteraction)
  }

  flipToBack() {
    this._flipped = true
    this.innerTarget.dataset.flipped = "true"
    this.buttonTarget.setAttribute("aria-pressed", "true")
    this.buttonTarget.setAttribute("aria-label", "Flip card to show next question")
  }

  renderCard() {
    const card = this.currentCard()
    const front = this.innerTarget.querySelector("[data-role='front-text']")
    const back = this.innerTarget.querySelector("[data-role='back-text']")
    if (front) front.textContent = card.front
    if (back) back.textContent = card.back
  }

  updateCounter() {
    if (!this.hasCounterTarget || this.cards.length <= 1) return
    this.counterTarget.textContent = `Card ${this.index + 1} of ${this.cards.length}`
  }

  playSwapAnimation(direction, fromCardInteraction = false) {
    const baseClass = direction < 0 ? "flashcard-swap-prev" : "flashcard-swap-next"
    const animationClass = fromCardInteraction ? `${baseClass}-card` : baseClass
    this.element.classList.remove(
      "flashcard-swap-next",
      "flashcard-swap-prev",
      "flashcard-swap-next-card",
      "flashcard-swap-prev-card"
    )
    void this.element.offsetWidth
    this.element.classList.add(animationClass)
    clearTimeout(this.animationTimeout)
    this.animationTimeout = setTimeout(() => {
      this.element.classList.remove(animationClass)
    }, 340)
  }

  playTapAnimation() {
    this.element.classList.remove("flashcard-tap")
    void this.element.offsetWidth
    this.element.classList.add("flashcard-tap")
    clearTimeout(this.tapTimeout)
    this.tapTimeout = setTimeout(() => {
      this.element.classList.remove("flashcard-tap")
    }, 260)
  }

  currentCard() {
    if (this.cards.length === 0) {
      return { front: "", back: "" }
    }
    return this.cards[this.index]
  }

  wrapIndex(index) {
    if (this.cards.length === 0) return 0
    return (index + this.cards.length) % this.cards.length
  }
}
