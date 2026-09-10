# Casa Mia Food

Домашняя кухня в Анталии · https://casamiafood.vip

Статический сайт **HTML + CSS + Vanilla JavaScript** на **GitHub Pages**. Сервера нет: меню, цены и тексты живут в JSON, а админка публикует их через GitHub REST API.

## Локальный просмотр

Нужен простой HTTP-сервер (`fetch` не работает с `file://`):

```bash
npx --yes serve .
```

- Сайт: `/`
- Карточка товара (QR): `/product.html?id=ravioli-salmon`
- Админка: `/admin.html`
- Инструкция владельца: `/owner-guide.html`

## Админка

**Пароль:** `CasaMiaHome`

После входа владелец правит товары и нажимает **💾 Сохранить изменения**. JSON и фото уходят в GitHub, Pages обновляет сайт сам.

Справка встроена во вкладку **📖 Помощь владельцу**. Текстовая копия: [docs/OWNER_GUIDE.md](docs/OWNER_GUIDE.md).

Деплой домена: [docs/DEPLOY.md](docs/DEPLOY.md)

## Casa Mia CMS

Админка — это полноценная CMS без бэкенда. Браузер читает JSON, держит правки в памяти и одной кнопкой записывает файлы в репозиторий.

### Структура проекта

```
index.html          — витрина
admin.html          — CMS
owner-guide.html    — инструкция владельца
product.html        — страница товара / QR

/data
  products.json
  categories.json
  settings.json
  reviews.json

/images/products    — фото товаров (WebP после сохранения)
/images/reviews     — фото отзывов (необязательно)

/js
  app.js            — публичный i18n и загрузка данных
  menu.js           — каталог
  product.js        — карточка товара
  admin.js          — CMS
  github-api.js     — GitHub REST API
  image-manager.js  — сжатие фото и WebP
  i18n.js           — поля RU / UA / TR / EN

/css
  style.css
  admin.css

/docs
  OWNER_GUIDE.md
```

### GitHub API

`js/github-api.js` пишет файлы через GitHub REST:

1. Берёт SHA текущего файла (Contents API).
2. Кодирует JSON или изображение в Base64.
3. Собирает один commit (Git Database API: blobs → tree → commit → ref). Если токен не умеет git-data, каждый файл уходит Contents API `PUT`.

Сообщение commit формируется само:

```
Update Casa Mia content — 2026-09-10 21:45
```

Нужен **Fine-grained Personal Access Token** с правом **Contents: Read and write** только для этого репозитория. Username / repo / branch задаются в админке.

### localStorage и sessionStorage

| Что | Где |
|-----|-----|
| Пароль админки (флаг сессии) | `sessionStorage` |
| GitHub username, репозиторий, ветка | `localStorage` |
| GitHub token | по умолчанию `sessionStorage` (исчезает после закрытия браузера) |
| GitHub token при галочке «Запомнить этот компьютер» | `localStorage` |

Токен **никогда** не попадает в репозиторий и в JSON. На чужом компьютере галочку не ставить.

### Мультиязычная структура JSON

Все тексты — объект из четырёх ключей. Русский никуда не копируется автоматически.

```json
{
  "name": {
    "ru": "Пельмени куриные",
    "ua": "Пельмені курячі",
    "tr": "Tavuk mantı",
    "en": "Chicken pelmeni"
  }
}
```

Числа и контакты общие: цена, вес, порядок, телефон, WhatsApp, Instagram.

На сайте, если выбранный язык пустой, показывается **русский**.

### Публикация GitHub Pages

После успешного commit GitHub Pages собирает сайт с ветки `main` (корень репозитория). Обычно 20–60 секунд. Отдельный сервер, Firebase и Node.js backend не используются.

## Контакты в данных

- WhatsApp: +90 501 338 11 26
- Instagram: [@casa_mia_antalya](https://instagram.com/casa_mia_antalya)
