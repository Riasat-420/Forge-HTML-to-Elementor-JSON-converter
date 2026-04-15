/**
 * converter/widget-map.js
 * Maps HTML elements to Elementor native widgets.
 * Includes Phosphor → FontAwesome icon mapping (critical for icon-box widget).
 */

const { makeWidget, typographySettings, borderRadius, padding } = require('./rules');

// RULE: Elementor icon-box requires FA format: { value: "fas fa-xxx", library: "fa-solid" }
// Phosphor icons (ph-*) do NOT work in Elementor — must be remapped to FontAwesome
const ICON_MAP = {
    'ph-ear': 'fas fa-assistive-listening-systems',
    'ph-headset': 'fas fa-headset',
    'ph-money': 'fas fa-money-bill-wave',
    'ph-money-check-alt': 'fas fa-money-check-alt',
    'ph-database': 'fas fa-database',
    'ph-credit-card': 'far fa-credit-card',
    'ph-book-open': 'fas fa-book-open',
    'ph-globe': 'fas fa-globe',
    'ph-globe-africa': 'fas fa-globe-africa',
    'ph-chalkboard-teacher': 'fas fa-chalkboard-teacher',
    'ph-user-circle': 'far fa-user-circle',
    'ph-check-circle': 'fas fa-check-circle',
    'ph-check': 'fas fa-check',
    'ph-chart-line': 'fas fa-chart-line',
    'ph-chart-bar': 'fas fa-chart-bar',
    'ph-users': 'fas fa-users',
    'ph-user': 'fas fa-user',
    'ph-shield': 'fas fa-shield-alt',
    'ph-shield-check': 'fas fa-shield-alt',
    'ph-gear': 'fas fa-cog',
    'ph-phone': 'fas fa-phone',
    'ph-envelope': 'fas fa-envelope',
    'ph-house': 'fas fa-home',
    'ph-chat': 'fas fa-comments',
    'ph-chat-circle': 'fas fa-comment-dots',
    'ph-star': 'fas fa-star',
    'ph-lightning': 'fas fa-bolt',
    'ph-calendar': 'fas fa-calendar-alt',
    'ph-clipboard': 'fas fa-clipboard',
    'ph-magnifying-glass': 'fas fa-search',
    'ph-arrow-right': 'fas fa-arrow-right',
    'ph-arrow-up-right': 'fas fa-external-link-alt',
    'ph-paper-plane': 'fas fa-paper-plane',
    'ph-briefcase': 'fas fa-briefcase',
    'ph-handshake': 'fas fa-handshake',
    'ph-trophy': 'fas fa-trophy',
    'ph-rocket': 'fas fa-rocket',
    'ph-clock': 'fas fa-clock',
    'ph-lock': 'fas fa-lock',
    'ph-lock-simple': 'fas fa-lock',
    'ph-quotes': 'fas fa-quote-left',
    'assistive-listening-systems': 'fas fa-assistive-listening-systems',
    // Fallback
    'default': 'fas fa-circle'
};

function resolveIcon(classString) {
    if (!classString) return { value: 'fas fa-circle', library: 'fa-solid' };

    // Already a FontAwesome class
    if (classString.includes('fas ') || classString.includes('far ') || classString.includes('fab ')) {
        const lib = classString.startsWith('far') ? 'fa-regular' : classString.startsWith('fab') ? 'fa-brands' : 'fa-solid';
        return { value: classString.trim(), library: lib };
    }

    // Try Phosphor → FA mapping
    for (const [phClass, faClass] of Object.entries(ICON_MAP)) {
        if (classString.includes(phClass)) {
            const lib = faClass.startsWith('far') ? 'fa-regular' : faClass.startsWith('fab') ? 'fa-brands' : 'fa-solid';
            return { value: faClass, library: lib };
        }
    }

    return { value: 'fas fa-circle', library: 'fa-solid' };
}

// ── Widget Builders ─────────────────────────────────────────────────────────

function buildHeading(text, level = 'h2', color = '#0f172a', fontSize = null, align = 'left', weight = '700') {
    const defaults = { h1: 3.5, h2: 3, h3: 1.5, h4: 1.25, h5: 1.1, h6: 1, span: 0.85 };
    const size = fontSize || defaults[level] || 2;
    return makeWidget('heading', {
        title: text.trim(),
        header_size: level === 'span' ? 'h6' : level,
        align,
        title_color: color,
        ...typographySettings(size, weight),
        margin: { unit: 'rem', top: '0', right: '0', bottom: '1', left: '0', isLinked: false }
    });
}

function buildText(html, align = 'left', color = '#475569', fontSize = 1.1) {
    return makeWidget('text-editor', {
        editor: html,
        align,
        text_color: color,
        ...typographySettings(fontSize, '400'),
        margin: { unit: 'rem', top: '0', right: '0', bottom: '1.5', left: '0', isLinked: false }
    });
}

// RULE: button border_radius must use full 6-key object — partial crashes import
function buildButton(text, href = '#', isPrimary = true, align = 'center') {
    return makeWidget('button', {
        text,
        link: { url: href, is_external: false, nofollow: false },
        align,
        button_type: 'default',
        size: 'md',
        ...typographySettings(1, '600'),
        background_color: isPrimary ? '#2563eb' : '#ffffff',
        button_text_color: isPrimary ? '#ffffff' : '#0f172a',
        border_border: isPrimary ? '' : 'solid',
        border_color: '#e2e8f0',
        border_width: { unit: 'px', top: '1', right: '1', bottom: '1', left: '1', isLinked: true },
        border_radius: borderRadius(100, 'px', true),
        padding: padding(16, 32, 16, 32)
    });
}

// RULE: selected_icon needs { value: "fas fa-xxx", library: "fa-solid" }
// RULE: view:"stacked" with primary_color/secondary_color for the colored icon badge
function buildIconBox(iconClass, title, description) {
    const icon = resolveIcon(iconClass);
    return makeWidget('icon-box', {
        selected_icon: icon,
        title_text: title.trim(),
        description_text: description.trim(),
        view: 'stacked',
        shape: 'square',
        position: 'top',
        title_size: 'h3',
        primary_color: 'rgba(37,99,235,0.08)',
        secondary_color: '#2563eb',
        icon_padding: { unit: 'px', size: 16 },
        title_color: '#0f172a',
        title_typography_typography: 'custom',
        title_typography_font_family: 'Plus Jakarta Sans',
        title_typography_font_weight: '700',
        title_typography_font_size: { unit: 'rem', size: 1.25 },
        description_color: '#64748b',
        description_typography_typography: 'custom',
        description_typography_font_family: 'Plus Jakarta Sans',
        description_typography_font_size: { unit: 'rem', size: 1 },
        icon_space: { unit: 'px', size: 20 },
        title_space: { unit: 'px', size: 10 }
    });
}

// RULE: image border_radius must be full object
function buildImage(src, alt = '', width = 100, radiusSize = 12) {
    return makeWidget('image', {
        image: { url: src, alt },
        width: { unit: '%', size: width },
        border_radius: borderRadius(radiusSize)
    });
}

function buildVideo(src) {
    const match = src.match(/youtube\.com\/embed\/([^?&]+)/);
    const id = match ? match[1] : '';
    return makeWidget('video', {
        video_type: 'youtube',
        youtube_url: `https://www.youtube.com/watch?v=${id}`,
        show_image_overlay: 'no',
        aspect_ratio: '169',
        modestbranding: 'yes'
    });
}

function buildHtml(content) {
    return makeWidget('html', { html: content });
}

module.exports = {
    buildHeading,
    buildText,
    buildButton,
    buildIconBox,
    buildImage,
    buildVideo,
    buildHtml,
    resolveIcon
};
