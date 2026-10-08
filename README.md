# Open LK — Tilda / GitHub package v47

Интеграция личного кабинета с OpenAPI-контрактом подписок v2.0.0 (`api(3).yaml`).

## Что синхронизировано с backend

### Личный кабинет
- `GET /lk/user`
- `PUT /lk/user`
- `PUT /auth/user/password`

### Подписки и тарифы
- `GET /subscriptions/organizations/{organizationId}/my-subscriptions?filter=ALL`
- `GET /subscriptions/organizations/{organizationId}/tariffs?periodMonths=1|3|12`
- `GET /subscriptions/organizations/{organizationId}/{subscriptionId}`
- `GET /subscriptions/organizations/{organizationId}/{subscriptionId}/schedule`
- `POST /subscriptions/organizations/{organizationId}/{subscriptionId}/cancel?actorUserId=...`

Для карточек подписок используются backend-поля `currentPeriodStart`, `currentPeriodEnd`, `purchasedPeriodMonths`, `remainingPercent` и `canRenew`. Процент остатка не пересчитывается на frontend, если backend его передал.

Для доступных тарифов используются серверные `regularAmountKopeks`, `discountAmountKopeks`, `discountPercent`, `totalAmountKopeks`, `priceStatus` и `canPurchase`. Frontend не рассчитывает цену, скидку или доплату самостоятельно.

### Плательщики
- `GET /subscriptions/organizations/{organizationId}/payers/details`
- `POST /subscriptions/organizations/{organizationId}/payers/person`
- `POST /subscriptions/organizations/{organizationId}/payers/company`
- `GET /subscriptions/organizations/{organizationId}/payers/{payerId}`
- `PUT /subscriptions/organizations/{organizationId}/payers/{payerId}`
- `PUT /subscriptions/organizations/{organizationId}/payers/{payerId}/default`

### История и документы
- `GET /subscriptions/organizations/{organizationId}/checkouts`
- `GET /subscriptions/organizations/{organizationId}/payments`
- `GET /subscriptions/organizations/{organizationId}/documents`

В REAL-режиме вкладка «Документы» использует именно endpoint `documents`, а не локально собранные тестовые документы. Сохраняются банковские и фискальные поля:
`bankOperationId`, `bankPaymentId`, `bankPaymentType`, `bankVerificationStatus`, `bankCreatedAt`, `bankPaidAt`, `fiscalReceiptStatus`, `receiptPdfUrl`, `fiscalNumber`, `fiscalizedAt`, `receiptEmail`, `items`.

Если backend возвращает `receiptPdfUrl`, PDF открывается через авторизованный запрос. Если PDF отсутствует, frontend не создаёт фиктивный чек в REAL-режиме.

### Новая корзина оплаты
- `POST /subscriptions/organizations/{organizationId}/payment-quotes`
- `POST /subscriptions/organizations/{organizationId}/cart-checkouts`
- `GET /subscriptions/organizations/{organizationId}/cart-checkouts/{checkoutId}`

Оплата идёт через `payment-quotes` → `cart-checkouts`. В quote передаются `tariffIds`, `payerId` и `corpusNumber`. Для текущего ЛК `corpusNumber` всегда равен `"1"`: один объект/корпус на организацию. В браузерный запрос checkout передаётся только `quoteId` и `Idempotency-Key`; `payerUserId` из JWT frontend самостоятельно не передаётся.

Статус checkout не трактуется как успешная оплата: `PAID` считается только backend-подтверждением банка.

### Обратная связь
- `POST /tech-support/feedback`
- `message`, `timestamp` и `source` передаются как query-параметры
- тело запроса — `multipart/form-data`; файлы в текущем ЛК не отправляются

## Заголовки

Используется:

```text
Authorization: Bearer <token>
x-platform-version: web-1.0.0
```

`X-Subscribe-Service-Token` не используется: в API v2.0.0 он deprecated и больше не проверяется.

## DEMO / REAL

DEMO-режим сохранён отдельно и продолжает работать на исходных тестовых данных.
REAL-режим использует backend API и не подменяет ответы локальной бизнес-логикой.

## Tilda

HTML-страницы Tilda в архив не входят. `/login`, `/subscriptions`, `/tariffs`, `/profile`, `/help` остаются отдельными страницами Tilda.


## Global Tilda header / contact popup

Tilda Header должен быть включён на всех страницах ЛК (`/login`, `/subscriptions`, `/tariffs`, `/profile`, `/help`).

Frontend автоматически скрывает только визуальный контейнер `#meta-global-header` через CSS. Глобальный блок с контактным popup (`#mc-popup`) не скрывается и остаётся доступным в DOM.

Тарифы с `totalAmountKopeks === 0` показывают кнопку `По запросу`; она открывает существующий Tilda contact popup. Отдельная API-ручка обратной связи для этого сценария не используется.


## v56
- Tariff request mode: any negative price (`< 0`) is "По запросу"; `0` is a normal price.
- Final `.tariff-card>p` rule: `min-height:50px; margin:10px 0 0; font-size:12px; flex:1`.
- Registration backend validation for already registered users is shown in the existing red form error.
