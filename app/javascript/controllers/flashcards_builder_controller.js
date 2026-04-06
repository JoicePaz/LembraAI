import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["cards", "template", "card", "trackedInput", "clearButton", "confirmModal", "importInput", "titleInput", "descriptionInput", "importOverlay", "importStatus", "importSubmit", "form", "importPayload"]

  connect() {
    this.syncClearState()
  }

  add() {
    const nextNumber = this.cardTargets.length + 1
    const nextIndex = this.cardTargets.length
    const cardHtml = this.templateTarget.innerHTML
      .replaceAll("__NUMBER__", String(nextNumber))
      .replaceAll("__INDEX__", String(nextIndex))

    this.cardsTarget.insertAdjacentHTML("beforeend", cardHtml)
    this.renumber()
    this.syncClearState()
  }

  remove(event) {
    const cardElement = event.currentTarget.closest("[data-flashcards-builder-target='card']")
    if (!cardElement) return

    if (this.cardTargets.length === 1) {
      cardElement.querySelectorAll("input[type='text']").forEach((input) => {
        input.value = ""
      })
      this.syncClearState()
      return
    }

    cardElement.remove()
    this.renumber()
    this.syncClearState()
  }

  renumber() {
    this.cardTargets.forEach((card, index) => {
      const number = index + 1

      const numberNode = card.querySelector("[data-role='card-number']")
      if (numberNode) numberNode.textContent = String(number)

      const positionNode = card.querySelector("[data-role='card-position']")
      if (positionNode) positionNode.value = index

      const termInput = card.querySelector("[data-role='term-input']")
      const definitionInput = card.querySelector("[data-role='definition-input']")
      const requirePair = index === 0

      if (termInput) termInput.required = requirePair
      if (definitionInput) definitionInput.required = requirePair
    })
  }

  syncClearState() {
    if (!this.hasClearButtonTarget) return

    const disabled = !this.hasAnyText()
    this.clearButtonTarget.disabled = disabled
    this.clearButtonTarget.classList.toggle("opacity-50", disabled)
    this.clearButtonTarget.classList.toggle("cursor-not-allowed", disabled)
    this.clearButtonTarget.classList.toggle("ui-hover-gray-dark", !disabled)
  }

  requestClear() {
    if (this.clearButtonTarget.disabled || !this.hasConfirmModalTarget) return
    this.confirmModalTarget.style.display = "flex"
    this.confirmModalTarget.setAttribute("aria-hidden", "false")
  }

  cancelClear() {
    if (!this.hasConfirmModalTarget) return
    this.confirmModalTarget.style.display = "none"
    this.confirmModalTarget.setAttribute("aria-hidden", "true")
  }

  ignoreModalClick(event) {
    event.stopPropagation()
  }

  confirmClear() {
    this.trackedInputTargets.forEach((input) => {
      input.value = ""
    })
    this.cancelClear()
    this.syncClearState()
  }

  hasAnyText() {
    return this.trackedInputTargets.some((input) => input.value.trim().length > 0)
  }

  submitWithDelay(event) {
    const button = event.currentTarget
    const form = button.form
    if (!form) return

    if (!form.checkValidity()) {
      form.reportValidity()
      return
    }

    if (button.dataset.loading === "true") {
      event.preventDefault()
      return
    }

    event.preventDefault()
    button.dataset.loading = "true"
    button.disabled = true
    button.classList.add("opacity-80")

    const loadingLabel = button.dataset.loadingLabel || "Saving..."
    button.innerHTML = `<span style="display:inline-flex;align-items:center;gap:.5rem;"><svg style="width:1rem;height:1rem;animation: uiSpin 1s linear infinite;" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-opacity="0.25" stroke-width="2"></circle><path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path></svg>${loadingLabel}</span>`

    setTimeout(() => {
      form.requestSubmit(button)
    }, 1000)
  }

  openImport() {
    if (!this.hasImportInputTarget) return
    this.hideImportStatus()
    this.importInputTarget.click()
  }

  handleImport(event) {
    const file = event.target.files?.[0]
    if (!file) return

    this.showImportOverlay()

    const isJsonFile =
      file.name.toLowerCase().endsWith(".json") ||
      file.type === "application/json" ||
      file.type === "text/json"

    if (!isJsonFile) {
      this.hideImportOverlay()
      this.showImportStatus("Wrong template format", true)
      event.target.value = ""
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const rawContent = String(reader.result || "")
        this.parseImportFile(file.name, rawContent)

        if (this.hasImportPayloadTarget) {
          this.importPayloadTarget.value = rawContent
        }

        if (this.hasImportSubmitTarget && this.hasFormTarget) {
          this.importSubmitTarget.click()
        }
      } catch (error) {
        this.hideImportOverlay()
        this.showImportStatus("Wrong template format", true)
      } finally {
        event.target.value = ""
      }
    }
    reader.onerror = () => {
      this.hideImportOverlay()
      this.showImportStatus("Wrong template format", true)
      event.target.value = ""
    }
    reader.readAsText(file)
  }

  parseImportFile(fileName, content) {
    const lower = fileName.toLowerCase()
    if (lower.endsWith(".json")) {
      return this.parseJsonImport(content)
    }

    throw new Error("Unsupported file type. Use JSON.")
  }

  parseJsonImport(content) {
    let payload
    try {
      payload = JSON.parse(content)
    } catch (_error) {
      throw new Error("Invalid JSON file.")
    }

    const data = this.normalizeImportPayload(payload)
    if (data.flashcards.length === 0) {
      throw new Error("Wrong template format")
    }
    return data
  }

  normalizeImportPayload(payload) {
    if (!(payload && typeof payload === "object" && Array.isArray(payload.decks) && payload.decks.length > 0)) {
      throw new Error("Wrong template format")
    }

    const decks = payload.decks.map((deck) => {
      if (!(deck && typeof deck === "object" && Array.isArray(deck.flashcards))) {
        throw new Error("Wrong template format")
      }

      const flashcards = deck.flashcards.map((card) => {
        if (!(card && typeof card === "object" && "term" in card && "definition" in card)) {
          throw new Error("Wrong template format")
        }

        return {
          term: String(card.term ?? "").trim(),
          definition: String(card.definition ?? "").trim(),
        }
      }).filter((card) => card.term || card.definition)

      if (flashcards.length === 0) {
        throw new Error("Wrong template format")
      }

      return {
        title: String(deck.title ?? "").trim(),
        description: String(deck.description ?? "").trim(),
        flashcards,
      }
    })

    return {
      decks,
      flashcards: decks[0]?.flashcards || [],
    }
  }

  showImportOverlay() {
    if (!this.hasImportOverlayTarget) return
    this.importOverlayTarget.style.display = "flex"
    this.importOverlayTarget.setAttribute("aria-hidden", "false")
  }

  hideImportOverlay() {
    if (!this.hasImportOverlayTarget) return
    this.importOverlayTarget.style.display = "none"
    this.importOverlayTarget.setAttribute("aria-hidden", "true")
  }

  showImportStatus(message, isError) {
    if (!this.hasImportStatusTarget) return
    this.importStatusTarget.textContent = message
    this.importStatusTarget.style.display = "inline"
    this.importStatusTarget.style.color = isError ? "#ea580c" : "#fd6400"

    if (this.importStatusTimer) clearTimeout(this.importStatusTimer)
    this.importStatusTimer = setTimeout(() => this.hideImportStatus(), 3000)
  }

  hideImportStatus() {
    if (!this.hasImportStatusTarget) return
    this.importStatusTarget.style.display = "none"
    this.importStatusTarget.textContent = ""
  }
}
