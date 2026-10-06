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

      // После регистрации синхронизируем данные, которые пользователь уже ввёл в форме.
      // ID берём с backend через /lk/user, чтобы не зависеть от формата ответа /auth/user.
      const createdUser = await request("GET", "/lk/user");
      if (!createdUser?.id) {
        throw new Error("Регистрация выполнена, но сервер не вернул id пользователя.");
      }

      await request("PUT", "/lk/user", {
        id: createdUser.id,
        name: String(name || "").trim(),
        surname: String(surname || "").trim(),
        mail: String(mail || "").trim(),
        phoneNumber: normalizePhone(phone),
      }, {
        "X-User-Id": createdUser.id,
      });

      clearDemoMode();
      return data;
    },
  };

  const subscriptionsApi = {
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

    createCheckout: (payload, idempotencyKey) =>
      request("POST", "/subscriptions/checkouts", payload, {
        "Idempotency-Key": idempotencyKey,
      }),

    getCheckout: (organizationId, checkoutId) =>
      request("GET", `/subscriptions/organizations/${organizationId}/checkouts/${checkoutId}`),
  };

  auth.updateUser = async ({ id, name, surname, lastName, birthday, mail, phoneNumber }) => {
    const userId = id || (await request("GET", "/lk/user"))?.id;
    if (!userId) throw new Error("Не определён id пользователя.");
    return request("PUT", "/lk/user", {
      id: userId,
      ...(name !== undefined ? { name } : {}),
      ...(surname !== undefined ? { surname } : {}),
      ...(lastName !== undefined ? { lastName } : {}),
      ...(birthday !== undefined ? { birthday } : {}),
      ...(mail !== undefined ? { mail } : {}),
      ...(phoneNumber !== undefined ? { phoneNumber: normalizePhone(phoneNumber) } : {}),
    }, {
      "X-User-Id": userId,
    });
  };

  window.__OPEN_LK_AUTH__ = auth;
  window.__OPEN_LK_SUBSCRIPTIONS__ = subscriptionsApi;
  window.__OPEN_LK_PHONE__ = { normalizePhone, formatPhone };

  const dateMs = (value, fallback) => {
    const parsed = Date.parse(value || "");
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const mapPlan = (plan) => ({
    id: plan.code,
    code: plan.code,
    product: plan.code,
    name: plan.code,
    tier: plan.code,
    price: Number(plan.priceKopeks || 0) / 100,
    description: "",
    features: Array.isArray(plan.features) ? plan.features : [],
    icon: "file",
  });

  const loadRealState = async () => {
    const user = await request("GET", "/lk/user");
    const companies = Array.isArray(user.companies) ? user.companies : [];
    const favorite = companies.find((item) => item?.favorite) || companies[0];
    const organizationId = favorite?.company?.id || "";
    let plans = [];
    let plansError = null;
    try {
      plans = await subscriptionsApi.getPlans();
    } catch (error) {
      console.warn("[OPEN-LK] plans error:", error);
      plansError = {
        message: error?.message || "Не удалось загрузить тарифы.",
        code: error?.code || "",
        traceId: error?.traceId || "",
      };
    }
    const subscriptions = organizationId
      ? await subscriptionsApi.getOrganizationSubscriptions(organizationId)
      : [];

    const profile = {
      first: user.name || "",
      last: user.surname || "",
      middle: user.lastName || "",
      email: user.mail || "",
      phone: user.phoneNumber ? formatPhone(user.phoneNumber) : "",
      avatar: user.userPhoto?.[0]?.fileUrl || "",
    };

    const now = Date.now();
    const realSubscriptions = Array.isArray(subscriptions) ? subscriptions : [];
    const subs = realSubscriptions.map((item) => ({
      id: item.id,
      planId: item.planCode,
      payerId: item.payerUserId || user.id || "",
      start: null,
      end: item.paidThrough || null,
      months: null,
      auto: item.cancelRequested === false ? true : item.cancelRequested === true ? false : null,
      status: item.status || null,
      nextChargeAt: item.nextChargeAt || null,
      cancelRequested: typeof item.cancelRequested === "boolean" ? item.cancelRequested : null,
      method: null,
    }));

    const schedules = organizationId
      ? await Promise.all(
          realSubscriptions.map(async (subscription) => {
            try {
              return {
                subscription,
                schedule: await subscriptionsApi.getSchedule(organizationId, subscription.id),
                error: null,
              };
            } catch (error) {
              console.warn("[OPEN-LK] schedule error:", subscription.id, error);
              return {
                subscription,
                schedule: null,
                error: {
                  message: error?.message || "Не удалось загрузить историю платежей.",
                  code: error?.code || "",
                  traceId: error?.traceId || "",
                },
              };
            }
          })
        )
      : [];

    const scheduleErrors = schedules
      .filter((item) => item.error)
      .map((item) => ({ subscriptionId: item.subscription.id, ...item.error }));

    const orders = schedules.flatMap(({ subscription, schedule }) => {
      if (!schedule || !Array.isArray(schedule.confirmedPayments)) return [];
      return schedule.confirmedPayments.map((payment) => ({
        id: payment.paymentId,
        number: payment.paymentId,
        planId: schedule.planCode || subscription.planCode,
        product: schedule.planCode || subscription.planCode,
        planName: schedule.planCode || subscription.planCode,
        kind: "payment",
        total: Number(payment.amountKopeks || 0) / 100,
        months: null,
        start: payment.periodStart || null,
        end: payment.periodEnd || null,
        serviceEnd: payment.periodEnd || null,
        subId: subscription.id,
        payerId: subscription.payerUserId || user.id || "",
        payer: {
          id: subscription.payerUserId || user.id || "",
          type: "person",
          name: profile.first + " " + profile.last,
          email: profile.email,
          phone: profile.phone,
        },
        method: null,
        created: payment.paidAt || null,
        status: "paid",
      }));
    });

    return {
      schema: 2,
      clock: now,
      session: true,
      profile: {
        ...profile,
        ads: false,
        news: true,
        twoFactor: false,
      },
      payers: [],
      cards: [],
      subs,
      orders,
      tickets: [],
      events: [],
      user,
      organizationId,
      plans: Array.isArray(plans) ? plans.map(mapPlan) : [],
      apiErrors: {
        plans: plansError,
        schedules: scheduleErrors,
      },
    };
  };

  const refreshRealState = async () => {
    const realState = await loadRealState();
    window.__OPEN_LK_REAL_STATE__ = realState;
    window.__OPEN_LK_REAL_PLANS__ = realState.plans || [];
    return realState;
  };

  const getProjectId = () =>
    window.__OPEN_LK_PROJECT_ID__ || window.__OPEN_LK_REAL_STATE__?.projectId || "";

  const createRealCheckout = async ({ planCode, payerUserId, receiptEmail }) => {
    const organizationId = window.__OPEN_LK_REAL_STATE__?.organizationId || "";
    const projectId = getProjectId();
    if (!organizationId) throw new Error("Не определена организация для оформления покупки.");
    if (!planCode) throw new Error("Не выбран тариф.");
    if (!payerUserId) throw new Error("Не определён плательщик.");

    const payload = {
      organizationId,
      planCode,
      payerUserId,
      receiptEmail: receiptEmail || "",
    };
    if (projectId) payload.projectId = projectId;

    const checkout = await subscriptionsApi.createCheckout(payload, crypto.randomUUID());

    if (!checkout?.id) {
      throw new Error("API не вернул id оформления.");
    }

    return checkout;
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
    createCheckout: createRealCheckout,
    async getCheckout(checkoutId) {
      const organizationId = window.__OPEN_LK_REAL_STATE__?.organizationId || "";
      if (!organizationId) throw new Error("Не определена организация.");
      return subscriptionsApi.getCheckout(organizationId, checkoutId);
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
    window.__OPEN_LK_REAL_STATE__ = realState;

    if (!document.querySelector(`link[href="${CSS_URL}"]`)) {
      const styleLink = document.createElement("link");
      styleLink.rel = "stylesheet";
      styleLink.href = CSS_URL;
      document.head.appendChild(styleLink);
    }
    window.__OPEN_LK_REAL_PLANS__ = realState.plans || [];

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

  const loadDemoUi = () => {
    window.__OPEN_LK_DEMO_MODE__ = true;
    window.__OPEN_LK_REAL_MODE__ = false;
    window.__OPEN_LK_REAL_ACTIONS__ = null;
    sessionStorage.setItem(DEMO_KEY, "1");
    loadUi({ demo: true, session: false, plans: [], subs: [], profile: {}, payers: [], cards: [], orders: [], tickets: [], events: [], schema: 2, clock: Date.now() });
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
