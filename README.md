# ⚡ ElementorForge

**Convert HTML templates to native Elementor JSON — with optional AI generation.**

ElementorForge is a local Node.js web app that parses structured HTML and outputs valid, importable Elementor page templates. It eliminates the trial-and-error of manually building Elementor JSON by hand, and includes an AI Studio to generate Elementor-optimized HTML from a plain text prompt.

---

## Features

- **HTML → Elementor JSON** conversion engine with all schema rules baked in
- **AI Studio** — generate Elementor-optimized HTML via Gemini, Groq, or Together.ai
- **Drag-and-drop** file upload + paste support
- **One-click download** of the `.json` template ready to import into Elementor
- **Live HTML preview** of AI-generated pages before converting
- Phosphor icon → FontAwesome auto-remapping
- Settings panel with API key management (stored locally in `.env`)

---

## Screenshots

| Converter | AI Studio | Settings |
|---|---|---|
| Paste HTML → get JSON | Prompt → HTML → JSON | Manage API keys |

---

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/Riasat-420/Forge-HTML-to-Elementor-JSON-converter.git
cd Forge-HTML-to-Elementor-JSON-converter
```

### 2. Install dependencies

```bash
npm install
```

### 3. Add your API key

Copy the example env file and add at least one API key:

```bash
cp .env.example .env
```

Open `.env` and fill in your key(s):

```env
GEMINI_API_KEY=AIza...
GROQ_API_KEY=gsk_...
TOGETHER_API_KEY=tgth-...
```

> You only need **one** provider key to use the AI Studio. Gemini has a free tier (15 req/min).

### 4. Start the server

```bash
npm start
```

Then open **http://localhost:3500** in your browser.

---

## Usage

### Converter Tab

1. Paste your HTML into the editor (or drag & drop a `.html` file)
2. Set a page title (optional)
3. Click **Convert** (or press `Ctrl+Enter`)
4. Download the generated `.json` file
5. In WordPress: **Elementor → Templates → Import** → select the file

### AI Studio Tab

1. Select a provider (Gemini, Groq, or Together.ai)
2. Enter a page title and describe what you want
3. Click **Generate HTML**
4. Preview the result, then click **Convert to JSON**
5. Download and import into Elementor

---

## Supported HTML → Elementor Widget Mappings

| HTML Element | Elementor Widget |
|---|---|
| `<h1>` – `<h6>` | Heading |
| `<p>`, `.subheadline` | Text Editor |
| `<a class="btn btn-primary">` | Button (pill, blue) |
| `<a class="btn btn-secondary">` | Button (pill, outlined) |
| `<img>` | Image |
| `<iframe src="youtube...">` | Video |
| `<div class="card">` | Icon Box |
| `<ul class="check-list">` | Text Editor (styled checklist) |
| `<div class="grid-2/3/4">` | Inner Section (columns) |
| `<section>` | Elementor Section |
| `<div style="background-image:...">` | Image (extracted URL) |

---

## Built-in Conversion Rules

These are permanently enforced by the converter engine (based on real Elementor import debugging):

- Every node has `id`, `isInner`, `elType`, `elements: []`
- `widgetType` only appears on `elType: "widget"` nodes
- `border_radius` always uses the full 6-key object with `isLinked`
- Top-level sections always have `layout: "boxed"` + `content_width`
- Inner sections always have `isInner: true`
- Typography always `"custom"` with `font_family: "Plus Jakarta Sans"`
- Phosphor icons (`ph-*`) auto-remapped to FontAwesome equivalents
- Buttons always pill-shaped (`border-radius: 100px`)
- `selected_icon` always `{ value: "fas fa-x", library: "fa-solid" }`
- Template `version` always `"0.4"`, `type` always `"page"`

---

## AI HTML Structure Requirements

For best conversion results, the HTML generator (and manual HTML you paste) should follow this structure:

```html
<main>
  <section class="hero">
    <div class="container">
      <span class="tagline">EYEBROW LABEL</span>
      <h1>Page Heading</h1>
      <p>Description paragraph.</p>
      <a href="/contact/" class="btn btn-primary">CTA Button</a>
    </div>
  </section>

  <section class="section-light">
    <div class="container">
      <div class="grid-3">
        <div class="card">
          <div class="card-icon"><i class="fas fa-headset"></i></div>
          <h3>Card Title</h3>
          <p>Card description.</p>
        </div>
        <!-- repeat × 3 -->
      </div>
    </div>
  </section>
</main>
```

> **Icons:** Always use FontAwesome (`fas`, `far`, `fab`). Never use Phosphor, Heroicons, or inline SVGs in manually written HTML.

---

## Project Structure

```
elementor-forge/
├── server.js                  # Express backend (API routes)
├── converter/
│   ├── html-parser.js         # Core HTML → Elementor JSON engine
│   ├── widget-map.js          # Widget builders + Phosphor→FA icon map
│   ├── rules.js               # Low-level Elementor node factories
│   └── template-builder.js   # Final template wrapper
├── prompts/
│   └── html-gen.md            # AI system prompt (design system rules)
├── public/
│   ├── index.html             # Dashboard UI
│   ├── app.js                 # Frontend logic
│   └── style.css              # Styles
├── .env.example               # API key template
└── package.json
```

---

## API Providers

| Provider | Free Tier | Model Used |
|---|---|---|
| [Google Gemini](https://aistudio.google.com/apikey) | 15 req/min | gemini-2.0-flash |
| [Groq](https://console.groq.com/keys) | 30 req/min | llama-3.3-70b-versatile |
| [Together.ai](https://api.together.ai/settings/api-keys) | $1 free credit | Llama-3.3-70B-Instruct-Turbo |

---

## License

MIT — free to use, modify, and distribute.
