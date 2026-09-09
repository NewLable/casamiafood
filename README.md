# Casa Mia Food

Домашняя кухня в Анталии · https://casamiafood.vip

## Локальный просмотр

Нужен простой HTTP-сервер (fetch JSON не работает с `file://`):

```bash
npx --yes serve .
```

Откройте адрес из терминала (обычно http://localhost:3000).

- Сайт: `/`
- Карточка товара (QR): `/product.html?id=ravioli-salmon`
- Админка: `/admin.html`

## Админка

**Пароль:** `CasaMiaHome`

Инструкция: [docs/ADMIN.md](docs/ADMIN.md)  
Деплой: [docs/DEPLOY.md](docs/DEPLOY.md)  
План: [docs/PLAN.md](docs/PLAN.md)

## Контакты в данных

- WhatsApp: +90 501 338 11 26  
- Instagram: [@casa_mia_antalya](https://instagram.com/casa_mia_antalya)

## Структура

```
index.html      — лендинг + каталог
product.html    — страница товара / QR
admin.html      — админка
data/           — products, categories, settings
images/         — фото для сайта
images_food/    — исходники этикеток
```
