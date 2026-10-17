/**
 * Build indexable HTML for the home page, categories and products.
 * Run from the repo root: node scripts/build-pages.js
 */
const fs = require("fs");
const path = require("path");
const seo = require("../js/seo.js");

const ROOT = path.join(__dirname, "..");
const LANGS = seo.LANGS;

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, "data", name), "utf8"));
}

function write(rel, text) {
  const file = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

function resetGenerated() {
  for (const dir of ["p", "c", "ua", "tr", "en"]) {
    fs.rmSync(path.join(ROOT, dir), { recursive: true, force: true });
  }
}

function shell({ lang, head, main, jsonld, attrs, logo }) {
  const htmlLang = seo.HTML_LANG[lang] || "ru";
  const scripts = (jsonld || []).map((block) => `<script type="application/ld+json">${seo.jsonScript(block)}</script>`).join("\n  ");
  return `<!DOCTYPE html>
<html lang="${htmlLang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  ${head}
  <link rel="stylesheet" href="/css/style.css?v=28">
  <link rel="icon" href="/images/brand/favicon-32.png" type="image/png" sizes="32x32">
  <link rel="apple-touch-icon" href="/images/brand/apple-touch.png">
  ${scripts}
</head>
<body data-base="/" ${attrs || ""}>
  <header class="site-header">
    <div class="container header-inner">
      <a class="logo" href="${seo.pagePath("home", "", lang)}" aria-label="Casa Mia">
        <img class="logo-img" src="${seo.escapeHtml(logo || "/images/brand/logo-header.webp")}" alt="Casa Mia" width="320" height="160" decoding="async">
      </a>
      <div class="header-actions">
        <div class="lang-switch" role="group" aria-label="Language">
          <button type="button" data-lang="ru" lang="ru">RU</button>
          <button type="button" data-lang="ua" lang="uk">UA</button>
          <button type="button" data-lang="tr" lang="tr">TR</button>
          <button type="button" data-lang="en" lang="en">EN</button>
        </div>
        <a class="icon-link" data-wa-general href="https://wa.me/905013381126" target="_blank" rel="noopener" aria-label="WhatsApp">WhatsApp</a>
      </div>
    </div>
  </header>
  <main class="container product-page">
    ${main}
  </main>
  <footer class="site-footer">
    <div class="container footer-bottom">
      <span>© 2026 Casa Mia · casamiafood.vip</span>
      <a href="${seo.pagePath("home", "", lang)}#menu">${seo.HOME.catalog[lang]}</a>
    </div>
  </footer>
  <script src="/js/seo.js?v=1"></script>
  <script src="/js/app.js?v=18"></script>
  <script src="/js/cart.js?v=19"></script>
  <script src="/js/product.js?v=3"></script>
</body>
</html>
`;
}

function saleMark(product, lang) {
  const label = { ru: "Акция", ua: "Акція", tr: "Kampanya", en: "Sale" }[lang] || "Акция";
  if (!product.badges || !product.badges.sale) return "";
  return `<span class="sale-mark">${seo.escapeHtml(label)}</span>`;
}

function crumbs(lang, items) {
  const home = seo.HOME.h1[lang].split("—")[0].trim();
  const all = [{ name: home, url: seo.absolute(seo.pagePath("home", "", lang)) }, ...items];
  const html = all.map((item, index) => {
    if (index === all.length - 1) return `<span>${seo.escapeHtml(item.name)}</span>`;
    return `<a href="${seo.escapeHtml(item.url.replace(seo.ORIGIN, ""))}">${seo.escapeHtml(item.name)}</a>`;
  }).join(` <span aria-hidden="true">/</span> `);
  return { html: `<nav class="crumbs" aria-label="breadcrumb">${html}</nav>`, data: seo.breadcrumbJsonLd(lang, all) };
}

function productMain(product, category, lang) {
  const info = seo.productSeo(product, lang, category);
  const img = `/${String((product.images && product.images[0]) || product.thumbnail || "images/brand/card.webp").replace(/^\/+/, "")}`;
  const catLink = category
    ? `<a href="${seo.pagePath("category", category.id, lang)}">${seo.escapeHtml(info.categoryName)}</a>`
    : "";
  const trail = crumbs(lang, [
    category ? { name: info.categoryName, url: seo.absolute(seo.pagePath("category", category.id, lang)) } : null,
    { name: info.name, url: seo.absolute(seo.pagePath("product", product.id, lang)) }
  ].filter(Boolean));
  const price = Number(product.price) > 0 ? `<p class="price">${seo.escapeHtml(String(product.price))} ₺</p>` : "";
  const facts = ["ingredients", "cook", "serveWith"].map((key) => {
    const text = seo.pick(product[key], lang);
    if (!text) return "";
    return `<p>${seo.escapeHtml(text)}</p>`;
  }).join("");
  return {
    html: `${trail.html}
    ${catLink ? `<p class="meta">${catLink}</p>` : ""}
    <div class="product-layout">
      <div class="product-gallery"><img src="${seo.escapeHtml(img)}" alt="${seo.escapeHtml(info.name)}" width="800" height="800">${saleMark(product, lang)}</div>
      <div class="product-info">
        <h1>${seo.escapeHtml(info.name)}</h1>
        <p class="desc">${seo.escapeHtml(seo.pick(product.description, lang))}</p>
        ${price}
        <p><a class="btn btn-secondary" href="${seo.pagePath("home", "", lang)}#menu">${seo.escapeHtml(seo.HOME.catalog[lang])}</a></p>
        <div class="product-facts">${facts}</div>
      </div>
    </div>`,
    crumbLd: trail.data
  };
}

function categoryMain(category, products, lang) {
  const info = seo.categorySeo(category, lang);
  const trail = crumbs(lang, [{ name: info.name, url: seo.absolute(seo.pagePath("category", category.id, lang)) }]);
  const cards = products.map((product) => {
    const name = seo.pick(product.name, lang) || seo.pick(product.name, "ru");
    const desc = seo.pick(product.description, lang);
    const img = `/${String((product.thumbnail || (product.images && product.images[0]) || "images/brand/card.webp")).replace(/^\/+/, "")}`;
    return `<article class="product-card">
      <a class="thumb" href="${seo.pagePath("product", product.id, lang)}"><img src="${seo.escapeHtml(img)}" alt="${seo.escapeHtml(name)}" width="400" height="400">${saleMark(product, lang)}</a>
      <div class="body"><a href="${seo.pagePath("product", product.id, lang)}"><h2>${seo.escapeHtml(name)}</h2></a><p class="desc">${seo.escapeHtml(desc)}</p></div>
    </article>`;
  }).join("");
  return {
    html: `${trail.html}<h1>${seo.escapeHtml(info.name)}</h1><p class="desc">${seo.escapeHtml(info.description)}</p><div class="product-grid">${cards}</div>`,
    crumbLd: trail.data
  };
}

function catalogBlock(categories, products, lang) {
  const sections = categories
    .filter((category) => category.enabled !== false)
    .map((category) => {
      const items = products.filter((product) => product.categoryId === category.id && seo.indexableProduct(product, categories));
      if (!items.length) return "";
      const links = items.map((product) => `<li><a href="${seo.pagePath("product", product.id, lang)}">${seo.escapeHtml(seo.pick(product.name, lang) || seo.pick(product.name, "ru"))}</a></li>`).join("");
      const name = seo.pick(category.name, lang) || category.id;
      return `<section><h3><a href="${seo.pagePath("category", category.id, lang)}">${seo.escapeHtml(name)}</a></h3><ul>${links}</ul></section>`;
    })
    .join("");
  return `<nav class="seo-catalog" id="seo-catalog" aria-label="${seo.escapeHtml(seo.HOME.catalog[lang])}"><h2>${seo.escapeHtml(seo.HOME.catalog[lang])}</h2>${sections}</nav>`;
}

function replaceBlock(html, name, inner) {
  const pattern = new RegExp(`<!--${name}-->[\\s\\S]*?<!--/${name}-->`);
  if (!pattern.test(html)) throw new Error(`Missing <!--${name}--> in index.html`);
  return html.replace(pattern, `<!--${name}-->\n${inner}\n<!--/${name}-->`);
}

function homeHead(settings, lang) {
  const info = seo.homeSeo(settings && settings.seo, lang);
  return seo.metaBlock(info, "home", "", `${seo.ORIGIN}/images/brand/og.jpg`);
}

function localizeHome(html, lang) {
  const h1 = seo.HOME.h1[lang];
  return html.replace(/(data-i18n="hero_h1"[^>]*>)[\s\S]*?(<\/h1>)/, `$1${seo.escapeHtml(h1)}$2`);
}

function rootify(html) {
  return html.replace(/(href|src)="(?!https?:|\/\/|#|mailto:|tel:|data:)([^"]*)"/g, (full, attr, url) => {
    if (!url || url.startsWith("/")) return full;
    return `${attr}="/${url.replace(/^\.\//, "")}"`;
  });
}

function uiString(source, key, lang) {
  const block = source.match(new RegExp(`\\b${key}:\\s*\\{([^}]*)\\}`));
  if (!block) return "";
  const match = block[1].match(new RegExp(`${lang}:\\s*"((?:\\\\.|[^"\\\\])*)"`));
  return match ? JSON.parse(`"${match[1]}"`) : "";
}

function replaceInner(html, id, inner) {
  const open = new RegExp(`<([a-z0-9]+)([^>]*\\bid="${id}"[^>]*)>`, "i").exec(html);
  if (!open) return html;
  const token = new RegExp(`<${open[1]}\\b[^>]*>|</${open[1]}>`, "gi");
  token.lastIndex = open.index + open[0].length;
  let depth = 1;
  let found;
  while ((found = token.exec(html))) {
    depth += found[0].startsWith("</") ? -1 : 1;
    if (depth === 0) return html.slice(0, open.index + open[0].length) + inner + html.slice(found.index);
  }
  return html;
}

function publicPath(file) {
  const clean = String(file || "").replace(/^\/+/, "");
  return clean ? `/${clean}` : "";
}

function gallerySlides(gallery, lang) {
  const items = ((gallery && gallery.items) || [])
    .filter((item) => item && item.visible !== false && item.image)
    .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
  return items.map((item) => {
    const caption = seo.pick(item.caption, lang);
    return `<div class="carousel-slide"><img src="${seo.escapeHtml(publicPath(item.image))}" alt="${seo.escapeHtml(caption)}" width="1200" height="800"><p class="carousel-caption">${seo.escapeHtml(caption)}</p></div>`;
  }).join("");
}

function applyLanguage(html, lang, settings, reviews, appSource, gallery) {
  let page = html.replace(/data-i18n="([^"]+)"([^>]*)>([\s\S]*?)</g, (full, key, rest) => {
    const value = uiString(appSource, key, lang);
    return value ? `data-i18n="${key}"${rest}>${seo.escapeHtml(value)}<` : full;
  });
  const text = (obj) => seo.escapeHtml(seo.pick(obj, lang));
  const hero = seo.pick(settings.hero && settings.hero.subtitle, lang) || seo.pick(settings.brand && settings.brand.tagline, lang);
  if (hero) page = page.replace(/(id="hero-tagline"[^>]*>)[\s\S]*?(<\/p>)/, `$1${seo.escapeHtml(hero)}$2`);
  const wa = seo.pick(settings.hero && settings.hero.ctaWhatsapp, lang);
  const ig = seo.pick(settings.hero && settings.hero.ctaInstagram, lang);
  if (wa) page = page.replace(/(data-i18n="cta_wa"[^>]*>)[\s\S]*?(<\/a>)/g, `$1${seo.escapeHtml(wa)}$2`);
  if (ig) page = page.replace(/(data-i18n="cta_ig"[^>]*>)[\s\S]*?(<\/a>)/g, `$1${seo.escapeHtml(ig)}$2`);
  const features = (settings.features || []).map((item) => `<div class="feature-card"><h3>${text(item.title)}</h3><p>${text(item.text)}</p></div>`).join("");
  if (features) page = replaceInner(page, "features", features);
  const cook = (settings.cookGuide || []).map((item) => `<div class="cook-card"><div class="emoji">${seo.escapeHtml(item.emoji || "")}</div><div><h3>${text(item.title)}</h3><p>${text(item.time)}</p></div></div>`).join("");
  if (cook) page = replaceInner(page, "cook-grid", cook);
  if (settings.about) {
    page = page.replace(/(id="about-title"[^>]*>)[\s\S]*?(<\/p>)/, `$1${text(settings.about.title)}$2`);
    page = page.replace(/(id="about-subtitle"[^>]*>)[\s\S]*?(<\/h2>)/, `$1${text(settings.about.subtitle)}$2`);
    page = page.replace(/(id="about-closing"[^>]*>)[\s\S]*?(<\/p>)/, `$1${text(settings.about.closing)}$2`);
    const paragraphs = seo.pick(settings.about.text, lang).split(/\n\n+/).filter(Boolean).map((part) => `<p>${seo.escapeHtml(part).replace(/\n/g, "<br>")}</p>`).join("");
    if (paragraphs) page = replaceInner(page, "about-text", paragraphs);
  }
  if (settings.delivery) {
    const title = seo.pick(settings.delivery.title, lang);
    const description = seo.pick(settings.delivery.description, lang);
    if (title) page = page.replace(/(id="delivery-title"[^>]*>)[\s\S]*?(<\/h2>)/, `$1${seo.escapeHtml(title)}$2`);
    if (description) page = page.replace(/(id="delivery-description"[^>]*>)[\s\S]*?(<\/p>)/, `$1${seo.escapeHtml(description)}$2`);
    const rows = [
      [uiString(appSource, "areas", lang), seo.pick(settings.delivery.areas, lang)],
      [uiString(appSource, "delivery_cost", lang), seo.pick(settings.delivery.cost, lang)],
      [uiString(appSource, "hours", lang), seo.pick(settings.delivery.hours, lang)],
      [uiString(appSource, "payment", lang), seo.pick(settings.delivery.payment, lang)]
    ].filter((row) => row[1]);
    page = replaceInner(page, "delivery-list", rows.map((row) => `<div><strong>${seo.escapeHtml(row[0])}</strong><span>${seo.escapeHtml(row[1])}</span></div>`).join(""));
  }
  const cards = (reviews || []).filter((item) => item.visible !== false).sort((a, b) => (a.order || 0) - (b.order || 0)).map((item) => {
    const stars = "★".repeat(Math.min(5, Number(item.rating) || 5));
    return `<article class="carousel-slide review-card"><div class="stars">${stars}</div><p>«${text(item.text)}»</p><div class="name">${seo.escapeHtml(item.name || "")}</div></article>`;
  }).join("");
  if (cards) page = replaceInner(page, "reviews-list", cards);
  const slides = gallerySlides(gallery, lang);
  if (slides) page = replaceInner(page, "gallery-track", slides);
  const galleryTitle = seo.pick(gallery && gallery.title, lang);
  if (galleryTitle) page = page.replace(/(id="gallery-title"[^>]*>)[\s\S]*?(<\/h2>)/, `$1${seo.escapeHtml(galleryTitle)}$2`);
  if (gallery && gallery.visible === false) page = page.replace('id="gallery"', 'id="gallery" hidden');
  if (settings.sections && settings.sections.reviews === false) page = page.replace('id="reviews"', 'id="reviews" hidden');
  const headerLogo = publicPath(settings.brand && settings.brand.logoHeader) || "/images/brand/logo-header.webp";
  const bigLogo = publicPath(settings.brand && settings.brand.logo) || "/images/brand/logo-big.webp";
  const heroImage = publicPath(settings.brand && settings.brand.heroImage) || "/images/brand/info.webp";
  const aboutImage = publicPath(settings.brand && settings.brand.aboutImage) || "/images/brand/logo-big.webp";
  page = page.replaceAll("images/brand/logo-header.webp", headerLogo.replace(/^\//, ""));
  page = page.replaceAll("images/brand/logo-big.webp", bigLogo.replace(/^\//, ""));
  page = page.replaceAll("images/brand/info.webp", heroImage.replace(/^\//, ""));
  page = page.replace(/(<img class="about-photo"[^>]*src=")[^"]+/, `$1${aboutImage.replace(/^\//, "")}`);
  const address = seo.pick(settings.contacts && settings.contacts.address, lang);
  const bits = [address, settings.contacts && settings.contacts.phone, settings.contacts && settings.contacts.email].filter(Boolean);
  page = page.replace(/(id="contact-extra"[^>]*>)[\s\S]*?(<\/span>)/, `$1${seo.escapeHtml(bits.join(" · "))}$2`);
  if (lang !== "ru") page = page.replace(/alt="Casa Mia[^"]*"/g, 'alt="Casa Mia"');
  return page;
}

function build() {
  const products = readJson("products.json");
  const categories = readJson("categories.json");
  const settings = readJson("settings.json");
  const reviews = readJson("reviews.json");
  const gallery = readJson("gallery.json");
  const headerLogo = `/${String((settings.brand && settings.brand.logoHeader) || "images/brand/logo-header.webp").replace(/^\/+/, "")}`;
  const appSource = fs.readFileSync(path.join(ROOT, "js", "app.js"), "utf8");
  resetGenerated();

  const visible = products.filter((product) => seo.indexableProduct(product, categories));
  const enabledCategories = categories.filter((category) => category.enabled !== false && visible.some((product) => product.categoryId === category.id));

  for (const lang of LANGS) {
    for (const product of visible) {
      const category = categories.find((item) => item.id === product.categoryId) || null;
      const info = seo.productSeo(product, lang, category);
      const body = productMain(product, category, lang);
      const html = shell({
        lang,
        head: seo.metaBlock(info, "product", product.id, seo.productImage(product)),
        main: `<div id="product-root">${body.html}</div>`,
        jsonld: [seo.productJsonLd(product, lang, category), body.crumbLd],
        attrs: `data-product-id="${seo.escapeHtml(product.id)}"`,
        logo: headerLogo
      });
      const rel = seo.pagePath("product", product.id, lang).replace(/^\//, "") + "index.html";
      write(rel, html);
    }
    for (const category of enabledCategories) {
      const items = visible.filter((product) => product.categoryId === category.id);
      const info = seo.categorySeo(category, lang);
      const body = categoryMain(category, items, lang);
      const html = shell({
        lang,
        head: seo.metaBlock(info, "category", category.id, `${seo.ORIGIN}/images/brand/og.jpg`),
        main: body.html,
        jsonld: [seo.categoryJsonLd(category, lang, items), body.crumbLd],
        logo: headerLogo
      });
      const rel = seo.pagePath("category", category.id, lang).replace(/^\//, "") + "index.html";
      write(rel, html);
    }
  }

  let index = fs.readFileSync(path.join(ROOT, "index.html"), "utf8").replace(/\r\n/g, "\n");
  index = replaceBlock(index, "seo-meta", homeHead(settings, "ru"));
  index = replaceBlock(index, "seo-catalog", catalogBlock(categories, products, "ru"));
  index = localizeHome(index, "ru");
  index = applyLanguage(index, "ru", settings, reviews, appSource, gallery);
  if (!index.includes('data-base=')) index = index.replace("<body>", '<body data-base="/">');
  fs.writeFileSync(path.join(ROOT, "index.html"), index);

  for (const lang of ["ua", "tr", "en"]) {
    let copy = index;
    copy = replaceBlock(copy, "seo-meta", homeHead(settings, lang));
    copy = replaceBlock(copy, "seo-catalog", catalogBlock(categories, products, lang));
    copy = localizeHome(copy, lang);
    copy = applyLanguage(copy, lang, settings, reviews, appSource, gallery);
    copy = copy.replace(/<html lang="[^"]*">/, `<html lang="${seo.HTML_LANG[lang]}">`);
    copy = rootify(copy);
    write(`${lang}/index.html`, copy);
  }

  const groups = [
    { kind: "home", id: "" },
    ...enabledCategories.map((category) => ({ kind: "category", id: category.id })),
    ...visible.map((product) => ({ kind: "product", id: product.id }))
  ];
  const urls = groups.flatMap((item) => seo.LANGS.map((lang) => ({
    loc: seo.absolute(seo.pagePath(item.kind, item.id, lang)),
    alternates: seo.alternates(item.kind, item.id)
  })));
  write("sitemap.xml", seo.sitemapXml(urls));
  return { products: visible.length, categories: enabledCategories.length, urls: urls.length };
}

if (require.main === module) {
  const result = build();
  console.log(`Indexed ${result.products} products, ${result.categories} categories, ${result.urls} sitemap groups.`);
}

module.exports = { build };
