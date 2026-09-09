const SESSION_KEY = "casamia_admin";

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

async function initAdmin() {
  const [products, categories, settings] = await Promise.all([
    fetch("data/products.json").then((r) => r.json()),
    fetch("data/categories.json").then((r) => r.json()),
    fetch("data/settings.json").then((r) => r.json())
  ]);
  state.products = products;
  state.categories = categories;
  state.settings = settings;

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
  const modal = document.getElementById("editor");
  modal.classList.add("open");
  document.getElementById("editor-title").textContent = id ? "Редактировать товар" : "Новый товар";
  document.getElementById("f-id").value = p.id;
  document.getElementById("f-id").disabled = Boolean(id);
  document.getElementById("f-name").value = p.name.ru || "";
  document.getElementById("f-desc").value = p.description.ru || "";
  document.getElementById("f-ingredients").value = p.ingredients.ru || "";
  document.getElementById("f-cook").value = p.cook.ru || "";
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
    name: { ru: "", ua: "", tr: "", en: "" },
    description: { ru: "", ua: "", tr: "", en: "" },
    ingredients: { ru: "", ua: "", tr: "", en: "" },
    cook: { ru: "", ua: "", tr: "", en: "" },
    serveWith: { ru: "", ua: "", tr: "", en: "" },
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
  const isNew = !p;
  if (isNew) {
    p = emptyProduct();
    p.id = id;
    state.products.push(p);
  }
  const fill = (obj, val) => {
    obj.ru = val;
    if (!obj.ua) obj.ua = val;
    if (!obj.tr) obj.tr = val;
    if (!obj.en) obj.en = val;
  };
  fill(p.name, document.getElementById("f-name").value.trim());
  fill(p.description, document.getElementById("f-desc").value.trim());
  fill(p.ingredients, document.getElementById("f-ingredients").value.trim());
  fill(p.cook, document.getElementById("f-cook").value.trim());
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
      (c) => `<div class="admin-card" style="grid-template-columns:1fr auto">
        <div><h3>${c.emoji || ""} ${esc(c.name.ru)}</h3><div class="meta">id: ${c.id}</div></div>
        <button class="btn danger" data-del-cat="${c.id}">Удалить</button>
      </div>`
    )
    .join("");
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
  const name = document.getElementById("cat-name").value.trim();
  const emoji = document.getElementById("cat-emoji").value.trim();
  if (!name) return;
  const id = name
    .toLowerCase()
    .replace(/[^a-zа-яё0-9]+/gi, "-")
    .replace(/^-|-$/g, "") || `cat-${Date.now()}`;
  const asciiId = `cat-${Date.now()}`;
  state.categories.push({
    id: asciiId,
    emoji,
    order: (state.categories.at(-1)?.order || 0) + 10,
    name: { ru: name, ua: name, tr: name, en: name }
  });
  document.getElementById("cat-name").value = "";
  renderCategories();
}

function renderSettingsForm() {
  const s = state.settings;
  document.getElementById("s-wa").value = s.contacts.whatsapp;
  document.getElementById("s-ig").value = s.contacts.instagram;
  document.getElementById("s-areas").value = s.delivery.areas.ru;
  document.getElementById("s-hours").value = s.delivery.hours.ru;
  document.getElementById("s-payment").value = s.delivery.payment.ru;
}

function saveSettings(e) {
  e.preventDefault();
  const s = state.settings;
  s.contacts.whatsapp = document.getElementById("s-wa").value.trim();
  s.contacts.whatsappDisplay = s.contacts.whatsapp;
  s.contacts.instagram = document.getElementById("s-ig").value.trim().replace(/^@/, "");
  s.contacts.instagramUrl = `https://instagram.com/${s.contacts.instagram}`;
  const areas = document.getElementById("s-areas").value.trim();
  const hours = document.getElementById("s-hours").value.trim();
  const payment = document.getElementById("s-payment").value.trim();
  ["ru", "ua", "tr", "en"].forEach((l) => {
    s.delivery.areas[l] = areas;
    s.delivery.hours[l] = hours;
    s.delivery.payment[l] = payment;
  });
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
    // For static hosting without upload API: suggest path + show preview via data URL temporary
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

document.addEventListener("DOMContentLoaded", initAdmin);
