import { getApps, initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  doc,
  getDoc,
  getFirestore,
  increment,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBpfl3AmTr3ixFE12xo82XrIt3e3dM2ePU",
  authDomain: "mukesh-agentic-qa.firebaseapp.com",
  projectId: "mukesh-agentic-qa",
  storageBucket: "mukesh-agentic-qa.firebasestorage.app",
  messagingSenderId: "778323592755",
  appId: "1:778323592755:web:4d164ab61ede968bf1c546",
  measurementId: "G-9BT572RG7T"
};

const BASE_VIEW_COUNT = 1000;
const VIEW_INCREMENT_MIN = 1;
const VIEW_INCREMENT_MAX = 3;
const counterElement = document.querySelector("[data-visitor-count]");

if (counterElement) {
  showAndIncrementLocalCount();
  updateVisitorCounter().catch((error) => {
    console.warn("Visitor counter unavailable. Using local fallback count.", {
      code: error?.code,
      message: error?.message,
      error
    });
  });
}

async function updateVisitorCounter() {
  const app = getApps()[0] || initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const statsRef = doc(db, "siteStats", "portfolio");
  const countedKey = "portfolioVisitCounted";
  const shouldIncrement = sessionStorage.getItem(countedKey) !== "true";

  await withTimeout((async () => {
    if (shouldIncrement) {
      await setDoc(statsRef, {
        totalViews: increment(1),
        lastViewedAt: serverTimestamp()
      }, { merge: true });
      sessionStorage.setItem(countedKey, "true");
    }

    const snapshot = await getDoc(statsRef);
    const totalViews = snapshot.exists() ? snapshot.data().totalViews || 0 : 0;
    localStorage.setItem("portfolioViewCount", String(totalViews));
    const localViews = Number(localStorage.getItem("portfolioLocalViewCount") || 0);
    counterElement.textContent = `${formatCount(Math.max(totalViews, localViews))}+`;
  })(), 6500);
}

function showAndIncrementLocalCount() {
  const localCountKey = "portfolioLocalViewCount";
  const remoteCount = Number(localStorage.getItem("portfolioViewCount") || 0);
  const current = Math.max(Number(localStorage.getItem(localCountKey) || 0), remoteCount);
  const next = current + randomInt(VIEW_INCREMENT_MIN, VIEW_INCREMENT_MAX);
  localStorage.setItem(localCountKey, String(next));
  counterElement.textContent = `${formatCount(next)}+`;
}

function formatCount(value) {
  return `Portfolio views: ${(BASE_VIEW_COUNT + Number(value || 0)).toLocaleString("en-IN")}`;
}

function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error("Visitor counter timed out.")), timeoutMs);
    })
  ]);
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
