/* Shared app utilities: i18n, data loading, WhatsApp links */
const CasaMia = (() => {
  const LANG_KEY = "casamia_lang";
  const SUPPORTED = ["ru", "ua", "tr", "en"];

  const UI = {
    nav_home: { ru: "Главная", ua: "Головна", tr: "Ana sayfa", en: "Home" },
    nav_menu: { ru: "Меню", ua: "Меню", tr: "Menü", en: "Menu" },
    nav_why: { ru: "Почему мы", ua: "Чому ми", tr: "Neden biz", en: "Why us" },
    nav_cook: { ru: "Как готовить", ua: "Як готувати", tr: "Nasıl pişirilir", en: "How to cook" },
    nav_about: { ru: "О нас", ua: "Про нас", tr: "Hakkımızda", en: "About" },
    nav_delivery: { ru: "Доставка", ua: "Доставка", tr: "Teslimat", en: "Delivery" },
    nav_reviews: { ru: "Отзывы", ua: "Відгуки", tr: "Yorumlar", en: "Reviews" },
    nav_contacts: { ru: "Контакты", ua: "Контакти", tr: "İletişim", en: "Contacts" },
    hero_lead: {
      ru: "Home food with love for your table.",
      ua: "Домашня їжа з любов'ю до вашого столу.",
      tr: "Sevgiyle ev yemeği sofranıza.",
      en: "Home food with love for your table."
    },
    hero_p1: { ru: "Натуральные ингредиенты", ua: "Натуральні інгредієнти", tr: "Doğal malzemeler", en: "Natural ingredients" },
    hero_p2: { ru: "Ручная лепка", ua: "Ручне ліплення", tr: "El yapımı", en: "Handmade" },
    hero_p3: { ru: "Шоковая заморозка", ua: "Шокове заморожування", tr: "Şok dondurma", en: "Flash freezing" },
    hero_p4: { ru: "Доставка по Анталии", ua: "Доставка Анталією", tr: "Antalya teslimatı", en: "Delivery in Antalya" },
    cta_wa: { ru: "Написать в WhatsApp", ua: "Написати в WhatsApp", tr: "WhatsApp'tan yazın", en: "Message on WhatsApp" },
    cta_ig: { ru: "Мы в Instagram", ua: "Ми в Instagram", tr: "Instagram'dayız", en: "We're on Instagram" },
    seal: { ru: "Made with love", ua: "З любов'ю", tr: "Sevgiyle", en: "Made with love" },
    menu_title: { ru: "Меню", ua: "Меню", tr: "Menü", en: "Menu" },
    menu_sub: {
      ru: "Актуальный прайс — листайте как каталог.",
      ua: "Актуальний прайс — гортайте як каталог.",
      tr: "Güncel fiyat listesi — katalog gibi gezinin.",
      en: "Current price list — browse like a catalog."
    },
    hits_title: { ru: "Хиты недели", ua: "Хіти тижня", tr: "Haftanın hitleri", en: "Weekly hits" },
    all: { ru: "Все", ua: "Усі", tr: "Tümü", en: "All" },
    why_title: { ru: "Почему Casa Mia?", ua: "Чому Casa Mia?", tr: "Neden Casa Mia?", en: "Why Casa Mia?" },
    cook_title: { ru: "Как готовить?", ua: "Як готувати?", tr: "Nasıl pişirilir?", en: "How to cook?" },
    cook_sub: {
      ru: "Просто и быстро — для замороженных продуктов.",
      ua: "Просто й швидко — для заморожених продуктів.",
      tr: "Dondurulmuş ürünler için basit ve hızlı.",
      en: "Simple and fast — for frozen products."
    },
    delivery_title: { ru: "Доставка по Анталии", ua: "Доставка Анталією", tr: "Antalya teslimatı", en: "Delivery in Antalya" },
    delivery_cost: { ru: "Стоимость", ua: "Вартість", tr: "Ücret", en: "Cost" },
    areas: { ru: "Районы", ua: "Райони", tr: "Semtler", en: "Areas" },
    hours: { ru: "Время", ua: "Час", tr: "Saatler", en: "Hours" },
    payment: { ru: "Оплата", ua: "Оплата", tr: "Ödeme", en: "Payment" },
    reviews_title: { ru: "Спасибо, что выбираете нас", ua: "Дякуємо, що обираєте нас", tr: "Bizi seçtiğiniz için teşekkürler", en: "Thank you for choosing us" },
    contacts_title: { ru: "Есть вопросы или хотите заказать?", ua: "Є питання чи хочете замовити?", tr: "Sorunuz veya siparişiniz mi var?", en: "Questions or ready to order?" },
    contacts_sub: {
      ru: "Напишите в WhatsApp или Instagram — отправим актуальное меню и оформим доставку.",
      ua: "Напишіть у WhatsApp або Instagram — надішлемо актуальне меню й оформимо доставку.",
      tr: "WhatsApp veya Instagram'dan yazın — güncel menüyü gönderelim, teslimatı ayarlayalım.",
      en: "Message us on WhatsApp or Instagram — we'll send the menu and arrange delivery."
    },
    thanks: { ru: "Спасибо, что вы с нами!", ua: "Дякуємо, що ви з нами!", tr: "Bizimle olduğunuz için teşekkürler!", en: "Thanks for being with us!" },
    ingredients: { ru: "Состав", ua: "Склад", tr: "İçindekiler", en: "Ingredients" },
    how_cook: { ru: "Как приготовить", ua: "Як приготувати", tr: "Nasıl pişirilir", en: "How to cook" },
    serve: { ru: "С чем подавать", ua: "З чим подавати", tr: "Ne ile servis", en: "Serve with" },
    order_more: { ru: "Заказать ещё", ua: "Замовити ще", tr: "Tekrar sipariş", en: "Order again" },
    back_menu: { ru: "К меню", ua: "До меню", tr: "Menüye dön", en: "Back to menu" },
    hit: { ru: "Хит", ua: "Хіт", tr: "Hit", en: "Hit" },
    new: { ru: "Новинка", ua: "Новинка", tr: "Yeni", en: "New" },
    sale: { ru: "Акция", ua: "Акція", tr: "İndirim", en: "Sale" },
    soldout: { ru: "Нет в наличии", ua: "Немає в наявності", tr: "Stokta yok", en: "Sold out" },
    per_kg: { ru: "/кг", ua: "/кг", tr: "/kg", en: "/kg" },
    order_msg: {
      ru: "Здравствуйте! Хочу заказать: {name}",
      ua: "Вітаю! Хочу замовити: {name}",
      tr: "Merhaba! Sipariş vermek istiyorum: {name}",
      en: "Hello! I'd like to order: {name}"
    },
    general_msg: {
      ru: "Здравствуйте! Хочу посмотреть меню и оформить доставку.",
      ua: "Вітаю! Хочу подивитися меню й оформити доставку.",
      tr: "Merhaba! Menüyü görmek ve teslimat ayarlamak istiyorum.",
      en: "Hello! I'd like to see the menu and arrange delivery."
    },
    not_found: { ru: "Товар не найден", ua: "Товар не знайдено", tr: "Ürün bulunamadı", en: "Product not found" },
    weight: { ru: "Вес / объём", ua: "Вага / об'єм", tr: "Ağırlık / hacim", en: "Weight / volume" },
    price: { ru: "Цена", ua: "Ціна", tr: "Fiyat", en: "Price" },
    choose_size: { ru: "Выберите вариант", ua: "Оберіть варіант", tr: "Boyut seçin", en: "Choose option" }
  };

  let lang = localStorage.getItem(LANG_KEY) || "ru";
  if (!SUPPORTED.includes(lang)) lang = "ru";

  let products = [];
  let categories = [];
  let settings = null;
  let reviews = [];

  function t(key) {
    const row = UI[key];
    if (!row) return key;
    return row[lang] || row.ru || key;
  }

  function localized(obj) {
    if (!obj) return "";
    if (typeof obj === "string") return obj;
    return obj[lang] || obj.ru || "";
  }

  function setLang(next) {
    if (!SUPPORTED.includes(next)) return;
    lang = next;
    localStorage.setItem(LANG_KEY, lang);
    document.documentElement.lang = lang === "ua" ? "uk" : lang;
    applyStaticI18n();
    document.dispatchEvent(new CustomEvent("casamia:lang", { detail: { lang } }));
  }

  function applyStaticI18n() {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll(".lang-switch button").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.lang === lang);
    });
  }

  function formatPrice(product, variant) {
    const price = variant ? variant.price : product.price;
    const unit = product.priceUnit;
    const suffix = unit === "kg" ? ` ${t("per_kg")}` : "";
    return `${price} ₺${suffix}`;
  }

  function formatWeight(product, variant) {
    const w = variant ? variant.weight : product.weight;
    const u = product.weightUnit || "g";
    if (u === "pcs") return `${w} ${lang === "en" ? "pcs" : lang === "tr" ? "adet" : "шт"}`;
    if (u === "box") return lang === "en" ? "box" : lang === "tr" ? "kutu" : "коробочка";
    if (u === "ml") return `${(w / 1000).toString().replace(".", ",")} л`;
    if (w >= 1000 && u === "g") return `${w / 1000} кг`;
    return `${w} ${u === "g" ? "г" : u}`;
  }

  function waLink(message) {
    const phone = (settings?.contacts?.whatsapp || "").replace(/\D/g, "");
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }

  function orderLink(product, variant) {
    let name = localized(product.name);
    if (variant) name += ` (${localized(variant.label)})`;
    const msg = t("order_msg").replace("{name}", name);
    return waLink(msg);
  }

  function igLink() {
    return settings?.contacts?.instagramUrl || "https://instagram.com/casa_mia_antalya";
  }

  function mediaUrl(path) {
    const fallback = "images/brand/card.png";
    if (!path) return fallback;
    return String(path)
      .split("/")
      .map((part) => encodeURIComponent(part))
      .join("/");
  }

  async function loadData() {
    const base = document.body.dataset.base || "";
    const [p, c, s, revRes] = await Promise.all([
      fetch(`${base}data/products.json`).then((r) => r.json()),
      fetch(`${base}data/categories.json`).then((r) => r.json()),
      fetch(`${base}data/settings.json`).then((r) => r.json()),
      fetch(`${base}data/reviews.json`).then((r) => (r.ok ? r.json() : [])).catch(() => [])
    ]);
    products = p.sort((a, b) => a.order - b.order);
    categories = c.sort((a, b) => a.order - b.order);
    settings = s;
    reviews = (Array.isArray(revRes) && revRes.length ? revRes : s.reviews || [])
      .filter((item) => item.visible !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    if (!localStorage.getItem(LANG_KEY) && s.defaultLang) {
      lang = s.defaultLang;
    }
    return { products, categories, settings, reviews };
  }

  function enabledCategories() {
    return categories.filter((c) => c.enabled !== false);
  }

  function visibleProducts() {
    const enabled = new Set(enabledCategories().map((cat) => cat.id));
    return products.filter((p) => p.available !== false && enabled.has(p.categoryId));
  }

  function getProduct(id) {
    return products.find((p) => p.id === id);
  }

  function badgeHtml(product) {
    const parts = [];
    if (product.badges?.hit) parts.push(`<span class="badge">${t("hit")}</span>`);
    if (product.badges?.new) parts.push(`<span class="badge new">${t("new")}</span>`);
    if (product.badges?.sale) parts.push(`<span class="badge sale">${t("sale")}</span>`);
    if (product.inStock === false) parts.push(`<span class="badge sale">${t("soldout")}</span>`);
    return parts.length ? `<div class="badges">${parts.join("")}</div>` : "";
  }

  function productCard(product) {
    const href = `product.html?id=${encodeURIComponent(product.id)}`;
    const img = mediaUrl(product.thumbnail || product.images?.[0]);
    return `
      <article class="product-card">
        <a class="thumb" href="${href}">
          ${badgeHtml(product)}
          <img src="${img}" alt="${localized(product.name)}" loading="lazy" width="400" height="400" draggable="false">
        </a>
        <div class="body">
          <a href="${href}"><h3>${localized(product.name)}</h3></a>
          <p class="desc">${localized(product.description)}</p>
          <div class="product-meta">
            <div>
              <div class="price">${formatPrice(product)}${product.priceUnit === "kg" ? "" : ""}<small></small></div>
              <div class="weight">${formatWeight(product)}</div>
            </div>
            <a class="wa-mini" href="${orderLink(product)}" aria-label="WhatsApp" target="_blank" rel="noopener">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.5 3.5A11 11 0 0 0 3.2 17.7L2 22l4.4-1.1A11 11 0 1 0 20.5 3.5zm-8.5 17a9 9 0 0 1-4.6-1.3l-.3-.2-2.6.7.7-2.5-.2-.3A9 9 0 1 1 12 20.5zm5.2-6.7c-.3-.1-1.6-.8-1.8-.9s-.4-.1-.6.1-.7.9-.8 1-.3.2-.6.1a7.4 7.4 0 0 1-2.2-1.4 8.2 8.2 0 0 1-1.5-1.9c-.2-.3 0-.4.1-.6l.4-.5.3-.4c.1-.2 0-.4 0-.5l-.9-2.1c-.2-.5-.5-.5-.6-.5h-.5c-.2 0-.5.1-.7.3s-1 1-1 2.4 1 2.8 1.2 3 2 3.1 4.9 4.2c.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.6-.1 1.6-.7 1.8-1.3.2-.6.2-1.2.1-1.3-.1-.1-.3-.2-.6-.3z"/></svg>
            </a>
          </div>
        </div>
      </article>`;
  }

  function bindHeader() {
    const toggle = document.querySelector(".menu-toggle");
    const mobile = document.querySelector(".nav-mobile");
    toggle?.addEventListener("click", () => mobile?.classList.toggle("open"));
    mobile?.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => mobile.classList.remove("open"))
    );
    document.querySelectorAll(".lang-switch button").forEach((btn) => {
      btn.addEventListener("click", () => setLang(btn.dataset.lang));
    });
    document.querySelectorAll("[data-wa-general]").forEach((el) => {
      el.href = waLink(t("general_msg"));
    });
    document.querySelectorAll("[data-ig]").forEach((el) => {
      el.href = igLink();
    });
    applyStaticI18n();
  }

  function refreshLinks() {
    document.querySelectorAll("[data-wa-general]").forEach((el) => {
      el.href = waLink(t("general_msg"));
    });
  }

  document.addEventListener("casamia:lang", refreshLinks);

  function protectPublicContent() {
    const allowed = (el) =>
      el?.closest?.(".allow-copy, [data-copyable], input, textarea, [contenteditable='true']");

    const stopUnlessAllowed = (e) => {
      if (allowed(e.target)) return;
      e.preventDefault();
    };

    document.addEventListener("contextmenu", stopUnlessAllowed, true);
    document.addEventListener("copy", stopUnlessAllowed, true);
    document.addEventListener("cut", stopUnlessAllowed, true);
    document.addEventListener("selectstart", stopUnlessAllowed, true);
    document.addEventListener(
      "dragstart",
      (e) => {
        if (allowed(e.target)) return;
        e.preventDefault();
      },
      true
    );

    const lockImg = (img) => {
      img.draggable = false;
      img.setAttribute("draggable", "false");
    };

    document.querySelectorAll("img").forEach(lockImg);
    new MutationObserver((records) => {
      for (const rec of records) {
        rec.addedNodes.forEach((node) => {
          if (node.nodeType !== 1) return;
          if (node.matches?.("img")) lockImg(node);
          node.querySelectorAll?.("img").forEach(lockImg);
        });
      }
    }).observe(document.documentElement, { childList: true, subtree: true });
  }

  protectPublicContent();

  return {
    t,
    localized,
    setLang,
    getLang: () => lang,
    loadData,
    visibleProducts,
    getProduct,
    getCategories: () => enabledCategories(),
    getSettings: () => settings,
    getReviews: () => reviews,
    formatPrice,
    formatWeight,
    orderLink,
    waLink,
    igLink,
    productCard,
    badgeHtml,
    mediaUrl,
    bindHeader,
    SUPPORTED
  };
})();
