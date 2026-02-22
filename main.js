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

// Detect mobile for performance optimization
const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;

ScrollSmoother.create({
  wrapper: "#smooth-wrapper",
  content: "#smooth-content",
  smooth: isMobileDevice ? 0.5 : 1.2, // Less smooth on mobile = less lag
  effects: !isMobileDevice, // Disable effects on mobile for better performance
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

// Available photocards
const photocards = [
  "IMG20251220125211.jpg", "IMG20251220125221.jpg", "IMG20251231193021.jpg",
  "IMG20260107111310.jpg", "IMG20260107111319.jpg", "IMG20260108163626.jpg",
  "IMG20260108163922.jpg", "IMG20260108164456.jpg", "IMG20260108164858.jpg",
  "IMG20260108165023.jpg", "IMG20260108165303.jpg", "IMG20260111232548.jpg",
  "IMG20260113213603.jpg", "IMG20260120172111.jpg", "IMG20260120173209.jpg",
  "IMG20260120173234.jpg", "IMG20260120174108.jpg", "IMG20260120174207.jpg",
  "IMG20260120174421.jpg", "IMG20260120174453.jpg", "IMG20260125112742.jpg",
  "IMG20260126141239.jpg", "IMG20260127134517.jpg", "IMG20260127134528.jpg",
  "IMG20260127134555.jpg", "IMG20260127141112.jpg", "IMG20260127141454.jpg",
  "IMG20260127141648.jpg", "IMG20260127141655.jpg", "IMG20260127141710.jpg",
  "IMG20260127141719.jpg", "IMG20260127141732.jpg", "IMG20260127141736.jpg",
  "IMG20260127141942.jpg", "IMG20260127142014.jpg", "IMG20260127142538.jpg",
  "IMG20260127142626.jpg", "IMG20260127142630.jpg", "IMG20260127142640.jpg",
  "IMG20260127143549.jpg", "IMG20260127143609.jpg", "IMG20260127143646.jpg",
  "IMG20260127143709.jpg", "IMG20260127144022.jpg", "IMG20260127144303.jpg",
  "IMG20260127144308.jpg", "IMG20260127144330.jpg", "IMG20260127144359.jpg",
  "IMG20260127144803.jpg", "IMG20260127161809.jpg", "IMG20260127161815.jpg",
  "IMG20260127161821.jpg", "IMG_20260127_150250_DRO.jpg", "IMG_20260127_150053.jpg",
  "IMG_20260127_150311.jpg"
];

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

  // Shuffle photocards and pick 8 unique ones
  const shuffled = [...photocards].sort(() => Math.random() - 0.5);
  const selectedCards = shuffled.slice(0, photos.length);

  // Predefined speeds - some faster, some slower
  const speeds = [1.3, 1.5, 1.4, 1.6, 1.35, 1.55, 1.45, 1.5];

  // Assign random sizes and photocards
  const isMobile = window.innerWidth <= 768;
  photos.forEach((photo, index) => {
    // Set the image
    photo.style.backgroundImage = `url(/assets/photocards/${selectedCards[index]})`;
    photo.style.backgroundSize = "cover";
    photo.style.backgroundPosition = "center";

    // Set speed from predefined array (faster = more blur & bigger)
    const speed = speeds[index];
    photo.dataset.speed = speed;

    // Add blur based on speed - faster = more blur (max 4px)
    const blur = Math.round((speed - 1.3) * 20); // 0-6px range
    photo.style.backdropFilter = `blur(${blur}px)`;
    photo.style.webkitBackdropFilter = `blur(${blur}px)`;

    // Size based on speed - width sets the scale, height auto to preserve aspect ratio
    const baseWidth = isMobile ? 90 : 180;
    const sizeMultiplier = 1 + (speed - 1.3) * 1.8;
    const width = Math.round(baseWidth * sizeMultiplier);

    photo.style.width = `${width}px`;
    photo.style.height = "auto";
  });

  // Get ScrollSmoother instance for scroll position
  const smoother = ScrollSmoother.get();

  // Remove old handler if exists
  if (floatingPhotosHandler) {
    gsap.ticker.remove(floatingPhotosHandler);
  }

  // Assign rotation speed and calculate when each photo enters viewport
  photos.forEach((photo) => {
    photo._rotationSpeed = gsap.utils.random(-0.05, 0.05, 0.01);
    // Get the scroll position where this photo starts to become visible
    const topPercent = parseFloat(photo.style.top) / 100;
    photo._startY = window.innerHeight * topPercent;
  });

  // Use gsap.ticker for smooth frame-by-frame updates
  floatingPhotosHandler = () => {
    const scrollY = smoother ? smoother.scrollTop() : window.scrollY;
    photos.forEach((photo) => {
      const speed = parseFloat(photo.dataset.speed) || 1.4;
      // Move UP faster than scroll to appear closer/foreground
      const parallaxY = -scrollY * (speed - 1);

      // Only rotate after the photo starts entering the viewport
      const rotationStart = Math.max(0, scrollY - photo._startY + window.innerHeight * 0.5);
      const rotation = rotationStart * photo._rotationSpeed;

      photo.style.transform = `translateY(${parallaxY}px) rotate(${rotation}deg)`;
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
