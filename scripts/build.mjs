#!/usr/bin/env node
/**
 * Build script for the Neukaps portfolio.
 *
 * Reads data/projects.json (the single source of truth) and:
 *   1. Renders the homepage project cards into index.html
 *      (between the <!-- PROJECTS:START --> / <!-- PROJECTS:END --> markers)
 *   2. Generates a static, SEO-friendly detail page per project at
 *      projects/<slug>.html
 *   3. Regenerates sitemap.xml to include every project page
 *
 * Run after editing data/projects.json:
 *   node scripts/build.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE_URL = 'https://neukaps.com';

const projects = JSON.parse(readFileSync(path.join(ROOT, 'data', 'projects.json'), 'utf8'));

const CATEGORY_LABEL = { extension: 'Chrome Extension', mobile: 'Mobile Application' };

function esc(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function storeMeta(store) {
  if (!store) return null;
  if (store.type === 'chrome') {
    return {
      label: 'Get on Chrome Web Store',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 3a7 7 0 0 1 6.06 3.5h-6.06a3.5 3.5 0 0 0-3.03 1.75L5.6 6.9A6.98 6.98 0 0 1 12 5zM5 12a6.98 6.98 0 0 1 .8-3.24l3.03 5.24a3.5 3.5 0 0 0 3.03 1.75l-3.03 5.25A7 7 0 0 1 5 12zm7 7a6.98 6.98 0 0 1-2.06-.31l3.03-5.25a3.48 3.48 0 0 0 3.5-1.94l3.03 5.25A6.98 6.98 0 0 1 12 19zm5.6-4.1l-3.03-5.25a3.48 3.48 0 0 0-1.4-1.4h6.06A6.96 6.96 0 0 1 19 12a6.98 6.98 0 0 1-1.4 4.1z"/></svg>'
    };
  }
  return {
    label: 'Get it on Google Play',
    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3.6 2.24a1 1 0 0 0-.6.9v17.7a1 1 0 0 0 .6.92l10.36-9.77L3.6 2.24zm12.4 8.85 2.7-2.55-11.6-6.42 8.9 8.97zm0 1.82-8.9 8.98 11.6-6.43-2.7-2.55zm1.3-.9 3.03-1.68a1 1 0 0 0 0-1.75L17.3 6.9l-2.9 2.75 2.9 2.36z"/></svg>'
  };
}

function techPills(tech) {
  return tech.map((t) => `<span class="tech-pill">${esc(t)}</span>`).join('');
}

/* ---------- 1. Homepage project cards ---------- */

function renderCard(p, i) {
  const sm = storeMeta(p.links.store);
  return `      <a href="projects/${p.slug}.html" class="project-card fade-in" data-category="${p.category}" style="--stagger:${i % 6}">
        <div class="project-card-top">
          <div class="project-icon icon-${p.gradient}" aria-hidden="true">${p.icon}</div>
          <span class="status-badge">${esc(p.status)}</span>
        </div>
        <h3>${esc(p.name)}</h3>
        <p class="project-tagline">${esc(p.tagline)}</p>
        <div class="tech-pills">${techPills(p.tech.slice(0, 3))}</div>
        <div class="project-card-footer">
          <span>${sm ? esc(sm.label.replace('Get on ', '').replace('Get it on ', '')) : 'View project'}</span>
          <span class="card-arrow" aria-hidden="true">→</span>
        </div>
      </a>`;
}

function injectCards() {
  const indexPath = path.join(ROOT, 'index.html');
  let html = readFileSync(indexPath, 'utf8');
  const cardsHtml = projects.map(renderCard).join('\n');
  const start = '<!-- PROJECTS:START -->';
  const end = '<!-- PROJECTS:END -->';
  const startIdx = html.indexOf(start);
  const endIdx = html.indexOf(end);
  if (startIdx === -1 || endIdx === -1) {
    throw new Error('PROJECTS markers not found in index.html');
  }
  html = html.slice(0, startIdx + start.length) + '\n' + cardsHtml + '\n      ' + html.slice(endIdx);
  writeFileSync(indexPath, html);
  console.log(`✓ Injected ${projects.length} project cards into index.html`);
}

/* ---------- 2. Project detail pages ---------- */

function renderRelated(current) {
  const related = projects.filter((p) => p.category === current.category && p.slug !== current.slug).slice(0, 3);
  if (!related.length) return '';
  return `
  <section class="related-section">
    <div class="container">
      <div class="section-head">
        <h2 class="fade-in">Related Projects</h2>
        <p class="section-sub fade-in">More from ${CATEGORY_LABEL[current.category]}s.</p>
      </div>
      <div class="project-grid">
${related.map((p, i) => renderCard(p, i).replace('href="projects/', 'href="./').replace(/style="--stagger:\d"/, `style="--stagger:${i}"`)).join('\n')}
      </div>
    </div>
  </section>`;
}

function renderGallery(screenshots) {
  if (!screenshots || !screenshots.length) {
    return `<div class="gallery-placeholder fade-in">
              <span>📸</span>
              <span>Screenshots coming soon</span>
            </div>`;
  }
  return `<div class="gallery-grid fade-in">
${screenshots.map((src, i) => `              <a href="../${src}" class="gallery-item" data-lightbox target="_blank" rel="noopener"><img src="../${src}" alt="${esc(`Screenshot ${i + 1}`)}" loading="lazy" /></a>`).join('\n')}
            </div>`;
}

function renderProjectPage(p) {
  const sm = storeMeta(p.links.store);
  const otherLinks = [];
  if (p.links.github) otherLinks.push({ label: 'View on GitHub', url: p.links.github });
  if (p.links.website) otherLinks.push({ label: 'Visit Website', url: p.links.website });

  const title = `${p.name} — Neukaps`;
  const description = p.tagline;
  const canonical = `${SITE_URL}/projects/${p.slug}.html`;
  const ogImage = p.screenshots && p.screenshots.length ? `${SITE_URL}/${p.screenshots[0]}` : null;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  <meta name="author" content="Neukaps" />
  <meta name="theme-color" content="#2563EB" />
  <link rel="canonical" href="${canonical}" />

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Neukaps" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:url" content="${canonical}" />
  ${ogImage ? `<meta property="og:image" content="${esc(ogImage)}" />` : ''}

  <!-- Twitter -->
  <meta name="twitter:card" content="${ogImage ? 'summary_large_image' : 'summary'}" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  ${ogImage ? `<meta name="twitter:image" content="${esc(ogImage)}" />` : ''}

  <!-- Favicon -->
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%232563EB'/%3E%3Ctext x='16' y='23' font-family='Arial,sans-serif' font-size='20' font-weight='700' fill='white' text-anchor='middle'%3EN%3C/text%3E%3C/svg%3E" />

  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" />

  <link rel="stylesheet" href="../style.css" />

  <!-- Structured data -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": ${JSON.stringify(p.name)},
    "applicationCategory": ${JSON.stringify(p.category === 'extension' ? 'BrowserApplication' : 'MobileApplication')},
    "description": ${JSON.stringify(p.tagline)},
    "url": ${JSON.stringify(canonical)},
    "operatingSystem": ${JSON.stringify(p.category === 'extension' ? 'Chrome' : 'Android')}
  }
  </script>
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>

  <!-- Navbar -->
  <header class="navbar" id="navbar">
    <nav class="nav container" aria-label="Primary">
      <a href="../index.html" class="logo" aria-label="Neukaps home">
        <span class="logo-mark" aria-hidden="true">N</span>
        <span class="logo-text">Neukaps</span>
      </a>

      <button class="nav-toggle" id="navToggle" aria-label="Toggle navigation menu" aria-expanded="false" aria-controls="navMenu">
        <span></span><span></span><span></span>
      </button>

      <ul class="nav-menu" id="navMenu">
        <li><a href="../index.html#projects">Projects</a></li>
        <li><a href="../index.html#about">About</a></li>
        <li><a href="../index.html#contact">Contact</a></li>
        <li>
          <button class="theme-toggle" id="themeToggle" aria-label="Toggle dark mode">
            <svg class="icon-sun" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
            <svg class="icon-moon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          </button>
        </li>
      </ul>
    </nav>
  </header>

  <main id="main">
    <!-- Hero -->
    <section class="project-hero">
      <div class="container">
        <div class="breadcrumb fade-in">
          <a href="../index.html">Home</a>
          <span class="sep">/</span>
          <a href="../index.html#projects">Projects</a>
          <span class="sep">/</span>
          <span class="current">${esc(p.name)}</span>
        </div>
        <div class="project-hero-inner">
          <div class="project-icon icon-${p.gradient} fade-in" aria-hidden="true">${p.icon}</div>
          <div class="project-hero-text fade-in">
            <div class="project-hero-meta">
              <span class="category-pill">${esc(CATEGORY_LABEL[p.category])}</span>
              <span class="status-badge">${esc(p.status)}</span>
            </div>
            <h1>${esc(p.name)}</h1>
            <p class="project-hero-tagline">${esc(p.tagline)}</p>
          </div>
        </div>
        <div class="project-hero-cta fade-in">
          ${sm ? `<a class="btn btn-primary btn-store" href="${esc(p.links.store.url)}" target="_blank" rel="noopener">${sm.icon} ${esc(sm.label)}</a>` : ''}
          ${otherLinks.map((l) => `<a class="btn btn-ghost" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join('\n          ')}
        </div>
      </div>
    </section>

    <!-- Body -->
    <section class="project-body">
      <div class="container">
        <div class="project-layout">
          <div class="project-main">
            <h2 class="fade-in">Overview</h2>
            ${p.description.map((para) => `<p class="fade-in">${esc(para)}</p>`).join('\n            ')}

            <h2 class="fade-in">Features</h2>
            <ul class="feature-list fade-in">
${p.features.map((f) => `              <li><span class="tick" aria-hidden="true">✓</span><span>${esc(f)}</span></li>`).join('\n')}
            </ul>

            <h2 class="fade-in">Screenshots</h2>
            ${renderGallery(p.screenshots)}
          </div>

          <aside class="project-sidebar">
            <div class="sidebar-card fade-in">
              <h3>Technology</h3>
              <div class="sidebar-tech">${techPills(p.tech)}</div>
            </div>
            <div class="sidebar-card fade-in">
              <h3>Links</h3>
              <div class="sidebar-links">
                ${sm ? `<a href="${esc(p.links.store.url)}" target="_blank" rel="noopener"><span>${esc(sm.label)}</span><span aria-hidden="true">→</span></a>` : ''}
                ${otherLinks.map((l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener"><span>${esc(l.label)}</span><span aria-hidden="true">→</span></a>`).join('\n                ')}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
${renderRelated(p)}
  </main>

  <!-- Footer -->
  <footer class="footer">
    <div class="container footer-inner">
      <div class="footer-brand">
        <span class="logo-mark" aria-hidden="true">N</span>
        <span class="logo-text">Neukaps</span>
      </div>
      <nav class="footer-links" aria-label="Footer">
        <a href="../privacy.html">Privacy Policy</a>
        <a href="../terms.html">Terms</a>
        <a href="../index.html#contact">Contact</a>
      </nav>
      <p class="footer-copy">© 2026 Neukaps. All rights reserved.</p>
    </div>
  </footer>

  <script src="../script.js"></script>
</body>
</html>
`;
}

function writeProjectPages() {
  const dir = path.join(ROOT, 'projects');
  mkdirSync(dir, { recursive: true });
  for (const p of projects) {
    writeFileSync(path.join(dir, `${p.slug}.html`), renderProjectPage(p));
  }
  console.log(`✓ Generated ${projects.length} project pages in /projects`);
}

/* ---------- 3. Sitemap ---------- */

function writeSitemap() {
  const today = new Date().toISOString().slice(0, 10);
  const staticUrls = [
    { loc: `${SITE_URL}/`, priority: '1.0' },
    { loc: `${SITE_URL}/privacy.html`, priority: '0.3' },
    { loc: `${SITE_URL}/terms.html`, priority: '0.3' }
  ];
  const projectUrls = projects.map((p) => ({ loc: `${SITE_URL}/projects/${p.slug}.html`, priority: '0.8' }));
  const urls = [...staticUrls, ...projectUrls];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${today}</lastmod>\n    <priority>${u.priority}</priority>\n  </url>`).join('\n')}
</urlset>
`;
  writeFileSync(path.join(ROOT, 'sitemap.xml'), xml);
  console.log('✓ Regenerated sitemap.xml');
}

injectCards();
writeProjectPages();
writeSitemap();
