# MITHYA

MITHYA is an AI fake news analyzer for Indian audiences. It combines a Node.js + Express backend with a React + Vite frontend to evaluate claims and place them on a credibility scale.

## Stack

- Backend: Node.js, Express, Gemini API
- Frontend: React, Vite

## Credibility Bands

- `0-20`: `FAKE`
- `21-40`: `MISLEADING`
- `41-60`: `UNCERTAIN`
- `61-80`: `LIKELY TRUE`
- `81-100`: `VERIFIED`

## Project Structure

- [`server.js`](C:/Users/yash2/Documents/Mithya/server.js): Express API and Gemini integration
- [`package.json`](C:/Users/yash2/Documents/Mithya/package.json): backend dependencies and start script
- [`client/src/App.jsx`](C:/Users/yash2/Documents/Mithya/client/src/App.jsx): main frontend app
- [`client/src/App.css`](C:/Users/yash2/Documents/Mithya/client/src/App.css): frontend styling

## Setup

1. Install backend dependencies in the project root:

```powershell
npm install
```

2. Install frontend dependencies:

```powershell
cd client
npm install
```

3. Add your Gemini API key to [`.env`](C:/Users/yash2/Documents/Mithya/.env):

```env
GEMINI_API_KEY=your_api_key_here
```

## Run Locally

Start the backend from the project root:

```powershell
npm start
```

Start the frontend in a second terminal:

```powershell
cd client
npm run dev
```

Default local endpoints:

- Backend: `http://localhost:5000`
- Frontend: Vite dev server, usually `http://localhost:5173`

## API

### `POST /analyze`

Request body:

```json
{
  "headline": "Claim headline",
  "articleText": "Full claim or article text",
  "source": "Optional source"
}
```

Typical response:

```json
{
  "verdict": "FAKE",
  "credibilityScore": 12,
  "reason": "Explanation from Gemini."
}
```

## Notes

- The backend logs incoming `/analyze` requests and full Gemini responses/errors to the console.
- `cors()` is enabled on the backend for local frontend development.
- The frontend displays the returned verdict on a semicircular credibility meter and a five-band credibility scale.
