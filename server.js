const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const port = Number(process.env.PORT) || 3000;
const apiKey = process.env.GEMINI_API_KEY;
const root = __dirname;
const publicFiles = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/index.html': ['index.html', 'text/html; charset=utf-8'],
  '/styles.css': ['styles.css', 'text/css; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
};

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  let raw = '';
  for await (const chunk of request) {
    raw += chunk;
    if (raw.length > 32_000) throw new Error('Request is too large.');
  }
  return JSON.parse(raw);
}

async function handleChat(request, response) {
  if (!apiKey) {
    sendJson(response, 503, { error: 'Gemini is not configured on this server.' });
    return;
  }

  try {
    const { messages } = await readJson(request);
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 20) {
      sendJson(response, 400, { error: 'Send between 1 and 20 messages.' });
      return;
    }

    const contents = messages.map((message) => {
      if (!['user', 'assistant'].includes(message.role) || typeof message.content !== 'string') {
        throw new Error('Invalid message format.');
      }
      return {
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: message.content.slice(0, 4_000) }],
      };
    });

    const endpoint = new URL(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    );
    endpoint.searchParams.set('key', apiKey);
    const geminiResponse = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({
        systemInstruction: {
          parts: [{
            text: 'You are EduGenie, a patient learning assistant. Explain ideas clearly, adapt to the learner, encourage reasoning, and use short examples. If the learner asks for a quiz or practice, ask one question at a time.',
          }],
        },
        contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 800 },
      }),
    });
    const result = await geminiResponse.json();
    if (!geminiResponse.ok) {
      const message = result.error?.message || 'Gemini could not complete that request.';
      sendJson(response, geminiResponse.status, { error: message });
      return;
    }

    const answer = result.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || '')
      .join('')
      .trim();
    if (!answer) {
      sendJson(response, 502, { error: 'Gemini returned an empty answer. Please try again.' });
      return;
    }
    sendJson(response, 200, { answer });
  } catch (error) {
    const statusCode = error.name === 'SyntaxError' || error.message === 'Invalid message format.'
      ? 400
      : 500;
    sendJson(response, statusCode, {
      error: error.name === 'TimeoutError'
        ? 'Gemini took too long to respond. Please try again.'
        : error.message,
    });
  }
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);

  if (url.pathname === '/api/status' && request.method === 'GET') {
    sendJson(response, 200, { geminiConfigured: Boolean(apiKey) });
    return;
  }

  if (url.pathname === '/api/chat' && request.method === 'POST') {
    await handleChat(request, response);
    return;
  }

  if (request.method === 'GET' && publicFiles[url.pathname]) {
    const [file, contentType] = publicFiles[url.pathname];
    response.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-cache' });
    fs.createReadStream(path.join(root, file)).pipe(response);
    return;
  }

  sendJson(response, 404, { error: 'Not found.' });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`EduGenie is ready at http://localhost:${port}`);
});