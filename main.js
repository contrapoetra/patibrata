import { router, navigateTo } from "./router.js";

document.addEventListener("click", (e) => {
  const link = e.target.closest("[data-link]");
  if (!link) return;

  e.preventDefault();
  navigateTo(link.href);
});

window.addEventListener("popstate", router);

router();
