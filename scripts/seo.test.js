const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const seo = require("../js/seo.js");
const { build } = require("./build-pages.js");

const products = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/products.json"), "utf8"));
const categories = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/categories.json"), "utf8"));

function byName(name) {
  return products.find((product) => product.name && product.name.ru === name);
}

test("manual SEO wins over the template", () => {
  const product = {
    id: "sample",
    name: { ru: "Борщ говяжий", ua: "", tr: "", en: "" },
    description: { ru: "Домашний борщ.", ua: "", tr: "", en: "" },
    seo: { title: { ru: "Свой заголовок борща" }, description: { ru: "Своё описание борща для поиска." } },
    price: 800,
    inStock: true,
    available: true
  };
  const result = seo.productSeo(product, "ru", null);
  assert.equal(result.title, "Свой заголовок борща");
  assert.equal(result.description, "Своё описание борща для поиска.");
  assert.equal(result.titleSource, "manual");
});

test("a stray opening quote in a description is not copied into the snippet", () => {
  const result = seo.productSeo({
    id: "quote-dish",
    name: { ru: "Салат", en: "Salad" },
    description: { ru: "\"Домашний салат из свежих овощей и крабовых палочек.", en: "\"A homemade salad with fresh vegetables." }
  }, "en", null);
  assert.equal(result.description.startsWith("\""), false);
  assert.match(result.description, /^A homemade salad/);
});

test("missing SEO fields are generated and missing translations fall back to Russian", () => {
  const product = byName("Борщ говяжий") || products.find((item) => /борщ/i.test(item.name.ru));
  assert.ok(product);
  const ru = seo.productSeo(product, "ru", null);
  const ua = seo.productSeo({ ...product, name: { ...product.name, ua: "" }, description: { ...product.description, ua: "" } }, "ua", null);
  assert.match(ru.title, /Casa Mia/);
  assert.match(ru.title, /Анталии|Casa Mia/);
  assert.ok(ru.description.length > 20);
  assert.equal(ua.name, product.name.ru);
  assert.doesNotThrow(() => seo.productSeo({ id: "product-1", name: {}, description: {} }, "en", null));
});

test("titles and descriptions stay within snippet length and do not cut a word", () => {
  for (const product of products.filter((item) => seo.indexableProduct(item, categories))) {
    for (const lang of seo.LANGS) {
      const category = categories.find((item) => item.id === product.categoryId);
      const result = seo.productSeo(product, lang, category);
      assert.ok(result.title.length <= seo.TITLE_MAX, result.title);
      assert.ok(result.description.length <= seo.DESC_MAX, result.description);
      assert.equal(result.title.includes("  "), false);
      assert.equal(JSON.parse(seo.jsonScript(seo.productJsonLd(product, lang, category))).aggregateRating, undefined);
    }
  }
});

test("zero price is not invented as an offer", () => {
  const data = seo.productJsonLd({ id: "x", name: { ru: "Тест" }, description: { ru: "Описание блюда для проверки." }, price: 0, inStock: true }, "ru", null);
  assert.equal(data.offers, undefined);
});

test("hreflang set is mutual and x-default points at Russian", () => {
  const links = seo.alternates("product", "pelmeni-chicken");
  const hrefs = links.map((link) => link.href);
  assert.equal(links.length, 5);
  assert.equal(new Set(hrefs).size, 4);
  assert.ok(hrefs.includes("https://casamiafood.vip/p/pelmeni-chicken/"));
  assert.ok(hrefs.includes("https://casamiafood.vip/ua/p/pelmeni-chicken/"));
  assert.equal(links.find((link) => link.hreflang === "x-default").href, "https://casamiafood.vip/p/pelmeni-chicken/");
  for (const link of links) {
    const back = seo.alternates("product", "pelmeni-chicken").map((item) => item.href);
    assert.deepEqual(back.sort(), hrefs.sort());
  }
});

test("build writes pages, unique titles and a sitemap without admin or missing urls", () => {
  const result = build();
  assert.ok(result.products > 0);
  const root = path.join(__dirname, "..");
  const xml = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
  assert.equal(xml.includes("admin.html"), false);
  assert.equal(xml.includes("product.html?id="), false);
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  assert.equal(locs.length, result.urls);
  const titles = new Map();
  for (const loc of locs) {
    const rel = new URL(loc).pathname.replace(/^\//, "");
    const file = path.join(root, rel, "index.html");
    if (rel === "") {
      const home = fs.readFileSync(path.join(root, "index.html"), "utf8");
      assert.equal((home.match(/<title>/g) || []).length, 1);
      assert.equal((home.match(/<meta name="description"/g) || []).length, 1);
      titles.set(home.match(/<title>([^<]*)<\/title>/)[1], loc);
      continue;
    }
    assert.equal(fs.existsSync(file), true, loc);
    const html = fs.readFileSync(file, "utf8");
    assert.equal((html.match(/<title>/g) || []).length, 1, loc);
    assert.equal((html.match(/<meta name="description"/g) || []).length, 1, loc);
    assert.equal((html.match(/<link rel="canonical"/g) || []).length, 1, loc);
    assert.match(html, new RegExp(`<link rel="canonical" href="${loc.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}">`));
    for (const code of ["ru", "uk", "tr", "en", "x-default"]) {
      assert.match(html, new RegExp(`hreflang="${code}"`));
    }
    const title = html.match(/<title>([^<]*)<\/title>/)[1];
    assert.equal(titles.has(title), false, title);
    titles.set(title, loc);
    assert.equal(html.includes("aggregateRating"), false);
    assert.equal(html.includes("noindex"), false, loc);
    assert.equal(html.includes("passwordHash"), false, loc);
    assert.equal(/github_pat_|casamia_gh_token/.test(html), false, loc);
    JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  }
  assert.equal(titles.size, locs.length);
  const uaHome = fs.readFileSync(path.join(root, "ua", "index.html"), "utf8");
  const trHome = fs.readFileSync(path.join(root, "tr", "index.html"), "utf8");
  const enHome = fs.readFileSync(path.join(root, "en", "index.html"), "utf8");
  assert.match(uaHome, /Про Casa Mia — домашня кухня в Анталії/);
  assert.equal(uaHome.includes("О Casa Mia — домашняя кухня в Анталии"), false);
  assert.match(trHome, /Casa Mia hakkında/);
  assert.match(enHome, /About Casa Mia/);
  assert.match(uaHome, /href="\/css\/style\.css/);
  assert.match(uaHome, /src="\/js\//);
  const julienne = fs.readFileSync(path.join(root, "ua", "p", "product-1792234997854", "index.html"), "utf8");
  assert.match(julienne, /м[’']ясн/);
  assert.equal(julienne.includes("<script"), true);
  assert.equal((julienne.match(/<h1[\s>]/g) || []).length, 1);
});
