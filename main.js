import { router, navigateTo } from "./router.js"

// Intercept link clicks
document.addEventListener("click", e => {
  if (e.target.matches("[data-link]")) {
    e.preventDefault()
    navigateTo(e.target.href)
  }
})

// Handle browser back/forward
window.addEventListener("popstate", router)

// Initial load
router()

