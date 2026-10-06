/* OPEN-LK Tilda entry point — no build step required.
 * Demo mode: when there is no auth token, the original demo UI is loaded unchanged.
 * Real mode: API data is loaded first, then the same UI is mounted with API-backed initial state.
 */
(function () {
  'use strict';

  var API_BASE = 'https://itprorab.metasymbiont.com/api/v1';
  var PLATFORM_VERSION = 'web-1.0.0';
  var TOKEN_KEYS = ['tildaAuthToken', 'authToken'];
  var UI_URL = './open-lk-ui.js';

  function token() {
    for (var i = 0; i < TOKEN_KEYS.length; i++) {
      try {
        var value = localStorage.getItem(TOKEN_KEYS[i]);
        if (value) return value;
      } catch (_) {}
    }
    return '';
  }

  function request(path, options) {
    options = options || {};
    var headers = Object.assign({
      accept: 'application/json',
      'x-platform-version': PLATFORM_VERSION
    }, options.headers || {});
    var t = token();
    if (t) headers.Authorization = 'Bearer ' + t;
    return fetch(API_BASE + path, Object.assign({}, options, { headers: headers })).then(function (r) {
      if (!r.ok) return r.text().then(function (body) {
        throw new Error('API ' + r.status + ': ' + (body || r.statusText));
      });
      return r.status === 204 ? null : r.json();
    });
  }

  function dateMs(value, fallback) {
    var n = Date.parse(value || '');
    return Number.isFinite(n) ? n : fallback;
  }

  function planMap(plans) {
    var map = {};
    (Array.isArray(plans) ? plans : []).forEach(function (p) {
      map[p.code] = {
        id: p.code,
        product: p.code,
        name: p.code,
        tier: '',
        price: Number(p.priceKopeks || 0) / 100,
        description: '',
        features: Array.isArray(p.features) ? p.features : [],
        icon: 'file'
      };
    });
    return map;
  }

  function makeState(user, subscriptions, plans) {
    var now = Date.now();
    var companies = Array.isArray(user.companies) ? user.companies : [];
    var favorite = companies.find(function (x) { return x && x.favorite; }) || companies[0];
    var organizationId = favorite && favorite.company && favorite.company.id;
    var profile = {
      first: user.name || '',
      last: user.surname || '',
      email: user.mail || '',
      phone: user.phoneNumber || '',
      ads: false,
      news: false,
      twoFactor: false
    };
    var payerId = user.id || '';
    var payer = {
      id: payerId,
      type: 'person',
      name: [user.name, user.surname, user.lastName].filter(Boolean).join(' '),
      email: user.mail || '',
      phone: user.phoneNumber || '',
      default: true
    };
    var subs = (Array.isArray(subscriptions) ? subscriptions : []).map(function (s) {
      var start = dateMs(s.paidThrough, now);
      var end = dateMs(s.paidThrough, now);
      return {
        id: s.id,
        planId: s.planCode,
        payerId: s.payerUserId || payerId,
        start: start,
        end: end,
        months: 1,
        auto: !s.cancelRequested,
        method: 'card',
        cardId: undefined
      };
    });
    return {
      schema: 2,
      clock: now,
      session: true,
      profile: profile,
      payers: [payer],
      cards: [],
      subs: subs,
      orders: [],
      tickets: [],
      events: [],
      __real: true,
      __organizationId: organizationId || '',
      __userId: user.id || ''
    };
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function mountDemo() {
    return loadScript(UI_URL);
  }

  function mountReal() {
    return Promise.all([
      request('/lk/user'),
      request('/subscriptions/plans')
    ]).then(function (base) {
      var user = base[0];
      var plans = base[1];
      var companies = Array.isArray(user.companies) ? user.companies : [];
      var favorite = companies.find(function (x) { return x && x.favorite; }) || companies[0];
      var organizationId = favorite && favorite.company && favorite.company.id;
      if (!organizationId) throw new Error('Не удалось определить organizationId из /lk/user');
      return request('/subscriptions/organizations/' + encodeURIComponent(organizationId)).then(function (subscriptions) {
        globalThis.__OPEN_LK_REAL_PLANS__ = Object.values(planMap(plans));
        globalThis.__OPEN_LK_REAL_STATE__ = makeState(user, subscriptions, plans);
        return loadScript(UI_URL);
      });
    });
  }

  function showError(error) {
    var root = document.getElementById('root');
    if (!root) return;
    root.innerHTML = '';
    var box = document.createElement('div');
    box.style.cssText = 'font-family:Arial,sans-serif;padding:40px;max-width:720px;margin:auto';
    var title = document.createElement('h2');
    title.textContent = 'Не удалось загрузить данные кабинета';
    var text = document.createElement('p');
    text.textContent = error && error.message ? error.message : 'Ошибка API';
    box.appendChild(title);
    box.appendChild(text);
    root.appendChild(box);
  }

  if (token()) {
    mountReal().catch(showError);
  } else {
    mountDemo().catch(showError);
  }
})();
