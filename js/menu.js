/* Catalog filters & hits on landing */
async function initMenu() {
  await CasaMia.loadData();
  CasaMia.bindHeader();
  renderStaticBlocks();
  renderFilters();
  renderHits();
  renderCatalog("all");

  document.addEventListener("casamia:lang", () => {
    renderStaticBlocks();
    renderFilters(currentCategory);
    renderHits();
    renderCatalog(currentCategory);
  });
}

let currentCategory = "all";

function renderFilters(active = "all") {
  currentCategory = active;
  const wrap = document.getElementById("filters");
  if (!wrap) return;
  const cats = CasaMia.getCategories();
  wrap.innerHTML = [
    `<button class="filter-btn ${active === "all" ? "active" : ""}" data-cat="all">${CasaMia.t("all")}</button>`,
    ...cats.map(
      (c) =>
        `<button class="filter-btn ${active === c.id ? "active" : ""}" data-cat="${c.id}"><span class="cat-dot" style="background:${c.color || "var(--olive)"}"></span>${c.emoji || ""} ${CasaMia.localized(c.name)}</button>`
    )
  ].join("");
  wrap.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      renderFilters(btn.dataset.cat);
      renderCatalog(btn.dataset.cat);
    });
  });
}

function renderCatalog(categoryId) {
  const grid = document.getElementById("product-grid");
  if (!grid) return;
  let list = CasaMia.visibleProducts();
  if (categoryId && categoryId !== "all") {
    list = list.filter((p) => p.categoryId === categoryId);
  }
  grid.innerHTML = list.map((p, i) => {
    const card = CasaMia.productCard(p);
    return card.replace('class="product-card"', `class="product-card" style="animation-delay:${Math.min(i, 12) * 40}ms"`);
  }).join("");
}

function renderHits() {
  const wrap = document.getElementById("hits");
  if (!wrap) return;
  const hits = CasaMia.visibleProducts().filter((p) => p.badges?.hit).slice(0, 6);
  wrap.innerHTML = hits
    .map((p) => {
      const img = CasaMia.mediaUrl(p.thumbnail || p.images?.[0]);
      return `<a class="hit-item" href="product.html?id=${encodeURIComponent(p.id)}">
        <img src="${img}" alt="" width="56" height="56" loading="lazy" draggable="false">
        <div>
          <strong>${CasaMia.localized(p.name)}</strong>
          <span class="price">${CasaMia.formatPrice(p)}</span>
        </div>
      </a>`;
    })
    .join("");
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
  if (aboutText) aboutText.innerHTML = CasaMia.localized(settings.about.text).replace(/\n\n/g, "<br><br>");
  if (aboutClosing) aboutClosing.textContent = CasaMia.localized(settings.about.closing);
  if (heroTagline) {
    heroTagline.textContent = CasaMia.localized(settings.hero?.subtitle || settings.brand?.tagline);
  }

  const heroTitle = document.querySelector(".hero h1");
  if (heroTitle && settings.hero?.title) {
    heroTitle.textContent = CasaMia.localized(settings.hero.title);
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

  const reviews = document.getElementById("reviews-list");
  if (reviews) {
    const list = CasaMia.getReviews() || [];
    reviews.innerHTML = list
      .map((r) => {
        const stars = "★".repeat(Math.min(5, Number(r.rating) || 5));
        const photo = r.photo
          ? `<img class="review-photo" src="${r.photo}" alt="" width="48" height="48" draggable="false">`
          : "";
        return `<article class="review-card">
        ${photo}
        <div class="stars" aria-label="${r.rating || 5}">${stars}</div>
        <p>«${CasaMia.localized(r.text)}»</p>
        <div class="name">${r.name}</div>
      </article>`;
      })
      .join("");
  }

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

function iconSvg(name) {
  const common = 'width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"';
  if (name === "hand") return `<svg ${common}><path d="M8 13V7a1 1 0 0 1 2 0v4m2-2V5a1 1 0 0 1 2 0v6m2-1V8a1 1 0 1 1 2 0v7a5 5 0 0 1-5 5H10a5 5 0 0 1-4.5-2.7L4 14.5a1.5 1.5 0 0 1 2.6-1.5L8 15"/></svg>`;
  if (name === "leaf") return `<svg ${common}><path d="M5 19c8 0 12-6 14-14-8 2-14 6-14 14z"/><path d="M5 19c2-4 6-7 11-9"/></svg>`;
  if (name === "freeze") return `<svg ${common}><path d="M12 2v20M5 6l14 12M19 6 5 18M4 12h16"/></svg>`;
  return `<svg ${common}><path d="M3 7h13l2 4h3v6h-2a2 2 0 1 1-4 0H9a2 2 0 1 1-4 0H3V7z"/><path d="M16 7V5H8"/></svg>`;
}

document.addEventListener("DOMContentLoaded", initMenu);
