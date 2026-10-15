(function () {
  window.spSupportView = function (view) {
    ['help', 'contact', 'requests'].forEach(function (name) {
      var panel = document.getElementById('supportPanel-' + name);
      var tab = document.getElementById('supportTab-' + name);
      if (panel) panel.hidden = name !== view;
      if (tab) { tab.setAttribute('aria-selected', String(name === view)); tab.tabIndex = name === view ? 0 : -1; }
    });
    if (view === 'requests' && window.spLoadSupportRequests) window.spLoadSupportRequests();
  };
  var tabs = Array.from(document.querySelectorAll('.support-tab'));
  tabs.forEach(function (tab, index) {
    tab.addEventListener('keydown', function (event) {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      var next = tabs[(index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
      next.click(); next.focus();
    });
  });
  document.getElementById('supportSearch').addEventListener('input', function (event) {
    var query = event.target.value.trim().toLowerCase();
    var matches = 0;
    document.querySelectorAll('#faqList .faq-item').forEach(function (item) {
      item.hidden = item.textContent.toLowerCase().indexOf(query) === -1;
      if (!item.hidden) matches++;
    });
    document.getElementById('supportNoResults').hidden = matches > 0;
  });
})();