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
Google sign-in uses redirect auth instead of popup auth so it works reliably on localhost, mobile browsers, and embedded browser contexts.

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
