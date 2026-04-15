/**
 * converter/rules.js
 * Core Elementor node builders with every rule baked in from InnoEdge BPO sessions.
 * These prevent every import error we discovered.
 */

// RULE: Every node needs a unique 7-char hex ID
function getId() {
    return Math.random().toString(36).substr(2, 7);
}

// RULE: Top-level sections MUST have layout:"boxed" and content_width
// RULE: isInner is always false for top-level sections
function makeSection(elements = [], settings = {}) {
    return {
        id: getId(),
        elType: 'section',
        isInner: false,
        settings: Object.assign({
            layout: 'boxed',
            content_width: { unit: 'px', size: 1280 }
        }, settings),
        elements
    };
}

// RULE: Nested/inner sections MUST have isInner: true — this was a key bug we fixed
function makeInnerSection(elements = [], settings = {}) {
    return {
        id: getId(),
        elType: 'section',
        isInner: true,
        settings: Object.assign({}, settings),
        elements
    };
}

// RULE: Columns NEVER have widgetType property (only widgets do)
function makeColumn(elements = [], settings = {}) {
    return {
        id: getId(),
        elType: 'column',
        isInner: false,
        settings: Object.assign({ _column_size: 100 }, settings),
        elements
    };
}

// RULE: Only elType:"widget" nodes get widgetType
// RULE: elements must always be [] on widgets (never omitted)
function makeWidget(widgetType, settings = {}) {
    return {
        id: getId(),
        elType: 'widget',
        isInner: false,
        widgetType,
        settings,
        elements: []
    };
}

// RULE: Typography must always be "custom" with explicit font_family
// Otherwise Elementor ignores the font family and weight settings
function typographySettings(size = 1.1, weight = '400', unit = 'rem') {
    return {
        typography_typography: 'custom',
        typography_font_family: 'Plus Jakarta Sans',
        typography_font_weight: weight,
        typography_font_size: { unit, size }
    };
}

// RULE: border_radius always needs full 6-key object with isLinked
// Partial objects cause silent import failures in Elementor
function borderRadius(size, unit = 'px', isLinked = true) {
    return {
        unit,
        top: String(size),
        right: String(size),
        bottom: String(size),
        left: String(size),
        isLinked
    };
}

function borderRadiusMixed(top, right, bottom, left, unit = 'px') {
    return {
        unit,
        top: String(top),
        right: String(right),
        bottom: String(bottom),
        left: String(left),
        isLinked: false
    };
}

// RULE: padding always needs full object with isLinked: false for mixed values
function padding(top, right, bottom, left, unit = 'px') {
    return {
        unit,
        top: String(top),
        right: String(right),
        bottom: String(bottom),
        left: String(left),
        isLinked: false
    };
}

function paddingAll(size, unit = 'px') {
    return {
        unit,
        top: String(size),
        right: String(size),
        bottom: String(size),
        left: String(size),
        isLinked: true
    };
}

module.exports = {
    getId,
    makeSection,
    makeInnerSection,
    makeColumn,
    makeWidget,
    typographySettings,
    borderRadius,
    borderRadiusMixed,
    padding,
    paddingAll
};
