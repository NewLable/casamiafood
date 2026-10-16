/**
 * Casa Mia cart — localStorage basket, drawer, WhatsApp / Instagram / copy.
 * UI copy comes from CasaMia.t("basket.*"). Product data from products.json.
 */
const CasaMiaCart = (() => {
  const CART_KEY = "casamia_cart";
  const FAV_KEY = "casamia_favorites";
  const LAST_KEY = "casamia_lastOrder";
  const CHECKOUT_KEY = "casamia_checkout";

  const QTY_PRESETS = {
    package: { type: "package", step: 1, min: 1, unitKey: "basket.unit_package" },
    piece: { type: "piece", step: 1, min: 1, unitKey: "basket.unit_piece" },
    kg: { type: "kg", step: 0.5, min: 0.5, unitKey: "basket.unit_kg" },
    gram: { type: "gram", step: 100, min: 100, unitKey: "basket.unit_gram" }
  };

  let drawerOpen = false;
  let bound = false;
  let bounceTimer = 0;
  let igCopiedOk = true;
  let mapPicker = null;
  let mapSaveToken = 0;
  let leafletPromise = null;
  let datePicker = { open: false, year: 0, month: 0 };
  const KONYAALTI = { lat: 36.8695, lng: 30.6365 };

  function t(key, vars) {
    return CasaMia.t(key, vars);
  }

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function emptyCart() {
    return { items: [], updated: nowIso() };
  }

  function readCart() {
    try {
      const raw = JSON.parse(localStorage.getItem(CART_KEY) || "null");
      if (!raw || !Array.isArray(raw.items)) return emptyCart();
      return {
        items: raw.items
          .filter((it) => it && it.id)
          .map((it) => {
            const row = { id: String(it.id), qty: Number(it.qty) || 0 };
            if (it.variantId) row.variantId = String(it.variantId);
            return row;
          })
          .filter((it) => it.qty > 0),
        updated: raw.updated || nowIso()
      };
    } catch {
      return emptyCart();
    }
  }

  function persistCart(cart, reason) {
    const payload = {
      items: cart.items.map((it) => {
        const row = { id: it.id, qty: it.qty };
        if (it.variantId) row.variantId = it.variantId;
        return row;
      }),
      updated: nowIso()
    };
    localStorage.setItem(CART_KEY, JSON.stringify(payload));
    document.dispatchEvent(new CustomEvent("casamia:cart", { detail: { reason, cart: getSnapshot() } }));
  }

  function inferType(product) {
    const type = product?.quantityType;
    if (type && QTY_PRESETS[type]) return type;
    if (product?.priceUnit === "kg") return "kg";
    if (product?.weightUnit === "pcs" && !product.variants) return "piece";
    return "package";
  }

  function getQtyConfig(product) {
    const type = inferType(product);
    const preset = QTY_PRESETS[type];
    const step = Number(product?.step) > 0 ? Number(product.step) : preset.step;
    const min = Number(product?.min) > 0 ? Number(product.min) : preset.min;
    return { type, step, min, unitKey: preset.unitKey };
  }

  function unitLabel(product) {
    const custom = CasaMia.localized(product?.unit);
    if (custom) return custom;
    return t(getQtyConfig(product).unitKey);
  }

  function snapQty(qty, step, min) {
    const n = Math.round(Number(qty) / step) * step;
    const places = step >= 1 ? 0 : String(step).split(".")[1]?.length || 1;
    const value = Number(n.toFixed(places));
    if (value < min) return 0;
    return value;
  }

  function formatQtyNumber(qty) {
    const n = Number(qty);
    if (Number.isInteger(n)) return String(n);
    return String(n).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
  }

  function formatQty(qty, product) {
    return `${formatQtyNumber(qty)} ${unitLabel(product)}`;
  }

  function formatQtyLabel(qty, product) {
    const type = getQtyConfig(product).type;
    const num = formatQtyNumber(qty);
    if (type === "kg" || type === "gram") return `${num} ${unitLabel(product)}`;
    return num;
  }

  function formatMoney(n) {
    return `${Math.round(Number(n) || 0)} ₺`;
  }

  function unitPrice(product, variant) {
    return Number(variant ? variant.price : product.price) || 0;
  }

  function lineTotal(product, qty, variant) {
    const price = unitPrice(product, variant);
    const type = getQtyConfig(product).type;
    if (type === "gram" && product.priceUnit === "kg") {
      return Math.round(price * qty / 1000);
    }
    return Math.round(price * qty);
  }

  function sameItem(item, id, variantId) {
    return item.id === id && (item.variantId || "") === (variantId || "");
  }

  function findItem(cart, id, variantId) {
    return cart.items.find((it) => sameItem(it, id, variantId));
  }

  function getQty(id, variantId) {
    const item = findItem(readCart(), id, variantId);
    return item ? item.qty : 0;
  }

  function setQty(id, qty, variantId, reason = "update") {
    const product = CasaMia.getProduct(id);
    const cart = readCart();
    const cfg = getQtyConfig(product || { quantityType: "package" });
    const next = snapQty(qty, cfg.step, cfg.min);
    const current = findItem(cart, id, variantId);
    if (next <= 0) {
      cart.items = cart.items.filter((it) => !sameItem(it, id, variantId));
      persistCart(cart, current ? "remove" : reason);
      return 0;
    }
    if (current) {
      current.qty = next;
      persistCart(cart, reason);
    } else {
      const row = { id, qty: next };
      if (variantId) row.variantId = variantId;
      cart.items.push(row);
      persistCart(cart, reason === "update" ? "add" : reason);
    }
    return next;
  }

  function addItem(id, variantId) {
    const product = CasaMia.getProduct(id);
    const cfg = getQtyConfig(product || { quantityType: "package" });
    const current = getQty(id, variantId);
    return setQty(id, current ? current + cfg.step : cfg.min, variantId, current ? "update" : "add");
  }

  function decItem(id, variantId) {
    const product = CasaMia.getProduct(id);
    const cfg = getQtyConfig(product || { quantityType: "package" });
    const current = getQty(id, variantId);
    return setQty(id, current - cfg.step, variantId, "update");
  }

  function removeItem(id, variantId) {
    return setQty(id, 0, variantId, "remove");
  }

  function clearCart() {
    persistCart(emptyCart(), "clear");
  }

  function getCategory(product) {
    if (!product) return null;
    return CasaMia.getCategory?.(product.categoryId) ||
      CasaMia.getAllCategories?.().find((c) => c.id === product.categoryId) ||
      CasaMia.getCategories().find((c) => c.id === product.categoryId) ||
      null;
  }

  function getLineItems() {
    return readCart().items.map((it) => {
      const product = CasaMia.getProduct(it.id);
      const variant = product?.variants?.find((v) => v.id === it.variantId) || null;
      const category = getCategory(product);
      let warning = "";
      if (!product) warning = "unavailable";
      else if (product.available === false) warning = "hidden_warn";
      else if (product.inStock === false) warning = "soldout_warn";
      return {
        ...it,
        product,
        variant,
        category,
        warning,
        unitPrice: product ? unitPrice(product, variant) : 0,
        total: product ? lineTotal(product, it.qty, variant) : 0
      };
    });
  }

  function itemCount(lines) {
    const list = lines || getLineItems();
    return list.reduce((n, line) => {
      const type = line.product ? getQtyConfig(line.product).type : "package";
      if (type === "kg" || type === "gram") return n + 1;
      return n + line.qty;
    }, 0);
  }

  function subtotal(lines) {
    return (lines || getLineItems()).reduce((n, line) => n + line.total, 0);
  }

  function getSnapshot() {
    const lines = getLineItems();
    return {
      currency: "TRY",
      items: lines.map((line) => ({
        id: line.id,
        variantId: line.variantId || null,
        qty: line.qty,
        unitPrice: line.unitPrice,
        total: line.total
      })),
      count: itemCount(lines),
      subtotal: subtotal(lines),
      updated: readCart().updated
    };
  }

  function cartSettings() {
    const s = CasaMia.getSettings() || {};
    return s.cart || {};
  }

  function whatsappPhone() {
    const s = CasaMia.getSettings() || {};
    return (cartSettings().whatsapp || s.contacts?.whatsapp || "").replace(/\D/g, "");
  }

  function track(name) {
    try {
      if (typeof umami === "object" && typeof umami.track === "function") umami.track(name);
    } catch {
      /* analytics must never block checkout */
    }
  }

  function instagramHandle() {
    const s = CasaMia.getSettings() || {};
    return (cartSettings().instagram || s.contacts?.instagram || "casa_mia_antalya").replace(/^@/, "");
  }

  function instagramChatUrl() {
    const user = instagramHandle();
    return `https://ig.me/m/${encodeURIComponent(user)}`;
  }

  function isAppleTouch() {
    const ua = navigator.userAgent || "";
    if (/iP(ad|hone|od)/.test(ua)) return true;
    return navigator.platform === "MacIntel" && (navigator.maxTouchPoints || 0) > 1;
  }

  function usesNativeMessenger() {
    const ua = navigator.userAgent || "";
    return isAppleTouch() || /Android/i.test(ua);
  }

  function withoutEmoji(text) {
    const src = String(text || "");
    const strip = (value, pattern) => value.replace(pattern, "");
    let out = src;
    try {
      out = strip(out, /\p{Extended_Pictographic}/gu);
    } catch {
      out = strip(out, /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu);
    }
    return out
      .replace(/\uFE0F/g, "")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/^[ \t]+|[ \t]+$/gm, "");
  }

  function openExternal(url) {
    if (isAppleTouch()) {
      window.location.assign(url);
      return;
    }
    const popup = window.open(url, "_blank");
    if (popup) popup.opener = null;
    else window.location.assign(url);
  }

  function lineName(line) {
    if (!line.product) return line.id;
    let name = CasaMia.localized(line.product.name);
    if (line.variant) name += ` (${CasaMia.localized(line.variant.label)})`;
    return name;
  }

  function buildOrderText(options = {}) {
    const lines = getLineItems().filter((line) => line.product);
    if (!lines.length) return "";
    const plain = !!options.plain;
    let greeting = CasaMia.localized(cartSettings().greeting) || t("basket.greeting");
    if (plain) greeting = withoutEmoji(greeting);
    const body = lines
      .map((line) => {
        const mark = plain ? "•" : (line.category?.emoji || "•");
        const qty = formatQty(line.qty, line.product);
        return `${mark} ${lineName(line)} — ${qty} × ${formatMoney(line.unitPrice)} = ${formatMoney(line.total)}`;
      })
      .join("\n");
    syncCheckoutFromDom();
    const checkout = readCheckout();
    const fields = [
      `${t("basket.field_name")} ${checkout.name}`.trimEnd(),
      `${t("basket.field_area")} ${checkout.area}`.trimEnd()
    ];
    if (checkout.location && checkout.locationUrl) {
      fields.push(`${t("basket.field_location")} ${checkout.location}\n${checkout.locationUrl}`);
    } else if (checkout.locationUrl) {
      fields.push(`${t("basket.field_location")} ${checkout.locationUrl}`);
    } else if (checkout.location) {
      fields.push(`${t("basket.field_location")} ${checkout.location}`);
    }
    fields.push(`${t("basket.field_date")} ${formatDeliveryDate(checkout.date)}`.trimEnd());
    const fieldBlock = fields.join("\n");
    const totalLine = `${t("basket.total")}: ${formatMoney(subtotal(lines))}`;
    return `${greeting}\n\n${body}\n\n————————————\n${totalLine}\n\n${fieldBlock}`;
  }

  function readCheckout() {
    try {
      const raw = JSON.parse(localStorage.getItem(CHECKOUT_KEY) || "{}");
      const locationUrl = mapUrlFromStorage(raw.locationUrl);
      return {
        name: String(raw.name || ""),
        area: String(raw.area || ""),
        location: locationUrl ? String(raw.location || "") : "",
        locationUrl,
        date: normalizeDeliveryDate(raw.date)
      };
    } catch {
      return { name: "", area: "", location: "", locationUrl: "", date: "" };
    }
  }

  function todayIso() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${now.getFullYear()}-${month}-${day}`;
  }

  function normalizeDeliveryDate(value) {
    const text = String(value || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return "";
    const [year, month, day] = text.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return "";
    if (text < todayIso()) return "";
    return text;
  }

  function dateLocale() {
    return { ru: "ru-RU", ua: "uk-UA", tr: "tr-TR", en: "en-GB" }[CasaMia.getLang()] || "ru-RU";
  }

  function formatDeliveryDate(iso) {
    const text = normalizeDeliveryDate(iso);
    if (!text) return "";
    const [year, month, day] = text.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString(dateLocale(), { day: "numeric", month: "long", year: "numeric" });
  }

  function isoFromParts(year, month, day) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function weekdayLabels() {
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(2024, 0, 1 + i);
      return date.toLocaleDateString(dateLocale(), { weekday: "short" });
    });
  }

  function datePanelHtml() {
    const year = datePicker.year;
    const month = datePicker.month;
    const selected = readCheckout().date;
    const today = todayIso();
    const title = new Date(year, month, 1).toLocaleDateString(dateLocale(), { month: "long", year: "numeric" });
    const lead = (new Date(year, month, 1).getDay() + 6) % 7;
    const count = new Date(year, month + 1, 0).getDate();
    const now = new Date();
    const prevOff = year < now.getFullYear() || (year === now.getFullYear() && month <= now.getMonth());
    const cells = Array.from({ length: lead }, () => "<span></span>");
    for (let day = 1; day <= count; day += 1) {
      const iso = isoFromParts(year, month, day);
      const cls = ["cart-date-day", iso === selected ? "is-selected" : "", iso === today ? "is-today" : ""].filter(Boolean).join(" ");
      cells.push(`<button type="button" class="${cls}" data-cart-date-pick="${iso}"${iso < today ? " disabled" : ""}>${day}</button>`);
    }
    return `<div class="cart-date-nav">
        <button type="button" class="cart-date-nav-btn" data-cart-date-prev ${prevOff ? "disabled" : ""} aria-label="${esc(t("basket.date_prev"))}">‹</button>
        <strong>${esc(title)}</strong>
        <button type="button" class="cart-date-nav-btn" data-cart-date-next aria-label="${esc(t("basket.date_next"))}">›</button>
      </div>
      <div class="cart-date-week">${weekdayLabels().map((name) => `<span>${esc(name)}</span>`).join("")}</div>
      <div class="cart-date-grid">${cells.join("")}</div>`;
  }

  function paintDatePicker() {
    const box = document.querySelector("[data-cart-datebox]");
    if (!box) return;
    const value = readCheckout().date;
    const hidden = box.querySelector("[data-cart-date]");
    const label = box.querySelector("[data-cart-date-label]");
    const toggle = box.querySelector("[data-cart-date-toggle]");
    const panel = box.querySelector("[data-cart-date-panel]");
    if (hidden) hidden.value = value;
    if (label) {
      label.textContent = value ? formatDeliveryDate(value) : t("basket.date_ph");
      label.classList.toggle("is-empty", !value);
    }
    if (toggle) toggle.setAttribute("aria-expanded", datePicker.open ? "true" : "false");
    if (panel) {
      panel.hidden = !datePicker.open;
      if (datePicker.open) panel.innerHTML = datePanelHtml();
    }
  }

  function openDatePicker() {
    const selected = normalizeDeliveryDate(readCheckout().date);
    const base = selected ? new Date(Number(selected.slice(0, 4)), Number(selected.slice(5, 7)) - 1, 1) : new Date();
    datePicker.open = true;
    datePicker.year = base.getFullYear();
    datePicker.month = base.getMonth();
    paintDatePicker();
  }

  function shiftDateMonth(delta) {
    const now = new Date();
    const next = new Date(datePicker.year, datePicker.month + delta, 1);
    if (next.getFullYear() < now.getFullYear() || (next.getFullYear() === now.getFullYear() && next.getMonth() < now.getMonth())) return;
    datePicker.year = next.getFullYear();
    datePicker.month = next.getMonth();
    paintDatePicker();
  }

  function persistCheckout(partial) {
    const next = { ...readCheckout(), ...partial };
    const locationUrl = mapUrlFromStorage(next.locationUrl);
    localStorage.setItem(CHECKOUT_KEY, JSON.stringify({
      name: String(next.name || "").slice(0, 80),
      area: String(next.area || "").slice(0, 80),
      location: locationUrl ? String(next.location || "").slice(0, 240) : "",
      locationUrl,
      date: normalizeDeliveryDate(next.date)
    }));
  }

  function syncCheckoutFromDom() {
    const name = document.querySelector("#cart-drawer [data-cart-name]");
    const area = document.querySelector("#cart-drawer [data-cart-area]");
    const location = document.querySelector("#cart-drawer [data-cart-location]");
    const date = document.querySelector("#cart-drawer [data-cart-date]");
    if (!name && !area && !location && !date) return;
    const partial = {};
    if (name) partial.name = name.value;
    if (area) partial.area = area.value;
    if (location) {
      partial.location = location.value;
      if (!location.value.trim()) partial.locationUrl = "";
    }
    if (date) partial.date = date.value;
    persistCheckout(partial);
  }

  function mapUrlFromStorage(url) {
    const value = String(url || "").trim();
    return /^https:\/\/www\.google\.com\/maps\?q=-?\d{1,3}\.\d{1,8},-?\d{1,3}\.\d{1,8}$/.test(value) ? value : "";
  }

  function mapsLink(lat, lng) {
    const la = Number(lat);
    const ln = Number(lng);
    if (!Number.isFinite(la) || !Number.isFinite(ln)) return "";
    if (Math.abs(la) > 90 || Math.abs(ln) > 180) return "";
    return `https://www.google.com/maps?q=${la.toFixed(6)},${ln.toFixed(6)}`;
  }

  function parseMapUrl(url) {
    const value = mapUrlFromStorage(url);
    const match = value.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (!match) return null;
    return { lat: Number(match[1]), lng: Number(match[2]) };
  }

  function readFavs() {
    try {
      const arr = JSON.parse(localStorage.getItem(FAV_KEY) || "[]");
      return Array.isArray(arr) ? arr.map(String) : [];
    } catch {
      return [];
    }
  }

  function writeFavs(ids) {
    localStorage.setItem(FAV_KEY, JSON.stringify(ids));
    document.dispatchEvent(new CustomEvent("casamia:favorites", { detail: { ids } }));
  }

  function isFavorite(id) {
    return readFavs().includes(id);
  }

  function toggleFavorite(id) {
    const ids = readFavs();
    const i = ids.indexOf(id);
    if (i >= 0) ids.splice(i, 1);
    else ids.push(id);
    writeFavs(ids);
    return i < 0;
  }

  function readLastOrder() {
    try {
      const raw = JSON.parse(localStorage.getItem(LAST_KEY) || "null");
      if (!raw || !Array.isArray(raw.items) || !raw.items.length) return null;
      return { date: raw.date || "", items: raw.items };
    } catch {
      return null;
    }
  }

  function saveLastOrder() {
    const cart = readCart();
    if (!cart.items.length) return;
    localStorage.setItem(LAST_KEY, JSON.stringify({
      date: nowIso(),
      items: cart.items.map((it) => ({ ...it }))
    }));
  }

  function restoreLastOrder() {
    const last = readLastOrder();
    if (!last) return false;
    persistCart({ items: last.items.map((it) => ({ ...it })), updated: nowIso() }, "restore");
    return true;
  }

  function heartSvg(filled) {
    if (filled) {
      return '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21s-6.5-4.2-9.2-8.2C.7 9.7 1.7 5.8 5.2 4.4A5.2 5.2 0 0 1 12 7a5.2 5.2 0 0 1 6.8-2.6c3.5 1.4 4.5 5.3 2.4 8.4C18.5 16.8 12 21 12 21z"/></svg>';
    }
    return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 21s-6.5-4.2-9.2-8.2C.7 9.7 1.7 5.8 5.2 4.4A5.2 5.2 0 0 1 12 7a5.2 5.2 0 0 1 6.8-2.6c3.5 1.4 4.5 5.3 2.4 8.4C18.5 16.8 12 21 12 21z"/></svg>';
  }

  function favBtnHtml(id) {
    const on = isFavorite(id);
    return `<button type="button" class="fav-btn${on ? " is-on" : ""}" data-fav-toggle="${esc(id)}" aria-pressed="${on ? "true" : "false"}" aria-label="${esc(t(on ? "basket.fav_remove" : "basket.fav_add"))}">${heartSvg(on)}</button>`;
  }

  function variantAttrs(variantId) {
    return variantId ? ` data-variant-id="${esc(variantId)}"` : "";
  }

  function controlsHtml(id, { variantId = "", size = "" } = {}) {
    const product = CasaMia.getProduct(id);
    if (!product) return "";
    const qty = getQty(id, variantId);
    const sizeClass = size === "lg" ? " is-lg" : "";
    const v = variantAttrs(variantId);
    if (!qty) {
      return `<div class="cart-controls${sizeClass}" data-cart-controls="${esc(id)}"${v}>
        <button type="button" class="cart-add-btn" data-cart-add="${esc(id)}"${v}>${t("basket.add")}</button>
      </div>`;
    }
    return `<div class="cart-controls is-active${sizeClass}" data-cart-controls="${esc(id)}"${v}>
      <button type="button" class="cart-step" data-cart-dec="${esc(id)}"${v} aria-label="${esc(t("basket.decrease"))}">−</button>
      <span class="cart-qty-val">${esc(formatQtyLabel(qty, product))}</span>
      <button type="button" class="cart-step" data-cart-inc="${esc(id)}"${v} aria-label="${esc(t("basket.increase"))}">+</button>
    </div>`;
  }

  function toast(key) {
    const wrap = document.getElementById("cart-toasts");
    if (!wrap) return;
    wrap.replaceChildren();
    const el = document.createElement("div");
    el.className = "cart-toast is-show";
    el.setAttribute("role", "status");
    el.textContent = t(key);
    wrap.appendChild(el);

    const hide = () => {
      if (el.parentNode) el.remove();
      window.clearTimeout(toastTimer);
      toastTimer = 0;
    };
    const onEnd = (e) => {
      if (e.animationName && e.animationName !== "cart-toast-life") return;
      hide();
    };
    el.addEventListener("animationend", onEnd);
    el.addEventListener("webkitAnimationEnd", onEnd);
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(hide, 3200);
  }

  function ping(id) {
    document.getElementById("cart-fab")?.classList.add("is-bounce");
    document.querySelectorAll(`.product-card[data-product-id="${CSS.escape(id)}"]`).forEach((el) => {
      el.classList.remove("is-cart-pop");
      void el.offsetWidth;
      el.classList.add("is-cart-pop");
    });
    clearTimeout(bounceTimer);
    bounceTimer = setTimeout(() => {
      document.getElementById("cart-fab")?.classList.remove("is-bounce");
      document.querySelectorAll(".is-cart-pop").forEach((el) => el.classList.remove("is-cart-pop"));
    }, 650);
  }

  function refreshControls() {
    document.querySelectorAll("[data-cart-controls]").forEach((el) => {
      const html = controlsHtml(el.dataset.cartControls, {
        variantId: el.dataset.variantId || "",
        size: el.classList.contains("is-lg") ? "lg" : ""
      });
      el.outerHTML = html;
    });
    document.querySelectorAll("[data-fav-toggle]").forEach((el) => {
      const on = isFavorite(el.dataset.favToggle);
      el.classList.toggle("is-on", on);
      el.setAttribute("aria-pressed", on ? "true" : "false");
      el.setAttribute("aria-label", t(on ? "basket.fav_remove" : "basket.fav_add"));
      el.innerHTML = heartSvg(on);
    });
  }

  function warnText(code) {
    if (code === "unavailable") return t("basket.unavailable");
    if (code === "hidden_warn") return t("basket.hidden_warn");
    if (code === "soldout_warn") return t("basket.soldout_warn");
    return "";
  }

  function checkoutIcon(name) {
    if (name === "wa") {
      return `<svg class="cart-btn-icon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.5 3.5A11 11 0 0 0 3.2 17.7L2 22l4.4-1.1A11 11 0 1 0 20.5 3.5z"/></svg>`;
    }
    if (name === "ig") {
      return `<svg class="cart-btn-icon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm5 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm6.5-.9a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2zM12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z"/></svg>`;
    }
    return `<span class="cart-btn-emoji" aria-hidden="true">📋</span>`;
  }

  function progressHtml(sum) {
    const freeFrom = Number(cartSettings().freeDeliveryFrom);
    if (!freeFrom) return "";
    if (sum >= freeFrom) {
      return `<div class="cart-progress is-done"><p>${t("basket.free_done")}</p>
        <div class="cart-progress-bar"><span style="width:100%"></span></div></div>`;
    }
    const left = freeFrom - sum;
    const pct = Math.max(6, Math.min(100, Math.round((sum / freeFrom) * 100)));
    return `<div class="cart-progress"><p>${t("basket.free_left", { amount: formatMoney(left) })}</p>
      <div class="cart-progress-bar"><span style="width:${pct}%"></span></div></div>`;
  }

  function renderFab() {
    const fab = document.getElementById("cart-fab");
    if (!fab) return;
    const lines = getLineItems();
    const count = itemCount(lines);
    const sum = subtotal(lines);
    document.body.classList.toggle("has-cart", lines.length > 0);
    if (!lines.length) {
      fab.hidden = true;
      return;
    }
    fab.hidden = false;
    fab.innerHTML = `<span class="cart-fab-icon" aria-hidden="true">🧺</span><span>${t("basket.fab", { count: formatQtyNumber(count), sum: formatMoney(sum) })}</span>`;
    fab.setAttribute("aria-label", t("basket.open"));
  }

  function renderDrawer() {
    const body = document.getElementById("cart-drawer-body");
    const foot = document.getElementById("cart-drawer-foot");
    const title = document.getElementById("cart-drawer-title");
    if (!body || !foot) return;
    const scroller = document.querySelector(".cart-drawer-scroll");
    const keepY = scroller ? scroller.scrollTop : 0;
    if (title) title.textContent = t("basket.title");
    const closeBtn = document.querySelector("[data-cart-close]");
    if (closeBtn) closeBtn.setAttribute("aria-label", t("basket.close"));

    const lines = getLineItems();
    if (!lines.length) {
      body.innerHTML = `<p class="cart-empty">${t("basket.empty")}</p>`;
      foot.innerHTML = "";
      if (scroller) scroller.scrollTop = keepY;
      return;
    }

    body.innerHTML = lines
      .map((line) => {
        const img = CasaMia.mediaUrl(line.product?.thumbnail || line.product?.images?.[0]);
        const warn = line.warning ? `<p class="cart-line-warn">${esc(warnText(line.warning))}</p>` : "";
        const v = variantAttrs(line.variantId);
        const qty = line.product ? formatQtyLabel(line.qty, line.product) : formatQtyNumber(line.qty);
        return `<article class="cart-line${line.warning ? " has-warn" : ""}">
          <img src="${esc(img)}" alt="" width="72" height="72" draggable="false">
          <div class="cart-line-main">
            <h3>${esc(lineName(line))}</h3>
            <p class="cart-line-price">${formatMoney(line.unitPrice)} · ${formatMoney(line.total)}</p>
          </div>
          <div class="cart-line-ops">
            <div class="cart-controls is-active" data-cart-controls="${esc(line.id)}"${v}>
              <button type="button" class="cart-step" data-cart-dec="${esc(line.id)}"${v} aria-label="${esc(t("basket.decrease"))}">−</button>
              <span class="cart-qty-val">${esc(qty)}</span>
              <button type="button" class="cart-step" data-cart-inc="${esc(line.id)}"${v} aria-label="${esc(t("basket.increase"))}">+</button>
            </div>
            <button type="button" class="cart-remove" data-cart-remove="${esc(line.id)}"${v} aria-label="${esc(t("basket.remove"))}">×</button>
          </div>
          ${warn}
        </article>`;
      })
      .join("");

    const checkout = readCheckout();
    body.insertAdjacentHTML("beforeend", `
      <div class="cart-contact">
        <label class="cart-field">
          <span>${esc(t("basket.checkout_name"))}</span>
          <input type="text" data-cart-name autocomplete="name" enterkeyhint="next" maxlength="80" placeholder="${esc(t("basket.name_ph"))}" value="${esc(checkout.name)}">
        </label>
        <label class="cart-field">
          <span>${esc(t("basket.checkout_area"))}</span>
          <input type="text" data-cart-area autocomplete="address-level2" enterkeyhint="next" maxlength="80" placeholder="${esc(t("basket.area_ph"))}" value="${esc(checkout.area)}">
        </label>
        <button type="button" class="cart-map-btn" data-cart-map>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.2"/></svg>
          ${esc(t("basket.map_pick"))}
        </button>
        <label class="cart-field">
          <span>${esc(t("basket.checkout_location"))}</span>
          <input class="allow-copy" type="text" data-cart-location data-copyable enterkeyhint="next" maxlength="240" placeholder="${esc(t("basket.location_ph"))}" value="${esc(checkout.location)}">
        </label>
        <div class="cart-field">
          <span>${esc(t("basket.checkout_date"))}</span>
          <div class="cart-date" data-cart-datebox>
            <button type="button" class="cart-date-btn" data-cart-date-toggle aria-expanded="false" aria-haspopup="dialog">
              <span data-cart-date-label></span>
            </button>
            <input type="hidden" data-cart-date value="${esc(checkout.date)}">
            <div class="cart-date-panel" data-cart-date-panel hidden></div>
          </div>
        </div>
      </div>`);
    paintDatePicker();

    const sum = subtotal(lines);
    const count = itemCount(lines);
    const minOrder = Number(cartSettings().minOrder);
    const minHtml = minOrder
      ? `<p class="cart-min">${t("basket.min_order", { amount: formatMoney(minOrder) })}${
          sum < minOrder ? ` · ${t("basket.min_order_left", { amount: formatMoney(minOrder - sum) })}` : ""
        }</p>`
      : "";

    foot.innerHTML = `
      ${progressHtml(sum)}
      <div class="cart-totals">
        <span>${t("basket.items_total", { count: formatQtyNumber(count) })}</span>
        <strong>${t("basket.sum_total", { sum: formatMoney(sum) })}</strong>
      </div>
      ${minHtml}
      <div class="cart-checkout">
        <button type="button" class="btn btn-wa cart-checkout-btn" data-cart-wa>${checkoutIcon("wa")}${t("basket.send_wa")}</button>
        <button type="button" class="btn btn-secondary cart-checkout-btn" data-cart-ig>${checkoutIcon("ig")}${t("basket.send_ig")}</button>
        <button type="button" class="btn btn-ghost cart-checkout-btn" data-cart-copy>${checkoutIcon("copy")}${t("basket.copy_order")}</button>
      </div>`;
    if (scroller) scroller.scrollTop = keepY;
  }

  function formatLastDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const loc = { ru: "ru-RU", ua: "uk-UA", tr: "tr-TR", en: "en-GB" }[CasaMia.getLang()] || "ru-RU";
    return d.toLocaleDateString(loc, { day: "numeric", month: "long" });
  }

  function renderHome() {
    const lastWrap = document.getElementById("last-order");
    if (lastWrap) {
      const last = readLastOrder();
      if (!last) {
        lastWrap.hidden = true;
        lastWrap.innerHTML = "";
      } else {
        lastWrap.hidden = false;
        const date = formatLastDate(last.date);
        lastWrap.innerHTML = `<div class="last-order-card">
          <div>
            <strong>${t("basket.repeat")}</strong>
            ${date ? `<span class="last-order-date">${esc(date)}</span>` : ""}
          </div>
          <button type="button" class="btn btn-primary" data-cart-repeat>${t("basket.repeat_btn")}</button>
        </div>`;
      }
    }

    const favBlock = document.getElementById("favorites-block");
    const favGrid = document.getElementById("favorites-grid");
    const favTitle = document.getElementById("favorites-title");
    if (favBlock && favGrid) {
      const ids = readFavs();
      const products = ids.map((id) => CasaMia.getProduct(id)).filter(Boolean);
      if (favTitle) favTitle.textContent = t("basket.favorites");
      if (!products.length) {
        favBlock.hidden = true;
        favGrid.innerHTML = "";
      } else {
        favBlock.hidden = false;
        favGrid.innerHTML = products
          .map((p, i) => CasaMia.productCard(p).replace(
            'class="product-card"',
            `class="product-card" style="animation-delay:${Math.min(i, 12) * 40}ms"`
          ))
          .join("");
      }
    }
  }

  function syncSheetHeight() {
    const h = window.visualViewport?.height || window.innerHeight;
    document.documentElement.style.setProperty("--cart-sheet-h", `${Math.round(h)}px`);
  }

  function openDrawer() {
    const overlay = document.getElementById("cart-overlay");
    const drawer = document.getElementById("cart-drawer");
    if (!drawer || !overlay) return;
    drawerOpen = true;
    syncSheetHeight();
    overlay.hidden = false;
    drawer.hidden = false;
    requestAnimationFrame(() => {
      overlay.classList.add("is-open");
      drawer.classList.add("is-open");
    });
    document.body.classList.add("cart-open");
    renderDrawer();
    drawer.querySelector("[data-cart-close]")?.focus({ preventScroll: true });
  }

  function closeDrawer() {
    const overlay = document.getElementById("cart-overlay");
    const drawer = document.getElementById("cart-drawer");
    if (!drawer || !overlay) return;
    drawerOpen = false;
    overlay.classList.remove("is-open");
    drawer.classList.remove("is-open");
    document.body.classList.remove("cart-open");
    datePicker.open = false;
    closeIgModal();
    closeMapModal();
    setTimeout(() => {
      if (!drawerOpen) {
        overlay.hidden = true;
        drawer.hidden = true;
      }
    }, 280);
  }

  async function copyOrderText() {
    const text = buildOrderText();
    if (!text) return false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      /* fallback below */
    }
    const ta = document.createElement("textarea");
    ta.className = "allow-copy";
    ta.setAttribute("data-copyable", "");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }

  async function checkoutWhatsApp() {
    const text = buildOrderText({ plain: !usesNativeMessenger() });
    if (!text) return;
    saveLastOrder();
    track("whatsapp-order");
    const phone = whatsappPhone();
    openExternal(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`);
    renderHome();
  }

  async function checkoutInstagram() {
    const text = buildOrderText();
    if (!text) return;
    const ok = await copyOrderText();
    if (!ok) toast("basket.copy_fail");
    track("instagram-order");
    openIgModal(ok);
  }

  function igModalEl() {
    return document.getElementById("cart-ig-modal");
  }

  function fillIgModal(copied) {
    const modal = igModalEl();
    if (!modal) return;
    const status = copied !== false;
    modal.innerHTML = `
      <div class="cart-ig-backdrop" data-cart-ig-close></div>
      <div class="cart-ig-dialog" role="dialog" aria-modal="true" aria-labelledby="cart-ig-title" aria-describedby="cart-ig-hint">
        <button type="button" class="cart-close cart-ig-x" data-cart-ig-close aria-label="${esc(t("basket.close"))}">×</button>
        <p class="cart-ig-kicker">${checkoutIcon("ig")}</p>
        <h3 id="cart-ig-title">${esc(t("basket.ig_title"))}</h3>
        <p id="cart-ig-hint" class="visually-hidden">${esc(t("basket.ig_hint"))}</p>
        <div class="cart-ig-status${status ? "" : " is-fail"}">
          <p><strong>${esc(status ? t("basket.ig_copied_ok") : t("basket.copy_fail"))}</strong></p>
          <p>${esc(t("basket.ig_soon"))}</p>
        </div>
        <p class="cart-ig-next">${esc(t("basket.ig_next"))}</p>
        <ol class="cart-ig-steps">
          <li>${esc(t("basket.ig_step1"))}</li>
          <li>${esc(t("basket.ig_step2"))}</li>
          <li>${esc(t("basket.ig_step3"))}</li>
        </ol>
        <button type="button" class="btn cart-checkout-btn btn-ig" data-cart-ig-open>
          ${checkoutIcon("ig")}${esc(t("basket.ig_open"))}
        </button>
      </div>`;
  }

  function openIgModal(copied) {
    const modal = igModalEl();
    if (!modal) return;
    igCopiedOk = copied !== false;
    fillIgModal(igCopiedOk);
    modal.hidden = false;
    requestAnimationFrame(() => modal.classList.add("is-open"));
    modal.querySelector("[data-cart-ig-open]")?.focus({ preventScroll: true });
  }

  function closeIgModal() {
    const modal = igModalEl();
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.hidden = true;
  }

  function mapModalEl() {
    return document.getElementById("cart-map-modal");
  }

  function loadLeaflet() {
    if (window.L?.map) return Promise.resolve(window.L);
    if (leafletPromise) return leafletPromise;
    leafletPromise = new Promise((resolve, reject) => {
      if (!document.querySelector("link[data-leaflet]")) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "css/vendor/leaflet.css";
        link.dataset.leaflet = "1";
        document.head.appendChild(link);
      }
      const script = document.createElement("script");
      script.src = "js/vendor/leaflet.js";
      script.async = true;
      script.onload = () => {
        if (window.L?.map) resolve(window.L);
        else reject(new Error("leaflet"));
      };
      script.onerror = () => {
        leafletPromise = null;
        reject(new Error("leaflet"));
      };
      document.head.appendChild(script);
    });
    return leafletPromise;
  }

  function resolveMapCenter() {
    return new Promise((resolve) => {
      const fallback = { ...KONYAALTI, zoom: 14 };
      if (!navigator.geolocation) {
        resolve(fallback);
        return;
      }
      let settled = false;
      const finish = (center) => {
        if (settled) return;
        settled = true;
        resolve(center);
      };
      const timer = window.setTimeout(() => finish(fallback), 4000);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          window.clearTimeout(timer);
          finish({ lat: pos.coords.latitude, lng: pos.coords.longitude, zoom: 16 });
        },
        () => {
          window.clearTimeout(timer);
          finish(fallback);
        },
        { enableHighAccuracy: true, timeout: 3500, maximumAge: 120000 }
      );
    });
  }

  function formatPlace(address) {
    if (!address || typeof address !== "object") return "";
    const road = [
      address.road,
      address.pedestrian,
      address.footway,
      address.residential,
      address.path
    ].map((part) => String(part || "").trim()).find(Boolean) || "";
    const house = String(address.house_number || "").trim();
    const street = [road, house].filter(Boolean).join(" ");
    const area = [
      address.neighbourhood,
      address.suburb,
      address.quarter,
      address.city_district,
      address.town,
      address.city || address.municipality
    ];
    const out = [];
    const push = (part) => {
      const text = String(part || "").trim();
      if (!text) return;
      if (out.some((item) => item.toLocaleLowerCase() === text.toLocaleLowerCase())) return;
      out.push(text);
    };
    push(street);
    area.forEach(push);
    return out.slice(0, 5).join(", ");
  }

  async function reverseLabel(lat, lng) {
    const lang = { ru: "ru", ua: "uk", tr: "tr", en: "en" }[CasaMia.getLang()] || "ru";
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1&accept-language=${encodeURIComponent(lang)}`;
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), 4000);
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: ctrl.signal
      });
      if (!res.ok) return "";
      const data = await res.json();
      return formatPlace(data.address);
    } catch {
      return "";
    } finally {
      window.clearTimeout(timer);
    }
  }

  function fillMapChrome() {
    const modal = mapModalEl();
    if (!modal) return;
    const title = modal.querySelector("#cart-map-title");
    const hint = modal.querySelector("#cart-map-hint");
    const save = modal.querySelector("[data-cart-map-save]");
    if (title) title.textContent = t("basket.map_title");
    if (hint) hint.textContent = t("basket.map_hint");
    if (save) save.textContent = t("basket.map_save");
    modal.querySelectorAll("[data-cart-map-close]").forEach((btn) => {
      if (btn.tagName === "BUTTON") btn.setAttribute("aria-label", t("basket.close"));
    });
  }

  function hideMapSave() {
    const save = document.querySelector("[data-cart-map-save]");
    if (!save) return;
    save.hidden = true;
    save.disabled = false;
  }

  function destroyMap() {
    if (mapPicker?.map) mapPicker.map.remove();
    mapPicker = null;
    const canvas = document.getElementById("cart-map-canvas");
    if (canvas) canvas.replaceChildren();
  }

  function closeMapModal() {
    mapSaveToken += 1;
    const modal = mapModalEl();
    if (modal) modal.hidden = true;
    destroyMap();
  }

  function placePin(latlng) {
    const L = window.L;
    if (!mapPicker?.map || !L) return;
    if (!mapPicker.marker) {
      const icon = L.divIcon({
        className: "cart-map-pin",
        html: "<span></span>",
        iconSize: [28, 36],
        iconAnchor: [14, 34]
      });
      mapPicker.marker = L.marker(latlng, { icon, keyboard: false }).addTo(mapPicker.map);
    } else {
      mapPicker.marker.setLatLng(latlng);
    }
    mapPicker.picked = { lat: latlng.lat, lng: latlng.lng };
    const save = document.querySelector("[data-cart-map-save]");
    if (save) {
      save.hidden = false;
      save.disabled = false;
    }
  }

  function initMap(L, center) {
    destroyMap();
    const canvas = document.getElementById("cart-map-canvas");
    if (!canvas) return;
    const map = L.map(canvas, { zoomControl: true, attributionControl: true }).setView(
      [center.lat, center.lng],
      center.zoom || 14
    );
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19
    }).addTo(map);
    map.on("click", (e) => placePin(e.latlng));
    mapPicker = { map, marker: null, picked: null, userMoved: false };
    map.on("dragstart", () => {
      if (mapPicker) mapPicker.userMoved = true;
    });
    const saved = parseMapUrl(readCheckout().locationUrl);
    if (saved) placePin(L.latLng(saved.lat, saved.lng));
    const fit = () => {
      if (mapPicker?.map === map) map.invalidateSize();
    };
    window.setTimeout(fit, 60);
    window.setTimeout(fit, 320);
  }

  async function openMapModal() {
    syncCheckoutFromDom();
    const saved = parseMapUrl(readCheckout().locationUrl);
    const centerPromise = saved ? null : resolveMapCenter();
    const modal = mapModalEl();
    if (!modal) return;
    modal.hidden = false;
    fillMapChrome();
    hideMapSave();
    modal.querySelector(".cart-map-dialog .cart-close")?.focus({ preventScroll: true });
    try {
      const L = await loadLeaflet();
      if (modal.hidden) return;
      initMap(L, saved ? { ...saved, zoom: 16 } : { ...KONYAALTI, zoom: 14 });
      if (!centerPromise) return;
      const center = await centerPromise;
      if (modal.hidden || !mapPicker?.map || mapPicker.picked || mapPicker.userMoved) return;
      mapPicker.map.setView([center.lat, center.lng], center.zoom || 14);
    } catch {
      toast("basket.map_fail");
      closeMapModal();
    }
  }

  async function saveMapPoint() {
    const picked = mapPicker?.picked;
    if (!picked) return;
    const url = mapsLink(picked.lat, picked.lng);
    if (!url) return;
    const token = ++mapSaveToken;
    const save = document.querySelector("[data-cart-map-save]");
    if (save) save.disabled = true;
    const label = await reverseLabel(picked.lat, picked.lng);
    if (token !== mapSaveToken) return;
    persistCheckout({
      location: label || `${picked.lat.toFixed(5)}, ${picked.lng.toFixed(5)}`,
      locationUrl: url
    });
    closeMapModal();
    renderDrawer();
    document.querySelector("[data-cart-location]")?.scrollIntoView({ block: "nearest" });
  }

  function confirmInstagram() {
    saveLastOrder();
    openExternal(instagramChatUrl());
    closeIgModal();
    renderHome();
  }

  async function copyOrder() {
    const ok = await copyOrderText();
    toast(ok ? "basket.copied" : "basket.copy_fail");
  }

  function datasetVariant(el) {
    return el?.dataset.variantId || "";
  }

  function onClick(e) {
    if (e.target.closest("[data-cart-date-prev]")) {
      e.preventDefault();
      shiftDateMonth(-1);
      return;
    }
    if (e.target.closest("[data-cart-date-next]")) {
      e.preventDefault();
      shiftDateMonth(1);
      return;
    }
    const picked = e.target.closest("[data-cart-date-pick]");
    if (picked && !picked.disabled) {
      e.preventDefault();
      const hidden = document.querySelector("#cart-drawer [data-cart-date]");
      if (hidden) hidden.value = picked.dataset.cartDatePick;
      persistCheckout({ date: picked.dataset.cartDatePick });
      datePicker.open = false;
      paintDatePicker();
      return;
    }
    if (e.target.closest("[data-cart-date-toggle]")) {
      e.preventDefault();
      if (datePicker.open) {
        datePicker.open = false;
        paintDatePicker();
      } else {
        openDatePicker();
      }
      return;
    }
    if (datePicker.open && !e.target.closest("[data-cart-datebox]")) {
      datePicker.open = false;
      paintDatePicker();
    }
    if (e.target.closest("[data-cart-map-save]")) {
      e.preventDefault();
      saveMapPoint();
      return;
    }
    if (e.target.closest("[data-cart-map-close]")) {
      e.preventDefault();
      closeMapModal();
      return;
    }
    if (e.target.closest("[data-cart-map]")) {
      e.preventDefault();
      openMapModal();
      return;
    }
    const add = e.target.closest("[data-cart-add]");
    if (add) {
      e.preventDefault();
      e.stopPropagation();
      addItem(add.dataset.cartAdd, datasetVariant(add));
      ping(add.dataset.cartAdd);
      toast("basket.added");
      return;
    }
    const inc = e.target.closest("[data-cart-inc]");
    if (inc) {
      e.preventDefault();
      addItem(inc.dataset.cartInc, datasetVariant(inc));
      toast("basket.qty_changed");
      return;
    }
    const dec = e.target.closest("[data-cart-dec]");
    if (dec) {
      e.preventDefault();
      const id = dec.dataset.cartDec;
      const variantId = datasetVariant(dec);
      const next = decItem(id, variantId);
      toast(next ? "basket.qty_changed" : "basket.removed");
      return;
    }
    const remove = e.target.closest("[data-cart-remove]");
    if (remove) {
      e.preventDefault();
      removeItem(remove.dataset.cartRemove, datasetVariant(remove));
      toast("basket.removed");
      return;
    }
    const fav = e.target.closest("[data-fav-toggle]");
    if (fav) {
      e.preventDefault();
      e.stopPropagation();
      toggleFavorite(fav.dataset.favToggle);
      return;
    }
    if (e.target.closest("[data-cart-ig-open]")) {
      e.preventDefault();
      confirmInstagram();
      return;
    }
    if (e.target.closest("[data-cart-ig-close]")) {
      e.preventDefault();
      closeIgModal();
      return;
    }
    if (e.target.closest("[data-cart-open]")) {
      e.preventDefault();
      openDrawer();
      return;
    }
    if (e.target.closest("[data-cart-close]") || e.target.id === "cart-overlay") {
      e.preventDefault();
      if (igModalEl() && !igModalEl().hidden) {
        closeIgModal();
        return;
      }
      closeDrawer();
      return;
    }
    if (e.target.closest("[data-cart-wa]")) {
      e.preventDefault();
      checkoutWhatsApp();
      return;
    }
    if (e.target.closest("[data-cart-ig]")) {
      e.preventDefault();
      checkoutInstagram();
      return;
    }
    if (e.target.closest("[data-cart-copy]")) {
      e.preventDefault();
      copyOrder();
      return;
    }
    if (e.target.closest("[data-cart-repeat]")) {
      e.preventDefault();
      if (restoreLastOrder()) {
        toast("basket.repeat_done");
        openDrawer();
      }
    }
  }

  function onKey(e) {
    if (e.key !== "Escape") return;
    if (datePicker.open) {
      datePicker.open = false;
      paintDatePicker();
      return;
    }
    const mapModal = mapModalEl();
    if (mapModal && !mapModal.hidden) {
      closeMapModal();
      return;
    }
    if (igModalEl() && !igModalEl().hidden) {
      closeIgModal();
      return;
    }
    if (drawerOpen) closeDrawer();
  }

  function onInput(e) {
    const name = e.target.closest?.("[data-cart-name]");
    if (name) {
      persistCheckout({ name: name.value });
      return;
    }
    const area = e.target.closest?.("[data-cart-area]");
    if (area) {
      persistCheckout({ area: area.value });
      return;
    }
    const location = e.target.closest?.("[data-cart-location]");
    if (location) {
      persistCheckout({
        location: location.value,
        ...(location.value.trim() ? {} : { locationUrl: "" })
      });
      return;
    }
    const date = e.target.closest?.("[data-cart-date]");
    if (date) persistCheckout({ date: date.value });
  }

  function ensureUi() {
    if (document.getElementById("cart-fab")) return;
    const overlay = document.createElement("div");
    overlay.id = "cart-overlay";
    overlay.className = "cart-overlay";
    overlay.hidden = true;

    const drawer = document.createElement("aside");
    drawer.id = "cart-drawer";
    drawer.className = "cart-drawer";
    drawer.setAttribute("role", "dialog");
    drawer.setAttribute("aria-modal", "true");
    drawer.setAttribute("aria-labelledby", "cart-drawer-title");
    drawer.hidden = true;
    drawer.innerHTML = `
      <div class="cart-drawer-head">
        <h2 id="cart-drawer-title"></h2>
        <button type="button" class="cart-close" data-cart-close aria-label="">×</button>
      </div>
      <div class="cart-drawer-scroll">
        <div class="cart-drawer-body" id="cart-drawer-body"></div>
        <div class="cart-drawer-foot" id="cart-drawer-foot"></div>
      </div>`;

    const fab = document.createElement("button");
    fab.type = "button";
    fab.id = "cart-fab";
    fab.className = "cart-fab";
    fab.setAttribute("data-cart-open", "");
    fab.hidden = true;

    const toasts = document.createElement("div");
    toasts.id = "cart-toasts";
    toasts.className = "cart-toasts";
    toasts.setAttribute("aria-live", "polite");
    toasts.setAttribute("aria-atomic", "true");

    const igModal = document.createElement("div");
    igModal.id = "cart-ig-modal";
    igModal.className = "cart-ig-modal";
    igModal.hidden = true;

    const mapModal = document.createElement("div");
    mapModal.id = "cart-map-modal";
    mapModal.className = "cart-map-modal";
    mapModal.hidden = true;
    mapModal.innerHTML = `
      <div class="cart-map-backdrop" data-cart-map-close></div>
      <div class="cart-map-dialog" role="dialog" aria-modal="true" aria-labelledby="cart-map-title">
        <div class="cart-map-head">
          <h3 id="cart-map-title"></h3>
          <button type="button" class="cart-close" data-cart-map-close aria-label="">×</button>
        </div>
        <p class="cart-map-hint" id="cart-map-hint"></p>
        <div id="cart-map-canvas" class="cart-map-canvas"></div>
        <div class="cart-map-actions">
          <button type="button" class="btn btn-primary cart-map-save" data-cart-map-save hidden></button>
        </div>
      </div>`;

    document.body.append(overlay, drawer, fab, toasts, igModal, mapModal);
  }

  function renderAll() {
    renderFab();
    if (drawerOpen) renderDrawer();
    const ig = igModalEl();
    if (ig && !ig.hidden) fillIgModal(igCopiedOk);
    const mapModal = mapModalEl();
    if (mapModal && !mapModal.hidden) fillMapChrome();
    refreshControls();
  }

  function mount() {
    ensureUi();
    if (!bound) {
      document.addEventListener("click", onClick);
      document.addEventListener("input", onInput);
      document.addEventListener("change", onInput);
      document.addEventListener("keydown", onKey);
      document.addEventListener("casamia:cart", renderAll);
      document.addEventListener("casamia:favorites", () => {
        renderHome();
        refreshControls();
      });
      document.addEventListener("casamia:lang", () => {
        renderAll();
        renderHome();
      });
      window.addEventListener("resize", syncSheetHeight);
      window.visualViewport?.addEventListener("resize", syncSheetHeight);
      window.visualViewport?.addEventListener("scroll", syncSheetHeight);
      bound = true;
    }
    syncSheetHeight();
    renderAll();
    renderHome();
  }

  return {
    mount,
    controlsHtml,
    favBtnHtml,
    getQty,
    addItem,
    setQty,
    removeItem,
    clearCart,
    getSnapshot,
    getLineItems,
    buildOrderText,
    isFavorite,
    toggleFavorite,
    openDrawer,
    closeDrawer,
    getQtyConfig,
    formatQty,
    formatMoney
  };
})();

window.CasaMiaCart = CasaMiaCart;
