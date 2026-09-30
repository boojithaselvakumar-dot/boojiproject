# EduGenie

EduGenie is a small, responsive learning workspace with a Gemini-powered tutor, interactive flashcards, and a quick quiz. It uses Node.js built-ins only.

## Run it

Requires Node.js 20 or newer.

```sh
npm start
```

Open [http://localhost:3000](http://localhost:3000). Without an API key, the app runs in demo mode: the flashcards and quiz work normally, and the tutor returns sample study guidance.

## Connect Gemini

Create a Gemini API key in Google AI Studio, then set it in the server environment before starting EduGenie:

```sh
GEMINI_API_KEY=your_key_here npm start
```

The key stays on the server and is never sent to the browser. The app uses the `gemini-2.5-flash` model through the Gemini REST API. Keep API keys private and do not commit them to this repository.

To use another port, set `PORT`:

```sh
PORT=4000 npm start
```