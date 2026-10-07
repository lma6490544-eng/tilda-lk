(function () {
  "use strict";

  const API_BASE = "https://pilot.metasymbiont.com/api/v1";
  const PLATFORM_VERSION = "web-1.0.0";
  const TOKEN_KEYS = ["tildaAuthToken", "authToken"];
  const UI_URL = "https://lma6490544-eng.github.io/tilda-lk/open-lk-ui.js?v=30";
  const CSS_URL = "https://lma6490544-eng.github.io/tilda-lk/open-lk.css?v=30";
  const DEMO_KEY = "openLkDemoMode";

  const ENTRY_PRELOADER_STYLE = `
#meta-preloader { --mp-void:#12120f; --mp-cycle:1.15s; --mp-rgb:196 114 74; --mp-sweep:100vh; --mp-dot:14px; --mp-gap:22px; --mp-lift:-18px; position:fixed !important; inset:0 !important; width:100vw !important; z-index:2147483647 !important; pointer-events:auto !important; opacity:1 !important; visibility:visible !important; contain:strict !important; }
#meta-preloader.is-gone { opacity:0 !important; visibility:hidden !important; pointer-events:none !important; }
.meta-preloader__veil { position:absolute !important; inset:0 !important; background:var(--mp-void) !important; display:grid !important; place-items:center !important; clip-path:inset(0 0 0 0); }
.meta-preloader__veil::before { content:""; position:absolute; inset:0; background:linear-gradient(to bottom,rgb(var(--mp-rgb) / .02) 0%,rgb(var(--mp-rgb) / .16) 45%,rgb(var(--mp-rgb) / .40) 100%); opacity:0; pointer-events:none; }
.meta-preloader__edge { --mp-edge-h:clamp(120px,26vh,220px); position:absolute; left:0; right:0; top:calc(var(--mp-edge-h) / -2); height:var(--mp-edge-h); opacity:0; pointer-events:none; background:linear-gradient(to bottom,rgb(var(--mp-rgb) / 0) 0%,rgb(var(--mp-rgb) / .08) 34%,rgb(var(--mp-rgb) / .55) 48.5%,rgb(var(--mp-rgb) / .95) 50%,rgb(var(--mp-rgb) / .40) 52%,rgb(var(--mp-rgb) / .05) 68%,rgb(var(--mp-rgb) / 0) 100%); }
#meta-preloader.is-leaving .meta-preloader__dots { opacity:0; scale:.86; transition:opacity .18s cubic-bezier(.4,0,1,1),scale .18s cubic-bezier(.4,0,1,1); }
#meta-preloader.is-leaving .meta-preloader__veil::before { opacity:1; transition:opacity .18s linear; }
#meta-preloader.is-leaving .meta-preloader__veil { clip-path:inset(100% 0 0 0); transition:clip-path .84s cubic-bezier(.62,0,.25,1) .26s; }
#meta-preloader.is-leaving .meta-preloader__edge { animation:mpEdge .84s cubic-bezier(.62,0,.25,1) .26s both; }
@keyframes mpEdge { 0%{opacity:0;transform:translateY(0)} 7%{opacity:1} 88%{opacity:1} 100%{opacity:0;transform:translateY(var(--mp-sweep))} }
.meta-preloader__dots { display:flex !important; align-items:center !important; justify-content:center !important; gap:var(--mp-gap) !important; line-height:0 !important; opacity:1; scale:1; }
.meta-preloader__dots i { display:block !important; width:var(--mp-dot) !important; height:var(--mp-dot) !important; flex:0 0 auto !important; border-radius:50% !important; background:var(--mp-color) !important; opacity:.25; translate:0 0; scale:1 1; will-change:opacity,translate,scale; animation-name:mpDotOpacity,mpDotTranslate,mpDotScale; animation-duration:var(--mp-cycle); animation-timing-function:linear; animation-iteration-count:var(--mp-loops, infinite); animation-delay:calc(var(--mp-index) * var(--mp-cycle) * .06818); }
@keyframes mpDotOpacity { 0%{animation-timing-function:cubic-bezier(.4,0,.2,1);opacity:.25} 3.636%{animation-timing-function:cubic-bezier(.25,1,.5,1);opacity:.5} 13.636%{animation-timing-function:cubic-bezier(.4,0,.2,1);opacity:1} 25%{animation-timing-function:cubic-bezier(.4,0,.2,1);opacity:.45} 34.091%{opacity:.25} 100%{opacity:.25} }
@keyframes mpDotTranslate { 0%{animation-timing-function:cubic-bezier(.4,0,.2,1);translate:0 0} 3.636%{animation-timing-function:cubic-bezier(.25,1,.5,1);translate:0 3px} 13.636%{animation-timing-function:linear(0,0.0188,0.0679,0.1374,0.2195,0.308,0.3978,0.4856,0.5686,0.6452,0.7142,0.7753,0.8283,0.8735,0.9113,0.9423,0.9671,0.9866,1.0014,1.0123,1.0198,1.0247,1.0283,1.0281,1.0268,1.025,1.0227,1.0202,1.0177,1.0152,1.0128,1.0106,1.0085,1.0068,1.0052,1.0039,1.0028,1.0018,1.0011,1.0005,1,0.9997,0.9995,0.9993,0.9992,0.9992,0.9992,0.9993,0.9993);translate:0 var(--mp-lift)} 25%{translate:0 0} 100%{translate:0 0} }
@keyframes mpDotScale { 0%{animation-timing-function:cubic-bezier(.4,0,.2,1);scale:1 1} 3.636%{animation-timing-function:cubic-bezier(.25,1,.5,1);scale:1.15 .85} 13.636%{animation-timing-function:cubic-bezier(.45,1.45,.8,1);scale:.85 1.25} 25%{animation-timing-function:linear;scale:1.12 .88} 34.091%{scale:1 1} 100%{scale:1 1} }
@media (max-width:768px){#meta-preloader{--mp-dot:12px;--mp-gap:18px;--mp-lift:-15px}.meta-preloader__edge{--mp-edge-h:clamp(100px,20vh,160px)}}
@media (prefers-reduced-motion:reduce){.meta-preloader__dots i{animation:none !important;translate:0 0 !important;scale:1 1 !important;opacity:1 !important}}
`;

  let entryPreloader = null;
  let entryPreloaderLeft = false;

  const ensureEntryPreloader = () => {
    if (entryPreloader && document.body && document.body.contains(entryPreloader)) {
      entryPreloader.classList.remove("is-leaving", "is-gone");
      entryPreloaderLeft = false;
      return entryPreloader;
    }
    if (!document.getElementById("meta-entry-preloader-style") && document.head) {
      const style = document.createElement("style");
      style.id = "meta-entry-preloader-style";
      style.textContent = ENTRY_PRELOADER_STYLE;
      document.head.appendChild(style);
    }
    if (!document.body) return null;
    const loader = document.createElement("div");
    loader.id = "meta-preloader";
    loader.setAttribute("role", "status");
    loader.setAttribute("aria-label", "Загрузка сайта МЕТА");
    loader.style.setProperty("--mp-loops", "infinite");
    loader.style.setProperty("--mp-cycle", "1.15s");
    loader.style.setProperty("--mp-rgb", "196 114 74");
    loader.dataset.useCurtain = isLoginPage() ? "1" : "0";
    loader.innerHTML = '<div class="meta-preloader__veil"><span class="meta-preloader__dots" aria-hidden="true">' +
      '<i style="--mp-color:#DCA028;--mp-index:0"></i>' +
      '<i style="--mp-color:#6155A9;--mp-index:1"></i>' +
      '<i style="--mp-color:#C4724A;--mp-index:2"></i>' +
      '<i style="--mp-color:#20B2C9;--mp-index:3"></i>' +
      '<i style="--mp-color:#3C5CA7;--mp-index:4"></i>' +
      '</span></div><div class="meta-preloader__edge" aria-hidden="true"></div>';
    document.body.appendChild(loader);
    entryPreloader = loader;
    entryPreloaderLeft = false;
    return loader;
  };

  const hideEntryPreloader = () => {
    const loader = entryPreloader && document.body && document.body.contains(entryPreloader)
      ? entryPreloader
      : document.getElementById("meta-preloader");
    if (!loader || entryPreloaderLeft) return;
    entryPreloaderLeft = true;
    const useCurtain = loader.dataset.useCurtain === "1";
    if (useCurtain) {
      loader.style.setProperty("--mp-sweep", loader.offsetHeight + "px");
      loader.classList.add("is-leaving");
    } else {
      loader.classList.add("is-simple-leaving");
    }
    const removeAfter = useCurtain ? 1120 : 220;
    window.setTimeout(() => {
      loader.classList.add("is-gone");
      if (loader.parentNode) loader.parentNode.removeChild(loader);
      entryPreloader = null;
    }, removeAfter);
  };

  window.__OPEN_LK_SHOW_PRELOADER__ = () => ensureEntryPreloader();
  window.__OPEN_LK_HIDE_PRELOADER__ = () => hideEntryPreloader();

  const bootstrapEntryPreloader = () => ensureEntryPreloader();

  const hideEntryPreloaderAfterPaint = () => {
    const startedAt = Date.now();
    const MAX_WAIT_MS = 8000;
    const waitForUi = () => {
      const root = document.getElementById("root");
      if (root && root.firstElementChild) {
        window.requestAnimationFrame(() => window.requestAnimationFrame(hideEntryPreloader));
        return;
      }
      if (Date.now() - startedAt >= MAX_WAIT_MS) {
        hideEntryPreloader();
        return;
      }
      window.requestAnimationFrame(waitForUi);
    };
    window.requestAnimationFrame(waitForUi);
  };

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
      window.location.replace("/subscriptions");
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

    listDocuments: (organizationId, limit = 50, offset = 0) =>
      request(
        "GET",
        `/subscriptions/organizations/${organizationId}/documents?limit=${encodeURIComponent(limit)}&offset=${encodeURIComponent(offset)}`
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

  auth.changePassword = async ({ oldPassword, newPassword, newPasswordConfirm }) => {
    if (!oldPassword) throw new Error("Введите текущий пароль.");
    if (!newPassword) throw new Error("Введите новый пароль.");
    if (newPassword !== newPasswordConfirm) throw new Error("Пароли не совпадают.");
    return request("PUT", "/auth/user/password", {
      oldPassword,
      newPassword,
      newPasswordConfirm,
    });
  };

  const feedbackApi = {
    send: (message) =>
      request("POST", "/tech-support/feedback", {
        message: String(message || "").trim(),
        timestamp: new Date().toISOString(),
        source: "web",
      }),
  };

  window.__OPEN_LK_AUTH__ = auth;
  window.__OPEN_LK_SUBSCRIPTIONS__ = subscriptionsApi;
  window.__OPEN_LK_PHONE__ = { normalizePhone, formatPhone };
  window.__OPEN_LK_FEEDBACK__ = feedbackApi;

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
      canRenew: active?.canRenew === true,
      remainingPercent:
        Number.isFinite(Number(active?.remainingPercent))
          ? Number(active.remainingPercent)
          : null,
      currentPeriodStart: active?.currentPeriodStart || start || null,
      currentPeriodEnd: active?.currentPeriodEnd || until || null,
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

  const mapDocument = (document, payerById) => {
    const payerId = document?.payerId || "";
    const payer = payerById[payerId] || {
      id: payerId,
      type: "person",
      name: "",
      email: document?.receiptEmail || "",
      phone: "",
    };
    const total = Number(document?.amountKopeks || 0) / 100;
    const status = document?.bankVerificationStatus === "BANK_UNAVAILABLE"
      ? "unknown"
      : "paid";
    const items = Array.isArray(document?.items)
      ? document.items.map((item, index) => ({
          id: `${document?.id || "document"}-${index}`,
          planId: document?.planCode || "",
          product: document?.planCode || "",
          planName: item?.name || document?.planCode || "",
          total: Number(item?.amountKopeks || 0) / 100,
          months: null,
          start: document?.bankPaidAt || document?.bankCreatedAt || null,
          end: null,
          serviceEnd: null,
          act: false,
        }))
      : [];
    return {
      id: document?.id || "",
      number: document?.bankOperationId || document?.id || "",
      planId: document?.planCode || "",
      product: document?.planCode || "",
      planName: items.map((item) => item.planName).join(", "),
      kind: "payment",
      method: "payment",
      total,
      months: null,
      start: document?.bankPaidAt || document?.bankCreatedAt || null,
      end: null,
      serviceEnd: null,
      subId: document?.subscriptionId || null,
      payerId,
      payer,
      created: document?.bankPaidAt || document?.bankCreatedAt || null,
      status,
      act: false,
      items,
      receiptPdfUrl: document?.receiptPdfUrl || null,
      fiscalNumber: document?.fiscalNumber || null,
      fiscalizedAt: document?.fiscalizedAt || null,
      fiscalReceiptStatus: document?.fiscalReceiptStatus || null,
      receiptEmail: document?.receiptEmail || null,
      bankOperationId: document?.bankOperationId || null,
      bankPaymentId: document?.bankPaymentId || null,
      bankPaymentType: document?.bankPaymentType || null,
      bankVerificationStatus: document?.bankVerificationStatus || null,
      bankCreatedAt: document?.bankCreatedAt || null,
      bankPaidAt: document?.bankPaidAt || null,
      currency: document?.currency || "RUB",
      documentItems: Array.isArray(document?.items) ? document.items : [],
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
        documents: [],
        rawDocuments: [],
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
    const [mySubscriptionsResult, tariffResults, payerResult, checkoutResult, paymentResult, documentResult] =
      await Promise.allSettled([
        subscriptionsApi.getMySubscriptions(organizationId, "ALL"),
        Promise.all([1, 3, 12].map((period) => subscriptionsApi.getTariffs(organizationId, period))),
        subscriptionsApi.getPayerDetails(organizationId),
        subscriptionsApi.listCheckouts(organizationId),
        subscriptionsApi.listPayments(organizationId),
        subscriptionsApi.listDocuments(organizationId),
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
    const documents =
      documentResult.status === "fulfilled" && Array.isArray(documentResult.value)
        ? documentResult.value
        : [];
    if (documentResult.status === "rejected") {
      apiErrors.documents = {
        message: documentResult.reason?.message || "Не удалось загрузить документы.",
        code: documentResult.reason?.code || "",
        traceId: documentResult.reason?.traceId || "",
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
    const mappedDocuments = documents.map((document) => mapDocument(document, payerById));
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
      documents: mappedDocuments,
      rawDocuments: documents,
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

  window.__OPEN_LK_OPEN_DOCUMENT__ = async (url, filename = "document.pdf") => {
    if (!url) throw new Error("Документ недоступен.");
    const absoluteUrl = /^https?:\/\//i.test(url)
      ? url
      : `${new URL(API_BASE).origin}${String(url).startsWith("/") ? url : `/${url}`}`;
    const token = getToken();
    const response = await fetch(absoluteUrl, {
      headers: token ? { Authorization: `Bearer ${token}`, accept: "application/pdf" } : { accept: "application/pdf" },
    });
    if (!response.ok) throw new Error(`Не удалось открыть документ (${response.status}).`);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.target = "_blank";
    anchor.rel = "noopener";
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
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
    async updateProfile(profile) {
      const user = window.__OPEN_LK_REAL_STATE__?.user || {};
      const payload = { id: user.id };
      const first = String(profile?.first || "").trim();
      const last = String(profile?.last || "").trim();
      const email = String(profile?.email || "").trim();
      const phone = String(profile?.phone || "").trim();
      if (first) payload.name = first;
      if (last) payload.surname = last;
      if (email) payload.mail = email;
      if (phone) payload.phoneNumber = phone;
      const updated = await auth.updateUser(payload);
      const realState = await refreshRealState();
      window.dispatchEvent(new CustomEvent("open-lk-real-state-updated", { detail: realState }));
      return updated;
    },
    changePassword: ({ oldPassword, newPassword, newPasswordConfirm }) =>
      auth.changePassword({ oldPassword, newPassword, newPasswordConfirm }),
    sendFeedback: (message) => feedbackApi.send(message),
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
    return null;
  };

  const ensureKnownRoute = () => {
    const route = getRoute();
    if (route) return route;
    window.location.replace(getToken() ? "/subscriptions" : "/login");
    return null;
  };

  const logout = () => {
    for (const key of TOKEN_KEYS) localStorage.removeItem(key);
    sessionStorage.removeItem(DEMO_KEY);
    window.__OPEN_LK_DEMO_MODE__ = false;
    window.__OPEN_LK_REAL_MODE__ = false;
    window.location.replace("/login");
  };

  window.__OPEN_LK_LOGOUT__ = logout;

  const installUiGuards = () => {
    if (window.__OPEN_LK_UI_GUARDS__) return;
    window.__OPEN_LK_UI_GUARDS__ = true;

    const isRealMode = () => Boolean(window.__OPEN_LK_REAL_MODE__);
    const toast = (message) => {
      let node = document.querySelector(".open-lk-guard-toast");
      if (!node) {
        node = document.createElement("div");
        node.className = "toast open-lk-guard-toast";
        node.setAttribute("role", "status");
        document.body.appendChild(node);
      }
      node.textContent = message;
      window.clearTimeout(window.__OPEN_LK_GUARD_TOAST_TIMER__);
      window.__OPEN_LK_GUARD_TOAST_TIMER__ = window.setTimeout(() => node.remove(), 4500);
    };

    document.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target.closest("button") : null;
      if (!target) return;
      const text = String(target.textContent || "").trim();
      if (text === "Выйти") {
        event.preventDefault();
        event.stopImmediatePropagation();
        logout();
      }
    }, true);

    document.addEventListener("submit", async (event) => {
      if (!isRealMode()) return;
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;

      const bodyField = form.querySelector('textarea[name="body"]');
      const subjectField = form.querySelector('input[name="subject"]');
      if (bodyField && subjectField && window.__OPEN_LK_REAL_ACTIONS__?.sendFeedback) {
        event.preventDefault();
        event.stopImmediatePropagation();
        const subject = String(subjectField.value || "").trim();
        const body = String(bodyField.value || "").trim();
        const message = subject ? `${subject}\n\n${body}` : body;
        try {
          await window.__OPEN_LK_REAL_ACTIONS__.sendFeedback(message);
          form.reset();
          toast("Принято в работу! Спасибо, что улучшаете продукт вместе с нами!");
          window.setTimeout(() => window.location.reload(), 500);
        } catch (error) {
          toast(error?.message || "Не удалось отправить обращение");
        }
        return;
      }

      const passwordField = form.querySelector('input[name="password"]');
      const confirmField = form.querySelector('input[name="confirm"]');
      if (passwordField && confirmField && window.__OPEN_LK_REAL_ACTIONS__?.changePassword) {
        event.preventDefault();
        event.stopImmediatePropagation();
        const oldField = form.querySelector('input[name="oldPassword"]');
        if (!oldField || !oldField.value) {
          toast("Введите текущий пароль.");
          return;
        }
        if (passwordField.value !== confirmField.value) {
          toast("Пароли не совпадают.");
          return;
        }
        try {
          await window.__OPEN_LK_REAL_ACTIONS__.changePassword({
            oldPassword: oldField.value,
            newPassword: passwordField.value,
            newPasswordConfirm: confirmField.value,
          });
          form.reset();
          toast("Пароль успешно изменён.");
          window.setTimeout(() => window.location.reload(), 500);
        } catch (error) {
          toast(error?.message || "Не удалось изменить пароль");
        }
        return;
      }

      const settingsInputs = Array.from(form.querySelectorAll('input')).filter((input) => input.type !== "checkbox");
      if (settingsInputs.length >= 4 && form.closest(".settings-section") && window.__OPEN_LK_REAL_ACTIONS__?.updateProfile) {
        event.preventDefault();
        event.stopImmediatePropagation();
        try {
          const [first, last, email, phone] = settingsInputs;
          await window.__OPEN_LK_REAL_ACTIONS__.updateProfile({
            first: first.value,
            last: last.value,
            email: email.value,
            phone: phone.value,
          });
          toast("Настройки сохранены");
          window.setTimeout(() => window.location.reload(), 500);
        } catch (error) {
          toast(error?.message || "Не удалось сохранить настройки");
        }
      }
    }, true);

    const addPasswordField = () => {
      if (!isRealMode()) return;
      const forms = document.querySelectorAll('form');
      for (const form of forms) {
        if (!(form instanceof HTMLFormElement)) continue;
        const passwordField = form.querySelector('input[name="password"]');
        const confirmField = form.querySelector('input[name="confirm"]');
        if (!passwordField || !confirmField || form.querySelector('input[name="oldPassword"]')) continue;
        const label = document.createElement("label");
        label.className = "field";
        const span = document.createElement("span");
        span.textContent = "Текущий пароль";
        const input = document.createElement("input");
        input.type = "password";
        input.name = "oldPassword";
        input.required = true;
        label.append(span, input);
        form.insertBefore(label, passwordField.closest("label") || passwordField);
      }
    };

    new MutationObserver(addPasswordField).observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener("open-lk-real-data", addPasswordField);
  };

  const loadUi = (realState, { onReady } = {}) => {
    const route = getRoute();
    if (!route) return;
    window.__OPEN_LK_ROUTE__ = route;
    window.__OPEN_LK_AUTH_PAGE__ = route === "login";
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

    installUiGuards();

    const script = document.createElement("script");
    script.src = UI_URL;
    script.async = false;
    script.onload = () => {
      window.dispatchEvent(new CustomEvent("open-lk-real-data", { detail: realState }));
      if (typeof onReady === "function") onReady();
    };
    script.onerror = () => {
      const root = document.getElementById("root");
      if (root) {
        root.innerHTML = "<div style=\"padding:24px;font:16px sans-serif\">Не удалось загрузить интерфейс кабинета.</div>";
      }
      if (typeof onReady === "function") onReady();
    };
    document.head.appendChild(script);
  };

  const openDemo = () => {
    sessionStorage.setItem(DEMO_KEY, "1");
    window.__OPEN_LK_DEMO_MODE__ = true;
    window.location.assign("/subscriptions");
  };

  const loadDemoUi = ({ onReady } = {}) => {
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
    }, { onReady });
  };

  const redirectToLogin = () => {
    if (!isLoginPage()) window.location.replace("/login");
  };

  let initPromise = null;
  let initGeneration = 0;

  const resetStalePreloaderForCurrentPage = () => {
    const loader = document.getElementById("meta-preloader");
    if (!loader) return;
    // A Tilda page can be restored from BFCache with the previous loader state.
    // Never keep a completed/half-left loader over a newly restored route.
    loader.classList.remove("is-leaving", "is-gone", "is-simple-leaving");
    loader.dataset.useCurtain = isLoginPage() ? "1" : "0";
    entryPreloader = loader;
    entryPreloaderLeft = false;
  };

  const init = async () => {
    const generation = ++initGeneration;
    const route = ensureKnownRoute();
    if (!route) return;
    const demoMode = sessionStorage.getItem(DEMO_KEY) === "1";

    if (isLoginPage()) {
      bootstrapEntryPreloader();
      loadDemoUi({ onReady: hideEntryPreloaderAfterPaint });
      return;
    }

    if (demoMode) {
      bootstrapEntryPreloader();
      loadDemoUi({ onReady: hideEntryPreloaderAfterPaint });
      return;
    }

    if (!getToken()) {
      redirectToLogin();
      return;
    }

    bootstrapEntryPreloader();

    try {
      const realState = await loadRealState();
      window.__OPEN_LK_DEMO_MODE__ = false;
      loadUi(realState, { onReady: hideEntryPreloaderAfterPaint });
    } catch (error) {
      hideEntryPreloader();
      console.error("[OPEN-LK] API error:", error);
      if (error?.status === 401 || error?.status === 403) {
        logout();
        return;
      }
      const root = document.getElementById("root");
      if (root) {
        root.innerHTML = `<div style=\"padding:24px;font:16px sans-serif\">${error?.message || "Ошибка загрузки данных"}</div>`;
      }
    }
  };

  const bootCurrentPage = () => {
    // Do not start two API/UI bootstraps for the same restored document.
    if (initPromise) return initPromise;
    initPromise = Promise.resolve().then(init).finally(() => {
      initPromise = null;
    });
    return initPromise;
  };

  // Tilda pages may be restored from the browser BFCache when the user presses Back/Forward.
  // In that case DOMContentLoaded does not fire again, so the React root/loader can otherwise
  // remain in a stale state. Re-bootstrap only for persisted restores.
  window.addEventListener("pageshow", (event) => {
    if (!event.persisted) return;
    resetStalePreloaderForCurrentPage();
    const root = document.getElementById("root");
    if (!root || !root.firstElementChild) {
      bootCurrentPage();
      return;
    }
    // If the restored page already has UI, make sure a stale loader cannot cover it.
    hideEntryPreloaderAfterPaint();
  });

  window.addEventListener("popstate", () => {
    // Covers hosts that restore/navigate Tilda content without a full document load.
    const route = getRoute();
    if (!route) {
      ensureKnownRoute();
      return;
    }
    resetStalePreloaderForCurrentPage();
    bootCurrentPage();
  });

  // Create the entry loader as early as possible, before Tilda/React can paint an empty page.
  bootstrapEntryPreloader();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootCurrentPage, { once: true });
  } else {
    bootCurrentPage();
  }
})();
