/**
 * Casa Mia CMS — browser admin for GitHub Pages.
 * Edits live in memory; one Save publishes JSON + images via GitHub REST API.
 */
const SESSION_KEY = "casamia_admin";
const I = CasaMiaI18n;

const state = {
  products: [],
  categories: [],
  settings: null,
  reviews: [],
  gallery: { visible: true, autoplay: true, interval: 5, title: {}, items: [] },
  pendingImages: {},
  expandedProducts: new Set(),
  expandedCategories: new Set(),
  expandedReviews: new Set(),
  productQuery: "",
  priceQuery: "",
  productSort: "order",
  knownProductIds: new Set(),
  snapshot: "",
  saving: false,
  connected: false
};

async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function payload() {
  return {
    products: state.products,
    categories: state.categories,
    settings: stripSettings(state.settings),
    reviews: state.reviews,
    gallery: state.gallery,
    pending: Object.keys(state.pendingImages).sort()
  };
}

function stripSettings(settings) {
  const s = clone(settings || {});
  delete s.reviews;
  return s;
}

function takeSnapshot() {
  state.snapshot = JSON.stringify(payload());
}

function isDirty() {
  return JSON.stringify(payload()) !== state.snapshot;
}

function toast(message, type = "ok") {
  const wrap = document.getElementById("toasts");
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = message;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 4200);
}

function refreshChrome() {
  const dirty = isDirty();
  const pill = document.getElementById("dirty-pill");
  const btn = document.getElementById("save-btn");
  const hint = document.getElementById("save-hint");
  if (dirty) {
    pill.classList.add("dirty");
    pill.textContent = "● Есть изменения";
    hint.textContent = "Есть несохранённые изменения";
    btn.disabled = state.saving;
    btn.classList.toggle("is-ready", !state.saving);
  } else {
    pill.classList.remove("dirty");
    pill.textContent = "✓ Всё сохранено";
    hint.textContent = "Нет несохранённых изменений";
    btn.disabled = true;
    btn.classList.remove("is-ready");
  }
  const gh = document.getElementById("gh-pill");
  if (state.connected) {
    gh.className = "status-pill gh-ok";
    gh.textContent = "✅ GitHub подключён";
  } else {
    gh.className = "status-pill gh-off";
    gh.textContent = "GitHub не подключён";
  }
  paintOpenProductEditors();
}

function markDirty() {
  refreshChrome();
}

function productIsDirty(product) {
  let saved = [];
  try {
    saved = JSON.parse(state.snapshot || "{}").products || [];
  } catch {
    saved = [];
  }
  const previous = saved.find((item) => item.id === product.id);
  if (!previous || JSON.stringify(previous) !== JSON.stringify(product)) return true;
  return Object.keys(state.pendingImages).some((path) => path.includes(`/${product.id}`));
}

function paintOpenProductEditors() {
  document.querySelectorAll("#product-list .product-editor").forEach((card) => {
    const product = state.products.find((item) => item.id === card.dataset.productId);
    if (!product) return;
    const dirty = productIsDirty(product);
    card.classList.toggle("is-dirty", dirty);
    card.classList.toggle("is-clean", !dirty);
  });
}

/* ---------- normalize ---------- */

const QTY_PRESETS = {
  package: { step: 1, min: 1, unit: { ru: "уп.", ua: "уп.", tr: "paket", en: "pack" } },
  piece: { step: 1, min: 1, unit: { ru: "шт.", ua: "шт.", tr: "adet", en: "pcs" } },
  kg: { step: 0.5, min: 0.5, unit: { ru: "кг", ua: "кг", tr: "kg", en: "kg" } },
  gram: { step: 100, min: 100, unit: { ru: "г", ua: "г", tr: "g", en: "g" } }
};

function inferQuantityType(p) {
  if (p.quantityType && QTY_PRESETS[p.quantityType]) return p.quantityType;
  if (p.priceUnit === "kg") return "kg";
  if (p.weightUnit === "pcs" && !p.variants) return "piece";
  return "package";
}

function qtyFieldsFor(p) {
  const type = inferQuantityType(p);
  const preset = QTY_PRESETS[type];
  return {
    quantityType: type,
    step: Number(p.step) > 0 ? Number(p.step) : preset.step,
    min: Number(p.min) > 0 ? Number(p.min) : preset.min,
    unit: I.ensureI18n(p.unit && (p.unit.ru || p.unit.ua || p.unit.tr || p.unit.en) ? p.unit : preset.unit)
  };
}

function leadingOrder() {
  let min = Infinity;
  for (const item of state.products) {
    const value = Number(item.order);
    if (Number.isFinite(value)) min = Math.min(min, value);
  }
  return Number.isFinite(min) ? min - 10 : 10;
}

function emptyProduct() {
  return {
    id: "",
    categoryId: state.categories[0]?.id || "frozen",
    order: leadingOrder(),
    name: I.emptyI18n(),
    description: I.emptyI18n(),
    ingredients: I.emptyI18n(),
    cook: I.emptyI18n(),
    serveWith: I.emptyI18n(),
    price: 0,
    priceUnit: "kg",
    weight: 1000,
    weightUnit: "g",
    images: [],
    thumbnail: "",
    badges: { hit: false, new: false, sale: false },
    seo: { title: I.emptyI18n(), description: I.emptyI18n() },
    available: true,
    inStock: true,
    quantityType: "kg",
    step: 0.5,
    min: 0.5,
    unit: { ...QTY_PRESETS.kg.unit }
  };
}

function normalizeProduct(p) {
  return {
    ...p,
    name: I.ensureI18n(p.name),
    description: I.ensureI18n(p.description),
    ingredients: I.ensureI18n(p.ingredients),
    cook: I.ensureI18n(p.cook),
    serveWith: I.ensureI18n(p.serveWith),
    badges: {
      hit: !!p.badges?.hit,
      new: !!p.badges?.new,
      sale: !!p.badges?.sale
    },
    seo: {
      title: I.ensureI18n(p.seo && p.seo.title),
      description: I.ensureI18n(p.seo && p.seo.description)
    },
    available: p.available !== false,
    inStock: p.inStock !== false,
    images: Array.isArray(p.images) ? p.images.slice() : [],
    thumbnail: p.thumbnail || "",
    price: Number(p.price) || 0,
    weight: Number(p.weight) || 0,
    order: Number(p.order) || 0,
    ...qtyFieldsFor(p)
  };
}

function normalizeCategory(c) {
  return {
    id: c.id,
    emoji: c.emoji || "",
    order: Number(c.order) || 0,
    color: c.color || "#5c6b3c",
    enabled: c.enabled !== false,
    name: I.ensureI18n(c.name),
    seo: {
      title: I.ensureI18n(c.seo && c.seo.title),
      description: I.ensureI18n(c.seo && c.seo.description)
    }
  };
}

function normalizeGallery(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const items = Array.isArray(source.items) ? source.items : [];
  return {
    visible: source.visible !== false,
    autoplay: source.autoplay !== false,
    interval: Math.min(30, Math.max(2, Number(source.interval) || 5)),
    title: I.ensureI18n(source.title || { ru: "Наша кухня", ua: "Наша кухня", tr: "Mutfağımız", en: "Our kitchen" }),
    items: items.map(normalizeGalleryItem)
  };
}

function normalizeGalleryItem(item, i) {
  return {
    id: item.id || `gallery-${i + 1}`,
    image: item.image || "",
    order: Number(item.order) || (i + 1) * 10,
    visible: item.visible !== false,
    caption: I.ensureI18n(item.caption)
  };
}

function normalizeReview(r, i) {
  return {
    id: r.id || `review-${i + 1}`,
    name: r.name || "",
    photo: r.photo || "",
    rating: Math.min(5, Math.max(1, Number(r.rating) || 5)),
    order: Number(r.order) || (i + 1) * 10,
    visible: r.visible !== false,
    text: I.ensureI18n(r.text)
  };
}

function ensureSettings(raw) {
  const s = clone(raw || {});
  s.brand = s.brand || {};
  s.brand.logo = s.brand.logo || "images/brand/logo-big.webp";
  s.brand.logoHeader = s.brand.logoHeader || "images/brand/logo-header.webp";
  s.brand.heroImage = s.brand.heroImage || "images/brand/info.webp";
  s.brand.aboutImage = s.brand.aboutImage || "images/brand/logo-big.webp";
  s.brand.tagline = I.ensureI18n(s.brand.tagline);
  s.sections = s.sections || {};
  if (typeof s.sections.reviews !== "boolean") s.sections.reviews = true;
  const reviewsCarousel = s.sections.reviewsCarousel || {};
  s.sections.reviewsCarousel = {
    autoplay: reviewsCarousel.autoplay !== false,
    interval: Math.min(30, Math.max(2, Number(reviewsCarousel.interval) || 5))
  };
  s.hero = s.hero || {};
  s.hero.title = I.ensureI18n(s.hero.title || { ru: s.brand.name || "Casa Mia" });
  s.hero.subtitle = I.ensureI18n(s.hero.subtitle || s.brand.tagline);
  s.hero.ctaWhatsapp = I.ensureI18n(s.hero.ctaWhatsapp);
  s.hero.ctaInstagram = I.ensureI18n(s.hero.ctaInstagram);
  s.delivery = s.delivery || {};
  s.delivery.title = I.ensureI18n(s.delivery.title);
  s.delivery.description = I.ensureI18n(s.delivery.description);
  s.delivery.areas = I.ensureI18n(s.delivery.areas);
  s.delivery.cost = I.ensureI18n(s.delivery.cost);
  s.delivery.hours = I.ensureI18n(s.delivery.hours);
  s.delivery.payment = I.ensureI18n(s.delivery.payment);
  s.about = s.about || {};
  s.about.title = I.ensureI18n(s.about.title);
  s.about.subtitle = I.ensureI18n(s.about.subtitle);
  s.about.text = I.ensureI18n(s.about.text);
  s.about.closing = I.ensureI18n(s.about.closing);
  s.seo = s.seo || {};
  s.seo.title = I.ensureI18n(s.seo.title);
  s.seo.description = I.ensureI18n(s.seo.description);
  s.contacts = s.contacts || {};
  s.contacts.address = I.ensureI18n(s.contacts.address);
  s.contacts.phone = s.contacts.phone || s.contacts.whatsapp || "";
  s.contacts.email = s.contacts.email || "";
  s.contacts.whatsapp = s.contacts.whatsapp || "";
  s.contacts.whatsappDisplay = s.contacts.whatsappDisplay || s.contacts.whatsapp;
  s.contacts.instagram = (s.contacts.instagram || "").replace(/^@/, "");
  s.contacts.instagramUrl = s.contacts.instagramUrl || "";
  s.cart = s.cart || {};
  s.cart.minOrder = s.cart.minOrder === "" || s.cart.minOrder == null ? "" : Number(s.cart.minOrder);
  s.cart.freeDeliveryFrom = s.cart.freeDeliveryFrom === "" || s.cart.freeDeliveryFrom == null ? "" : Number(s.cart.freeDeliveryFrom);
  s.cart.whatsapp = s.cart.whatsapp || "";
  s.cart.instagram = (s.cart.instagram || "").replace(/^@/, "");
  s.cart.greeting = I.ensureI18n(s.cart.greeting);
  s.cart.fields = I.ensureI18n(s.cart.fields);
  return s;
}

function uniqueId(base, existing) {
  let id = base;
  let n = 2;
  while (existing.has(id)) {
    id = `${base}-${n}`;
    n += 1;
  }
  return id;
}

function slugFromName(name) {
  const map = { а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"e",ж:"zh",з:"z",и:"i",й:"y",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"h",ц:"ts",ч:"ch",ш:"sh",щ:"sch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya" };
  const raw = String(name || "")
    .toLowerCase()
    .split("")
    .map((ch) => map[ch] || ch)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return raw || `item-${Date.now()}`;
}

/* ---------- boot ---------- */

async function initAdmin() {
  const fresh = { cache: "no-store" };
  const [products, categories, settings, reviewsRes, galleryRes] = await Promise.all([
    fetch("data/products.json", fresh).then((r) => r.json()),
    fetch("data/categories.json", fresh).then((r) => r.json()),
    fetch("data/settings.json", fresh).then((r) => r.json()),
    fetch("data/reviews.json", fresh).then((r) => (r.ok ? r.json() : [])),
    fetch("data/gallery.json", fresh).then((r) => (r.ok ? r.json() : null))
  ]);

  state.products = products.map(normalizeProduct);
  state.knownProductIds = new Set(state.products.map((p) => p.id));
  state.categories = categories.map(normalizeCategory);
  state.settings = ensureSettings(settings);
  const reviewSource = Array.isArray(reviewsRes) && reviewsRes.length ? reviewsRes : settings.reviews || [];
  state.reviews = reviewSource.map(normalizeReview);
  state.gallery = normalizeGallery(galleryRes);
  takeSnapshot();

  if (sessionStorage.getItem(SESSION_KEY) === "1") {
    showApp();
  }

  document.getElementById("login-form").addEventListener("submit", onLogin);
  document.getElementById("logout-btn")?.addEventListener("click", () => {
    sessionStorage.removeItem(SESSION_KEY);
    CasaMiaGitHub.clearToken();
    location.reload();
  });
}

async function onLogin(e) {
  e.preventDefault();
  const pass = document.getElementById("password").value;
  const hash = await sha256(pass);
  const err = document.getElementById("login-error");
  if (hash !== state.settings.admin.passwordHash) {
    err.textContent = "Неверный пароль";
    return;
  }
  sessionStorage.setItem(SESSION_KEY, "1");
  showApp();
}

function showApp() {
  document.getElementById("login-view").classList.add("hidden");
  document.getElementById("app-view").classList.remove("hidden");
  document.getElementById("save-bar").classList.remove("hidden");
  bindTabs();
  bindGlobalActions();
  renderAll();
  fillGithubForm();
  checkGithubOnStart();
  refreshChrome();
}

function bindTabs() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => switchTab(tab.dataset.tab));
  });
}

function switchTab(id) {
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === id));
  document.querySelectorAll("[data-panel]").forEach((p) => p.classList.toggle("hidden", p.dataset.panel !== id));
  if (id === "hits") renderHitsAdmin();
}

function bindGlobalActions() {
  document.getElementById("add-product-btn").onclick = addProduct;
  document.getElementById("add-review-btn").onclick = addReview;
  document.getElementById("toggle-reviews-btn").onclick = () => {
    state.settings.sections.reviews = state.settings.sections.reviews === false;
    paintSectionToggles();
    markDirty();
  };
  document.getElementById("add-gallery-btn").onclick = addGalleryItem;
  document.getElementById("toggle-gallery-btn").onclick = () => {
    state.gallery.visible = state.gallery.visible === false;
    paintSectionToggles();
    markDirty();
  };
  document.getElementById("save-btn").onclick = saveAll;
  document.getElementById("github-form").addEventListener("submit", saveGithubConnection);
  document.getElementById("settings-form").addEventListener("input", () => {
    readSettingsForm();
    markDirty();
  });
  document.getElementById("cart-form").addEventListener("input", () => {
    readCartForm();
    markDirty();
  });
  document.getElementById("product-list").addEventListener("input", onProductInput);
  document.getElementById("product-list").addEventListener("change", onProductInput);
  bindProductTools();
  bindPriceTools();
  document.getElementById("category-list").addEventListener("input", onCategoryInput);
  document.getElementById("category-list").addEventListener("change", onCategoryInput);
  document.getElementById("review-list").addEventListener("input", onReviewInput);
  document.getElementById("review-list").addEventListener("change", onReviewInput);
  document.getElementById("gallery-settings").addEventListener("input", onGallerySettings);
  document.getElementById("reviews-settings").addEventListener("input", () => {
    readReviewsCarousel();
    markDirty();
  });
  document.getElementById("gallery-list").addEventListener("input", onGalleryInput);
  document.getElementById("gallery-list").addEventListener("change", onGalleryInput);
  document.getElementById("quick-prices").addEventListener("input", onQuickPriceInput);
  document.getElementById("quick-prices").addEventListener("change", onQuickFlagChange);
  document.getElementById("hits-add-btn").onclick = addHitFromSelect;
  document.getElementById("hits-list").addEventListener("click", onHitsClick);
}

function renderAll() {
  renderProducts();
  renderQuickPrices();
  renderCategoryCreate();
  renderCategories();
  renderSettingsForm();
  renderCartForm();
  renderReviews();
  renderGalleryAdmin();
  renderHitsAdmin();
}

/* ---------- products ---------- */

let productSearchTimer = 0;
let priceSearchTimer = 0;

function foldText(value) {
  return String(value || "")
    .toLocaleLowerCase()
    .replace(/ё/g, "е")
    .replace(/ı/g, "i")
    .replace(/i̇/g, "i")
    .trim();
}

function productSearchText(p) {
  const parts = [p.id];
  for (const field of [p.name, p.description]) {
    if (!field) continue;
    if (typeof field === "string") parts.push(field);
    else parts.push(...Object.values(field));
  }
  const cat = state.categories.find((c) => c.id === p.categoryId);
  if (cat?.name) {
    if (typeof cat.name === "string") parts.push(cat.name);
    else parts.push(...Object.values(cat.name));
  }
  return foldText(parts.join(" "));
}

function compareProductNames(a, b) {
  const an = a.name?.ru || a.id || "";
  const bn = b.name?.ru || b.id || "";
  return an.localeCompare(bn, "ru", { sensitivity: "base", numeric: true }) || ((Number(a.order) || 0) - (Number(b.order) || 0));
}

function productsInMenuOrder() {
  return state.products
    .slice()
    .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0) || compareProductNames(a, b));
}

function orderedProducts() {
  const items = state.products.slice();
  const mode = state.productSort;
  if (mode === "name-asc") items.sort(compareProductNames);
  else if (mode === "name-desc") items.sort((a, b) => compareProductNames(b, a));
  else if (mode === "price-asc") {
    items.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0) || compareProductNames(a, b));
  } else if (mode === "price-desc") {
    items.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0) || compareProductNames(a, b));
  } else {
    items.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0) || compareProductNames(a, b));
  }
  return items;
}

function visibleProducts() {
  const needle = foldText(state.productQuery);
  const items = orderedProducts();
  if (!needle) return items;
  return items.filter((p) => productSearchText(p).includes(needle));
}

function syncProductSearchClear() {
  const search = document.getElementById("product-search");
  const clear = document.getElementById("product-search-clear");
  if (!clear || !search) return;
  clear.hidden = !search.value.trim();
}

function bindProductTools() {
  const search = document.getElementById("product-search");
  const clear = document.getElementById("product-search-clear");
  const sort = document.getElementById("product-sort");
  if (!search || search.dataset.bound) return;
  search.dataset.bound = "1";
  search.addEventListener("input", () => {
    syncProductSearchClear();
    window.clearTimeout(productSearchTimer);
    productSearchTimer = window.setTimeout(() => {
      readOpenProductCards();
      state.productQuery = search.value;
      renderProducts();
    }, 120);
  });
  clear?.addEventListener("click", () => {
    window.clearTimeout(productSearchTimer);
    search.value = "";
    state.productQuery = "";
    syncProductSearchClear();
    readOpenProductCards();
    renderProducts();
    search.focus();
  });
  sort?.addEventListener("change", () => {
    readOpenProductCards();
    state.productSort = sort.value;
    renderProducts();
  });
}

function bindPriceTools() {
  const search = document.getElementById("price-search");
  const clear = document.getElementById("price-search-clear");
  if (!search || search.dataset.bound) return;
  search.dataset.bound = "1";
  search.addEventListener("input", () => {
    if (clear) clear.hidden = !search.value.trim();
    window.clearTimeout(priceSearchTimer);
    priceSearchTimer = window.setTimeout(() => {
      state.priceQuery = search.value;
      renderQuickPrices();
    }, 120);
  });
  clear?.addEventListener("click", () => {
    window.clearTimeout(priceSearchTimer);
    search.value = "";
    state.priceQuery = "";
    clear.hidden = true;
    renderQuickPrices();
    search.focus();
  });
}

function mediaUrl(path) {
  const fallback = "images/brand/card.webp";
  if (!path) return fallback;
  return String(path)
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function productThumb(p) {
  return mediaUrl(p.thumbnail || p.images?.[0]);
}

function renderProducts() {
  const list = document.getElementById("product-list");
  const items = visibleProducts();
  const meta = document.getElementById("product-query-meta");
  const query = state.productQuery.trim();
  if (meta) {
    if (query && items.length) {
      meta.classList.remove("hidden");
      meta.textContent = `Найдено ${items.length} из ${state.products.length}`;
    } else {
      meta.classList.add("hidden");
      meta.textContent = "";
    }
  }
  if (!items.length) {
    list.innerHTML = query
      ? `<p class="product-empty">Ничего не нашлось. Попробуйте другое название.</p>`
      : "";
    return;
  }
  list.innerHTML = items.map(productCardHtml).join("");
  list.querySelectorAll("[data-product-id]").forEach((card) => {
    const id = card.dataset.productId;
    const p = state.products.find((x) => x.id === id);
    if (!p || !state.expandedProducts.has(id)) return;
    const mount = card.querySelector("[data-image-mount]");
    if (!mount) return;
    CasaMiaImages.mount(mount, {
      src: productThumb(p),
      label: "Фото товара",
      onPick: (processed) => assignProductImage(p, processed),
      onRemove: () => {
        p.images = [];
        p.thumbnail = "";
        markDirty();
      }
    });
  });
}

function productCardHtml(p) {
  const cat = state.categories.find((c) => c.id === p.categoryId);
  const open = state.expandedProducts.has(p.id);
  if (!open) {
    return `<article class="admin-card compact" data-product-id="${I.escAttr(p.id)}">
      <img class="thumb-img" src="${I.escAttr(productThumb(p))}" alt="">
      <div>
        <h3>${I.esc(p.name.ru || p.id)}</h3>
        <div class="meta">${I.esc(cat?.name?.ru || p.categoryId)} · ${p.weight}${p.weightUnit || "g"} · ${p.price} ₺</div>
        <div class="flags">
          ${p.badges.hit ? '<span class="chip hit">Хит</span>' : ""}
          ${p.badges.new ? '<span class="chip new">Новинка</span>' : ""}
          ${p.inStock ? '<span class="chip ok">В наличии</span>' : '<span class="chip off">Нет в наличии</span>'}
          ${p.available ? "" : '<span class="chip off">Скрыт</span>'}
        </div>
      </div>
      <div class="btn-row" style="margin:0">
        <button class="btn ghost" type="button" data-act="expand">Открыть</button>
        <button class="btn ghost" type="button" data-act="dup">Дублировать</button>
        <button class="btn danger" type="button" data-act="del">Удалить</button>
      </div>
    </article>`;
  }

  const catOptions = state.categories
    .map((c) => `<option value="${I.escAttr(c.id)}" ${c.id === p.categoryId ? "selected" : ""}>${I.esc(c.emoji || "")} ${I.esc(c.name.ru)}</option>`)
    .join("");

  const editorState = productIsDirty(p) ? "is-dirty" : "is-clean";
  return `<article class="admin-card product-editor ${editorState}" data-product-id="${I.escAttr(p.id)}">
    <div class="editor-head">
      <div>
        <h3>${I.esc(p.name.ru || "Новый товар")}</h3>
        <div class="meta">id: ${I.esc(p.id)}</div>
      </div>
      <div class="btn-row" style="margin:0">
        <button class="btn ghost" type="button" data-act="collapse">Свернуть</button>
        <button class="btn ghost" type="button" data-act="dup">Дублировать товар</button>
        <button class="btn danger" type="button" data-act="del">Удалить товар</button>
      </div>
    </div>
    <div data-image-mount></div>
    ${I.blockHtml("Название", "name", p.name)}
    ${I.blockHtml("Описание", "description", p.description, { multiline: true, rows: 2 })}
    ${I.blockHtml("Состав", "ingredients", p.ingredients, { multiline: true, rows: 3 })}
    ${I.blockHtml("Как приготовить", "cook", p.cook, { multiline: true, rows: 2 })}
    ${I.blockHtml("Подача", "serveWith", p.serveWith, { multiline: true, rows: 2 })}
    <div class="grid-2">
      <div><label>Цена (₺)</label><input type="number" name="price" min="0" step="1" value="${p.price}"></div>
      <div><label>Единица цены</label>
        <select name="priceUnit">
          <option value="kg" ${p.priceUnit === "kg" ? "selected" : ""}>за кг</option>
          <option value="pack" ${p.priceUnit === "pack" ? "selected" : ""}>за упаковку</option>
        </select>
      </div>
      <div><label>Вес / объём</label><input type="number" name="weight" min="0" value="${p.weight}"></div>
      <div><label>Единица веса</label>
        <select name="weightUnit">
          <option value="g" ${p.weightUnit === "g" ? "selected" : ""}>г</option>
          <option value="ml" ${p.weightUnit === "ml" ? "selected" : ""}>мл</option>
          <option value="pcs" ${p.weightUnit === "pcs" ? "selected" : ""}>шт</option>
          <option value="box" ${p.weightUnit === "box" ? "selected" : ""}>коробка</option>
        </select>
      </div>
      <div><label>Категория</label><select name="categoryId">${catOptions}</select></div>
      <div><label>Порядок отображения</label><input type="number" name="order" value="${p.order}"></div>
      <div><label>Тип количества</label>
        <select name="quantityType">
          <option value="package" ${p.quantityType === "package" ? "selected" : ""}>Упаковка</option>
          <option value="piece" ${p.quantityType === "piece" ? "selected" : ""}>Штуки</option>
          <option value="kg" ${p.quantityType === "kg" ? "selected" : ""}>Килограммы</option>
          <option value="gram" ${p.quantityType === "gram" ? "selected" : ""}>Граммы</option>
        </select>
      </div>
      <div><label>Шаг</label><input type="number" name="step" min="0" step="0.1" value="${p.step}"></div>
      <div><label>Минимум</label><input type="number" name="min" min="0" step="0.1" value="${p.min}"></div>
    </div>
    ${I.blockHtml("Единица (уп., кг, шт.)", "unit", p.unit)}
    <div class="grid-2" style="margin-top:.6rem">
      <div class="check"><input type="checkbox" name="hit" id="hit-${p.id}" ${p.badges.hit ? "checked" : ""}><label for="hit-${p.id}">Хит недели</label></div>
      <div class="check"><input type="checkbox" name="new" id="new-${p.id}" ${p.badges.new ? "checked" : ""}><label for="new-${p.id}">Новинка</label></div>
      <div class="check"><input type="checkbox" name="sale" id="sale-${p.id}" ${p.badges.sale ? "checked" : ""}><label for="sale-${p.id}">Акция</label></div>
      <div class="check"><input type="checkbox" name="inStock" id="stock-${p.id}" ${p.inStock ? "checked" : ""}><label for="stock-${p.id}">В наличии</label></div>
      <div class="check"><input type="checkbox" name="hidden" id="hid-${p.id}" ${p.available ? "" : "checked"}><label for="hid-${p.id}">Скрыт</label></div>
    </div>
    <details class="seo-fold">
      <summary>SEO Title и Description</summary>
      ${I.blockHtml("SEO Title — пустое поле заполнится само", "seo-title", p.seo.title)}
      ${I.blockHtml("SEO Description — пустое поле заполнится само", "seo-desc", p.seo.description, { multiline: true, rows: 2 })}
      <div class="seo-preview" data-seo-preview>${seoPreviewHtml(p, "product")}</div>
    </details>
    <button class="editor-collapse" type="button" data-act="collapse" aria-label="Свернуть" title="Свернуть">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 14 6-6 6 6"/></svg>
    </button>
  </article>`;
}

function readProductCard(card) {
  const id = card.dataset.productId;
  const p = state.products.find((x) => x.id === id);
  if (!p || !state.expandedProducts.has(id)) return;
  p.name = I.readFrom(card, "name");
  p.description = I.readFrom(card, "description");
  p.ingredients = I.readFrom(card, "ingredients");
  p.cook = I.readFrom(card, "cook");
  p.serveWith = I.readFrom(card, "serveWith");
  p.price = Number(card.querySelector('[name="price"]')?.value) || 0;
  p.priceUnit = card.querySelector('[name="priceUnit"]')?.value || "kg";
  p.weight = Number(card.querySelector('[name="weight"]')?.value) || 0;
  p.weightUnit = card.querySelector('[name="weightUnit"]')?.value || "g";
  p.categoryId = card.querySelector('[name="categoryId"]')?.value || p.categoryId;
  p.order = Number(card.querySelector('[name="order"]')?.value) || 0;
  p.quantityType = card.querySelector('[name="quantityType"]')?.value || p.quantityType || "package";
  p.step = Number(card.querySelector('[name="step"]')?.value) || QTY_PRESETS[p.quantityType]?.step || 1;
  p.min = Number(card.querySelector('[name="min"]')?.value) || QTY_PRESETS[p.quantityType]?.min || 1;
  p.unit = I.readFrom(card, "unit");
  placeHit(p, card.querySelector('[name="hit"]')?.checked || false);
  p.badges.new = card.querySelector('[name="new"]')?.checked || false;
  p.badges.sale = card.querySelector('[name="sale"]')?.checked || false;
  p.inStock = card.querySelector('[name="inStock"]')?.checked || false;
  p.available = !card.querySelector('[name="hidden"]')?.checked;
  p.seo = p.seo || { title: I.emptyI18n(), description: I.emptyI18n() };
  p.seo.title = I.readFrom(card, "seo-title");
  p.seo.description = I.readFrom(card, "seo-desc");
}

function onProductInput(e) {
  const card = e.target.closest("[data-product-id]");
  if (!card) return;
  if (e.target.closest("[data-act]")) return;
  if (e.target.name === "quantityType") {
    const preset = QTY_PRESETS[e.target.value];
    if (preset) {
      const step = card.querySelector('[name="step"]');
      const min = card.querySelector('[name="min"]');
      if (step) step.value = preset.step;
      if (min) min.value = preset.min;
      ["ru", "ua", "tr", "en"].forEach((lang) => {
        const input = card.querySelector(`[name="unit.${lang}"]`);
        if (input) input.value = preset.unit[lang];
      });
    }
  }
  readProductCard(card);
  if (e.target.name === "hit" || e.target.name === "hidden") renderHitsAdmin();
  const product = state.products.find((item) => item.id === card.dataset.productId);
  const preview = card.querySelector("[data-seo-preview]");
  if (preview && product) preview.innerHTML = seoPreviewHtml(product, "product");
  markDirty();
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-act]");
  if (!btn) return;
  const card = btn.closest("[data-product-id]");
  if (!card) return;
  const id = card.dataset.productId;
  const act = btn.dataset.act;
  if (act === "expand") {
    readOpenProductCards();
    state.expandedProducts.add(id);
    renderProducts();
  } else if (act === "collapse") {
    readProductCard(card);
    state.expandedProducts.delete(id);
    renderProducts();
    renderQuickPrices();
  } else if (act === "dup") {
    readOpenProductCards();
    duplicateProduct(id);
  } else if (act === "del") {
    if (!confirm("Удалить товар? На сайте он исчезнет после «Сохранить изменения».")) return;
    state.products = state.products.filter((x) => x.id !== id);
    state.expandedProducts.delete(id);
    renderProducts();
    renderQuickPrices();
    renderHitsAdmin();
    markDirty();
  }
});

function readOpenProductCards() {
  document.querySelectorAll("#product-list [data-product-id]").forEach(readProductCard);
}

function addProduct() {
  readOpenProductCards();
  const p = emptyProduct();
  p.id = uniqueId("product-" + Date.now(), new Set(state.products.map((x) => x.id)));
  p.name.ru = "Новый товар";
  state.products.push(p);
  state.knownProductIds.add(p.id);
  state.expandedProducts.add(p.id);
  state.productQuery = "";
  state.productSort = "order";
  const search = document.getElementById("product-search");
  const sort = document.getElementById("product-sort");
  if (search) search.value = "";
  if (sort) sort.value = "order";
  syncProductSearchClear();
  renderProducts();
  markDirty();
  switchTab("products");
  const card = document.querySelector(`#product-list [data-product-id="${CSS.escape(p.id)}"]`);
  if (!card) return;
  card.scrollIntoView({ block: "nearest", behavior: "smooth" });
  card.querySelector('[name="name.ru"]')?.focus({ preventScroll: true });
}

function duplicateProduct(id) {
  const src = state.products.find((x) => x.id === id);
  if (!src) return;
  const copy = clone(src);
  copy.id = uniqueId(`${src.id}-copy`, new Set(state.products.map((x) => x.id)));
  copy.name.ru = `${src.name.ru || src.id} (копия)`;
  state.knownProductIds.add(copy.id);
  copy.order = (Number(src.order) || 0) + 1;
  copy.badges = { ...src.badges, new: true };
  state.products.push(copy);
  state.expandedProducts.add(copy.id);
  renderProducts();
  renderQuickPrices();
  renderHitsAdmin();
  markDirty();
}

function assignProductImage(p, processed) {
  const slug = CasaMiaImages.slugName(p.id);
  const mainPath = `images/products/${slug}.${processed.ext}`;
  const thumbPath = `images/products/${slug}-thumb.${processed.thumbExt}`;
  state.pendingImages[mainPath] = processed.blob;
  state.pendingImages[thumbPath] = processed.thumbBlob;
  p.images = [mainPath];
  p.thumbnail = thumbPath;
  markDirty();
}

function priceFlag(id, flag, label, checked) {
  const safe = I.escAttr(id);
  const inputId = `price-${flag}-${safe}`;
  return `<div class="check"><input type="checkbox" id="${inputId}" data-flag="${flag}" data-flag-id="${safe}" ${checked ? "checked" : ""}><label for="${inputId}">${label}</label></div>`;
}

function renderQuickPrices() {
  const box = document.getElementById("quick-prices");
  const meta = document.getElementById("price-query-meta");
  const needle = foldText(state.priceQuery);
  const items = state.products
    .slice()
    .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0))
    .filter((product) => !needle || productSearchText(product).includes(needle));
  if (meta) {
    if (needle) {
      meta.classList.remove("hidden");
      meta.textContent = items.length
        ? `Найдено ${items.length} из ${state.products.length}`
        : "Ничего не нашлось. Попробуйте другое название.";
    } else {
      meta.classList.add("hidden");
      meta.textContent = "";
    }
  }
  box.innerHTML = items.length
    ? items
    .map(
      (p) => `<article class="admin-card price-card${p.available ? "" : " is-hidden"}" data-price-card="${I.escAttr(p.id)}">
        <div class="price-card-main">
          <div>
            <h3>${I.esc(p.name.ru)}</h3>
            <div class="meta">${I.esc(p.weight)}${I.esc(p.weightUnit || "g")}</div>
          </div>
          <div class="inline-price">
            <input type="number" data-price-id="${I.escAttr(p.id)}" value="${p.price}" min="0" step="1">
            <span>₺</span>
          </div>
        </div>
        <div class="price-flags">
          ${priceFlag(p.id, "new", "Новинка", p.badges.new)}
          ${priceFlag(p.id, "inStock", "В наличии", p.inStock)}
          ${priceFlag(p.id, "hidden", "Скрыт", !p.available)}
          ${priceFlag(p.id, "sale", "Акция", p.badges.sale)}
          ${priceFlag(p.id, "hit", "Хит недели", p.badges.hit)}
        </div>
      </article>`
    )
    .join("")
    : "";
}

function onQuickPriceInput(e) {
  const input = e.target.closest("[data-price-id]");
  if (!input || input.type === "checkbox") return;
  const p = state.products.find((x) => x.id === input.dataset.priceId);
  if (p) p.price = Number(input.value) || 0;
  markDirty();
}

function onQuickFlagChange(e) {
  const input = e.target.closest("[data-flag]");
  if (!input) return;
  const p = state.products.find((x) => x.id === input.dataset.flagId);
  if (!p) return;
  const flag = input.dataset.flag;
  if (flag === "inStock") p.inStock = input.checked;
  else if (flag === "hidden") {
    p.available = !input.checked;
    renderHitsAdmin();
  } else if (flag === "hit") placeHit(p, input.checked);
  else if (p.badges) p.badges[flag] = input.checked;
  if (flag === "hit") renderHitsAdmin();
  input.closest("[data-price-card]")?.classList.toggle("is-hidden", !p.available);
  renderProducts();
  markDirty();
}

/* ---------- hits of the week ---------- */

const HITS_ON_SITE = 6;

function placeHit(p, on) {
  if (!p.badges) p.badges = { hit: false, new: false, sale: false };
  const was = !!p.badges.hit;
  p.badges.hit = !!on;
  if (p.badges.hit && !was) {
    const max = state.products.reduce((m, item) => Math.max(m, Number(item.hitOrder) || 0), 0);
    p.hitOrder = max + 10;
  } else if (!p.badges.hit) {
    delete p.hitOrder;
  }
}

function orderedHits() {
  return state.products
    .map((p, index) => ({ p, index }))
    .filter(({ p }) => p.badges?.hit)
    .sort((a, b) => {
      const ao = Number(a.p.hitOrder) || 0;
      const bo = Number(b.p.hitOrder) || 0;
      if (ao !== bo) return ao - bo;
      return a.index - b.index;
    })
    .map(({ p }) => p);
}

function hitCanShow(p) {
  if (p.available === false) return false;
  const cat = state.categories.find((c) => c.id === p.categoryId);
  return !!cat && cat.enabled !== false;
}

function hitStatus(p, place) {
  if (p.available === false) return { kind: "wait", text: "Скрыт — на сайте не показывается и место не занимает" };
  if (!hitCanShow(p)) return { kind: "wait", text: "Категория выключена — на сайте не показывается и место не занимает" };
  if (place <= HITS_ON_SITE) {
    const stock = p.inStock === false ? " · нет в наличии" : "";
    return { kind: "live", text: `На сайте, место ${place} из ${HITS_ON_SITE}${stock}` };
  }
  return { kind: "wait", text: `В списке есть, на сайт не попадает: видно только ${HITS_ON_SITE}` };
}

function renderHitsAdmin() {
  const list = document.getElementById("hits-list");
  const meta = document.getElementById("hits-meta");
  const select = document.getElementById("hits-add-select");
  const addBtn = document.getElementById("hits-add-btn");
  if (!list || !select) return;
  const hits = orderedHits();
  let shown = 0;
  const rows = hits.map((p) => {
    const visible = hitCanShow(p);
    const place = visible ? ++shown : 0;
    const status = hitStatus(p, place);
    const cat = state.categories.find((c) => c.id === p.categoryId);
    return `<article class="admin-card hit-admin-card">
      <img class="thumb-img" src="${I.escAttr(productThumb(p))}" alt="">
      <div>
        <h3>${I.esc(p.name?.ru || p.id)}</h3>
        <div class="meta">${I.esc(cat?.name?.ru || "Без категории")} · ${p.price} ₺</div>
        <p class="hit-note is-${status.kind}">${I.esc(status.text)}</p>
      </div>
      <div class="btn-row" style="margin:0">
        <button class="btn ghost" type="button" data-hit-act="up" data-hit-id="${I.escAttr(p.id)}" ${hits[0] === p ? "disabled" : ""}>Выше</button>
        <button class="btn ghost" type="button" data-hit-act="down" data-hit-id="${I.escAttr(p.id)}" ${hits.at(-1) === p ? "disabled" : ""}>Ниже</button>
        <button class="btn danger" type="button" data-hit-act="remove" data-hit-id="${I.escAttr(p.id)}">Убрать</button>
      </div>
    </article>`;
  });
  list.innerHTML = rows.length
    ? rows.join("")
    : `<p class="product-empty">Пока пусто. Выберите товар сверху и нажмите «Добавить в хиты».</p>`;
  const candidates = state.products
    .filter((p) => !p.badges?.hit)
    .slice()
    .sort((a, b) => String(a.name?.ru || "").localeCompare(String(b.name?.ru || ""), "ru"));
  const previous = select.value;
  select.innerHTML = candidates.length
    ? candidates.map((p) => `<option value="${I.escAttr(p.id)}">${I.esc(p.name?.ru || p.id)}</option>`).join("")
    : `<option value="">Все товары уже в хитах</option>`;
  if (previous && candidates.some((p) => p.id === previous)) select.value = previous;
  select.disabled = !candidates.length;
  if (addBtn) addBtn.disabled = !candidates.length;
  if (meta) {
    const onSite = Math.min(shown, HITS_ON_SITE);
    meta.textContent = hits.length
      ? `В списке ${hits.length}. На главной сейчас ${onSite} из ${HITS_ON_SITE}.`
      : "На главной блок «Хиты недели» пустой, пока сюда не добавлен хотя бы один товар.";
  }
}

function stampHitOrder(list) {
  list.forEach((p, index) => {
    p.hitOrder = (index + 1) * 10;
  });
}

function addHitFromSelect() {
  const select = document.getElementById("hits-add-select");
  const p = state.products.find((item) => item.id === select?.value);
  if (!p || p.badges?.hit) return;
  placeHit(p, true);
  refreshHitEditors();
}

function onHitsClick(e) {
  const btn = e.target.closest("[data-hit-act]");
  if (!btn) return;
  const id = btn.dataset.hitId;
  const act = btn.dataset.hitAct;
  if (act === "remove") {
    const p = state.products.find((item) => item.id === id);
    if (p) placeHit(p, false);
    refreshHitEditors();
    return;
  }
  const list = orderedHits();
  const index = list.findIndex((item) => item.id === id);
  const next = index + (act === "up" ? -1 : 1);
  if (index < 0 || next < 0 || next >= list.length) return;
  const moved = list.slice();
  const [item] = moved.splice(index, 1);
  moved.splice(next, 0, item);
  stampHitOrder(moved);
  refreshHitEditors();
}

function refreshHitEditors() {
  document.querySelectorAll("#product-list [data-product-id]").forEach((card) => {
    const p = state.products.find((item) => item.id === card.dataset.productId);
    const box = card.querySelector('[name="hit"]');
    if (p && box) box.checked = !!p.badges?.hit;
  });
  readOpenProductCards();
  renderProducts();
  renderQuickPrices();
  renderHitsAdmin();
  markDirty();
}

/* ---------- categories ---------- */

function renderCategoryCreate() {
  const box = document.getElementById("category-create");
  box.innerHTML = `
    <h2>Новая категория</h2>
    ${I.blockHtml("Название", "new-cat-name", I.emptyI18n())}
    <div class="grid-3">
      <div><label>Иконка</label><input name="new-cat-emoji" type="text" placeholder="🥟"></div>
      <div><label>Цвет бейджа</label><input name="new-cat-color" type="color" value="#5c6b3c"></div>
      <div><label>Порядок</label><input name="new-cat-order" type="number" value="${(state.categories.at(-1)?.order || 0) + 1}"></div>
    </div>
    <div class="btn-row"><button class="btn" type="button" id="add-category-btn">Добавить категорию</button></div>
  `;
  box.querySelector("#add-category-btn").onclick = addCategory;
}

function addCategory() {
  const box = document.getElementById("category-create");
  const name = I.readFrom(box, "new-cat-name");
  if (!name.ru.trim()) return toast("Укажите название категории на русском", "err");
  const ids = new Set(state.categories.map((c) => c.id));
  const cat = {
    id: uniqueId(slugFromName(name.ru), ids),
    emoji: box.querySelector('[name="new-cat-emoji"]').value.trim(),
    color: box.querySelector('[name="new-cat-color"]').value || "#5c6b3c",
    order: Number(box.querySelector('[name="new-cat-order"]').value) || 0,
    enabled: true,
    name,
    seo: { title: I.emptyI18n(), description: I.emptyI18n() }
  };
  state.categories.push(cat);
  state.expandedCategories.add(cat.id);
  renderCategoryCreate();
  renderCategories();
  renderProducts();
  markDirty();
}

function renderCategories() {
  const box = document.getElementById("category-list");
  const rows = [...state.categories].sort((a, b) => a.order - b.order);
  box.innerHTML = rows
    .map(
      (c) => `<article class="admin-card product-editor" data-cat-id="${I.escAttr(c.id)}">
        <div class="editor-head">
          <h3>${I.esc(c.emoji || "")} ${I.esc(c.name.ru || c.id)}</h3>
          <button class="btn danger" type="button" data-del-cat="${I.escAttr(c.id)}">Удалить</button>
        </div>
        ${I.blockHtml("Название", "name", c.name)}
        <div class="grid-3">
          <div><label>Иконка</label><input name="emoji" type="text" value="${I.escAttr(c.emoji)}"></div>
          <div><label>Цвет бейджа</label><input name="color" type="color" value="${I.escAttr(c.color)}"></div>
          <div><label>Порядок сортировки</label><input name="order" type="number" value="${c.order}"></div>
        </div>
        <div class="check"><input type="checkbox" name="enabled" id="en-${c.id}" ${c.enabled ? "checked" : ""}><label for="en-${c.id}">Включена</label></div>
        ${I.blockHtml("SEO Title — пустое поле заполнится само", "seo-title", c.seo.title)}
        ${I.blockHtml("SEO Description — пустое поле заполнится само", "seo-desc", c.seo.description, { multiline: true, rows: 2 })}
        <div class="seo-preview" data-seo-preview>${seoPreviewHtml(c, "category")}</div>
      </article>`
    )
    .join("");
  box.querySelectorAll("[data-del-cat]").forEach((btn) => {
    btn.onclick = () => {
      const id = btn.dataset.delCat;
      if (state.products.some((p) => p.categoryId === id)) {
        toast("Сначала перенесите или удалите товары этой категории", "err");
        return;
      }
      state.categories = state.categories.filter((c) => c.id !== id);
      renderCategories();
      renderProducts();
      markDirty();
    };
  });
}

function onCategoryInput(e) {
  const card = e.target.closest("[data-cat-id]");
  if (!card) return;
  const c = state.categories.find((x) => x.id === card.dataset.catId);
  if (!c) return;
  c.name = I.readFrom(card, "name");
  c.emoji = card.querySelector('[name="emoji"]')?.value || "";
  c.color = card.querySelector('[name="color"]')?.value || c.color;
  c.order = Number(card.querySelector('[name="order"]')?.value) || 0;
  c.enabled = card.querySelector('[name="enabled"]')?.checked || false;
  renderHitsAdmin();
  c.seo = c.seo || { title: I.emptyI18n(), description: I.emptyI18n() };
  c.seo.title = I.readFrom(card, "seo-title");
  c.seo.description = I.readFrom(card, "seo-desc");
  const preview = card.querySelector("[data-seo-preview]");
  if (preview) preview.innerHTML = seoPreviewHtml(c, "category");
  markDirty();
}

function seoPreviewHtml(entity, kind) {
  if (!window.CasaMiaSeo || !entity) return "";
  const category = kind === "product" ? state.categories.find((item) => item.id === entity.categoryId) : null;
  return I.LANGS.map((lang) => {
    const seo = kind === "product"
      ? CasaMiaSeo.productSeo(entity, lang.code, category)
      : CasaMiaSeo.categorySeo(entity, lang.code);
    const titleMark = seo.title.length > 60 ? " — длинноват для сниппета" : "";
    const descMark = seo.description.length > 155 ? " — длинноват для сниппета" : "";
    const titleMode = seo.titleSource === "manual" ? "свой заголовок" : "заголовок составится сам";
    const descMode = seo.descriptionSource === "manual" ? "своё описание" : "описание составится само";
    return `<p class="hint"><strong>${lang.label}.</strong> ${titleMode}${titleMark} (${seo.title.length}): ${I.esc(seo.title)}<br>${descMode}${descMark} (${seo.description.length}): ${I.esc(seo.description)}</p>`;
  }).join("");
}

/* ---------- settings ---------- */

function renderSettingsForm() {
  const s = state.settings;
  const form = document.getElementById("settings-form");
  form.innerHTML = `
    <div class="section-card">
      <h2>Изображения сайта</h2>
      <div class="brand-images">
        <div>
          <h3>Логотип в шапке</h3>
          <p class="hint">Левый верхний угол. Рекомендуемый размер: <strong>640 × 320 px</strong>, пропорция 2:1, прозрачный фон.</p>
          <div data-brand-image="logoHeader"></div>
        </div>
        <div>
          <h3>Большое лого</h3>
          <p class="hint">На первом экране. Рекомендуемый размер: <strong>1200 × 600 px</strong>, пропорция 2:1, прозрачный фон.</p>
          <div data-brand-image="logo"></div>
        </div>
        <div>
          <h3>Большое изображение</h3>
          <p class="hint">Фото справа на первом экране. Рекомендуемый размер: <strong>1200 × 800 px</strong>, пропорция 3:2.</p>
          <div data-brand-image="heroImage"></div>
        </div>
        <div>
          <h3>Фото в разделе «О нас»</h3>
          <p class="hint">Над текстом «О Casa Mia», на всю ширину экрана. Рекомендуемый размер: <strong>1200 × 600 px</strong>, пропорция 2:1. Для логотипа лучше прозрачный фон.</p>
          <div data-brand-image="aboutImage"></div>
        </div>
      </div>
    </div>
    <div class="section-card">
      <h2>Hero</h2>
      ${I.blockHtml("Название", "hero-title", s.hero.title)}
      ${I.blockHtml("Подзаголовок", "hero-subtitle", s.hero.subtitle, { multiline: true, rows: 2 })}
      ${I.blockHtml("Кнопка WhatsApp", "hero-wa", s.hero.ctaWhatsapp)}
      ${I.blockHtml("Кнопка Instagram", "hero-ig", s.hero.ctaInstagram)}
    </div>
    <div class="section-card">
      <h2>Доставка</h2>
      ${I.blockHtml("Заголовок", "del-title", s.delivery.title)}
      ${I.blockHtml("Описание", "del-desc", s.delivery.description, { multiline: true, rows: 3 })}
      ${I.blockHtml("Районы", "del-areas", s.delivery.areas, { multiline: true, rows: 2 })}
      ${I.blockHtml("Стоимость", "del-cost", s.delivery.cost)}
      ${I.blockHtml("Время доставки", "del-hours", s.delivery.hours)}
      ${I.blockHtml("Оплата", "del-pay", s.delivery.payment)}
    </div>
    <div class="section-card">
      <h2>О нас</h2>
      ${I.blockHtml("Заголовок", "about-title", s.about.title)}
      ${I.blockHtml("Подзаголовок", "about-sub", s.about.subtitle, { multiline: true, rows: 2 })}
      ${I.blockHtml("Описание", "about-text", s.about.text, { multiline: true, rows: 6 })}
      ${I.blockHtml("Финальная фраза", "about-close", s.about.closing, { multiline: true, rows: 2 })}
    </div>
    <div class="section-card">
      <h2>Поиск (SEO)</h2>
      <p class="hint" style="margin-top:0">Уникальные Title и Description для каждой языковой версии. Поисковики читают их в сниппете.</p>
      ${I.blockHtml("Title вкладки", "seo-title", s.seo.title)}
      ${I.blockHtml("Description", "seo-desc", s.seo.description, { multiline: true, rows: 3 })}
    </div>
    <div class="section-card">
      <h2>Контакты</h2>
      ${I.blockHtml("Адрес", "addr", s.contacts.address)}
      <div class="grid-2">
        <div><label>Телефон</label><input name="phone" type="text" value="${I.escAttr(s.contacts.phone)}"></div>
        <div><label>WhatsApp</label><input name="whatsapp" type="text" value="${I.escAttr(s.contacts.whatsapp)}"></div>
        <div><label>Instagram</label><input name="instagram" type="text" value="${I.escAttr(s.contacts.instagram)}"></div>
        <div><label>Email</label><input name="email" type="email" value="${I.escAttr(s.contacts.email)}"></div>
      </div>
    </div>
  `;
  const names = { logoHeader: "logo-header", logo: "logo-big", heroImage: "hero", aboutImage: "about" };
  form.querySelectorAll("[data-brand-image]").forEach((slot) => {
    const key = slot.dataset.brandImage;
    CasaMiaImages.mount(slot, {
      src: s.brand[key] || "",
      label: slot.parentElement?.querySelector("h3")?.textContent || "Изображение",
      onPick: (processed) => {
        const path = `images/brand/${names[key]}.${processed.ext}`;
        state.pendingImages[path] = processed.blob;
        state.settings.brand[key] = path;
        markDirty();
      },
      onRemove: () => {
        readSettingsForm();
        const fallback = {
          logoHeader: "images/brand/logo-header.webp",
          logo: "images/brand/logo-big.webp",
          heroImage: "images/brand/info.webp",
          aboutImage: "images/brand/logo-big.webp"
        }[key];
        ["webp", "jpg", "png"].forEach((ext) => {
          delete state.pendingImages[`images/brand/${names[key]}.${ext}`];
        });
        state.settings.brand[key] = fallback;
        renderSettingsForm();
        markDirty();
      }
    });
  });
}

function readSettingsForm() {
  const form = document.getElementById("settings-form");
  const s = state.settings;
  s.hero.title = I.readFrom(form, "hero-title");
  s.hero.subtitle = I.readFrom(form, "hero-subtitle");
  s.hero.ctaWhatsapp = I.readFrom(form, "hero-wa");
  s.hero.ctaInstagram = I.readFrom(form, "hero-ig");
  s.brand.tagline = s.hero.subtitle;
  s.delivery.title = I.readFrom(form, "del-title");
  s.delivery.description = I.readFrom(form, "del-desc");
  s.delivery.areas = I.readFrom(form, "del-areas");
  s.delivery.cost = I.readFrom(form, "del-cost");
  s.delivery.hours = I.readFrom(form, "del-hours");
  s.delivery.payment = I.readFrom(form, "del-pay");
  s.about.title = I.readFrom(form, "about-title");
  s.about.subtitle = I.readFrom(form, "about-sub");
  s.about.text = I.readFrom(form, "about-text");
  s.about.closing = I.readFrom(form, "about-close");
  s.seo = s.seo || {};
  s.seo.title = I.readFrom(form, "seo-title");
  s.seo.description = I.readFrom(form, "seo-desc");
  s.contacts.address = I.readFrom(form, "addr");
  s.contacts.phone = form.querySelector('[name="phone"]')?.value.trim() || "";
  s.contacts.whatsapp = form.querySelector('[name="whatsapp"]')?.value.trim() || "";
  s.contacts.whatsappDisplay = s.contacts.whatsapp;
  s.contacts.instagram = (form.querySelector('[name="instagram"]')?.value || "").trim().replace(/^@/, "");
  s.contacts.instagramUrl = s.contacts.instagram ? `https://instagram.com/${s.contacts.instagram}` : "";
  s.contacts.email = form.querySelector('[name="email"]')?.value.trim() || "";
}

/* ---------- cart settings ---------- */

function renderCartForm() {
  const s = state.settings;
  const form = document.getElementById("cart-form");
  const minOrder = s.cart.minOrder === "" || s.cart.minOrder == null ? "" : s.cart.minOrder;
  const freeFrom = s.cart.freeDeliveryFrom === "" || s.cart.freeDeliveryFrom == null ? "" : s.cart.freeDeliveryFrom;
  form.innerHTML = `
    <div class="section-card">
      <h2>Суммы доставки</h2>
      <div class="grid-2">
        <div>
          <label>Минимальная сумма доставки (₺)</label>
          <input name="cart-min" type="number" min="0" step="1" value="${I.escAttr(minOrder)}" placeholder="например 300">
        </div>
        <div>
          <label>Бесплатная доставка от (₺)</label>
          <input name="cart-free" type="number" min="0" step="1" value="${I.escAttr(freeFrom)}" placeholder="например 800">
        </div>
      </div>
      <p class="hint">Пустое поле — не показывать на сайте. Гость всё равно сможет отправить заказ.</p>
    </div>
    <div class="section-card">
      <h2>WhatsApp и Instagram</h2>
      <div class="grid-2">
        <div>
          <label>Телефон WhatsApp для заказов</label>
          <input name="cart-wa" type="text" value="${I.escAttr(s.cart.whatsapp)}" placeholder="${I.escAttr(s.contacts.whatsapp || "+90…")}">
        </div>
        <div>
          <label>Instagram username</label>
          <input name="cart-ig" type="text" value="${I.escAttr(s.cart.instagram)}" placeholder="${I.escAttr(s.contacts.instagram || "casa_mia_antalya")}">
        </div>
      </div>
      <p class="hint">Если пусто — используются контакты с вкладки «Настройки сайта».</p>
    </div>
    <div class="section-card">
      <h2>Шаблон сообщения</h2>
      ${I.blockHtml("Приветствие", "cart-greet", s.cart.greeting, { multiline: true, rows: 2 })}
      ${I.blockHtml("Поля в конце сообщения", "cart-fields", s.cart.fields, { multiline: true, rows: 3 })}
      <p class="hint">Список товаров и сумма подставляются сами. Здесь меняется только приветствие и строки «Имя / район / дата».</p>
    </div>
  `;
}

function readCartForm() {
  const form = document.getElementById("cart-form");
  if (!form) return;
  const s = state.settings;
  s.cart = s.cart || {};
  const minRaw = form.querySelector('[name="cart-min"]')?.value.trim();
  const freeRaw = form.querySelector('[name="cart-free"]')?.value.trim();
  s.cart.minOrder = minRaw === "" ? "" : Number(minRaw) || 0;
  s.cart.freeDeliveryFrom = freeRaw === "" ? "" : Number(freeRaw) || 0;
  s.cart.whatsapp = form.querySelector('[name="cart-wa"]')?.value.trim() || "";
  s.cart.instagram = (form.querySelector('[name="cart-ig"]')?.value || "").trim().replace(/^@/, "");
  s.cart.greeting = I.readFrom(form, "cart-greet");
  s.cart.fields = I.readFrom(form, "cart-fields");
}

/* ---------- reviews ---------- */

function readReviewsCarousel() {
  const form = document.getElementById("reviews-settings");
  const input = form?.querySelector('[name="reviews-interval"]');
  if (!input) return;
  const carousel = state.settings.sections.reviewsCarousel;
  carousel.autoplay = !!form.querySelector('[name="reviews-autoplay"]')?.checked;
  carousel.interval = Math.min(30, Math.max(2, Number(input.value) || 5));
}

function renderReviews() {
  const carousel = state.settings.sections.reviewsCarousel;
  const settingsForm = document.getElementById("reviews-settings");
  if (settingsForm) {
    settingsForm.innerHTML = `
      <h2>Карусель</h2>
      <div class="grid-2">
        <div class="check"><input type="checkbox" name="reviews-autoplay" id="reviews-autoplay" ${carousel.autoplay ? "checked" : ""}><label for="reviews-autoplay">Листать отзывы автоматически</label></div>
        <div><label for="reviews-interval">Смена отзыва, секунды</label><input id="reviews-interval" name="reviews-interval" type="number" min="2" max="30" value="${carousel.interval}"></div>
      </div>
      <p class="hint">На сайте сразу видно три отзыва. Стрелки и свайп листают по одному. Автопрокрутка останавливается, когда гость наводит курсор.</p>
    `;
  }
  const box = document.getElementById("review-list");
  const rows = [...state.reviews].sort((a, b) => a.order - b.order);
  box.innerHTML = rows
    .map(
      (r) => `<article class="admin-card product-editor" data-review-id="${I.escAttr(r.id)}">
        <div class="editor-head">
          <h3>${I.esc(r.name || "Отзыв")}</h3>
          <button class="btn danger" type="button" data-del-review="${I.escAttr(r.id)}">Удалить</button>
        </div>
        <div data-review-photo></div>
        <div class="grid-3">
          <div><label>Имя</label><input name="name" type="text" value="${I.escAttr(r.name)}"></div>
          <div><label>Оценка</label><input name="rating" type="number" min="1" max="5" value="${r.rating}"></div>
          <div><label>Порядок</label><input name="order" type="number" value="${r.order}"></div>
        </div>
        ${I.blockHtml("Текст", "text", r.text, { multiline: true, rows: 3 })}
        <div class="check"><input type="checkbox" name="visible" id="vis-${r.id}" ${r.visible ? "checked" : ""}><label for="vis-${r.id}">Показывать на сайте</label></div>
      </article>`
    )
    .join("");

  box.querySelectorAll("[data-review-id]").forEach((card) => {
    const r = state.reviews.find((x) => x.id === card.dataset.reviewId);
    CasaMiaImages.mount(card.querySelector("[data-review-photo]"), {
      src: r.photo || "",
      label: "Фото (необязательно)",
      onPick: (processed) => {
        const path = `images/reviews/${CasaMiaImages.slugName(r.id)}.${processed.ext}`;
        state.pendingImages[path] = processed.blob;
        r.photo = path;
        markDirty();
      },
      onRemove: () => {
        r.photo = "";
        markDirty();
      }
    });
  });

  box.querySelectorAll("[data-del-review]").forEach((btn) => {
    btn.onclick = () => {
      state.reviews = state.reviews.filter((r) => r.id !== btn.dataset.delReview);
      renderReviews();
      markDirty();
    };
  });
  paintSectionToggles();
}

function onReviewInput(e) {
  const card = e.target.closest("[data-review-id]");
  if (!card) return;
  const r = state.reviews.find((x) => x.id === card.dataset.reviewId);
  if (!r) return;
  r.name = card.querySelector('[name="name"]')?.value || "";
  r.rating = Number(card.querySelector('[name="rating"]')?.value) || 5;
  r.order = Number(card.querySelector('[name="order"]')?.value) || 0;
  r.text = I.readFrom(card, "text");
  r.visible = card.querySelector('[name="visible"]')?.checked || false;
  markDirty();
}

function paintSectionToggles() {
  const reviewsOn = state.settings.sections?.reviews !== false;
  const reviewsBtn = document.getElementById("toggle-reviews-btn");
  const reviewsHint = document.getElementById("reviews-visibility");
  if (reviewsBtn) reviewsBtn.textContent = reviewsOn ? "Скрыть раздел" : "Показать раздел";
  if (reviewsHint) reviewsHint.textContent = reviewsOn ? "Раздел «Отзывы» виден на сайте." : "Раздел «Отзывы» скрыт на сайте.";

  const galleryOn = state.gallery?.visible !== false;
  const galleryBtn = document.getElementById("toggle-gallery-btn");
  const galleryHint = document.getElementById("gallery-visibility");
  if (galleryBtn) galleryBtn.textContent = galleryOn ? "Скрыть раздел" : "Показать раздел";
  if (galleryHint) galleryHint.textContent = galleryOn ? "Раздел с фото виден на сайте." : "Раздел с фото скрыт на сайте.";
}

function renderGalleryAdmin() {
  const g = state.gallery;
  const form = document.getElementById("gallery-settings");
  form.innerHTML = `
    <h2>Карусель</h2>
    ${I.blockHtml("Заголовок раздела", "gallery-title", g.title)}
    <div class="grid-2">
      <div class="check"><input type="checkbox" name="gallery-autoplay" id="gallery-autoplay" ${g.autoplay ? "checked" : ""}><label for="gallery-autoplay">Листать фото автоматически</label></div>
      <div><label for="gallery-interval">Смена фото, секунды</label><input id="gallery-interval" name="gallery-interval" type="number" min="2" max="30" value="${g.interval}"></div>
    </div>
    <p class="hint">Автопрокрутка останавливается, когда гость наводит курсор на фото. Стрелки и точки работают всегда.</p>
  `;
  const box = document.getElementById("gallery-list");
  const rows = [...g.items].sort((a, b) => a.order - b.order);
  box.innerHTML = rows
    .map(
      (item) => `<article class="admin-card product-editor" data-gallery-id="${I.escAttr(item.id)}">
        <div class="editor-head">
          <h3>Фото</h3>
          <button class="btn danger" type="button" data-del-gallery="${I.escAttr(item.id)}">Удалить</button>
        </div>
        <div data-gallery-photo></div>
        <div class="grid-2">
          <div><label>Порядок</label><input name="order" type="number" value="${item.order}"></div>
          <div class="check"><input type="checkbox" name="visible" id="gvis-${item.id}" ${item.visible ? "checked" : ""}><label for="gvis-${item.id}">Показывать на сайте</label></div>
        </div>
        ${I.blockHtml("Подпись", "caption", item.caption)}
      </article>`
    )
    .join("");
  box.querySelectorAll("[data-gallery-id]").forEach((card) => {
    const item = g.items.find((entry) => entry.id === card.dataset.galleryId);
    const heading = card.querySelector("h3");
    if (heading) heading.textContent = item.caption?.ru || "Фото";
    CasaMiaImages.mount(card.querySelector("[data-gallery-photo]"), {
      src: item.image || "",
      label: "Фото для карусели",
      onPick: (processed) => {
        const path = `images/gallery/${CasaMiaImages.slugName(item.id)}.${processed.ext}`;
        state.pendingImages[path] = processed.blob;
        item.image = path;
        markDirty();
      },
      onRemove: () => {
        item.image = "";
        markDirty();
      }
    });
  });
  box.querySelectorAll("[data-del-gallery]").forEach((btn) => {
    btn.onclick = () => {
      state.gallery.items = state.gallery.items.filter((item) => item.id !== btn.dataset.delGallery);
      renderGalleryAdmin();
      markDirty();
    };
  });
  paintSectionToggles();
}

function onGallerySettings() {
  const form = document.getElementById("gallery-settings");
  if (!form) return;
  state.gallery.title = I.readFrom(form, "gallery-title");
  state.gallery.autoplay = !!form.querySelector('[name="gallery-autoplay"]')?.checked;
  const seconds = Number(form.querySelector('[name="gallery-interval"]')?.value);
  state.gallery.interval = Math.min(30, Math.max(2, seconds || 5));
  markDirty();
}

function onGalleryInput(e) {
  const card = e.target.closest("[data-gallery-id]");
  if (!card) return;
  const item = state.gallery.items.find((entry) => entry.id === card.dataset.galleryId);
  if (!item) return;
  item.order = Number(card.querySelector('[name="order"]')?.value) || 0;
  item.visible = !!card.querySelector('[name="visible"]')?.checked;
  item.caption = I.readFrom(card, "caption");
  const heading = card.querySelector("h3");
  if (heading) heading.textContent = item.caption?.ru || "Фото";
  markDirty();
}

function addGalleryItem() {
  const item = normalizeGalleryItem({
    id: uniqueId("gallery-" + Date.now(), new Set(state.gallery.items.map((entry) => entry.id))),
    image: "",
    order: (state.gallery.items.reduce((max, entry) => Math.max(max, Number(entry.order) || 0), 0) || 0) + 10,
    visible: true,
    caption: I.emptyI18n()
  }, state.gallery.items.length);
  state.gallery.items.push(item);
  renderGalleryAdmin();
  markDirty();
}

function addReview() {
  const r = {
    id: uniqueId("review-" + Date.now(), new Set(state.reviews.map((x) => x.id))),
    name: "",
    photo: "",
    rating: 5,
    order: (state.reviews.reduce((m, x) => Math.max(m, Number(x.order) || 0), 0) || 0) + 10,
    visible: true,
    text: I.emptyI18n()
  };
  state.reviews.push(r);
  renderReviews();
  paintSectionToggles();
  markDirty();
}

/* ---------- github ---------- */

function fillGithubForm() {
  const cfg = CasaMiaGitHub.readConfig();
  document.getElementById("gh-owner").value = cfg.owner || "NewLable";
  document.getElementById("gh-repo").value = cfg.repo || "casamiafood";
  document.getElementById("gh-branch").value = cfg.branch || "main";
  document.getElementById("gh-token").value = cfg.token || "";
  document.getElementById("gh-remember").checked = cfg.remember;
}

async function checkGithubOnStart() {
  const cfg = CasaMiaGitHub.readConfig();
  if (!cfg.token || !cfg.owner || !cfg.repo) {
    state.connected = false;
    setGhStatus("idle", "Токен не введён. Подключите GitHub один раз за сессию.");
    refreshChrome();
    return;
  }
  sessionStorage.setItem(CasaMiaGitHub.KEYS.token, cfg.token);
  const result = await CasaMiaGitHub.verify(cfg);
  state.connected = result.ok;
  setGhStatus(result.ok ? "ok" : "bad", result.ok ? `✅ Подключено. ${result.name}` : `❌ ${result.reason}`);
  refreshChrome();
  if (result.ok) loadCommits();
}

function setGhStatus(kind, text) {
  const el = document.getElementById("gh-status");
  el.className = `gh-status ${kind}`;
  el.textContent = text;
}

async function saveGithubConnection(e) {
  e.preventDefault();
  const cfg = {
    owner: document.getElementById("gh-owner").value.trim(),
    repo: document.getElementById("gh-repo").value.trim(),
    branch: document.getElementById("gh-branch").value.trim() || "main",
    remember: document.getElementById("gh-remember").checked,
    token: document.getElementById("gh-token").value.trim()
  };
  CasaMiaGitHub.saveConfig(cfg);
  const result = await CasaMiaGitHub.verify(cfg);
  state.connected = result.ok;
  if (result.ok) {
    setGhStatus("ok", `✅ Подключено. ${result.name}`);
    toast("GitHub подключён", "ok");
    loadCommits();
  } else {
    setGhStatus("bad", `❌ Неверный токен. ${result.reason}`);
    toast(result.reason, "err");
  }
  refreshChrome();
}

async function loadCommits() {
  const box = document.getElementById("commit-list");
  if (!CasaMiaGitHub.hasConnection()) {
    box.innerHTML = "<p class='hint'>Подключите GitHub, чтобы увидеть публикации.</p>";
    return;
  }
  try {
    const rows = await CasaMiaGitHub.listCommits(5);
    box.innerHTML = rows.length
      ? rows
          .map((c) => {
            const d = c.date ? new Date(c.date) : null;
            const label = d ? d.toLocaleString("ru-RU") : "";
            return `<div class="commit-item"><span>${I.esc(c.message)}</span><time>${I.esc(label)}</time></div>`;
          })
          .join("")
      : "<p class='hint'>Коммитов пока нет.</p>";
  } catch (err) {
    box.innerHTML = `<p class="hint">${I.esc(err.message)}</p>`;
  }
}

/* ---------- save ---------- */

function decodeGithubText(file) {
  const raw = String(file?.content || "").replace(/\s/g, "");
  if (!raw) return "";
  const binary = atob(raw);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

async function keepProductsSavedElsewhere() {
  const file = await CasaMiaGitHub.getFile("data/products.json");
  if (!file?.content) {
    throw new Error("Не удалось сверить каталог с сайтом. Сохранение отменено, чтобы не стереть товары.");
  }
  let remote;
  try {
    remote = JSON.parse(decodeGithubText(file));
  } catch {
    throw new Error("Не удалось прочитать каталог на сайте. Сохранение отменено, чтобы не стереть товары.");
  }
  if (!Array.isArray(remote)) return [];
  const localIds = new Set(state.products.map((p) => p.id));
  const kept = [];
  for (const product of remote) {
    const id = product && product.id;
    if (!id || localIds.has(id) || state.knownProductIds.has(id)) continue;
    kept.push(normalizeProduct(product));
    localIds.add(id);
    state.knownProductIds.add(id);
  }
  if (kept.length) state.products.push(...kept);
  return kept;
}

function pretty(data) {
  return `${JSON.stringify(data, null, 2)}\n`;
}

async function saveAll() {
  if (state.saving) return;
  readOpenProductCards();
  readSettingsForm();
  readCartForm();
  onGallerySettings();
  readReviewsCarousel();
  if (!isDirty()) return;
  if (!CasaMiaGitHub.hasConnection()) {
    toast("Сначала откройте вкладку «Настройки GitHub» и подключите репозиторий.", "err");
    switchTab("github");
    return;
  }

  const btn = document.getElementById("save-btn");
  state.saving = true;
  btn.classList.add("is-loading");
  btn.innerHTML = '<span class="spin"></span> Публикуем…';
  refreshChrome();

  try {
    const kept = await keepProductsSavedElsewhere();
    const jsonFiles = [
      { path: "data/products.json", text: pretty(productsInMenuOrder()) },
      { path: "data/categories.json", text: pretty(state.categories) },
      { path: "data/settings.json", text: pretty(stripSettings(state.settings)) },
      { path: "data/reviews.json", text: pretty(state.reviews) },
      { path: "data/gallery.json", text: pretty(state.gallery) }
    ];
    const blobs = Object.entries(state.pendingImages).map(([path, blob]) => ({ path, blob }));
    const result = await CasaMiaGitHub.publish({ jsonFiles, blobs });
    state.pendingImages = {};
    takeSnapshot();
    const when = new Date().toLocaleString("ru-RU");
    const banner = document.getElementById("publish-banner");
    banner.classList.remove("hidden");
    const names = kept.map((p) => p.name?.ru || p.id).join(", ");
    banner.textContent = kept.length
      ? `Готово, ${when}. Изменения записаны на сайт. Также оставлены товары, добавленные в другом окне: ${names}.`
      : `Готово, ${when}. Изменения записаны на сайт. Страница обновится в течение минуты.`;
    toast(kept.length ? "Записано. Товары из другого окна тоже сохранены." : "Изменения записаны на сайт.", "ok");
    await loadCommits();
    void result;
  } catch (err) {
    toast(err.message || "Не удалось записать изменения. Нажмите «Сохранить изменения» ещё раз.", "err");
  } finally {
    state.saving = false;
    btn.classList.remove("is-loading");
    btn.textContent = "💾 Сохранить изменения";
    refreshChrome();
  }
}

window.addEventListener("beforeunload", (e) => {
  if (!isDirty()) return;
  e.preventDefault();
  e.returnValue = "";
});

document.addEventListener("DOMContentLoaded", initAdmin);
