/**
 * converter/template-builder.js
 * Wraps Elementor sections in the final importable document structure.
 * RULE: version must be "0.4", type must be "page"
 */
function buildTemplate(sections, title = 'Converted Page') {
    return {
        content: sections,
        page_settings: [],
        version: '0.4',
        title,
        type: 'page'
    };
}
module.exports = { buildTemplate };
