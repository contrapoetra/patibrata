import { loadingManager, initApp } from "./main.js";

const connections = {
  "/": "/about",
  "/about": "/poems",
  "/poems": "/gallery",
  "/gallery": "/blog",
  "/blog": "/",
};

const routes = {
  "/": "/pages/home.html",
  "/about": "/pages/about.html",
  "/poems": "/pages/poems.html",
  "/gallery": "/pages/gallery.html",
  "/blog": "/pages/blog.html",
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

  // Show loader and disable scroll/menu
  loadingManager.show();

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
      // 🔹 Dynamic blog route
      if (path.startsWith("/blog/") && path !== "/blog") {
        const slug = path.replace("/blog/", "");

        const res = await fetch(`/pages/blog/${slug}.md`);
        if (!res.ok) throw new Error("Not found");

        const md = await res.text();

        app.innerHTML = `
          <div class="blog-post">
            <a href="/blog" data-link class="back-link">← Back to blog</a>
            ${marked.parse(md, { breaks: true })}
          </div>
        `;

        // Animate blog text (similar to poems but potentially more content)
        const blogContent = document.querySelectorAll(".blog-post p");
        blogContent.forEach((p) => {
          const originalNodes = Array.from(p.childNodes);
          p.innerHTML = "";

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
              } else if (node.tagName === "IMG") {
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

          originalNodes.forEach((node) => processNode(node, p));

          gsap.from(p.querySelectorAll("span, img"), {
            y: 20,
            opacity: 0,
            duration: 0.8,
            stagger: 0.01, // Faster stagger for blog
            ease: "power3.out",
            scrollTrigger: {
              trigger: p,
              start: "top bottom-=50",
              toggleActions: "play none none none",
            },
          });
        });
      }

      // 🔹 Dynamic poem route
      else if (path.startsWith("/poems/") && path !== "/poems") {
        const slug = path.replace("/poems/", "");

        const res = await fetch(`/pages/poems/${slug}.md`);
        if (!res.ok) throw new Error("Not found");

        let md = await res.text();

        // 🔹 Genius Annotation Parsing
        // Use unique markers that won't be interpreted as Markdown
        const annotations = [];
        md = md.replace(/\[\[([\s\S]*?)\|([\s\S]*?)\]\]/g, (match, verse, annotation) => {
          const id = annotations.length;
          annotations.push(annotation);
          return `MARKERSTART${id}${verse}MARKEREND${id}`;
        });

        let html = marked.parse(md, { breaks: true });

        // Replace markers with actual span tags, handling multi-stanza spans
        annotations.forEach((annotation, i) => {
          const startMarker = `MARKERSTART${i}`;
          const endMarker = `MARKEREND${i}`;
          const safeAnnotation = annotation.replace(/"/g, "&quot;");
          const spanStart = `<span class="annotated-verse" data-annotation="${safeAnnotation}">`;
          const spanEnd = `</span>`;
          
          // Regex to find the range between markers, including potential paragraph tags
          const regex = new RegExp(`${startMarker}([\\s\\S]*?)${endMarker}`, 'g');
          
          html = html.replace(regex, (match, content) => {
            // Close and reopen the span tag at paragraph/list boundaries to keep HTML valid
            let wrappedContent = content.replace(/(<\/p>|<p>|<li>|<\/li>|<br\s*\/?>)/g, (tag) => {
              if (tag.startsWith('</')) {
                return `${spanEnd}${tag}`;
              } else {
                return `${tag}${spanStart}`;
              }
            });
            return `${spanStart}${wrappedContent}${spanEnd}`;
          });
        });

        app.innerHTML = `
          <div class="poem">
            <a href="/poems" data-link class="back-link">← Back to collection</a>
            ${html}
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
                // Copy all attributes (crucial for annotations)
                Array.from(node.attributes).forEach(attr => {
                  newElement.setAttribute(attr.name, attr.value);
                });
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
    } catch (err) {
      console.error(err);
      app.innerHTML = `<pre>${err}</pre>`;
    }

    app.classList.remove("fade-out");
    app.classList.add("fade-in");

    // Initialize application logic for the current page
    await initApp();
  }, 200);
}
