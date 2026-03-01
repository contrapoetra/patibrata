import { router, navigateTo } from "./router.js";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

gsap.registerPlugin(ScrollTrigger, ScrollSmoother, Draggable, InertiaPlugin);

/* =========================
   3D MODEL SETUP
========================= */

async function setup3DModel() {
  const container = document.getElementById("model-container");
  if (!container) return;

  // Clear container first
  container.innerHTML = "";

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    75,
    container.clientWidth / container.clientHeight,
    0.1,
    1000,
  );
  camera.position.z = 2.5;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
  directionalLight.position.set(2, 2, 5);
  scene.add(directionalLight);

  // Load model
  const loader = new GLTFLoader();
  try {
    const gltf = await new Promise((resolve, reject) => {
      loader.load(
        "/assets/patibrata.glb",
        resolve,
        (xhr) => {
          // Optional: Progress reporting
        },
        reject,
      );
    });

    const model = gltf.scene;

    // Center model
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);

    scene.add(model);

    // Animations
    const mixer = new THREE.AnimationMixer(model);
    let maxDuration = 0;

    if (gltf.animations && gltf.animations.length > 0) {
      gltf.animations.forEach((clip) => {
        const action = mixer.clipAction(clip);
        action.setLoop(THREE.LoopOnce);
        action.clampWhenFinished = true;
        action.play();
        maxDuration = Math.max(maxDuration, clip.duration);
      });
      // Force it to the first frame immediately
      mixer.setTime(0);
      mixer.update(0);
    }

    // Final coordinates from orbit debug: Y: 1.1, Distance: 5.1, Rot: 0deg
    const endX = 0;
    const endZ = 5.1;
    const endY = 1.1;

    // Set initial camera position and FIXED rotation
    camera.position.set(endX, endY, endZ);
    camera.lookAt(0, 0, 0);
    const lockedRotation = camera.rotation.clone();

    // Set to start height
    camera.position.y = 20; // Lowered to 20 so the descent is much slower over the whole page
    camera.rotation.copy(lockedRotation);

    // 1. CAMERA DESCENT (Entire Page)
    const cameraAnim = gsap.to(camera.position, {
      y: endY,
      ease: "none",
      scrollTrigger: {
        trigger: "#smooth-content",
        start: "top top",
        end: "bottom bottom", // Entire page scroll
        scrub: true,
      },
      onUpdate: () => {
        // Force the rotation to remain locked
        camera.rotation.copy(lockedRotation);
      },
    });

    // 2. MODEL ANIMATION (Starts as soon as the slide-3d section enters the viewport)
    if (maxDuration > 0) {
      const animProxy = { time: 0 };
      const modelTl = gsap.timeline({
        scrollTrigger: {
          trigger: "#slide-3d",
          start: "top 20%", // Starts as soon as the slide enters from the bottom
          end: "bottom bottom", // Finishes at the very end of the page
          scrub: true,
          markers: true,
        },
      });

      modelTl.to(animProxy, {
        time: maxDuration,
        ease: "none",
        onUpdate: function () {
          mixer.setTime(animProxy.time);
          mixer.update(0);
        },
      });
    }

    loadingManager.itemLoaded();

    // Render loop
    function animate() {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    }
    animate();

    // Force refresh to ensure ScrollTrigger knows the full page height
    ScrollTrigger.refresh();

    // 🛠 RESTORED CAMERA DEBUG GUI
    const gui = document.createElement("div");
    gui.style.cssText =
      "position:fixed;bottom:20px;right:20px;background:rgba(0,0,0,0.8);color:white;padding:15px;border-radius:8px;z-index:999999;font-family:monospace;font-size:12px;display:flex;flex-direction:column;gap:10px;";
    gui.innerHTML = `
      <div style="font-weight:bold;margin-bottom:5px;border-bottom:1px solid #444;padding-bottom:5px;">CAMERA DEBUG</div>
      <div>Height (Y): <span id="val-y">1.1</span><br><input type="range" id="gui-y" min="-10" max="15" step="0.1" value="1.1"></div>
      <div>Distance (Z): <span id="val-z">5.1</span><br><input type="range" id="gui-z" min="1" max="20" step="0.1" value="5.1"></div>
      <div>Rotation (Y): <span id="val-rot">0</span><br><input type="range" id="gui-rot" min="-180" max="180" step="1" value="0"></div>
      <div style="font-size:10px;color:#ff4444;margin-top:5px;">Note: Adjusting sliders disables scroll animation for these props.</div>
    `;
    document.body.appendChild(gui);

    const updateCameraFromGUI = (e) => {
      // ONLY kill the animation if it's a real user interaction (input event)
      if (e && e.type === "input") {
        cameraAnim.kill();
      }

      const y = parseFloat(document.getElementById("gui-y").value);
      const z = parseFloat(document.getElementById("gui-z").value);
      const rot =
        parseFloat(document.getElementById("gui-rot").value) * (Math.PI / 180);

      document.getElementById("val-y").textContent = y;
      document.getElementById("val-z").textContent = z;
      document.getElementById("val-rot").textContent =
        (rot * (180 / Math.PI)).toFixed(0) + "°";

      camera.position.y = y;
      camera.position.x = Math.sin(rot) * z;
      camera.position.z = Math.cos(rot) * z;
      camera.lookAt(0, 0, 0);
    };

    document
      .getElementById("gui-y")
      .addEventListener("input", updateCameraFromGUI);
    document
      .getElementById("gui-z")
      .addEventListener("input", updateCameraFromGUI);
    document
      .getElementById("gui-rot")
      .addEventListener("input", updateCameraFromGUI);

    // Force refresh to ensure ScrollTrigger knows where the slide is
    ScrollTrigger.refresh();

    // Handle Resize
    window.addEventListener("resize", () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    });
  } catch (error) {
    console.error("Error loading 3D model:", error);
    loadingManager.itemLoaded(); // Still call it so loader finishes
  }
}

/* =========================
   LOADING MANAGER
========================= */

const loadingManager = {
  totalItems: 0,
  itemsLoaded: 0,

  init(total) {
    this.totalItems = total;
    this.itemsLoaded = 0;
    this.updateUI();
  },

  itemLoaded() {
    this.itemsLoaded++;
    this.updateUI();
    if (this.itemsLoaded >= this.totalItems) {
      this.finish();
    }
  },

  updateUI() {
    const percentage =
      Math.round((this.itemsLoaded / this.totalItems) * 100) || 0;
    const bar = document.getElementById("loader-bar");
    const text = document.getElementById("loader-percentage");
    if (bar) bar.style.width = `${percentage}%`;
    if (text) text.textContent = `${percentage}%`;
  },

  finish() {
    const loader = document.getElementById("loader");
    if (loader) {
      loader.classList.add("loaded");
      // Re-enable scrolling if it was disabled
      document.body.style.overflow = "";
    }
  },
};

// Disable scroll during loading
if (document.getElementById("loader")) {
  document.body.style.overflow = "hidden";
}

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

window.addEventListener(
  "scroll",
  () => {
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
  },
  { passive: true },
);

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

window.addEventListener("focus", () => {
  if (typeof slideBackgroundsHandler === "function") slideBackgroundsHandler();
  if (typeof floatingPhotosHandler === "function") floatingPhotosHandler();
});

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

let cachedAlbums = null;
let albumsPromise = null;

async function fetchAlbums() {
  if (cachedAlbums) return cachedAlbums;
  if (albumsPromise) return albumsPromise;

  albumsPromise = (async () => {
    try {
      const response = await fetch(
        "https://patibrata-gallery-ls.poetra.workers.dev/list/moments",
      );
      cachedAlbums = await response.json();
      return cachedAlbums;
    } catch (error) {
      console.error("Error fetching albums:", error);
      albumsPromise = null; // Reset to allow retry
      return null;
    }
  })();

  return albumsPromise;
}

let floatingPhotosHandler = null;

async function setupFloatingPhotos(albums = null) {
  const container = document.getElementById("floating-photos");
  const photos = document.querySelectorAll(".floating-photo");
  if (!container || photos.length === 0) return;

  const currentPath = window.location.pathname;
  if (currentPath !== "/") {
    container.style.display = "none";
    return;
  }
  container.style.display = "block";

  // Use cached albums if available
  if (!albums) {
    albums = await fetchAlbums();
  }
  if (!albums) return;
  // ... (rest of function unchanged, just ensuring it's robust)

  let allImages = [];
  Object.keys(albums).forEach((albumKey) => {
    albums[albumKey].images.forEach((img) => {
      allImages.push({ album: albumKey, file: img });
    });
  });

  const shuffled = allImages.sort(() => Math.random() - 0.5);
  const selectedCards = shuffled.slice(0, photos.length);
  const API_IMAGE_BASE =
    "https://patibrata-gallery.r2.contrapoetra.com/moments";

  const speeds = [1.3, 1.5, 1.4, 1.6, 1.35, 1.55, 1.45, 1.5, 1.8, 1.9];
  const isMobile = window.innerWidth <= 768;

  const loadImage = (src, photoInner) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = async () => {
        try {
          // Use modern decode() API to ensure image is decompressed and ready to paint
          if ("decode" in img) await img.decode();

          photoInner.style.backgroundImage = `url(${src})`;
          loadingManager.itemLoaded();
          resolve({ width: img.width, height: img.height });
        } catch (e) {
          console.error("Image decode failed", e);
          loadingManager.itemLoaded();
          resolve({ width: 100, height: 100 });
        }
      };
      img.onerror = () => {
        loadingManager.itemLoaded();
        resolve({ width: 100, height: 100 });
      };
      img.src = src;
    });
  };

  const photoConfigs = Array.from(photos).map((photo, index) => {
    const card = selectedCards[index % selectedCards.length];
    photo.innerHTML = `<div class="photo-inner"></div>`;
    const inner = photo.querySelector(".photo-inner");
    return { photo, inner, card, index };
  });

  return Promise.all(
    photoConfigs.map((config) =>
      loadImage(
        `${API_IMAGE_BASE}/${config.card.album}/${config.card.file}`,
        config.inner,
      ),
    ),
  ).then((dimensions) => {
    const docHeight = document.documentElement.scrollHeight || 5000;

    photoConfigs.forEach((config, index) => {
      const { photo, inner, card } = config;
      const side = Math.random() > 0.5 ? "left" : "right";
      const horizontalPos =
        side === "left" ? gsap.utils.random(2, 30) : gsap.utils.random(70, 95);
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

      let tickCount = 0;

      photo.addEventListener("mouseenter", () => {
        photo.classList.add("is-hovered");
        const scrollY = window.scrollY;
        const currentAuto =
          inner._baseRotation +
          (tickCount * 0.1 + scrollY * inner._rotationSpeed) *
            inner._rotationDirection;
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
        onDragStart: function () {
          photo._isDraggingActive = true;
          photo.style.zIndex = 2147483647;
        },
        onDrag: function () {
          const scrollY = window.scrollY;
          const driftY = -scrollY * (speed - 1);
          photo._dragOffset.x = this.x;
          photo._dragOffset.y = this.y - driftY;
        },
        onThrowUpdate: function () {
          const scrollY = window.scrollY;
          const driftY = -scrollY * (speed - 1);
          // Sync offset during the inertia phase to prevent scroll-jumping
          photo._dragOffset.x = this.x;
          photo._dragOffset.y = this.y - driftY;
        },
        onDragEnd: function () {
          photo._isDraggingActive = false;
          photo.style.zIndex = 2147483646;
        },
        onThrowComplete: function () {
          photo._isDraggingActive = false;
        },
      });
    });

    // 🔹 Entrance Animation
    gsap.fromTo(
      photos,
      { opacity: 0, scale: 0.5 },
      {
        opacity: 1,
        scale: 1,
        duration: 1,
        stagger: { amount: 0.4, from: "center" },
        ease: "elastic.out(1, 0.8)",
      },
    );

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
        if (!photo._isDraggingActive) {
          gsap.set(photo, { x: finalX, y: finalY });
        }

        const inner = photo.querySelector(".photo-inner");
        if (inner && !isMobile && !photo.classList.contains("is-hovered")) {
          const auto =
            (inner._baseRotation || 0) +
            (tickCount * 0.1 + scrollY * (inner._rotationSpeed || 0.03)) *
              (inner._rotationDirection || 1);
          inner.style.transform = `rotate(${auto}deg) scale(1)`;
          photo._lastRotation = auto;
        }
      });
    };

    gsap.ticker.add(floatingPhotosHandler);
    floatingPhotosHandler();
  });
}

let slideBackgroundsHandler = null;

async function setupSlideBackgrounds(albums = null) {
  const slides = document.querySelectorAll(".slide-image");
  if (slides.length === 0) return;

  if (window.location.pathname !== "/") {
    slides.forEach((slide) => {
      const bg = slide.querySelector(".slide-image-bg");
      if (bg) bg.style.opacity = "0";
    });
    return;
  }

  // Use cached albums if available
  if (!albums) {
    albums = await fetchAlbums();
  }
  if (!albums) return;

  const smoother = ScrollSmoother.get();
  if (slideBackgroundsHandler) gsap.ticker.remove(slideBackgroundsHandler);

  let allImages = [];
  Object.keys(albums).forEach((albumKey) => {
    albums[albumKey].images.forEach((img) => {
      allImages.push({ album: albumKey, file: img });
    });
  });

  const shuffled = allImages.sort(() => Math.random() - 0.5);
  const API_IMAGE_BASE =
    "https://patibrata-gallery.r2.contrapoetra.com/moments";
  let imageIndex = 0;

  const slidePromises = Array.from(slides).map((slide) => {
    return new Promise((resolve) => {
      const bg = slide.querySelector(".slide-image-bg");
      if (!bg) {
        resolve();
        return;
      }

      const card = shuffled[imageIndex % shuffled.length];
      imageIndex++;
      const src = `${API_IMAGE_BASE}/${card.album}/${card.file}`;

      const img = new Image();
      img.onload = async () => {
        try {
          if ("decode" in img) await img.decode();
          bg.style.backgroundImage = `url(${src})`;
          bg.style.opacity = "1";
          loadingManager.itemLoaded();
          resolve();
        } catch (e) {
          console.error("Slide bg decode failed", e);
          loadingManager.itemLoaded();
          resolve();
        }
      };
      img.onerror = () => {
        loadingManager.itemLoaded();
        resolve();
      };
      img.src = src;

      bg._parallaxSpeed = gsap.utils.random(0.1, 0.25);
    });
  });

  slideBackgroundsHandler = () => {
    const scrollY = smoother ? smoother.scrollTop() : window.scrollY;
    const vh = window.innerHeight;

    // Skip if viewport is not initialized properly
    if (vh <= 0) return;

    slides.forEach((slide) => {
      const bg = slide.querySelector(".slide-image-bg");
      if (!bg || parseFloat(bg.style.opacity) === 0) return;

      // Calculate slide's distance from the center of the viewport
      const rect = slide.getBoundingClientRect();

      // If rect is all zeros (hidden tab), skip
      if (rect.height === 0 && rect.top === 0) return;

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
  // Run once immediately to set initial positions
  slideBackgroundsHandler();

  return Promise.all(slidePromises);
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

window.initScrollReveal = function initScrollReveal(skipSetup = false) {
  const currentPath = window.location.pathname;
  nextPath = connections[currentPath];

  // Prevent double initialization if loader is active and we're not explicitly skipping setup
  const loader = document.getElementById("loader");
  if (loader && !loader.classList.contains("loaded") && !skipSetup) {
    return;
  }

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

  if (!skipSetup) {
    setupFloatingPhotos(cachedAlbums);
    if (currentPath === "/") {
      setupHomeParallax();
      setupSlideBackgrounds(cachedAlbums);
      setup3DModel();
    }
  }

  if (currentPath === "/about") randomizeTeamPhotos();
  if (currentPath === "/gallery") loadGallery();
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
      onUpdate: (self) => {
        if (self.progress >= 0.99) finalizeReveal();
      },
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
              ease: "back.out(1.7)",
            });
          },
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
  setTimeout(initScrollReveal, 100);
}

router();

async function initApp() {
  const currentPath = window.location.pathname;

  if (currentPath === "/") {
    const albums = await fetchAlbums();

    const floatingPhotosCount =
      document.querySelectorAll(".floating-photo").length;
    const slidesCount = document.querySelectorAll(".slide-image").length;
    const hasModel = !!document.getElementById("model-container");
    loadingManager.init(floatingPhotosCount + slidesCount + (hasModel ? 1 : 0));

    // Both setup functions now return promises that resolve when their images load
    await Promise.all([
      initScrollReveal(true),
      setupFloatingPhotos(albums),
      setupSlideBackgrounds(albums),
      setup3DModel(),
    ]);
    setupHomeParallax();
  } else {
    // For other pages, hide loader immediately or don't use it
    loadingManager.finish();
    initScrollReveal();
    // Also fetch albums in background to cache them
    fetchAlbums();
  }
}

setTimeout(initApp, 300);

async function loadGallery() {
  const container = document.getElementById("gallery-content");
  if (!container) return;

  const API_LIST =
    "https://patibrata-gallery-ls.poetra.workers.dev/list/moments";
  const API_IMAGE_BASE =
    "https://patibrata-gallery.r2.contrapoetra.com/moments";

  try {
    const response = await fetch(API_LIST);
    const albums = await response.json();

    let html = "";

    // Sort albums alphabetically
    const albumKeys = Object.keys(albums).sort();

    albumKeys.forEach((albumKey) => {
      const albumData = albums[albumKey];
      const images = albumData.images;
      const thumbs = albumData.thumbs;
      const title = formatAlbumName(albumKey);

      html += `
        <section class="album-section" id="album-${albumKey}">
          <header class="album-header">
            <h2 class="album-title">${title}</h2>
            <span class="album-count">${images.length} Photos</span>
          </header>
          <div class="masonry">
            ${images
              .map((img, index) => {
                const thumbImg = thumbs[index];
                return `
              <div class="masonry-item" onclick="openLightbox('${API_IMAGE_BASE}/${albumKey}/${img}', '${title}')">
                <img src="${API_IMAGE_BASE}/${albumKey}/thumb/${thumbImg}" alt="${title}" loading="lazy">
              </div>
            `;
              })
              .join("")}
          </div>
        </section>
      `;
    });

    container.innerHTML = html;

    // Entrance animation for albums
    gsap.to(".album-section", {
      opacity: 1,
      y: 0,
      duration: 1,
      stagger: 0.2,
      ease: "power2.out",
      scrollTrigger: {
        trigger: ".gallery-container",
        start: "top 80%",
      },
    });
  } catch (error) {
    console.error("Error loading gallery:", error);
    container.innerHTML = `<p class="error">Failed to load moments. Please try again later.</p>`;
  }
}

function formatAlbumName(slug) {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

window.openLightbox = function (src, alt) {
  let lightbox = document.getElementById("gallery-lightbox");
  if (!lightbox) {
    lightbox = document.createElement("div");
    lightbox.id = "gallery-lightbox";
    lightbox.innerHTML = `
      <div class="lightbox-overlay" onclick="closeLightbox()"></div>
      <div class="lightbox-content">
        <div class="lightbox-loader"></div>
        <img src="" alt="" style="opacity: 0;">
        <button class="lightbox-close" onclick="closeLightbox()">&times;</button>
        <p class="lightbox-caption"></p>
      </div>
    `;
    document.body.appendChild(lightbox);
  }

  const img = lightbox.querySelector("img");
  const caption = lightbox.querySelector(".lightbox-caption");
  const loader = lightbox.querySelector(".lightbox-loader");

  // Reset state
  img.style.opacity = "0";
  img.src = "";
  caption.textContent = "";
  if (loader) loader.style.display = "block";

  // Set new content
  img.onload = () => {
    if (loader) loader.style.display = "none";
    gsap.to(img, { opacity: 1, duration: 0.4 });
  };

  img.src = src;
  img.alt = alt;
  caption.textContent = alt;

  lightbox.classList.add("active");
  document.body.style.overflow = "hidden"; // Prevent scrolling
};

window.closeLightbox = function () {
  const lightbox = document.getElementById("gallery-lightbox");
  if (lightbox) {
    lightbox.classList.remove("active");
    document.body.style.overflow = ""; // Re-enable scrolling
  }
};
