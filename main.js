import { router, navigateTo } from "./router.js";

gsap.registerPlugin(ScrollTrigger, ScrollSmoother);

/* =========================
   MOBILE VIEWPORT HEIGHT FIX
========================= */

// Fix for mobile browsers where 100vh doesn't account for browser chrome
function setViewportHeight() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty("--vh", `${vh}px`);
}

// Set on load and resize
setViewportHeight();
window.addEventListener("resize", setViewportHeight);

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
  "/poems": "/gallery",
  "/gallery": "/",
};

/* =========================
   SMOOTHER
========================= */

// Detect mobile for performance optimization
const isMobileDevice =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  ) || window.innerWidth <= 768;

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
  "IMG20251220125211.jpg",
  "IMG20251220125221.jpg",
  "IMG20251231193021.jpg",
  "IMG20260107111310.jpg",
  "IMG20260107111319.jpg",
  "IMG20260108163626.jpg",
  "IMG20260108163922.jpg",
  "IMG20260108164456.jpg",
  "IMG20260108164858.jpg",
  "IMG20260108165023.jpg",
  "IMG20260108165303.jpg",
  "IMG20260111232548.jpg",
  "IMG20260113213603.jpg",
  "IMG20260120172111.jpg",
  "IMG20260120173209.jpg",
  "IMG20260120173234.jpg",
  "IMG20260120174108.jpg",
  "IMG20260120174207.jpg",
  "IMG20260120174421.jpg",
  "IMG20260120174453.jpg",
  "IMG20260125112742.jpg",
  "IMG20260126141239.jpg",
  "IMG20260127134517.jpg",
  "IMG20260127134528.jpg",
  "IMG20260127134555.jpg",
  "IMG20260127141112.jpg",
  "IMG20260127141454.jpg",
  "IMG20260127141648.jpg",
  "IMG20260127141655.jpg",
  "IMG20260127141710.jpg",
  "IMG20260127141719.jpg",
  "IMG20260127141732.jpg",
  "IMG20260127141736.jpg",
  "IMG20260127141942.jpg",
  "IMG20260127142014.jpg",
  "IMG20260127142538.jpg",
  "IMG20260127142626.jpg",
  "IMG20260127142630.jpg",
  "IMG20260127142640.jpg",
  "IMG20260127143549.jpg",
  "IMG20260127143609.jpg",
  "IMG20260127143646.jpg",
  "IMG20260127143709.jpg",
  "IMG20260127144022.jpg",
  "IMG20260127144303.jpg",
  "IMG20260127144308.jpg",
  "IMG20260127144330.jpg",
  "IMG20260127144359.jpg",
  "IMG20260127144803.jpg",
  "IMG20260127161809.jpg",
  "IMG20260127161815.jpg",
  "IMG20260127161821.jpg",
  "IMG_20260127_150250_DRO.jpg",
  "IMG_20260127_150053.jpg",
  "IMG_20260127_150311.jpg",
];

function setupFloatingPhotos() {
  const container = document.getElementById("floating-photos");
  const photos = document.querySelectorAll(".floating-photo");
  if (!container || photos.length === 0) return;

  // Always show on home page
  container.style.display = "block";
  container.style.visibility = "visible";
  container.style.opacity = "1";

  // Check path - hide on other pages
  const currentPath = window.location.pathname;
  if (currentPath !== "/") {
    container.style.visibility = "hidden";
    return;
  }

  // Shuffle photocards and pick 8 unique ones
  const shuffled = [...photocards].sort(() => Math.random() - 0.5);
  const selectedCards = shuffled.slice(0, photos.length);

  // Predefined speeds - some faster, some slower
  const speeds = [1.3, 1.5, 1.4, 1.6, 1.35, 1.55, 1.45, 1.5];

  // Assign sizes and photocards
  const isMobile = window.innerWidth <= 768;

  // Load images to get their natural aspect ratios
  const loadImage = (src) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = () => resolve({ width: 100, height: 100 }); // fallback
      img.src = src;
    });
  };

  // Process all images and then set up
  Promise.all(
    selectedCards.map((card) => loadImage(`/assets/photocards/${card}`)),
  ).then((dimensions) => {
    photos.forEach((photo, index) => {
      // Set the image
      photo.style.backgroundImage = `url(/assets/photocards/${selectedCards[index]})`;
      photo.style.backgroundSize = "cover";
      photo.style.backgroundPosition = "center";

      // Set speed from predefined array
      const speed = speeds[index];
      photo.dataset.speed = speed;

      // Add subtle blur based on speed (reduced range) - DISABLED on mobile for performance
      if (!isMobile) {
        const blur = Math.round((speed - 1.3) * 8); // 0-2.5px range - subtle
        photo.dataset.baseBlur = blur;
        photo.style.filter = `blur(${blur}px)`;
        photo.style.webkitFilter = `blur(${blur}px)`;
      }

      // GPU acceleration hint
      photo.style.willChange = "transform";

      // Enable pointer events for hover
      photo.style.pointerEvents = "auto";

      // Calculate size based on image's natural aspect ratio
      const baseWidth = isMobile ? 100 : 250;
      const sizeMultiplier = 1 + (speed - 1.3) * 1.8;
      const width = Math.round(baseWidth * sizeMultiplier);
      const dim = dimensions[index];
      const aspectRatio = dim.height / dim.width;
      const height = Math.round(width * aspectRatio);

      photo.style.width = `${width}px`;
      photo.style.height = `${height}px`;
    });
  });

  // Get ScrollSmoother instance for scroll position
  const smoother = ScrollSmoother.get();

  // Remove old handler if exists
  if (floatingPhotosHandler) {
    gsap.ticker.remove(floatingPhotosHandler);
  }

  // Assign rotation speed and calculate when each photo enters viewport
  // On mobile, skip rotation for better performance
  const enableRotation = !isMobile;
  photos.forEach((photo) => {
    photo._rotationSpeed = 0.03; // slower scroll-based rotation
    photo._baseRotation = enableRotation ? gsap.utils.random(0, 360) : 0; // Starting rotation position
    photo._rotationDirection = gsap.utils.random() > 0.5 ? 1 : -1; // Clockwise or counter-clockwise
    // Get the scroll position where this photo starts to become visible
    const topPercent = parseFloat(photo.style.top) / 100;
    photo._startY = window.innerHeight * topPercent;
  });

  // Use gsap.ticker for smooth frame-by-frame updates
  // On mobile, throttle updates for better performance
  let tickCount = 0;
  let lastScrollY = 0;
  const scrollThreshold = isMobile ? 5 : 0; // Only update every 5px on mobile

  floatingPhotosHandler = () => {
    tickCount++;
    const scrollY = smoother ? smoother.scrollTop() : window.scrollY;

    // Throttle on mobile - skip update if scroll hasn't changed enough
    if (isMobile && Math.abs(scrollY - lastScrollY) < scrollThreshold) {
      return;
    }
    lastScrollY = scrollY;

    photos.forEach((photo) => {
      const speed = parseFloat(photo.dataset.speed) || 1.4;
      // Move UP faster than scroll to appear closer/foreground
      const parallaxY = -scrollY * (speed - 1);

      if (enableRotation) {
        // Constant slow rotation (always running)
        const continuousRotation =
          photo._baseRotation + tickCount * 0.1 * photo._rotationDirection;
        // Scroll-based rotation in SAME direction
        const scrollRotation =
          scrollY * photo._rotationSpeed * photo._rotationDirection;
        const rotation = continuousRotation + scrollRotation;

        photo.style.transform = `translateY(${parallaxY}px) rotate(${rotation}deg)`;
      } else {
        // On mobile, just do parallax without rotation
        photo.style.transform = `translateY(${parallaxY}px)`;
      }
    });
  };

  // Add to ticker for smooth animation on every frame
  gsap.ticker.add(floatingPhotosHandler);

  // Initial update
  floatingPhotosHandler();

  // Setup slide background images with parallax
  setupSlideBackgrounds();
}

// Store slide backgrounds handler
let slideBackgroundsHandler = null;

function setupSlideBackgrounds() {
  // Get slides that should have background images
  const slides = document.querySelectorAll(".slide-image");

  if (slides.length === 0) return;

  // Only on home page
  const currentPath = window.location.pathname;
  if (currentPath !== "/") {
    slides.forEach((slide) => {
      const bg = slide.querySelector(".slide-image-bg");
      if (bg) bg.style.display = "none";
    });
    return;
  }

  // Get ScrollSmoother instance
  const smoother = ScrollSmoother.get();

  // Clean up old handler
  if (slideBackgroundsHandler) {
    gsap.ticker.remove(slideBackgroundsHandler);
  }

  // Pick random images for each slide (without replacement)
  const shuffled = [...photocards].sort(() => Math.random() - 0.5);
  let imageIndex = 0;

  slides.forEach((slide) => {
    const bg = slide.querySelector(".slide-image-bg");
    if (!bg) return;

    // High chance to have background (80%)
    if (Math.random() > 0.2) {
      bg.style.backgroundImage = `url(/assets/photocards/${shuffled[imageIndex++]})`;
      bg.style.display = "block";

      // Random parallax speed for this slide
      bg._parallaxSpeed = gsap.utils.random(0.1, 0.25);
    } else {
      bg.style.display = "none";
    }
  });

  // Create parallax handler
  slideBackgroundsHandler = () => {
    const scrollY = smoother ? smoother.scrollTop() : window.scrollY;

    slides.forEach((slide) => {
      const bg = slide.querySelector(".slide-image-bg");
      if (!bg || bg.style.display === "none") return;

      const speed = bg._parallaxSpeed || 0.15;
      const parallaxY = scrollY * speed;
      bg.style.transform = `translateY(${parallaxY}px)`;
    });
  };

  gsap.ticker.add(slideBackgroundsHandler);
  slideBackgroundsHandler();
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
    if (
      t.trigger &&
      (t.trigger.classList?.contains("parallax-logo") ||
        t.trigger.classList?.contains("floating-photo") ||
        t.trigger.id === "slide-title" ||
        t.trigger.id === "smooth-content" ||
        t.trigger.id === "smooth-wrapper")
    ) {
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
setTimeout(() => {
  initScrollReveal();
  // Also run floating photos setup immediately
  setupFloatingPhotos();
}, 300);
