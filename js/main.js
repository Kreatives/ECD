/* Event Center Dordrecht — interactions */
document.documentElement.classList.add('js');

(function () {
  'use strict';

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGSAP = typeof window.gsap !== 'undefined';

  if (hasGSAP) gsap.registerPlugin(ScrollTrigger);

  /* ---------- oval buttons: flip-laag achter een vaste tekst ---------- */
  document.querySelectorAll('.btn--oval').forEach((el) => {
    if (el.querySelector('.btn-oval__flip')) return;
    const txt = el.textContent.trim();
    el.innerHTML =
      '<span class="btn-oval__flip" aria-hidden="true">' +
        '<span class="btn-oval__face btn-oval__face--front"></span>' +
        '<span class="btn-oval__face btn-oval__face--back"></span>' +
      '</span>' +
      '<span class="btn-oval__label">' + txt + '</span>';
  });

  /* ---------- sticky "Neem contact op" CTA (op elke pagina geïnjecteerd) ---------- */
  (function initContactCta() {
    if (document.querySelector('[data-contact-cta]')) return;
    const wrap = document.createElement('div');
    wrap.className = 'contact-cta';
    wrap.setAttribute('data-contact-cta', '');
    wrap.innerHTML =
      '<div class="contact-cta__panel" role="dialog" aria-label="Contactgegevens">' +
        '<a class="contact-cta__link" href="https://wa.me/31854002424"><span class="contact-cta__link-label">WhatsApp</span><span class="contact-cta__link-value">085 400 2424</span></a>' +
        '<a class="contact-cta__link" href="mailto:info@ecdordrecht.nl"><span class="contact-cta__link-label">E-mail</span><span class="contact-cta__link-value">info@ecdordrecht.nl</span></a>' +
        '<a class="contact-cta__link" href="tel:0854002424"><span class="contact-cta__link-label">Telefoon</span><span class="contact-cta__link-value">085 400 2424</span></a>' +
        '<a class="btn btn--gold contact-cta__offerte" href="offerte.html">Vraag offerte aan</a>' +
      '</div>' +
      '<button class="contact-cta__toggle" type="button" aria-expanded="false"><span class="contact-cta__label">Neem contact op</span><span class="contact-cta__plus" aria-hidden="true"></span></button>';
    document.body.appendChild(wrap);
    const toggle = wrap.querySelector('.contact-cta__toggle');
    const setOpen = (open) => { wrap.classList.toggle('is-open', open); toggle.setAttribute('aria-expanded', String(open)); };
    toggle.addEventListener('click', (e) => { e.stopPropagation(); setOpen(!wrap.classList.contains('is-open')); });
    document.addEventListener('click', (e) => { if (!wrap.contains(e.target)) setOpen(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
  })();

  /* Native scroll only. No smooth-scroll library: it felt laggy and floaty,
     so the page uses the browser's own scrolling for a direct, predictable feel.
     Anchor jumps use native smooth behaviour via CSS scroll-behavior. */

  /* anchor links -> native smooth scroll to section */
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' });
    });
  });

  /* ---------- Header solid on scroll ---------- */
  const header = document.querySelector('[data-header]');
  const forceSolid = document.body.hasAttribute('data-solid-header');
  const onScroll = () => {
    if (forceSolid || window.scrollY > window.innerHeight * 0.6) header.classList.add('is-solid');
    else header.classList.remove('is-solid');
  };
  if (header) { window.addEventListener('scroll', onScroll, { passive: true }); onScroll(); }

  /* ---------- Mobile nav toggle (simple reveal of left nav) ---------- */
  const navToggle = document.querySelector('[data-nav-toggle]');
  if (navToggle) {
    navToggle.addEventListener('click', () => {
      const open = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', String(!open));
      const target = document.querySelector('#zalen');
      if (!open && target) {
        if (lenis) lenis.scrollTo(target); else target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  if (!hasGSAP) return;

  /* ---------- Hero headline SplitText ---------- */
  const heroTitle = document.querySelector('[data-split]');
  if (heroTitle && typeof SplitText !== 'undefined' && !prefersReduced) {
    const split = new SplitText(heroTitle, { type: 'lines,words', linesClass: 'split-line' });
    gsap.set(heroTitle, { autoAlpha: 1 });
    gsap.set('.split-line', { overflow: 'hidden' });
    gsap.from(split.words, {
      yPercent: 115,
      duration: 1,
      ease: 'power3.out',
      stagger: 0.04,
      delay: 0.25
    });
  } else if (heroTitle) {
    gsap.set(heroTitle, { autoAlpha: 1 });
  }

  /* hero supporting elements fade up */
  if (!prefersReduced) {
    gsap.from('.hero__kicker, .hero__body, .hero__actions, .hero .rating', {
      y: 24, autoAlpha: 0, duration: 0.9, ease: 'power2.out', stagger: 0.12, delay: 0.55
    });
  }

  /* ---------- Generic reveals ---------- */
  gsap.utils.toArray('[data-reveal]').forEach((el) => {
    gsap.fromTo(el,
      { y: 40, autoAlpha: 0 },
      {
        y: 0, autoAlpha: 1, duration: 0.9, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 85%' }
      }
    );
  });

  /* ---------- Cijfers die omhoog tellen zodra ze in beeld komen ---------- */
  document.querySelectorAll('.stats-band .stat__num').forEach((el) => {
    const raw = el.textContent.trim();
    const match = raw.match(/^(\d[\d.]*)(.*)$/);
    if (!match) return;
    const target = parseInt(match[1].replace(/\./g, ''), 10);
    const suffix = match[2] || '';
    if (prefersReduced) { el.textContent = target + suffix; return; }
    const counter = { value: 0 };
    el.textContent = '0' + suffix;
    gsap.to(counter, {
      value: target,
      duration: 1.8,
      ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      onUpdate: () => { el.textContent = Math.round(counter.value) + suffix; },
      onComplete: () => { el.textContent = target + suffix; }
    });
  });

  /* ---------- Split-sectie: gesequencede reveal (links -> rechts, boven -> onder) ---------- */
  document.querySelectorAll('[data-split-reveal]').forEach((split) => {
    const leftImg = split.querySelector('.split__media img');
    const texts = split.querySelectorAll('.split__body > :not(.split__detail)');
    const detailImg = split.querySelector('.split__detail img');
    const hidden = 'inset(0% 0% 100% 0%)';
    const shown = 'inset(0% 0% 0% 0%)';

    if (prefersReduced) {
      if (leftImg) gsap.set(leftImg, { clipPath: shown });
      if (detailImg) gsap.set(detailImg, { clipPath: shown });
      gsap.set(texts, { autoAlpha: 1 });
      return;
    }

    if (leftImg) gsap.set(leftImg, { clipPath: hidden });
    if (detailImg) gsap.set(detailImg, { clipPath: hidden });
    gsap.set(texts, { autoAlpha: 0, y: 30 });

    const tl = gsap.timeline({ scrollTrigger: { trigger: split, start: 'top 72%' } });
    if (leftImg) tl.to(leftImg, { clipPath: shown, duration: 1.1, ease: 'power3.out' });
    tl.to(texts, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power2.out', stagger: 0.14 }, '-=0.45');
    if (detailImg) tl.to(detailImg, { clipPath: shown, duration: 1, ease: 'power3.out' }, '-=0.2');
  });

  /* ---------- Story-triptych: reveal (links -> rechts) + parallax (foto's omhoog) ---------- */
  document.querySelectorAll('[data-story-parallax]').forEach((media) => {
    if (prefersReduced) return;
    const l = media.querySelector('.story__photo--l img');
    const c = media.querySelector('.story__photo--c img');
    const r = media.querySelector('.story__photo--r img');
    const imgs = [l, c, r].filter(Boolean);

    /* reveal: clip van onder naar boven, gestaggerd van links naar rechts */
    const hidden = 'inset(0% 0% 100% 0%)', shown = 'inset(0% 0% 0% 0%)';
    gsap.set(imgs, { clipPath: hidden });
    gsap.to(imgs, {
      clipPath: shown, duration: 1.1, ease: 'power3.out', stagger: 0.18,
      scrollTrigger: { trigger: media, start: 'top 80%' }
    });

    /* parallax: foto's bewegen omhoog terwijl je naar beneden scrollt, de middelste loopt voor */
    const sides = [l, r].filter(Boolean);
    const st = { trigger: media, start: 'top bottom', end: 'bottom top', scrub: true };
    gsap.set(sides, { scale: 1.1 });
    if (c) gsap.set(c, { scale: 1.2 });
    sides.forEach((img) => gsap.fromTo(img, { yPercent: 4 }, { yPercent: -4, ease: 'none', scrollTrigger: st }));
    if (c) gsap.fromTo(c, { yPercent: 10 }, { yPercent: -10, ease: 'none', scrollTrigger: st });
  });

  /* ---------- Werkwijze-stappen: gestaggerde slide-in + pin die de cards gelijk uitlijnt ---------- */
  (function initSteps() {
    const wrap = document.querySelector('[data-steps]');
    if (!wrap) return;
    const steps = gsap.utils.toArray('[data-step]', wrap);
    if (!steps.length) return;

    if (prefersReduced) {
      gsap.set(steps, { autoAlpha: 1, y: 0 });
      return;
    }

    /* reveal: elke card schuift van onderen omhoog en fade in, een voor een met eigen delay */
    gsap.set(steps, { autoAlpha: 0, y: 70 });
    gsap.to(steps, {
      autoAlpha: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.18,
      scrollTrigger: { trigger: wrap, start: 'top 80%' }
    });

    /* desktop: pin de sectie; terwijl je scrollt zakt card 2 omlaag, daarna card 3,
       tot alle drie op gelijke hoogte staan. Daarna loopt het scrollen gewoon door. */
    const section = wrap.closest('.werkwijze') || wrap;
    const [card1, card2, card3] = steps;
    if (!card2 || !card3) return;

    const mm = gsap.matchMedia();
    mm.add('(min-width: 961px)', () => {
      /* hoeveel elke card omlaag moet om met card 1 (de laagste) uit te lijnen */
      const drop = (el) => Math.max(0, card1.offsetTop - el.offsetTop);

      const tl = gsap.timeline({
        defaults: { ease: 'power2.inOut' },
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: '+=130%',
          pin: true,
          scrub: 0.6,
          anticipatePin: 1,
          invalidateOnRefresh: true
        }
      });
      tl.to(card2, { y: () => drop(card2), duration: 1 })
        .to(card3, { y: () => drop(card3), duration: 1 }, '>-0.1');

      return () => gsap.set([card2, card3], { clearProps: 'transform' });
    });
  })();

  /* ---------- Features stagger ---------- */
  ScrollTrigger.batch('.feature', {
    start: 'top 88%',
    onEnter: (els) => gsap.to(els, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power2.out', stagger: 0.12 })
  });

  /* ---------- Marquee infinite loop ---------- */
  const track = document.querySelector('[data-marquee]');
  if (track && !prefersReduced) {
    const half = track.scrollWidth / 2;
    gsap.to(track, {
      x: -half,
      duration: 32,
      ease: 'none',
      repeat: -1,
      modifiers: { x: (x) => (parseFloat(x) % half) + 'px' }
    });
  }

  /* ---------- Diensten: progress bar + drag ---------- */
  const scroller = document.querySelector('[data-dscroll]');
  const progress = document.querySelector('[data-dprogress]');
  if (scroller && progress) {
    const updateProgress = () => {
      const max = scroller.scrollWidth - scroller.clientWidth;
      const ratio = max > 0 ? scroller.scrollLeft / max : 0;
      progress.style.width = (12 + ratio * 88) + '%';
    };
    scroller.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();
    enableDrag(scroller);
  }

  /* ---------- Reviews full-width marquee (clone de kaarten voor een naadloze loop) ---------- */
  const revTrack = document.querySelector('[data-rev-track]');
  if (revTrack) {
    const originals = Array.from(revTrack.children);
    if (originals.length) {
      // dupliceer tot de rij ruim breder is dan het scherm, voor een naadloze lus
      let guard = 0;
      while (revTrack.scrollWidth < window.innerWidth * 2 && guard < 6) {
        originals.forEach((c) => revTrack.appendChild(c.cloneNode(true)));
        guard++;
      }
      originals.forEach((c) => revTrack.appendChild(c.cloneNode(true)));
      if (!prefersReduced) {
        const half = revTrack.scrollWidth / 2;
        gsap.to(revTrack, {
          x: -half, duration: 55, ease: 'none', repeat: -1,
          modifiers: { x: (x) => (parseFloat(x) % half) + 'px' }
        });
      }
    }
  }

  /* ---------- Reels video-marquee ---------- */
  const reelsTrack = document.querySelector('[data-reels-marquee]');
  if (reelsTrack && !prefersReduced) {
    const half = reelsTrack.scrollWidth / 2;
    gsap.to(reelsTrack, {
      x: -half,
      duration: 40,
      ease: 'none',
      repeat: -1,
      modifiers: { x: (x) => (parseFloat(x) % half) + 'px' }
    });
  }

  /* ---------- FAQ smooth open/close ---------- */
  document.querySelectorAll('.faq__item').forEach((item) => {
    const answer = item.querySelector('.faq__answer');
    const summary = item.querySelector('summary');
    summary.addEventListener('click', (e) => {
      e.preventDefault();
      const isOpen = item.hasAttribute('open');
      if (isOpen) {
        gsap.to(answer, { height: 0, duration: 0.4, ease: 'power2.inOut', onComplete: () => item.removeAttribute('open') });
      } else {
        item.setAttribute('open', '');
        gsap.fromTo(answer, { height: 0 }, { height: 'auto', duration: 0.45, ease: 'power2.out' });
      }
    });
  });

  /* ---------- parallax CTA: sticky stage, images sweep up, bg/text fade ---------- */
  if (!prefersReduced) {
    gsap.utils.toArray('[data-parallax]').forEach((el) => {
      const m = parseFloat(el.dataset.parallax) || 1;
      gsap.fromTo(el, { yPercent: 115 * m }, {
        yPercent: -135 * m, ease: 'none',
        scrollTrigger: { trigger: el.closest('.parallax-cta'), start: 'top top', end: 'bottom bottom', scrub: true }
      });
    });
    const pcta = document.querySelector('[data-parallax-cta]');
    if (pcta) {
      const stage = pcta.querySelector('.parallax-cta__stage');
      const title = pcta.querySelector('.parallax-cta__title');
      const kicker = pcta.querySelector('.parallax-cta__kicker');
      gsap.timeline({ scrollTrigger: { trigger: pcta, start: 'top top', end: 'bottom bottom', scrub: true } })
        .to(stage, { backgroundColor: '#0d0c0b', ease: 'none' }, 0)
        .to([title, kicker], { color: '#ffffff', ease: 'none' }, 0);
    }
  }

  /* ---------- generic photo carousel (arrows + drag) ---------- */
  document.querySelectorAll('[data-carousel]').forEach((car) => {
    const track = car.querySelector('[data-carousel-track]');
    if (!track) return;
    const stepW = () => {
      const first = track.firstElementChild;
      return first ? first.getBoundingClientRect().width + 20 : track.clientWidth * 0.8;
    };
    const next = car.querySelector('[data-carousel-next]');
    const prev = car.querySelector('[data-carousel-prev]');
    if (next) next.addEventListener('click', () => track.scrollBy({ left: stepW(), behavior: 'smooth' }));
    if (prev) prev.addEventListener('click', () => track.scrollBy({ left: -stepW(), behavior: 'smooth' }));
    enableDrag(track);
  });

  /* ---------- dark zaal tabs (image + text switch) ---------- */
  document.querySelectorAll('[data-zaaltabs]').forEach((zt) => {
    const tabs = zt.querySelectorAll('[data-zaaltab]');
    const img = zt.querySelector('[data-zaaltabs-img]');
    const title = zt.querySelector('[data-zaaltabs-title]');
    const text = zt.querySelector('[data-zaaltabs-text]');
    const link = zt.querySelector('[data-zaaltabs-link]');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach((t) => t.classList.remove('is-active'));
        tab.classList.add('is-active');
        if (img) { gsap.fromTo(img, { autoAlpha: 0.4 }, { autoAlpha: 1, duration: 0.4, ease: 'power2.out' }); img.src = tab.dataset.img; img.alt = tab.dataset.title || ''; }
        if (title) title.textContent = tab.dataset.title || '';
        if (text) text.textContent = tab.dataset.text || '';
        if (link) link.href = tab.dataset.link || '#';
      });
    });
  });

  /* ---------- nav dropdown (keyboard support; hover handled in CSS) ---------- */
  document.querySelectorAll('.nav__item--dropdown').forEach((item) => {
    const trigger = item.querySelector(':scope > a');
    if (!trigger) return;
    trigger.addEventListener('focus', () => item.classList.add('is-open'));
    item.addEventListener('focusout', (e) => { if (!item.contains(e.relatedTarget)) item.classList.remove('is-open'); });
  });

  /* ---------- ScrollTrigger posities herberekenen nadat afbeeldingen/fonts geladen zijn ----------
     De parallax-CTA en andere scrubs werden soms op de verkeerde scrollpositie berekend omdat de
     beelden nog niet geladen waren toen de triggers werden aangemaakt. Een refresh na load zet dit recht. */
  if (hasGSAP) {
    window.addEventListener('load', () => ScrollTrigger.refresh());
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => ScrollTrigger.refresh());
    }
    window.addEventListener('resize', () => ScrollTrigger.refresh());
  }

  /* ---------- drag-to-scroll helper ---------- */
  function enableDrag(el) {
    let down = false, startX = 0, startLeft = 0, moved = false;
    el.addEventListener('pointerdown', (e) => {
      down = true; moved = false; startX = e.clientX; startLeft = el.scrollLeft;
      el.classList.add('is-drag');
      try { el.setPointerCapture(e.pointerId); } catch (err) {}
    });
    window.addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 4) moved = true;
      el.scrollLeft = startLeft - dx;
    });
    window.addEventListener('pointerup', () => { down = false; el.classList.remove('is-drag'); });
    el.addEventListener('click', (e) => { if (moved) { e.preventDefault(); } }, true);
    el.addEventListener('dragstart', (e) => e.preventDefault());
  }

})();
