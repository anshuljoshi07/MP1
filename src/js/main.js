/* ==========================================================================
   Anshul Joshi — portfolio interactions (vanilla ES6, no libraries)
   - Sticky navbar: compact state, reading-progress bar, active section
   - Smooth scrolling that accounts for the navbar's changing height
   - Mobile hamburger menu
   - Projects carousel (arrows, dots, keyboard, swipe)
   - Case-study modals (button, backdrop, Escape)
   - Scroll-reveal animations
   - Matrix digital-rain canvas in the hero
   ========================================================================== */

(() => {
  'use strict';

  document.documentElement.classList.add('js');

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const navbar = $('#navbar');
  const navToggle = $('#navToggle');
  const progress = $('#navProgress');
  const COMPACT_THRESHOLD = 60; // px scrolled before the navbar shrinks

  /* ---------------------------------------------------------------------
     Navbar: compact state + reading-position indicator
     --------------------------------------------------------------------- */
  let ticking = false;

  const updateNavbar = () => {
    const scrollY = window.scrollY;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = maxScroll > 0 ? Math.min(Math.max(scrollY / maxScroll, 0), 1) : 0;

    navbar.classList.toggle('navbar--compact', scrollY > COMPACT_THRESHOLD);
    progress.style.setProperty('--progress', ratio.toFixed(4));
    progress.setAttribute('aria-valuenow', String(Math.round(ratio * 100)));
    ticking = false;
  };

  const onScroll = () => {
    if (!ticking) {
      window.requestAnimationFrame(updateNavbar);
      ticking = true;
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  updateNavbar();

  /* ---------------------------------------------------------------------
     Active nav link — tracks which section is in view
     --------------------------------------------------------------------- */
  const navLinks = $$('.navbar__link');
  const linkFor = (id) => navLinks.find((a) => a.getAttribute('href') === `#${id}`);

  // Sections without their own nav link map onto the nearest one
  const sectionToNav = {
    home: 'home',
    experience: 'experience',
    projects: 'projects',
    achievements: 'achievements',
    philosophy: 'achievements',
    video: 'contact',
    contact: 'contact',
  };

  const setActive = (id) => {
    const target = linkFor(sectionToNav[id] || id);
    navLinks.forEach((a) => {
      const isActive = a === target;
      a.classList.toggle('active', isActive);
      if (isActive) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    });
  };

  const trackedSections = Object.keys(sectionToNav)
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  if ('IntersectionObserver' in window) {
    // A thin band across the upper-middle of the viewport decides the section
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: '-35% 0px -60% 0px', threshold: 0 }
    );
    trackedSections.forEach((s) => sectionObserver.observe(s));
  }

  // At the very bottom the footer may be too short to cross the band
  window.addEventListener(
    'scroll',
    () => {
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      if (atBottom) setActive('contact');
    },
    { passive: true }
  );

  /* ---------------------------------------------------------------------
     Smooth scroll — offset by the navbar height it will have on arrival
     --------------------------------------------------------------------- */
  const cssPx = (el, prop) => parseFloat(getComputedStyle(el).getPropertyValue(prop)) || 0;

  // Compact navbar height is exported from SCSS as a custom property
  const compactNavHeight = () =>
    cssPx(document.documentElement, '--nav-h-compact') || navbar.offsetHeight;

  const scrollToId = (id) => {
    const target = document.getElementById(id);
    if (!target) return;

    const absoluteTop = target.getBoundingClientRect().top + window.scrollY;
    // Sticky nav sits in normal flow at the top, so the hero needs no offset
    const top = id === 'home' ? 0 : Math.max(absoluteTop - compactNavHeight(), 0);

    window.scrollTo({ top, behavior: prefersReducedMotion.matches ? 'auto' : 'smooth' });
    history.replaceState(null, '', `#${id}`);
  };

  $$('a[data-scroll]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const hash = link.getAttribute('href');
      if (!hash || !hash.startsWith('#')) return;
      e.preventDefault();
      closeMenu();
      scrollToId(hash.slice(1));
    });
  });

  /* ---------------------------------------------------------------------
     Mobile menu
     --------------------------------------------------------------------- */
  function closeMenu() {
    navbar.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
  }

  navToggle.addEventListener('click', () => {
    const open = navbar.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(open));
  });

  document.addEventListener('click', (e) => {
    if (navbar.classList.contains('is-open') && !navbar.contains(e.target)) closeMenu();
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) closeMenu();
  });

  /* ---------------------------------------------------------------------
     Carousel
     --------------------------------------------------------------------- */
  const initCarousel = (root) => {
    const track = $('[data-carousel-track]', root);
    const slides = $$('.carousel__slide', track);
    const dotsWrap = $('[data-carousel-dots]', root);
    const prevBtn = $('[data-carousel-prev]', root);
    const nextBtn = $('[data-carousel-next]', root);
    let index = 0;

    const dots = slides.map((_, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'carousel__dot';
      dot.setAttribute('aria-label', `Show project ${i + 1}`);
      dot.addEventListener('click', () => goTo(i));
      dotsWrap.appendChild(dot);
      return dot;
    });

    function goTo(i) {
      index = (i + slides.length) % slides.length; // loop both directions
      track.style.setProperty('transform', `translateX(-${index * 100}%)`);

      slides.forEach((slide, n) => {
        const current = n === index;
        slide.setAttribute('aria-hidden', String(!current));
        // Keep off-screen slides out of the tab order
        $$('a, button', slide).forEach((el) => {
          if (current) el.removeAttribute('tabindex');
          else el.setAttribute('tabindex', '-1');
        });
      });

      dots.forEach((dot, n) => {
        dot.classList.toggle('is-active', n === index);
        dot.setAttribute('aria-current', n === index ? 'true' : 'false');
      });
    }

    prevBtn.addEventListener('click', () => goTo(index - 1));
    nextBtn.addEventListener('click', () => goTo(index + 1));

    root.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') goTo(index - 1);
      if (e.key === 'ArrowRight') goTo(index + 1);
    });

    // Touch swipe
    let startX = null;
    track.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
    track.addEventListener('touchend', (e) => {
      if (startX === null) return;
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 50) goTo(index + (dx < 0 ? 1 : -1));
      startX = null;
    });

    goTo(0);
  };

  $$('.carousel').forEach(initCarousel);

  /* ---------------------------------------------------------------------
     Modals
     --------------------------------------------------------------------- */
  let openModal = null;
  let lastFocused = null;

  const focusables = (el) =>
    $$('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])', el);

  const showModal = (modal) => {
    lastFocused = document.activeElement;
    modal.hidden = false;
    openModal = modal;
    document.body.classList.add('is-locked');
    $('.modal__close', modal).focus();
  };

  const hideModal = () => {
    if (!openModal) return;
    openModal.hidden = true;
    openModal = null;
    document.body.classList.remove('is-locked');
    if (lastFocused) lastFocused.focus();
  };

  $$('[data-modal-open]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const modal = document.getElementById(btn.dataset.modalOpen);
      if (modal) showModal(modal);
    });
  });

  $$('[data-modal-close]').forEach((el) => el.addEventListener('click', hideModal));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (openModal) hideModal();
      else closeMenu();
      return;
    }

    // Keep Tab focus inside an open modal
    if (e.key === 'Tab' && openModal) {
      const items = focusables(openModal);
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  /* ---------------------------------------------------------------------
     Scroll reveal
     --------------------------------------------------------------------- */
  const revealEls = $$('.reveal');

  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    revealEls.forEach((el) => revealObserver.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  }

  /* ---------------------------------------------------------------------
     Matrix digital rain (hero background)
     --------------------------------------------------------------------- */
  const canvas = $('#matrixRain');

  if (canvas && canvas.getContext) {
    const ctx = canvas.getContext('2d');
    const glyphs = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789ABCDEF<>/{}$#';
    const fontSize = 16;
    let columns = [];
    let rafId = null;
    let lastFrame = 0;
    let running = true;

    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.ceil(width / fontSize);
      columns = Array.from({ length: count }, (_, i) =>
        columns[i] !== undefined ? columns[i] : Math.floor(Math.random() * -60)
      );
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, width, height);
    };

    const draw = (time) => {
      rafId = window.requestAnimationFrame(draw);
      if (time - lastFrame < 55) return; // ~18fps keeps it calm and cheap
      lastFrame = time;

      const { width, height } = canvas.getBoundingClientRect();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.fillRect(0, 0, width, height);
      ctx.font = `${fontSize}px "JetBrains Mono", monospace`;

      columns.forEach((y, i) => {
        const char = glyphs[Math.floor(Math.random() * glyphs.length)];
        const x = i * fontSize;
        ctx.fillStyle = Math.random() > 0.975 ? '#d6ffe0' : '#00ff41';
        ctx.fillText(char, x, y * fontSize);
        columns[i] = y * fontSize > height && Math.random() > 0.975 ? 0 : y + 1;
      });
    };

    const start = () => {
      if (rafId === null && running) rafId = window.requestAnimationFrame(draw);
    };
    const stop = () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      rafId = null;
    };

    resize();
    window.addEventListener('resize', resize);

    if (prefersReducedMotion.matches) {
      // Paint a single static frame
      for (let i = 0; i < 40; i += 1) draw(lastFrame + 100 * (i + 1));
      stop();
    } else {
      // Only animate while the hero is on screen and the tab is visible
      new IntersectionObserver(([entry]) => {
        running = entry.isIntersecting;
        if (running) start();
        else stop();
      }).observe(canvas);

      document.addEventListener('visibilitychange', () => {
        if (document.hidden) stop();
        else start();
      });
    }
  }

  /* ---------------------------------------------------------------------
     Footer year
     --------------------------------------------------------------------- */
  const year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear());
})();
