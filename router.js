const connections = {
  "/": "/about",
  "/about": "/poems",
  "/poems": "/gallery",
  "/gallery": "/",
};

const routes = {
  "/": "/pages/home.html",
  "/about": "/pages/about.html",
  "/poems": "/pages/poems.html",
  "/gallery": "/pages/gallery.html",
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
  if (path === "/") {
    body.classList.add("home");
  } else if (path === "/gallery") {
    body.classList.add("gallery");
  }

  app.classList.remove("fade-in");
  app.classList.add("fade-out");

  // 🔹 Photocard Exit Animation
  const photos = document.querySelectorAll(".floating-photo");
  if (photos.length > 0) {
    gsap.to(photos, {
      opacity: 0,
      scale: 2, // Larger explosion
      duration: 1.2, // Doubled duration
      stagger: {
        amount: 0.4,
        from: "random"
      },
      ease: "power2.inOut" // Smoother curve
    });
  }

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
          const originalNodes = Array.from(poem.childNodes);
          poem.innerHTML = "";

          const processNode = (node, parent) => {
            if (node.nodeType === Node.TEXT_NODE) {
              const text = node.textContent || "";
              const words = text.split(/(\s+)/).filter((word) => word.length > 0);
              words.forEach((word) => {
                const span = document.createElement("span");
                span.textContent = word;
                parent.appendChild(span);
              });
            } else if (node.nodeType === Node.ELEMENT_NODE) {
              if (node.tagName === "BR") {
                parent.appendChild(node.cloneNode(true));
              } else {
                const newElement = node.cloneNode(false);
                parent.appendChild(newElement);
                Array.from(node.childNodes).forEach((child) =>
                  processNode(child, newElement)
                );
              }
            }
          };

          originalNodes.forEach((node) => processNode(node, poem));

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

    // Load gallery if on the gallery page
    if (path === "/gallery" && typeof loadGallery === "function") {
      loadGallery();
    }

    // Re-initialize scroll effects after content loads
    if (typeof initScrollReveal === "function") {
      setTimeout(initScrollReveal, 100);
    }
  }, 200);
}
