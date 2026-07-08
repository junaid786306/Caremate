import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';

const assistantPrompts = {
  caremate: "You are Caremate, a calm human-like companion for Shreya. Speak naturally, warmly, and conversationally, like a caring assistant sitting with her. Keep voice replies short: 1 to 3 sentences unless she asks for details. Acknowledge what she said, answer directly, and ask one gentle follow-up question when useful. Do not sound robotic or say you are an AI unless asked. For urgent symptoms or medical decisions, advise contacting a qualified clinician or emergency help.",
  exercise: "You are Exercise Coach for Caremate. Give safe, senior-friendly movement guidance, gentle encouragement, and practical activity suggestions. Avoid intense workouts and recommend medical clearance for pain, dizziness, chest symptoms, or major health concerns.",
  scam: "You are Scam Assistance for Caremate. Help users identify suspicious messages, calls, links, payment requests, impersonation, OTP/PIN theft, gift-card scams, KYC scams, UPI/payment fraud, fake delivery alerts, and pressure tactics. Always give a clear verdict first: High Risk, Suspicious, or Appears Low Risk. Then give 2-4 short reasons and 2-4 immediate safety steps. Be calm, direct, and safety-focused. Never tell the user to click suspicious links, call numbers from the suspicious message, share OTP/PIN/passwords, install remote-access apps, or send money. Tell them to verify only through official apps, official websites, or trusted published phone numbers."
};

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(body);
}

function readRawBody(req, maxBytes = 25000000) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error('Request is too large.'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function assistantApiPlugin() {
  return {
    name: 'caremate-assistant-api',
    configureServer(server) {
      server.middlewares.use('/api/transcribe', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }

        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
          sendJson(res, 500, { error: 'OPENAI_API_KEY is not set in this terminal.' });
          return;
        }

        try {
          const contentType = req.headers['content-type'];
          if (!contentType?.includes('multipart/form-data')) {
            sendJson(res, 400, { error: 'Expected multipart audio data.' });
            return;
          }

          const rawBody = await readRawBody(req);
          const openaiResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': contentType
            },
            body: rawBody
          });

          const data = await openaiResponse.json().catch(() => ({}));
          if (!openaiResponse.ok) {
            sendJson(res, openaiResponse.status, { error: data.error?.message || 'Transcription failed.' });
            return;
          }

          sendJson(res, 200, { text: data.text || '' });
        } catch (error) {
          sendJson(res, 500, { error: error.message || 'Transcription error.' });
        }
      });

      server.middlewares.use('/api/assistant', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }

        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
          sendJson(res, 500, { error: 'OPENAI_API_KEY is not set in this terminal.' });
          return;
        }

        try {
          const rawBody = await readRawBody(req, 1000000);
          const payload = JSON.parse(rawBody.toString('utf8') || '{}');
          const assistant = String(payload.assistant || 'caremate');
          const message = String(payload.message || '').trim();

          if (!message) {
            sendJson(res, 400, { error: 'Message is required.' });
            return;
          }

          const openaiResponse = await fetch('https://api.openai.com/v1/responses', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
              instructions: assistantPrompts[assistant] || assistantPrompts.caremate,
              input: message
            })
          });

          const data = await openaiResponse.json();
          if (!openaiResponse.ok) {
            sendJson(res, openaiResponse.status, { error: data.error?.message || 'OpenAI request failed.' });
            return;
          }

          const reply = data.output_text
            || data.output?.flatMap(item => item.content || []).map(item => item.text || '').join('').trim()
            || 'I am here with you, but I could not form a reply just now.';

          sendJson(res, 200, { reply });
        } catch (error) {
          sendJson(res, 500, { error: error.message || 'Assistant error.' });
        }
      });
    }
  };
}


// Dynamically generate the input object for all .html files
const htmlFiles = fs.readdirSync(__dirname).filter(file => file.endsWith('.html'));
const input = {};
htmlFiles.forEach(file => {
  const name = file.replace('.html', '');
  input[name] = resolve(__dirname, file);
});

export default defineConfig({
  plugins: [assistantApiPlugin()],
  build: {
    rollupOptions: {
      input
    }
  }
});
