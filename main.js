import { router, navigateTo } from "./router.js";

gsap.registerPlugin(ScrollTrigger, ScrollSmoother);

/* =========================
   TEXT ANIMATION
========================= */

function animatePoemText() {
  const poemContent = document.querySelector(".poem p");
  if (!poemContent) return;

  // Wrap each word in a span for animation
  const poems = document.querySelectorAll(".poem p");

  poems.forEach((poem) => {
    const text = poem.textContent;
    const words = text.split(" ");

    // Clear original text and wrap words in spans
    poem.innerHTML = "";
    words.forEach((word, index) => {
      const span = document.createElement("span");
      span.textContent = word + " ";
      span.style.display = "inline-block";
      poem.appendChild(span);
    });

    // Animate words on scroll
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

/* =========================
   PAGE CONNECTIONS
========================= */

const connections = {
  "/": "/about",
  "/about": "/poems",
  "/poems": "/",
};

/* =========================
   SMOOTHER
========================= */

ScrollSmoother.create({
  wrapper: "#smooth-wrapper",
  content: "#smooth-content",
  smooth: 1.2,
  effects: true,
});

/* =========================
   SPA LINK HANDLING
========================= */

document.addEventListener("click", (e) => {
  const link = e.target.closest("[data-link]");
  if (!link) return;

  e.preventDefault();
  navigateTo(new URL(link.href).pathname);
});

window.addEventListener("popstate", router);

/* =========================
   CIRCLE PORTAL REVEAL
========================= */

let overlay;
let nextPath;

function setupHomeParallax() {
  setTimeout(() => {
    const logo = document.querySelector(".parallax-logo");
    const slideTitle = document.querySelector("#slide-title");
    if (logo && slideTitle) {
      gsap.to(".parallax-logo", {
        yPercent: 15,
        ease: "none",
        scrollTrigger: {
          trigger: "#slide-title",
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
    }
    setupFallingLetters();
  }, 50);
}

// Store parallax handler for cleanup
let floatingPhotosHandler = null;

function setupFloatingPhotos() {
  const container = document.getElementById("floating-photos");
  const photos = document.querySelectorAll(".floating-photo");
  if (!container || photos.length === 0) return;

  // Show floating photos only on home page
  const currentPath = window.location.pathname;
  if (currentPath !== "/") {
    container.style.display = "none";
    return;
  }

  container.style.display = "block";

  // Get ScrollSmoother instance for scroll position
  const smoother = ScrollSmoother.get();

  // Remove old handler if exists
  if (floatingPhotosHandler) {
    gsap.ticker.remove(floatingPhotosHandler);
  }

  // Use gsap.ticker for smooth frame-by-frame updates
  floatingPhotosHandler = () => {
    const scrollY = smoother ? smoother.scrollTop() : window.scrollY;
    photos.forEach((photo) => {
      const speed = parseFloat(photo.dataset.speed) || 1.4;
      // Move UP faster than scroll to appear closer/foreground
      const parallaxY = -scrollY * (speed - 1);
      photo.style.transform = `translateY(${parallaxY}px)`;
    });
  };

  // Add to ticker for smooth animation on every frame
  gsap.ticker.add(floatingPhotosHandler);

  // Initial update
  floatingPhotosHandler();
}

function setupFallingLetters() {
  const title = document.querySelector("#title");
  if (!title) return;

  // Split text into individual letters
  const text = title.textContent.trim();
  title.innerHTML = "";

  const letters = text.split("").map((char, i) => {
    const span = document.createElement("span");
    span.textContent = char === " " ? "\u00A0" : char;
    span.style.display = "inline-block";
    span.style.position = "relative";
    span.style.zIndex = "2";
    return span;
  });

  letters.forEach((letter) => title.appendChild(letter));

  // Create falling animation for each letter with random delays and distances
  letters.forEach((letter, i) => {
    const randomDelay = Math.random() * 0.3;
    const randomDistance = 200 + Math.random() * 300;
    const randomRotation = (Math.random() - 0.5) * 60;

    gsap.to(letter, {
      y: randomDistance,
      rotation: randomRotation,
      opacity: 0,
      duration: 1.5 + Math.random() * 0.5,
      ease: "power1.in",
      scrollTrigger: {
        trigger: "#slide-title",
        start: "bottom bottom",
        end: "bottom top",
        scrub: 0.5 + Math.random() * 0.5,
      },
    });
  });
}

window.initScrollReveal = function initScrollReveal() {
  const currentPath = window.location.pathname;
  nextPath = connections[currentPath];

  // Kill only parallax-related ScrollTriggers, not poem animations
  ScrollTrigger.getAll().forEach((t) => {
    if (t.trigger && (
      t.trigger.classList?.contains("parallax-logo") ||
      t.trigger.classList?.contains("floating-photo") ||
      t.trigger.id === "slide-title" ||
      t.trigger.id === "smooth-content" ||
      t.trigger.id === "smooth-wrapper"
    )) {
      t.kill();
    }
  });

  // Setup floating photos (handles visibility based on page)
  setupFloatingPhotos();

  if (!nextPath) {
    // If there's no next path for reveal, we should still set up home page animations if it's the home page.
    if (currentPath === "/") {
      setupHomeParallax();
    }
    return;
  }

  // Add the parallax effect for the logo only if on the home page
  if (currentPath === "/") {
    setupHomeParallax();
  }

  if (overlay) overlay.remove();

  overlay = document.createElement("div");
  overlay.id = "reveal-overlay";
  document.body.appendChild(overlay);

  loadNextPageIntoOverlay();

  const maxRadius = Math.hypot(window.innerWidth, window.innerHeight);

  gsap.to(overlay, {
    clipPath: `circle(${maxRadius}px at 50% 100%)`,
    ease: "none",
    scrollTrigger: {
      trigger: "#smooth-content",
      start: "bottom bottom",
      end: "+=600",
      scrub: true,
      scroller: "#smooth-content",
      onUpdate: (self) => {
        if (self.progress >= 0.99) {
          finalizeReveal();
        }
      },
    },
  });
};

async function loadNextPageIntoOverlay() {
  const routePath =
    nextPath === "/" ? "/pages/home.html" : `/pages${nextPath}.html`;

  const res = await fetch(routePath);
  const html = await res.text();
  overlay.innerHTML = html;
}

function finalizeReveal() {
  history.pushState(null, null, nextPath);
  document.getElementById("app").innerHTML = overlay.innerHTML;

  overlay.remove();
  overlay = null;

  window.scrollTo(0, 0);

  // Re-init after a short delay to ensure DOM is ready
  setTimeout(initScrollReveal, 100);
}

/* =========================
   INIT
========================= */

router();
setTimeout(initScrollReveal, 300);
