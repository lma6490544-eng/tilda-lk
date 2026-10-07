# Личный кабинет ИТ-Прораб (LK)

Личный кабинет реализован как React-интерфейс, встроенный в Tilda через внешний JavaScript-файл. Проект поддерживает два режима:

- **REAL** — данные и действия выполняются через API;
- **DEMO** — используется локальный демонстрационный сценарий с mock-данными.

Главный принцип проекта: **UI и существующая логика ЛК не должны самовольно изменяться при подключении API**. API является источником реальных данных, а интерфейс отображает эти данные в существующей структуре кабинета.

---

## 1. Структура проекта

В GitHub-пакете находятся:

```text
open-lk-app.js   — интеграционный слой, API, авторизация, real/demo state, роутинг
open-lk-ui.js    — существующий React UI личного кабинета
open-lk.css      — стили личного кабинета
README.md        — документация проекта
```

HTML-страниц Tilda в GitHub-пакете **нет**.

Tilda используется как оболочка для отдельных маршрутов, а React-приложение подключается внешним JS:

```html
<div id="root"></div>
<script src="https://lma6490544-eng.github.io/tilda-lk/open-lk-app.js"></script>
```

---

# 2. Архитектура

Схема работы:

```text
Tilda
  │
  ├── /login
  ├── /subscriptions
  ├── /tariffs
  ├── /profile
  └── /help
       │
       ▼
  open-lk-app.js
       │
       ├── Auth API
       ├── LK User API
       ├── Subscriptions API
       ├── Billing API
       ├── Payers API
       ├── Cart Payment API
       └── Feedback API
       │
       ▼
  open-lk-ui.js
       │
       ▼
  React UI
```

`open-lk-app.js` отвечает за:

- API-запросы;
- авторизацию;
- хранение токена;
- получение пользователя;
- получение организации;
- получение подписок;
- получение тарифов;
- получение плательщиков;
- оплату;
- отмену автопродления;
- обновление профиля;
- смену пароля;
- отправку обратной связи;
- DEMO/REAL режим;
- маршрутизацию;
- выход из аккаунта;
- обработку ошибок.

`open-lk-ui.js` отвечает за отображение существующего интерфейса и вызов действий, предоставленных интеграционным слоем.

---

# 3. Базовый API

Текущий API:

```text
https://itprorab.metasymbiont.com/api/v1
```

В запросах используется:

```http
x-platform-version: web-1.0.0
```

Авторизация реального режима:

```http
Authorization: Bearer <token>
```

Токен хранится в `localStorage` под одним из поддерживаемых ключей:

```text
tildaAuthToken
authToken
```

### Важно

OpenAPI содержит внутренний заголовок:

```http
X-Subscribe-Service-Token
```

Этот токен предназначен для внутреннего взаимодействия сервисов и **не должен передаваться из браузера**.

Браузер работает через публичный авторизованный шлюз/API и JWT пользователя.

---

# 4. Авторизация

## 4.1 Вход

```http
POST /auth/login
```

Используется для авторизации пользователя.

После успешного входа токен сохраняется и пользователь направляется:

```text
/login
   ↓
/subscriptions
```

---

## 4.2 Регистрация — запрос PIN

```http
POST /auth/user/phone/pin
```

Используется для отправки SMS-кода на телефон.

---

## 4.3 Подтверждение PIN

```http
POST /auth/user/phone/pin/confirm
```

Проверяется шестизначный код.

Телефон нормализуется к формату:

```text
+79991234567
```

В UI используется маска:

```text
+7 (999) 123-45-67
```

---

## 4.4 Создание пользователя

```http
POST /auth/user
```

Используемые данные:

```json
{
  "login": "+79991234567",
  "password": "...",
  "politicAgreements": true,
  "hash": "uuid"
}
```

После регистрации:

1. сохраняется JWT;
2. запрашивается пользователь через `GET /lk/user`;
3. профиль заполняется через `PUT /lk/user`;
4. DEMO-режим отключается;
5. выполняется переход на `/subscriptions`.

---

# 5. Пользователь

## Получение текущего пользователя

```http
GET /lk/user
```

Используется для:

- определения пользователя;
- получения `id`;
- получения профиля;
- определения организации/участия пользователя.

---

## Обновление профиля

```http
PUT /lk/user
```

Требуется:

```http
X-User-Id: <userId>
```

Передаются только заполненные изменяемые поля:

```json
{
  "id": "user-id",
  "name": "...",
  "surname": "...",
  "mail": "...",
  "phoneNumber": "+79991234567"
}
```

Поля профиля в UI являются необязательными.

То есть пустое поле не должно принудительно перезаписывать существующее значение на backend.

---

# 6. Смена пароля

```http
PUT /auth/user/password
```

Body:

```json
{
  "oldPassword": "...",
  "newPassword": "...",
  "newPasswordConfirm": "..."
}
```

Проверки на клиенте:

- текущий пароль заполнен;
- новый пароль заполнен;
- новый пароль совпадает с подтверждением.

---

# 7. Выход

При выходе:

1. удаляются токены;
2. отключается DEMO/REAL состояние;
3. пользователь направляется на:

```text
/login
```

Токены удаляются для обоих поддерживаемых ключей:

```text
tildaAuthToken
authToken
```

---

# 8. Роутинг

Текущая схема:

| URL | Экран |
|---|---|
| `/login` | Авторизация |
| `/subscriptions` | Мои подписки |
| `/tariffs` | Тарифы |
| `/profile` | Профиль |
| `/help` | Ответы на вопросы |

Неизвестный URL:

- если есть токен → `/subscriptions`;
- если токена нет → `/login`.

---

## Навигация

### Мои подписки

```text
/subscriptions
```

### Тарифы

```text
/tariffs
```

### Профиль

```text
/profile
```

### Помощь

```text
/help
```

### Открыть каталог / подключить продукт

Переходят на:

```text
/tariffs
```

Это важно: экран тарифов не должен оставаться только внутренним состоянием React — маршрут должен соответствовать URL.

---

# 9. Организация

Подписки и покупки привязаны к:

```text
organizationId
```

Организация определяется из данных пользователя/его организаций.

В текущем UI отдельного переключателя организаций нет.

Выбранная организация используется далее во всех запросах:

```text
/subscriptions/organizations/{organizationId}/...
```

---

# 10. Мои подписки

Основной новый endpoint:

```http
GET /subscriptions/organizations/{organizationId}/my-subscriptions
```

Параметр:

```text
filter=ALL
filter=ACTIVE
filter=COMPLETED
```

По контракту:

- `ALL` — текущие и завершённые;
- `ACTIVE` — доступ действует сейчас;
- `COMPLETED` — доступ ранее был оплачен, но больше не действует.

Неоплаченные заказы и подписки без первой оплаты не входят в этот список.

---

## Формат данных

Элемент подписки содержит:

```text
subscriptionId
product
plan
status
access
payer
```

### Product

```text
code
name
description
iconKey
```

### Plan

```text
code
name
```

### Access

Содержит информацию о текущем доступе:

```text
hasAccess
until
daysRemaining
```

### Payer

Может отсутствовать.

---

# 11. Детальная информация о подписке

Используется старый совместимый endpoint:

```http
GET /subscriptions/organizations/{organizationId}/{subscriptionId}
```

Также используется расписание:

```http
GET /subscriptions/organizations/{organizationId}/{subscriptionId}/schedule
```

Расписание используется для отображения информации о будущих списаниях/периодах там, где это предусмотрено существующим UI.

---

# 12. Отмена автопродления

```http
POST /subscriptions/organizations/{organizationId}/{subscriptionId}/cancel?actorUserId={userId}
```

Отмена выполняется для конкретной подписки.

После успешной отмены состояние ЛК обновляется повторным запросом данных.

## Важное ограничение

В текущем API нет endpoint для повторного включения автопродления.

Поэтому UI не должен показывать:

```text
Включить автопродление
```

если подписка уже отменена.

Доступная операция:

```text
Отменить автопродление
```

---

# 13. Тарифы

Основной endpoint:

```http
GET /subscriptions/organizations/{organizationId}/tariffs
```

Параметр:

```text
periodMonths=1
periodMonths=3
periodMonths=12
```

Backend возвращает:

```text
activeTariffs
availableTariffs
periodMonths
supportedPeriodsMonths
currency
pricingNotice
```

---

# 14. Принцип расчёта цены

**Frontend не пересчитывает стоимость самостоятельно.**

Backend является источником истины для:

- обычной цены;
- скидки;
- размера скидки;
- итоговой суммы;
- доплаты при upgrade;
- стоимости продления;
- стоимости подключения.

В тарифе используются:

```text
regularAmountKopeks
discountAmountKopeks
discountPercent
totalAmountKopeks
priceStatus
canPurchase
```

Суммы передаются в копейках.

Для отображения:

```text
amount / 100
```

Но новая сумма не должна вычисляться на frontend из количества месяцев или процента скидки.

---

# 15. DEMO-тарифы

В API существует понятие:

```text
priceStatus = DEMO
```

DEMO-тариф:

- может отображаться;
- может использоваться для демонстрации;
- **не должен отправляться на реальную оплату**.

Реальная покупка допускается только для доступного LIVE-тарифа.

---

# 16. Плательщики

## Получение плательщиков для оплаты

```http
GET /subscriptions/organizations/{organizationId}/payers/details
```

Возвращает плательщиков организации с реквизитами.

Типы:

```text
PERSON
COMPANY
```

Для физического лица реквизиты организации отсутствуют.

---

# 17. Создание плательщика — физическое лицо

```http
POST /subscriptions/organizations/{organizationId}/payers/person
```

Обязательные поля:

```text
name
email
```

Телефон:

```text
необязательный
```

Пример:

```json
{
  "name": "Иван Иванов",
  "email": "ivan@example.com",
  "phone": "+79991234567"
}
```

---

# 18. Создание плательщика — организация

```http
POST /subscriptions/organizations/{organizationId}/payers/company
```

Обязательные:

```text
name
email
inn
kpp
ogrn
legalAddress
account
bik
bank
```

Необязательные:

```text
phone
contact
correspondentAccount
```

Форматные проверки:

- ИНН;
- КПП;
- ОГРН;
- расчётный счёт;
- БИК.

Проверка не выполняется через внешние реестры или банк — API проверяет формат.

---

# 19. Получение плательщика

```http
GET /subscriptions/organizations/{organizationId}/payers/{payerId}
```

---

# 20. Изменение плательщика

```http
PUT /subscriptions/organizations/{organizationId}/payers/{payerId}
```

Изменения относятся к будущим заказам.

Старые заказы используют сохранённый snapshot реквизитов.

---

# 21. Плательщик по умолчанию

```http
PUT /subscriptions/organizations/{organizationId}/payers/{payerId}/default
```

После этого плательщик становится выбранным по умолчанию.

---

# 22. Оплата тарифов

Новая оплата работает как двухэтапный процесс:

```text
Выбор тарифов
     ↓
Выбор плательщика
     ↓
POST payment-quotes
     ↓
Получение окончательного расчёта
     ↓
POST cart-checkouts
     ↓
Получение paymentLink
     ↓
Оплата
     ↓
PAID после подтверждения банка
```

---

# 23. Расчёт корзины

```http
POST /subscriptions/organizations/{organizationId}/payment-quotes
```

Body:

```json
{
  "tariffIds": [
    "tariff-id-1",
    "tariff-id-2"
  ],
  "payerId": "payer-id"
}
```

Ограничения:

- минимум один тариф;
- тарифы должны быть LIVE;
- нельзя выбрать один тариф дважды;
- для одного продукта нельзя выбрать несколько тарифов.

---

# 24. Что возвращает payment quote

```text
quoteId
organizationId
payerId
createdAt
validUntil
currency
items
totalAmountKopeks
```

Каждая строка:

```text
tariffId
tariffCode
productName
planName
periodMonths
operationType
description
amountKopeks
```

`operationType`:

```text
NEW
RENEWAL
UPGRADE
```

Например backend сам может вернуть описание:

```text
Апгрейд · доплата за 18 дн.
```

Frontend не должен самостоятельно вычислять такую доплату.

Quote является краткоживущим расчётом.

---

# 25. Создание заказа и оплаты

```http
POST /subscriptions/organizations/{organizationId}/cart-checkouts
```

Используется:

```http
Idempotency-Key: <uuid>
```

В текущей frontend-реализации отправляется:

```json
{
  "quoteId": "..."
}
```

`payerUserId` из браузера не передаётся: пользователь определяется шлюзом по JWT.

> В OpenAPI поле `payerUserId` всё ещё присутствует в схеме `SubscribeCartCheckoutRequestModel` как required, но одновременно описание endpoint говорит, что браузер его не передаёт и шлюз получает его из JWT. Поэтому frontend следует текущему правилу из описания endpoint и не отправляет внутренний `payerUserId`.

---

# 26. Idempotency-Key

Для создания оплаты генерируется:

```js
crypto.randomUUID()
```

и передаётся:

```http
Idempotency-Key
```

Это защищает от повторного создания одного заказа при повторной отправке запроса.

Повтор с тем же ключом и тем же body должен возвращать тот же заказ.

---

# 27. Статусы checkout

Checkout может находиться в состояниях:

```text
CREATING
UNKNOWN
AWAITING_PAYMENT
PAID
REJECTED
```

Важно:

```text
paymentLink != успешная оплата
```

Создание ссылки означает только создание заказа/платежа.

`PAID` появляется после подтверждения платежа банком.

---

# 28. Проверка статуса оплаты

Для нового cart checkout:

```http
GET /subscriptions/organizations/{organizationId}/cart-checkouts/{checkoutId}
```

Также существует старый endpoint:

```http
GET /subscriptions/organizations/{organizationId}/checkouts/{checkoutId}
```

Они используются в зависимости от сценария/совместимости.

---

# 29. История заказов

```http
GET /subscriptions/organizations/{organizationId}/checkouts
```

Параметры:

```text
limit
offset
```

По умолчанию в frontend:

```text
limit = 50
offset = 0
```

История содержит заказы, в том числе разовые покупки START.

---

# 30. История платежей

```http
GET /subscriptions/organizations/{organizationId}/payments
```

Параметры:

```text
limit
offset
```

Frontend по умолчанию:

```text
limit = 50
offset = 0
```

Возвращаются подтверждённые платежи.

---

# 31. Документы

Текущий endpoint:

```http
GET /subscriptions/organizations/{organizationId}/documents
```

Параметры:

```text
limit
offset
```

Документ соответствует одной подтверждённой банковской операции, в том числе повторному списанию подписки.

Доступны:

```text
id
checkoutId
subscriptionId
payerId
planCode
bankOperationId
bankPaymentId
bankPaymentType
amountKopeks
currency
bankVerificationStatus
bankCreatedAt
bankPaidAt
fiscalReceiptStatus
receiptEmail
items
```

Статус банка:

```text
VERIFIED
BANK_UNAVAILABLE
```

Статус фискального чека:

```text
REQUESTED_DELIVERY_UNVERIFIED
NOT_REQUESTED
BANK_UNAVAILABLE
```

### Важное ограничение текущего API

По текущему `api(1).yaml` API Точки не возвращает:

- PDF чека;
- фискальный номер;
- дату фискализации;
- подтверждение доставки фискального чека.

Поэтому frontend не должен придумывать эти значения.

---

# 32. Элемент документа

Каждая позиция документа:

```text
name
amountKopeks
quantity
vatType
```

---

# 33. Обратная связь / техническая поддержка

```http
POST /tech-support/feedback
```

Body:

```json
{
  "message": "...",
  "timestamp": "2026-10-07T...",
  "source": "web"
}
```

После успешной отправки UI показывает:

```text
Принято в работу! Спасибо, что улучшаете продукт вместе с нами!
```

---

# 34. Что API не должен делать frontend самостоятельно

Frontend не должен самостоятельно вычислять:

- скидки;
- стоимость upgrade;
- доплату за оставшиеся дни;
- итоговую стоимость корзины;
- период подписки по приблизительному количеству дней;
- статус успешной оплаты до подтверждения backend;
- фискальный номер;
- дату фискализации;
- PDF чека.

Если backend возвращает готовую сумму — показывается именно она.

---

# 35. Состояние REAL

В реальном режиме формируется состояние примерно следующей структуры:

```js
{
  schema: 2,
  clock: "...",
  session: true,

  profile: {...},

  payers: [...],
  cards: [...],
  subs: [...],

  orders: [...],
  tickets: [...],
  events: [...],

  user: {...},
  organizationId: "...",

  plans: [...],
  tariffsByPeriod: {
    1: [...],
    3: [...],
    12: [...]
  },

  apiErrors: {
    ...
  }
}
```

Это внутреннее состояние адаптирует реальные API-модели под существующий UI.

---

# 36. Маппинг тарифов

API tariff преобразуется во внутреннюю модель UI:

```text
tariffId
tariffCode
product
name
tier
price
description
icon
periodMonths
regularPrice
discountAmount
discountPercent
totalAmount
priceStatus
canPurchase
```

Основной источник цены:

```text
totalAmountKopeks
```

---

# 37. Маппинг подписок

Новый `my-subscriptions` API преобразуется в карточку существующего UI.

Используются:

```text
product.code
product.name
product.description
product.iconKey

plan.code
plan.name

status
access
payer
```

Для активного периода дополнительно используется информация старого subscription API, если она нужна существующему экрану деталей.

---

# 38. Обработка ошибок API

Общий API-клиент разбирает ошибки backend.

При наличии используются:

```text
errorCause
message
detail
error
```

Также сохраняются:

```text
status
errorCode
traceId
apiResponse
```

Пример backend-ошибки:

```json
{
  "errorCode": "E000",
  "errorCause": "Внутренний доступ к сервису подписок не настроен",
  "traceId": "...",
  "spanId": "...",
  "timestamp": "...",
  "service": "it-prorab-orchestrator-old"
}
```

Такая ошибка означает проблему внутренней конфигурации/доступа backend, а не проблему React UI.

---

# 39. Поведение при 401/403

Если защищённый API возвращает:

```text
401
403
```

сессия считается недействительной.

Выполняется logout:

```text
очистка токена
     ↓
очистка session/demo state
     ↓
/login
```

---

# 40. DEMO-режим

DEMO сохраняется специально для демонстрации UI без реального API.

В DEMO используются mock-данные:

### Компания

```text
ООО «СтройПроект»
finance@example.com
```

### Физическое лицо

```text
Алексей Соколов
alexey@example.com
+7 900 000-00-00
```

### Карта

```text
Демонстрационная карта
•••• 4242
12/29
```

### Демонстрационные подписки

```text
sub-1 — prorab-standard
sub-2 — symbiont
```

DEMO-данные не должны попадать в реальные API-запросы.

---

# 41. Переключение DEMO / REAL

В приложении используются внутренние флаги:

```text
window.__OPEN_LK_DEMO_MODE__
window.__OPEN_LK_REAL_MODE__
window.__OPEN_LK_REAL_STATE__
```

Если установлен реальный state:

```text
__OPEN_LK_REAL_STATE__
```

он имеет приоритет.

Если включён DEMO:

```text
__OPEN_LK_DEMO_MODE__
```

используется mock state.

Это позволяет сохранить исходный демонстрационный сценарий, не смешивая его с реальными данными.

---

# 42. Главные frontend API-обёртки

В браузере доступны:

```text
window.__OPEN_LK_AUTH__
window.__OPEN_LK_SUBSCRIPTIONS__
window.__OPEN_LK_PHONE__
window.__OPEN_LK_FEEDBACK__
window.__OPEN_LK_LOGOUT__
```

---

## Auth

Основные операции:

```text
login
sendPhonePin
confirmPhonePin
register
updateUser
changePassword
```

---

## Subscriptions

Основные операции:

```text
getPlans
getOrganizationSubscriptions
getSubscription
getSchedule
cancel

getCheckout

getMySubscriptions
getTariffs

getPayerDetails
createPersonPayer
createCompanyPayer
getPayer
updatePayer
setDefaultPayer

listCheckouts
listPayments

quoteCartPayment
createCartCheckout
getCartCheckout
```

---

# 43. Реальный сценарий загрузки ЛК

После открытия защищённой страницы:

```text
1. Проверяется route
2. Проверяется наличие JWT
3. Если JWT нет → /login
4. Если JWT есть → GET /lk/user
5. Определяется organizationId
6. Загружаются:
   - my-subscriptions
   - tariffs 1 месяц
   - tariffs 3 месяца
   - tariffs 12 месяцев
   - payers/details
   - checkouts
   - payments
7. Формируется real state
8. React UI получает реальные данные
```

Ошибки отдельных API сохраняются отдельно, чтобы отказ одного endpoint не обязательно ломал весь кабинет.

---

# 44. Реальный сценарий покупки

```text
1. Пользователь открывает /tariffs
2. Backend отдаёт доступные тарифы
3. Пользователь выбирает тариф
4. Выбирается плательщик
5. Frontend отправляет payment-quotes
6. Backend рассчитывает:
   - NEW / RENEWAL / UPGRADE
   - скидки
   - доплаты
   - итоговую сумму
7. Frontend показывает результат backend
8. Frontend создаёт cart-checkout
9. Передаёт Idempotency-Key
10. Получает checkout
11. Открывается paymentLink
12. Пользователь оплачивает
13. Backend получает подтверждение банка
14. Checkout становится PAID
15. Подписка создаётся/продлевается
16. ЛК обновляет данные
```

---

# 45. Реальный сценарий продления

Продление выполняется через тот же cart flow.

Backend определяет:

```text
operationType = RENEWAL
```

Frontend не должен самостоятельно определять стоимость продления.

---

# 46. Реальный сценарий upgrade

Upgrade также выполняется через cart flow.

Backend определяет:

```text
operationType = UPGRADE
```

Backend возвращает готовую сумму доплаты.

Например:

```text
Апгрейд · доплата за 18 дн.
```

Frontend только отображает полученное описание и сумму.

---

# 47. Реальный сценарий отмены

```text
Открыть подписку
      ↓
Отменить автопродление
      ↓
POST .../{subscriptionId}/cancel
      ↓
Обновить состояние ЛК
```

Важно: отмена автопродления не обязательно означает немедленную потерю доступа.

Backend может сохранять оплаченный период.

---

# 48. Что пока не реализовано отдельным API

В текущем API нет отдельного endpoint для:

```text
Включить автопродление обратно
```

Поэтому соответствующая кнопка не должна появляться.

Также текущий API документов не предоставляет:

```text
PDF чека
фискальный номер
дату фискализации
```

---

# 49. Tilda

Для каждой страницы Tilda используется соответствующий URL.

Рекомендуемая структура:

```text
/login
/subscriptions
/tariffs
/profile
/help
```

На странице должен присутствовать root:

```html
<div id="root"></div>
```

и подключение:

```html
<script src="https://lma6490544-eng.github.io/tilda-lk/open-lk-app.js"></script>
```

Tilda отвечает за страницу/маршрут и оболочку.

React отвечает за содержимое личного кабинета.

---

# 50. GitHub Pages

Основной внешний JS подключается из GitHub Pages.

После публикации необходимо убедиться, что:

```text
open-lk-app.js
open-lk-ui.js
open-lk.css
```

доступны по публичным URL.

Если после обновления GitHub Pages/Tilda продолжает показывать старый JS, возможна проблема кеширования браузера/CDN. В таком случае необходимо проверить актуальность подключаемого ресурса и cache-busting.

---

# 51. Изменение API

При изменении backend API:

1. сначала обновляется OpenAPI;
2. проверяется фактический контракт;
3. обновляется API-слой `open-lk-app.js`;
4. проверяется mapping API → внутренний state;
5. только после этого изменяется UI, если изменение действительно требуется.

Нельзя добавлять frontend-расчёты, если backend уже возвращает готовое значение.

---

# 52. Совместимость старых и новых endpoint

В проекте одновременно используются новые и старые контракты.

### Новые для ЛК

```text
my-subscriptions
tariffs
payers/details
payers/person
payers/company
payment-quotes
cart-checkouts
```

### Старые/совместимые

```text
subscriptions
subscription details
schedule
cancel
checkouts
payments
plans
```

Причина — существующий UI уже использует часть старой модели данных, а новые endpoint дают более подходящие данные для страниц ЛК.

Не следует удалять старые endpoint только потому, что появились новые.

---

# 53. Безопасность

Нельзя:

- хранить `X-Subscribe-Service-Token` в frontend;
- вставлять внутренние сервисные токены в Tilda;
- отправлять внутренние credentials в GitHub;
- хардкодить пользовательские JWT;
- использовать DEMO-данные для реальной оплаты;
- доверять цене, рассчитанной frontend;
- считать checkout успешным только из-за наличия paymentLink.

Можно:

- хранить пользовательский JWT в предусмотренном frontend-хранилище;
- отправлять JWT как Bearer;
- использовать `Idempotency-Key`;
- получать актуальные цены и статусы с backend.

---

# 54. Стабильность и защита от повторных действий

Для оплаты используется idempotency.

Для обновления данных после важных действий выполняется refresh:

```text
cancel subscription
update profile
create/finish payment flow
```

После изменения backend state UI должен получать актуальное состояние, а не пытаться угадать его локально.

---

# 55. Что является источником истины

| Данные | Источник |
|---|---|
| Пользователь | `/lk/user` |
| Авторизация | Auth API / JWT |
| Организация | API пользователя/организаций |
| Мои подписки | `my-subscriptions` |
| Тарифы | `tariffs` |
| Цена | Backend |
| Скидка | Backend |
| Upgrade | Backend |
| Renewal | Backend |
| Плательщики | `payers/details` |
| Расчёт оплаты | `payment-quotes` |
| Заказ | `cart-checkouts` |
| Статус оплаты | Backend + банк |
| Платежи | `payments` |
| Заказы | `checkouts` |
| Отмена автопродления | `cancel` |
| Профиль | `/lk/user` |
| Пароль | `/auth/user/password` |
| Feedback | `/tech-support/feedback` |
| DEMO | локальный mock state |

---

# 56. Полный список endpoint, используемых/поддерживаемых проектом

## Auth

```text
POST /auth/login
POST /auth/user/phone/pin
POST /auth/user/phone/pin/confirm
POST /auth/user
PUT  /auth/user/password
```

## User

```text
GET /lk/user
PUT /lk/user
```

## Subscriptions

```text
GET  /subscriptions/plans
GET  /subscriptions/organizations/{organizationId}
GET  /subscriptions/organizations/{organizationId}/{subscriptionId}
GET  /subscriptions/organizations/{organizationId}/{subscriptionId}/schedule
POST /subscriptions/organizations/{organizationId}/{subscriptionId}/cancel
GET  /subscriptions/organizations/{organizationId}/checkouts/{checkoutId}
```

## My Subscriptions

```text
GET /subscriptions/organizations/{organizationId}/my-subscriptions
```

## Tariffs

```text
GET /subscriptions/organizations/{organizationId}/tariffs
```

## Payers

```text
GET  /subscriptions/organizations/{organizationId}/payers/details
POST /subscriptions/organizations/{organizationId}/payers/person
POST /subscriptions/organizations/{organizationId}/payers/company
GET  /subscriptions/organizations/{organizationId}/payers/{payerId}
PUT  /subscriptions/organizations/{organizationId}/payers/{payerId}
PUT  /subscriptions/organizations/{organizationId}/payers/{payerId}/default
```

## Billing history

```text
GET /subscriptions/organizations/{organizationId}/checkouts
GET /subscriptions/organizations/{organizationId}/payments
GET /subscriptions/organizations/{organizationId}/documents
```

## Cart Payment

```text
POST /subscriptions/organizations/{organizationId}/payment-quotes
POST /subscriptions/organizations/{organizationId}/cart-checkouts
GET  /subscriptions/organizations/{organizationId}/cart-checkouts/{checkoutId}
```

## Feedback

```text
POST /tech-support/feedback
```

---

# 57. Endpoint из общего API, который не является основным frontend-flow

OpenAPI также содержит низкоуровневые/internal операции подписок, мест и доступа, например:

```text
GET  /subscriptions/organizations/{organizationId}/active
GET  /subscriptions/organizations/{organizationId}/seats
POST /subscriptions/seats/reservations
POST /subscriptions/organizations/{organizationId}/seats/{userId}/confirm
DELETE /subscriptions/organizations/{organizationId}/seats/{userId}
GET  /subscriptions/organizations/{organizationId}/access/{userId}
```

Они относятся к внутренней бизнес-логике сервиса подписок и не являются основным UI-flow текущего ЛК.

**Не подключать их к интерфейсу без отдельного требования.**

---

# 58. Принцип дальнейшей разработки

При любой новой задаче сначала определить:

```text
1. Есть ли endpoint в OpenAPI?
2. Какие поля реально возвращает backend?
3. Кто является source of truth?
4. Нужен ли новый UI?
5. Можно ли использовать существующий UI?
6. Не ломается ли DEMO?
7. Не ломается ли REAL?
8. Не ломается ли роутинг?
9. Нужен ли refresh после операции?
10. Есть ли риск повторного запроса/оплаты?
```

Главное правило:

> **Не дублировать backend-бизнес-логику на frontend.**

Если backend возвращает готовую цену, скидку, тип операции, статус, период или доступ — frontend отображает эти значения.

---

# 59. Проверка перед релизом

Перед публикацией проверить минимум следующие сценарии.

### Авторизация

- [ ] вход с корректными данными;
- [ ] ошибка входа;
- [ ] отсутствие токена;
- [ ] регистрация;
- [ ] SMS PIN;
- [ ] неверный PIN;
- [ ] logout;
- [ ] 401/403.

### Роутинг

- [ ] `/login`;
- [ ] `/subscriptions`;
- [ ] `/tariffs`;
- [ ] `/profile`;
- [ ] `/help`;
- [ ] переход из подписок в тарифы;
- [ ] переход из тарифов в подписки;
- [ ] открытие каталога;
- [ ] browser back/forward;
- [ ] неизвестный route.

### Профиль

- [ ] изменение имени;
- [ ] изменение фамилии;
- [ ] изменение email;
- [ ] изменение телефона;
- [ ] пустые необязательные поля;
- [ ] смена пароля;
- [ ] logout.

### Подписки

- [ ] список;
- [ ] ACTIVE;
- [ ] COMPLETED;
- [ ] детали;
- [ ] график/расписание;
- [ ] отмена автопродления;
- [ ] обновление состояния после отмены.

### Тарифы

- [ ] 1 месяц;
- [ ] 3 месяца;
- [ ] 12 месяцев;
- [ ] активный тариф;
- [ ] доступный тариф;
- [ ] недоступный тариф;
- [ ] DEMO-тариф;
- [ ] отображение backend-цены.

### Плательщики

- [ ] список;
- [ ] физлицо;
- [ ] организация;
- [ ] обязательные поля;
- [ ] необязательный телефон;
- [ ] изменение;
- [ ] выбор default.

### Оплата

- [ ] выбор одного тарифа;
- [ ] выбор нескольких продуктов;
- [ ] quote;
- [ ] NEW;
- [ ] RENEWAL;
- [ ] UPGRADE;
- [ ] корректная сумма;
- [ ] checkout;
- [ ] Idempotency-Key;
- [ ] paymentLink;
- [ ] AWAITING_PAYMENT;
- [ ] PAID;
- [ ] REJECTED;
- [ ] повторное открытие checkout.

### История

- [ ] checkouts;
- [ ] payments;
- [ ] documents;
- [ ] BANK_UNAVAILABLE;
- [ ] фискальный статус.

### DEMO

- [ ] DEMO открывается без API;
- [ ] DEMO не смешивается с REAL;
- [ ] mock-данные не отправляются в реальный backend.

---

# 60. Текущий статус проекта

Текущая архитектура уже рассчитана на реальный API.

Подключены основные реальные сценарии:

```text
Авторизация
Регистрация
Профиль
Смена пароля
Мои подписки
Тарифы
Плательщики
Расчёт корзины
Создание checkout
Статус checkout
История заказов
История платежей
Отмена автопродления
Feedback
```

При этом DEMO-режим сохранён для демонстрации интерфейса.

Текущий UI не должен расширяться или изменяться без отдельного требования: API интегрируется в существующую структуру кабинета.

---

## 61. Главное для разработчика

Если коротко, архитектурное правило проекта:

```text
Tilda
  ↓
React UI
  ↓
open-lk-app.js
  ↓
API
  ↓
Backend
```

И:

```text
Backend = источник истины
Frontend = отображение + orchestration
DEMO = отдельный mock-режим
Tilda = маршруты и оболочка
```

Не нужно:

```text
❌ считать цену самостоятельно
❌ придумывать статусы
❌ хранить внутренний service token
❌ создавать fake API response для REAL
❌ смешивать DEMO и REAL
❌ добавлять новые UI-сценарии без требования
```

Нужно:

```text
✅ использовать OpenAPI
✅ использовать реальные API-значения
✅ обновлять state после mutations
✅ использовать Idempotency-Key для оплаты
✅ корректно обрабатывать 401/403
✅ сохранять существующий UI
✅ сохранять DEMO
✅ держать маршруты стабильными
```
