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
  const body = document.body;

  if (!app) return;

  // Update body class based on current page
  body.className = "";

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

        // Animate poem text
        const poemContent = document.querySelectorAll(".poem p");
        poemContent.forEach((poem) => {
          // Process each child node (text nodes and br elements)
          const originalNodes = Array.from(poem.childNodes);
          poem.innerHTML = "";

          originalNodes.forEach((node) => {
            if (node.nodeType === Node.TEXT_NODE) {
              // Split text node by spaces and wrap words in spans
              const text = node.textContent || "";
              const words = text.match(/\S+\s*/g) || [];
              words.forEach((word) => {
                const span = document.createElement("span");
                span.textContent = word;
                poem.appendChild(span);
              });
            } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName === "BR") {
              // Keep <br> elements as-is
              poem.appendChild(node.cloneNode(true));
            }
          });

          gsap.from(poem.querySelectorAll("span"), {
            y: 20,
            opacity: 0,
            duration: 0.8,
            stagger: 0.02,
            ease: "power3.out",
            scrollTrigger: {
              trigger: poem,
              start: "top bottom-=100",
              toggleActions: "play none none none",
            },
          });
        });
      }

      // 🔹 Normal routes
      else if (routes[path]) {
        const res = await fetch(routes[path]);
        const html = await res.text();
        app.innerHTML = html;

        // Add body class for home page
        if (path === "/") {
          body.classList.add("home");
        }
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

    // Re-initialize scroll effects after content loads
    if (typeof initScrollReveal === "function") {
      setTimeout(initScrollReveal, 100);
    }
  }, 200);
}
