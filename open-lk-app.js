(function () {
  "use strict";

  const API_BASE = "https://itprorab.metasymbiont.com/api/v1";
  const PLATFORM_VERSION = "web-1.0.0";
  const TOKEN_KEYS = ["tildaAuthToken", "authToken"];
  const UI_URL = "https://lma6490544-eng.github.io/tilda-lk/open-lk-ui.js";

  const getToken = () => {
    for (const key of TOKEN_KEYS) {
      const value = localStorage.getItem(key);
      if (value) return value;
    }
    return "";
  };

  const request = async (method, endpoint, body) => {
    const token = getToken();
    const headers = {
      accept: "application/json",
      "x-platform-version": PLATFORM_VERSION,
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

  const auth = {
    async login({ login, password }) {
      const data = await request("POST", "/auth/login", { login, password, phone: "" });
      saveToken(extractToken(data));
      return data;
    },

    async sendRegisterPin({ login }) {
      return request("POST", "/auth/user/phone/pin", { login });
    },

    async confirmRegister({ login, password, code }) {
      const confirmation = await request("POST", "/auth/user/phone/pin/confirm", {
        pin: code,
        login,
      });

      if (confirmation?.status && confirmation.status !== "PHONE_CONFIRMED") {
        throw new Error("Телефон не подтверждён.");
      }

      const data = await request("POST", "/auth/user", {
        login,
        password,
        politicAgreements: true,
        hash: crypto.randomUUID(),
      });
      saveToken(extractToken(data));
      return data;
    },
  };

  window.__OPEN_LK_AUTH__ = auth;

  const dateMs = (value, fallback) => {
    const parsed = Date.parse(value || "");
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const loadRealState = async () => {
    const user = await request("GET", "/lk/user");
    const companies = Array.isArray(user.companies) ? user.companies : [];
    const favorite = companies.find((item) => item?.favorite) || companies[0];
    const organizationId = favorite?.company?.id || "";
    const plans = await request("GET", "/subscriptions/plans");
    const subscriptions = organizationId
      ? await request(`/subscriptions/organizations/${organizationId}`)
      : [];

    const profile = {
      first: user.name || "",
      last: user.surname || "",
      middle: user.lastName || "",
      email: user.mail || "",
      phone: user.phoneNumber || "",
      avatar: user.userPhoto?.[0]?.fileUrl || "",
    };

    const now = Date.now();
    const subs = (Array.isArray(subscriptions) ? subscriptions : []).map((item) => ({
      id: item.id,
      planId: item.planCode,
      payerId: item.payerUserId || user.id || "",
      start: dateMs(item.paidThrough, now),
      end: dateMs(item.paidThrough, now),
      auto: !item.cancelRequested,
      status: item.status,
      nextChargeAt: item.nextChargeAt,
    }));

    return {
      user,
      profile,
      organizationId,
      subs,
      plans: Array.isArray(plans) ? plans : [],
    };
  };

  const loadUi = (realState) => {
    window.__OPEN_LK_REAL_STATE__ = realState;
    window.__OPEN_LK_REAL_PLANS__ = realState.plans;

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

  const loadDemoUi = () => loadUi({ demo: true, plans: [], subs: [] });

  const init = async () => {
    if (!getToken()) {
      loadDemoUi();
      return;
    }

    try {
      const realState = await loadRealState();
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
