(function () {
  "use strict";

  const API_BASE = "https://itprorab.metasymbiont.com/api/v1";
  const PLATFORM_VERSION = "web-1.0.0";
  const TOKEN_KEYS = ["tildaAuthToken", "authToken"];
  const UI_URL = "https://lma6490544-eng.github.io/tilda-lk/open-lk-ui.js";
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
      throw new Error(
        data?.error || data?.message || data?.detail || `Ошибка API: ${response.status}`
      );
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
        ? normalizePhone(login)
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
        login: normalizePhone(login),
      });
    },

    async confirmRegister({ login, password, code }) {
      const phone = normalizePhone(login);
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
    const plans = await subscriptionsApi.getPlans();
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
      start: now,
      end: dateMs(item.paidThrough, now),
      months: 1,
      auto: !item.cancelRequested,
      status: item.status,
      nextChargeAt: item.nextChargeAt,
      cancelRequested: Boolean(item.cancelRequested),
      method: "",
    }));

    const schedules = organizationId
      ? await Promise.all(
          realSubscriptions.map(async (subscription) => {
            try {
              return {
                subscription,
                schedule: await subscriptionsApi.getSchedule(organizationId, subscription.id),
              };
            } catch (error) {
              console.warn("[OPEN-LK] schedule error:", subscription.id, error);
              return { subscription, schedule: null };
            }
          })
        )
      : [];

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
        months: 1,
        start: dateMs(payment.periodStart, dateMs(payment.paidAt, now)),
        end: dateMs(payment.periodEnd, dateMs(payment.paidAt, now)),
        serviceEnd: dateMs(payment.periodEnd, dateMs(payment.paidAt, now)),
        subId: subscription.id,
        payerId: subscription.payerUserId || user.id || "",
        payer: {
          id: subscription.payerUserId || user.id || "",
          type: "person",
          name: profile.first + " " + profile.last,
          email: profile.email,
          phone: profile.phone,
        },
        method: "",
        created: dateMs(payment.paidAt, now),
        status: "paid",
        act: false,
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
    };
  };

  const loadUi = (realState) => {
    window.__OPEN_LK_REAL_STATE__ = realState;
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
    sessionStorage.setItem(DEMO_KEY, "1");
    loadUi({ demo: true, plans: [], subs: [] });
  };

  const redirectToLogin = () => {
    if (!isLoginPage()) window.location.assign("/login");
  };

  const init = async () => {
    const demoMode = sessionStorage.getItem(DEMO_KEY) === "1";

    if (isLoginPage()) {
      if (getToken()) {
        window.location.assign("/subscriptions");
        return;
      }
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
