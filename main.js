import { router, navigateTo } from "./router.js";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// Configure marked to open links in a new tab
marked.use({
  renderer: {
    link({ href, title, text }) {
      return `<a href="${href}" ${title ? `title="${title}"` : ''} target="_blank" rel="noopener noreferrer">${text}</a>`;
    }
  }
});

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
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const mainLight = new THREE.DirectionalLight(0xffffff, 2);
  mainLight.position.set(2, 8, -12);
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.width = 2048;
  mainLight.shadow.mapSize.height = 2048;
  mainLight.shadow.camera.near = 0.5;
  mainLight.shadow.camera.far = 50;
  mainLight.shadow.radius = 20;
  mainLight.shadow.bias = -0.0005;
  scene.add(mainLight);

  const fillLight = new THREE.PointLight(0xffffff, 1.5);
  fillLight.position.set(-5, 3, 2);
  scene.add(fillLight);

  const rimLight = new THREE.PointLight(0xffffff, 1);
  rimLight.position.set(0, -2, -5);
  scene.add(rimLight);

  // Load model
  const loader = new GLTFLoader();
  try {
    const gltf = await new Promise((resolve, reject) => {
      loader.load(
        "/assets/patibrata-min.glb",
        resolve,
        null,
        reject,
      );
    });

    const model = gltf.scene;
    model.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });

    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);
    scene.add(model);

    const planeGeometry = new THREE.PlaneGeometry(100, 100);
    const planeMaterial = new THREE.ShadowMaterial({ opacity: 0.3 });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -0.65;
    plane.receiveShadow = true;
    scene.add(plane);

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
      mixer.setTime(0);
      mixer.update(0);
    }

    const endX = 0, endZ = 5.1, endY = 1.1;
    camera.position.set(endX, endY, endZ);
    camera.lookAt(0, 0, 0);
    const lockedRotation = camera.rotation.clone();
    camera.position.y = 20;
    camera.rotation.copy(lockedRotation);

    gsap.to(camera.position, {
      y: endY,
      ease: "none",
      scrollTrigger: {
        trigger: "#smooth-content",
        start: "top top",
        end: "bottom bottom",
        scrub: true,
      },
      onUpdate: () => { camera.rotation.copy(lockedRotation); },
    });

    if (maxDuration > 0) {
      const animProxy = { time: 0 };
      const modelTl = gsap.timeline({
        scrollTrigger: {
          trigger: "#slide-3d",
          start: "top 20%",
          end: "bottom bottom",
          scrub: true,
        },
      });
      modelTl.to(animProxy, {
        time: maxDuration - 0.0001,
        ease: "none",
        onUpdate: function () {
          mixer.setTime(animProxy.time);
          mixer.update(0);
        },
      });
    }

    loadingManager.itemLoaded();

    function animate() {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    }
    animate();

    requestAnimationFrame(() => {
      ScrollTrigger.refresh(true);
      setTimeout(() => ScrollTrigger.refresh(true), 150);
    });

    window.addEventListener("resize", () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    });
  } catch (error) {
    console.error("Error loading 3D model:", error);
    loadingManager.itemLoaded();
  }
}

/* =========================
   LOADING MANAGER
========================= */

export const loadingManager = {
  totalItems: 0,
  itemsLoaded: 0,

  init(total) {
    this.totalItems = total;
    this.itemsLoaded = 0;
    this.updateUI();
  },

  show() {
    const loader = document.getElementById("loader");
    const navDock = document.getElementById("nav-dock");
    if (loader) {
      loader.classList.remove("loaded");
      this.itemsLoaded = 0;
      this.totalItems = 1;
      this.updateUI();
      document.body.style.overflow = "hidden";
    }
    if (navDock) navDock.style.display = "none";
  },

  itemLoaded() {
    this.itemsLoaded++;
    this.updateUI();
    if (this.itemsLoaded >= this.totalItems) this.finish();
  },

  updateUI() {
    const percentage = Math.round((this.itemsLoaded / this.totalItems) * 100) || 0;
    const bar = document.getElementById("loader-bar");
    const text = document.getElementById("loader-percentage");
    if (bar) bar.style.width = `${percentage}%`;
    if (text) text.textContent = `${percentage}%`;
  },

  finish() {
    const loader = document.getElementById("loader");
    const navDock = document.getElementById("nav-dock");
    if (loader) {
      loader.classList.add("loaded");
      document.body.style.overflow = "";
    }
    if (navDock) navDock.style.display = "flex";
  },
};

if (document.getElementById("loader")) {
  document.body.style.overflow = "hidden";
  const navDock = document.getElementById("nav-dock");
  if (navDock) navDock.style.display = "none";
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
  const poemContent = document.querySelectorAll(".poem > *:not(.back-link)");
  if (!poemContent.length) return;

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
          Array.from(node.attributes).forEach(attr => newElement.setAttribute(attr.name, attr.value));
          parent.appendChild(newElement);
          Array.from(node.childNodes).forEach((child) => processNode(child, newElement));
        }
      }
    };
    originalNodes.forEach((node) => processNode(node, el));
    gsap.from(el.querySelectorAll("span"), {
      y: 20, opacity: 0, duration: 0.8, stagger: 0.02, ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top bottom-=100", toggleActions: "play none none none" },
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
  "/gallery": "/blog",
  "/blog": "/",
};

/* =========================
   SMOOTHER
========================= */

const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;

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

if (window.innerWidth > 768 && navDock) navDock.classList.add("open");

function toggleMenu() {
  if (!navDock) return;
  navDock.classList.toggle("open");
  if (menuToggle) menuToggle.classList.toggle("active");
}

window.addEventListener("scroll", () => {
  if (window.innerWidth > 768 && navDock) {
    if (window.scrollY > 50) {
      if (navDock.classList.contains("open")) navDock.classList.remove("open");
    } else {
      if (!navDock.classList.contains("open")) navDock.classList.add("open");
    }
  }
}, { passive: true });

if (menuToggle) menuToggle.addEventListener("click", toggleMenu);

document.addEventListener("click", (e) => {
  const link = e.target.closest("[data-link]");
  if (link) {
    e.preventDefault();
    if (navDock && navDock.classList.contains("open")) toggleMenu();
    navigateTo(new URL(link.href).pathname);
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

export async function fetchAlbums() {
  if (cachedAlbums) return cachedAlbums;
  if (albumsPromise) return albumsPromise;
  albumsPromise = (async () => {
    try {
      const response = await fetch("https://patibrata-gallery-ls.poetra.workers.dev/list/moments");
      cachedAlbums = await response.json();
      return cachedAlbums;
    } catch (error) {
      console.error("Error fetching albums:", error);
      albumsPromise = null;
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

  if (window.location.pathname !== "/") {
    container.style.display = "none";
    return;
  }
  container.style.display = "block";

  try {
    if (!albums) albums = await fetchAlbums();
    if (!albums) {
      photos.forEach(() => loadingManager.itemLoaded());
      return;
    }

    let allImages = [];
    Object.keys(albums).forEach((albumKey) => {
      albums[albumKey].images.forEach((img) => allImages.push({ album: albumKey, file: img }));
    });

    const pool = allImages.sort(() => Math.random() - 0.5);
    const API_IMAGE_BASE = "https://patibrata-gallery.r2.contrapoetra.com/moments";
    const isMobile = window.innerWidth <= 768;

    const loadWithRetry = async (photo, inner, index) => {
      while (pool.length > 0) {
        const card = pool.shift();
        const src = `${API_IMAGE_BASE}/${card.album}/${card.file}`;
        try {
          const dim = await new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = async () => {
              try { if ("decode" in img) await img.decode(); resolve({ width: img.width, height: img.height }); }
              catch (e) { reject(e); }
            };
            img.onerror = reject;
            img.src = src;
          });
          inner.style.backgroundImage = `url(${src})`;
          const speed = [1.3, 1.5, 1.4, 1.6, 1.35, 1.55, 1.45, 1.5, 1.8, 1.9][index % 10] || 1.4;
          photo.dataset.speed = speed;
          const docHeight = document.documentElement.scrollHeight || 5000;
          const side = Math.random() > 0.5 ? "left" : "right";
          const horizontalPos = side === "left" ? gsap.utils.random(2, 30) : gsap.utils.random(70, 95);
          const verticalPos = gsap.utils.random(100, docHeight - 500);
          photo.style.top = `${verticalPos}px`;
          if (side === "left") { photo.style.left = `${horizontalPos}%`; photo.style.right = "auto"; }
          else { photo.style.right = `${100 - horizontalPos}%`; photo.style.left = "auto"; }
          const baseWidth = isMobile ? 100 : 250;
          const sizeMultiplier = 1 + (speed - 1.3) * 1.8;
          const width = Math.round(baseWidth * sizeMultiplier);
          const height = Math.round(width * (dim.height / dim.width));
          const maxDim = Math.max(width, height) * 1.2;
          photo.style.width = `${maxDim}px`;
          photo.style.height = `${maxDim}px`;
          inner.style.width = `${width}px`;
          inner.style.height = `${height}px`;
          loadingManager.itemLoaded();
          return true;
        } catch (e) { console.warn("Failed loading:", src); }
      }
      loadingManager.itemLoaded();
      return false;
    };

    const setupPromises = Array.from(photos).map((photo, i) => {
      photo.innerHTML = `<div class="photo-inner"></div>`;
      const inner = photo.querySelector(".photo-inner");
      inner._rotationSpeed = 0.03;
      inner._baseRotation = !isMobile ? gsap.utils.random(0, 360) : 0;
      inner._rotationDirection = gsap.utils.random() > 0.5 ? 1 : -1;
      return loadWithRetry(photo, inner, i);
    });

    await Promise.all(setupPromises).then(() => {
      gsap.fromTo(photos, { opacity: 0, scale: 0.5 }, {
        opacity: 1, scale: 1, duration: 1, stagger: { amount: 0.4, from: "center" },
        ease: "elastic.out(1, 0.8)",
      });
      const smoother = ScrollSmoother.get();
      if (floatingPhotosHandler) gsap.ticker.remove(floatingPhotosHandler);
      let tickCount = 0;
      floatingPhotosHandler = () => {
        tickCount++;
        const scrollY = smoother ? smoother.scrollTop() : window.scrollY;
        photos.forEach((photo) => {
          const speed = parseFloat(photo.dataset.speed) || 1.4;
          const driftY = -scrollY * (speed - 1);
          if (!photo._isDraggingActive) gsap.set(photo, { x: photo._dragOffset?.x || 0, y: driftY + (photo._dragOffset?.y || 0) });
          const inner = photo.querySelector(".photo-inner");
          if (inner && !isMobile && !photo.classList.contains("is-hovered")) {
            const auto = (inner._baseRotation || 0) + (tickCount * 0.1 + scrollY * (inner._rotationSpeed || 0.03)) * (inner._rotationDirection || 1);
            inner.style.transform = `rotate(${auto}deg) scale(1)`;
          }
        });
      };
      gsap.ticker.add(floatingPhotosHandler);
    });
  } catch (error) {
    console.error("Error setting up floating photos:", error);
    photos.forEach(() => loadingManager.itemLoaded());
  }
}

let slideBackgroundsHandler = null;

async function setupSlideBackgrounds(albums = null) {
  const slides = document.querySelectorAll(".slide-image");
  if (slides.length === 0) return;

  try {
    if (!albums) albums = await fetchAlbums();
    if (!albums) { slides.forEach(() => loadingManager.itemLoaded()); return; }

    let allImages = [];
    Object.keys(albums).forEach((albumKey) => {
      albums[albumKey].images.forEach((img) => allImages.push({ album: albumKey, file: img }));
    });
    
    const pool = allImages.sort(() => Math.random() - 0.5);
    const API_IMAGE_BASE = "https://patibrata-gallery.r2.contrapoetra.com/moments";

    const slidePromises = Array.from(slides).map(async (slide) => {
      const bg = slide.querySelector(".slide-image-bg");
      if (!bg) { loadingManager.itemLoaded(); return; }
      while (pool.length > 0) {
        const card = pool.shift();
        const src = `${API_IMAGE_BASE}/${card.album}/${card.file}`;
        try {
          await new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = resolve; img.onerror = reject; img.src = src;
          });
          bg.style.backgroundImage = `url(${src})`;
          bg.style.opacity = "1";
          bg._parallaxSpeed = gsap.utils.random(0.1, 0.25);
          loadingManager.itemLoaded();
          return;
        } catch (e) { console.warn("Failed slide bg:", src); }
      }
      loadingManager.itemLoaded();
    });

    await Promise.all(slidePromises);
    if (slideBackgroundsHandler) gsap.ticker.remove(slideBackgroundsHandler);
    slideBackgroundsHandler = () => {
      const scrollY = ScrollSmoother.get()?.scrollTop() || window.scrollY;
      const vh = window.innerHeight;
      slides.forEach((slide) => {
        const bg = slide.querySelector(".slide-image-bg");
        if (!bg || vh <= 0) return;
        const rect = slide.getBoundingClientRect();
        const parallaxY = (scrollY + vh / 2 - (rect.top + scrollY + rect.height / 2)) * (bg._parallaxSpeed || 0.15);
        bg.style.transform = `translateY(${parallaxY}px)`;
      });
    };
    gsap.ticker.add(slideBackgroundsHandler);
  } catch (e) {
    slides.forEach(() => loadingManager.itemLoaded());
  }
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
      y: 200 + Math.random() * 300, rotation: (Math.random() - 0.5) * 60, opacity: 0,
      duration: 1.5 + Math.random() * 0.5, ease: "power1.in",
      scrollTrigger: { trigger: "#slide-title", start: "bottom bottom", end: "bottom top", scrub: 0.5 + Math.random() * 0.5 },
    });
  });
}

window.initScrollReveal = function initScrollReveal(skipSetup = false) {
  const currentPath = window.location.pathname;
  nextPath = connections[currentPath];
  if (!skipSetup && currentPath === "/") {
    setupHomeParallax();
    fetchAlbums().then(albums => { setupFloatingPhotos(albums); setupSlideBackgrounds(albums); });
    setup3DModel();
  }
  if (currentPath === "/about") randomizeTeamPhotos();
  if (currentPath === "/gallery") loadGallery();
  if (!nextPath) return;
  if (overlay) overlay.remove();
  overlay = document.createElement("div"); overlay.id = "reveal-overlay";
  document.body.appendChild(overlay); loadNextPageIntoOverlay();
  gsap.to(overlay, {
    clipPath: `circle(${Math.hypot(window.innerWidth, window.innerHeight)}px at 50% 100%)`,
    ease: "none",
    scrollTrigger: { trigger: "#smooth-content", start: "bottom bottom", end: "+=600", scrub: true, scroller: "#smooth-content", onUpdate: (self) => { if (self.progress >= 0.99) finalizeReveal(); } },
  });
};

let cachedPfps = null;
let pfpsPromise = null;
function getSmolUrl(url) { return url.replace("/pfps/", "/pfps/smol/").replace(/\.(jpg|png)$/i, ".webp"); }

async function preloadPfps() {
  if (cachedPfps) return cachedPfps;
  if (pfpsPromise) return pfpsPromise;
  pfpsPromise = (async () => {
    try {
      const response = await fetch("/assets/pfps.json");
      cachedPfps = await response.json();
      Object.values(cachedPfps).flat().forEach((url) => { const img = new Image(); img.src = getSmolUrl(url); });
      return cachedPfps;
    } catch (error) { console.error("Error preloading PFPs:", error); pfpsPromise = null; return null; }
  })();
  return pfpsPromise;
}

async function randomizeTeamPhotos() {
  const members = document.querySelectorAll(".team-member");
  const teamGrid = document.querySelector(".team-grid");
  if (members.length === 0 || !teamGrid) return;
  try {
    const pfps = await preloadPfps();
    if (!pfps) return;
    members.forEach((member) => {
      const memberId = member.getAttribute("data-member");
      const photos = pfps[memberId];
      if (photos && photos.length > 0) {
        const fullUrl = photos[Math.floor(Math.random() * photos.length)];
        const smolUrl = getSmolUrl(fullUrl);
        const img = member.querySelector("img");
        if (img) {
          const isPlaceholder = img.src.startsWith("data:image");
          if (isPlaceholder) {
            img.style.opacity = "0";
            img.onload = () => gsap.to(img, { opacity: 1, duration: 0.5, ease: "power2.out" });
            img.src = smolUrl;
          } else { img.src = smolUrl; }
        }
      }
    });
    if (!teamGrid._hasClickListener) {
      teamGrid.addEventListener("click", (e) => {
        const member = e.target.closest(".team-member");
        if (!member) return;
        const memberId = member.getAttribute("data-member");
        const photos = cachedPfps[memberId];
        if (!photos || photos.length <= 1) return;
        const img = member.querySelector("img");
        if (!img) return;
        let newFullUrl;
        do { newFullUrl = photos[Math.floor(Math.random() * photos.length)]; } while (getSmolUrl(newFullUrl) === img.src && photos.length > 1);
        const newSmolUrl = getSmolUrl(newFullUrl);
        gsap.to(img, { opacity: 0, scale: 0.9, duration: 0.2, onComplete: () => { img.src = newSmolUrl; gsap.to(img, { opacity: 1, scale: 1, duration: 0.3, ease: "back.out(1.7)" }); } });
      });
      teamGrid._hasClickListener = true; teamGrid.style.cursor = "pointer";
    }
  } catch (error) { console.error("Error loading profiles:", error); }
}

async function loadNextPageIntoOverlay() {
  const routePath = nextPath === "/" ? "/pages/home.html" : `/pages${nextPath}.html`;
  const res = await fetch(routePath); const html = await res.text(); overlay.innerHTML = html;
}

function finalizeReveal() {
  history.pushState(null, null, nextPath);
  document.getElementById("app").innerHTML = overlay.innerHTML;
  overlay.remove(); overlay = null; window.scrollTo(0, 0);
  setTimeout(initScrollReveal, 100);
}

/* =========================
   GENIUS ANNOTATIONS
========================= */

if (localStorage.getItem('annotations-disabled') === 'true') document.body.classList.add('annotations-disabled');

window.openAnnotation = function(el) {
  if (document.body.classList.contains('annotations-disabled')) return;
  const sidebar = document.getElementById('annotation-sidebar'); if (!sidebar) return;
  const content = sidebar.querySelector('.annotation-content');
  const annotation = decodeURIComponent(el.getAttribute('data-annotation'));
  document.querySelectorAll('.annotated-verse').forEach(v => v.classList.remove('active'));
  el.classList.add('active'); content.innerHTML = marked.parse(annotation);
  sidebar.classList.add('open');
};

window.closeAnnotation = function() {
  const sidebar = document.getElementById('annotation-sidebar');
  if (sidebar) { sidebar.classList.remove('open'); document.querySelectorAll('.annotated-verse').forEach(v => v.classList.remove('active')); }
};

document.addEventListener("click", (e) => {
  const toggleBtn = e.target.closest("#toggle-annotations");
  if (toggleBtn) {
    const isDisabled = document.body.classList.toggle('annotations-disabled');
    localStorage.setItem('annotations-disabled', isDisabled);
    toggleBtn.classList.toggle('active', !isDisabled);
    if (isDisabled) closeAnnotation();
    return;
  }
  const verse = e.target.closest(".annotated-verse");
  if (verse) { openAnnotation(verse); return; }
  if (!e.target.closest("#annotation-sidebar") && !e.target.closest(".annotated-verse")) closeAnnotation();
});

router();

export async function initApp() {
  const currentPath = window.location.pathname;
  if (currentPath === "/") {
    const floatingPhotosCount = document.querySelectorAll(".floating-photo").length;
    const slidesCount = document.querySelectorAll(".slide-image").length;
    const hasModel = !!document.getElementById("model-container");
    loadingManager.show();
    loadingManager.init(floatingPhotosCount + slidesCount + (hasModel ? 1 : 0));
    const criticalTasks = [setup3DModel(), initScrollReveal(true)];
    fetchAlbums().then(albums => { setupFloatingPhotos(albums); setupSlideBackgrounds(albums); });
    await Promise.all(criticalTasks);
    setupHomeParallax();
  } else if (currentPath === "/gallery") {
    loadingManager.show(); await loadGallery(); loadingManager.finish(); initScrollReveal();
  } else if (currentPath === "/about") {
    loadingManager.finish(); randomizeTeamPhotos(); initScrollReveal();
  } else {
    loadingManager.finish(); initScrollReveal(); fetchAlbums();
  }
  preloadPfps();
}

async function loadGallery() {
  const container = document.getElementById("gallery-content"), videoContainer = document.getElementById("video-content");
  if (!container) return;
  if (videoContainer) {
    const videos = [{ id: "hfWY2fPpixo", title: "Sosialisasi & Edukasi" }, { id: "jeKRt_PIuj0", title: "Tradisi Nyongkolan Part 2" }, { id: "oudjsyRfZK8", title: "Tradisi Nyongkolan Part 1" }];
    videoContainer.innerHTML = `<section class="album-section video-section"><header class="album-header"><h2 class="album-title">Featured Videos</h2><span class="album-count">${videos.length} Stories</span></header><div class="video-grid-container">${videos.map(v => `<div class="video-card"><div class="video-aspect-ratio"><iframe src="https://www.youtube.com/embed/${v.id}?modestbranding=1&rel=0" title="${v.title}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div><h3 class="video-card-title">${v.title}</h3></div>`).join('')}</div></section>`;
  }
  const API_LIST = "https://patibrata-gallery-ls.poetra.workers.dev/list/moments", API_IMAGE_BASE = "https://patibrata-gallery.r2.contrapoetra.com/moments";
  try {
    const response = await fetch(API_LIST), albums = await response.json();
    let html = "";
    Object.keys(albums).sort().forEach((albumKey) => {
      const albumData = albums[albumKey], images = albumData.images, thumbs = albumData.thumbs, title = formatAlbumName(albumKey);
      html += `<section class="album-section" id="album-${albumKey}"><header class="album-header"><h2 class="album-title">${title}</h2><span class="album-count">${images.length} Photos</span></header><div class="masonry">${images.map((img, index) => { const thumbImg = (thumbs && thumbs[index]) ? thumbs[index] : img; return `<div class="masonry-item" onclick="openLightbox('${API_IMAGE_BASE}/${albumKey}/${img}', '${title}')"><img src="${API_IMAGE_BASE}/${albumKey}/${(thumbs && thumbs[index]) ? 'thumb/' + thumbImg : img}" alt="${title}" loading="lazy"></div>`; }).join("")}</div></section>`;
    });
    container.innerHTML = html;
    gsap.to(".album-section", { opacity: 1, y: 0, duration: 1, stagger: 0.2, ease: "power2.out", scrollTrigger: { trigger: ".gallery-container", start: "top 80%" } });
  } catch (error) { console.error("Error loading gallery:", error); container.innerHTML = `<p class="error">Failed to load moments.</p>`; }
}

function formatAlbumName(slug) { return slug.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" "); }

window.openLightbox = function (src, alt) {
  let lightbox = document.getElementById("gallery-lightbox");
  if (!lightbox) {
    lightbox = document.createElement("div"); lightbox.id = "gallery-lightbox";
    lightbox.innerHTML = `<div class="lightbox-overlay" onclick="closeLightbox()"></div><div class="lightbox-content"><div class="lightbox-loader"></div><img src="" alt="" style="opacity: 0;"><button class="lightbox-close" onclick="closeLightbox()">&times;</button><p class="lightbox-caption"></p></div>`;
    document.body.appendChild(lightbox);
  }
  const img = lightbox.querySelector("img"), caption = lightbox.querySelector(".lightbox-caption"), loader = lightbox.querySelector(".lightbox-loader");
  img.style.opacity = "0"; img.src = ""; caption.textContent = ""; if (loader) loader.style.display = "block";
  img.onload = () => { if (loader) loader.style.display = "none"; gsap.to(img, { opacity: 1, duration: 0.4 }); };
  img.src = src; img.alt = alt; caption.textContent = alt; lightbox.classList.add("active"); document.body.style.overflow = "hidden";
};

window.closeLightbox = function () {
  const lightbox = document.getElementById("gallery-lightbox");
  if (lightbox) { lightbox.classList.remove("active"); document.body.style.overflow = ""; }
};