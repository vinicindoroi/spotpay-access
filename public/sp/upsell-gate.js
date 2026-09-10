/**
 * Gate + repasse de parâmetros dos upsells Spotify.
 * Mesmas regras dos upsells MetaPay (/up1, /up2), EXCETO a checagem de utm_campaign.
 * Sem marcador de compra -> volta para a versão segura (White).
 */
(function () {
  var PARAMS_KEY = 'funnel_params';
  var BLACK_KEY = 'upsell_black_funnel';
  var TTL_MS = 6 * 60 * 60 * 1000;

  function readStored() {
    try {
      var raw = localStorage.getItem(PARAMS_KEY);
      if (!raw) return {};
      var parsed = JSON.parse(raw);
      if (!parsed || !parsed.t || Date.now() - parsed.t > TTL_MS) {
        localStorage.removeItem(PARAMS_KEY);
        return {};
      }
      return parsed.p || {};
    } catch (e) { return {}; }
  }

  function allParams() {
    var merged = readStored();
    try {
      new URLSearchParams(location.search).forEach(function (v, k) { if (v) merged[k] = v; });
    } catch (e) {}
    return merged;
  }

  function persist(p) {
    try { localStorage.setItem(PARAMS_KEY, JSON.stringify({ t: Date.now(), p: p })); } catch (e) {}
  }

  function markBlackFunnel() {
    try { localStorage.setItem(BLACK_KEY, String(Date.now())); } catch (e) {}
  }

  function hasBlackFunnel() {
    try {
      var raw = localStorage.getItem(BLACK_KEY);
      if (!raw) return false;
      var ts = Number(raw);
      if (!isFinite(ts)) return false;
      if (Date.now() - ts > TTL_MS) { localStorage.removeItem(BLACK_KEY); return false; }
      return true;
    } catch (e) { return false; }
  }

  function isDev() {
    var h = location.hostname;
    if (h === 'localhost' || h === '127.0.0.1') return true;
    if (h.indexOf('id-preview--') === 0) return true;
    if (h.indexOf('-dev.lovable.app') > -1) return true;
    if (h.indexOf('.lovableproject.com') > -1) return true;
    if (h.indexOf('.sandbox.lovable.dev') > -1) return true;
    try {
      if (new URLSearchParams(location.search).get('dev') === '1') return true;
    } catch (e) {}
    return false;
  }

  function allowed(p) {
    function g(k) { return p[k] == null ? '' : String(p[k]); }
    var campaign = (g('utm_campaign') || g('campaign') || g('utm_campaign_name')).toLowerCase();
    // Regra "cinza": campanha white nunca entra no upsell black
    if (campaign.indexOf('white') > -1) return false;

    var hasPurchaseId = !!(g('ppayId') || g('payer') || g('transaction_id') || g('transactionId') || g('order_id') || g('orderId'));
    if (hasPurchaseId) return true;

    var status = g('status').toLowerCase();
    var buyer = g('e') || g('email') || g('payerName') || g('fullName');
    if (buyer && (status === 'approved' || status === 'paid' || !!g('planId') || !!g('productId'))) return true;

    var sck = g('sck') || g('src') || g('utm_content');
    if (sck.length > 10) return true;

    if (g('ur') === '1') return true;

    return hasBlackFunnel();
  }

  var params = allParams();
  persist(params);

  window.spUpsellParams = params;

  window.spWithParams = function (url, extra) {
    var all = allParams();
    if (extra) { for (var k in extra) { if (extra[k]) all[k] = extra[k]; } }
    var hashSplit = url.split('#');
    var hash = hashSplit[1] ? '#' + hashSplit[1] : '';
    var pathSplit = hashSplit[0].split('?');
    var qs = new URLSearchParams(pathSplit[1] || '');
    for (var key in all) { if (!qs.has(key)) qs.set(key, all[key]); }
    var q = qs.toString();
    return pathSplit[0] + (q ? '?' + q : '') + hash;
  };

  if (!isDev() && !allowed(params)) {
    location.replace('/');
    return;
  }

  markBlackFunnel();
})();
