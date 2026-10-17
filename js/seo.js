/**
 * Casa Mia SEO: titles, descriptions, URLs, JSON-LD and sitemap.
 * Works in the browser (window.CasaMiaSeo) and in Node (module.exports).
 * Manual seo.title / seo.description always win. Blank fields are generated.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CasaMiaSeo = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  const LANGS = ["ru", "ua", "tr", "en"];
  const HTML_LANG = { ru: "ru", ua: "uk", tr: "tr", en: "en" };
  const HREFLANG = { ru: "ru", ua: "uk", tr: "tr", en: "en" };
  const OG_LOCALE = { ru: "ru_RU", ua: "uk_UA", tr: "tr_TR", en: "en_US" };
  const ORIGIN = "https://casamiafood.vip";
  const TITLE_MAX = 65;
  const DESC_MAX = 160;

  const HOME = {
    title: {
      ru: "Доставка домашней еды в Анталии | Casa Mia",
      ua: "Доставка домашньої їжі в Анталії | Casa Mia",
      tr: "Antalya'da ev yemeği teslimatı | Casa Mia",
      en: "Homemade food delivery in Antalya | Casa Mia"
    },
    description: {
      ru: "Casa Mia — домашняя кухня в Анталии: пельмени, вареники, равиоли, голубцы, блинчики и салаты. Готовим вручную и доставляем по Анталии.",
      ua: "Casa Mia — домашня кухня в Анталії: пельмені, вареники, равіолі, голубці, млинці та салати. Готуємо вручну і доставляємо Анталією.",
      tr: "Casa Mia — Antalya'da ev mutfağı: pelmeni, vareniki, ravioli, lahana sarması, krep ve salatalar. Elle hazırlayıp Antalya'ya teslim ediyoruz.",
      en: "Casa Mia is a home kitchen in Antalya: pelmeni, vareniki, ravioli, cabbage rolls, pancakes and salads. Handmade and delivered in Antalya."
    },
    h1: {
      ru: "Доставка домашней еды в Анталии — Casa Mia",
      ua: "Доставка домашньої їжі в Анталії — Casa Mia",
      tr: "Antalya'da ev yemeği teslimatı — Casa Mia",
      en: "Homemade food delivery in Antalya — Casa Mia"
    },
    catalog: {
      ru: "Блюда в меню",
      ua: "Страви в меню",
      tr: "Menüdeki yemekler",
      en: "Dishes on the menu"
    }
  };

  const TAIL = {
    ru: "Доставка в Анталии от Casa Mia.",
    ua: "Доставка в Анталії від Casa Mia.",
    tr: "Antalya'da Casa Mia teslimatı.",
    en: "Delivery in Antalya from Casa Mia."
  };

  const CAT_TITLE = {
    ru: (name) => `${name} — меню Casa Mia в Анталии`,
    ua: (name) => `${name} — меню Casa Mia в Анталії`,
    tr: (name) => `${name} — Casa Mia menüsü, Antalya`,
    en: (name) => `${name} menu in Antalya | Casa Mia`
  };

  const PRODUCT_TITLE = {
    ru: (name) => `${name} с доставкой в Анталии | Casa Mia`,
    ua: (name) => `${name} з доставкою в Анталії | Casa Mia`,
    tr: (name) => `${name} — Antalya'da teslimat | Casa Mia`,
    en: (name) => `${name} delivered in Antalya | Casa Mia`
  };

  function pick(obj, lang) {
    if (!obj) return "";
    if (typeof obj === "string") return obj.trim();
    const code = LANGS.includes(lang) ? lang : "ru";
    return String(obj[code] || obj.ru || "").trim();
  }

  function clean(text) {
    return String(text || "").replace(/\s+/g, " ").trim();
  }

  function clip(text, max) {
    const value = clean(text);
    if (!value || value.length <= max) return value;
    const cut = value.slice(0, max - 1);
    const space = cut.lastIndexOf(" ");
    const base = (space > Math.floor(max * 0.55) ? cut.slice(0, space) : cut).replace(/[\s,;:–—-]+$/g, "");
    return `${base}…`;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function jsonScript(data) {
    return JSON.stringify(data).replace(/</g, "\\u003c");
  }

  function brandName(name) {
    return /casa\s*mia/i.test(name) ? name : `${name} | Casa Mia`;
  }

  function mentionsPlace(text) {
    return /антали|antalya|доставк|teslimat|delivery/i.test(text);
  }

  function firstUseful(text) {
    const value = clean(text).replace(/^["'«»„“”]+/, "");
    if (!value) return "";
    const match = value.match(/^.{24,}?[.!?…](?:\s|$)/);
    return match ? match[0].trim() : value;
  }

  function technicalName(name, id) {
    if (!name) return true;
    if (name === id) return true;
    return /^product-\d+(?:-copy)?$/i.test(name);
  }

  function dishName(entity, lang) {
    const name = pick(entity && entity.name, lang);
    if (technicalName(name, entity && entity.id)) return pick(entity && entity.name, "ru");
    return name;
  }

  function manual(entity, field, lang) {
    const value = pick(entity && entity.seo && entity.seo[field], lang);
    return value;
  }

  function turkishHint(product) {
    const blob = `${product.id || ""} ${pick(product.name, "ru")} ${pick(product.name, "tr")}`.toLowerCase();
    if (/пельмен|pelmen|mantı|manti/.test(blob) && !/mantı|manti|pelmen/.test(pick(product.name, "tr").toLowerCase())) {
      return "ev yapımı mantı";
    }
    return "";
  }

  function productSeo(product, lang, category) {
    const code = LANGS.includes(lang) ? lang : "ru";
    const name = dishName(product, code) || "Casa Mia";
    const customTitle = manual(product, "title", code);
    const customDesc = manual(product, "description", code);
    let title = customTitle;
    if (!title) {
      const hint = code === "tr" ? turkishHint(product) : "";
      const labeled = hint ? `${name} — ${hint}` : name;
      const withPlace = PRODUCT_TITLE[code](labeled);
      title = withPlace.length <= TITLE_MAX ? withPlace : brandName(labeled);
    }
    title = clip(title, TITLE_MAX);

    let description = customDesc;
    if (!description) {
      const source = firstUseful(pick(product.description, code));
      if (source && !technicalName(source, product.id)) {
        description = mentionsPlace(source) || source.length > DESC_MAX - TAIL[code].length - 1
          ? source
          : `${source} ${TAIL[code]}`;
      } else {
        description = `${name}. ${TAIL[code]}`;
      }
    }
    description = clip(description, DESC_MAX);
    return {
      lang: code,
      title,
      description,
      titleSource: customTitle ? "manual" : "auto",
      descriptionSource: customDesc ? "manual" : "auto",
      name,
      categoryName: category ? dishName(category, code) : ""
    };
  }

  function categorySeo(category, lang) {
    const code = LANGS.includes(lang) ? lang : "ru";
    const name = dishName(category, code) || category.id;
    const customTitle = manual(category, "title", code);
    const customDesc = manual(category, "description", code);
    let title = customTitle;
    if (!title) {
      const withPlace = CAT_TITLE[code](name);
      title = withPlace.length <= TITLE_MAX ? withPlace : brandName(name);
    }
    let description = customDesc;
    if (!description) {
      description = {
        ru: `${name} из меню Casa Mia. Готовим дома и привозим по Анталии.`,
        ua: `${name} з меню Casa Mia. Готуємо вдома і привозимо Анталією.`,
        tr: `Casa Mia menüsünden ${name}. Evde hazırlayıp Antalya'ya getiriyoruz.`,
        en: `${name} from the Casa Mia menu. Cooked at home and delivered in Antalya.`
      }[code];
    }
    return {
      lang: code,
      title: clip(title, TITLE_MAX),
      description: clip(description, DESC_MAX),
      titleSource: customTitle ? "manual" : "auto",
      descriptionSource: customDesc ? "manual" : "auto",
      name
    };
  }

  function homeSeo(settings, lang) {
    const code = LANGS.includes(lang) ? lang : "ru";
    const source = settings && settings.seo ? settings : { seo: settings || {} };
    const customTitle = manual(source, "title", code);
    const customDesc = manual(source, "description", code);
    return {
      lang: code,
      title: clip(customTitle || HOME.title[code], TITLE_MAX),
      description: clip(customDesc || HOME.description[code], DESC_MAX),
      titleSource: customTitle ? "manual" : "auto",
      descriptionSource: customDesc ? "manual" : "auto",
      h1: HOME.h1[code]
    };
  }

  function pagePath(kind, id, lang) {
    const prefix = lang && lang !== "ru" ? `/${lang}` : "";
    if (kind === "product") return `${prefix}/p/${encodeURIComponent(id)}/`;
    if (kind === "category") return `${prefix}/c/${encodeURIComponent(id)}/`;
    return `${prefix}/`;
  }

  function absolute(path) {
    return `${ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
  }

  function alternates(kind, id) {
    const links = LANGS.map((code) => ({
      lang: code,
      hreflang: HREFLANG[code],
      href: absolute(pagePath(kind, id, code))
    }));
    links.push({ lang: "ru", hreflang: "x-default", href: absolute(pagePath(kind, id, "ru")) });
    return links;
  }

  function parsePath(pathname) {
    let path = pathname || "/";
    if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
    if (path.endsWith("/index.html")) path = path.slice(0, -11);
    const parts = path.split("/").filter(Boolean);
    let lang = "ru";
    if (LANGS.includes(parts[0]) && parts[0] !== "ru") lang = parts.shift();
    if (parts[0] === "p" && parts[1]) return { lang, kind: "product", id: decodeURIComponent(parts[1]) };
    if (parts[0] === "c" && parts[1]) return { lang, kind: "category", id: decodeURIComponent(parts[1]) };
    if (!parts.length) return { lang, kind: "home", id: "" };
    return { lang, kind: "other", id: "" };
  }

  function indexableProduct(product, categories) {
    if (!product || product.available === false) return false;
    const category = (categories || []).find((item) => item.id === product.categoryId);
    if (category && category.enabled === false) return false;
    return true;
  }

  function productImage(product) {
    const path = (product && (product.images && product.images[0] || product.thumbnail)) || "images/brand/og.jpg";
    return absolute(`/${String(path).replace(/^\/+/, "")}`);
  }

  function productJsonLd(product, lang, category) {
    const seo = productSeo(product, lang, category);
    const url = absolute(pagePath("product", product.id, lang));
    const data = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: seo.name,
      description: seo.description,
      image: productImage(product),
      brand: { "@type": "Brand", name: "Casa Mia" },
      url
    };
    const price = Number(product.price);
    if (Number.isFinite(price) && price > 0) {
      const offer = {
        "@type": "Offer",
        priceCurrency: "TRY",
        price: String(price),
        url
      };
      if (product.inStock === false) offer.availability = "https://schema.org/OutOfStock";
      else if (product.inStock === true) offer.availability = "https://schema.org/InStock";
      data.offers = offer;
    }
    return data;
  }

  function categoryJsonLd(category, lang, products) {
    const seo = categorySeo(category, lang);
    const url = absolute(pagePath("category", category.id, lang));
    return {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: seo.name,
      description: seo.description,
      url,
      isPartOf: { "@type": "WebSite", name: "Casa Mia", url: `${ORIGIN}/` },
      mainEntity: {
        "@type": "ItemList",
        itemListElement: products.map((product, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: dishName(product, lang),
          url: absolute(pagePath("product", product.id, lang))
        }))
      }
    };
  }

  function breadcrumbJsonLd(lang, crumbs) {
    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: crumbs.map((crumb, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: crumb.name,
        item: crumb.url
      }))
    };
  }

  function sitemapXml(urls) {
    const body = urls.map((url) => {
      const links = url.alternates.map((alt) => `    <xhtml:link rel="alternate" hreflang="${alt.hreflang}" href="${escapeHtml(alt.href)}"/>`).join("\n");
      return `  <url>\n    <loc>${escapeHtml(url.loc)}</loc>\n${links}\n  </url>`;
    }).join("\n");
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${body}\n</urlset>\n`;
  }

  function metaBlock(seo, kind, id, image) {
    const links = alternates(kind, id).map((alt) => `<link rel="alternate" hreflang="${alt.hreflang}" href="${escapeHtml(alt.href)}">`).join("\n  ");
    const canonical = absolute(pagePath(kind, id, seo.lang));
    return `<title>${escapeHtml(seo.title)}</title>
  <meta name="description" content="${escapeHtml(seo.description)}">
  <meta name="robots" content="index,follow">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  ${links}
  <meta property="og:type" content="${kind === "product" ? "product" : "website"}">
  <meta property="og:site_name" content="Casa Mia">
  <meta property="og:locale" content="${OG_LOCALE[seo.lang]}">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  <meta property="og:title" content="${escapeHtml(seo.title)}">
  <meta property="og:description" content="${escapeHtml(seo.description)}">
  <meta property="og:image" content="${escapeHtml(image || `${ORIGIN}/images/brand/og.jpg`)}">`;
  }

  return {
    LANGS,
    HTML_LANG,
    HREFLANG,
    OG_LOCALE,
    ORIGIN,
    TITLE_MAX,
    DESC_MAX,
    HOME,
    pick,
    clip,
    escapeHtml,
    jsonScript,
    productSeo,
    categorySeo,
    homeSeo,
    pagePath,
    absolute,
    alternates,
    parsePath,
    indexableProduct,
    productImage,
    productJsonLd,
    categoryJsonLd,
    breadcrumbJsonLd,
    sitemapXml,
    metaBlock
  };
});
