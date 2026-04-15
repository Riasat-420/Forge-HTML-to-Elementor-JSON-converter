/**
 * converter/html-parser.js
 * Core HTML → Elementor JSON parsing engine.
 * Handles the section/column/widget hierarchy required by Elementor.
 */

const { parse } = require('node-html-parser');
const { makeSection, makeInnerSection, makeColumn, padding, borderRadius } = require('./rules');
const { buildHeading, buildText, buildButton, buildIconBox, buildImage, buildVideo, buildHtml } = require('./widget-map');
const { buildTemplate } = require('./template-builder');

// ── Style / Class Helpers ────────────────────────────────────────────────────

function parseStyle(styleStr) {
    if (!styleStr) return {};
    return styleStr.split(';').filter(Boolean).reduce((acc, decl) => {
        const idx = decl.indexOf(':');
        if (idx < 0) return acc;
        const key = decl.slice(0, idx).trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        acc[key] = decl.slice(idx + 1).trim();
        return acc;
    }, {});
}

function cls(el) { return el.getAttribute('class') || ''; }
function sty(el) { return parseStyle(el.getAttribute('style') || ''); }
function tag(el) { return (el.tagName || '').toLowerCase(); }

function extractBg(styleObj, classes) {
    if (styleObj.backgroundColor) return styleObj.backgroundColor;
    if (classes.includes('section-light')) return '#ffffff';
    if (classes.includes('section-dark') || classes.includes('bg-dark')) return '#0f172a';
    return '';
}

function cssToElPadding(styleObj) {
    const t = parseInt(styleObj.paddingTop) || 0;
    const r = parseInt(styleObj.paddingRight) || 0;
    const b = parseInt(styleObj.paddingBottom) || 0;
    const l = parseInt(styleObj.paddingLeft) || 0;
    if (t || r || b || l) return padding(t, r, b, l);
    return null;
}

function gridCols(el) {
    const c = cls(el);
    if (c.includes('grid-4')) return 4;
    if (c.includes('grid-3')) return 3;
    if (c.includes('grid-2') || c.includes('ai-human-grid') || c.includes('human-grid')) return 2;
    return null;
}

function isCard(el) { return cls(el).includes('card'); }
function isBtn(el) { return (tag(el) === 'a' || tag(el) === 'button') && cls(el).includes('btn'); }
function isTagline(el) { return cls(el).includes('tagline'); }
function isHeading(el) { return ['h1','h2','h3','h4','h5','h6'].includes(tag(el)); }

// ── Widget Converters ────────────────────────────────────────────────────────

function parseCard(el) {
    const iconEl = el.querySelector('.card-icon i, i[class*="ph"], i[class*="fa"]');
    const titleEl = el.querySelector('h1,h2,h3,h4,h5,h6');
    const textEl = el.querySelector('p');
    return buildIconBox(
        iconEl ? (iconEl.getAttribute('class') || '') : '',
        titleEl ? titleEl.text.trim() : '',
        textEl ? textEl.text.trim() : ''
    );
}

function parseCheckList(el) {
    const items = el.querySelectorAll('li').map(li => {
        const t = li.text.replace(/\s+/g, ' ').trim();
        return `<li style="margin-bottom:12px;display:flex;align-items:flex-start;gap:10px;"><span style="color:#2563eb;font-weight:700;">&#10003;</span> ${t}</li>`;
    }).join('');
    return buildText(`<ul style="list-style:none;padding:0;margin:0;">${items}</ul>`, 'left', '#475569', 1.1);
}

function elementToWidget(el) {
    const t = tag(el);
    const c = cls(el);
    const s = sty(el);
    if (!t) return null;

    // Tagline / eyebrow label
    if (isTagline(el)) {
        const text = el.text.trim();
        return text ? buildHeading(text, 'span', '#2563eb', 0.85, 'inherit', '700') : null;
    }

    // Headings
    if (isHeading(el)) {
        const text = el.innerHTML.replace(/<[^>]+>/g, '').trim();
        if (!text) return null;
        const align = s.textAlign || (c.includes('center') ? 'center' : 'left');
        const color = s.color || '#0f172a';
        const size = s.fontSize ? parseFloat(s.fontSize) : null;
        return buildHeading(text, t, color, size, align, '700');
    }

    // Paragraphs / subheadlines
    if (t === 'p' || c.includes('subheadline') || c.includes('credibility')) {
        const html = el.innerHTML.trim();
        if (!html) return null;
        const color = s.color || (c.includes('subheadline') ? '#64748b' : '#475569');
        const align = s.textAlign || (c.includes('center') ? 'center' : 'left');
        const size = s.fontSize ? parseFloat(s.fontSize) : 1.1;
        return buildText(`<p>${html}</p>`, align, color, size);
    }

    // Buttons
    if (isBtn(el)) {
        const text = el.text.trim();
        if (!text) return null;
        return buildButton(text, el.getAttribute('href') || '#', c.includes('btn-primary'), 'center');
    }

    // Images
    if (t === 'img') {
        return buildImage(el.getAttribute('src') || '', el.getAttribute('alt') || '');
    }

    // iFrames
    if (t === 'iframe') {
        const src = el.getAttribute('src') || '';
        return src.includes('youtube') ? buildVideo(src) : buildHtml(el.outerHTML);
    }

    // Check lists
    if (t === 'ul') return parseCheckList(el);

    // Div with background image (visual placeholder)
    if (t === 'div' && s.backgroundImage) {
        const m = s.backgroundImage.match(/url\(['"]?([^'"()]+)['"]?\)/);
        return m ? buildImage(m[1], '', 100, 12) : null;
    }

    return null;
}

// ── Container / Grid Parsing ─────────────────────────────────────────────────

function parseContainerChildren(containerEl) {
    const widgets = [];
    for (const child of containerEl.childNodes) {
        if (child.nodeType !== 1) continue;
        const t = tag(child);
        const c = cls(child);
        if (t === 'style' || t === 'script') continue;
        if (!child.text.trim() && !child.querySelector('img,iframe')) continue;

        // Grid → inner section
        const cols = gridCols(child);
        if (cols) { widgets.push(parseGridToInner(child, cols)); continue; }

        // Card
        if (isCard(child)) { widgets.push(parseCard(child)); continue; }

        // Div with bg image
        const s = sty(child);
        if (t === 'div' && s.backgroundImage) {
            const w = elementToWidget(child);
            if (w) widgets.push(w);
            continue;
        }

        // Recurse into wrappers
        if (t === 'div' && (c.includes('section-header') || c.includes('hero-content') || c.includes('container') || c.includes('metric') || c.includes('ai-human-grid'))) {
            widgets.push(...parseContainerChildren(child));
            continue;
        }

        // Direct widget
        const w = elementToWidget(child);
        if (w) widgets.push(w);
    }
    return widgets;
}

function parseGridToInner(el, numCols) {
    const children = el.childNodes.filter(n => n.nodeType === 1);
    const colSize = Math.floor(100 / numCols);

    const columns = children.map(child => {
        if (isCard(child)) {
            return makeColumn([parseCard(child)], {
                _column_size: colSize,
                background_color: '#ffffff',
                border_border: 'solid',
                border_color: '#e2e8f0',
                border_width: { unit: 'px', top: '1', bottom: '1', right: '1', left: '1', isLinked: true },
                border_radius: borderRadius(12),
                padding: padding(40, 32, 40, 32)
            });
        }
        return makeColumn(parseContainerChildren(child), { _column_size: colSize });
    });

    return makeInnerSection(columns, { gap: 'extended' });
}

// ── Section Builder ──────────────────────────────────────────────────────────

function buildSectionSettings(sectionEl) {
    const c = cls(sectionEl);
    const s = sty(sectionEl);
    const settings = {};
    const bg = extractBg(s, c);
    if (bg) settings.background_color = bg;

    if (c.includes('hero')) {
        settings.padding = padding(140, 0, 100, 0);
    } else {
        const p = cssToElPadding(s);
        if (p) settings.padding = p;
        else settings.padding = padding(80, 0, 80, 0);
    }
    return settings;
}

function findContainer(el) {
    return el.querySelector('.container, .container-fluid, .e-con-inner') || el;
}

function parseSectionEl(sectionEl) {
    const settings = buildSectionSettings(sectionEl);
    const container = findContainer(sectionEl);
    const children = container.childNodes.filter(n => n.nodeType === 1 && tag(n) !== 'style' && tag(n) !== 'script');
    if (!children.length) return null;

    // Check for grid at the container level
    const cols = gridCols(container);
    let columnElements;

    if (cols) {
        const inner = parseGridToInner(container, cols);
        columnElements = [makeColumn([inner])];
    } else {
        const widgets = parseContainerChildren(container);
        if (!widgets.length) return null;
        columnElements = [makeColumn(widgets)];
    }

    return makeSection(columnElements, settings);
}

// ── Main Export ──────────────────────────────────────────────────────────────

function convertHTML(htmlString, title = 'Converted Page') {
    const root = parse(htmlString);
    const main = root.querySelector('main') || root.querySelector('body') || root;
    const sectionEls = [];

    for (const child of main.childNodes) {
        if (child.nodeType !== 1) continue;
        const t = tag(child);
        const c = cls(child);
        if (t === 'section' || (t === 'div' && (c.includes('section') || c.includes('hero') || c.includes('cta')))) {
            sectionEls.push(child);
        }
    }

    // Fallback: grab all <section> tags if none found at top level
    if (!sectionEls.length) {
        root.querySelectorAll('section').forEach(el => sectionEls.push(el));
    }

    return buildTemplate(sectionEls.map(parseSectionEl).filter(Boolean), title);
}

module.exports = { convertHTML };
