const fs = require('fs');
const { makeSection, makeInnerSection, makeColumn, makeWidget, typographySettings, borderRadius, padding } = require('./converter/rules');
const { buildTemplate } = require('./converter/template-builder');
const { buildHeading, buildText, buildImage } = require('./converter/widget-map');

const team = [
  { name: "Andrew Kennedy", role: "Founder & CEO", image: "http://localhost/test/wp-content/uploads/2025/10/Andrew-headshot.jpeg" },
  { name: "Zoe Ricarte", role: "Director of Operations", image: "http://localhost/test/wp-content/uploads/2025/10/Image-02-Grey.jpg" },
  { name: "Mili Mourino", role: "Director of Client Success & Sales", image: "http://localhost/test/wp-content/uploads/2025/10/WhatsApp-Image-2025-10-25-at-2.37.04-AM.jpeg" },
  { name: "AJ Abao", role: "Director of IT & Security", image: "http://localhost/test/wp-content/uploads/2026/03/profile_bw_grey_bg.png" },
  { name: "Eleanor Sang", role: "Operations Manager", image: "http://localhost/test/wp-content/uploads/2025/10/Image-01.jpg" },
  { name: "Jose", role: "Operations Manager", image: "http://localhost/test/wp-content/uploads/2026/03/WhatsApp-Image-2026-03-05-at-10.59.53-PM.jpeg" },
  { name: "Jean Densing", role: "Manager of Quality Assurance & Training", image: "http://localhost/test/wp-content/uploads/2025/10/Jean.jpg" }
];

function buildCard(member) {
  const imgWidget = buildImage(member.image, member.name, 100, 0); // No global radius, we add to top only
  // Enforce consistent image sizing so cards align perfectly
  imgWidget.settings.height = { unit: 'px', size: 320, isLinked: false };
  imgWidget.settings.object_fit = 'cover';
  imgWidget.settings.border_radius = { unit: 'px', top: '12', right: '12', bottom: '0', left: '0', isLinked: false };
  imgWidget.settings.margin = { unit: 'px', top: '0', right: '0', bottom: '0', left: '0', isLinked: false };

  const nameWidget = buildHeading(member.name, 'h3', '#0f172a', 1.25, 'center', '700');
  nameWidget.settings.margin = { unit: 'px', top: '0', right: '0', bottom: '4', left: '0', isLinked: false };
  nameWidget.settings.padding = { unit: 'px', top: '24', right: '20', bottom: '0', left: '20', isLinked: false };

  const roleWidget = buildHeading(member.role, 'span', '#2563eb', 0.9, 'center', '600');
  roleWidget.settings.typography_font_family = 'Inter';
  roleWidget.settings.margin = { unit: 'px', top: '0', right: '0', bottom: '0', left: '0', isLinked: false };
  roleWidget.settings.padding = { unit: 'px', top: '0', right: '20', bottom: '24', left: '20', isLinked: false };

  return makeColumn([imgWidget, nameWidget, roleWidget], {
    background_color: '#ffffff',
    border_border: 'solid',
    border_color: '#e2e8f0',
    border_width: { unit: 'px', top: '1', right: '1', bottom: '1', left: '1', isLinked: true },
    border_radius: borderRadius(12),
    padding: { unit: 'px', top: '0', right: '0', bottom: '0', left: '0', isLinked: true }
    // No outer padding, we padded elements
  });
}

const widgets = [];

// Header Headings
widgets.push(buildHeading('THE PEOPLE BEHIND THE PERFORMANCE', 'span', '#2563eb', 0.85, 'center', '700'));
widgets.push(buildHeading('Leadership & Operations', 'h2', '#0f172a', 3, 'center', '700'));
widgets.push(buildText('<p>We don\'t just provide talent — we provide the management, security, and quality assurance infrastructure to guarantee your success.</p>', 'center', '#475569', 1.1));

// Tier 1 (Andrew) inner section width approx 360px
// InnerSection with 1 column
const andrewCol = buildCard(team[0]);
// Instead of a single column stretching, we add empty columns left and right
const tier1Inner = makeInnerSection([
  makeColumn([], { _column_size: 33 }),
  andrewCol,
  makeColumn([], { _column_size: 33 })
], { gap: 'extended' });

// Add margin bottom to inner section
tier1Inner.settings.margin = { unit: 'px', top: '0', bottom: '60', left: '0', right: '0', isLinked: false };
widgets.push(tier1Inner);

// Tier 2 Title
widgets.push(buildHeading('Directors & Strategy', 'h3', '#94a3b8', 1.5, 'center', '700'));

// Tier 2 (Zoe, Mili, AJ) Inner section
const tier2Cols = team.slice(1, 4).map(m => buildCard(m));
const tier2Inner = makeInnerSection(tier2Cols, { gap: 'extended' });
tier2Inner.settings.margin = { unit: 'px', top: '20', bottom: '60', left: '0', right: '0', isLinked: false };
widgets.push(tier2Inner);

// Tier 3 Title
widgets.push(buildHeading('Operations Management', 'h3', '#94a3b8', 1.5, 'center', '700'));

// Tier 3 (Eleanor, Jose, Jean) Inner section
const tier3Cols = team.slice(4, 7).map(m => buildCard(m));
const tier3Inner = makeInnerSection(tier3Cols, { gap: 'extended' });
tier3Inner.settings.margin = { unit: 'px', top: '20', bottom: '0', left: '0', right: '0', isLinked: false };
widgets.push(tier3Inner);

// Wrap everything in main column -> section
const mainColumn = makeColumn(widgets, { _column_size: 100 });
const mainSection = makeSection([mainColumn], {
  layout: 'boxed',
  content_width: { unit: 'px', size: 1280 },
  background_color: '#f8fafc',
  padding: padding(100, 0, 100, 0, 'px')
});

const template = buildTemplate([mainSection], 'Premium Team Section');
fs.writeFileSync('../innoedge-team-elementor.json', JSON.stringify(template, null, 2));

console.log("JSON generated: innoedge-team-elementor.json");
