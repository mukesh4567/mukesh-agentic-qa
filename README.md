# Mukesh Kumar Mangal Resume Portfolio

Static portfolio site built from the resume HTML.

## Files

- `index.html` - one-page portfolio
- `styles.css` - responsive visual design
- `script.js` - active navigation and copy-email interaction
- `hero-quality-engineering.png` - generated hero artwork

## Deploy With GitHub Pages

Recommended repository name for a personal site:

```bash
git init
git add .
git commit -m "Create resume portfolio"
git branch -M main
git remote add origin https://github.com/mukesh4567/mukesh4567.github.io.git
git push -u origin main
```

Then open the repository on GitHub, go to `Settings > Pages`, and publish from the `main` branch root if it is not already enabled.

Your website URL will be:

```text
https://mukesh4567.github.io/
```

## Firebase CV Builder Setup

The CV Builder uses Firebase Authentication and Firestore.
Google sign-in uses popup auth first, with redirect auth as a fallback when popups are blocked.

In Firebase Console:

- Enable Authentication > Google sign-in.
- Add authorized domains:
  - `localhost`
  - `mukesh4567.github.io`
  - `portfolio.mukeshmangal.com`
- Create Firestore Database.

Deploy prototype Firestore rules:

```bash
npx -y firebase-tools@latest login
npx -y firebase-tools@latest deploy --only firestore:rules
```

Optional Firebase Hosting deploy:

```bash
npx -y firebase-tools@latest deploy --only hosting
```

The app stores usage metadata only. Uploaded resume files and parsed resume text stay in the browser.

## AI CV Enhancement

The CV Builder includes an AI Agent CV Enhancer with a prompt box for user instructions.
It tries free browser-accessible LLM providers first, then falls back to an in-browser enhancement flow so the feature still works without exposing any API key.

To connect your own GPT-compatible free/local service later, expose your LLM through a small backend endpoint and set this in the browser console:

```js
localStorage.setItem("cvAiEndpoint", "https://your-backend.example.com/api/enhance-cv");
```

The endpoint should accept `resumeText` and `userPrompt`, then return JSON with `enhancedText`. Do not place OpenAI, Gemini, or other LLM API keys directly inside `cv-builder.js`.
