(() => {
  "use strict";

  const CLOUD = window.CLONE_CLOUD;
  const PHOTOS = window.CLONE_PHOTOS || [];
  const byId = Object.fromEntries(PHOTOS.map((p) => [p.id, p]));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  /* ------------------------------------------------------------------ */
  /* Data                                                               */
  /* ------------------------------------------------------------------ */
  const BRANCHES = [
    {
      key: "yaba",
      name: "Yaba",
      title: "Clone Pictures <em>Yaba</em>",
      area: "Ozone Cinemas Mall",
      address: "Ozone Cinemas Mall, 11 Commercial Avenue, Sabo, Yaba, Lagos",
      phone: "0903 818 1728",
      wa: "2349038181728",
      map: "https://www.google.com/maps/search/?api=1&query=Ozone+Cinemas+Commercial+Avenue+Sabo+Yaba+Lagos",
      instagram: "https://www.instagram.com/clonepictures_yabastudio/",
      photo: "p125",
      hint: "Ozone Cinemas Mall, Sabo. Close to Unilag, Akoka & Ebute Metta",
    },
    {
      key: "leisure",
      name: "Leisure Mall, Surulere",
      title: "Leisure Mall <em>Surulere</em>",
      area: "Beside ShopRite",
      address: "Leisure Mall, beside ShopRite, Adeniran Ogunsanya Street, Surulere, Lagos",
      phone: "0704 897 8732",
      wa: "2347048978732",
      map: "https://www.google.com/maps/search/?api=1&query=Leisure+Mall+Adeniran+Ogunsanya+Surulere+Lagos",
      instagram: "https://www.instagram.com/clone_studiopictures/",
      photo: "p054",
      hint: "Inside Leisure Mall, beside ShopRite",
    },
    {
      key: "adeniran",
      name: "Adeniran Ogunsanya, Surulere",
      title: "Adeniran Ogunsanya <em>Surulere</em>",
      area: "Beside The Place Restaurant",
      address: "Adeniran Ogunsanya Street, beside The Place Restaurant, Surulere, Lagos",
      phone: "0808 477 2545",
      wa: "2348084772545",
      map: "https://www.google.com/maps/search/?api=1&query=The+Place+Restaurant+Adeniran+Ogunsanya+Surulere+Lagos",
      instagram: "https://www.instagram.com/clone_studiopictures/",
      photo: "p012",
      hint: "On Adeniran Ogunsanya St, beside The Place Restaurant",
    },
  ];

  const SERVICES = [
    { name: "Studio Portraits", photo: "p168", desc: "Solo editorial portraits on our signature sets, for birthdays, brand shoots or just because." },
    { name: "Convocation", photo: "p252", desc: "Gown, cap and all. Celebrate your milestone with portraits worthy of the wall." },
    { name: "Maternity", photo: "p232", desc: "Soft, glowing images that honour the bump and the journey to meeting your little one." },
    { name: "Couples & Pre-wedding", photo: "p205", desc: "Chemistry, captured. Pre-wedding, anniversaries and everything in between." },
    { name: "Family & Kids", photo: "p093", desc: "Generations in one frame, plus playful birthday setups for the little ones." },
    { name: "Corporate & Headshots", photo: "p107", desc: "Crisp, confident headshots for LinkedIn, company profiles and the boardroom." },
  ];

  const CATEGORIES = [
    ["all", "All"],
    ["portrait", "Portraits"],
    ["graduation", "Convocation"],
    ["couples", "Couples"],
    ["family", "Family & Kids"],
    ["maternity", "Maternity"],
    ["corporate", "Corporate"],
    ["milestones", "NYSC & Call to Bar"],
  ];

  const SESSION_CHIPS = ["Studio portrait", "Birthday shoot", "Convocation", "Maternity", "Couples", "Family", "Headshots", "Makeup & hair"];

  /* ------------------------------------------------------------------ */
  /* Cloudinary helpers                                                 */
  /* ------------------------------------------------------------------ */
  const cl = (p, w, extra = "") =>
    `https://res.cloudinary.com/${CLOUD}/image/upload/f_auto,q_auto,c_limit,w_${w}${extra ? "," + extra : ""}/v${p.version}/${p.public_id}`;

  const srcset = (p, widths, extra) => widths.map((w) => `${cl(p, w, extra)} ${w}w`).join(", ");

  function img(p, { sizes = "100vw", widths = [480, 800, 1200], extra = "", alt = "", eager = false } = {}) {
    const el = document.createElement("img");
    el.src = cl(p, widths[1] || widths[0], extra);
    el.srcset = srcset(p, widths, extra);
    el.sizes = sizes;
    el.alt = alt;
    el.decoding = "async";
    if (!eager) el.loading = "lazy";
    if (!extra) {
      el.width = p.w;
      el.height = p.h;
    }
    return el;
  }

  const labelFor = (cat) => (CATEGORIES.find(([k]) => k === cat) || [, "Portrait"])[1];
  const altFor = (p) => `${labelFor(p.category)} session by Clone Pictures Studio, Lagos`;

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

  function stagger(container, selector, step = 0.08) {
    $$(selector, container).forEach((el, i) => el.style.setProperty("--d", `${(i % 6) * step}s`));
  }

  /* ------------------------------------------------------------------ */
  /* Hero slideshow + viewfinder                                        */
  /* ------------------------------------------------------------------ */
  const HERO = ["p115", "p012", "p125", "p046", "p042"].map((id) => byId[id]).filter(Boolean);
  const heroWrap = $("[data-hero]");
  const heroSlides = HERO.map((p, i) => {
    const slide = document.createElement("div");
    slide.className = "hero__slide";
    slide.appendChild(img(p, { widths: [800, 1400, 2200], sizes: "100vw", alt: i === 0 ? "Portrait in a flowing red gown at Clone Pictures studio" : "", eager: i === 0 }));
    heroWrap.appendChild(slide);
    return slide;
  });
  const firstHeroImg = heroSlides[0] && $("img", heroSlides[0]);

  let heroIndex = 0;
  const frameEl = $("[data-frame]");
  const needle = $(".vf-needle");
  const focus = $(".vf-focus");

  function refocus() {
    if (!focus) return;
    focus.classList.remove("is-hunting", "is-locked");
    void focus.offsetWidth;
    focus.classList.add("is-hunting");
    setTimeout(() => focus.classList.add("is-locked"), 900);
    if (needle) needle.style.left = `${38 + Math.random() * 24}%`;
  }

  function showHero(i) {
    const prev = heroSlides[heroIndex];
    heroIndex = (i + heroSlides.length) % heroSlides.length;
    const next = heroSlides[heroIndex];
    if (prev && prev !== next) {
      prev.classList.remove("is-active");
      prev.classList.add("is-leaving");
      setTimeout(() => prev.classList.remove("is-leaving"), 1300);
    }
    next.classList.add("is-active");
    if (frameEl) frameEl.textContent = `${String(17 + heroIndex * 53).padStart(3, "0")} / 302`;
    refocus();
  }

  /* ------------------------------------------------------------------ */
  /* Loader                                                             */
  /* ------------------------------------------------------------------ */
  function runLoader() {
    const fEl = $("[data-fstop]");
    const stops = ["16", "11", "8", "5.6", "4", "2.8"];
    let s = 0;
    const tick = setInterval(() => {
      s = Math.min(s + 1, stops.length - 1);
      if (fEl) fEl.textContent = stops[s];
    }, 280);

    const minTime = new Promise((r) => setTimeout(r, reduceMotion ? 0 : 1900));
    const imgReady = new Promise((r) => {
      if (!firstHeroImg || firstHeroImg.complete) return r();
      firstHeroImg.addEventListener("load", r, { once: true });
      firstHeroImg.addEventListener("error", r, { once: true });
      setTimeout(r, 3500);
    });

    Promise.all([minTime, imgReady]).then(() => {
      clearInterval(tick);
      if (fEl) fEl.textContent = "2.8";
      document.body.classList.remove("is-loading");
      const flash = $(".flash");
      if (!reduceMotion && flash) flash.classList.add("is-firing");
      showHero(0);
      setTimeout(() => {
        document.body.classList.add("is-ready");
        observe($$(".hero .reveal-up"));
      }, 250);
      if (heroSlides.length > 1) setInterval(() => showHero(heroIndex + 1), 6500);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Film strip                                                         */
  /* ------------------------------------------------------------------ */
  function buildStrip() {
    const track = $("[data-strip]");
    const ids = ["p000", "p054", "p142", "p060", "p099", "p252", "p231", "p036", "p086", "p110", "p175", "p016", "p184", "p288", "p265", "p192"];
    const frames = ids.map((id) => byId[id]).filter(Boolean);
    const make = (p, n, hidden) => {
      const f = document.createElement("div");
      f.className = "strip__frame";
      f.dataset.cursor = "image";
      if (hidden) f.setAttribute("aria-hidden", "true");
      f.appendChild(img(p, { widths: [240, 360, 480], extra: "c_fill,g_auto,ar_4:5", sizes: "230px" }));
      const lbl = document.createElement("span");
      lbl.className = "mono";
      lbl.textContent = `${String(n + 1).padStart(2, "0")}A ▸ CLONE 400`;
      f.appendChild(lbl);
      return f;
    };
    // Two copies so the marquee loops seamlessly.
    frames.forEach((p, i) => track.appendChild(make(p, i, false)));
    frames.forEach((p, i) => track.appendChild(make(p, i, true)));
  }

  /* ------------------------------------------------------------------ */
  /* Services                                                           */
  /* ------------------------------------------------------------------ */
  function buildServices() {
    const grid = $("[data-services]");
    SERVICES.forEach((s, i) => {
      const p = byId[s.photo];
      const card = document.createElement("button");
      card.type = "button";
      card.className = "service reveal-up";
      card.dataset.cursor = "image";
      card.setAttribute("aria-label", `Book a ${s.name} session`);
      card.innerHTML = `
        <div class="service__media develop"></div>
        <span class="service__arrow" aria-hidden="true">↗</span>
        <div class="service__body">
          <span class="service__num mono">${String(i + 1).padStart(2, "0")} / 06</span>
          <h3 class="service__title">${s.name}</h3>
          <p class="service__desc">${s.desc}</p>
        </div>`;
      if (p) $(".service__media", card).appendChild(img(p, { widths: [480, 760, 1000], extra: "c_fill,g_auto,ar_4:5", sizes: "(max-width: 560px) 100vw, (max-width: 1000px) 50vw, 33vw", alt: `${s.name} at Clone Pictures` }));
      card.addEventListener("click", () => openBooking(s.name));
      grid.appendChild(card);
    });
    stagger(grid, ".service", 0.1);
    observe($$(".service, .service .develop", grid));
  }

  /* ------------------------------------------------------------------ */
  /* Gallery                                                            */
  /* ------------------------------------------------------------------ */
  const gallery = $("[data-gallery]");
  const moreBtn = $("[data-more]");
  const GALLERY = PHOTOS.filter((p) => p.origin === "pixieset");
  // Interleave categories so "All" opens with variety rather than 31 portraits in a row.
  const mixed = (() => {
    const buckets = CATEGORIES.slice(1).map(([k]) => GALLERY.filter((p) => p.category === k));
    const out = [];
    for (let i = 0; out.length < GALLERY.length; i++) buckets.forEach((b) => b[i] && out.push(b[i]));
    return out;
  })();
  let currentFilter = "all";
  let visible = 0;
  const PAGE = 20;
  let currentList = mixed;

  function buildFilters() {
    const wrap = $("[data-filters]");
    CATEGORIES.forEach(([key, label]) => {
      const count = key === "all" ? GALLERY.length : GALLERY.filter((p) => p.category === key).length;
      const b = document.createElement("button");
      b.className = "filter";
      b.type = "button";
      b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", String(key === "all"));
      b.innerHTML = `${label}<sup>${count}</sup>`;
      b.addEventListener("click", () => setFilter(key));
      wrap.appendChild(b);
    });
  }

  function renderTiles(from, to) {
    const frag = document.createDocumentFragment();
    currentList.slice(from, to).forEach((p, j) => {
      const idx = from + j;
      const t = document.createElement("button");
      t.type = "button";
      t.className = "tile develop";
      t.dataset.cursor = "image";
      t.style.setProperty("--ar", `${p.w} / ${p.h}`);
      t.setAttribute("aria-label", `Open photo ${idx + 1}: ${labelFor(p.category)}`);
      t.appendChild(img(p, { widths: [400, 640, 900], sizes: "(max-width: 560px) 50vw, (max-width: 900px) 33vw, 25vw", alt: altFor(p) }));
      const meta = document.createElement("span");
      meta.className = "tile__meta mono";
      meta.innerHTML = `<span>${labelFor(p.category)}</span><span>${String(idx + 1).padStart(3, "0")}</span>`;
      t.appendChild(meta);
      t.addEventListener("click", () => openLightbox(idx));
      frag.appendChild(t);
    });
    gallery.appendChild(frag);
    observe($$(".tile:not(.is-in)", gallery));
    visible = Math.min(to, currentList.length);
    moreBtn.hidden = visible >= currentList.length;
  }

  function setFilter(key) {
    if (key === currentFilter) return;
    currentFilter = key;
    $$(".filter").forEach((b, i) => b.setAttribute("aria-selected", String(CATEGORIES[i][0] === key)));
    gallery.classList.add("is-switching");
    setTimeout(() => {
      currentList = key === "all" ? mixed : GALLERY.filter((p) => p.category === key);
      gallery.innerHTML = "";
      renderTiles(0, PAGE);
      gallery.classList.remove("is-switching");
    }, reduceMotion ? 0 : 380);
  }

  moreBtn.addEventListener("click", () => renderTiles(visible, visible + 16));

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
    const next = new Image();
    next.src = cl(p, 1600);
    const swap = () => {
      lbImg.src = next.src;
      lbImg.alt = altFor(p);
      lbImg.classList.remove("is-swapping");
    };
    next.decode ? next.decode().then(swap, swap) : (next.onload = swap);
    lbCap.textContent = `${labelFor(p.category)}  ·  ${String(lbIndex + 1).padStart(3, "0")} / ${String(currentList.length).padStart(3, "0")}`;
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
  /* Studios + footer                                                   */
  /* ------------------------------------------------------------------ */
  function buildStudios() {
    const grid = $("[data-studios]");
    BRANCHES.forEach((b, i) => {
      const p = byId[b.photo];
      const card = document.createElement("article");
      card.className = "studio reveal-up";
      card.innerHTML = `
        <div class="studio__media develop" data-cursor="image"><span class="studio__tag mono">Studio 0${i + 1}</span></div>
        <div class="studio__body">
          <h3 class="studio__name">${b.title}</h3>
          <p class="studio__addr">${b.address}</p>
          <a class="studio__phone" href="tel:+${b.wa}">${b.phone}</a>
          <div class="studio__actions">
            <button class="btn btn--solid" type="button">Book here</button>
            <a class="btn btn--ghost" href="${b.map}" target="_blank" rel="noopener">Directions ↗</a>
          </div>
        </div>`;
      if (p) $(".studio__media", card).appendChild(img(p, { widths: [480, 760, 1000], extra: "c_fill,g_auto,ar_5:4", sizes: "(max-width: 640px) 100vw, 33vw", alt: `Portrait shot at Clone Pictures ${b.name}` }));
      $(".btn--solid", card).addEventListener("click", () => openBooking(null, b.key));
      grid.appendChild(card);
    });
    stagger(grid, ".studio", 0.12);
    observe($$(".studio, .studio .develop", grid));

    $("[data-menu-studios]").innerHTML =
      `<span class="mono">WhatsApp a studio</span>` +
      BRANCHES.map((b) => `<a href="https://wa.me/${b.wa}" target="_blank" rel="noopener"><span>${b.name}</span><span>${b.phone}</span></a>`).join("");

    $("[data-footer-studios]").innerHTML =
      `<h4 class="mono">Studios</h4>` +
      BRANCHES.map((b) => `<p>${b.name}<small><a href="https://wa.me/${b.wa}" target="_blank" rel="noopener">WhatsApp ${b.phone}</a></small></p>`).join("");
  }

  /* ------------------------------------------------------------------ */
  /* Instagram + CTA                                                    */
  /* ------------------------------------------------------------------ */
  function buildGram() {
    const grid = $("[data-gram]");
    PHOTOS.filter((p) => p.origin === "instagram").forEach((p) => {
      const a = document.createElement("a");
      a.href = p.post;
      a.target = "_blank";
      a.rel = "noopener";
      a.className = "gram__item develop reveal-up";
      a.dataset.cursor = "image";
      a.appendChild(img(p, { widths: [320, 480, 640], sizes: "(max-width: 900px) 33vw, 16vw", alt: p.caption || "Instagram post by Clone Pictures" }));
      const cap = document.createElement("span");
      cap.className = "gram__cap mono";
      cap.textContent = p.caption || "View on Instagram";
      a.appendChild(cap);
      grid.appendChild(a);
    });
    stagger(grid, ".gram__item", 0.07);
    observe($$(".gram__item", grid));

    const ctaP = byId.p231;
    if (ctaP) $("[data-cta-bg]").appendChild(img(ctaP, { widths: [800, 1400, 2000], sizes: "100vw", alt: "" }));
  }

  /* ------------------------------------------------------------------ */
  /* Booking modal                                                      */
  /* ------------------------------------------------------------------ */
  const modal = $("[data-modal]");
  const branchList = $("[data-branch-list]");
  const waBtn = $("[data-wa]");
  let selectedBranch = null;
  let selectedSession = null;
  let modalReturn = null;

  BRANCHES.forEach((b) => {
    const p = byId[b.photo];
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "branch";
    btn.innerHTML = `<span></span><span><strong>${b.name}</strong><small>${b.hint}</small></span><span class="branch__go" aria-hidden="true">→</span>`;
    if (p) btn.firstChild.replaceWith(img(p, { widths: [128, 160, 200], extra: "c_fill,g_face,ar_1:1", sizes: "64px", alt: "" }));
    btn.addEventListener("click", () => chooseBranch(b.key));
    branchList.appendChild(btn);
  });

  const chipWrap = $("[data-session-chips]");
  SESSION_CHIPS.forEach((label) => {
    const c = document.createElement("button");
    c.type = "button";
    c.className = "chip";
    c.textContent = label;
    c.setAttribute("aria-pressed", "false");
    c.addEventListener("click", () => {
      selectedSession = selectedSession === label ? null : label;
      syncChips();
      updateWa();
    });
    chipWrap.appendChild(c);
  });

  function syncChips() {
    $$(".chip", chipWrap).forEach((c) => c.setAttribute("aria-pressed", String(c.textContent === selectedSession)));
  }

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
    const b = BRANCHES.find((x) => x.key === selectedBranch);
    if (!b) return;
    const what = selectedSession ? `a ${selectedSession.toLowerCase()} session` : "a photo session";
    const msg = `Hello Clone Pictures (${b.name})! I found you on your website and I'd like to book ${what}. Please share your available dates and packages.`;
    waBtn.href = `https://wa.me/${b.wa}?text=${encodeURIComponent(msg)}`;
  }

  function setStep(n) {
    $$(".modal__step", modal).forEach((s) => s.classList.toggle("is-active", s.dataset.step === String(n)));
  }

  function chooseBranch(key) {
    const b = BRANCHES.find((x) => x.key === key);
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

  $$("[data-book]").forEach((b) => b.addEventListener("click", () => openBooking()));
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
    const open = !menu.classList.contains("is-open");
    if (!open) return closeMenu();
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
    $$("[data-count]").forEach((el) => cio.observe(el));
  }

  /* ------------------------------------------------------------------ */
  /* Boot                                                               */
  /* ------------------------------------------------------------------ */
  buildStrip();
  buildServices();
  buildFilters();
  renderTiles(0, PAGE);
  buildStudios();
  buildGram();
  initCursor();
  initCounters();
  stagger(document, ".stats .stat", 0.12);
  stagger(document, ".process__list li", 0.15);
  observe($$(".reveal-up").filter((el) => !el.closest(".hero")));
  $("[data-year]").textContent = new Date().getFullYear();
  onScroll();
  runLoader();
})();
