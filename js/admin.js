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
  pendingImages: {},
  expandedProducts: new Set(),
  expandedCategories: new Set(),
  expandedReviews: new Set(),
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
}

function markDirty() {
  refreshChrome();
}

/* ---------- normalize ---------- */

function emptyProduct() {
  return {
    id: "",
    categoryId: state.categories[0]?.id || "frozen",
    order: (state.products.reduce((m, p) => Math.max(m, Number(p.order) || 0), 0) || 0) + 10,
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
    available: true,
    inStock: true
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
    available: p.available !== false,
    inStock: p.inStock !== false,
    images: Array.isArray(p.images) ? p.images.slice() : [],
    thumbnail: p.thumbnail || "",
    price: Number(p.price) || 0,
    weight: Number(p.weight) || 0,
    order: Number(p.order) || 0
  };
}

function normalizeCategory(c) {
  return {
    id: c.id,
    emoji: c.emoji || "",
    order: Number(c.order) || 0,
    color: c.color || "#5c6b3c",
    enabled: c.enabled !== false,
    name: I.ensureI18n(c.name)
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
  s.brand.tagline = I.ensureI18n(s.brand.tagline);
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
  s.contacts = s.contacts || {};
  s.contacts.address = I.ensureI18n(s.contacts.address);
  s.contacts.phone = s.contacts.phone || s.contacts.whatsapp || "";
  s.contacts.email = s.contacts.email || "";
  s.contacts.whatsapp = s.contacts.whatsapp || "";
  s.contacts.whatsappDisplay = s.contacts.whatsappDisplay || s.contacts.whatsapp;
  s.contacts.instagram = (s.contacts.instagram || "").replace(/^@/, "");
  s.contacts.instagramUrl = s.contacts.instagramUrl || "";
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
  const [products, categories, settings, reviewsRes] = await Promise.all([
    fetch("data/products.json").then((r) => r.json()),
    fetch("data/categories.json").then((r) => r.json()),
    fetch("data/settings.json").then((r) => r.json()),
    fetch("data/reviews.json").then((r) => (r.ok ? r.json() : []))
  ]);

  state.products = products.map(normalizeProduct);
  state.categories = categories.map(normalizeCategory);
  state.settings = ensureSettings(settings);
  const reviewSource = Array.isArray(reviewsRes) && reviewsRes.length ? reviewsRes : settings.reviews || [];
  state.reviews = reviewSource.map(normalizeReview);
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
}

function bindGlobalActions() {
  document.getElementById("add-product-btn").onclick = addProduct;
  document.getElementById("add-review-btn").onclick = addReview;
  document.getElementById("save-btn").onclick = saveAll;
  document.getElementById("github-form").addEventListener("submit", saveGithubConnection);
  document.getElementById("settings-form").addEventListener("input", () => {
    readSettingsForm();
    markDirty();
  });
  document.getElementById("product-list").addEventListener("input", onProductInput);
  document.getElementById("product-list").addEventListener("change", onProductInput);
  document.getElementById("category-list").addEventListener("input", onCategoryInput);
  document.getElementById("category-list").addEventListener("change", onCategoryInput);
  document.getElementById("review-list").addEventListener("input", onReviewInput);
  document.getElementById("review-list").addEventListener("change", onReviewInput);
  document.getElementById("quick-prices").addEventListener("input", onQuickPriceInput);
}

function renderAll() {
  renderProducts();
  renderQuickPrices();
  renderCategoryCreate();
  renderCategories();
  renderSettingsForm();
  renderReviews();
}

/* ---------- products ---------- */

function sortProducts() {
  state.products.sort((a, b) => a.order - b.order);
}

function mediaUrl(path) {
  const fallback = "images/brand/card.png";
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
  sortProducts();
  const list = document.getElementById("product-list");
  list.innerHTML = state.products.map(productCardHtml).join("");
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

  return `<article class="admin-card product-editor" data-product-id="${I.escAttr(p.id)}">
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
    </div>
    <div class="grid-2" style="margin-top:.6rem">
      <div class="check"><input type="checkbox" name="hit" id="hit-${p.id}" ${p.badges.hit ? "checked" : ""}><label for="hit-${p.id}">Хит продаж</label></div>
      <div class="check"><input type="checkbox" name="new" id="new-${p.id}" ${p.badges.new ? "checked" : ""}><label for="new-${p.id}">Новинка</label></div>
      <div class="check"><input type="checkbox" name="sale" id="sale-${p.id}" ${p.badges.sale ? "checked" : ""}><label for="sale-${p.id}">Акция</label></div>
      <div class="check"><input type="checkbox" name="inStock" id="stock-${p.id}" ${p.inStock ? "checked" : ""}><label for="stock-${p.id}">В наличии</label></div>
      <div class="check"><input type="checkbox" name="hidden" id="hid-${p.id}" ${p.available ? "" : "checked"}><label for="hid-${p.id}">Скрыт</label></div>
    </div>
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
  p.badges.hit = card.querySelector('[name="hit"]')?.checked || false;
  p.badges.new = card.querySelector('[name="new"]')?.checked || false;
  p.badges.sale = card.querySelector('[name="sale"]')?.checked || false;
  p.inStock = card.querySelector('[name="inStock"]')?.checked || false;
  p.available = !card.querySelector('[name="hidden"]')?.checked;
}

function onProductInput(e) {
  const card = e.target.closest("[data-product-id]");
  if (!card) return;
  if (e.target.closest("[data-act]")) return;
  readProductCard(card);
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
    markDirty();
  }
});

function readOpenProductCards() {
  document.querySelectorAll("#product-list [data-product-id]").forEach(readProductCard);
}

function addProduct() {
  const p = emptyProduct();
  p.id = uniqueId("product-" + Date.now(), new Set(state.products.map((x) => x.id)));
  p.name.ru = "Новый товар";
  state.products.push(p);
  state.expandedProducts.add(p.id);
  renderProducts();
  markDirty();
  switchTab("products");
}

function duplicateProduct(id) {
  const src = state.products.find((x) => x.id === id);
  if (!src) return;
  const copy = clone(src);
  copy.id = uniqueId(`${src.id}-copy`, new Set(state.products.map((x) => x.id)));
  copy.name.ru = `${src.name.ru || src.id} (копия)`;
  copy.order = (Number(src.order) || 0) + 1;
  copy.badges = { ...src.badges, new: true };
  state.products.push(copy);
  state.expandedProducts.add(copy.id);
  renderProducts();
  renderQuickPrices();
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

function renderQuickPrices() {
  const box = document.getElementById("quick-prices");
  box.innerHTML = state.products
    .filter((p) => p.available)
    .sort((a, b) => a.order - b.order)
    .map(
      (p) => `<div class="admin-card compact" style="grid-template-columns:1fr auto">
        <div>
          <h3>${I.esc(p.name.ru)}</h3>
          <div class="meta">${I.esc(p.weight)}${I.esc(p.weightUnit || "g")}</div>
        </div>
        <div class="inline-price">
          <input type="number" data-price-id="${I.escAttr(p.id)}" value="${p.price}" min="0" step="1">
          <span>₺</span>
        </div>
      </div>`
    )
    .join("");
}

function onQuickPriceInput(e) {
  const input = e.target.closest("[data-price-id]");
  if (!input) return;
  const p = state.products.find((x) => x.id === input.dataset.priceId);
  if (p) p.price = Number(input.value) || 0;
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
    name
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
  markDirty();
}

/* ---------- settings ---------- */

function renderSettingsForm() {
  const s = state.settings;
  const form = document.getElementById("settings-form");
  form.innerHTML = `
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
  s.contacts.address = I.readFrom(form, "addr");
  s.contacts.phone = form.querySelector('[name="phone"]')?.value.trim() || "";
  s.contacts.whatsapp = form.querySelector('[name="whatsapp"]')?.value.trim() || "";
  s.contacts.whatsappDisplay = s.contacts.whatsapp;
  s.contacts.instagram = (form.querySelector('[name="instagram"]')?.value || "").trim().replace(/^@/, "");
  s.contacts.instagramUrl = s.contacts.instagram ? `https://instagram.com/${s.contacts.instagram}` : "";
  s.contacts.email = form.querySelector('[name="email"]')?.value.trim() || "";
}

/* ---------- reviews ---------- */

function renderReviews() {
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

function pretty(data) {
  return `${JSON.stringify(data, null, 2)}\n`;
}

async function saveAll() {
  readOpenProductCards();
  readSettingsForm();
  if (!isDirty()) return;
  if (!CasaMiaGitHub.hasConnection()) {
    toast("Сначала подключите GitHub", "err");
    switchTab("github");
    return;
  }

  const btn = document.getElementById("save-btn");
  state.saving = true;
  btn.classList.add("is-loading");
  btn.innerHTML = '<span class="spin"></span> Публикуем…';
  refreshChrome();

  try {
    const jsonFiles = [
      { path: "data/products.json", text: pretty(state.products) },
      { path: "data/categories.json", text: pretty(state.categories) },
      { path: "data/settings.json", text: pretty(stripSettings(state.settings)) },
      { path: "data/reviews.json", text: pretty(state.reviews) }
    ];
    const blobs = Object.entries(state.pendingImages).map(([path, blob]) => ({ path, blob }));
    const result = await CasaMiaGitHub.publish({ jsonFiles, blobs });
    state.pendingImages = {};
    takeSnapshot();
    const when = new Date().toLocaleString("ru-RU");
    const banner = document.getElementById("publish-banner");
    banner.classList.remove("hidden");
    banner.textContent = `✅ Изменения опубликованы на сайте. ${when}`;
    toast("Сайт обновлён", "ok");
    await loadCommits();
    void result;
  } catch (err) {
    toast(err.message || "Не удалось сохранить", "err");
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
