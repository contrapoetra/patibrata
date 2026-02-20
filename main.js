import { router, navigateTo } from "./router.js";

gsap.registerPlugin(ScrollTrigger, ScrollSmoother);

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

function initScrollReveal() {
  const currentPath = window.location.pathname;
  nextPath = connections[currentPath];
  if (!nextPath) {
    // If there's no next path for reveal, we should still set up home page animations if it's the home page.
    if (currentPath === "/") {
      // Parallax for the Patibrata logo on the home page
      // Background moves slower (negative yPercent) creating depth illusion
      gsap.to(".patibrata-svg", {
        yPercent: -15,
        scale: 1.1,
        filter: "blur(20px)",
        ease: "none",
        scrollTrigger: {
          trigger: "#smooth-content",
          start: "top top",
          end: "bottom top",
          scrub: 0.5,
          scroller: "#smooth-content",
        },
      });
    }
    return;
  }

  ScrollTrigger.getAll().forEach((t) => t.kill());

  // Add the parallax effect for the logo only if on the home page and not during a reveal transition
  if (currentPath === "/") {
    gsap.to(".patibrata-svg", {
      yPercent: -15,
      scale: 1.1,
      filter: "blur(20px)",
      ease: "none",
      scrollTrigger: {
        trigger: "#smooth-content",
        start: "top top",
        end: "bottom top",
        scrub: 0.5,
        scroller: "#smooth-content",
      },
    });
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
}

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

  initScrollReveal();
}

/* =========================
   INIT
========================= */

router();
setTimeout(initScrollReveal, 300);
