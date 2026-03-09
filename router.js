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

  // Update Page Title Mapping
  const pageTitles = {
    "/": "Patibrata",
    "/about": "About | Patibrata",
    "/poems": "Poems | Patibrata",
    "/gallery": "Gallery | Patibrata",
    "/blog": "Blog | Patibrata",
  };

  if (pageTitles[path]) {
    document.title = pageTitles[path];
  }

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
      pointerEvents: "none",
      duration: 1.2, // Doubled duration
      stagger: {
        amount: 0.4,
        from: "random"
      },
      ease: "power2.inOut", // Smoother curve
      onComplete: () => {
        const container = document.getElementById("floating-photos");
        if (container) container.style.display = "none";
      }
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

        // 🔹 Extract Title for Tab Title
        const titleMatch = md.match(/^#\s+(.+)$/m);
        if (titleMatch) {
          document.title = `${titleMatch[1]} | Patibrata`;
        } else {
          const formattedSlug = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          document.title = `${formattedSlug} | Blog | Patibrata`;
        }

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

        // 🔹 Extract Title for Tab Title
        const titleMatch = md.match(/^#\s+(.+)$/m);
        if (titleMatch) {
          document.title = `${titleMatch[1]} | Patibrata`;
        } else {
          const formattedSlug = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          document.title = `${formattedSlug} | Poems | Patibrata`;
        }

        // 🔹 Genius Annotation Parsing
        const annotations = [];

        // 1. Block Syntax: --- explanation --- verse ===
        // Capture leading newline and use === as the end marker
        md = md.replace(/(^|\n)---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*?)\n===/g, (match, leading, annotation, verse) => {
          const id = annotations.length;
          annotations.push(annotation.trim());
          // Keep the verse exactly as it is (including newlines) so marked handles stanzas
          return `${leading}MARKERSTART${id}${verse}MARKEREND${id}`;
        });

        // 2. Inline Syntax: [[verse|annotation]]
        md = md.replace(/\[\[([\s\S]*?)\|([\s\S]*?)\]\]/g, (match, verse, annotation) => {
          const id = annotations.length;
          annotations.push(annotation.trim());
          return `MARKERSTART${id}${verse}MARKEREND${id}`;
        });

        let html = marked.parse(md, { breaks: true });

        // Replace markers with actual span tags, handling multi-stanza spans
        annotations.forEach((annotation, i) => {
          const startMarker = `MARKERSTART${i}`;
          const endMarker = `MARKEREND${i}`;
          const safeAnnotation = encodeURIComponent(annotation);
          const spanStart = `<span class="annotated-verse" data-annotation="${safeAnnotation}">`;
          const spanEnd = `</span>`;
          
          // Regex to find the range between markers, including potential paragraph tags
          const regex = new RegExp(`${startMarker}([\\s\\S]*?)${endMarker}`, 'g');
          
          html = html.replace(regex, (match, content) => {
            // Close and reopen the span tag at any tag that breaks a line or block
            // This ensures valid HTML and correct highlighting scope.
            let wrappedContent = content.replace(/(<\/?[a-zA-Z0-9]+(?:\s+[^>]*?)?>)/g, (tag) => {
              // Tags that should break the span: p, br, div, li, ul, ol, h1-h6
              if (tag.match(/<\/?(p|br|div|li|ul|ol|h[1-6]|blockquote)(?:\s+[^>]*?)?>/i)) {
                if (tag.startsWith('</')) {
                  return `${spanEnd}${tag}`;
                } else if (tag.startsWith('<')) {
                  // Special case for self-closing tags like <br>
                  if (tag.match(/<br\s*\/?>/i)) {
                    return `${spanEnd}${tag}${spanStart}`;
                  }
                  return `${tag}${spanStart}`;
                }
              }
              return tag;
            });
            return `${spanStart}${wrappedContent}${spanEnd}`;
          });
        });

        app.innerHTML = `
          <div class="poem">
            <div class="poem-nav">
              <a href="/poems" data-link class="back-link">← Back to collection</a>
              <button id="toggle-annotations" class="toggle-btn" title="Toggle Highlights">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              </button>
            </div>
            ${html}
          </div>
        `;

        // Update toggle state
        const toggleBtn = document.getElementById('toggle-annotations');
        if (toggleBtn && !document.body.classList.contains('annotations-disabled')) {
          toggleBtn.classList.add('active');
        }

        // Animate poem text
        const poemContent = document.querySelectorAll(".poem > *:not(.poem-nav)");
        poemContent.forEach((el) => {
          const originalNodes = Array.from(el.childNodes);
          el.innerHTML = "";

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

          originalNodes.forEach((node) => processNode(node, el));

          gsap.from(el.querySelectorAll("span"), {
            y: 20,
            opacity: 0,
            duration: 0.8,
            stagger: 0.02,
            ease: "power3.out",
            scrollTrigger: {
              trigger: el,
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
