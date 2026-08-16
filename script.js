(function () {
  'use strict';

  /* ===== Theme (dark mode) toggle ===== */
  var root = document.documentElement;
  var themeToggle = document.getElementById('themeToggle');
  var stored = localStorage.getItem('neukaps-theme');
  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  function applyTheme(theme) {
    if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
    }
  }

  applyTheme(stored || (prefersDark ? 'dark' : 'light'));

  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      var isDark = root.getAttribute('data-theme') === 'dark';
      var next = isDark ? 'light' : 'dark';
      applyTheme(next);
      localStorage.setItem('neukaps-theme', next);
    });
  }

  /* ===== Mobile navigation ===== */
  var navToggle = document.getElementById('navToggle');
  var navMenu = document.getElementById('navMenu');

  function closeMenu() {
    if (!navMenu) return;
    navMenu.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  }

  if (navToggle && navMenu) {
    navToggle.addEventListener('click', function () {
      var open = navMenu.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', String(open));
    });

    navMenu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeMenu);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMenu();
    });
  }

  /* ===== Navbar shadow on scroll ===== */
  var navbar = document.getElementById('navbar');
  function onScroll() {
    if (!navbar) return;
    navbar.classList.toggle('scrolled', window.scrollY > 8);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ===== Project category filter ===== */
  var tabButtons = document.querySelectorAll('.tab-btn');
  var projectGrid = document.getElementById('projectGrid');

  if (tabButtons.length && projectGrid) {
    var cards = projectGrid.querySelectorAll('.project-card');

    tabButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var filter = btn.getAttribute('data-filter');

        tabButtons.forEach(function (b) {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');

        var visibleCount = 0;
        cards.forEach(function (card) {
          var match = filter === 'all' || card.getAttribute('data-category') === filter;
          card.style.display = match ? '' : 'none';
          if (match) visibleCount++;
        });
        projectGrid.setAttribute('data-empty', visibleCount === 0 ? 'true' : 'false');
      });
    });
  }

  /* ===== Screenshot lightbox ===== */
  var galleryLinks = document.querySelectorAll('[data-lightbox]');

  if (galleryLinks.length) {
    var lightbox = document.createElement('div');
    lightbox.className = 'lightbox';
    lightbox.setAttribute('role', 'dialog');
    lightbox.setAttribute('aria-modal', 'true');
    lightbox.setAttribute('aria-label', 'Screenshot preview');
    lightbox.innerHTML =
      '<button class="lightbox-close" type="button" aria-label="Close preview">&times;</button>' +
      '<img class="lightbox-img" alt="" />';
    document.body.appendChild(lightbox);

    var lightboxImg = lightbox.querySelector('.lightbox-img');
    var lastFocused = null;

    function openLightbox(link) {
      lastFocused = document.activeElement;
      lightboxImg.src = link.getAttribute('href');
      lightboxImg.alt = link.querySelector('img') ? link.querySelector('img').alt : '';
      lightbox.classList.add('open');
      document.body.style.overflow = 'hidden';
      lightbox.querySelector('.lightbox-close').focus();
    }

    function closeLightbox() {
      lightbox.classList.remove('open');
      document.body.style.overflow = '';
      lightboxImg.src = '';
      if (lastFocused) lastFocused.focus();
    }

    galleryLinks.forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        openLightbox(link);
      });
    });

    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox || e.target.classList.contains('lightbox-close')) closeLightbox();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && lightbox.classList.contains('open')) closeLightbox();
    });
  }

  /* ===== Fade-in on scroll ===== */
  var faders = document.querySelectorAll('.fade-in');

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    faders.forEach(function (el) { observer.observe(el); });
  } else {
    faders.forEach(function (el) { el.classList.add('visible'); });
  }
})();
