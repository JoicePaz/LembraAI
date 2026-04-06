import "@hotwired/turbo-rails"
import "controllers"

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/" })
  })
}
