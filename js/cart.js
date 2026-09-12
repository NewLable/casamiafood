/**
 * Casa Mia cart — localStorage basket, drawer, WhatsApp / Instagram / copy.
 * UI copy comes from CasaMia.t("basket.*"). Product data from products.json.
 */
const CasaMiaCart = (() => {
  const CART_KEY = "casamia_cart";
  const FAV_KEY = "casamia_favorites";
  const LAST_KEY = "casamia_lastOrder";

  const QTY_PRESETS = {
    package: { type: "package", step: 1, min: 1, unitKey: "basket.unit_package" },
    piece: { type: "piece", step: 1, min: 1, unitKey: "basket.unit_piece" },
    kg: { type: "kg", step: 0.5, min: 0.5, unitKey: "basket.unit_kg" },
    gram: { type: "gram", step: 100, min: 100, unitKey: "basket.unit_gram" }
  };

  let drawerOpen = false;
  let bound = false;
  let bounceTimer = 0;

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

  function instagramUrl() {
    const s = CasaMia.getSettings() || {};
    const user = (cartSettings().instagram || s.contacts?.instagram || "").replace(/^@/, "");
    if (cartSettings().instagram && user) return `https://instagram.com/${user}`;
    return s.contacts?.instagramUrl || (user ? `https://instagram.com/${user}` : "https://instagram.com/casa_mia_antalya");
  }

  function lineName(line) {
    if (!line.product) return line.id;
    let name = CasaMia.localized(line.product.name);
    if (line.variant) name += ` (${CasaMia.localized(line.variant.label)})`;
    return name;
  }

  function buildOrderText() {
    const lines = getLineItems().filter((line) => line.product);
    if (!lines.length) return "";
    const greeting = CasaMia.localized(cartSettings().greeting) || t("basket.greeting");
    const body = lines
      .map((line) => {
        const emoji = line.category?.emoji || "•";
        const qty = formatQty(line.qty, line.product);
        return `${emoji} ${lineName(line)} — ${qty} × ${formatMoney(line.unitPrice)} = ${formatMoney(line.total)}`;
      })
      .join("\n");
    const fields = CasaMia.localized(cartSettings().fields) ||
      `${t("basket.field_name")}\n${t("basket.field_area")}\n${t("basket.field_time")}`;
    const totalLine = `${t("basket.total")}: ${formatMoney(subtotal(lines))}`;
    return `${greeting}\n\n${body}\n\n————————————\n${totalLine}\n\n${fields}`;
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
    const el = document.createElement("div");
    el.className = "cart-toast";
    el.textContent = t(key);
    wrap.appendChild(el);
    setTimeout(() => el.remove(), 2800);
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
    if (title) title.textContent = t("basket.title");
    const closeBtn = document.querySelector("[data-cart-close]");
    if (closeBtn) closeBtn.setAttribute("aria-label", t("basket.close"));

    const lines = getLineItems();
    if (!lines.length) {
      body.innerHTML = `<p class="cart-empty">${t("basket.empty")}</p>`;
      foot.innerHTML = "";
      return;
    }

    body.innerHTML = lines
      .map((line) => {
        const img = CasaMia.mediaUrl(line.product?.thumbnail || line.product?.images?.[0]);
        const warn = line.warning ? `<p class="cart-line-warn">${esc(warnText(line.warning))}</p>` : "";
        const v = variantAttrs(line.variantId);
        const qty = line.product ? formatQtyLabel(line.qty, line.product) : formatQtyNumber(line.qty);
        return `<article class="cart-line${line.warning ? " has-warn" : ""}">
          <img src="${esc(img)}" alt="" width="48" height="48" draggable="false">
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
        <button type="button" class="btn btn-wa cart-checkout-btn" data-cart-wa>${t("basket.send_wa")}</button>
        <button type="button" class="btn btn-secondary cart-checkout-btn" data-cart-ig>${t("basket.send_ig")}</button>
        <button type="button" class="btn btn-ghost cart-checkout-btn" data-cart-copy>${t("basket.copy_order")}</button>
      </div>`;
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

  function openDrawer() {
    const overlay = document.getElementById("cart-overlay");
    const drawer = document.getElementById("cart-drawer");
    if (!drawer || !overlay) return;
    drawerOpen = true;
    overlay.hidden = false;
    drawer.hidden = false;
    requestAnimationFrame(() => {
      overlay.classList.add("is-open");
      drawer.classList.add("is-open");
    });
    document.body.classList.add("cart-open");
    renderDrawer();
    drawer.querySelector("[data-cart-close]")?.focus();
  }

  function closeDrawer() {
    const overlay = document.getElementById("cart-overlay");
    const drawer = document.getElementById("cart-drawer");
    if (!drawer || !overlay) return;
    drawerOpen = false;
    overlay.classList.remove("is-open");
    drawer.classList.remove("is-open");
    document.body.classList.remove("cart-open");
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
    const text = buildOrderText();
    if (!text) return;
    saveLastOrder();
    const phone = whatsappPhone();
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
    renderHome();
  }

  async function checkoutInstagram() {
    const ok = await copyOrderText();
    toast(ok ? "basket.ig_copied" : "basket.copy_fail");
    setTimeout(() => {
      window.open(instagramUrl(), "_blank", "noopener");
    }, 350);
  }

  async function copyOrder() {
    const ok = await copyOrderText();
    toast(ok ? "basket.copied" : "basket.copy_fail");
  }

  function datasetVariant(el) {
    return el?.dataset.variantId || "";
  }

  function onClick(e) {
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
    if (e.target.closest("[data-cart-open]")) {
      e.preventDefault();
      openDrawer();
      return;
    }
    if (e.target.closest("[data-cart-close]") || e.target.id === "cart-overlay") {
      e.preventDefault();
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
    if (e.key === "Escape" && drawerOpen) closeDrawer();
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
      <div class="cart-drawer-body" id="cart-drawer-body"></div>
      <div class="cart-drawer-foot" id="cart-drawer-foot"></div>`;

    const fab = document.createElement("button");
    fab.type = "button";
    fab.id = "cart-fab";
    fab.className = "cart-fab";
    fab.setAttribute("data-cart-open", "");
    fab.hidden = true;

    const toasts = document.createElement("div");
    toasts.id = "cart-toasts";
    toasts.className = "cart-toasts";

    document.body.append(overlay, drawer, fab, toasts);
  }

  function renderAll() {
    renderFab();
    if (drawerOpen) renderDrawer();
    refreshControls();
    renderHome();
  }

  function mount() {
    ensureUi();
    if (!bound) {
      document.addEventListener("click", onClick);
      document.addEventListener("keydown", onKey);
      document.addEventListener("casamia:cart", renderAll);
      document.addEventListener("casamia:favorites", renderAll);
      document.addEventListener("casamia:lang", renderAll);
      bound = true;
    }
    renderAll();
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
