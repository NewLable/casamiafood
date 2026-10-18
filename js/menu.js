/* Catalog filters & hits on landing */
async function initMenu() {
  await CasaMia.loadData();
  CasaMia.bindHeader();
  CasaMiaCart.mount();
  renderStaticBlocks();
  bindGallery();
  renderSort();
  bindSearch();
  renderFilters();
  renderHits();
  renderCatalog("all");
  document.getElementById("seo-catalog")?.remove();
  injectMenuSchema();
  CasaMia.pinTopIfReload();

  document.addEventListener("casamia:lang", () => {
    CasaMia.applySeo();
    renderStaticBlocks();
    renderSort();
    syncSearchI18n();
    renderFilters(currentCategory);
    renderHits();
    renderCatalog(currentCategory);
    injectMenuSchema();
  });
}

const SORT_KEY = "casamia_catalog_sort";
const SEARCH_KEY = "casamia_catalog_query";
const SORT_OPTIONS = [
  { id: "menu", key: "sort.menu" },
  { id: "name-asc", key: "sort.name_az" },
  { id: "name-desc", key: "sort.name_za" },
  { id: "price-asc", key: "sort.price_asc" },
  { id: "price-desc", key: "sort.price_desc" }
];

let currentCategory = "all";
let currentSort = readSort();
let currentQuery = readQuery();
let searchTimer = 0;
let sortMenuOpen = false;
let sortChromeBound = false;
let searchBound = false;

function readSort() {
  try {
    const saved = sessionStorage.getItem(SORT_KEY);
    if (SORT_OPTIONS.some((opt) => opt.id === saved)) return saved;
  } catch {
    /* private mode */
  }
  return "menu";
}

function persistSort(id) {
  currentSort = id;
  try {
    sessionStorage.setItem(SORT_KEY, id);
  } catch {
    /* private mode */
  }
}

function readQuery() {
  try {
    return String(sessionStorage.getItem(SEARCH_KEY) || "");
  } catch {
    return "";
  }
}

function persistQuery(value) {
  currentQuery = String(value || "");
  try {
    if (currentQuery) sessionStorage.setItem(SEARCH_KEY, currentQuery);
    else sessionStorage.removeItem(SEARCH_KEY);
  } catch {
    /* private mode */
  }
}

function foldText(value) {
  return String(value || "")
    .toLocaleLowerCase()
    .replace(/ё/g, "е")
    .replace(/ı/g, "i")
    .replace(/i̇/g, "i")
    .trim();
}

function matchesQuery(product, query) {
  const needle = foldText(query);
  if (!needle) return true;
  const parts = [];
  for (const field of [product.name, product.description]) {
    if (!field) continue;
    if (typeof field === "string") parts.push(field);
    else parts.push(...Object.values(field));
  }
  return foldText(parts.join(" ")).includes(needle);
}

function catalogPrice(product) {
  return Number(product.price ?? product.variants?.[0]?.price) || 0;
}

function compareNames(a, b) {
  const locale = { ru: "ru", ua: "uk", tr: "tr", en: "en" }[CasaMia.getLang()] || "ru";
  const cmp = CasaMia.localized(a.name).localeCompare(CasaMia.localized(b.name), locale, {
    sensitivity: "base",
    numeric: true
  });
  return cmp || ((a.order || 0) - (b.order || 0));
}

function sortProducts(list) {
  const items = list.slice();
  if (currentSort === "name-asc") items.sort(compareNames);
  else if (currentSort === "name-desc") items.sort((a, b) => compareNames(b, a));
  else if (currentSort === "price-asc") {
    items.sort((a, b) => catalogPrice(a) - catalogPrice(b) || compareNames(a, b));
  } else if (currentSort === "price-desc") {
    items.sort((a, b) => catalogPrice(b) - catalogPrice(a) || compareNames(a, b));
  } else {
    items.sort((a, b) => (a.order || 0) - (b.order || 0));
  }
  return items;
}

function closeSortMenu() {
  sortMenuOpen = false;
  const menu = document.getElementById("sort-menu");
  const btn = document.getElementById("sort-btn");
  if (menu) menu.hidden = true;
  if (btn) btn.setAttribute("aria-expanded", "false");
}

function bindSortChrome() {
  if (sortChromeBound) return;
  sortChromeBound = true;
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".catalog-sort")) closeSortMenu();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const search = document.getElementById("catalog-search");
    if (search && document.activeElement === search && search.value) {
      search.value = "";
      applySearch("", false);
      return;
    }
    closeSortMenu();
  });
}

function renderSort() {
  const wrap = document.getElementById("catalog-sort");
  if (!wrap) return;
  sortMenuOpen = false;
  bindSortChrome();
  const active = SORT_OPTIONS.find((opt) => opt.id === currentSort) || SORT_OPTIONS[0];
  const label = currentSort === "menu" ? CasaMia.t("sort.label") : CasaMia.t(active.key);
  wrap.innerHTML = `
    <button type="button" class="sort-btn${currentSort === "menu" ? "" : " is-on"}" id="sort-btn" aria-expanded="false" aria-haspopup="listbox" aria-controls="sort-menu">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M8 15V5M8 5 5 8M8 5l3 3M16 9v10M16 19l3-3M16 19l-3-3"/></svg>
      <span>${label}</span>
      <svg class="sort-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
    </button>
    <div class="sort-menu" id="sort-menu" role="listbox" aria-label="${CasaMia.t("sort.label")}" hidden>
      ${SORT_OPTIONS.map((opt) => `
        <button type="button" class="sort-option${opt.id === currentSort ? " is-active" : ""}" role="option" aria-selected="${opt.id === currentSort ? "true" : "false"}" data-sort="${opt.id}">${CasaMia.t(opt.key)}</button>
      `).join("")}
    </div>`;
  const btn = wrap.querySelector("#sort-btn");
  const menu = wrap.querySelector("#sort-menu");
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    sortMenuOpen = !sortMenuOpen;
    menu.hidden = !sortMenuOpen;
    btn.setAttribute("aria-expanded", sortMenuOpen ? "true" : "false");
  });
  wrap.querySelectorAll("[data-sort]").forEach((option) => {
    option.addEventListener("click", (e) => {
      e.stopPropagation();
      persistSort(option.dataset.sort);
      closeSortMenu();
      renderSort();
      renderCatalog(currentCategory);
    });
  });
}

function syncSearchI18n() {
  const input = document.getElementById("catalog-search");
  const clear = document.getElementById("catalog-search-clear");
  if (input) {
    input.placeholder = CasaMia.t("sort.search_ph");
    input.setAttribute("aria-label", CasaMia.t("sort.search"));
  }
  if (clear) clear.setAttribute("aria-label", CasaMia.t("sort.clear"));
}

function syncSearchClear() {
  const input = document.getElementById("catalog-search");
  const clear = document.getElementById("catalog-search-clear");
  if (!clear) return;
  clear.hidden = !(input && input.value.trim());
}

function applySearch(value, animate) {
  persistQuery(value);
  syncSearchClear();
  renderCatalog(currentCategory, { animate: animate !== false });
}

function bindSearch() {
  const input = document.getElementById("catalog-search");
  const clear = document.getElementById("catalog-search-clear");
  if (!input) return;
  syncSearchI18n();
  if (currentQuery) input.value = currentQuery;
  syncSearchClear();
  if (searchBound) return;
  searchBound = true;
  input.addEventListener("input", () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => {
      applySearch(input.value, false);
    }, 120);
  });
  clear?.addEventListener("click", (e) => {
    e.preventDefault();
    window.clearTimeout(searchTimer);
    input.value = "";
    applySearch("", false);
    input.focus();
  });
}

function renderFilters(active = "all") {
  currentCategory = active;
  const wrap = document.getElementById("filters");
  if (!wrap) return;
  const cats = CasaMia.getCategories();
  wrap.innerHTML = [
    `<a class="filter-btn ${active === "all" ? "active" : ""}" href="${CasaMia.homeHref("#menu")}" data-cat="all">${CasaMia.t("all")}</a>`,
    ...cats.map(
      (c) =>
        `<a class="filter-btn ${active === c.id ? "active" : ""}" href="${CasaMia.categoryHref(c.id)}" data-cat="${c.id}"><span class="cat-dot" style="background:${c.color || "var(--olive)"}"></span>${c.emoji || ""} ${CasaMia.localized(c.name)}</a>`
    )
  ].join("");
  wrap.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
      event.preventDefault();
      renderFilters(btn.dataset.cat);
      renderCatalog(btn.dataset.cat);
    });
  });
}

function renderCatalog(categoryId, options = {}) {
  const grid = document.getElementById("product-grid");
  if (!grid) return;
  const animate = options.animate !== false;
  let list = CasaMia.visibleProducts();
  if (categoryId && categoryId !== "all") {
    list = list.filter((p) => p.categoryId === categoryId);
  }
  if (currentQuery.trim()) {
    list = list.filter((p) => matchesQuery(p, currentQuery));
  }
  list = sortProducts(list);
  if (!list.length) {
    grid.innerHTML = `<p class="catalog-empty">${CasaMia.t("sort.empty")}</p>`;
    return;
  }
  grid.innerHTML = list.map((p, i) => {
    const card = CasaMia.productCard(p);
    const delay = animate ? ` style="animation-delay:${Math.min(i, 12) * 40}ms"` : ` style="animation:none"`;
    return card.replace('class="product-card"', `class="product-card"${delay}`);
  }).join("");
}

function renderHits() {
  const wrap = document.getElementById("hits");
  if (!wrap) return;
  const hits = CasaMia.visibleProducts()
    .filter((p) => p.badges?.hit)
    .map((p, index) => ({ p, index }))
    .sort((a, b) => {
      const ao = Number(a.p.hitOrder) || 0;
      const bo = Number(b.p.hitOrder) || 0;
      if (ao !== bo) return ao - bo;
      return a.index - b.index;
    })
    .slice(0, 6)
    .map(({ p }) => p);
  wrap.innerHTML = hits
    .map((p) => {
      const img = CasaMia.mediaUrl(p.thumbnail || p.images?.[0]);
      return `<a class="hit-item" href="${CasaMia.productHref(p.id)}">
        <img src="${img}" alt="${CasaMia.localized(p.name)}" width="56" height="56" loading="lazy" decoding="async" draggable="false">
        <div>
          <strong>${CasaMia.localized(p.name)}</strong>
          <span class="price">${CasaMia.formatPrice(p)}</span>
        </div>
      </a>`;
    })
    .join("");
}

function galleryItems(gallery) {
  return (gallery?.items || [])
    .filter((item) => item.visible !== false && item.image)
    .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
}

function escHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

function mountCarousel(root, slidesHtml, options) {
  const track = root.querySelector(".carousel-track");
  const dots = root.querySelector(".carousel-dots");
  if (!track || !dots) return;
  const count = slidesHtml.length;
  const canLoop = count > 1;
  const sequence = canLoop ? slidesHtml.concat(slidesHtml) : slidesHtml;
  track.innerHTML = sequence.join("");
  track.style.transition = "none";
  track.style.transform = "";
  delete track.dataset.moving;
  dots.innerHTML = canLoop
    ? slidesHtml.map((_, index) => `<button type="button" class="carousel-dot${index === 0 ? " is-on" : ""}" data-index="${index}" aria-label="${index + 1}"></button>`).join("")
    : "";
  root.classList.toggle("is-static", !canLoop);
  root.dataset.count = String(count);
  root.dataset.pos = "0";
  root.dataset.autoplay = options.autoplay === false ? "false" : "true";
  root.dataset.interval = String(Math.min(30, Math.max(2, Number(options.interval) || 5)));
  root.querySelector("[data-carousel-prev]")?.setAttribute("aria-label", options.prevLabel || "");
  root.querySelector("[data-carousel-next]")?.setAttribute("aria-label", options.nextLabel || "");
  markVisibleSlides(track);
  startCarousel(root);
}

function renderGallery() {
  const root = document.getElementById("photo-carousel");
  const section = document.getElementById("gallery");
  if (!root || !section) return;
  const gallery = CasaMia.getGallery() || {};
  const items = galleryItems(gallery);
  const show = gallery.visible !== false && items.length > 0;
  section.hidden = !show;
  document.querySelectorAll('a[href="#gallery"]').forEach((link) => {
    link.hidden = !show;
  });
  if (!show) {
    window.clearInterval(root._timer);
    return;
  }

  const title = document.getElementById("gallery-title");
  const heading = CasaMia.localized(gallery.title) || CasaMia.t("gallery_title");
  if (title && heading) title.textContent = heading;
  const slides = items.map((item) => {
    const caption = escHtml(CasaMia.localized(item.caption));
    return `<div class="carousel-slide"><img src="${CasaMia.mediaUrl(item.image)}" alt="${caption}" width="1200" height="1067" decoding="async" draggable="false"><p class="carousel-caption">${caption}</p></div>`;
  });
  mountCarousel(root, slides, {
    autoplay: gallery.autoplay !== false,
    interval: gallery.interval,
    prevLabel: CasaMia.t("gallery_prev"),
    nextLabel: CasaMia.t("gallery_next")
  });
}

function bindCarousel(root) {
  if (!root || root.dataset.bound) return;
  root.dataset.bound = "1";
  root.querySelector("[data-carousel-prev]")?.addEventListener("click", () => shiftCarousel(root, -1));
  root.querySelector("[data-carousel-next]")?.addEventListener("click", () => shiftCarousel(root, 1));
  root.querySelector(".carousel-dots")?.addEventListener("click", (event) => {
    const dot = event.target.closest("[data-index]");
    if (!dot) return;
    jumpCarousel(root, Number(dot.dataset.index));
  });
  const frame = root.querySelector(".carousel-viewport");
  let startX = 0;
  let pointer = 0;
  frame?.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    pointer = event.pointerId;
    startX = event.clientX;
    frame.setPointerCapture?.(event.pointerId);
  });
  frame?.addEventListener("pointerup", (event) => {
    if (event.pointerId !== pointer) return;
    const delta = event.clientX - startX;
    if (Math.abs(delta) < 36) return;
    shiftCarousel(root, delta > 0 ? -1 : 1);
  });
  root.addEventListener("mouseenter", () => {
    root.dataset.paused = "1";
  });
  root.addEventListener("mouseleave", () => {
    delete root.dataset.paused;
  });
  window.addEventListener("resize", () => {
    const track = root.querySelector(".carousel-track");
    if (!track) return;
    track.style.transition = "none";
    track.style.transform = "";
  });
}

function bindGallery() {
  document.querySelectorAll(".photo-carousel").forEach(bindCarousel);
}

function carouselStep(track) {
  const slide = track.children[0];
  if (!slide) return 0;
  const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
  return slide.getBoundingClientRect().width + gap;
}

function markVisibleSlides(track) {
  [...track.children].forEach((slide, index) => {
    if (index < 3) slide.removeAttribute("aria-hidden");
    else slide.setAttribute("aria-hidden", "true");
  });
}

function paintCarouselPos(root) {
  const pos = Number(root.dataset.pos) || 0;
  root.querySelectorAll(".carousel-dot").forEach((dot, index) => {
    dot.classList.toggle("is-on", index === pos);
  });
}

function shiftCarousel(root, direction) {
  const count = Number(root.dataset.count) || 0;
  const track = root.querySelector(".carousel-track");
  if (!track || count < 2 || track.dataset.moving) return;
  const step = carouselStep(track);
  if (!step) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pos = Number(root.dataset.pos) || 0;
  track.dataset.moving = "1";

  const settle = (next) => {
    track.style.transition = "none";
    track.style.transform = "";
    void track.offsetWidth;
    track.style.transition = "";
    delete track.dataset.moving;
    root.dataset.pos = String((next + count) % count);
    markVisibleSlides(track);
    paintCarouselPos(root);
  };

  if (direction > 0) {
    track.style.transition = reduce ? "none" : "";
    track.style.transform = `translateX(-${step}px)`;
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      track.appendChild(track.firstElementChild);
      settle(pos + 1);
    };
    if (reduce) done();
    else {
      track.addEventListener("transitionend", done, { once: true });
      window.setTimeout(() => {
        if (track.dataset.moving) done();
      }, 600);
    }
    return;
  }

  track.insertBefore(track.lastElementChild, track.firstElementChild);
  track.style.transition = "none";
  track.style.transform = `translateX(-${step}px)`;
  void track.offsetWidth;
  track.style.transition = reduce ? "none" : "";
  window.requestAnimationFrame(() => {
    track.style.transform = "";
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      settle(pos - 1);
    };
    if (reduce) done();
    else {
      track.addEventListener("transitionend", done, { once: true });
      window.setTimeout(() => {
        if (track.dataset.moving) done();
      }, 600);
    }
  });
}

function jumpCarousel(root, target) {
  const count = Number(root.dataset.count) || 0;
  const track = root.querySelector(".carousel-track");
  if (!track || count < 2) return;
  const pos = Number(root.dataset.pos) || 0;
  const hops = (target - pos + count) % count;
  track.style.transition = "none";
  track.style.transform = "";
  for (let i = 0; i < hops; i += 1) track.appendChild(track.firstElementChild);
  delete track.dataset.moving;
  root.dataset.pos = String(target % count);
  markVisibleSlides(track);
  paintCarouselPos(root);
}

function startCarousel(root) {
  window.clearInterval(root._timer);
  if (root.classList.contains("is-static") || root.dataset.autoplay !== "true") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const seconds = Math.min(30, Math.max(2, Number(root.dataset.interval) || 5));
  root._timer = window.setInterval(() => {
    if (root.dataset.paused || document.hidden || root.closest("[hidden]")) return;
    shiftCarousel(root, 1);
  }, seconds * 1000);
}

function renderStaticBlocks() {
  const settings = CasaMia.getSettings();
  if (!settings) return;

  const features = document.getElementById("features");
  if (features) {
    features.innerHTML = (settings.features || [])
      .map(
        (f) => `<div class="feature-card">
        <div class="icon" aria-hidden="true">${iconSvg(f.icon)}</div>
        <h3>${CasaMia.localized(f.title)}</h3>
        <p>${CasaMia.localized(f.text)}</p>
      </div>`
      )
      .join("");
  }

  const aboutTitle = document.getElementById("about-title");
  const aboutSubtitle = document.getElementById("about-subtitle");
  const aboutText = document.getElementById("about-text");
  const aboutClosing = document.getElementById("about-closing");
  const heroTagline = document.getElementById("hero-tagline");
  if (aboutTitle) aboutTitle.textContent = CasaMia.localized(settings.about.title);
  if (aboutSubtitle) aboutSubtitle.textContent = CasaMia.localized(settings.about.subtitle);
  if (aboutText) {
    const html = CasaMia.localized(settings.about.text)
      .split(/\n\n+/)
      .filter(Boolean)
      .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
      .join("");
    aboutText.innerHTML = html;
  }
  if (aboutClosing) aboutClosing.textContent = CasaMia.localized(settings.about.closing);
  if (heroTagline) {
    heroTagline.textContent = CasaMia.localized(settings.hero?.subtitle || settings.brand?.tagline);
  }

  const waCta = CasaMia.localized(settings.hero?.ctaWhatsapp);
  const igCta = CasaMia.localized(settings.hero?.ctaInstagram);
  if (waCta) document.querySelectorAll("[data-i18n='cta_wa']").forEach((el) => { el.textContent = waCta; });
  if (igCta) document.querySelectorAll("[data-i18n='cta_ig']").forEach((el) => { el.textContent = igCta; });

  const cook = document.getElementById("cook-grid");
  if (cook) {
    cook.innerHTML = (settings.cookGuide || [])
      .map(
        (c) => `<div class="cook-card">
        <div class="emoji">${c.emoji}</div>
        <div>
          <h3>${CasaMia.localized(c.title)}</h3>
          <p>${CasaMia.localized(c.time)}</p>
        </div>
      </div>`
      )
      .join("");
  }

  const deliveryTitle = document.getElementById("delivery-title");
  const deliveryDesc = document.getElementById("delivery-description");
  if (deliveryTitle && settings.delivery?.title) {
    deliveryTitle.textContent = CasaMia.localized(settings.delivery.title);
  }
  if (deliveryDesc) {
    deliveryDesc.textContent = CasaMia.localized(settings.delivery?.description);
    deliveryDesc.hidden = !deliveryDesc.textContent;
  }

  const delivery = document.getElementById("delivery-list");
  if (delivery) {
    const cost = CasaMia.localized(settings.delivery.cost);
    delivery.innerHTML = `
      <div><strong>${CasaMia.t("areas")}</strong><span>${CasaMia.localized(settings.delivery.areas)}</span></div>
      ${cost ? `<div><strong>${CasaMia.t("delivery_cost")}</strong><span>${cost}</span></div>` : ""}
      <div><strong>${CasaMia.t("hours")}</strong><span>${CasaMia.localized(settings.delivery.hours)}</span></div>
      <div><strong>${CasaMia.t("payment")}</strong><span>${CasaMia.localized(settings.delivery.payment)}</span></div>`;
  }

  const reviewsSection = document.getElementById("reviews");
  const reviewsOn = settings.sections?.reviews !== false;
  if (reviewsSection) reviewsSection.hidden = !reviewsOn;
  document.querySelectorAll('a[href="#reviews"]').forEach((link) => {
    link.hidden = !reviewsOn;
  });

  const reviewsRoot = document.getElementById("reviews-carousel");
  if (reviewsRoot && reviewsOn) {
    const list = CasaMia.getReviews() || [];
    const carousel = settings.sections?.reviewsCarousel || {};
    const slides = list.map((r) => {
      const stars = "★".repeat(Math.min(5, Number(r.rating) || 5));
      const photo = r.photo
        ? `<img class="review-photo" src="${CasaMia.mediaUrl(r.photo)}" alt="" width="48" height="48" draggable="false">`
        : "";
      const text = escHtml(CasaMia.localized(r.text));
      return `<article class="carousel-slide review-card">
        ${photo}
        <div class="stars" aria-label="${r.rating || 5}">${stars}</div>
        <p>«${text}»</p>
        <div class="name">${escHtml(r.name)}</div>
      </article>`;
    });
    mountCarousel(reviewsRoot, slides, {
      autoplay: carousel.autoplay !== false,
      interval: carousel.interval,
      prevLabel: CasaMia.t("reviews_prev"),
      nextLabel: CasaMia.t("reviews_next")
    });
  } else if (reviewsRoot) {
    window.clearInterval(reviewsRoot._timer);
  }

  renderGallery();

  const waDisplay = document.getElementById("wa-display");
  const igDisplay = document.getElementById("ig-display");
  const extra = document.getElementById("contact-extra");
  if (waDisplay) waDisplay.textContent = settings.contacts.whatsappDisplay || settings.contacts.whatsapp;
  if (igDisplay) igDisplay.textContent = `@${settings.contacts.instagram}`;
  if (extra) {
    const bits = [];
    const address = CasaMia.localized(settings.contacts.address);
    if (address) bits.push(address);
    if (settings.contacts.phone) bits.push(settings.contacts.phone);
    if (settings.contacts.email) bits.push(settings.contacts.email);
    extra.textContent = bits.join(" · ");
    extra.hidden = !bits.length;
  }
}

function injectMenuSchema() {
  const items = CasaMia.visibleProducts().map((p) => {
    const price = p.price || p.variants?.[0]?.price;
    const item = {
      "@type": "MenuItem",
      name: CasaMia.localized(p.name),
      description: CasaMia.localized(p.description),
      url: `${CasaMia.SITE_ORIGIN}${CasaMia.productHref(p.id).replace(/^(?!\/)/, "/")}`
    };
    if (price) {
      item.offers = { "@type": "Offer", price: String(price), priceCurrency: "TRY" };
    }
    return item;
  });
  CasaMia.setJsonLd("schema-menu", {
    "@context": "https://schema.org",
    "@type": "Menu",
    name: "Casa Mia",
    url: `${CasaMia.SITE_ORIGIN}/#menu`,
    hasMenuItem: items
  });
}

function iconSvg(name) {
  const common = 'width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"';
  if (name === "hand") return `<svg ${common}><path d="M8 13V7a1 1 0 0 1 2 0v4m2-2V5a1 1 0 0 1 2 0v6m2-1V8a1 1 0 1 1 2 0v7a5 5 0 0 1-5 5H10a5 5 0 0 1-4.5-2.7L4 14.5a1.5 1.5 0 0 1 2.6-1.5L8 15"/></svg>`;
  if (name === "leaf") return `<svg ${common}><path d="M5 19c8 0 12-6 14-14-8 2-14 6-14 14z"/><path d="M5 19c2-4 6-7 11-9"/></svg>`;
  if (name === "freeze") return `<svg ${common}><path d="M12 2v20M5 6l14 12M19 6 5 18M4 12h16"/></svg>`;
  return `<svg ${common}><path d="M3 7h13l2 4h3v6h-2a2 2 0 1 1-4 0H9a2 2 0 1 1-4 0H3V7z"/><path d="M16 7V5H8"/></svg>`;
}

document.addEventListener("DOMContentLoaded", initMenu);
