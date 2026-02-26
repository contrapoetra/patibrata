import { router, navigateTo } from "./router.js";

gsap.registerPlugin(ScrollTrigger, ScrollSmoother, Draggable, InertiaPlugin);

/* =========================
   MOBILE VIEWPORT HEIGHT FIX
========================= */

function setViewportHeight() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty("--vh", `${vh}px`);
}

setViewportHeight();
window.addEventListener("resize", setViewportHeight);

/* =========================
   TEXT ANIMATION
========================= */

function animatePoemText() {
  const poemContent = document.querySelector(".poem p");
  if (!poemContent) return;

  const poems = document.querySelectorAll(".poem p");

  poems.forEach((poem) => {
    const text = poem.textContent;
    const words = text.split(" ");

    poem.innerHTML = "";
    words.forEach((word, index) => {
      const span = document.createElement("span");
      span.textContent = word + " ";
      span.style.display = "inline-block";
      poem.appendChild(span);
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

const isMobileDevice =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  ) || window.innerWidth <= 768;

ScrollSmoother.create({
  wrapper: "#smooth-wrapper",
  content: "#smooth-content",
  smooth: isMobileDevice ? 0.5 : 1.2,
  effects: !isMobileDevice,
});

/* =========================
   SPA LINK HANDLING
========================= */

const menuToggle = document.getElementById("menu-toggle");
const navDock = document.getElementById("nav-dock");

if (window.innerWidth > 768 && navDock) {
    navDock.classList.add("open");
}

function toggleMenu() {
    if (!navDock) return;
    navDock.classList.toggle("open");
    if (menuToggle) menuToggle.classList.toggle("active");
}

window.addEventListener("scroll", () => {
    if (window.innerWidth > 768 && navDock) {
        if (window.scrollY > 50) {
            if (navDock.classList.contains("open")) {
                navDock.classList.remove("open");
            }
        } else {
            if (!navDock.classList.contains("open")) {
                navDock.classList.add("open");
            }
        }
    }
}, { passive: true });

if (menuToggle) {
    menuToggle.addEventListener("click", toggleMenu);
}

document.addEventListener("click", (e) => {
    const link = e.target.closest("[data-link]");
    if (link) {
        e.preventDefault();
        if (navDock && navDock.classList.contains("open")) {
            toggleMenu();
        }
        navigateTo(new URL(link.href).pathname);
        return;
    }
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

let floatingPhotosHandler = null;

const photocards = [
  "IMG20251220125211.jpg", "IMG20251220125221.jpg", "IMG20251231193021.jpg",
  "IMG20260107111310.jpg", "IMG20260107111319.jpg", "IMG20260108163626.jpg",
  "IMG20260108163922.jpg", "IMG20260108164456.jpg", "IMG20260108164858.jpg",
  "IMG20260108165023.jpg", "IMG20260108165303.jpg", "IMG20260111232548.jpg",
  "IMG20260113213603.jpg", "IMG20260120172111.jpg", "IMG20260120173209.jpg",
  "IMG20260120173234.jpg", "IMG20260120174108.jpg", "IMG20260120174207.jpg",
  "IMG20260120174421.jpg", "IMG20260120174453.jpg", "IMG20260125112742.jpg",
  "IMG20260126141239.jpg", "IMG20260127134517.jpg", "IMG20260127134528.jpg",
  "IMG20260127134555.jpg", "IMG20260127141112.jpg"
];

function setupFloatingPhotos() {
  const container = document.getElementById("floating-photos");
  const photos = document.querySelectorAll(".floating-photo");
  if (!container || photos.length === 0) return;

  const currentPath = window.location.pathname;
  if (currentPath !== "/") {
    container.style.display = "none";
    return;
  }
  container.style.display = "block";

  const shuffled = [...photocards].sort(() => Math.random() - 0.5);
  const selectedCards = shuffled.slice(0, photos.length);
  const speeds = [1.3, 1.5, 1.4, 1.6, 1.35, 1.55, 1.45, 1.5, 1.8, 1.9];
  const isMobile = window.innerWidth <= 768;

  const loadImage = (src) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = () => resolve({ width: 100, height: 100 });
      img.src = src;
    });
  };

  Promise.all(
    selectedCards.map((card) => loadImage(`/assets/photocards/${card}`)),
  ).then((dimensions) => {
    const docHeight = document.documentElement.scrollHeight || 5000;

    photos.forEach((photo, index) => {
      const side = Math.random() > 0.5 ? "left" : "right";
      const horizontalPos = side === "left" ? gsap.utils.random(2, 30) : gsap.utils.random(70, 95);
      const verticalPos = gsap.utils.random(100, docHeight - 500);
      
      photo.style.top = `${verticalPos}px`;
      if (side === "left") {
        photo.style.left = `${horizontalPos}%`;
        photo.style.right = "auto";
      } else {
        photo.style.right = `${100 - horizontalPos}%`;
        photo.style.left = "auto";
      }

      photo._dragOffset = { x: 0, y: 0 };
      photo.innerHTML = `<div class="photo-inner"></div>`;
      const inner = photo.querySelector(".photo-inner");
      inner.style.backgroundImage = `url(/assets/photocards/${selectedCards[index]})`;

      const speed = speeds[index] || 1.4;
      photo.dataset.speed = speed;

      if (!isMobile) {
        const blur = Math.round(Math.pow(speed - 1.2, 2) * 45); 
        inner.dataset.baseBlur = blur;
        inner.style.filter = `blur(${blur}px)`;
        inner.style.webkitFilter = `blur(${blur}px)`;
      }

      const baseWidth = isMobile ? 100 : 250;
      const sizeMultiplier = 1 + (speed - 1.3) * 1.8;
      const width = Math.round(baseWidth * sizeMultiplier);
      const dim = dimensions[index] || { width: 100, height: 100 };
      const height = Math.round(width * (dim.height / dim.width));

      const maxDim = Math.max(width, height) * 1.2;
      photo.style.width = `${maxDim}px`;
      photo.style.height = `${maxDim}px`;
      inner.style.width = `${width}px`;
      inner.style.height = `${height}px`;

      inner._rotationSpeed = 0.03;
      inner._baseRotation = !isMobile ? gsap.utils.random(0, 360) : 0;
      inner._rotationDirection = gsap.utils.random() > 0.5 ? 1 : -1;

      photo.addEventListener("mouseenter", () => {
        photo.classList.add("is-hovered");
        const scrollY = window.scrollY;
        const currentAuto = inner._baseRotation + (tickCount * 0.1 + scrollY * inner._rotationSpeed) * inner._rotationDirection;
        const currentRotation = photo._lastRotation || currentAuto;
        const targetRotation = Math.round(currentRotation / 360) * 360;
        inner.style.transform = `rotate(${targetRotation}deg) scale(1.1)`;
      });

      photo.addEventListener("mouseleave", () => {
        photo.classList.remove("is-hovered");
      });

      Draggable.create(photo, {
        type: "x,y",
        inertia: true,
        bounds: "#smooth-content",
        edgeResistance: 0.65,
        onDragStart: function() {
          photo._isDraggingActive = true;
          photo.style.zIndex = 2147483647;
        },
        onDrag: function() {
          const scrollY = window.scrollY;
          const driftY = -scrollY * (speed - 1);
          photo._dragOffset.x = this.x;
          photo._dragOffset.y = this.y - driftY;
        },
        onThrowUpdate: function() {
          const scrollY = window.scrollY;
          const driftY = -scrollY * (speed - 1);
          // Sync offset during the inertia phase to prevent scroll-jumping
          photo._dragOffset.x = this.x;
          photo._dragOffset.y = this.y - driftY;
        },
        onDragEnd: function() {
          photo._isDraggingActive = false;
          photo.style.zIndex = 2147483646;
        },
        onThrowComplete: function() {
          photo._isDraggingActive = false;
        }
      });
    });

    // 🔹 Entrance Animation
    gsap.fromTo(photos, 
      { opacity: 0, scale: 0.5 }, 
      { 
        opacity: 1, 
        scale: 1, 
        duration: 1, 
        stagger: { amount: 0.4, from: "center" },
        ease: "elastic.out(1, 0.8)" 
      }
    );
  });

  const smoother = ScrollSmoother.get();
  if (floatingPhotosHandler) gsap.ticker.remove(floatingPhotosHandler);

  let tickCount = 0;
  let lastScrollY = 0;
  const scrollThreshold = isMobile ? 5 : 0;

  floatingPhotosHandler = () => {
    tickCount++;
    const scrollY = smoother ? smoother.scrollTop() : window.scrollY;
    if (isMobile && Math.abs(scrollY - lastScrollY) < scrollThreshold) return;
    lastScrollY = scrollY;

    photos.forEach((photo) => {
      const speed = parseFloat(photo.dataset.speed) || 1.4;
      const driftY = -scrollY * (speed - 1);
      const finalX = photo._dragOffset ? photo._dragOffset.x : 0;
      const finalY = driftY + (photo._dragOffset ? photo._dragOffset.y : 0);

      // Only skip update if the user's MOUSE is currently DOWN dragging
      // This allows the ticker to handle the physics-based throw motion
      if (!photo._isDraggingActive) {
        gsap.set(photo, { x: finalX, y: finalY });
      }

      const inner = photo.querySelector(".photo-inner");
      if (inner && !isMobile && !photo.classList.contains("is-hovered")) {
        const auto = inner._baseRotation + (tickCount * 0.1 + scrollY * inner._rotationSpeed) * inner._rotationDirection;
        inner.style.transform = `rotate(${auto}deg) scale(1)`;
        photo._lastRotation = auto;
      }
    });
  };

  gsap.ticker.add(floatingPhotosHandler);
  floatingPhotosHandler();
  setupSlideBackgrounds();
}

let slideBackgroundsHandler = null;

function setupSlideBackgrounds() {
  const slides = document.querySelectorAll(".slide-image");
  if (slides.length === 0) return;

  if (window.location.pathname !== "/") {
    slides.forEach((slide) => {
      const bg = slide.querySelector(".slide-image-bg");
      if (bg) bg.style.display = "none";
    });
    return;
  }

  const smoother = ScrollSmoother.get();
  if (slideBackgroundsHandler) gsap.ticker.remove(slideBackgroundsHandler);

  const shuffled = [...photocards].sort(() => Math.random() - 0.5);
  let imageIndex = 0;

  slides.forEach((slide) => {
    const bg = slide.querySelector(".slide-image-bg");
    if (!bg) return;
    
    // Always assign an image, wrap around if we run out of shuffled images
    const imagePath = shuffled[imageIndex % shuffled.length];
    bg.style.backgroundImage = `url(/assets/photocards/${imagePath})`;
    bg.style.display = "block";
    bg._parallaxSpeed = gsap.utils.random(0.1, 0.25);
    imageIndex++;
  });

  slideBackgroundsHandler = () => {
    const scrollY = smoother ? smoother.scrollTop() : window.scrollY;
    const vh = window.innerHeight;

    slides.forEach((slide) => {
      const bg = slide.querySelector(".slide-image-bg");
      if (!bg || bg.style.display === "none") return;

      // Calculate slide's distance from the center of the viewport
      const rect = slide.getBoundingClientRect();
      const slideTop = rect.top + scrollY;
      const slideHeight = rect.height;
      
      // Center of slide relative to scroll
      const slideCenter = slideTop + slideHeight / 2;
      // Center of viewport relative to scroll
      const viewCenter = scrollY + vh / 2;
      
      const speed = bg._parallaxSpeed || 0.15;
      // Calculate offset based on how far the slide is from the viewport center
      const diff = viewCenter - slideCenter;
      const parallaxY = diff * speed;
      
      bg.style.transform = `translateY(${parallaxY}px)`;
    });
  };

  gsap.ticker.add(slideBackgroundsHandler);
  slideBackgroundsHandler();
}

function setupFallingLetters() {
  const title = document.querySelector("#title");
  if (!title) return;
  const text = title.textContent.trim();
  title.innerHTML = "";
  const letters = text.split("").map((char) => {
    const span = document.createElement("span");
    span.textContent = char === " " ? "\u00A0" : char;
    span.style.display = "inline-block";
    span.style.position = "relative";
    span.style.zIndex = "2";
    return span;
  });
  letters.forEach((letter) => title.appendChild(letter));
  letters.forEach((letter) => {
    gsap.to(letter, {
      y: 200 + Math.random() * 300,
      rotation: (Math.random() - 0.5) * 60,
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

  ScrollTrigger.getAll().forEach((t) => {
    if (t.trigger && (t.trigger.classList?.contains("parallax-logo") || t.trigger.classList?.contains("floating-photo") || t.trigger.id === "slide-title" || t.trigger.id === "smooth-content" || t.trigger.id === "smooth-wrapper")) {
      t.kill();
    }
  });

  setupFloatingPhotos();
  if (currentPath === "/") setupHomeParallax();
  if (currentPath === "/about") randomizeTeamPhotos();
  if (!nextPath) return;

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
      onUpdate: (self) => { if (self.progress >= 0.99) finalizeReveal(); },
    },
  });
};

let cachedPfps = null;

async function randomizeTeamPhotos() {
  const members = document.querySelectorAll(".team-member");
  const teamGrid = document.querySelector(".team-grid");
  if (members.length === 0 || !teamGrid) return;

  try {
    if (!cachedPfps) {
      const response = await fetch("/assets/pfps.json");
      cachedPfps = await response.json();
    }

    members.forEach((member) => {
      const memberId = member.getAttribute("data-member");
      const photos = cachedPfps[memberId];
      if (photos && photos.length > 0) {
        const randomPhoto = photos[Math.floor(Math.random() * photos.length)];
        const img = member.querySelector("img");
        if (img) {
          img.src = randomPhoto;
        }
      }
    });

    // Event delegation for clicking to switch photos
    if (!teamGrid._hasClickListener) {
      teamGrid.addEventListener("click", (e) => {
        const member = e.target.closest(".team-member");
        if (!member) return;

        const memberId = member.getAttribute("data-member");
        const photos = cachedPfps[memberId];
        if (!photos || photos.length <= 1) return;

        const img = member.querySelector("img");
        if (!img) return;

        // Find a different photo than the current one
        let newPhoto;
        do {
          newPhoto = photos[Math.floor(Math.random() * photos.length)];
        } while (newPhoto === img.src && photos.length > 1);

        // Animation for switching
        gsap.to(img, {
          opacity: 0,
          scale: 0.9,
          duration: 0.2,
          onComplete: () => {
            img.src = newPhoto;
            gsap.to(img, {
              opacity: 1,
              scale: 1,
              duration: 0.3,
              ease: "back.out(1.7)"
            });
          }
        });
      });
      teamGrid._hasClickListener = true;
      teamGrid.style.cursor = "pointer";
    }
  } catch (error) {
    console.error("Error loading profile pictures:", error);
  }
}

async function loadNextPageIntoOverlay() {
  const routePath = nextPath === "/" ? "/pages/home.html" : `/pages${nextPath}.html`;
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
  setTimeout(initScrollReveal, 100);
}

router();
setTimeout(() => {
  initScrollReveal();
  setupFloatingPhotos();
}, 300);
