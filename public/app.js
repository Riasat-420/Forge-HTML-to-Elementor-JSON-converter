/* ── ElementorForge App JS ──────────────────────────────────────────── */

let currentJson      = null;
let aiGeneratedHtml  = null;
let aiGeneratedJson  = null;
let selectedProvider = 'gemini';

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initConverterTab();
    initAiStudio();
    initSettings();
    loadProviderStatus();
    loadPromptHistory();
});

// ── Tabs ──────────────────────────────────────────────────────────────────────
function initTabs() {
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`tab-${tabId}`).classList.add('active');
        });
    });

    // "Go to Settings" link inside AI placeholder
    const goBtn = document.getElementById('goToSettings');
    if (goBtn) {
        goBtn.addEventListener('click', () => {
            document.getElementById('nav-settings').click();
        });
    }
}

// ── Converter Tab ─────────────────────────────────────────────────────────────
function initConverterTab() {
    const htmlInput   = document.getElementById('htmlInput');
    const convertBtn  = document.getElementById('convertBtn');
    const clearBtn    = document.getElementById('clearHtml');
    const fileUpload  = document.getElementById('fileUpload');
    const dropZone    = document.getElementById('dropZone');
    const charCount   = document.getElementById('charCount');

    // Character counter + drop zone auto-hide
    htmlInput.addEventListener('input', () => {
        const len = htmlInput.value.length;
        charCount.textContent = len.toLocaleString() + ' chars';
        dropZone.classList.toggle('hidden', len > 0);
    });

    // Clear button
    clearBtn.addEventListener('click', () => {
        htmlInput.value = '';
        charCount.textContent = '0 chars';
        dropZone.classList.remove('hidden');
        resetJsonOutput();
        showToast('Editor cleared', 'info');
    });

    // File upload via input
    fileUpload.addEventListener('change', e => {
        const file = e.target.files[0];
        if (file) readFile(file);
        e.target.value = ''; // reset so same file can be re-uploaded
    });

    // Drag & drop
    dropZone.addEventListener('dragover', e => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', e => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file && (file.name.endsWith('.html') || file.name.endsWith('.htm'))) {
            readFile(file);
        } else {
            showToast('Please drop an HTML (.html / .htm) file', 'error');
        }
    });
    dropZone.addEventListener('click', () => fileUpload.click());

    // Keyboard shortcut: Ctrl+Enter to convert
    htmlInput.addEventListener('keydown', e => {
        if (e.ctrlKey && e.key === 'Enter') runConvert();
    });

    // Convert button
    convertBtn.addEventListener('click', () => runConvert());

    // Copy / Download JSON
    document.getElementById('copyJson').addEventListener('click', () => {
        const val = document.getElementById('jsonOutput').value;
        if (val) {
            navigator.clipboard.writeText(val)
                .then(() => showToast('JSON copied to clipboard!', 'success'))
                .catch(() => showToast('Copy failed — select all and Ctrl+C', 'error'));
        }
    });

    document.getElementById('downloadJson').addEventListener('click', () => {
        if (currentJson) {
            downloadJson(currentJson, document.getElementById('pageTitle').value || 'converted-page');
        }
    });
}

function readFile(file) {
    const reader = new FileReader();
    reader.onload = e => {
        const htmlInput = document.getElementById('htmlInput');
        htmlInput.value = e.target.result;
        const len = e.target.result.length;
        document.getElementById('charCount').textContent = len.toLocaleString() + ' chars';
        document.getElementById('dropZone').classList.add('hidden');
        showToast('Loaded: ' + file.name, 'success');
        // Auto-convert small files
        if (len < 200000) runConvert(e.target.result, file.name.replace(/\.(html?)/i, ''));
    };
    reader.onerror = () => showToast('Could not read file', 'error');
    reader.readAsText(file);
}

async function runConvert(html = null, title = null) {
    const htmlStr    = html  || document.getElementById('htmlInput').value.trim();
    const pageTitle  = title || document.getElementById('pageTitle').value.trim() || 'Converted Page';

    if (!htmlStr) {
        showToast('Please paste or upload an HTML file first', 'error');
        return null;
    }

    setConverterHint('');
    showLoader('Converting HTML to Elementor JSON…');

    try {
        const res = await fetch('/api/convert', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ html: htmlStr, title: pageTitle })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Unknown error');

        currentJson = data.json;
        displayJsonOutput(data.json);
        showToast('Converted successfully!', 'success');
        return currentJson;
    } catch (err) {
        showToast('Conversion failed: ' + err.message, 'error');
        setConverterHint('⚠ Conversion error — check your HTML structure');
        return null;
    } finally {
        hideLoader();
    }
}

function displayJsonOutput(jsonObj) {
    const jsonStr      = JSON.stringify(jsonObj, null, 2);
    const output       = document.getElementById('jsonOutput');
    const placeholder  = document.getElementById('outputPlaceholder');
    const actionsEl    = document.getElementById('jsonActions');
    const statsEl      = document.getElementById('jsonStats');
    const statsText    = document.getElementById('jsonStatsText');

    output.value             = jsonStr;
    output.style.display     = 'block';
    placeholder.style.display = 'none';
    actionsEl.style.display  = 'flex';
    statsEl.style.display    = 'flex';

    const sectionCount = (jsonObj.content || []).length;
    const kb           = (new Blob([jsonStr]).size / 1024).toFixed(1);
    statsText.textContent = `${sectionCount} section${sectionCount !== 1 ? 's' : ''} · ${kb} KB · v${jsonObj.version || '0.4'}`;
}

function resetJsonOutput() {
    currentJson = null;
    const output      = document.getElementById('jsonOutput');
    const placeholder = document.getElementById('outputPlaceholder');
    const actionsEl   = document.getElementById('jsonActions');
    const statsEl     = document.getElementById('jsonStats');

    output.value              = '';
    output.style.display      = 'none';
    placeholder.style.display = 'flex';
    actionsEl.style.display   = 'none';
    statsEl.style.display     = 'none';
    setConverterHint('<i class="fas fa-info-circle"></i> Click Convert →');
}

function setConverterHint(html) {
    const el = document.getElementById('converterHint');
    if (el) el.innerHTML = html;
}

// ── AI Studio ─────────────────────────────────────────────────────────────────
function initAiStudio() {

    // Provider pills
    document.querySelectorAll('.provider-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('.provider-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            selectedProvider = pill.dataset.provider;
        });
    });

    // Output tabs (HTML Code vs Preview)
    document.querySelectorAll('.output-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.output-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            switchAiOutputView(tab.dataset.output);
        });
    });

    // Generate
    document.getElementById('generateBtn').addEventListener('click', runGenerate);

    // Ctrl+Enter in prompt
    document.getElementById('aiPrompt').addEventListener('keydown', e => {
        if (e.ctrlKey && e.key === 'Enter') runGenerate();
    });

    // Copy HTML
    document.getElementById('copyAiHtml').addEventListener('click', () => {
        if (!aiGeneratedHtml) return;
        navigator.clipboard.writeText(aiGeneratedHtml)
            .then(() => showToast('HTML copied!', 'success'))
            .catch(() => showToast('Copy failed', 'error'));
    });

    // Send to Converter
    document.getElementById('sendToConverter').addEventListener('click', () => {
        if (!aiGeneratedHtml) return;
        const htmlInput = document.getElementById('htmlInput');
        htmlInput.value = aiGeneratedHtml;
        document.getElementById('charCount').textContent = aiGeneratedHtml.length.toLocaleString() + ' chars';
        document.getElementById('dropZone').classList.add('hidden');
        // Copy page title if set
        const aiTitle = document.getElementById('aiPageTitle').value.trim();
        if (aiTitle) document.getElementById('pageTitle').value = aiTitle;
        // Reset stale JSON output so user knows to convert fresh
        resetJsonOutput();
        document.getElementById('nav-converter').click();
        showToast('HTML sent to Converter!', 'success');
    });

    // Convert to JSON (runs from AI studio)
    document.getElementById('generateAndConvert').addEventListener('click', async () => {
        if (!aiGeneratedHtml) return;
        const title = document.getElementById('aiPageTitle').value.trim() || 'AI Generated Page';
        showLoader('Converting to Elementor JSON…');
        try {
            const res = await fetch('/api/convert', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ html: aiGeneratedHtml, title })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Unknown error');
            aiGeneratedJson = data.json;
            displayAiJson(data.json);
            showToast('JSON ready — click Download!', 'success');
        } catch (err) {
            showToast('Conversion error: ' + err.message, 'error');
        } finally {
            hideLoader();
        }
    });

    // Copy AI JSON
    document.getElementById('copyAiJson').addEventListener('click', () => {
        if (!aiGeneratedJson) return;
        navigator.clipboard.writeText(JSON.stringify(aiGeneratedJson, null, 2))
            .then(() => showToast('JSON copied!', 'success'))
            .catch(() => showToast('Copy failed', 'error'));
    });

    // Download AI JSON
    document.getElementById('downloadAiJson').addEventListener('click', () => {
        if (aiGeneratedJson) {
            downloadJson(aiGeneratedJson, document.getElementById('aiPageTitle').value || 'ai-generated-page');
        }
    });
}

async function runGenerate() {
    const prompt = document.getElementById('aiPrompt').value.trim();
    if (!prompt) { showToast('Please enter a prompt first', 'error'); return; }

    savePromptToHistory(prompt);
    showLoader(`Generating HTML with ${selectedProvider}…`);

    try {
        const res = await fetch('/api/generate', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ prompt, provider: selectedProvider })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Unknown error');

        aiGeneratedHtml = data.html;

        // Show HTML code view
        const output      = document.getElementById('aiHtmlOutput');
        const placeholder = document.getElementById('aiPlaceholder');
        const actions     = document.getElementById('aiOutputActions');
        output.value              = aiGeneratedHtml;
        output.style.display      = 'block';
        placeholder.style.display = 'none';
        actions.style.display     = 'flex';

        // Hide old JSON result if present
        document.getElementById('aiJsonResult').style.display = 'none';
        aiGeneratedJson = null;

        // Switch to code tab
        document.querySelectorAll('.output-tab').forEach(t => t.classList.remove('active'));
        document.getElementById('tabHtmlCode').classList.add('active');
        document.getElementById('aiPreviewFrame').style.display = 'none';

        showToast('HTML generated!', 'success');
    } catch (err) {
        showToast('Generation failed: ' + err.message, 'error');
    } finally {
        hideLoader();
    }
}

function switchAiOutputView(view) {
    const codeArea    = document.getElementById('aiHtmlOutput');
    const preview     = document.getElementById('aiPreviewFrame');
    const placeholder = document.getElementById('aiPlaceholder');

    if (view === 'html-preview' && aiGeneratedHtml) {
        codeArea.style.display    = 'none';
        placeholder.style.display = 'none';
        preview.style.display     = 'block';
        preview.srcdoc            = aiGeneratedHtml;
    } else {
        preview.style.display = 'none';
        if (aiGeneratedHtml) {
            codeArea.style.display    = 'block';
            placeholder.style.display = 'none';
        } else {
            codeArea.style.display    = 'none';
            placeholder.style.display = 'flex';
        }
    }
}

function displayAiJson(jsonObj) {
    const jsonStr   = JSON.stringify(jsonObj, null, 2);
    const resultEl  = document.getElementById('aiJsonResult');
    const statsEl   = document.getElementById('aiJsonStats');
    const outputEl  = document.getElementById('aiJsonOutput');

    outputEl.value        = jsonStr;
    resultEl.style.display = 'flex';

    const kb           = (new Blob([jsonStr]).size / 1024).toFixed(1);
    const sectionCount = (jsonObj.content || []).length;
    statsEl.textContent  = `${sectionCount} section${sectionCount !== 1 ? 's' : ''} · ${kb} KB`;
}

// ── Settings ──────────────────────────────────────────────────────────────────
function initSettings() {
    // Toggle password visibility
    document.querySelectorAll('.toggle-key').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = document.getElementById(btn.dataset.target);
            if (!input) return;
            input.type = input.type === 'password' ? 'text' : 'password';
            btn.querySelector('i').className = input.type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
        });
    });

    // Save key buttons
    document.querySelectorAll('.save-key-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const provider = btn.dataset.provider;
            const input    = document.getElementById(`key-${provider}`);
            const val      = input ? input.value.trim() : '';
            if (!val) { showToast('Enter a key first', 'error'); return; }

            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…';
            btn.disabled  = true;

            const body = {};
            body[provider] = val;

            try {
                const res  = await fetch('/api/save-keys', {
                    method:  'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body:    JSON.stringify(body)
                });
                const data = await res.json();
                if (!data.success) throw new Error(data.error || 'Save failed');

                showToast(`${provider} key saved!`, 'success');
                updateBadge(provider, true);
                document.getElementById(`card-${provider}`)?.classList.add('key-saved');
                loadProviderStatus();
            } catch (err) {
                showToast('Save failed: ' + err.message, 'error');
            } finally {
                btn.innerHTML = '<i class="fas fa-save"></i> Save';
                btn.disabled  = false;
            }
        });
    });

    // Test key buttons
    document.querySelectorAll('.test-key-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const provider = btn.dataset.provider;
            const input    = document.getElementById(`key-${provider}`);
            const key      = input ? input.value.trim() : '';

            if (!key) {
                showToast('Enter a key to test', 'error');
                return;
            }

            const resultEl = document.getElementById(`test-result-${provider}`);
            btn.innerHTML  = '<i class="fas fa-spinner fa-spin"></i> Testing…';
            btn.disabled   = true;
            if (resultEl) {
                resultEl.className   = 'key-test-result';
                resultEl.style.display = 'none';
            }

            try {
                const res  = await fetch('/api/test-key', {
                    method:  'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body:    JSON.stringify({ provider, key })
                });
                const data = await res.json();

                if (resultEl) {
                    if (data.success) {
                        resultEl.className   = 'key-test-result success';
                        resultEl.textContent = '✓ Connection successful!';
                        showToast('API key is valid!', 'success');
                    } else {
                        resultEl.className   = 'key-test-result error';
                        resultEl.textContent = '✗ ' + (data.error || 'Invalid key');
                        showToast('Key test failed', 'error');
                    }
                }
            } catch (err) {
                if (resultEl) {
                    resultEl.className   = 'key-test-result error';
                    resultEl.textContent = '✗ Network error: ' + err.message;
                }
            } finally {
                btn.innerHTML = '<i class="fas fa-plug"></i> Test';
                btn.disabled  = false;
            }
        });
    });
}

async function loadProviderStatus() {
    try {
        const res  = await fetch('/api/providers');
        const data = await res.json();

        ['gemini', 'groq', 'together'].forEach(p => {
            const isSet = !!data[p];

            updateBadge(p, isSet);

            // Sidebar dot
            const dot = document.querySelector(`#status-${p} .dot`);
            if (dot) dot.classList.toggle('active', isSet);

            // AI Studio pill dot + badge
            const pillDot   = document.getElementById(`pill-dot-${p}`);
            const pillBadge = document.getElementById(`pill-badge-${p}`);
            if (pillDot)   pillDot.classList.toggle('active', isSet);
            if (pillBadge) {
                pillBadge.textContent = isSet ? 'Ready' : '';
                pillBadge.classList.toggle('ready', isSet);
            }

            // Settings card border highlight
            if (isSet) {
                document.getElementById(`card-${p}`)?.classList.add('key-saved');
            }
        });
    } catch (e) { /* server might not be ready yet */ }
}

function updateBadge(provider, isSet) {
    const badge = document.getElementById(`badge-${provider}`);
    if (!badge) return;
    badge.textContent = isSet ? '✓ Saved' : 'Not Set';
    badge.className   = isSet ? 'key-badge set' : 'key-badge';
}

// ── Prompt History ────────────────────────────────────────────────────────────
function savePromptToHistory(prompt) {
    let history = JSON.parse(localStorage.getItem('ef_prompt_history') || '[]');
    history = [prompt, ...history.filter(p => p !== prompt)].slice(0, 12);
    localStorage.setItem('ef_prompt_history', JSON.stringify(history));
    renderPromptHistory(history);
}

function loadPromptHistory() {
    const history = JSON.parse(localStorage.getItem('ef_prompt_history') || '[]');
    if (history.length) renderPromptHistory(history);
}

function renderPromptHistory(history) {
    const container = document.getElementById('historyList');
    const wrapper   = document.getElementById('promptHistory');
    if (!container || !wrapper) return;
    if (!history.length) { wrapper.style.display = 'none'; return; }

    wrapper.style.display = 'block';
    container.innerHTML   = history.map((p, i) =>
        `<div class="history-item" title="${escHtml(p)}" data-idx="${i}">${escHtml(p)}</div>`
    ).join('');

    container.querySelectorAll('.history-item').forEach(item => {
        item.addEventListener('click', () => {
            const idx = parseInt(item.dataset.idx, 10);
            document.getElementById('aiPrompt').value = history[idx];
            document.getElementById('aiPrompt').focus();
        });
    });
}

function escHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function downloadJson(jsonObj, name) {
    const str  = JSON.stringify(jsonObj, null, 2);
    const blob = new Blob([str], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '') + '-elementor.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('JSON downloaded!', 'success');
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };
    toast.innerHTML   = `<i class="fas ${icons[type] || icons.info}"></i> ${message}`;
    toast.className   = `toast show ${type}`;
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => { toast.className = 'toast'; }, 3200);
}

function showLoader(text = 'Processing…') {
    document.getElementById('loaderText').textContent = text;
    document.getElementById('loaderOverlay').style.display = 'flex';
}

function hideLoader() {
    document.getElementById('loaderOverlay').style.display = 'none';
}
