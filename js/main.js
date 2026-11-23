(function () {
  'use strict';

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var nf = new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 0 });
  function fmt(n) { return nf.format(n).replace(/\s/g, ' '); }
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  /* число, що «набігає» до значення; кінцеве значення ставиться гарантовано */
  function countTo(el, to, ms, delay, suffix) {
    suffix = suffix || '';
    var done = function () { el.textContent = fmt(to) + suffix; };
    if (reduce) { done(); return; }
    el.textContent = fmt(0) + suffix;
    var start = null;
    function tick(t) {
      if (start === null) start = t;
      var p = Math.min(1, (t - start) / ms);
      var e = 1 - Math.pow(2, -10 * p);
      el.textContent = fmt(Math.round(to * (p >= 1 ? 1 : e))) + suffix;
      if (p < 1) requestAnimationFrame(tick); else done();
    }
    setTimeout(function () { requestAnimationFrame(tick); }, delay || 0);
    setTimeout(done, (delay || 0) + ms + 400);
  }

  /* поява під час прокрутки */
  var seen = $$('.rv, .wipe, [data-obs]');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });
    seen.forEach(function (el) { io.observe(el); });
  } else {
    seen.forEach(function (el) { el.classList.add('in'); });
  }

  /* аркуш кошторису: сценарій і повтор */
  var sheet = $('#sheet'), total = $('#total');
  var totalTo = total ? +total.getAttribute('data-to') : 0;
  function playSheet() {
    if (!sheet || reduce) return;
    sheet.classList.remove('play');
    void sheet.offsetWidth;
    sheet.classList.add('play');
    countTo(total, totalTo, 1000, 2300);
  }
  if (sheet) {
    var r = $('#replay');
    if (r) r.addEventListener('click', playSheet);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(playSheet); else playSheet();
  }

  /* легкий паралакс фото на першому екрані */
  var hb = $('#heroBg');
  if (hb && !reduce) {
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () {
        var y = window.scrollY;
        if (y < 1400) hb.style.setProperty('--py', (y * 0.18).toFixed(1) + 'px');
        ticking = false;
      });
    }, { passive: true });
  }

  /* гарантія: 36 */
  var g = $('#g36');
  if (g && 'IntersectionObserver' in window && !reduce) {
    var gio = new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) { countTo(g, 36, 1100, 150); gio.disconnect(); }
    }, { threshold: 0.4 });
    gio.observe(g);
  }

  /* симулятор подорожчання */
  var inc = $('#inc');
  if (inc) {
    var BASE = 812000, SHARE = 0.4;
    var X0 = 56, X1 = 500, Y0 = 226, H = 202, V0 = 780000, VR = 180000;
    function y(v) { return Math.max(18, Math.min(Y0, Y0 - (v - V0) / VR * H)); }
    function x(w) { return X0 + (X1 - X0) * w / 10; }
    function r1(n) { return Math.round(n * 10) / 10; }
    function drawChart() {
      var pct = +inc.value;
      var fin = Math.round(BASE * (1 + SHARE * pct / 100) / 100) * 100;
      var step = (fin - BASE) / 4;
      var d = 'M' + X0 + ' ' + r1(y(BASE));
      for (var k = 1; k <= 4; k++) {
        d += 'H' + r1(x(k * 2)) + 'V' + r1(y(BASE + step * k));
      }
      d += 'H' + X1;
      $('#theirs').setAttribute('d', d);
      $('#oursL').setAttribute('y', r1(y(BASE) + 22));
      var ty = y(fin) - 11;
      if (pct < 3) ty = y(fin) + 22;
      $('#theirsL').setAttribute('y', r1(ty));
      $('#incVal').textContent = pct + '%';
      $('#theirsV').textContent = fmt(fin) + ' ₴';
      var diff = fin - BASE;
      $('#theirsD').textContent = diff > 0 ? 'на ' + fmt(diff) + ' ₴ більше' : 'без змін';
    }
    inc.addEventListener('input', drawChart);
    drawChart();
    var chart = $('#chart');
    if (chart && 'IntersectionObserver' in window) {
      var cio = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { chart.classList.add('in'); cio.disconnect(); }
      }, { threshold: 0.3 });
      cio.observe(chart);
    } else if (chart) { chart.classList.add('in'); }
  }

  /* калькулятор вартості */
  var area = $('#area');
  if (area) {
    var tiers = $$('input[name="tier"]');
    function calc() {
      var t = tiers.filter(function (i) { return i.checked; })[0] || tiers[1];
      var a = +area.value;
      $('#areaV').textContent = a;
      $('#calcSum').textContent = fmt(+t.getAttribute('data-min') * a) + ' – ' + fmt(+t.getAttribute('data-max') * a) + ' ₴';
      $('#calcTerm').textContent = 'Термін: ' + t.getAttribute('data-term');
    }
    area.addEventListener('input', calc);
    tiers.forEach(function (t) { t.addEventListener('change', calc); });
    calc();
  }

  /* форма (демо: нікуди не надсилається) */
  var form = $('#form');
  if (form) {
    function okPhone(v) { var d = v.replace(/\D/g, ''); return d.length >= 10 && d.length <= 13; }
    function mark(id, bad) { $(id).classList.toggle('bad', bad); }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var nm = $('#name').value.trim(), ph = $('#phone').value, tp = $('#type').value;
      var consent = $('.cons input', form);
      mark('#fN', !nm); mark('#fP', !okPhone(ph)); mark('#fT', !tp);
      $('.cons', form).classList.toggle('bad', !consent.checked);
      if (!nm) { $('#name').focus(); return; }
      if (!okPhone(ph)) { $('#phone').focus(); return; }
      if (!tp) { $('#type').focus(); return; }
      if (!consent.checked) { consent.focus(); return; }
      form.style.display = 'none';
      var ok = $('#ok'); ok.classList.add('show'); ok.setAttribute('tabindex', '-1'); ok.focus();
    });
    $$('input,select', form).forEach(function (f) {
      f.addEventListener('input', function () { var w = f.closest('.fld'); if (w) w.classList.remove('bad'); });
    });
  }

  /* нижня кнопка на мобільному */
  var mcta = $('#mcta'), hero = $('.hero'), fin = $('#final-form');
  if (mcta && hero && fin && 'IntersectionObserver' in window) {
    var heroGone = false, finalIn = false;
    function upd() { mcta.classList.toggle('show', heroGone && !finalIn); }
    new IntersectionObserver(function (es) { var e = es[0]; heroGone = !e.isIntersecting && e.boundingClientRect.top < 0; upd(); }).observe(hero);
    new IntersectionObserver(function (es) { finalIn = es[0].isIntersecting; upd(); }, { threshold: 0.15 }).observe(fin);
  }
})();
