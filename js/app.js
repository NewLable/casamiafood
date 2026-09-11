/* Shared app utilities: i18n, data loading, WhatsApp links */
const CasaMia = (() => {
  const LANG_KEY = "casamia_lang";
  const SUPPORTED = ["ru", "ua", "tr", "en"];
  const SITE_ORIGIN = "https://casamiafood.vip";
  const HTML_LANG = { ru: "ru", ua: "uk", tr: "tr", en: "en" };
  const OG_LOCALE = { ru: "ru_RU", ua: "uk_UA", tr: "tr_TR", en: "en_US" };
  const HREFLANG = [
    { code: "ru", hreflang: "ru" },
    { code: "ua", hreflang: "uk" },
    { code: "tr", hreflang: "tr" },
    { code: "en", hreflang: "en" }
  ];

  const UI = {
    nav_home: { ru: "Главная", ua: "Головна", tr: "Ana sayfa", en: "Home" },
    nav_menu: { ru: "Меню", ua: "Меню", tr: "Menü", en: "Menu" },
    nav_why: { ru: "Почему мы", ua: "Чому ми", tr: "Neden biz", en: "Why us" },
    nav_cook: { ru: "Как готовить", ua: "Як готувати", tr: "Nasıl pişirilir", en: "How to cook" },
    nav_about: { ru: "О нас", ua: "Про нас", tr: "Hakkımızda", en: "About" },
    nav_delivery: { ru: "Доставка", ua: "Доставка", tr: "Teslimat", en: "Delivery" },
    nav_reviews: { ru: "Отзывы", ua: "Відгуки", tr: "Yorumlar", en: "Reviews" },
    nav_contacts: { ru: "Контакты", ua: "Контакти", tr: "İletişim", en: "Contacts" },
    hero_h1: {
      ru: "Доставка домашней еды в Анталии — Casa Mia",
      ua: "Доставка домашньої їжі в Анталії — Casa Mia",
      tr: "Antalya ev yemeği teslimatı — Casa Mia",
      en: "Homemade food delivery in Antalya — Casa Mia"
    },
    hero_lead: {
      ru: "Домашняя кухня в Анталии, приготовленная с любовью к качеству. Пельмени, вареники, голубцы и блинчики — вручную и к вашему столу.",
      ua: "Домашня кухня в Анталії, приготована з любов'ю до якості. Пельмені, вареники, голубці й млинці — вручну і до вашого столу.",
      tr: "Antalya'da kaliteye sevgiyle hazırlanan ev mutfağı. Mantı, vareniki, lahana sarması ve krep — elle, sofranıza.",
      en: "A home kitchen in Antalya, cooked with love for quality. Pelmeni, vareniki, cabbage rolls and pancakes — handmade for your table."
    },
    meta_title: {
      ru: "Доставка домашней еды в Анталии | Casa Mia",
      ua: "Доставка домашньої їжі в Анталії | Casa Mia",
      tr: "Antalya ev yemeği teslimatı | Casa Mia",
      en: "Homemade food delivery in Antalya | Casa Mia"
    },
    meta_description: {
      ru: "Casa Mia — домашняя кухня в Анталии: пельмени, вареники, равиоли, голубцы, блинчики и салаты. Готовим вручную и доставляем в Лиман, Хурму, Лару и Коньяалты.",
      ua: "Casa Mia — домашня кухня в Анталії: пельмені, вареники, равіолі, голубці, млинці та салати. Готуємо вручну і доставляємо в Ліман, Хурму, Лару та Коньяалти.",
      tr: "Casa Mia — Antalya'da ev mutfağı: mantı, vareniki, ravioli, lahana sarması, krep ve salatalar. Elle hazırlıyor, Liman, Hurma, Lara ve Konyaaltı'na teslim ediyoruz.",
      en: "Casa Mia is a home kitchen in Antalya: pelmeni, vareniki, ravioli, cabbage rolls, pancakes and salads. Handmade and delivered to Liman, Hurma, Lara and Konyaaltı."
    },
    catalog_eyebrow: { ru: "Каталог", ua: "Каталог", tr: "Katalog", en: "Catalog" },
    local_title: {
      ru: "Условия доставки по Анталии",
      ua: "Умови доставки Анталією",
      tr: "Antalya teslimat koşulları",
      en: "Delivery terms in Antalya"
    },
    local_text: {
      ru: "Готовим под заказ и привозим домой в удобное время. Доставка домашней еды работает по Лиману, Хурме, Коньяалты, Ларе, Муратпаше и соседним районам Анталии. Напишите в WhatsApp — подскажем стоимость и ближайший слот.",
      ua: "Готуємо під замовлення і привозимо додому в зручний час. Доставка домашньої їжі працює Ліманом, Хурмою, Коньяалти, Ларою, Муратпашею та сусідніми районами Анталії. Напишіть у WhatsApp — підкажемо вартість і найближчий слот.",
      tr: "Siparişe özel pişirip uygun saatte evinize getiriyoruz. Ev yemeği teslimatı Liman, Hurma, Konyaaltı, Lara, Muratpaşa ve yakın semtlerde. WhatsApp'tan yazın — ücreti ve en yakın saati söyleyelim.",
      en: "We cook to order and deliver at a convenient time. Homemade food delivery covers Liman, Hurma, Konyaaltı, Lara, Muratpaşa and nearby Antalya areas. Message us on WhatsApp for cost and the next slot."
    },
    local_areas_title: { ru: "Районы доставки", ua: "Райони доставки", tr: "Teslimat semtleri", en: "Delivery areas" },
    local_cook_title: { ru: "Что мы готовим", ua: "Що ми готуємо", tr: "Ne pişiriyoruz", en: "What we cook" },
    local_cook_text: {
      ru: "Пельмени куриные, из индейки и курино-говяжьи; вареники с картофелем, грибами и творогом; равиоли с лососем; голубцы и фаршированный перец; блинчики; салаты «Оливье» и с лососем; паста; синнабоны и готовые блюда — всё с ценами в каталоге.",
      ua: "Пельмені курячі, з індички та курячо-яловичі; вареники з картоплею, грибами й сиром; равіолі з лососем; голубці й фарширований перець; млинці; салати «Олів'є» і з лососем; паста; синнабони та готові страви — усе з цінами в каталозі.",
      tr: "Tavuk, hindi ve tavuk-dana mantı; patatesli, mantarlı ve peynirli vareniki; somonlu ravioli; lahana sarması ve dolma biber; krep; Olivier ve somon salataları; makarna; cinnabon ve hazır yemekler — fiyatlar katalogda.",
      en: "Chicken, turkey and chicken-beef pelmeni; potato, mushroom and cottage-cheese vareniki; salmon ravioli; cabbage rolls and stuffed peppers; pancakes; Olivier and salmon salads; pasta; cinnabons and ready meals — all with prices in the catalog."
    },
    local_products_title: { ru: "Какие продукты используем", ua: "Які продукти використовуємо", tr: "Hangi ürünleri kullanıyoruz", en: "Ingredients we use" },
    local_products_text: {
      ru: "Свежее мясо и филе, овощи, яйца, творог, сливочное масло, мука твёрдых сортов пшеницы. Без усилителей вкуса, консервантов и заводских полуфабрикатов. Партии небольшие, заморозка — сразу после приготовления.",
      ua: "Свіже м'ясо та філе, овочі, яйця, сир, вершкове масло, борошно твердих сортів пшениці. Без підсилювачів смаку, консервантів і заводських напівфабрикатів. Партії невеликі, заморозка — одразу після приготування.",
      tr: "Taze et ve fileto, sebze, yumurta, lor, tereyağı, durum buğday unu. Tat artırıcı, koruyucu ve hazır yarı mamul yok. Küçük partiler, pişince hemen dondurma.",
      en: "Fresh meat and fillet, vegetables, eggs, cottage cheese, butter, durum wheat flour. No flavor enhancers, preservatives or factory semi-finished products. Small batches, frozen right after cooking."
    },
    area_liman: { ru: "Лиман", ua: "Ліман", tr: "Liman", en: "Liman" },
    area_hurma: { ru: "Хурма", ua: "Хурма", tr: "Hurma", en: "Hurma" },
    area_konyaalti: { ru: "Коньяалты", ua: "Коньяалти", tr: "Konyaaltı", en: "Konyaaltı" },
    area_lara: { ru: "Лара", ua: "Лара", tr: "Lara", en: "Lara" },
    area_muratpasa: { ru: "Муратпаша", ua: "Муратпаша", tr: "Muratpaşa", en: "Muratpaşa" },
    area_kundu: { ru: "Кунду", ua: "Кунду", tr: "Kundu", en: "Kundu" },
    maps_google: { ru: "Google Карты", ua: "Google Карти", tr: "Google Haritalar", en: "Google Maps" },
    maps_yandex: { ru: "Яндекс Карты", ua: "Яндекс Карти", tr: "Yandex Haritalar", en: "Yandex Maps" },
    hero_p1: { ru: "Натуральные ингредиенты", ua: "Натуральні інгредієнти", tr: "Doğal malzemeler", en: "Natural ingredients" },
    hero_p2: { ru: "Ручная лепка", ua: "Ручне ліплення", tr: "El yapımı", en: "Handmade" },
    hero_p3: { ru: "Шоковая заморозка", ua: "Шокове заморожування", tr: "Şok dondurma", en: "Flash freezing" },
    hero_p4: { ru: "Доставка по Анталии", ua: "Доставка Анталією", tr: "Antalya teslimatı", en: "Delivery in Antalya" },
    cta_wa: { ru: "Написать в WhatsApp", ua: "Написати в WhatsApp", tr: "WhatsApp'tan yazın", en: "Message on WhatsApp" },
    cta_ig: { ru: "Мы в Instagram", ua: "Ми в Instagram", tr: "Instagram'dayız", en: "We're on Instagram" },
    seal: { ru: "Made with love", ua: "З любов'ю", tr: "Sevgiyle", en: "Made with love" },
    menu_title: { ru: "Наше меню", ua: "Наше меню", tr: "Menümüz", en: "Our menu" },
    menu_sub: {
      ru: "Пельмени, вареники, равиоли, голубцы, блинчики, салаты, паста и выпечка — с ценами, фото и заказом в WhatsApp.",
      ua: "Пельмені, вареники, равіолі, голубці, млинці, салати, паста й випічка — з цінами, фото та замовленням у WhatsApp.",
      tr: "Mantı, vareniki, ravioli, lahana sarması, krep, salata, makarna ve hamur işi — fiyat, fotoğraf ve WhatsApp siparişiyle.",
      en: "Pelmeni, vareniki, ravioli, cabbage rolls, pancakes, salads, pasta and bakery — with prices, photos and WhatsApp ordering."
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

  const urlLang = new URLSearchParams(location.search).get("lang");
  let lang = SUPPORTED.includes(urlLang)
    ? urlLang
    : localStorage.getItem(LANG_KEY) || "ru";
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

  function pagePath() {
    let path = location.pathname || "/";
    if (path.endsWith("/index.html")) path = path.slice(0, -10) || "/";
    return path;
  }

  function languageUrl(code, extra = {}) {
    const url = new URL(pagePath(), SITE_ORIGIN);
    const id = extra.id || new URLSearchParams(location.search).get("id");
    if (id) url.searchParams.set("id", id);
    if (code && code !== "ru") url.searchParams.set("lang", code);
    return url.href;
  }

  function canonicalUrl() {
    return languageUrl(lang);
  }

  function setMeta(name, content, attr = "name") {
    if (!content) return;
    let el = document.head.querySelector(`meta[${attr}="${name}"]`);
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute(attr, name);
      document.head.appendChild(el);
    }
    el.setAttribute("content", content);
  }

  function setLink(rel, href) {
    let el = document.head.querySelector(`link[rel="${rel}"]:not([hreflang])`);
    if (!el) {
      el = document.createElement("link");
      el.rel = rel;
      document.head.appendChild(el);
    }
    el.href = href;
  }

  function upsertHreflang() {
    document.querySelectorAll("link[rel='alternate'][hreflang]").forEach((el) => el.remove());
    HREFLANG.forEach(({ code, hreflang }) => {
      const link = document.createElement("link");
      link.rel = "alternate";
      link.hreflang = hreflang;
      link.href = languageUrl(code);
      document.head.appendChild(link);
    });
    const def = document.createElement("link");
    def.rel = "alternate";
    def.hreflang = "x-default";
    def.href = languageUrl("ru");
    document.head.appendChild(def);
  }

  function syncLangUrl() {
    const url = new URL(location.href);
    if (lang === "ru") url.searchParams.delete("lang");
    else url.searchParams.set("lang", lang);
    const next = url.pathname + url.search + url.hash;
    if (next !== location.pathname + location.search + location.hash) {
      history.replaceState({}, "", next);
    }
  }

  function applySeo(overrides = {}) {
    const title = overrides.title || localized(settings?.seo?.title) || t("meta_title");
    const description = overrides.description || localized(settings?.seo?.description) || t("meta_description");
    document.title = title;
    document.documentElement.lang = HTML_LANG[lang] || "ru";
    setMeta("description", description);
    setMeta("og:title", title, "property");
    setMeta("og:description", description, "property");
    setMeta("og:locale", OG_LOCALE[lang] || "ru_RU", "property");
    setMeta("og:url", canonicalUrl(), "property");
    setLink("canonical", canonicalUrl());
    upsertHreflang();
    syncLangUrl();
  }

  function setJsonLd(id, data) {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement("script");
      el.type = "application/ld+json";
      el.id = id;
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(data);
  }

  function productHref(id) {
    const params = new URLSearchParams({ id });
    if (lang !== "ru") params.set("lang", lang);
    return `product.html?${params.toString()}`;
  }

  function homeHref(hash = "") {
    const q = lang !== "ru" ? `?lang=${lang}` : "";
    return `index.html${q}${hash}`;
  }

  function setLang(next) {
    if (!SUPPORTED.includes(next)) return;
    lang = next;
    localStorage.setItem(LANG_KEY, lang);
    document.documentElement.lang = HTML_LANG[lang] || "ru";
    applyStaticI18n();
    syncLangUrl();
    document.dispatchEvent(new CustomEvent("casamia:lang", { detail: { lang } }));
  }

  function applyStaticI18n() {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll(".lang-switch button").forEach((btn) => {
      const active = btn.dataset.lang === lang;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
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
    const fallback = "images/brand/card.webp";
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
    if (!urlLang && !localStorage.getItem(LANG_KEY) && SUPPORTED.includes(s.defaultLang)) {
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
    const href = productHref(product.id);
    const img = mediaUrl(product.thumbnail || product.images?.[0]);
    return `
      <article class="product-card">
        <a class="thumb" href="${href}">
          ${badgeHtml(product)}
          <img src="${img}" alt="${localized(product.name)}" loading="lazy" decoding="async" width="400" height="400" draggable="false">
        </a>
        <div class="body">
          <a href="${href}"><h3>${localized(product.name)}</h3></a>
          <p class="desc">${localized(product.description)}</p>
          <div class="product-meta">
            <div>
              <div class="price">${formatPrice(product)}</div>
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
    applySeo();
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
    applySeo,
    setJsonLd,
    productHref,
    homeHref,
    SITE_ORIGIN,
    SUPPORTED
  };
})();
