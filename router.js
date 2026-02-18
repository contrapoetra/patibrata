const connections = {
  "/": "/about",
  "/about": "/contact",
  "/contact": "/poems",
  "/poems": "/",
};

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
  const app = document.getElementById("app");

  if (!app) return;

  app.classList.remove("fade-in");
  app.classList.add("fade-out");

  setTimeout(async () => {
    try {
      // 🔹 Dynamic poem route
      if (path.startsWith("/poems/") && path !== "/poems") {
        const slug = path.replace("/poems/", "");

        const res = await fetch(`/pages/poems/${slug}.md`);
        if (!res.ok) throw new Error("Not found");

        const md = await res.text();

        app.innerHTML = `
          <div class="poem">
            <a href="/poems" data-link class="back-link">← Back to collection</a>
            ${marked.parse(md, { breaks: true })}
          </div>
        `;
      }

      // 🔹 Normal routes
      else if (routes[path]) {
        const res = await fetch(routes[path]);
        const html = await res.text();
        app.innerHTML = html;
      }

      // 🔹 404
      else {
        app.innerHTML = `
          <h1>404</h1>
          <p>Page not found.</p>
        `;
      }
      // } catch {
      //   app.innerHTML = `
      //     <h1>Error</h1>
      //     <p>Something went wrong.</p>
      //   `;
      // }
    } catch (err) {
      console.error(err);
      app.innerHTML = `<pre>${err}</pre>`;
    }

    app.classList.remove("fade-out");
    app.classList.add("fade-in");
  }, 200);
}
