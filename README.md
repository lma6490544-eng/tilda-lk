# OPEN-LK — GitHub Pages package for Tilda

Это готовый пакет без npm, сборки и дополнительных действий в Tilda.

## Что загрузить в GitHub

Загрузить оба файла в корень репозитория:

- `open-lk-app.js` — единственная точка входа, которую подключает Tilda.
- `open-lk-ui.js` — текущий UI-прототип.

GitHub Pages должен публиковать корень репозитория.

## Что оставить в Tilda

В каждом T123:

```html
<div id="root"></div>
<script src="https://lma6490544-eng.github.io/tilda-lk/open-lk-app.js"></script>
```

## Режимы

- Без авторизационного токена запускается текущий demo UI.
- При наличии `tildaAuthToken` или `authToken` сначала запрашиваются реальные `/lk/user`, `/subscriptions/plans` и `/subscriptions/organizations/{organizationId}`.
- При ошибке API demo-данные не подставляются.
- `x-platform-version: web-1.0.0` отправляется всегда.
- `X-Subscribe-Service-Token` из браузера не отправляется.

## Важно

Этот вариант специально не добавляет новый UI и не меняет Tilda-страницы. Он использует предоставленные backend-контракты для первичной загрузки профиля, тарифов и подписок.

Checkout/платёжные действия, payer CRUD, чеки и уведомления не имитируются реальными данными, пока для них не хватает предоставленных контрактов/данных (в частности полного ответа POST checkout и projectId).
