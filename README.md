# SafeSide

SafeSide is a Node.js and React-based application that provides tactical football analytics, likely including league and match data, user predictions, live match simulations, and data intelligence modules. It can be run locally or deployed to a cloud environment.

---

## Features

- **Live Football Simulation:** Real-time updates and simulation data for high-profile football matches (e.g., El Clásico, Serie A).
- **League & Club Intelligence:** Access to league standings, player stats, and localized tactical data.
- **User Predictions:** Mechanisms for users to submit and verify match predictions, powered by Supabase and integrated with live result feeds.
- **Generative AI Support:** Integration with Gemini AI (via the Google GenAI API).
- **Responsive Interface:** Modern React components, UI elements, and data visualizations (via recharts, shadcn, TailwindCSS).

---

## Prerequisites

- **Node.js** (version according to your local environment)
- **NPM** for dependency management
- **API Keys** for Gemini AI, Football-Data.org, Supabase, and optionally OpenWeather

---

## Installation

1. **Clone the repository:**

   ```sh
   git clone https://github.com/farhankabir133/SafeSide.git
   cd SafeSide
   ```

2. **Install dependencies:**

   ```sh
   npm install
   ```

3. **Configure environment variables:**

   Create a `.env.local` file (or `.env` as needed) using the provided `.env.example` as a template:

   ```
   # Required for Gemini AI API calls.
   GEMINI_API_KEY=your_gemini_api_key

   # Football-Data API
   FOOTBALL_API_KEY=your_football_data_api_key

   # Supabase
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

   # (Optional) OpenWeather
   OPENWEATHER_API_KEY=your_openweather_api_key
   ```

---

## Usage

### Local Development

Start the application in development mode:

```sh
npm run dev
```

The project uses a custom Express server (`server.ts`) and Vite for a fast development workflow.

### Linting & Building

- **Lint:** `npm run lint`
- **Build (production):** `npm run build`
- **Preview:** `npm run preview`
- **Clean build files:** `npm run clean`

---

## Environment Variables

See `.env.example` for all required and optional variables:

- `GEMINI_API_KEY`
- `FOOTBALL_API_KEY`
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- `OPENWEATHER_API_KEY`
- (`APP_URL` - for deployments)

---

## Project Structure

- `server.ts` – Node.js/Express backend server, API proxy, match simulation logic
- `src/` – Frontend React application (UI, pages, supabase integration)
- `truth_service.js` – Automated verification of user predictions using Supabase and Football-Data APIs
- `public/` – Static assets and icons

---

## Dependencies

- **Frontend:** React, React Router, TailwindCSS, shadcn, recharts, motion, lucide-react, etc.
- **Backend:** Express, node-fetch, dotenv, @google/genai, @supabase/supabase-js
- **Build Tools:** Vite, TypeScript, TSX

See `package.json` for the full list.

---

## License

_Not specified in codebase._

---

## References

- [Football-Data.org API](https://www.football-data.org/)
- [Supabase](https://supabase.com/)
- [Gemini AI (Google GenAI)](https://ai.google.dev/)
