import { Controller } from "@hotwired/stimulus"

const STORAGE_KEY = "lembraai:pwa-banner-dismissed"

export default class extends Controller {
  static targets = ["banner", "iosHint", "androidHint", "installButton"]

  connect() {
    this.beforeInstallPromptEvent = null
    this.handleBeforeInstallPrompt = this.onBeforeInstallPrompt.bind(this)
    this.handleAppInstalled = this.onAppInstalled.bind(this)

    window.addEventListener("beforeinstallprompt", this.handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", this.handleAppInstalled)

    if (this.dismissed() || this.isStandalone()) {
      this.hide()
      return
    }

    if (this.isIos()) {
      if (this.hasIosHintTarget) this.iosHintTarget.style.display = "block"
      this.show()
      return
    }

    if (this.isAndroid()) {
      if (this.hasAndroidHintTarget) this.androidHintTarget.style.display = "flex"
      this.show()
      return
    }

    this.hide()
  }

  disconnect() {
    window.removeEventListener("beforeinstallprompt", this.handleBeforeInstallPrompt)
    window.removeEventListener("appinstalled", this.handleAppInstalled)
  }

  async install() {
    if (!this.beforeInstallPromptEvent) return

    this.beforeInstallPromptEvent.prompt()
    await this.beforeInstallPromptEvent.userChoice
    this.beforeInstallPromptEvent = null

    if (this.hasInstallButtonTarget) {
      this.installButtonTarget.style.display = "none"
    }
  }

  dismiss() {
    this.saveDismissed()
    this.hide()
  }

  onBeforeInstallPrompt(event) {
    event.preventDefault()
    this.beforeInstallPromptEvent = event

    if (this.isAndroid() && this.hasInstallButtonTarget) {
      this.installButtonTarget.style.display = "inline-flex"
      this.show()
    }
  }

  onAppInstalled() {
    this.hide()
  }

  dismissed() {
    return window.localStorage.getItem(STORAGE_KEY) === "1"
  }

  saveDismissed() {
    window.localStorage.setItem(STORAGE_KEY, "1")
  }

  show() {
    if (!this.hasBannerTarget) return
    this.bannerTarget.style.display = "block"
  }

  hide() {
    if (!this.hasBannerTarget) return
    this.bannerTarget.style.display = "none"
  }

  isStandalone() {
    const iosStandalone = window.navigator.standalone === true
    const displayStandalone = window.matchMedia("(display-mode: standalone)").matches
    return iosStandalone || displayStandalone
  }

  isIos() {
    const ua = window.navigator.userAgent.toLowerCase()
    const isAppleDevice = /iphone|ipad|ipod/.test(ua)
    const isWebKit = /safari/.test(ua) && !/crios|fxios|edgios|opios/.test(ua)
    return isAppleDevice && isWebKit
  }

  isAndroid() {
    return /android/i.test(window.navigator.userAgent)
  }
}
