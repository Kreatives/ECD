/* ============================================================
   Event Center Dordrecht — multi-step offerte formulier
   Vanilla JS. Stapnavigatie, voortgangsbalk, slider-readout,
   tegelselectie en validatie per stap. Verstuur gaat naar bedankt.html.
   ============================================================ */
(function () {
  'use strict';

  var form = document.querySelector('[data-offerte-form]');
  if (!form) return;

  var steps = Array.prototype.slice.call(form.querySelectorAll('.offerte-step'));
  var total = steps.length;
  if (!total) return;

  var prevBtn = form.querySelector('[data-prev]');
  var nextBtn = form.querySelector('[data-next]');
  var submitBtn = form.querySelector('[data-submit]');

  var fill = document.querySelector('[data-progress-fill]');
  var label = document.querySelector('[data-progress-label]');
  var pct = document.querySelector('[data-progress-pct]');

  var current = 0;

  function render() {
    steps.forEach(function (step, i) {
      step.classList.toggle('is-active', i === current);
    });

    var ratio = Math.round(((current + 1) / total) * 100);
    if (fill) fill.style.width = ratio + '%';
    if (label) label.textContent = 'Stap ' + (current + 1) + ' van ' + total;
    if (pct) pct.textContent = ratio + '%';

    var onFirst = current === 0;
    var onLast = current === total - 1;
    if (prevBtn) prevBtn.hidden = onFirst;
    if (nextBtn) nextBtn.hidden = onLast;
    if (submitBtn) submitBtn.hidden = !onLast;

    var active = steps[current];
    var focusTarget = active.querySelector('input, select, textarea');
    if (focusTarget && focusTarget.type !== 'radio' && focusTarget.type !== 'checkbox') {
      focusTarget.focus({ preventScroll: true });
    }
  }

  /* Valideer de verplichte velden binnen de huidige stap */
  function stepIsValid(step) {
    var required = Array.prototype.slice.call(step.querySelectorAll('[required]'));
    if (!required.length) return true;

    // Groepeer radio's op naam, zodat een groep als geheel telt.
    var seenRadio = {};
    for (var i = 0; i < required.length; i++) {
      var el = required[i];
      if (el.type === 'radio') {
        if (seenRadio[el.name]) continue;
        seenRadio[el.name] = true;
        var checked = step.querySelector('input[name="' + el.name + '"]:checked');
        if (!checked) { flag(el); return false; }
      } else if (!el.checkValidity()) {
        flag(el);
        return false;
      }
    }
    return true;
  }

  function flag(el) {
    el.reportValidity && el.reportValidity();
    var focusable = el.type === 'radio'
      ? el.closest('.offerte-step').querySelector('input[name="' + el.name + '"]')
      : el;
    if (focusable) focusable.focus({ preventScroll: true });
  }

  function goNext() {
    if (!stepIsValid(steps[current])) return;
    if (current < total - 1) {
      current++;
      render();
    }
  }

  function goPrev() {
    if (current > 0) {
      current--;
      render();
    }
  }

  if (nextBtn) nextBtn.addEventListener('click', goNext);
  if (prevBtn) prevBtn.addEventListener('click', goPrev);

  /* Enter in een tekstveld springt naar de volgende stap in plaats van te versturen */
  form.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    var tag = e.target.tagName;
    if (tag === 'TEXTAREA') return;
    if (current < total - 1) {
      e.preventDefault();
      goNext();
    }
  });

  /* Laatste controle bij versturen, daarna gaat de form zelf naar bedankt.html */
  form.addEventListener('submit', function (e) {
    if (!stepIsValid(steps[current])) {
      e.preventDefault();
    }
  });

  /* ---------- slider readout ---------- */
  var range = form.querySelector('[data-range]');
  var output = form.querySelector('[data-range-output]');
  if (range && output) {
    var updateRange = function () {
      output.textContent = range.value + ' gasten';
    };
    range.addEventListener('input', updateRange);
    updateRange();
  }

  render();
})();
