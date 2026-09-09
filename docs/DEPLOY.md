# Деплой на casamiafood.vip

## 1. GitHub репозиторий

1. Создайте репозиторий (например `casamiafood`)
2. Залейте код на `main`
3. Settings → Pages → Source: **Deploy from a branch** → Branch `main` / root (`/`)

Сайт появится на `https://<user>.github.io/<repo>/`.

## 2. Домен casamiafood.vip

У регистратора DNS добавьте:

**Вариант A (apex + www через A-записи GitHub Pages):**

| Type | Name | Value |
|------|------|--------|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | `<user>.github.io` |

В GitHub Pages → Custom domain: `casamiafood.vip` → включите **Enforce HTTPS**.

## 3. Проверка

- Открыть https://casamiafood.vip с телефона
- Проверить меню, язык, кнопку WhatsApp
- Открыть `product.html?id=ravioli-salmon` (QR-карточка)
- Войти в `/admin.html`

## 4. После правок прайса

Админка → Скачать JSON → заменить `data/*.json` → `git add` → `git commit` → `git push`.
