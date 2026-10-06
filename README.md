# OPEN-LK — GitHub Pages

Готовые файлы для GitHub Pages. Сборка/npm не нужны.

## Файлы
- `open-lk-app.js` — единственная точка подключения из Tilda.
- `open-lk-ui.js` — текущий React-интерфейс.

## Tilda
Подключать только:
`https://lma6490544-eng.github.io/tilda-lk/open-lk-app.js`

## Реальная авторизация
- POST `/v1/auth/login`
- POST `/v1/auth/user/phone/pin`
- POST `/v1/auth/user/phone/pin/confirm`
- POST `/v1/auth/user`
- GET `/v1/lk/user`

После успешной авторизации token сохраняется в `tildaAuthToken` и `authToken`, после чего данные кабинета загружаются с API.

Демо без регистрации остаётся доступным только через кнопку открытия демо.

Пароль в интерфейсе больше не ограничен `minLength=8`.

`X-Subscribe-Service-Token` из браузера не отправляется.
