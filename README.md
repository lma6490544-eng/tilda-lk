# OPEN-LK — GitHub files for Tilda

Загрузить все файлы этой папки в репозиторий GitHub Pages `tilda-lk`.

## Файлы

- `open-lk-app.js` — входная точка для Tilda, API, авторизация, регистрация, загрузка реальных данных.
- `open-lk-ui.js` — текущий UI кабинета.
- `T123-login.html` — содержимое блока T123 для отдельной страницы Tilda `/login`.

## Tilda

Для страницы `/login`:

1. Создать страницу Tilda с URL `/login`.
2. Добавить блок T123.
3. Вставить содержимое `T123-login.html`.
4. Отключить шапку и подвал Tilda для этой страницы.

Остальные страницы продолжают подключать `open-lk-app.js` как раньше.

## Сейчас подключено

- `POST /v1/auth/login`
- `POST /v1/auth/user/phone/pin`
- `POST /v1/auth/user/phone/pin/confirm`
- `POST /v1/auth/user`
- `GET /v1/lk/user`
- `GET /v1/subscriptions/plans`
- `GET /v1/subscriptions/organizations/{organizationId}`
- `GET /v1/subscriptions/organizations/{organizationId}/{subscriptionId}`
- `GET /v1/subscriptions/organizations/{organizationId}/{subscriptionId}/schedule`
- `POST /v1/subscriptions/organizations/{organizationId}/{subscriptionId}/cancel`
- `POST /v1/subscriptions/checkouts`
- `GET /v1/subscriptions/organizations/{organizationId}/checkouts/{checkoutId}`

Сервисный `X-Subscribe-Service-Token` на фронтенде не используется.

## Demo

Demo остаётся отдельным сценарием без регистрации. Для обычных страниц без авторизации пользователь направляется на `/login`.


## Реальные subscription actions

Подключены к реальному режиму кабинета:
- `GET /v1/subscriptions/organizations/{organizationId}/{subscriptionId}` — при открытии управления подпиской.
- `POST /v1/subscriptions/organizations/{organizationId}/{subscriptionId}/cancel` — отмена автопродления; после ответа состояние перечитывается из API.
- `POST /v1/subscriptions/checkouts` — создание checkout для выбранного тарифа.
- `GET /v1/subscriptions/organizations/{organizationId}/checkouts/{checkoutId}` — получение результата checkout и `paymentLink`.

Для checkout backend требует `projectId`. В текущем пакете он не придумывается и не берётся из `organizationId`: если backend действительно требует его, перед загрузкой приложения должен быть задан `window.__OPEN_LK_PROJECT_ID__`.
