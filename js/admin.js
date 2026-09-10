const SESSION_KEY = "casamia_admin";
const LANGS = [
  { code: "ru", label: "RU" },
  { code: "ua", label: "UA" },
  { code: "tr", label: "TR" },
  { code: "en", label: "EN" }
];

const state = {
  products: [],
  categories: [],
  settings: null,
  editingId: null
};

async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function emptyI18n() {
  return { ru: "", ua: "", tr: "", en: "" };
}

function mountLangFields(containerId, prefix, { multiline = false, rows = 2 } = {}) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = LANGS.map(
    (l) => `<div class="i18n-field">
      <span class="lang-badge">${l.label}</span>
      ${
        multiline
          ? `<textarea id="${prefix}-${l.code}" rows="${rows}"></textarea>`
          : `<input id="${prefix}-${l.code}" type="text">`
      }
    </div>`
  ).join("");
}

function readI18n(prefix) {
  const out = emptyI18n();
  LANGS.forEach((l) => {
    const field = document.getElementById(`${prefix}-${l.code}`);
    out[l.code] = field ? field.value.trim() : "";
  });
  return out;
}

function writeI18n(prefix, obj = {}) {
  LANGS.forEach((l) => {
    const field = document.getElementById(`${prefix}-${l.code}`);
    if (field) field.value = obj?.[l.code] || "";
  });
}

function ensureI18n(obj) {
  const base = emptyI18n();
  if (!obj || typeof obj !== "object") return base;
  LANGS.forEach((l) => {
    base[l.code] = obj[l.code] || "";
  });
  return base;
}

async function initAdmin() {
  const [products, categories, settings] = await Promise.all([
    fetch("data/products.json").then((r) => r.json()),
    fetch("data/categories.json").then((r) => r.json()),
    fetch("data/settings.json").then((r) => r.json())
  ]);
  state.products = products;
  state.categories = categories;
  state.settings = settings;

  mountAllLangFields();

  if (sessionStorage.getItem(SESSION_KEY) === "1") {
    showApp();
  } else {
    document.getElementById("login-view").classList.remove("hidden");
  }

  document.getElementById("login-form").addEventListener("submit", onLogin);
  document.getElementById("logout-btn")?.addEventListener("click", () => {
    sessionStorage.removeItem(SESSION_KEY);
    location.reload();
  });
}

function mountAllLangFields() {
  mountLangFields("cat-name-fields", "cat-name");
  mountLangFields("s-areas-fields", "s-areas", { multiline: true, rows: 2 });
  mountLangFields("s-hours-fields", "s-hours");
  mountLangFields("s-payment-fields", "s-payment");
  mountLangFields("s-tagline-fields", "s-tagline", { multiline: true, rows: 2 });
  mountLangFields("s-about-title-fields", "s-about-title");
  mountLangFields("s-about-subtitle-fields", "s-about-subtitle", { multiline: true, rows: 2 });
  mountLangFields("s-about-text-fields", "s-about-text", { multiline: true, rows: 5 });
  mountLangFields("s-about-closing-fields", "s-about-closing", { multiline: true, rows: 2 });
  mountLangFields("f-name-fields", "f-name");
  mountLangFields("f-desc-fields", "f-desc", { multiline: true, rows: 2 });
  mountLangFields("f-ingredients-fields", "f-ingredients", { multiline: true, rows: 3 });
  mountLangFields("f-cook-fields", "f-cook", { multiline: true, rows: 2 });
  mountLangFields("f-serve-fields", "f-serve", { multiline: true, rows: 2 });
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
  bindTabs();
  renderList();
  renderCategories();
  renderSettingsForm();
  renderQuickPrices();
  document.getElementById("add-product-btn").onclick = () => openEditor(null);
  document.getElementById("save-prices-btn").onclick = saveQuickPrices;
  document.getElementById("export-btn").onclick = exportAll;
  document.getElementById("add-category-btn").onclick = addCategory;
}

function bindTabs() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll("[data-panel]").forEach((p) => p.classList.add("hidden"));
      tab.classList.add("active");
      document.querySelector(`[data-panel="${tab.dataset.tab}"]`).classList.remove("hidden");
    });
  });
}

function sortProducts() {
  state.products.sort((a, b) => a.order - b.order);
}

function renderList() {
  sortProducts();
  const list = document.getElementById("product-list");
  list.innerHTML = state.products
    .map((p) => {
      const cat = state.categories.find((c) => c.id === p.categoryId);
      const img = p.images?.[0] || "images/brand/card.png";
      return `<article class="admin-card" data-id="${p.id}">
        <img src="${img}" alt="">
        <div>
          <h3>${esc(p.name.ru)}</h3>
          <div class="meta">Категория: ${esc(cat?.name?.ru || p.categoryId)} · ${p.weight}${p.weightUnit || "g"} · ${p.price} ₺${p.priceUnit === "kg" ? "/кг" : ""}</div>
          <div class="flags">
            ${p.badges?.hit ? '<span class="chip hit">Хит</span>' : ""}
            ${p.badges?.new ? '<span class="chip">Новинка</span>' : ""}
            ${p.available === false ? '<span class="chip off">Скрыт</span>' : '<span class="chip">На сайте</span>'}
          </div>
        </div>
        <div class="btn-row">
          <button class="btn ghost" data-act="edit">Редактировать</button>
          <button class="btn secondary" data-act="toggle">${p.available === false ? "Показать" : "Скрыть"}</button>
          <button class="btn danger" data-act="del">Удалить</button>
        </div>
      </article>`;
    })
    .join("");

  list.querySelectorAll(".admin-card").forEach((card) => {
    const id = card.dataset.id;
    card.querySelector('[data-act="edit"]').onclick = () => openEditor(id);
    card.querySelector('[data-act="toggle"]').onclick = () => {
      const p = state.products.find((x) => x.id === id);
      p.available = p.available === false;
      renderList();
      renderQuickPrices();
    };
    card.querySelector('[data-act="del"]').onclick = () => {
      if (!confirm("Удалить товар?")) return;
      state.products = state.products.filter((x) => x.id !== id);
      renderList();
      renderQuickPrices();
    };
  });
}

function renderQuickPrices() {
  const box = document.getElementById("quick-prices");
  box.innerHTML = state.products
    .filter((p) => p.available !== false)
    .map(
      (p) => `<div class="admin-card" style="grid-template-columns:1fr auto">
        <div><h3>${esc(p.name.ru)}</h3></div>
        <div class="inline-price">
          <input type="number" data-price-id="${p.id}" value="${p.price}" min="0" step="1">
          <span>₺</span>
        </div>
      </div>`
    )
    .join("");
}

function saveQuickPrices() {
  document.querySelectorAll("[data-price-id]").forEach((input) => {
    const p = state.products.find((x) => x.id === input.dataset.priceId);
    if (p) p.price = Number(input.value) || 0;
  });
  renderList();
  alert("Цены обновлены в памяти. Нажмите «Скачать JSON», чтобы опубликовать.");
}

function openEditor(id) {
  state.editingId = id;
  const p = id ? state.products.find((x) => x.id === id) : emptyProduct();
  document.getElementById("editor").classList.add("open");
  document.getElementById("editor-title").textContent = id ? "Редактировать товар" : "Новый товар";
  document.getElementById("f-id").value = p.id;
  document.getElementById("f-id").disabled = Boolean(id);
  writeI18n("f-name", ensureI18n(p.name));
  writeI18n("f-desc", ensureI18n(p.description));
  writeI18n("f-ingredients", ensureI18n(p.ingredients));
  writeI18n("f-cook", ensureI18n(p.cook));
  writeI18n("f-serve", ensureI18n(p.serveWith));
  document.getElementById("f-price").value = p.price;
  document.getElementById("f-unit").value = p.priceUnit || "kg";
  document.getElementById("f-weight").value = p.weight;
  document.getElementById("f-wunit").value = p.weightUnit || "g";
  document.getElementById("f-order").value = p.order;
  document.getElementById("f-image").value = p.images?.[0] || "";
  document.getElementById("f-hit").checked = !!p.badges?.hit;
  document.getElementById("f-new").checked = !!p.badges?.new;
  document.getElementById("f-sale").checked = !!p.badges?.sale;
  document.getElementById("f-available").checked = p.available !== false;
  const sel = document.getElementById("f-category");
  sel.innerHTML = state.categories.map((c) => `<option value="${c.id}">${c.emoji || ""} ${c.name.ru}</option>`).join("");
  sel.value = p.categoryId;
}

function emptyProduct() {
  return {
    id: "",
    categoryId: state.categories[0]?.id || "frozen",
    order: (state.products.at(-1)?.order || 0) + 10,
    name: emptyI18n(),
    description: emptyI18n(),
    ingredients: emptyI18n(),
    cook: emptyI18n(),
    serveWith: emptyI18n(),
    price: 0,
    priceUnit: "kg",
    weight: 1000,
    weightUnit: "g",
    images: [],
    badges: { hit: false, new: false, sale: false },
    available: true
  };
}

function closeEditor() {
  document.getElementById("editor").classList.remove("open");
}

function saveEditor(e) {
  e.preventDefault();
  const id = document.getElementById("f-id").value.trim().replace(/\s+/g, "-").toLowerCase();
  if (!id) return alert("Укажите id");
  let p = state.products.find((x) => x.id === id);
  if (!p) {
    p = emptyProduct();
    p.id = id;
    state.products.push(p);
  }
  p.name = readI18n("f-name");
  p.description = readI18n("f-desc");
  p.ingredients = readI18n("f-ingredients");
  p.cook = readI18n("f-cook");
  p.serveWith = readI18n("f-serve");
  if (!p.name.ru) return alert("Укажите название хотя бы на RU");
  p.price = Number(document.getElementById("f-price").value) || 0;
  p.priceUnit = document.getElementById("f-unit").value;
  p.weight = Number(document.getElementById("f-weight").value) || 0;
  p.weightUnit = document.getElementById("f-wunit").value;
  p.order = Number(document.getElementById("f-order").value) || 0;
  p.categoryId = document.getElementById("f-category").value;
  const img = document.getElementById("f-image").value.trim();
  p.images = img ? [img] : p.images || [];
  p.badges = {
    hit: document.getElementById("f-hit").checked,
    new: document.getElementById("f-new").checked,
    sale: document.getElementById("f-sale").checked
  };
  p.available = document.getElementById("f-available").checked;
  closeEditor();
  renderList();
  renderQuickPrices();
}

function renderCategories() {
  const box = document.getElementById("category-list");
  box.innerHTML = state.categories
    .map(
      (c) => `<div class="admin-card cat-card" data-cat="${c.id}">
        <div>
          <h3>${c.emoji || ""} ${esc(c.name.ru)}</h3>
          <div class="meta">id: ${c.id}</div>
          <div class="lang-grid compact" style="margin-top:.75rem">
            ${LANGS.map(
              (l) => `<div class="i18n-field">
                <span class="lang-badge">${l.label}</span>
                <input type="text" data-cat-name="${c.id}" data-lang="${l.code}" value="${escAttr(c.name?.[l.code] || "")}">
              </div>`
            ).join("")}
          </div>
        </div>
        <div class="btn-row">
          <button class="btn ghost" data-save-cat="${c.id}">Сохранить</button>
          <button class="btn danger" data-del-cat="${c.id}">Удалить</button>
        </div>
      </div>`
    )
    .join("");

  box.querySelectorAll("[data-save-cat]").forEach((btn) => {
    btn.onclick = () => {
      const id = btn.dataset.saveCat;
      const cat = state.categories.find((c) => c.id === id);
      if (!cat) return;
      cat.name = ensureI18n(cat.name);
      LANGS.forEach((l) => {
        const input = box.querySelector(`[data-cat-name="${id}"][data-lang="${l.code}"]`);
        cat.name[l.code] = input ? input.value.trim() : "";
      });
      renderCategories();
      alert("Категория обновлена в памяти. Скачайте JSON для публикации.");
    };
  });

  box.querySelectorAll("[data-del-cat]").forEach((btn) => {
    btn.onclick = () => {
      const id = btn.dataset.delCat;
      if (state.products.some((p) => p.categoryId === id)) {
        alert("Сначала перенесите или удалите товары этой категории.");
        return;
      }
      state.categories = state.categories.filter((c) => c.id !== id);
      renderCategories();
    };
  });
}

function addCategory() {
  const name = readI18n("cat-name");
  const emoji = document.getElementById("cat-emoji").value.trim();
  if (!name.ru) return alert("Укажите название хотя бы на RU");
  const asciiId = `cat-${Date.now()}`;
  state.categories.push({
    id: asciiId,
    emoji,
    order: (state.categories.at(-1)?.order || 0) + 10,
    name
  });
  writeI18n("cat-name", emptyI18n());
  document.getElementById("cat-emoji").value = "";
  renderCategories();
}

function renderSettingsForm() {
  const s = state.settings;
  document.getElementById("s-wa").value = s.contacts.whatsapp;
  document.getElementById("s-ig").value = s.contacts.instagram;
  writeI18n("s-areas", ensureI18n(s.delivery.areas));
  writeI18n("s-hours", ensureI18n(s.delivery.hours));
  writeI18n("s-payment", ensureI18n(s.delivery.payment));
  writeI18n("s-tagline", ensureI18n(s.brand?.tagline));
  writeI18n("s-about-title", ensureI18n(s.about?.title));
  writeI18n("s-about-subtitle", ensureI18n(s.about?.subtitle));
  writeI18n("s-about-text", ensureI18n(s.about?.text));
  writeI18n("s-about-closing", ensureI18n(s.about?.closing));
}

function saveSettings(e) {
  e.preventDefault();
  const s = state.settings;
  s.contacts.whatsapp = document.getElementById("s-wa").value.trim();
  s.contacts.whatsappDisplay = s.contacts.whatsapp;
  s.contacts.instagram = document.getElementById("s-ig").value.trim().replace(/^@/, "");
  s.contacts.instagramUrl = `https://instagram.com/${s.contacts.instagram}`;
  s.delivery.areas = readI18n("s-areas");
  s.delivery.hours = readI18n("s-hours");
  s.delivery.payment = readI18n("s-payment");
  s.brand = s.brand || {};
  s.brand.tagline = readI18n("s-tagline");
  s.about = s.about || {};
  s.about.title = readI18n("s-about-title");
  s.about.subtitle = readI18n("s-about-subtitle");
  s.about.text = readI18n("s-about-text");
  s.about.closing = readI18n("s-about-closing");
  alert("Настройки сохранены в памяти. Скачайте JSON для публикации.");
}

function download(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportAll() {
  download("products.json", state.products);
  setTimeout(() => download("categories.json", state.categories), 300);
  setTimeout(() => download("settings.json", state.settings), 600);
  document.getElementById("export-hint").classList.remove("hidden");
}

function onImageFile(input) {
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const safe = file.name.replace(/\s+/g, "-").toLowerCase();
    document.getElementById("f-image").value = `images/products/${safe}`;
    document.getElementById("image-note").textContent =
      `Файл нужно положить в images/products/${safe} и закоммитить вместе с JSON. Локальный preview: выбран ${file.name}.`;
  };
  reader.readAsDataURL(file);
}

function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escAttr(s) {
  return esc(s).replace(/'/g, "&#39;");
}

document.addEventListener("DOMContentLoaded", initAdmin);
