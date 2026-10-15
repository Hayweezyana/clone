// Builds the static site into dist/ (no dependencies; Node 18+).
//
//   node scripts/build.mjs            SITE_URL defaults to the Render URL below
//   SITE_URL=https://example.com node scripts/build.mjs
//
// Pre-renders all page content into index.html (fast first paint, crawlable),
// inlines the CSS, fingerprints the JS for long-term caching, and writes the
// SEO files: structured data, sitemap (with images), robots.txt and manifest.
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");
const DIST = join(ROOT, "dist");
const SITE_URL = (process.env.SITE_URL || "https://clone-pictures.onrender.com").replace(/\/+$/, "") + "/";

const read = (p) => readFileSync(join(SRC, p), "utf8");
const json = (p) => JSON.parse(read(p));
const hash = (s) => createHash("sha256").update(s).digest("hex").slice(0, 10);

const site = json("data/site.json");
const { cloud, photos } = json("data/photos.json");

// Load the shared templates exactly as the browser does.
const sandbox = {};
vm.runInNewContext(read("js/templates.js"), sandbox);
const T = sandbox.CloneTemplates.create({ cloud, photos, site });

/* ---------------------------------------------------------------- minify */
function minifyCss(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{};,>])\s*/g, "$1")
    .replace(/:\s+/g, ":")
    .replace(/;}/g, "}")
    // `and(` is invalid in media queries; restore the space the colon rule can't reach.
    .replace(/\band\(/g, "and (")
    .trim();
}

function minifyJs(js) {
  return js
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("//"))
    .join("\n");
}

const safeJson = (v) => JSON.stringify(v).replace(/</g, "\\u003c");

/* ---------------------------------------------------------- page pieces */
const ogPhoto = T.byId[site.ogImage];
const ogImage = `https://res.cloudinary.com/${cloud}/image/upload/f_jpg,q_auto,c_fill,g_auto,w_1200,h_630/v${ogPhoto.version}/${ogPhoto.public_id}`;
const logo = `${SITE_URL}icon-512.png`;
const heroPhotos = site.hero.map((id) => T.byId[id]).filter(Boolean);

const jsonld = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}#organization`,
    name: site.name,
    alternateName: site.alternateNames,
    url: SITE_URL,
    logo,
    image: ogImage,
    slogan: site.tagline,
    description: site.description,
    sameAs: site.sameAs,
    department: site.branches.map((b) => ({ "@id": `${SITE_URL}#studio-${b.key}` })),
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}#website`,
    url: SITE_URL,
    name: site.name,
    inLanguage: "en-NG",
    publisher: { "@id": `${SITE_URL}#organization` },
  },
  ...site.branches.map((b) => ({
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${SITE_URL}#studio-${b.key}`,
    name: `${site.name}, ${b.name}`,
    description: `Photography studio for portraits, convocation, maternity, couples, family and corporate headshots in ${b.locality}, Lagos.`,
    url: `${SITE_URL}#studio-${b.key}`,
    image: T.cl(T.byId[b.photo], 1200),
    logo,
    telephone: `+${b.wa}`,
    address: {
      "@type": "PostalAddress",
      streetAddress: b.street,
      addressLocality: b.locality,
      addressRegion: "Lagos",
      addressCountry: "NG",
    },
    hasMap: b.map,
    areaServed: { "@type": "City", name: "Lagos" },
    parentOrganization: { "@id": `${SITE_URL}#organization` },
    sameAs: [b.instagram],
    makesOffer: site.services.map((s) => ({
      "@type": "Offer",
      itemOffered: { "@type": "Service", name: `${s.name} photography`, description: s.desc },
    })),
  })),
];

// Data the browser needs (gallery filters, lightbox, slideshow, booking).
const clientData = {
  cloud,
  photos: photos.map(({ id, category, origin, public_id, version, w, h, post, caption }) => ({ id, category, origin, public_id, version, w, h, post, caption })),
  site: {
    categories: site.categories,
    branches: site.branches.map(({ key, name, address, phone, wa }) => ({ key, name, address, phone, wa })),
    hero: site.hero,
    strip: site.strip,
    services: [],
    sessionChips: [],
    galleryPage: site.galleryPage,
  },
};

const slots = {
  heroPreload: T.heroPreloads(heroPhotos[0]),
  hero: T.heroPicture(heroPhotos[0], 0),
  strip: T.strip(),
  services: T.services(),
  filters: T.filters(),
  tiles: T.tiles(T.galleryList("all"), 0, site.galleryPage),
  studios: T.studios(),
  gram: T.gram(),
  cta: T.img(T.byId[site.cta], { widths: [800, 1400, 2000], sizes: "100vw", alt: "" }),
  branchOptions: T.branchOptions(),
  chips: T.chips(),
  menuStudios: T.menuStudios(),
  footerStudios: T.footerStudios(),
};

/* ---------------------------------------------------------------- write */
rmSync(DIST, { recursive: true, force: true });
mkdirSync(join(DIST, "assets"), { recursive: true });

const js = minifyJs(read("js/templates.js") + "\n" + read("js/main.js"));
const appJs = `/assets/app.${hash(js)}.js`;
writeFileSync(join(DIST, appJs), js);

const fontsUrl =
  "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;1,9..144,300;1,9..144,400&family=Inter+Tight:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap";

const values = {
  title: T.esc(site.title),
  description: T.esc(site.description),
  url: SITE_URL,
  ogImage,
  fontsUrl: T.esc(fontsUrl),
  css: minifyCss(read("css/style.css")),
  jsonld: safeJson(jsonld),
  data: safeJson(clientData),
  appJs,
  year: String(new Date().getFullYear()),
};

let html = read("index.html")
  .replace(/<!--slot:(\w+)-->/g, (_, k) => {
    if (!(k in slots)) throw new Error(`Unknown slot: ${k}`);
    return slots[k];
  })
  .replace(/\{\{(\w+)\}\}/g, (_, k) => {
    if (!(k in values)) throw new Error(`Unknown placeholder: ${k}`);
    return values[k];
  });
// Light HTML minification: drop authoring comments and indentation.
html = html
  .replace(/<!--(?!\[)[\s\S]*?-->/g, "")
  .split("\n")
  .map((l) => l.trim())
  .filter(Boolean)
  .join("\n");
writeFileSync(join(DIST, "index.html"), html);

// Static files (icons etc.) copy straight across.
if (existsSync(join(SRC, "static"))) cpSync(join(SRC, "static"), DIST, { recursive: true });
cpSync(join(SRC, "favicon.svg"), join(DIST, "favicon.svg"));

writeFileSync(
  join(DIST, "robots.txt"),
  `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}sitemap.xml\n`
);

const xmlEsc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const sitemapImages = photos
  .map((p) => `    <image:image><image:loc>${xmlEsc(T.cl(p, 1600))}</image:loc></image:image>`)
  .join("\n");
writeFileSync(
  join(DIST, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>${SITE_URL}</loc>
    <lastmod>${new Date().toISOString().slice(0, 10)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
${sitemapImages}
  </url>
</urlset>
`
);

writeFileSync(
  join(DIST, "site.webmanifest"),
  JSON.stringify(
    {
      name: site.name,
      short_name: "Clone Pictures",
      description: site.description,
      start_url: "/",
      display: "standalone",
      background_color: "#140e0b",
      theme_color: "#140e0b",
      icons: [
        { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
    },
    null,
    2
  )
);

writeFileSync(
  join(DIST, "404.html"),
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Page not found · ${T.esc(site.name)}</title><meta name="robots" content="noindex"><link rel="icon" href="/favicon.svg"><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#140e0b;color:#f4ece1;font-family:Georgia,serif;text-align:center;padding:16px}h1{font-weight:300;font-size:clamp(2rem,8vw,4rem);margin:0 0 .3em}p{color:#a8988a;font-family:system-ui,sans-serif}a{color:#e8b781}</style></head><body><main><h1>Out of focus.</h1><p>This page doesn’t exist. <a href="/">Back to Clone Pictures →</a></p></main></body></html>`
);

const kb = (s) => (Buffer.byteLength(s) / 1024).toFixed(1) + " KB";
console.log(`Built ${SITE_URL}\n  index.html ${kb(html)}\n  ${appJs} ${kb(js)}\n  css (inlined) ${kb(values.css)}`);
