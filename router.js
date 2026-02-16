const routes = {
  "/": "/pages/home.html",
  "/about": "/pages/about.html",
  "/contact": "/pages/contact.html",
  "/poems": "/pages/poems.html",
};

export function navigateTo(url) {
  history.pushState(null, null, url);
  router();
}

export async function router() {
  const path = window.location.pathname;
  const route = routes[path] || routes["/"];

  const app = document.getElementById("app");

  app.classList.remove("fade-in");
  app.classList.add("fade-out");

  setTimeout(async () => {
    const html = await fetch(route).then((res) => res.text());
    app.innerHTML = html;

    app.classList.remove("fade-out");
    app.classList.add("fade-in");
  }, 200);
}
