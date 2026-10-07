# Open LK — Tilda / GitHub package v20

Интеграция личного кабинета с OpenAPI-контрактом подписок v2.0.0 (`api(2).yaml`).

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

Оплата идёт через `payment-quotes` → `cart-checkouts`. В браузерный запрос checkout передаётся только `quoteId` и `Idempotency-Key`; `payerUserId` из JWT frontend самостоятельно не передаёт.

Статус checkout не трактуется как успешная оплата: `PAID` считается только backend-подтверждением банка.

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
