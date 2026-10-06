# Open LK — Tilda / GitHub package v17

Интеграция личного кабинета с обновлённым OpenAPI-контрактом подписок.

## Новые контракты

Подключены:
- `GET /subscriptions/organizations/{organizationId}/my-subscriptions`
- `GET /subscriptions/organizations/{organizationId}/tariffs?periodMonths=...`
- `GET /subscriptions/organizations/{organizationId}/payers/details`
- `POST /subscriptions/organizations/{organizationId}/payers/person`
- `POST /subscriptions/organizations/{organizationId}/payers/company`
- `GET /subscriptions/organizations/{organizationId}/payers/{payerId}`
- `PUT /subscriptions/organizations/{organizationId}/payers/{payerId}`
- `PUT /subscriptions/organizations/{organizationId}/payers/{payerId}/default`
- `GET /subscriptions/organizations/{organizationId}/checkouts`
- `GET /subscriptions/organizations/{organizationId}/payments`
- `POST /subscriptions/organizations/{organizationId}/payment-quotes`
- `POST /subscriptions/organizations/{organizationId}/cart-checkouts`
- `GET /subscriptions/organizations/{organizationId}/cart-checkouts/{checkoutId}`

## Что осталось на старых контрактах

Старые endpoint'ы сохранены только там, где обновлённый контракт их не заменяет в текущем UI: получение деталей конкретной подписки, отмена подписки и график платежей.

Демо-режим сохранён отдельно и не использует реальные API-операции.

Tilda HTML-страницы в архив не входят: `/login`, `/subscriptions`, `/tariffs`, `/profile`, `/help` остаются отдельными страницами Tilda.
