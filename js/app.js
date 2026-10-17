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
    nav_cook: { ru: "Как готовить", ua: "Як готувати", tr: "Pişirme", en: "How to cook" },
    nav_about: { ru: "О нас", ua: "Про нас", tr: "Hakkımızda", en: "About" },
    nav_delivery: { ru: "Доставка", ua: "Доставка", tr: "Teslimat", en: "Delivery" },
    nav_gallery: { ru: "Фото", ua: "Фото", tr: "Fotoğraflar", en: "Photos" },
    nav_reviews: { ru: "Отзывы", ua: "Відгуки", tr: "Yorumlar", en: "Reviews" },
    nav_contacts: { ru: "Контакты", ua: "Контакти", tr: "İletişim", en: "Contacts" },
    hero_h1: {
      ru: "Доставка домашней еды в Анталии — Casa Mia",
      ua: "Доставка домашньої їжі в Анталії — Casa Mia",
      tr: "Antalya'da ev yemeği teslimatı — Casa Mia",
      en: "Homemade food delivery in Antalya — Casa Mia"
    },
    hero_lead: {
      ru: "Домашняя кухня в Анталии, приготовленная с любовью к качеству. Пельмени, вареники, голубцы и блинчики — вручную и к вашему столу.",
      ua: "Домашня кухня в Анталії, яку готуємо з турботою. Пельмені, вареники, голубці й млинці — вручну і до вашого столу.",
      tr: "Antalya'da özenle pişen ev yemekleri. Pelmeni, vareniki, lahana sarması ve krep — elle hazırlanıp kapınıza geliyor.",
      en: "A home kitchen in Antalya, cooked with real care. Pelmeni, vareniki, cabbage rolls and pancakes — handmade, then brought to your table."
    },
    meta_title: {
      ru: "Доставка домашней еды в Анталии | Casa Mia",
      ua: "Доставка домашньої їжі в Анталії | Casa Mia",
      tr: "Antalya'da ev yemeği teslimatı | Casa Mia",
      en: "Homemade food delivery in Antalya | Casa Mia"
    },
    meta_description: {
      ru: "Casa Mia — домашняя кухня в Анталии: пельмени, вареники, равиоли, голубцы, блинчики и салаты. Готовим вручную и доставляем в Лиман, Хурму, Лару и Коньяалты.",
      ua: "Casa Mia — домашня кухня в Анталії: пельмені, вареники, равіолі, голубці, млинці та салати. Готуємо вручну і доставляємо в Ліман, Хурму, Лару та Коньяалти.",
      tr: "Casa Mia — Antalya'da ev mutfağı: pelmeni, vareniki, ravioli, lahana sarması, krep ve salatalar. Elle hazırlıyoruz; Liman, Hurma, Lara ve Konyaaltı'na teslim ediyoruz.",
      en: "Casa Mia is a home kitchen in Antalya: pelmeni, vareniki, ravioli, cabbage rolls, pancakes and salads. Handmade and delivered to Liman, Hurma, Lara and Konyaaltı."
    },
    catalog_eyebrow: { ru: "Каталог", ua: "Каталог", tr: "Katalog", en: "Catalog" },
    local_title: {
      ru: "Условия доставки по Анталии",
      ua: "Умови доставки Анталією",
      tr: "Antalya'da teslimat",
      en: "Delivery terms in Antalya"
    },
    local_text: {
      ru: "Готовим под заказ и привозим домой в удобное время. Доставка домашней еды работает по Лиману, Хурме, Коньяалты, Ларе, Муратпаше и соседним районам Анталии. Напишите в WhatsApp — подскажем стоимость и ближайший слот.",
      ua: "Готуємо під замовлення і привозимо додому в зручний час. Доставка домашньої їжі працює Ліманом, Хурмою, Коньяалти, Ларою, Муратпашею та сусідніми районами Анталії. Напишіть у WhatsApp — підкажемо вартість і найближчий слот.",
      tr: "Siparişe göre pişirip, size uygun saatte eve bırakıyoruz. Liman, Hurma, Konyaaltı, Lara, Muratpaşa ve çevresine ev yemeği götürüyoruz. WhatsApp'tan yazın — ücreti ve en yakın saati söyleyelim.",
      en: "We cook to order and deliver at a convenient time. Homemade food delivery covers Liman, Hurma, Konyaaltı, Lara, Muratpaşa and nearby Antalya areas. Message us on WhatsApp for cost and the next slot."
    },
    local_areas_title: { ru: "Районы доставки", ua: "Райони доставки", tr: "Teslimat semtleri", en: "Delivery areas" },
    local_cook_title: { ru: "Что мы готовим", ua: "Що ми готуємо", tr: "Ne pişiriyoruz", en: "What we cook" },
    local_cook_text: {
      ru: "Пельмени куриные, из индейки и курино-говяжьи; вареники с картофелем, грибами и творогом; равиоли с лососем; голубцы и фаршированный перец; блинчики; салаты «Оливье» и с лососем; паста; синнабоны и готовые блюда — всё с ценами в каталоге.",
      ua: "Пельмені курячі, з індички та курячо-яловичі; вареники з картоплею, грибами й сиром; равіолі з лососем; голубці й фарширований перець; млинці; салати «Олів'є» і з лососем; паста; синнабони та готові страви — усе з цінами в каталозі.",
      tr: "Tavuklu, hindili ve tavuklu-dana pelmeni; patatesli, mantarlı ve lorlu vareniki; somonlu ravioli; lahana sarması ve biber dolması; krep; olivye ve somon salataları; ev makarnası, tarçınlı rulo ve hazır yemekler — fiyatlar menüde.",
      en: "Chicken, turkey and chicken-beef pelmeni; potato, mushroom and cottage-cheese vareniki; salmon ravioli; cabbage rolls and stuffed peppers; pancakes; Olivier and salmon salads; pasta; cinnabons and ready meals — all with prices in the catalog."
    },
    local_products_title: { ru: "Какие продукты используем", ua: "Які продукти використовуємо", tr: "Hangi ürünleri kullanıyoruz", en: "Ingredients we use" },
    local_products_text: {
      ru: "Свежее мясо и филе, овощи, яйца, творог, сливочное масло, мука твёрдых сортов пшеницы. Без усилителей вкуса, консервантов и заводских полуфабрикатов. Партии небольшие, заморозка — сразу после приготовления.",
      ua: "Свіже м'ясо та філе, овочі, яйця, сир, вершкове масло, борошно твердих сортів пшениці. Без підсилювачів смаку, консервантів і заводських напівфабрикатів. Партії невеликі, заморозка — одразу після приготування.",
      tr: "Taze et ve göğüs, sebze, yumurta, lor, tereyağı, durum buğday unu. Katkı maddesi, koruyucu ve hazır harç kullanmıyoruz. Küçük partiler halinde pişirip hemen donduruyoruz.",
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
    hero_p2: { ru: "Ручная лепка", ua: "Ручне ліплення", tr: "Elle yapılır", en: "Handmade" },
    hero_p3: { ru: "Шоковая заморозка", ua: "Шокове заморожування", tr: "Şok dondurma", en: "Flash freezing" },
    hero_p4: { ru: "Доставка по Анталии", ua: "Доставка Анталією", tr: "Antalya'da teslimat", en: "Delivery in Antalya" },
    cta_wa: { ru: "Написать в WhatsApp", ua: "Написати в WhatsApp", tr: "WhatsApp'tan yazın", en: "Message on WhatsApp" },
    cta_ig: { ru: "Мы в Instagram", ua: "Ми в Instagram", tr: "Instagram'dayız", en: "We're on Instagram" },
    seal: { ru: "Made with love", ua: "З любов'ю", tr: "Sevgiyle", en: "Made with love" },
    menu_title: { ru: "Наше меню", ua: "Наше меню", tr: "Menümüz", en: "Our menu" },
    menu_sub: {
      ru: "Пельмени, вареники, равиоли, голубцы, блинчики, салаты, паста и выпечка — с ценами, фото и заказом в WhatsApp.",
      ua: "Пельмені, вареники, равіолі, голубці, млинці, салати, паста й випічка — з цінами, фото та замовленням у WhatsApp.",
      tr: "Pelmeni, vareniki, ravioli, lahana sarması, krep, salata, makarna ve tatlı — fiyatlar, fotoğraflar ve WhatsApp'tan sipariş.",
      en: "Pelmeni, vareniki, ravioli, cabbage rolls, pancakes, salads, pasta and bakery — with prices, photos and WhatsApp ordering."
    },
    hits_title: { ru: "Хиты недели", ua: "Хіти тижня", tr: "Haftanın favorileri", en: "This week's favorites" },
    all: { ru: "Все", ua: "Усі", tr: "Tümü", en: "All" },
    sort: {
      label: { ru: "Сортировка", ua: "Сортування", tr: "Sıralama", en: "Sort" },
      menu: { ru: "Как в меню", ua: "Як у меню", tr: "Menü sırası", en: "Menu order" },
      name_az: { ru: "А–Я", ua: "А–Я", tr: "A–Z", en: "A–Z" },
      name_za: { ru: "Я–А", ua: "Я–А", tr: "Z–A", en: "Z–A" },
      price_asc: { ru: "Сначала дешевле", ua: "Спочатку дешевші", tr: "Önce ucuz", en: "Price: low to high" },
      price_desc: { ru: "Сначала дороже", ua: "Спочатку дорожчі", tr: "Önce pahalı", en: "Price: high to low" },
      search: { ru: "Поиск", ua: "Пошук", tr: "Arama", en: "Search" },
      search_ph: { ru: "Найти блюдо", ua: "Знайти страву", tr: "Yemek ara", en: "Search dishes" },
      clear: { ru: "Очистить", ua: "Очистити", tr: "Temizle", en: "Clear" },
      empty: {
        ru: "Ничего не нашлось. Попробуйте другое название или категорию «Все».",
        ua: "Нічого не знайшлося. Спробуйте іншу назву або категорію «Усі».",
        tr: "Sonuç yok. Başka bir ad deneyin veya «Tümü» kategorisini seçin.",
        en: "Nothing found. Try another name or the All category."
      }
    },
    why_title: { ru: "Почему Casa Mia?", ua: "Чому Casa Mia?", tr: "Neden Casa Mia?", en: "Why Casa Mia?" },
    gallery_title: { ru: "Наша кухня", ua: "Наша кухня", tr: "Mutfağımız", en: "Our kitchen" },
    gallery_prev: { ru: "Предыдущее фото", ua: "Попереднє фото", tr: "Önceki fotoğraf", en: "Previous photo" },
    gallery_next: { ru: "Следующее фото", ua: "Наступне фото", tr: "Sonraki fotoğraf", en: "Next photo" },
    reviews_prev: { ru: "Предыдущий отзыв", ua: "Попередній відгук", tr: "Önceki yorum", en: "Previous review" },
    reviews_next: { ru: "Следующий отзыв", ua: "Наступний відгук", tr: "Sonraki yorum", en: "Next review" },
    cook_title: { ru: "Как готовить?", ua: "Як готувати?", tr: "Nasıl pişirilir?", en: "How to cook?" },
    cook_sub: {
      ru: "Просто и быстро — для замороженных продуктов.",
      ua: "Просто й швидко — для заморожених продуктів.",
      tr: "Donuklar için kısa ve pratik.",
      en: "Simple and fast — for frozen products."
    },
    delivery_title: { ru: "Доставка по Анталии", ua: "Доставка Анталією", tr: "Antalya'da teslimat", en: "Delivery in Antalya" },
    delivery_cost: { ru: "Стоимость", ua: "Вартість", tr: "Ücret", en: "Cost" },
    areas: { ru: "Районы", ua: "Райони", tr: "Semtler", en: "Areas" },
    hours: { ru: "Время", ua: "Час", tr: "Saatler", en: "Hours" },
    payment: { ru: "Оплата", ua: "Оплата", tr: "Ödeme", en: "Payment" },
    reviews_title: { ru: "Спасибо, что выбираете нас", ua: "Дякуємо, що обираєте нас", tr: "Bizi tercih ettiğiniz için teşekkürler", en: "Thank you for choosing us" },
    contacts_title: { ru: "Есть вопросы или хотите заказать?", ua: "Є питання чи хочете замовити?", tr: "Sorunuz mu var? Sipariş vermek ister misiniz?", en: "Questions, or ready to order?" },
    contacts_sub: {
      ru: "Напишите в WhatsApp или Instagram — отправим актуальное меню и оформим доставку.",
      ua: "Напишіть у WhatsApp або Instagram — надішлемо актуальне меню й оформимо доставку.",
      tr: "WhatsApp veya Instagram'dan yazın — güncel menüyü gönderelim, teslimatı ayarlayalım.",
      en: "Message us on WhatsApp or Instagram — we'll send the menu and arrange delivery."
    },
    thanks: { ru: "Спасибо, что вы с нами!", ua: "Дякуємо, що ви з нами!", tr: "Bizimle olduğunuz için teşekkürler!", en: "Thanks for being with us!" },
    ingredients: { ru: "Состав", ua: "Склад", tr: "İçindekiler", en: "Ingredients" },
    how_cook: { ru: "Как приготовить", ua: "Як приготувати", tr: "Nasıl pişirilir", en: "How to cook" },
    serve: { ru: "С чем подавать", ua: "З чим подавати", tr: "Yanında ne gider", en: "Serve with" },
    order_more: { ru: "Заказать ещё", ua: "Замовити ще", tr: "Tekrar sipariş ver", en: "Order again" },
    back_menu: { ru: "К меню", ua: "До меню", tr: "Menüye dön", en: "Back to menu" },
    hit: { ru: "Хит", ua: "Хіт", tr: "Favori", en: "Favorite" },
    new: { ru: "Новинка", ua: "Новинка", tr: "Yeni", en: "New" },
    sale: { ru: "Акция", ua: "Акція", tr: "Kampanya", en: "Sale" },
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
      tr: "Merhaba! Menüye bakmak ve teslimat ayarlamak istiyorum.",
      en: "Hello! I'd like to see the menu and arrange delivery."
    },
    not_found: { ru: "Товар не найден", ua: "Товар не знайдено", tr: "Ürün bulunamadı", en: "Product not found" },
    weight: { ru: "Вес / объём", ua: "Вага / об'єм", tr: "Gramaj", en: "Weight / volume" },
    price: { ru: "Цена", ua: "Ціна", tr: "Fiyat", en: "Price" },
    choose_size: { ru: "Выберите вариант", ua: "Оберіть варіант", tr: "Gramaj seçin", en: "Choose option" },
    basket: {
      add: { ru: "Добавить", ua: "Додати", tr: "Ekle", en: "Add" },
      added: { ru: "Добавлено в корзину", ua: "Додано до кошика", tr: "Sepete eklendi", en: "Added to basket" },
      removed: { ru: "Удалено", ua: "Видалено", tr: "Kaldırıldı", en: "Removed" },
      qty_changed: { ru: "Количество изменено", ua: "Кількість змінено", tr: "Miktar değişti", en: "Quantity updated" },
      copied: { ru: "Заказ скопирован", ua: "Замовлення скопійовано", tr: "Sipariş kopyalandı", en: "Order copied" },
      ig_copied: {
        ru: "Заказ скопирован. Вставьте его в открывшийся чат Instagram.",
        ua: "Замовлення скопійовано. Вставте його у відкритий чат Instagram.",
        tr: "Sipariş kopyalandı. Açılan Instagram sohbetine yapıştırın.",
        en: "Order copied. Paste it into the Instagram chat that just opened."
      },
      ig_title: {
        ru: "Отправка заказа в Instagram",
        ua: "Надсилання замовлення в Instagram",
        tr: "Instagram'dan sipariş gönderin",
        en: "Send order on Instagram"
      },
      ig_hint: {
        ru: "Список заказа скопирован. Сейчас откроется чат Casa Mia в Instagram. Нажмите и удерживайте поле ввода сообщения, затем выберите «Вставить» и отправьте заказ.",
        ua: "Список замовлення скопійовано. Зараз відкриється чат Casa Mia в Instagram. Натисніть і утримуйте поле введення повідомлення, потім виберіть «Вставити» та надішліть замовлення.",
        tr: "Sipariş listeniz kopyalandı. Şimdi Casa Mia Instagram sohbeti açılacak. Mesaj yazma alanına uzun basın, «Yapıştır» seçeneğini seçin ve siparişinizi gönderin.",
        en: "Your order list has been copied. The Casa Mia Instagram chat will open next. Press and hold the message field, choose Paste, and send your order."
      },
      ig_copied_ok: {
        ru: "Список заказа уже скопирован.",
        ua: "Список замовлення вже скопійовано.",
        tr: "Sipariş listeniz kopyalandı.",
        en: "Your order list has been copied."
      },
      ig_soon: {
        ru: "Сейчас откроется чат Casa Mia в Instagram.",
        ua: "Зараз відкриється чат Casa Mia в Instagram.",
        tr: "Şimdi Casa Mia Instagram sohbeti açılacak.",
        en: "The Casa Mia Instagram chat will open next."
      },
      ig_next: {
        ru: "Что делать дальше",
        ua: "Що робити далі",
        tr: "Bundan sonra",
        en: "What to do next"
      },
      ig_step1: {
        ru: "Нажмите и удерживайте поле ввода сообщения.",
        ua: "Натисніть і утримуйте поле введення повідомлення.",
        tr: "Mesaj yazma alanına uzun basın.",
        en: "Press and hold the message field."
      },
      ig_step2: {
        ru: "Выберите «Вставить».",
        ua: "Виберіть «Вставити».",
        tr: "«Yapıştır» seçeneğini seçin.",
        en: "Choose “Paste”."
      },
      ig_step3: {
        ru: "Отправьте сообщение — заказ уже готов.",
        ua: "Надішліть повідомлення — замовлення вже готове.",
        tr: "Mesajı gönderin — siparişiniz hazır.",
        en: "Send the message — your order is ready."
      },
      ig_open: {
        ru: "Открыть Instagram",
        ua: "Відкрити Instagram",
        tr: "Instagram'ı aç",
        en: "Open Instagram"
      },
      copy_fail: {
        ru: "Не удалось скопировать заказ",
        ua: "Не вдалося скопіювати замовлення",
        tr: "Sipariş kopyalanamadı",
        en: "Could not copy the order"
      },
      send_wa: {
        ru: "Отправить заказ в WhatsApp",
        ua: "Надіслати замовлення у WhatsApp",
        tr: "WhatsApp'a gönder",
        en: "Send order on WhatsApp"
      },
      send_ig: {
        ru: "Отправить в Instagram",
        ua: "Надіслати в Instagram",
        tr: "Instagram'a gönder",
        en: "Send via Instagram"
      },
      copy_order: {
        ru: "Скопировать список",
        ua: "Скопіювати список",
        tr: "Listeyi kopyala",
        en: "Copy the list"
      },
      title: { ru: "Корзина", ua: "Кошик", tr: "Sepet", en: "Basket" },
      empty: { ru: "Корзина пуста", ua: "Кошик порожній", tr: "Sepetiniz boş", en: "Your basket is empty" },
      items_total: {
        ru: "Итого товаров: {count}",
        ua: "Разом товарів: {count}",
        tr: "Ürün sayısı: {count}",
        en: "Items: {count}"
      },
      sum_total: {
        ru: "Итого: {sum}",
        ua: "Разом: {sum}",
        tr: "Toplam: {sum}",
        en: "Total: {sum}"
      },
      min_order: {
        ru: "Минимальная сумма доставки: {amount}",
        ua: "Мінімальна сума доставки: {amount}",
        tr: "Minimum teslimat tutarı: {amount}",
        en: "Minimum delivery amount: {amount}"
      },
      min_order_left: {
        ru: "осталось {amount}",
        ua: "залишилось {amount}",
        tr: "{amount} kaldı",
        en: "{amount} left"
      },
      free_left: {
        ru: "До бесплатной доставки осталось {amount}",
        ua: "До безкоштовної доставки залишилось {amount}",
        tr: "Ücretsiz teslimat için {amount} kaldı",
        en: "{amount} left until free delivery"
      },
      free_done: {
        ru: "🎉 Бесплатная доставка доступна.",
        ua: "🎉 Безкоштовна доставка доступна.",
        tr: "🎉 Tebrikler, ücretsiz teslimat!",
        en: "🎉 Free delivery is available."
      },
      field_name: { ru: "Имя:", ua: "Ім'я:", tr: "Adınız:", en: "Name:" },
      field_area: { ru: "Район доставки:", ua: "Район доставки:", tr: "Teslimat semtiniz:", en: "Delivery area:" },
      checkout_name: { ru: "Имя", ua: "Ім'я", tr: "Adınız", en: "Name" },
      checkout_area: { ru: "Район доставки", ua: "Район доставки", tr: "Teslimat semti", en: "Delivery area" },
      name_ph: {
        ru: "Как к вам обращаться",
        ua: "Як до вас звертатися",
        tr: "Adınız",
        en: "Your name"
      },
      area_ph: {
        ru: "Лиман, Хурма, Лара…",
        ua: "Ліман, Хурма, Лара…",
        tr: "Liman, Hurma, Lara…",
        en: "Liman, Hurma, Lara…"
      },
      map_pick: {
        ru: "Выбрать на карте",
        ua: "Обрати на карті",
        tr: "Haritadan seç",
        en: "Choose on the map"
      },
      checkout_location: {
        ru: "Выбранная локация",
        ua: "Обрана локація",
        tr: "Seçilen konum",
        en: "Selected location"
      },
      location_ph: {
        ru: "Появится после выбора на карте",
        ua: "З’явиться після вибору на карті",
        tr: "Haritadan seçince görünür",
        en: "Appears after you choose on the map"
      },
      field_location: {
        ru: "Локация:",
        ua: "Локація:",
        tr: "Konum:",
        en: "Location:"
      },
      map_title: {
        ru: "Точка доставки",
        ua: "Точка доставки",
        tr: "Teslimat noktası",
        en: "Delivery point"
      },
      map_hint: {
        ru: "Нажмите на карту и отметьте, куда привезти заказ.",
        ua: "Натисніть на карту й позначте, куди привезти замовлення.",
        tr: "Haritaya dokunun ve siparişin geleceği noktayı işaretleyin.",
        en: "Tap the map and mark where the order should arrive."
      },
      map_save: {
        ru: "Сохранить",
        ua: "Зберегти",
        tr: "Kaydet",
        en: "Save"
      },
      map_fail: {
        ru: "Не удалось открыть карту",
        ua: "Не вдалося відкрити карту",
        tr: "Harita açılamadı",
        en: "Could not open the map"
      },
      checkout_date: {
        ru: "Желаемая дата доставки",
        ua: "Бажана дата доставки",
        tr: "İstenen teslimat tarihi",
        en: "Preferred delivery date"
      },
      field_date: {
        ru: "Желаемая дата доставки:",
        ua: "Бажана дата доставки:",
        tr: "İstenen teslimat tarihi:",
        en: "Preferred delivery date:"
      },
      date_ph: {
        ru: "Выберите дату",
        ua: "Оберіть дату",
        tr: "Tarih seçin",
        en: "Choose a date"
      },
      date_prev: {
        ru: "Предыдущий месяц",
        ua: "Попередній місяць",
        tr: "Önceki ay",
        en: "Previous month"
      },
      date_next: {
        ru: "Следующий месяц",
        ua: "Наступний місяць",
        tr: "Sonraki ay",
        en: "Next month"
      },
      greeting: {
        ru: "Здравствуйте! 👋 Хочу оформить заказ Casa Mia.",
        ua: "Вітаю! 👋 Хочу оформити замовлення Casa Mia.",
        tr: "Merhaba! 👋 Casa Mia'dan sipariş vermek istiyorum.",
        en: "Hello! 👋 I'd like to place a Casa Mia order."
      },
      total: { ru: "Итого", ua: "Разом", tr: "Toplam", en: "Total" },
      repeat: {
        ru: "Повторить прошлый заказ",
        ua: "Повторити минуле замовлення",
        tr: "Son siparişi tekrarla",
        en: "Repeat last order"
      },
      repeat_btn: {
        ru: "Повторить заказ",
        ua: "Повторити замовлення",
        tr: "Siparişi tekrarla",
        en: "Repeat order"
      },
      repeat_done: {
        ru: "Прошлый заказ добавлен в корзину",
        ua: "Минуле замовлення додано до кошика",
        tr: "Son sipariş sepete eklendi",
        en: "Last order added to basket"
      },
      favorites: { ru: "Любимые товары", ua: "Улюблені товари", tr: "Favorilerim", en: "Favorites" },
      unavailable: {
        ru: "Товара больше нет в меню",
        ua: "Товару більше немає в меню",
        tr: "Bu ürün artık menüde yok",
        en: "This item is no longer on the menu"
      },
      hidden_warn: {
        ru: "Товар скрыт из меню",
        ua: "Товар приховано з меню",
        tr: "Bu ürün şu an menüde yok",
        en: "This item is hidden from the menu"
      },
      soldout_warn: { ru: "Нет в наличии", ua: "Немає в наявності", tr: "Stokta yok", en: "Sold out" },
      remove: { ru: "Удалить", ua: "Видалити", tr: "Sil", en: "Remove" },
      close: { ru: "Закрыть", ua: "Закрити", tr: "Kapat", en: "Close" },
      decrease: { ru: "Уменьшить количество", ua: "Зменшити кількість", tr: "Miktarı azalt", en: "Decrease quantity" },
      increase: { ru: "Увеличить количество", ua: "Збільшити кількість", tr: "Miktarı artır", en: "Increase quantity" },
      unit_package: { ru: "уп.", ua: "уп.", tr: "paket", en: "pack" },
      unit_piece: { ru: "шт.", ua: "шт.", tr: "adet", en: "pcs" },
      unit_kg: { ru: "кг", ua: "кг", tr: "kg", en: "kg" },
      unit_gram: { ru: "г", ua: "г", tr: "g", en: "g" },
      fab: { ru: "{count} • {sum}", ua: "{count} • {sum}", tr: "{count} • {sum}", en: "{count} • {sum}" },
      fav_add: { ru: "В избранное", ua: "До обраного", tr: "Favorilere ekle", en: "Add to favorites" },
      fav_remove: { ru: "Убрать из избранного", ua: "Прибрати з обраного", tr: "Favorilerden çıkar", en: "Remove from favorites" },
      open: { ru: "Открыть корзину", ua: "Відкрити кошик", tr: "Sepeti aç", en: "Open basket" }
    }
  };

  function parsePath(pathname) {
    if (typeof CasaMiaSeo !== "undefined" && CasaMiaSeo.parsePath) return CasaMiaSeo.parsePath(pathname);
    return { lang: "ru", kind: "other", id: "" };
  }

  function pageUrl(kind, id, code) {
    if (typeof CasaMiaSeo !== "undefined" && CasaMiaSeo.pagePath) return CasaMiaSeo.pagePath(kind, id, code);
    const params = new URLSearchParams();
    if (id) params.set("id", id);
    if (code && code !== "ru") params.set("lang", code);
    const file = kind === "product" ? "product.html" : "index.html";
    const query = params.toString();
    return `${file}${query ? `?${query}` : ""}`;
  }

  const pathInfo = parsePath(location.pathname);
  const urlLang = new URLSearchParams(location.search).get("lang");
  const bareHome = pathInfo.kind === "home" && pathInfo.lang === "ru" && (location.pathname === "/" || location.pathname === "/index.html");
  if (bareHome) {
    const preferred = SUPPORTED.includes(urlLang) ? urlLang : (localStorage.getItem(LANG_KEY) || "ru");
    if (SUPPORTED.includes(preferred) && preferred !== "ru") {
      location.replace(pageUrl("home", "", preferred) + location.hash);
    }
  }
  let lang = pathInfo.kind === "home" || pathInfo.kind === "product" || pathInfo.kind === "category"
    ? pathInfo.lang
    : (SUPPORTED.includes(urlLang) ? urlLang : (localStorage.getItem(LANG_KEY) || "ru"));
  if (!SUPPORTED.includes(lang)) lang = "ru";

  let products = [];
  let categories = [];
  let settings = null;
  let reviews = [];
  let gallery = { visible: true, autoplay: true, interval: 5, title: {}, items: [] };

  function t(key, vars) {
    const parts = String(key).split(".");
    let row = UI;
    for (const part of parts) {
      if (row == null) return key;
      row = row[part];
    }
    if (row == null) return key;
    let text = typeof row === "string" ? row : (row[lang] || row.ru || key);
    if (vars) {
      Object.keys(vars).forEach((name) => {
        text = text.replaceAll(`{${name}}`, vars[name]);
      });
    }
    return text;
  }

  function localized(obj) {
    if (!obj) return "";
    if (typeof obj === "string") return obj;
    return obj[lang] || obj.ru || "";
  }

  function currentPage() {
    const here = parsePath(location.pathname);
    if (here.kind === "product" || here.kind === "category" || here.kind === "home") return here;
    const id = new URLSearchParams(location.search).get("id");
    if (id && /product\.html$/.test(location.pathname)) return { lang, kind: "product", id };
    return { lang, kind: "home", id: "" };
  }

  function languageUrl(code) {
    const here = currentPage();
    return `${SITE_ORIGIN}${pageUrl(here.kind, here.id, code)}`;
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
    if (parsePath(location.pathname).kind !== "other") return;
    const url = new URL(location.href);
    if (lang === "ru") url.searchParams.delete("lang");
    else url.searchParams.set("lang", lang);
    const next = url.pathname + url.search + url.hash;
    if (next !== location.pathname + location.search + location.hash) {
      history.replaceState({}, "", next);
    }
  }

  function pageSeoFallback() {
    const here = currentPage();
    if (typeof CasaMiaSeo !== "undefined" && here.kind === "category") {
      const category = categories.find((item) => item.id === here.id);
      if (category) return CasaMiaSeo.categorySeo(category, lang);
    }
    if (typeof CasaMiaSeo !== "undefined" && here.kind === "product") {
      const product = products.find((item) => item.id === here.id);
      if (product) return CasaMiaSeo.productSeo(product, lang, categories.find((item) => item.id === product.categoryId));
    }
    if (typeof CasaMiaSeo !== "undefined" && here.kind === "home") return CasaMiaSeo.homeSeo(settings, lang);
    return {
      title: localized(settings?.seo?.title) || t("meta_title"),
      description: localized(settings?.seo?.description) || t("meta_description")
    };
  }

  function applySeo(overrides = {}) {
    const fallback = pageSeoFallback();
    const title = overrides.title || fallback.title;
    const description = overrides.description || fallback.description;
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
    return pageUrl("product", id, lang);
  }

  function categoryHref(id) {
    return pageUrl("category", id, lang);
  }

  function homeHref(hash = "") {
    return `${pageUrl("home", "", lang)}${hash}`;
  }

  function setLang(next) {
    if (!SUPPORTED.includes(next)) return;
    localStorage.setItem(LANG_KEY, next);
    const here = parsePath(location.pathname);
    if ((here.kind === "home" || here.kind === "product" || here.kind === "category") && here.lang !== next) {
      location.href = pageUrl(here.kind, here.id, next) + location.hash;
      return;
    }
    lang = next;
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
    const fallback = "/images/brand/card.webp";
    if (!path) return fallback;
    const encoded = String(path)
      .split("/")
      .map((part) => encodeURIComponent(part))
      .join("/");
    if (/^(https?:|\/)/.test(encoded)) return encoded;
    return `/${encoded}`;
  }

  async function loadData() {
    const base = document.body.dataset.base || "";
    const [p, c, s, revRes, galleryRes] = await Promise.all([
      fetch(`${base}data/products.json`).then((r) => r.json()),
      fetch(`${base}data/categories.json`).then((r) => r.json()),
      fetch(`${base}data/settings.json`).then((r) => r.json()),
      fetch(`${base}data/reviews.json`).then((r) => (r.ok ? r.json() : [])).catch(() => []),
      fetch(`${base}data/gallery.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null)
    ]);
    products = p.sort((a, b) => a.order - b.order);
    categories = c.sort((a, b) => a.order - b.order);
    settings = s;
    reviews = (Array.isArray(revRes) && revRes.length ? revRes : s.reviews || [])
      .filter((item) => item.visible !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    gallery = galleryRes && typeof galleryRes === "object" ? galleryRes : gallery;
    const locked = parsePath(location.pathname);
    const pathChoosesLang = locked.kind === "home" || locked.kind === "product" || locked.kind === "category";
    if (!pathChoosesLang && !urlLang && !localStorage.getItem(LANG_KEY) && SUPPORTED.includes(s.defaultLang)) {
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
    if (product.inStock === false) parts.push(`<span class="badge soldout">${t("soldout")}</span>`);
    return parts.length ? `<div class="badges">${parts.join("")}</div>` : "";
  }

  function saleMarkHtml(product) {
    if (!product.badges?.sale) return "";
    return `<span class="sale-mark">${t("sale")}</span>`;
  }

  function productCard(product) {
    const href = productHref(product.id);
    const img = mediaUrl(product.thumbnail || product.images?.[0]);
    const cart = window.CasaMiaCart;
    const fav = cart ? cart.favBtnHtml(product.id) : "";
    const controls = cart ? cart.controlsHtml(product.id) : "";
    return `
      <article class="product-card" data-product-id="${product.id}">
        <div class="thumb-wrap">
          <a class="thumb" href="${href}">
            ${badgeHtml(product)}
            <img src="${img}" alt="${localized(product.name)}" loading="lazy" decoding="async" width="400" height="400" draggable="false">
            ${saleMarkHtml(product)}
          </a>
          ${fav}
        </div>
        <div class="body">
          <a href="${href}"><h3>${localized(product.name)}</h3></a>
          <p class="desc">${localized(product.description)}</p>
          <div class="product-meta">
            <div>
              <div class="price">${formatPrice(product)}</div>
              <div class="weight">${formatWeight(product)}</div>
            </div>
            ${controls}
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
    applyBrandImages();
    applySeo();
  }

  function applyBrandImages() {
    if (!settings) return;
    const brand = settings.brand || {};
    const header = mediaUrl(brand.logoHeader || "images/brand/logo-header.webp");
    const logo = mediaUrl(brand.logo || "images/brand/logo-big.webp");
    const hero = mediaUrl(brand.heroImage || "images/brand/info.webp");
    const about = mediaUrl(brand.aboutImage || "images/brand/logo-big.webp");
    document.querySelectorAll(".logo-img").forEach((img) => {
      img.src = header;
    });
    document.querySelectorAll(".hero-logo").forEach((img) => {
      img.src = logo;
    });
    document.querySelectorAll(".about-photo").forEach((img) => {
      img.src = about;
    });
    document.querySelectorAll(".hero-media img").forEach((img) => {
      img.src = hero;
    });
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

  function isReloadNavigation() {
    try {
      const nav = performance.getEntriesByType("navigation")[0];
      if (nav) return nav.type === "reload";
      return performance.navigation && performance.navigation.type === 1;
    } catch {
      return false;
    }
  }

  function pinTopIfReload() {
    if (!isReloadNavigation()) return;
    if (location.hash) {
      history.replaceState(null, "", location.pathname + location.search);
    }
    window.scrollTo(0, 0);
  }

  if (isReloadNavigation() && "scrollRestoration" in history) {
    history.scrollRestoration = "manual";
  }
  pinTopIfReload();
  window.addEventListener("load", pinTopIfReload);

  return {
    t,
    localized,
    setLang,
    getLang: () => lang,
    loadData,
    visibleProducts,
    getProduct,
    getCategory: (id) => categories.find((c) => c.id === id),
    getAllCategories: () => categories,
    getCategories: () => enabledCategories(),
    getSettings: () => settings,
    getReviews: () => reviews,
    getGallery: () => gallery,
    formatPrice,
    formatWeight,
    orderLink,
    waLink,
    igLink,
    productCard,
    badgeHtml,
    saleMarkHtml,
    mediaUrl,
    bindHeader,
    pinTopIfReload,
    applySeo,
    setJsonLd,
    productHref,
    categoryHref,
    homeHref,
    pageUrl,
    SITE_ORIGIN,
    SUPPORTED
  };
})();
