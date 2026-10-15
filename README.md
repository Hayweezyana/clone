# Clone Pictures Studio website

A static site for Clone Pictures, a photography studio with three branches in Lagos:

| Branch | Location | WhatsApp |
| --- | --- | --- |
| Yaba | Ozone Cinemas Mall, 11 Commercial Ave, Sabo, Yaba | 0903 818 1728 |
| Leisure Mall, Surulere | Leisure Mall, beside ShopRite, Adeniran Ogunsanya St | 0704 897 8732 |
| Adeniran Ogunsanya, Surulere | Adeniran Ogunsanya St, beside The Place Restaurant | 0808 477 2545 |

There is no build step. It is plain HTML, CSS and JS.

```
index.html          page markup
css/style.css       styles and animations
js/main.js          slideshow, gallery, lightbox, booking modal (branch → WhatsApp)
js/photos.js        generated manifest of the Cloudinary images
scripts/            image upload tooling
```

## Run locally

```
python -m http.server 5173
```

Then open http://localhost:5173.

## Images

All photos come from the studio's Pixieset gallery and Instagram. They are hosted on Cloudinary under `clone-studio/<category>/`.

To change the selection, edit `scripts/sources.json` and re-run the upload:

```
# .env (gitignored) must contain CLOUDINARY_URL=cloudinary://<key>:<secret>@<cloud>
python scripts/upload_to_cloudinary.py
```

The script uploads each image and regenerates `js/photos.js`.

## Branch details

Branch names, addresses and WhatsApp numbers are in the `BRANCHES` array at the top of `js/main.js`.
