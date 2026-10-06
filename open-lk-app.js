(function () {
  "use strict";

  const API_BASE = "https://itprorab.metasymbiont.com/api/v1";
  const PLATFORM_VERSION = "web-1.0.0";
  const TOKEN_KEYS = ["tildaAuthToken", "authToken"];
  const UI_URL = "https://lma6490544-eng.github.io/tilda-lk/open-lk-ui.js";
  const CSS_URL = "https://lma6490544-eng.github.io/tilda-lk/open-lk.css";
  const DEMO_KEY = "openLkDemoMode";

  const isLoginPage = () => window.location.pathname.replace(/\/$/, "") === "/login";

  const getToken = () => {
    for (const key of TOKEN_KEYS) {
      const value = localStorage.getItem(key);
      if (value) return value;
    }
    return "";
  };

  const normalizePhone = (value) => {
    const digits = String(value || "").replace(/\D/g, "");
    if (!digits) return "";
    if (digits.startsWith("8")) return `7${digits.slice(1, 11)}`;
    if (digits.startsWith("7")) return digits.slice(0, 11);
    return `7${digits.slice(0, 10)}`;
  };

  const formatPhone = (value) => {
    const digits = normalizePhone(value);
    if (!digits) return "+7 ";
    const rest = digits.slice(1);
    let result = "+7";
    if (rest.length) result += ` (${rest.slice(0, 3)}`;
    if (rest.length >= 3) result += ")";
    if (rest.length > 3) result += ` ${rest.slice(3, 6)}`;
    if (rest.length > 6) result += `-${rest.slice(6, 8)}`;
    if (rest.length > 8) result += `-${rest.slice(8, 10)}`;
    return result;
  };

  const apiPhone = (value) => {
    const normalized = normalizePhone(value);
    return normalized ? `+${normalized}` : "";
  };

  const request = async (method, endpoint, body, extraHeaders = {}) => {
    const token = getToken();
    const headers = {
      accept: "application/json",
      "x-platform-version": PLATFORM_VERSION,
      ...extraHeaders,
    };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });

    const text = await response.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }

    if (!response.ok) {
      const apiMessage =
        data?.errorCause ||
        data?.message ||
        data?.detail ||
        data?.error ||
        `Ошибка API: ${response.status}`;
      const apiCode = data?.errorCode ? ` (${data.errorCode})` : "";
      const error = new Error(`${apiMessage}${apiCode}`);
      error.status = response.status;
      error.code = data?.errorCode || "";
      error.traceId = data?.traceId || "";
      error.apiResponse = data;
      throw error;
    }
    return data;
  };

  const extractToken = (data) =>
    typeof data === "string"
      ? data
      : data?.token ||
        data?.access_token ||
        data?.data?.token ||
        data?.data?.access_token ||
        data?.result?.token ||
        data?.result?.access_token ||
        "";

  const saveToken = (token) => {
    if (!token) throw new Error("Сервер не вернул token");
    localStorage.setItem("tildaAuthToken", token);
    localStorage.setItem("authToken", token);
  };

  const clearDemoMode = () => sessionStorage.removeItem(DEMO_KEY);

  const auth = {
    async login({ login, password }) {
      const normalizedLogin = /^\+?\d[\d\s()\-]+$/.test(login)
        ? apiPhone(login)
        : login;
      const data = await request("POST", "/auth/login", {
        login: normalizedLogin,
        password,
        phone: "",
      });
      saveToken(extractToken(data));
      clearDemoMode();
      return data;
    },

    async sendRegisterPin({ login }) {
      return request("POST", "/auth/user/phone/pin", {
        login: apiPhone(login),
      });
    },

    async confirmRegister({ login, password, code, name, surname, mail }) {
      if (!/^\d{6}$/.test(String(code || ""))) {
        throw new Error("Код из SMS должен содержать 6 цифр.");
      }
      const phone = apiPhone(login);
      const confirmation = await request("POST", "/auth/user/phone/pin/confirm", {
        pin: code,
        login: phone,
      });

      if (confirmation?.status && confirmation.status !== "PHONE_CONFIRMED") {
        throw new Error("Телефон не подтверждён.");
      }

      const data = await request("POST", "/auth/user", {
        login: phone,
        password,
        politicAgreements: true,
        hash: crypto.randomUUID(),
      });
      saveToken(extractToken(data));

      const createdUser = await request("GET", "/lk/user");
      if (!createdUser?.id) {
        throw new Error("Регистрация выполнена, но сервер не вернул id пользователя.");
      }

      await request(
        "PUT",
        "/lk/user",
        {
          id: createdUser.id,
          name: String(name || "").trim(),
          surname: String(surname || "").trim(),
          mail: String(mail || "").trim(),
          phoneNumber: normalizePhone(phone),
        },
        { "X-User-Id": createdUser.id }
      );

      clearDemoMode();
      return data;
    },
  };

  const subscriptionsApi = {
    // Старые контракты, которые всё ещё используются для деталей подписки,
    // отмены и совместимости с уже существующим UI.
    getPlans: () => request("GET", "/subscriptions/plans"),

    getOrganizationSubscriptions: (organizationId) =>
      request("GET", `/subscriptions/organizations/${organizationId}`),

    getSubscription: (organizationId, subscriptionId) =>
      request("GET", `/subscriptions/organizations/${organizationId}/${subscriptionId}`),

    getSchedule: (organizationId, subscriptionId) =>
      request("GET", `/subscriptions/organizations/${organizationId}/${subscriptionId}/schedule`),

    cancel: (organizationId, subscriptionId, actorUserId) =>
      request(
        "POST",
        `/subscriptions/organizations/${organizationId}/${subscriptionId}/cancel?actorUserId=${encodeURIComponent(actorUserId)}`
      ),

    getCheckout: (organizationId, checkoutId) =>
      request("GET", `/subscriptions/organizations/${organizationId}/checkouts/${checkoutId}`),

    // Новые контракты ЛК.
    getMySubscriptions: (organizationId, filter = "ALL") =>
      request(
        "GET",
        `/subscriptions/organizations/${organizationId}/my-subscriptions?filter=${encodeURIComponent(filter)}`
      ),

    getTariffs: (organizationId, periodMonths = 1) =>
      request(
        "GET",
        `/subscriptions/organizations/${organizationId}/tariffs?periodMonths=${encodeURIComponent(periodMonths)}`
      ),

    getPayerDetails: (organizationId) =>
      request("GET", `/subscriptions/organizations/${organizationId}/payers/details`),

    createPersonPayer: (organizationId, payload) =>
      request("POST", `/subscriptions/organizations/${organizationId}/payers/person`, payload),

    createCompanyPayer: (organizationId, payload) =>
      request("POST", `/subscriptions/organizations/${organizationId}/payers/company`, payload),

    getPayer: (organizationId, payerId) =>
      request("GET", `/subscriptions/organizations/${organizationId}/payers/${payerId}`),

    updatePayer: (organizationId, payerId, payload) =>
      request("PUT", `/subscriptions/organizations/${organizationId}/payers/${payerId}`, payload),

    setDefaultPayer: (organizationId, payerId) =>
      request("PUT", `/subscriptions/organizations/${organizationId}/payers/${payerId}/default`),

    listCheckouts: (organizationId, limit = 50, offset = 0) =>
      request(
        "GET",
        `/subscriptions/organizations/${organizationId}/checkouts?limit=${encodeURIComponent(limit)}&offset=${encodeURIComponent(offset)}`
      ),

    listPayments: (organizationId, limit = 50, offset = 0) =>
      request(
        "GET",
        `/subscriptions/organizations/${organizationId}/payments?limit=${encodeURIComponent(limit)}&offset=${encodeURIComponent(offset)}`
      ),

    quoteCartPayment: (organizationId, payload) =>
      request("POST", `/subscriptions/organizations/${organizationId}/payment-quotes`, payload),

    createCartCheckout: (organizationId, payload, idempotencyKey) =>
      request("POST", `/subscriptions/organizations/${organizationId}/cart-checkouts`, payload, {
        "Idempotency-Key": idempotencyKey,
      }),

    getCartCheckout: (organizationId, checkoutId) =>
      request("GET", `/subscriptions/organizations/${organizationId}/cart-checkouts/${checkoutId}`),
  };

  auth.updateUser = async ({ id, name, surname, lastName, birthday, mail, phoneNumber }) => {
    const userId = id || (await request("GET", "/lk/user"))?.id;
    if (!userId) throw new Error("Не определён id пользователя.");
    return request(
      "PUT",
      "/lk/user",
      {
        id: userId,
        ...(name !== undefined ? { name } : {}),
        ...(surname !== undefined ? { surname } : {}),
        ...(lastName !== undefined ? { lastName } : {}),
        ...(birthday !== undefined ? { birthday } : {}),
        ...(mail !== undefined ? { mail } : {}),
        ...(phoneNumber !== undefined ? { phoneNumber: normalizePhone(phoneNumber) } : {}),
      },
      { "X-User-Id": userId }
    );
  };

  window.__OPEN_LK_AUTH__ = auth;
  window.__OPEN_LK_SUBSCRIPTIONS__ = subscriptionsApi;
  window.__OPEN_LK_PHONE__ = { normalizePhone, formatPhone };

  const dateMs = (value, fallback) => {
    const parsed = Date.parse(value || "");
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const normalizePayer = (payer) => ({
    id: payer?.id || "",
    type: payer?.type === "COMPANY" ? "company" : "person",
    name: payer?.name || "",
    email: payer?.email || "",
    phone: payer?.phone || "",
    inn: payer?.inn || "",
    kpp: payer?.kpp || "",
    ogrn: payer?.ogrn || "",
    contact: payer?.contact || "",
    address: payer?.legalAddress || payer?.address || "",
    account: payer?.account || "",
    bik: payer?.bik || "",
    bank: payer?.bank || "",
    correspondent: payer?.correspondentAccount || payer?.correspondent || "",
    default: payer?.isDefault === true,
    organizationId: payer?.organizationId || "",
  });

  const mapTariffToPlan = (tariff) => ({
    id: tariff?.tariffId || tariff?.tariffCode || tariff?.id || "",
    code: tariff?.tariffCode || tariff?.tariffId || tariff?.id || "",
    product: tariff?.product?.code || "",
    name: tariff?.product?.name || tariff?.plan?.name || tariff?.tariffCode || "",
    tier: tariff?.plan?.name || "",
    price: Number(tariff?.totalAmountKopeks || 0) / 100,
    description: tariff?.product?.description || "",
    features: [],
    icon: tariff?.product?.iconKey || "file",
    tariffId: tariff?.tariffId || null,
    tariffCode: tariff?.tariffCode || "",
    periodMonths: tariff?.periodMonths || null,
    regularPrice: Number(tariff?.regularAmountKopeks || 0) / 100,
    discountAmount: Number(tariff?.discountAmountKopeks || 0) / 100,
    discountPercent: Number(tariff?.discountPercent || 0),
    totalAmount: Number(tariff?.totalAmountKopeks || 0) / 100,
    priceStatus: tariff?.priceStatus || null,
    canPurchase: tariff?.canPurchase === true,
  });

  const mapActivePlan = (item, tariffPlans) => {
    const product = item?.product || {};
    const plan = item?.plan || {};
    const priceSource = tariffPlans.find(
      (tariff) =>
        tariff?.product?.code === product.code && tariff?.plan?.code === plan.code
    );
    return {
      id: plan.code || product.code || item.subscriptionId,
      code: plan.code || product.code || item.subscriptionId,
      product: product.code || "",
      name: product.name || plan.name || product.code || "",
      tier: plan.name || "",
      price: priceSource ? Number(priceSource.totalAmountKopeks || 0) / 100 : 0,
      description: product.description || "",
      features: [],
      icon: product.iconKey || "file",
    };
  };

  const mapSubscriptionCard = (item, activeTariffs, payers, now) => {
    const active = activeTariffs.find((tariff) => tariff?.subscriptionId === item.subscriptionId);
    const until = active?.currentPeriodEnd || item?.access?.until || null;
    const start = active?.currentPeriodStart || null;
    const end = dateMs(until, now);
    const startMs = dateMs(start, Math.min(now, end));
    const payerId = item?.payer?.id || "";
    const payer = payerId ? payers.find((candidate) => candidate.id === payerId) : null;
    const statusCode = item?.status?.code || "";
    return {
      id: item.subscriptionId,
      planId: item?.plan?.code || item?.product?.code || "",
      payerId,
      start: startMs,
      end,
      months: active?.purchasedPeriodMonths || null,
      auto: null,
      status: statusCode || null,
      statusLabel: item?.status?.label || "",
      nextChargeAt: null,
      cancelRequested: null,
      method: null,
      product: item?.product || null,
      access: item?.access || null,
      payer: payer || null,
    };
  };

  const mapOrder = (order, payerById) => {
    const payerId = order?.payerId || "";
    const snapshot = order?.payerSnapshot || null;
    const payer = payerById[payerId] || (snapshot ? normalizePayer({ ...snapshot, id: payerId }) : null);
    const total = Number(order?.amountKopeks || 0) / 100;
    const status = String(order?.status || "").toUpperCase();
    const item = {
      id: order?.id || "",
      planId: order?.planCode || "",
      product: order?.planCode || "",
      planName: order?.planCode || "",
      kind: "payment",
      total,
      months: null,
      start: null,
      end: null,
      serviceEnd: null,
      subId: order?.subscriptionId || null,
      payerId,
      payer: payer || { id: payerId, type: "person", name: "", email: "", phone: "" },
      method: null,
      created: order?.createdAt || null,
      status: status === "PAID" ? "paid" : status.toLowerCase() || "unknown",
      act: false,
    };
    return {
      ...item,
      number: order?.id || "",
      items: [item],
      paymentLink: order?.paymentLink || null,
    };
  };

  const loadRealState = async () => {
    const user = await request("GET", "/lk/user");
    const companies = Array.isArray(user.companies) ? user.companies : [];
    const favorite = companies.find((item) => item?.favorite) || companies[0];
    const organizationId = favorite?.company?.id || "";
    const now = Date.now();

    if (!organizationId) {
      return {
        schema: 2,
        clock: now,
        session: true,
        profile: {
          first: user.name || "",
          last: user.surname || "",
          middle: user.lastName || "",
          email: user.mail || "",
          phone: user.phoneNumber ? formatPhone(user.phoneNumber) : "",
          avatar: user.userPhoto?.[0]?.fileUrl || "",
          ads: false,
          news: true,
          twoFactor: false,
        },
        payers: [],
        cards: [],
        subs: [],
        orders: [],
        tickets: [],
        events: [],
        user,
        organizationId: "",
        plans: [],
        tariffsByPeriod: { 1: [], 3: [], 12: [] },
        apiErrors: {},
      };
    }

    const apiErrors = {};
    const [mySubscriptionsResult, tariffResults, payerResult, checkoutResult, paymentResult] =
      await Promise.allSettled([
        subscriptionsApi.getMySubscriptions(organizationId, "ALL"),
        Promise.all([1, 3, 12].map((period) => subscriptionsApi.getTariffs(organizationId, period))),
        subscriptionsApi.getPayerDetails(organizationId),
        subscriptionsApi.listCheckouts(organizationId),
        subscriptionsApi.listPayments(organizationId),
      ]);

    const mySubscriptions =
      mySubscriptionsResult.status === "fulfilled" && mySubscriptionsResult.value
        ? mySubscriptionsResult.value
        : { items: [] };
    if (mySubscriptionsResult.status === "rejected") {
      apiErrors.mySubscriptions = {
        message: mySubscriptionsResult.reason?.message || "Не удалось загрузить подписки.",
        code: mySubscriptionsResult.reason?.code || "",
        traceId: mySubscriptionsResult.reason?.traceId || "",
      };
    }

    const tariffByPeriod = { 1: [], 3: [], 12: [] };
    if (tariffResults.status === "fulfilled") {
      [1, 3, 12].forEach((period, index) => {
        tariffByPeriod[period] = tariffResults.value[index] || {};
      });
    } else {
      apiErrors.tariffs = {
        message: tariffResults.reason?.message || "Не удалось загрузить тарифы.",
        code: tariffResults.reason?.code || "",
        traceId: tariffResults.reason?.traceId || "",
      };
    }

    const payerDetails =
      payerResult.status === "fulfilled" && Array.isArray(payerResult.value)
        ? payerResult.value.map(normalizePayer)
        : [];
    if (payerResult.status === "rejected") {
      apiErrors.payers = {
        message: payerResult.reason?.message || "Не удалось загрузить плательщиков.",
        code: payerResult.reason?.code || "",
        traceId: payerResult.reason?.traceId || "",
      };
    }

    const checkoutOrders =
      checkoutResult.status === "fulfilled" && Array.isArray(checkoutResult.value)
        ? checkoutResult.value
        : [];
    const payments =
      paymentResult.status === "fulfilled" && Array.isArray(paymentResult.value)
        ? paymentResult.value
        : [];
    if (checkoutResult.status === "rejected") {
      apiErrors.checkouts = {
        message: checkoutResult.reason?.message || "Не удалось загрузить историю заказов.",
        code: checkoutResult.reason?.code || "",
        traceId: checkoutResult.reason?.traceId || "",
      };
    }
    if (paymentResult.status === "rejected") {
      apiErrors.payments = {
        message: paymentResult.reason?.message || "Не удалось загрузить историю платежей.",
        code: paymentResult.reason?.code || "",
        traceId: paymentResult.reason?.traceId || "",
      };
    }

    const tariffResponses = [1, 3, 12].map((period) => tariffByPeriod[period]);
    const allAvailableTariffs = tariffResponses.flatMap((response) =>
      Array.isArray(response?.availableTariffs) ? response.availableTariffs : []
    );
    const periodPlans = {};
    [1, 3, 12].forEach((period) => {
      periodPlans[period] = Array.isArray(tariffByPeriod[period]?.availableTariffs)
        ? tariffByPeriod[period].availableTariffs.map(mapTariffToPlan)
        : [];
    });

    const myItems = Array.isArray(mySubscriptions.items) ? mySubscriptions.items : [];
    const activeTariffs = Array.isArray(tariffByPeriod[1]?.activeTariffs)
      ? tariffByPeriod[1].activeTariffs
      : [];
    const subs = myItems.map((item) => mapSubscriptionCard(item, activeTariffs, payerDetails, now));

    const payerById = Object.fromEntries(payerDetails.map((payer) => [payer.id, payer]));
    const orders = checkoutOrders.map((order) => mapOrder(order, payerById));
    const paidPaymentsByCheckout = new Map(payments.map((payment) => [payment.checkoutId, payment]));
    orders.forEach((order) => {
      const payment = paidPaymentsByCheckout.get(order.id);
      if (payment) {
        order.status = "paid";
        order.created = payment.paidAt || order.created;
        order.items[0].status = "paid";
        order.items[0].start = payment.periodStart || null;
        order.items[0].end = payment.periodEnd || null;
        order.items[0].serviceEnd = payment.periodEnd || null;
        order.items[0].created = payment.paidAt || order.items[0].created;
        order.items[0].total = Number(payment.amountKopeks || order.amountKopeks || 0) / 100;
        order.total = order.items[0].total;
      }
    });

    const activePlanMap = new Map();
    myItems.forEach((item) => {
      const tariffPlanSource = allAvailableTariffs.find(
        (tariff) =>
          tariff?.product?.code === item?.product?.code && tariff?.plan?.code === item?.plan?.code
      );
      const plan = mapActivePlan(item, tariffPlanSource ? [tariffPlanSource] : []);
      activePlanMap.set(plan.id, plan);
    });

    const allPlans = [...activePlanMap.values(), ...Object.values(periodPlans).flat()];
    const uniquePlans = Array.from(new Map(allPlans.map((plan) => [plan.id, plan])).values());

    const profile = {
      first: user.name || "",
      last: user.surname || "",
      middle: user.lastName || "",
      email: user.mail || "",
      phone: user.phoneNumber ? formatPhone(user.phoneNumber) : "",
      avatar: user.userPhoto?.[0]?.fileUrl || "",
      ads: false,
      news: true,
      twoFactor: false,
    };

    return {
      schema: 2,
      clock: now,
      session: true,
      profile,
      payers: payerDetails,
      cards: [],
      subs,
      orders,
      tickets: [],
      events: [],
      user,
      organizationId,
      plans: uniquePlans,
      tariffsByPeriod: periodPlans,
      tariffOverviewByPeriod: tariffByPeriod,
      companies: companies.map((item) => ({
        id: item.id,
        companyId: item.company?.id || "",
        name: item.company?.name || "",
        status: item.status || "",
        invitedAt: item.invitedAt || null,
        favorite: item.favorite === true,
      })),
      apiErrors,
    };
  };

  const refreshRealState = async () => {
    const realState = await loadRealState();
    window.__OPEN_LK_REAL_STATE__ = realState;
    if (realState?.demo) {
      delete window.__OPEN_LK_REAL_PLANS__;
    } else {
      window.__OPEN_LK_REAL_PLANS__ = realState.plans || [];
      window.__OPEN_LK_TARIFFS_BY_PERIOD__ = realState.tariffsByPeriod || {};
    }
    return realState;
  };

  const getProjectId = () =>
    window.__OPEN_LK_PROJECT_ID__ || window.__OPEN_LK_REAL_STATE__?.projectId || "";

  const normalizePayerForInput = (payer) => ({
    type: payer?.type === "company" ? "COMPANY" : "PERSON",
    name: String(payer?.name || "").trim(),
    email: String(payer?.email || "").trim(),
    ...(payer?.phone ? { phone: String(payer.phone).trim() } : {}),
    ...(payer?.inn ? { inn: String(payer.inn).trim() } : {}),
    ...(payer?.kpp ? { kpp: String(payer.kpp).trim() } : {}),
    ...(payer?.ogrn ? { ogrn: String(payer.ogrn).trim() } : {}),
    ...(payer?.contact ? { contact: String(payer.contact).trim() } : {}),
    ...(payer?.address ? { legalAddress: String(payer.address).trim() } : {}),
    ...(payer?.account ? { account: String(payer.account).trim() } : {}),
    ...(payer?.bik ? { bik: String(payer.bik).trim() } : {}),
    ...(payer?.bank ? { bank: String(payer.bank).trim() } : {}),
    ...(payer?.correspondent ? { correspondentAccount: String(payer.correspondent).trim() } : {}),
  });

  const saveRealPayer = async (payer) => {
    const state = window.__OPEN_LK_REAL_STATE__;
    if (!state?.organizationId) throw new Error("Не определена организация.");
    const payload = normalizePayerForInput(payer);
    let response;
    if (payer?.id) {
      response = await subscriptionsApi.updatePayer(state.organizationId, payer.id, {
        ...payload,
        actorUserId: state.user?.id || "",
      });
    } else if (payload.type === "COMPANY") {
      const { type, ...companyPayload } = payload;
      response = await subscriptionsApi.createCompanyPayer(state.organizationId, companyPayload);
    } else {
      const { type, inn, kpp, ogrn, contact, legalAddress, account, bik, bank, correspondentAccount, ...personPayload } = payload;
      response = await subscriptionsApi.createPersonPayer(state.organizationId, personPayload);
    }
    return normalizePayer(response);
  };

  const setRealDefaultPayer = async (payerId) => {
    const state = window.__OPEN_LK_REAL_STATE__;
    if (!state?.organizationId) throw new Error("Не определена организация.");
    const response = await subscriptionsApi.setDefaultPayer(state.organizationId, payerId);
    return normalizePayer(response);
  };

  const createRealCartCheckout = async ({ items, payerId }) => {
    const organizationId = window.__OPEN_LK_REAL_STATE__?.organizationId || "";
    if (!organizationId) throw new Error("Не определена организация для оформления покупки.");
    if (!payerId) throw new Error("Не выбран плательщик.");
    if (!Array.isArray(items) || !items.length) throw new Error("Не выбраны тарифы.");

    const tariffIds = items.map((item) => item.tariffId || item.planId).filter(Boolean);
    if (!tariffIds.length) throw new Error("Не удалось определить выбранные тарифы.");

    const quote = await subscriptionsApi.quoteCartPayment(organizationId, {
      tariffIds,
      payerId,
    });
    if (!quote?.quoteId) throw new Error("API не вернул quoteId расчёта.");

    const checkout = await subscriptionsApi.createCartCheckout(
      organizationId,
      { quoteId: quote.quoteId },
      crypto.randomUUID()
    );
    if (!checkout?.id) throw new Error("API не вернул id оформления.");
    return { quote, checkout };
  };

  const realActions = {
    async refresh() {
      const realState = await refreshRealState();
      window.dispatchEvent(new CustomEvent("open-lk-real-state-updated", { detail: realState }));
      return realState;
    },
    getSubscription: (subscriptionId) => {
      const state = window.__OPEN_LK_REAL_STATE__;
      if (!state?.organizationId) throw new Error("Не определена организация.");
      return subscriptionsApi.getSubscription(state.organizationId, subscriptionId);
    },
    async cancelSubscription(subscriptionId) {
      const state = window.__OPEN_LK_REAL_STATE__;
      if (!state?.organizationId) throw new Error("Не определена организация.");
      if (!state?.user?.id) throw new Error("Не определён пользователь.");
      const response = await subscriptionsApi.cancel(state.organizationId, subscriptionId, state.user.id);
      await this.refresh();
      return response;
    },
    getMySubscriptions: (filter = "ALL") => {
      const state = window.__OPEN_LK_REAL_STATE__;
      if (!state?.organizationId) throw new Error("Не определена организация.");
      return subscriptionsApi.getMySubscriptions(state.organizationId, filter);
    },
    getTariffs: (periodMonths = 1) => {
      const state = window.__OPEN_LK_REAL_STATE__;
      if (!state?.organizationId) throw new Error("Не определена организация.");
      return subscriptionsApi.getTariffs(state.organizationId, periodMonths);
    },
    getPayers: () => {
      const state = window.__OPEN_LK_REAL_STATE__;
      if (!state?.organizationId) throw new Error("Не определена организация.");
      return subscriptionsApi.getPayerDetails(state.organizationId);
    },
    savePayer: saveRealPayer,
    setDefaultPayer: setRealDefaultPayer,
    quoteCartPayment: async ({ tariffIds, payerId }) => {
      const state = window.__OPEN_LK_REAL_STATE__;
      if (!state?.organizationId) throw new Error("Не определена организация.");
      return subscriptionsApi.quoteCartPayment(state.organizationId, { tariffIds, payerId });
    },
    createCartCheckout: createRealCartCheckout,
    async getCheckout(checkoutId) {
      const organizationId = window.__OPEN_LK_REAL_STATE__?.organizationId || "";
      if (!organizationId) throw new Error("Не определена организация.");
      return subscriptionsApi.getCartCheckout(organizationId, checkoutId);
    },
    createCheckout: async ({ planCode, payerUserId, receiptEmail }) => {
      // Совместимость для старых UI-вызовов. Новая реальная покупка должна идти через корзину.
      const state = window.__OPEN_LK_REAL_STATE__;
      if (!state?.organizationId) throw new Error("Не определена организация.");
      const payer = state.payers.find((item) => item.id === payerUserId) || state.payers.find((item) => item.default);
      if (!payer) throw new Error("Не выбран плательщик.");
      return createRealCartCheckout({ items: [{ planId: planCode }], payerId: payer.id });
    },
  };

  const getRoute = () => {
    const path = window.location.pathname.replace(/\/+$/, "") || "/";
    if (path === "/login") return "login";
    if (path === "/subscriptions") return "products";
    if (path === "/tariffs") return "subscriptions";
    if (path === "/profile") return "settings";
    if (path === "/help") return "help";
    return "subscriptions";
  };

  const loadUi = (realState) => {
    window.__OPEN_LK_ROUTE__ = getRoute();
    window.__OPEN_LK_AUTH_PAGE__ = getRoute() === "login";
    window.__OPEN_LK_REAL_MODE__ = Boolean(realState?.session && !realState?.demo);
    window.__OPEN_LK_REAL_ACTIONS__ = realActions;
    window.__OPEN_LK_REAL_STATE__ = realState?.demo && !isLoginPage() ? null : realState;

    if (!document.querySelector(`link[href="${CSS_URL}"]`)) {
      const styleLink = document.createElement("link");
      styleLink.rel = "stylesheet";
      styleLink.href = CSS_URL;
      document.head.appendChild(styleLink);
    }
    if (realState?.demo) {
      delete window.__OPEN_LK_REAL_PLANS__;
      delete window.__OPEN_LK_TARIFFS_BY_PERIOD__;
    } else {
      window.__OPEN_LK_REAL_PLANS__ = realState.plans || [];
      window.__OPEN_LK_TARIFFS_BY_PERIOD__ = realState.tariffsByPeriod || {};
    }

    const script = document.createElement("script");
    script.src = UI_URL;
    script.async = false;
    script.onload = () => {
      window.dispatchEvent(new CustomEvent("open-lk-real-data", { detail: realState }));
    };
    script.onerror = () => {
      const root = document.getElementById("root");
      if (root) {
        root.innerHTML = "<div style=\"padding:24px;font:16px sans-serif\">Не удалось загрузить интерфейс кабинета.</div>";
      }
    };
    document.head.appendChild(script);
  };

  const openDemo = () => {
    sessionStorage.setItem(DEMO_KEY, "1");
    window.__OPEN_LK_DEMO_MODE__ = true;
    window.location.assign("/subscriptions");
  };

  const loadDemoUi = () => {
    window.__OPEN_LK_OPEN_DEMO__ = openDemo;
    window.__OPEN_LK_DEMO_MODE__ = true;
    window.__OPEN_LK_REAL_MODE__ = false;
    window.__OPEN_LK_REAL_ACTIONS__ = null;
    sessionStorage.setItem(DEMO_KEY, "1");
    loadUi({
      demo: true,
      session: !isLoginPage(),
      plans: [],
      subs: [],
      profile: {},
      payers: [],
      cards: [],
      orders: [],
      tickets: [],
      events: [],
      schema: 2,
      clock: Date.now(),
    });
  };

  const redirectToLogin = () => {
    if (!isLoginPage()) window.location.assign("/login");
  };

  const init = async () => {
    const demoMode = sessionStorage.getItem(DEMO_KEY) === "1";

    if (isLoginPage()) {
      loadDemoUi();
      return;
    }

    if (demoMode) {
      loadDemoUi();
      return;
    }

    if (!getToken()) {
      redirectToLogin();
      return;
    }

    try {
      const realState = await loadRealState();
      window.__OPEN_LK_DEMO_MODE__ = false;
      loadUi(realState);
    } catch (error) {
      console.error("[OPEN-LK] API error:", error);
      const root = document.getElementById("root");
      if (root) {
        root.innerHTML = `<div style=\"padding:24px;font:16px sans-serif\">${error?.message || "Ошибка загрузки данных"}</div>`;
      }
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
