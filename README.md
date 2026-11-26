# NutriVision AI

صوّر وجبتك. افهم غذاءك.
Snap your meal. Understand your food.

NutriVision AI is a free nutrition tracker: photograph a meal and AI identifies the ingredients and estimates portions, with nutrition data from the official USDA FoodData Central database. Arabic (default), French and English, dark and light themes.

## Features
- Photo meal scanning (Google Gemini vision, key kept server-side)
- Nutrition numbers from USDA FoodData Central only, never invented
- Manual food search with 104 built-in USDA Foundation Foods (works offline)
- Calorie and macro tracking, water tracker, weight and 7-day progress charts
- AI nutrition assistant chat
- No accounts, no subscriptions: tracking data stays on the device
- PWA (Android + iPhone via Add to Home Screen) and Android APK via Capacitor

## Privacy
- Tracking data (profile, diary, weights) is stored locally on the device only.
- AI features are opt-in: photos and chat messages are sent to Google Gemini only after the user agrees, and only those are ever sent.

## Tech
- Static front end (vanilla JS, no build step) in the repo root
- Serverless API routes in `api/` (Vercel functions): `analyze`, `nutrition`, `chat`
- Environment variables (server-side only): `GEMINI_API_KEY`, `USDA_API_KEY`

## Local dev
Serve the repo root with any static server; API routes need Vercel (`vercel dev`) and the two env vars.
