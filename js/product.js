async function initProductPage() {
  await CasaMia.loadData();
  CasaMia.bindHeader();

  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  const root = document.getElementById("product-root");
  const product = CasaMia.getProduct(id);

  if (!product || product.available === false) {
    root.innerHTML = `<p>${CasaMia.t("not_found")}</p><a class="btn btn-secondary" href="index.html#menu">${CasaMia.t("back_menu")}</a>`;
    return;
  }

  let activeVariant = product.variants?.[0] || null;
  render(product, activeVariant);

  document.addEventListener("casamia:lang", () => render(product, activeVariant));

  function render(p, variant) {
    document.title = `${CasaMia.localized(p.name)} — Casa Mia`;
    const img = CasaMia.mediaUrl(p.thumbnail || p.images?.[0]);
    const variantsHtml = p.variants?.length
      ? `<div>
          <strong style="font-size:.8rem;letter-spacing:.06em;text-transform:uppercase;color:var(--terracotta)">${CasaMia.t("choose_size")}</strong>
          <div class="variants">
            ${p.variants
              .map(
                (v) =>
                  `<button type="button" class="variant-btn ${variant?.id === v.id ? "active" : ""}" data-vid="${v.id}">${CasaMia.localized(v.label)} · ${v.price} ₺</button>`
              )
              .join("")}
          </div>
        </div>`
      : "";

    root.innerHTML = `
      <a class="back-link" href="index.html#menu">← ${CasaMia.t("back_menu")}</a>
      <div class="product-layout">
        <div class="product-gallery">
          <img src="${img}" alt="${CasaMia.localized(p.name)}" width="800" height="800" draggable="false">
        </div>
        <div class="product-info">
          ${CasaMia.badgeHtml(p)}
          <h1>${CasaMia.localized(p.name)}</h1>
          <p class="desc">${CasaMia.localized(p.description)}</p>
          ${variantsHtml}
          <div class="price" style="font-size:1.6rem;margin:.4rem 0">${CasaMia.formatPrice(p, variant)}</div>
          <div class="weight" style="margin-bottom:1rem">${CasaMia.formatWeight(p, variant)}</div>
          <div class="btn-row">
            <a class="btn btn-wa" href="${CasaMia.orderLink(p, variant)}" target="_blank" rel="noopener">${CasaMia.t("order_more")}</a>
            <a class="btn btn-secondary" data-ig href="${CasaMia.igLink()}" target="_blank" rel="noopener">${CasaMia.t("cta_ig")}</a>
          </div>
          <div class="product-facts">
            <div class="fact"><strong>${CasaMia.t("ingredients")}</strong>${CasaMia.localized(p.ingredients)}</div>
            <div class="fact"><strong>${CasaMia.t("how_cook")}</strong>${CasaMia.localized(p.cook)}</div>
            ${CasaMia.localized(p.serveWith) ? `<div class="fact"><strong>${CasaMia.t("serve")}</strong>${CasaMia.localized(p.serveWith)}</div>` : ""}
          </div>
        </div>
      </div>`;

    root.querySelectorAll(".variant-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeVariant = p.variants.find((v) => v.id === btn.dataset.vid);
        render(p, activeVariant);
      });
    });
  }
}

document.addEventListener("DOMContentLoaded", initProductPage);
