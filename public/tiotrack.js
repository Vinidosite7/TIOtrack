(function () {
  'use strict';

  var script = document.currentScript;
  if (!script) return;

  var workspaceId = script.getAttribute('data-workspace');
  if (!workspaceId) {
    console.warn('[TioTrack] data-workspace ausente');
    return;
  }

  window.__TIO_TRACK_INSTANCES__ = window.__TIO_TRACK_INSTANCES__ || {};
  if (window.__TIO_TRACK_INSTANCES__[workspaceId]) return;
  window.__TIO_TRACK_INSTANCES__[workspaceId] = true;

  var productId = script.getAttribute('data-product') || null;
  var funnelId = script.getAttribute('data-funnel') || null;
  var stepKey = script.getAttribute('data-step') || null;
  var mode = script.getAttribute('data-mode') || 'presell';
  var autoSpa = script.getAttribute('data-spa') !== 'false';
  var autoDecorate = script.getAttribute('data-auto-decorate') !== 'false';
  var autoPageView = script.getAttribute('data-pageview') !== 'false' && mode !== 'direct';
  var clickParam = script.getAttribute('data-click-param') || 'click_id';
  var endpoint = script.getAttribute('data-endpoint') || (script.src ? new URL('/api/traffic/collect', script.src).toString() : '/api/traffic/collect');

  var configuredDomains = (script.getAttribute('data-outbound-domains') || '')
    .split(',')
    .map(function (v) { return v.trim().toLowerCase(); })
    .filter(Boolean);

  var UTM_KEYS = [
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'utm_id'
  ];

  var AD_CLICK_KEYS = [
    'fbclid', 'ttclid', 'gclid', 'kwclid', 'kwai_click_id', 'tsclid'
  ];

  var EXTRA_KEYS = [
    '_fbp', '_fbc', 'callback', 'src', 'sck', 'xcod', 'cv', 'shk', 'ph', '_bp', '_sp',
    'salesCode', 'codigo_de_vendas'
  ];

  var CAPTURE_KEYS = UTM_KEYS.concat(AD_CLICK_KEYS, EXTRA_KEYS, ['click_id', 'tio_click_id']);
  var OUTBOUND_KEYS = UTM_KEYS.concat(AD_CLICK_KEYS, EXTRA_KEYS);

  function id(prefix) {
    if (window.crypto && crypto.randomUUID) {
      return prefix + '_' + crypto.randomUUID().replace(/-/g, '').slice(0, 20);
    }
    return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
  }

  function safeGet(storage, key) {
    try { return storage.getItem(key); } catch (_) { return null; }
  }

  function safeSet(storage, key, value) {
    try { storage.setItem(key, value); } catch (_) {}
  }

  function safeJsonGet(storage, key) {
    try {
      var raw = storage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function safeJsonSet(storage, key, value) {
    try { storage.setItem(key, JSON.stringify(value)); } catch (_) {}
  }

  function getOrSet(storage, key, prefix) {
    var existing = safeGet(storage, key);
    if (existing) return existing;
    var created = id(prefix);
    safeSet(storage, key, created);
    return created;
  }

  function inboundInternalClickId() {
    try {
      var params = new URLSearchParams(location.search);
      var direct = params.get('tio_click_id');
      if (direct) return direct;
      var generic = params.get('click_id');
      if (generic && /^tio[_-]/i.test(generic)) return generic;
    } catch (_) {}
    return null;
  }

  var visitorId = getOrSet(localStorage, 'tio_visitor_id', 'vis');
  var leadId = getOrSet(localStorage, 'tio_lead_id', 'lead');
  var sessionId = getOrSet(sessionStorage, 'tio_session_id', 'ses');
  var clickId = inboundInternalClickId() || getOrSet(sessionStorage, 'tio_click_id', 'tio');
  safeSet(sessionStorage, 'tio_click_id', clickId);

  function incomingParams() {
    var out = {};
    var params;
    try { params = new URLSearchParams(location.search); } catch (_) { return out; }

    CAPTURE_KEYS.forEach(function (key) {
      var value = params.get(key);
      if (value) out[key] = value;
    });
    return out;
  }

  function mergeTracking(base, incoming) {
    var out = {};
    Object.keys(base || {}).forEach(function (key) {
      if (base[key] != null && base[key] !== '') out[key] = base[key];
    });
    Object.keys(incoming || {}).forEach(function (key) {
      if (incoming[key] != null && incoming[key] !== '') out[key] = incoming[key];
    });
    return out;
  }

  function captureTracking() {
    var incoming = incomingParams();
    var current = safeJsonGet(sessionStorage, 'tio_tracking') || {};
    var merged = mergeTracking(current, incoming);

    if (Object.keys(incoming).length) {
      safeJsonSet(sessionStorage, 'tio_tracking', merged);
      safeJsonSet(localStorage, 'tio_last_touch', merged);
      if (!safeJsonGet(localStorage, 'tio_first_touch')) {
        safeJsonSet(localStorage, 'tio_first_touch', merged);
      }
    } else if (!Object.keys(current).length) {
      merged = safeJsonGet(localStorage, 'tio_last_touch') || {};
      if (Object.keys(merged).length) safeJsonSet(sessionStorage, 'tio_tracking', merged);
    }

    return merged;
  }

  function publicTracking(tracking) {
    var out = {};
    UTM_KEYS.concat(['fbclid', 'ttclid', 'gclid']).forEach(function (key) {
      out[key] = tracking[key] || null;
    });
    return out;
  }

  function extraTracking(tracking) {
    var out = {};
    Object.keys(tracking || {}).forEach(function (key) {
      if (UTM_KEYS.indexOf(key) >= 0) return;
      if (['fbclid', 'ttclid', 'gclid', 'tio_click_id'].indexOf(key) >= 0) return;
      out[key] = tracking[key];
    });
    return out;
  }

  var tracking = captureTracking();
  var lastPageUrl = '';

  function buildPayload(eventName, metadata, options) {
    options = options || {};
    tracking = captureTracking();

    var firstTouch = safeJsonGet(localStorage, 'tio_first_touch') || {};
    var lastTouch = safeJsonGet(localStorage, 'tio_last_touch') || tracking || {};
    var eventMetadata = metadata || {};
    eventMetadata.tiotrack = Object.assign({}, eventMetadata.tiotrack || {}, {
      mode: mode,
      first_touch: firstTouch,
      last_touch: lastTouch,
      tracking_extra: extraTracking(tracking)
    });

    return Object.assign({
      workspace_id: workspaceId,
      request_id: id('req'),
      event_id: options.event_id || id('web'),
      visitor_id: visitorId,
      lead_id: leadId,
      session_id: sessionId,
      click_id: clickId,
      product_id: options.product_id || productId,
      funnel_id: options.funnel_id || funnelId,
      step_key: options.step_key || stepKey,
      event_name: eventName,
      path: location.pathname,
      landing_url: location.href,
      referer: document.referrer || null,
      language: navigator.language || null,
      metadata: eventMetadata
    }, publicTracking(tracking));
  }

  function transport(payload) {
    var body = JSON.stringify(payload);
    try {
      if (navigator.sendBeacon && document.visibilityState === 'hidden') {
        var blob = new Blob([body], { type: 'application/json' });
        if (navigator.sendBeacon(endpoint, blob)) return;
      }
    } catch (_) {}

    try {
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body,
        keepalive: true,
        credentials: 'omit'
      });
    } catch (_) {}
  }

  function send(eventName, metadata, options) {
    var payload = buildPayload(eventName, metadata, options);
    transport(payload);
    return payload.event_id;
  }

  function shouldDecorateAnchor(anchor) {
    if (!anchor || !anchor.getAttribute) return false;
    if (anchor.hasAttribute('data-tio-no-decorate')) return false;
    if (anchor.hasAttribute('data-tio-outbound') || anchor.hasAttribute('data-tio-propagate')) return true;

    var href = anchor.getAttribute('href');
    if (!href || /^(#|mailto:|tel:|javascript:)/i.test(href)) return false;

    try {
      var url = new URL(href, location.href);
      var host = url.hostname.toLowerCase();

      if (configuredDomains.indexOf(host) >= 0) return true;
      for (var i = 0; i < configuredDomains.length; i++) {
        var configured = configuredDomains[i];
        if (configured && host.slice(-(configured.length + 1)) === '.' + configured) return true;
      }

      // Shark links used by the current Tiotrack integration.
      if (host === 'serverflow.dad' || host.slice(-15) === '.serverflow.dad') return true;
      if (url.searchParams.has('shk')) return true;

      // Shark can serve tracking links through custom/branded domains.
      // Detect only external links on the known Shark-style route shapes
      // instead of decorating every external link on the page.
      var isExternal = host && host !== location.hostname.toLowerCase();
      if (isExternal && /^\/(?:l|c|b)\//i.test(url.pathname)) return true;

      return false;
    } catch (_) {
      return false;
    }
  }

  function decorateUrl(originalHref, options) {
    options = options || {};
    tracking = captureTracking();

    try {
      var url = new URL(originalHref, location.href);
      var paramName = options.clickParam || clickParam;

      // Tiotrack owns the deterministic downstream correlation id.
      url.searchParams.set(paramName, clickId);

      OUTBOUND_KEYS.forEach(function (key) {
        var value = tracking[key];
        if (!value) return;
        if (!url.searchParams.has(key)) url.searchParams.set(key, value);
      });

      return url.toString();
    } catch (_) {
      return originalHref;
    }
  }

  function decorateAnchor(anchor) {
    if (!shouldDecorateAnchor(anchor)) return false;
    var href = anchor.getAttribute('href');
    if (!href) return false;

    var paramName = anchor.getAttribute('data-tio-propagate') || anchor.getAttribute('data-tio-click-param') || clickParam;
    var decorated = decorateUrl(href, { clickParam: paramName });
    if (decorated !== href) anchor.setAttribute('href', decorated);
    anchor.setAttribute('data-tio-decorated', '1');
    return true;
  }

  function decorateWithin(root) {
    if (!autoDecorate || !root) return;

    if (root.matches && root.matches('a[href]')) decorateAnchor(root);
    if (!root.querySelectorAll) return;

    var anchors = root.querySelectorAll('a[href]');
    for (var i = 0; i < anchors.length; i++) decorateAnchor(anchors[i]);
  }

  function decorateAll() {
    decorateWithin(document);
  }

  function trackPage(reason) {
    if (!autoPageView) return;
    var url = location.href;
    if (url === lastPageUrl) return;
    lastPageUrl = url;
    send('page_view', { navigation: reason || 'page', source_owner: 'presell' });
  }

  window.TioTrack = {
    track: send,
    identify: function (data) {
      data = data || {};
      safeSet(localStorage, 'tio_identity', JSON.stringify(data));
      return send('identify', data);
    },
    setContext: function (context) {
      context = context || {};
      productId = context.product_id || productId;
      funnelId = context.funnel_id || funnelId;
      stepKey = context.step_key || stepKey;
    },
    decorate: decorateUrl,
    decorateAll: decorateAll,
    propagate: function (url, paramName) {
      return decorateUrl(url, { clickParam: paramName || clickParam });
    },
    visitorId: visitorId,
    leadId: leadId,
    sessionId: sessionId,
    clickId: clickId,
    mode: mode
  };

  function onReady() {
    tracking = captureTracking();
    decorateAll();
    trackPage('initial');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady, { once: true });
  } else {
    onReady();
  }

  // Decorate before normal click handling too, in case a link changed dynamically.
  document.addEventListener('pointerdown', function (event) {
    var anchor = event.target && event.target.closest ? event.target.closest('a[href]') : null;
    if (anchor) decorateAnchor(anchor);
  }, true);

  document.addEventListener('click', function (event) {
    var target = event.target && event.target.closest ? event.target.closest('a[href],[data-tio-event]') : null;
    if (!target) return;

    var href = target.getAttribute('href');
    var decorated = false;
    if (target.matches && target.matches('a[href]')) {
      decorated = decorateAnchor(target);
      href = target.getAttribute('href');
    }

    var explicitEvent = target.getAttribute('data-tio-event');
    if (!explicitEvent && !decorated && !target.hasAttribute('data-tio-outbound')) return;

    send(explicitEvent || 'outbound_click', {
      href: href || null,
      decorated: decorated,
      text: (target.textContent || '').trim().slice(0, 180) || null
    }, {
      step_key: target.getAttribute('data-tio-step') || stepKey
    });
  }, true);

  if (autoDecorate && window.MutationObserver) {
    try {
      var observer = new MutationObserver(function (mutations) {
        for (var i = 0; i < mutations.length; i++) {
          var added = mutations[i].addedNodes || [];
          for (var j = 0; j < added.length; j++) {
            if (added[j] && added[j].nodeType === 1) decorateWithin(added[j]);
          }
        }
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
    } catch (_) {}
  }

  if (autoSpa && window.history) {
    ['pushState', 'replaceState'].forEach(function (method) {
      var original = history[method];
      if (typeof original !== 'function') return;
      history[method] = function () {
        var result = original.apply(this, arguments);
        setTimeout(function () {
          tracking = captureTracking();
          decorateAll();
          trackPage(method);
        }, 0);
        return result;
      };
    });

    window.addEventListener('popstate', function () {
      setTimeout(function () {
        tracking = captureTracking();
        decorateAll();
        trackPage('popstate');
      }, 0);
    });
  }

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') {
      send('session_ping', { visibility: 'hidden' });
    }
  });
})();
