require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { convertHTML } = require('./converter/html-parser');

const app = express();
const PORT = 3500;

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── POST /api/convert ────────────────────────────────────────────────────────
app.post('/api/convert', (req, res) => {
    try {
        const { html, title } = req.body;
        if (!html) return res.status(400).json({ error: 'No HTML provided' });
        const result = convertHTML(html, title || 'Converted Page');
        res.json({ success: true, json: result });
    } catch (err) {
        console.error('[Convert Error]', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── POST /api/generate ───────────────────────────────────────────────────────
app.post('/api/generate', async (req, res) => {
    try {
        const { prompt, provider } = req.body;
        if (!prompt) return res.status(400).json({ error: 'No prompt provided' });

        const systemPrompt = fs.readFileSync(path.join(__dirname, 'prompts/html-gen.md'), 'utf8');
        let html = '';

        if (provider === 'gemini') {
            html = await callGemini(prompt, systemPrompt);
        } else if (provider === 'groq') {
            html = await callOpenAICompat(prompt, systemPrompt, {
                baseUrl: 'https://api.groq.com/openai/v1',
                key: process.env.GROQ_API_KEY,
                model: 'llama-3.3-70b-versatile'
            });
        } else if (provider === 'together') {
            html = await callOpenAICompat(prompt, systemPrompt, {
                baseUrl: 'https://api.together.xyz/v1',
                key: process.env.TOGETHER_API_KEY,
                model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo'
            });
        } else {
            return res.status(400).json({ error: 'Unknown provider: ' + provider });
        }

        // Extract only the HTML block if AI wrapped in markdown
        const htmlMatch = html.match(/```html\n?([\s\S]+?)```/) || html.match(/<!DOCTYPE[\s\S]+>/i);
        const cleanHtml = htmlMatch ? (htmlMatch[1] || htmlMatch[0]) : html;

        res.json({ success: true, html: cleanHtml.trim() });
    } catch (err) {
        console.error('[Generate Error]', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── POST /api/save-keys ──────────────────────────────────────────────────────
app.post('/api/save-keys', (req, res) => {
    try {
        const { gemini, groq, together } = req.body;
        const envPath = path.join(__dirname, '.env');
        let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

        function setVar(content, key, value) {
            if (!value) return content;
            const re = new RegExp(`^${key}=.*$`, 'm');
            const line = `${key}=${value}`;
            if (re.test(content)) return content.replace(re, line);
            return content + (content && !content.endsWith('\n') ? '\n' : '') + line + '\n';
        }

        if (gemini) { envContent = setVar(envContent, 'GEMINI_API_KEY', gemini); process.env.GEMINI_API_KEY = gemini; }
        if (groq) { envContent = setVar(envContent, 'GROQ_API_KEY', groq); process.env.GROQ_API_KEY = groq; }
        if (together) { envContent = setVar(envContent, 'TOGETHER_API_KEY', together); process.env.TOGETHER_API_KEY = together; }

        fs.writeFileSync(envPath, envContent);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/providers ───────────────────────────────────────────────────────
app.get('/api/providers', (req, res) => {
    res.json({
        gemini: !!process.env.GEMINI_API_KEY,
        groq: !!process.env.GROQ_API_KEY,
        together: !!process.env.TOGETHER_API_KEY
    });
});

// ── POST /api/test-key ───────────────────────────────────────────────────────
app.post('/api/test-key', async (req, res) => {
    const { provider, key } = req.body;
    try {
        let ok = false;
        if (provider === 'gemini') {
            const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: 'Say OK' }] }] })
            });
            ok = r.ok;
        } else if (provider === 'groq') {
            const r = await fetch('https://api.groq.com/openai/v1/models', { headers: { Authorization: `Bearer ${key}` } });
            ok = r.ok;
        } else if (provider === 'together') {
            const r = await fetch('https://api.together.xyz/v1/models', { headers: { Authorization: `Bearer ${key}` } });
            ok = r.ok;
        }
        res.json({ success: ok, error: ok ? null : 'Invalid key or API error' });
    } catch (err) {
        res.json({ success: false, error: err.message });
    }
});

// ── AI Helpers ───────────────────────────────────────────────────────────────
async function callGemini(prompt, systemPrompt) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('Gemini API key not set — add it in Settings.');
    // Use gemini-2.0-flash (current free model). Combine system + user in contents array
    // for broadest API version compatibility.
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [
                { role: 'user', parts: [{ text: systemPrompt + '\n\n---\n\nUSER REQUEST:\n' + prompt }] }
            ],
            generationConfig: { maxOutputTokens: 8192, temperature: 0.7 }
        })
    });
    if (!r.ok) {
        const e = await r.json();
        throw new Error(e.error?.message || 'Gemini API error');
    }
    const d = await r.json();
    const text = d.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Gemini returned an empty response. Check your prompt and try again.');
    return text;
}

async function callOpenAICompat(prompt, systemPrompt, { baseUrl, key, model }) {
    if (!key) throw new Error('API key for this provider not set — add it in Settings.');
    const r = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }], max_tokens: 8192 })
    });
    if (!r.ok) { const e = await r.json(); throw new Error(e.error?.message || 'API error'); }
    const d = await r.json();
    return d.choices[0].message.content;
}

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log('\n  ⚡ ElementorForge running!');
    console.log(`     → http://localhost:${PORT}\n`);
});
