import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = {
    timestamp: String,
    label: String,
    emptyMessage: String,
  }

  connect() {
    this.render()

    if (!this.hasTimestampValue) return
    this.timer = setInterval(() => this.render(), 30000)
  }

  disconnect() {
    if (this.timer) clearInterval(this.timer)
  }

  render() {
    const label = this.hasLabelValue ? this.labelValue : "Last created"
    const emptyMessage = this.hasEmptyMessageValue ? this.emptyMessageValue : "No decks created yet"

    if (!this.hasTimestampValue || !this.timestampValue) {
      this.element.textContent = emptyMessage
      return
    }

    const createdAtMs = Date.parse(this.timestampValue)
    if (Number.isNaN(createdAtMs)) {
      this.element.textContent = emptyMessage
      return
    }

    const diffMs = Math.max(0, Date.now() - createdAtMs)
    const minutes = Math.max(1, Math.floor(diffMs / 60000))
    const suffix = minutes === 1 ? "" : "s"
    this.element.textContent = `${label} ${minutes} min${suffix} ago`
  }
}
