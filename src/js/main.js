/* Page behaviour. The markup is pre-rendered by scripts/build.mjs; this file only
   wires it up (and re-renders the gallery when a filter changes). */
(() => {
  "use strict";

  const DATA = JSON.parse(document.getElementById("clone-data").textContent);
  const T = window.CloneTemplates.create(DATA);
  const { site } = DATA;
  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (sel, scope = document) => scope.querySelector(sel);
  const $$ = (sel, scope = document) => [...scope.querySelectorAll(sel)];
  const idle = (fn) => ("requestIdleCallback" in window ? requestIdleCallback(fn, { timeout: 2000 }) : setTimeout(fn, 200));

  /* ------------------------------------------------------------------ */
  /* Reveal on scroll                                                   */
  /* ------------------------------------------------------------------ */
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add("is-in");
        io.unobserve(e.target);
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
  );
  const observe = (els) => els.forEach((el) => io.observe(el));

  /* ------------------------------------------------------------------ */
  /* Hero slideshow + viewfinder                                        */
  /* ------------------------------------------------------------------ */
  const heroWrap = $("[data-hero]");
  const frameEl = $("[data-frame]");
  const needle = $(".vf-needle");
  const focus = $(".vf-focus");
  let heroIndex = 0;
  const slides = () => $$(".hero__slide", heroWrap);

  function refocus() {
    if (!focus) return;
    focus.classList.remove("is-hunting", "is-locked");
    void focus.offsetWidth;
    focus.classList.add("is-hunting");
    setTimeout(() => focus.classList.add("is-locked"), 900);
    if (needle) needle.style.left = `${38 + Math.random() * 24}%`;
  }

  function showHero(i) {
    const all = slides();
    const prev = all[heroIndex];
    heroIndex = (i + all.length) % all.length;
    const next = all[heroIndex];
    if (prev && prev !== next) {
      prev.classList.remove("is-active");
      prev.classList.add("is-leaving");
      setTimeout(() => prev.classList.remove("is-leaving"), 1300);
    }
    next.classList.add("is-active");
    if (frameEl) frameEl.textContent = `${String(17 + heroIndex * 53).padStart(3, "0")} / 302`;
    refocus();
  }

  // Only the first slide ships in the HTML. Each later slide is added (and so
  // downloaded) one interval ahead of when it's shown, never all at once.
  const heroQueue = site.hero.slice(1).map((id) => T.byId[id]).filter(Boolean);
  function queueNextSlide() {
    const p = heroQueue.shift();
    if (p) heroWrap.insertAdjacentHTML("beforeend", T.heroPicture(p, slides().length));
  }
  function startSlideshow() {
    if (!heroQueue.length || reduceMotion) return;
    queueNextSlide();
    setInterval(() => {
      showHero(heroIndex + 1);
      queueNextSlide();
    }, 6500);
  }

  /* ------------------------------------------------------------------ */
  /* Intro: aperture loader (first visit per session only)              */
  /* ------------------------------------------------------------------ */
  function reveal() {
    showHero(0);
    setTimeout(() => {
      document.body.classList.add("is-ready");
      observe($$(".hero .reveal-up"));
    }, 120);
    const kick = () => idle(startSlideshow);
    document.readyState === "complete" ? kick() : window.addEventListener("load", kick, { once: true });
  }

  function runLoader() {
    if (!root.classList.contains("is-loading")) return reveal();

    const fEl = $("[data-fstop]");
    const stops = ["16", "11", "8", "5.6", "4", "2.8"];
    let s = 0;
    const tick = setInterval(() => {
      s = Math.min(s + 1, stops.length - 1);
      if (fEl) fEl.textContent = stops[s];
    }, 200);

    // A fixed, short intro. It deliberately doesn't wait for the hero photo:
    // on slow connections the photo fades in behind the text instead.
    const minTime = new Promise((r) => setTimeout(r, reduceMotion ? 0 : 1100));

    minTime.then(() => {
      clearInterval(tick);
      if (fEl) fEl.textContent = "2.8";
      root.classList.remove("is-loading");
      try { sessionStorage.setItem("clone-intro", "1"); } catch (e) {}
      const flash = $(".flash");
      if (!reduceMotion && flash) flash.classList.add("is-firing");
      reveal();
    });
  }

  /* ------------------------------------------------------------------ */
  /* Gallery                                                            */
  /* ------------------------------------------------------------------ */
  const gallery = $("[data-gallery]");
  const moreBtn = $("[data-more]");
  const PAGE = site.galleryPage;
  let currentFilter = "all";
  let currentList = T.galleryList("all");
  let visible = $$(".tile", gallery).length;

  function renderTiles(from, to) {
    gallery.insertAdjacentHTML("beforeend", T.tiles(currentList, from, to));
    observe($$(".tile:not(.is-in)", gallery));
    visible = Math.min(to, currentList.length);
    moreBtn.hidden = visible >= currentList.length;
  }

  function setFilter(key) {
    if (key === currentFilter) return;
    currentFilter = key;
    $$("[data-filter]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.filter === key)));
    gallery.classList.add("is-switching");
    setTimeout(() => {
      currentList = T.galleryList(key);
      gallery.innerHTML = "";
      renderTiles(0, PAGE);
      gallery.classList.remove("is-switching");
    }, reduceMotion ? 0 : 380);
  }

  $("[data-filters]").addEventListener("click", (e) => {
    const b = e.target.closest("[data-filter]");
    if (b) setFilter(b.dataset.filter);
  });
  moreBtn.addEventListener("click", () => renderTiles(visible, visible + 16));
  moreBtn.hidden = visible >= currentList.length;
  gallery.addEventListener("click", (e) => {
    const t = e.target.closest("[data-index]");
    if (t) openLightbox(+t.dataset.index);
  });

  /* ------------------------------------------------------------------ */
  /* Lightbox                                                           */
  /* ------------------------------------------------------------------ */
  const lb = $("[data-lightbox]");
  const lbImg = $("[data-lb-img]");
  const lbCap = $("[data-lb-cap]");
  let lbIndex = 0;
  let lbReturn = null;

  function lbShow(i) {
    lbIndex = (i + currentList.length) % currentList.length;
    const p = currentList[lbIndex];
    lbImg.classList.add("is-swapping");
    const w = Math.min(1600, Math.ceil((innerWidth * (window.devicePixelRatio || 1)) / 200) * 200);
    const next = new Image();
    next.src = T.cl(p, w);
    const swap = () => {
      lbImg.src = next.src;
      lbImg.alt = T.altFor(p);
      lbImg.classList.remove("is-swapping");
    };
    next.decode ? next.decode().then(swap, swap) : (next.onload = swap);
    lbCap.textContent = `${T.label(p.category)}  ·  ${String(lbIndex + 1).padStart(3, "0")} / ${String(currentList.length).padStart(3, "0")}`;
  }

  function openLightbox(i) {
    lbReturn = document.activeElement;
    lb.hidden = false;
    document.body.classList.add("is-locked");
    requestAnimationFrame(() => lb.classList.add("is-open"));
    lbShow(i);
    $("[data-lb-close]").focus();
  }
  function closeLightbox() {
    lb.classList.remove("is-open");
    document.body.classList.remove("is-locked");
    setTimeout(() => (lb.hidden = true), 350);
    if (lbReturn) lbReturn.focus();
  }
  $("[data-lb-close]").addEventListener("click", closeLightbox);
  $("[data-lb-prev]").addEventListener("click", () => lbShow(lbIndex - 1));
  $("[data-lb-next]").addEventListener("click", () => lbShow(lbIndex + 1));
  lb.addEventListener("click", (e) => { if (e.target === lb || e.target.classList.contains("lightbox__figure")) closeLightbox(); });
  let touchX = null;
  lb.addEventListener("touchstart", (e) => (touchX = e.touches[0].clientX), { passive: true });
  lb.addEventListener("touchend", (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) lbShow(lbIndex + (dx < 0 ? 1 : -1));
    touchX = null;
  });

  /* ------------------------------------------------------------------ */
  /* Booking modal: pick the closest studio, then chat on WhatsApp      */
  /* ------------------------------------------------------------------ */
  const modal = $("[data-modal]");
  const branchList = $("[data-branch-list]");
  const chipWrap = $("[data-session-chips]");
  const waBtn = $("[data-wa]");
  let selectedBranch = null;
  let selectedSession = null;
  let modalReturn = null;

  const syncChips = () => $$(".chip", chipWrap).forEach((c) => c.setAttribute("aria-pressed", String(c.textContent === selectedSession)));

  chipWrap.addEventListener("click", (e) => {
    const c = e.target.closest(".chip");
    if (!c) return;
    selectedSession = selectedSession === c.textContent ? null : c.textContent;
    syncChips();
    updateWa();
  });
  branchList.addEventListener("click", (e) => {
    const b = e.target.closest("[data-branch]");
    if (b) chooseBranch(b.dataset.branch);
  });

  function matchChip(serviceName) {
    if (!serviceName) return null;
    const s = serviceName.toLowerCase();
    if (s.includes("convocation")) return "Convocation";
    if (s.includes("maternity")) return "Maternity";
    if (s.includes("couple")) return "Couples";
    if (s.includes("family")) return "Family";
    if (s.includes("corporate") || s.includes("headshot")) return "Headshots";
    return "Studio portrait";
  }

  function updateWa() {
    const b = site.branches.find((x) => x.key === selectedBranch);
    if (!b) return;
    const what = selectedSession ? `a ${selectedSession.toLowerCase()} session` : "a photo session";
    const msg = `Hello Clone Pictures (${b.name})! I found you on your website and I'd like to book ${what}. Please share your available dates and packages.`;
    waBtn.href = `https://wa.me/${b.wa}?text=${encodeURIComponent(msg)}`;
  }

  const setStep = (n) => $$(".modal__step", modal).forEach((s) => s.classList.toggle("is-active", s.dataset.step === String(n)));

  function chooseBranch(key) {
    const b = site.branches.find((x) => x.key === key);
    if (!b) return;
    selectedBranch = key;
    $("[data-branch-name]").textContent = b.name;
    $("[data-branch-addr]").textContent = b.address;
    $("[data-wa-number]").textContent = b.phone;
    const tel = $("[data-tel]");
    tel.href = `tel:+${b.wa}`;
    tel.textContent = `Call ${b.phone}`;
    updateWa();
    setStep(2);
    waBtn.focus();
  }

  function openBooking(serviceName, branchKey) {
    modalReturn = document.activeElement;
    selectedSession = matchChip(serviceName);
    syncChips();
    closeMenu();
    modal.hidden = false;
    document.body.classList.add("is-locked");
    requestAnimationFrame(() => modal.classList.add("is-open"));
    if (branchKey) chooseBranch(branchKey);
    else {
      setStep(1);
      $(".branch", branchList).focus();
    }
  }

  function closeBooking() {
    modal.classList.remove("is-open");
    document.body.classList.remove("is-locked");
    setTimeout(() => (modal.hidden = true), 450);
    if (modalReturn) modalReturn.focus();
  }

  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-book], [data-service], [data-book-branch]");
    if (!t) return;
    openBooking(t.dataset.service || null, t.dataset.bookBranch || null);
  });
  $$("[data-close]", modal).forEach((b) => b.addEventListener("click", closeBooking));
  $("[data-back]").addEventListener("click", () => {
    setStep(1);
    $(".branch", branchList).focus();
  });

  // Keep focus inside open dialogs; Esc / arrows.
  document.addEventListener("keydown", (e) => {
    const dialog = !modal.hidden ? modal : !lb.hidden ? lb : null;
    if (!dialog) return;
    if (e.key === "Escape") return dialog === modal ? closeBooking() : closeLightbox();
    if (dialog === lb && e.key === "ArrowRight") lbShow(lbIndex + 1);
    if (dialog === lb && e.key === "ArrowLeft") lbShow(lbIndex - 1);
    if (e.key === "Tab") {
      const f = $$("button, a[href]", dialog).filter((el) => el.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ------------------------------------------------------------------ */
  /* Nav + mobile menu                                                  */
  /* ------------------------------------------------------------------ */
  const nav = $(".nav");
  const toggle = $(".nav__toggle");
  const menu = $(".mobile-menu");

  function closeMenu() {
    if (!menu.classList.contains("is-open")) return;
    menu.classList.remove("is-open");
    menu.setAttribute("aria-hidden", "true");
    toggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("is-locked");
  }
  toggle.addEventListener("click", () => {
    if (menu.classList.contains("is-open")) return closeMenu();
    menu.classList.add("is-open");
    menu.setAttribute("aria-hidden", "false");
    toggle.setAttribute("aria-expanded", "true");
    document.body.classList.add("is-locked");
  });
  $$("a", menu).forEach((a) => a.addEventListener("click", closeMenu));

  let lastY = 0;
  const ctaBg = $("[data-cta-bg]");
  const cta = $(".cta");
  function onScroll() {
    const y = window.scrollY;
    nav.classList.toggle("is-scrolled", y > 40);
    nav.classList.toggle("is-hidden", y > lastY && y > 600 && !menu.classList.contains("is-open"));
    lastY = y;
    if (!reduceMotion && ctaBg) {
      const r = cta.getBoundingClientRect();
      if (r.bottom > 0 && r.top < innerHeight) {
        // The bg overhangs the section by 10% each way, so keep the shift inside that.
        const prog = Math.max(-1, Math.min(1, (r.top + r.height / 2 - innerHeight / 2) / innerHeight));
        ctaBg.style.transform = `translate3d(0, ${prog * -7}%, 0)`;
      }
    }
  }
  let ticking = false;
  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { onScroll(); ticking = false; });
  }, { passive: true });

  /* ------------------------------------------------------------------ */
  /* Focus-ring cursor                                                  */
  /* ------------------------------------------------------------------ */
  function initCursor() {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches || reduceMotion) return;
    const c = $(".cursor");
    const ring = $(".cursor__ring", c);
    const dot = $(".cursor__dot", c);
    let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y;
    window.addEventListener("mousemove", (e) => {
      x = e.clientX; y = e.clientY;
      dot.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      const t = e.target.closest("[data-cursor='image'], a, button");
      c.classList.toggle("is-image", !!(t && t.dataset.cursor === "image"));
      c.classList.toggle("is-link", !!(t && !t.dataset.cursor));
    });
    (function loop() {
      rx += (x - rx) * 0.18;
      ry += (y - ry) * 0.18;
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
      requestAnimationFrame(loop);
    })();
  }

  /* ------------------------------------------------------------------ */
  /* Counters                                                           */
  /* ------------------------------------------------------------------ */
  function initCounters() {
    const cio = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        cio.unobserve(e.target);
        const el = e.target;
        const target = parseFloat(el.dataset.count);
        const decimals = (el.dataset.count.split(".")[1] || "").length;
        const suffix = el.dataset.suffix || "";
        const dur = reduceMotion ? 0 : 1800;
        const t0 = performance.now();
        (function step(t) {
          const k = dur ? Math.min((t - t0) / dur, 1) : 1;
          const eased = 1 - Math.pow(1 - k, 4);
          el.textContent = (target * eased).toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
          if (k < 1) requestAnimationFrame(step);
        })(t0);
      });
    }, { threshold: 0.6 });
    // The real numbers ship in the HTML (for crawlers / no-JS); count up from zero here.
    $$("[data-count]").forEach((el) => {
      el.textContent = "0";
      cio.observe(el);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Boot                                                               */
  /* ------------------------------------------------------------------ */
  observe($$(".reveal-up, .develop").filter((el) => !el.closest(".hero")));
  initCursor();
  initCounters();
  onScroll();
  runLoader();
})();
