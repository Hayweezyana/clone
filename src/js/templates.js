/* HTML templates shared by the build (pre-rendering) and the browser (re-rendering
   the gallery when filters change), so both always produce identical markup. */
(function (root) {
  "use strict";

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const pad = (n, len = 2) => String(n).padStart(len, "0");

  function create(data) {
    const { cloud, photos, site } = data;
    const byId = Object.fromEntries(photos.map((p) => [p.id, p]));
    const cats = site.categories;
    const label = (cat) => (cats.find((c) => c[0] === cat) || [, "Portrait"])[1];
    const altFor = (p) => `${(cats.find((c) => c[0] === p.category) || [, , "Portrait"])[2]} at Clone Pictures photo studio, Lagos`;

    // `extra` may carry its own crop mode (e.g. c_fill for fixed aspect ratios); otherwise c_limit.
    const cl = (p, w, extra = "") =>
      `https://res.cloudinary.com/${cloud}/image/upload/f_auto,q_auto,${/\bc_/.test(extra) ? extra : "c_limit" + (extra ? "," + extra : "")},w_${w}/v${p.version}/${p.public_id}`;
    const srcset = (p, widths, extra) => widths.map((w) => `${cl(p, w, extra)} ${w}w`).join(", ");

    // Intrinsic size for the width/height attributes (prevents layout shift).
    function dims(p, extra) {
      const m = /ar_(\d+):(\d+)/.exec(extra || "");
      if (!m) return [p.w, p.h];
      return [1000, Math.round((1000 * +m[2]) / +m[1])];
    }

    function img(p, o = {}) {
      if (!p) return "";
      const widths = o.widths || [480, 800, 1200];
      const extra = o.extra || "";
      const [w, h] = dims(p, extra);
      const attrs = [
        `src="${cl(p, widths[Math.min(1, widths.length - 1)], extra)}"`,
        `srcset="${srcset(p, widths, extra)}"`,
        `sizes="${o.sizes || "100vw"}"`,
        `width="${w}" height="${h}"`,
        `alt="${esc(o.alt || "")}"`,
        `decoding="async"`,
        o.priority ? `fetchpriority="high"` : o.eager ? "" : `loading="lazy"`,
      ];
      return `<img ${attrs.filter(Boolean).join(" ")}>`;
    }

    /* Hero: portrait screens get a Cloudinary crop matched to the screen so phones
       download ~1/3 of the pixels; landscape screens get the full frame. */
    const HERO_PORTRAIT = { widths: [480, 640, 840, 1080], extra: "c_fill,g_auto,ar_3:5" };
    const HERO_LANDSCAPE = { widths: [960, 1440, 2048] };
    function heroPicture(p, i) {
      const alt = i === 0 ? "Portrait in a flowing red gown at Clone Pictures photo studio, Lagos" : "";
      return `<div class="hero__slide${i === 0 ? " is-active" : ""}"><picture>` +
        `<source media="(orientation: portrait)" srcset="${srcset(p, HERO_PORTRAIT.widths, HERO_PORTRAIT.extra)}" sizes="100vw">` +
        img(p, { widths: HERO_LANDSCAPE.widths, sizes: "100vw", alt, priority: i === 0, eager: i === 0 }) +
        `</picture></div>`;
    }
    function heroPreloads(p) {
      return (
        `<link rel="preload" as="image" media="(orientation: portrait)" imagesrcset="${srcset(p, HERO_PORTRAIT.widths, HERO_PORTRAIT.extra)}" imagesizes="100vw" fetchpriority="high">\n` +
        `<link rel="preload" as="image" media="(orientation: landscape)" imagesrcset="${srcset(p, HERO_LANDSCAPE.widths)}" imagesizes="100vw" fetchpriority="high">`
      );
    }

    function strip() {
      const frames = site.strip.map((id) => byId[id]).filter(Boolean);
      const one = (p, n, hidden) =>
        `<div class="strip__frame" data-cursor="image"${hidden ? ' aria-hidden="true"' : ""}>` +
        img(p, { widths: [240, 360, 480], extra: "c_fill,g_auto,ar_4:5", sizes: "230px", alt: hidden ? "" : altFor(p) }) +
        `<span class="mono">${pad(n + 1)}A ▸ CLONE 400</span></div>`;
      // Two copies so the marquee loops seamlessly.
      return frames.map((p, i) => one(p, i, false)).join("") + frames.map((p, i) => one(p, i, true)).join("");
    }

    function services() {
      return site.services
        .map((s, i) =>
          `<button type="button" class="service reveal-up" style="--d:${(i % 6) * 0.1}s" data-cursor="image" data-service="${esc(s.name)}" aria-label="Book a ${esc(s.name)} session">` +
          `<div class="service__media develop">${img(byId[s.photo], { widths: [480, 760, 1000], extra: "c_fill,g_auto,ar_4:5", sizes: "(max-width: 560px) 100vw, (max-width: 1000px) 50vw, 33vw", alt: `${s.name} photography at Clone Pictures, Lagos` })}</div>` +
          `<span class="service__arrow" aria-hidden="true">↗</span>` +
          `<div class="service__body"><span class="service__num mono">${pad(i + 1)} / ${pad(site.services.length)}</span>` +
          `<h3 class="service__title">${esc(s.name)}</h3><p class="service__desc">${esc(s.desc)}</p></div></button>`
        )
        .join("");
    }

    const gallery = photos.filter((p) => p.origin === "pixieset");
    // Interleave categories so "All" opens with variety rather than 31 portraits in a row.
    const mixed = (() => {
      const buckets = cats.slice(1).map(([k]) => gallery.filter((p) => p.category === k));
      const out = [];
      for (let i = 0; out.length < gallery.length; i++) buckets.forEach((b) => b[i] && out.push(b[i]));
      return out;
    })();
    const galleryList = (key) => (key === "all" ? mixed : gallery.filter((p) => p.category === key));

    function filters() {
      return cats
        .map(([key, name]) => {
          const count = galleryList(key).length;
          return `<button class="filter" type="button" role="tab" data-filter="${key}" aria-selected="${key === "all"}">${esc(name)}<sup>${count}</sup></button>`;
        })
        .join("");
    }

    function tiles(list, from, to) {
      return list
        .slice(from, to)
        .map((p, j) => {
          const idx = from + j;
          return (
            `<button type="button" class="tile develop" data-cursor="image" data-index="${idx}" style="--ar:${p.w} / ${p.h}" aria-label="Open photo ${idx + 1}: ${esc(label(p.category))}">` +
            img(p, { widths: [400, 640, 900], sizes: "(max-width: 560px) 50vw, (max-width: 900px) 33vw, 25vw", alt: altFor(p) }) +
            `<span class="tile__meta mono"><span>${esc(label(p.category))}</span><span>${pad(idx + 1, 3)}</span></span></button>`
          );
        })
        .join("");
    }

    function studios() {
      return site.branches
        .map((b, i) =>
          `<article class="studio reveal-up" style="--d:${i * 0.12}s" id="studio-${b.key}">` +
          `<div class="studio__media develop" data-cursor="image"><span class="studio__tag mono">Studio ${pad(i + 1)}</span>` +
          img(byId[b.photo], { widths: [480, 760, 1000], extra: "c_fill,g_auto,ar_5:4", sizes: "(max-width: 640px) 100vw, 33vw", alt: `Portrait photographed at Clone Pictures ${b.name}` }) +
          `</div><div class="studio__body"><h3 class="studio__name">${b.title}</h3>` +
          `<p class="studio__addr">${esc(b.address)}</p>` +
          `<a class="studio__phone" href="tel:+${b.wa}">${esc(b.phone)}</a>` +
          `<div class="studio__actions"><button class="btn btn--solid" type="button" data-book-branch="${b.key}">Book here</button>` +
          `<a class="btn btn--ghost" href="${esc(b.map)}" target="_blank" rel="noopener">Directions ↗</a></div></div></article>`
        )
        .join("");
    }

    function gram() {
      return photos
        .filter((p) => p.origin === "instagram")
        .map((p, i) =>
          `<a href="${esc(p.post)}" target="_blank" rel="noopener" class="gram__item develop reveal-up" style="--d:${(i % 6) * 0.07}s" data-cursor="image">` +
          img(p, { widths: [320, 480, 640], sizes: "(max-width: 900px) 33vw, 16vw", alt: "" }) +
          `<span class="gram__cap mono">${esc(p.caption || "View on Instagram")}</span></a>`
        )
        .join("");
    }

    function branchOptions() {
      return site.branches
        .map((b) =>
          `<button type="button" class="branch" data-branch="${b.key}">` +
          img(byId[b.photo], { widths: [128, 160, 200], extra: "c_fill,g_face,ar_1:1", sizes: "64px", alt: "" }) +
          `<span><strong>${esc(b.name)}</strong><small>${esc(b.hint)}</small></span><span class="branch__go" aria-hidden="true">→</span></button>`
        )
        .join("");
    }

    const chips = () =>
      site.sessionChips.map((c) => `<button type="button" class="chip" aria-pressed="false">${esc(c)}</button>`).join("");

    const menuStudios = () =>
      `<span class="mono">WhatsApp a studio</span>` +
      site.branches.map((b) => `<a href="https://wa.me/${b.wa}" target="_blank" rel="noopener"><span>${esc(b.name)}</span><span>${esc(b.phone)}</span></a>`).join("");

    const footerStudios = () =>
      `<h3 class="mono">Studios</h3>` +
      site.branches
        .map((b) => `<p>${esc(b.name)}<small><a href="https://wa.me/${b.wa}" target="_blank" rel="noopener">WhatsApp ${esc(b.phone)}</a></small></p>`)
        .join("");

    return {
      esc, byId, label, altFor, cl, img, heroPicture, heroPreloads, strip, services, filters,
      tiles, galleryList, studios, gram, branchOptions, chips, menuStudios, footerStudios,
    };
  }

  root.CloneTemplates = { create };
})(typeof window !== "undefined" ? window : globalThis);
