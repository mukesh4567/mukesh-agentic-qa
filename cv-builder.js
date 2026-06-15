import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  GoogleAuthProvider,
  getAuth,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  addDoc,
  collection,
  doc,
  getFirestore,
  getDoc,
  increment,
  onSnapshot,
  query,
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

const ADMIN_EMAIL = "mukeshmangal2007@gmail.com";
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

const elements = {
  authUser: document.querySelector("[data-auth-user]"),
  login: document.querySelector("[data-google-login]"),
  logout: document.querySelector("[data-google-logout]"),
  upload: document.querySelector("[data-resume-upload]"),
  uploadFile: document.querySelector("[data-upload-file]"),
  resumeText: document.querySelector("[data-resume-text]"),
  aiPrompt: document.querySelector("[data-ai-prompt]"),
  aiEnhance: document.querySelector("[data-ai-enhance-cv]"),
  generate: document.querySelector("[data-generate-cv]"),
  downloadPdf: document.querySelector("[data-download-cv]"),
  downloadHtml: document.querySelector("[data-download-html]"),
  status: document.querySelector("[data-cv-status]"),
  authMessage: document.querySelector("[data-auth-message]"),
  preview: document.querySelector("[data-cv-preview]"),
  templateLabel: document.querySelector("[data-cv-template-label]"),
  wordCount: document.querySelector("[data-cv-word-count]"),
  templateOptions: document.querySelectorAll("[data-template]"),
  adminDashboard: document.querySelector("[data-admin-dashboard]"),
  totalUsers: document.querySelector("[data-total-users]"),
  totalGenerations: document.querySelector("[data-total-generations]"),
  totalDownloads: document.querySelector("[data-total-downloads]"),
  lastActivity: document.querySelector("[data-last-activity]")
};

const state = {
  currentUser: null,
  selectedTemplate: "executive",
  uploadedFileType: "",
  generatedHtml: ""
};

let signInFeedbackTimer;

function setStatus(message) {
  if (elements.status) elements.status.textContent = message;
  if (elements.authMessage) elements.authMessage.textContent = message;
}

function setLoginBusy(isBusy) {
  if (!elements.login) return;
  elements.login.disabled = isBusy;
  elements.login.textContent = isBusy ? "Opening Google..." : "Sign In With Google";
}

function setSignedOutUi() {
  state.currentUser = null;
  elements.authUser.innerHTML = "<span>Sign in required</span><strong>Google or Gmail account</strong>";
  setLoginBusy(false);
  elements.login.classList.remove("hidden");
  elements.logout.classList.add("hidden");
  setBuilderEnabled(false);
  elements.uploadFile.textContent = "Login to start";
  setStatus("Sign in to use the free CV builder.");
  elements.adminDashboard.classList.add("hidden");
}

function setSignedInUi(user) {
  state.currentUser = user;
  elements.authUser.innerHTML = `<span>${escapeHtml(user.email || "Signed in")}</span><strong>${escapeHtml(user.displayName || "CV Builder user")}</strong>`;
  elements.login.classList.add("hidden");
  elements.logout.classList.remove("hidden");
  setBuilderEnabled(true);
  elements.uploadFile.textContent = "Choose a resume file";
  setStatus("Upload your existing resume to generate a clean CV template.");
  if (user.email === ADMIN_EMAIL) {
    elements.adminDashboard.classList.remove("hidden");
    subscribeToAdminUsage();
  }
}

function setBuilderEnabled(enabled) {
  [elements.upload, elements.resumeText, elements.aiPrompt, elements.aiEnhance, elements.generate].forEach((element) => {
    if (element) element.disabled = !enabled;
  });
}

elements.login?.addEventListener("click", async () => {
  try {
    window.clearTimeout(signInFeedbackTimer);
    setLoginBusy(true);
    setStatus("Opening Google sign in...");
    signInFeedbackTimer = window.setTimeout(() => {
      if (!state.currentUser && !elements.login.classList.contains("hidden")) {
        setLoginBusy(false);
        setStatus("Google sign-in did not complete. Check that popups are allowed and localhost is an authorized Firebase domain.");
      }
    }, 7000);
    const result = await signInWithPopup(auth, provider);
    if (result?.user) {
      setSignedInUi(result.user);
      recordLogin(result.user).catch((error) => {
        console.warn("Login history was not saved.", error);
      });
      setStatus("Google sign in completed. You can upload a resume now.");
    }
  } catch (error) {
    window.clearTimeout(signInFeedbackTimer);
    setLoginBusy(false);
    if (error?.code === "auth/popup-blocked") {
      setStatus("Popup was blocked. Redirecting to Google sign in...");
      await signInWithRedirect(auth, provider);
      return;
    }
    setStatus(readableFirebaseError(error));
  }
});

elements.logout?.addEventListener("click", async () => {
  await signOut(auth);
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    setSignedOutUi();
    return;
  }
  setSignedInUi(user);
  try {
    await ensureUserDocument(user);
  } catch (error) {
    console.warn("User profile was not saved.", error);
  }
});

getRedirectResult(auth)
  .then(async (result) => {
    if (result?.user) {
      setSignedInUi(result.user);
      recordLogin(result.user).catch((error) => {
        console.warn("Login history was not saved.", error);
      });
      setStatus("Google sign in completed. You can upload a resume now.");
    }
  })
  .catch((error) => {
    setStatus(readableFirebaseError(error));
  });

elements.templateOptions.forEach((button) => {
  button.addEventListener("click", () => {
    state.selectedTemplate = button.dataset.template;
    elements.templateOptions.forEach((option) => option.classList.toggle("is-selected", option === button));
    elements.templateLabel.textContent = `${titleCase(state.selectedTemplate)} Template`;
    if (state.generatedHtml) renderCv(state.generatedHtml);
  });
});

elements.upload?.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  state.uploadedFileType = file.type || file.name.split(".").pop()?.toLowerCase() || "unknown";
  elements.uploadFile.textContent = file.name;
  setStatus("Reading resume content in your browser...");

  try {
    const text = await parseResumeFile(file);
    elements.resumeText.value = text.trim();
    updateWordCount();
    setStatus("Resume content extracted. Review it, then generate your CV.");
  } catch (error) {
    setStatus(error.message || "Could not read that file. Try PDF, DOCX, HTML, text, or image.");
  }
});

elements.resumeText?.addEventListener("input", updateWordCount);

elements.aiEnhance?.addEventListener("click", async () => {
  const text = elements.resumeText.value.trim();
  const prompt = elements.aiPrompt?.value.trim() || "";
  if (!state.currentUser) {
    setStatus("Please sign in first.");
    return;
  }
  if (!text) {
    setStatus("Upload a resume or paste content before using AI enhance.");
    return;
  }

  elements.aiEnhance.disabled = true;
  elements.aiEnhance.textContent = "Enhancing...";
  setStatus("Free LLM is improving the CV content...");

  try {
    const enhancedText = await enhanceResumeWithAgent(text, prompt);
    elements.resumeText.value = enhancedText;
    updateWordCount();
    state.generatedHtml = buildCvHtml(enhancedText);
    renderCv(state.generatedHtml);
    elements.downloadPdf.disabled = false;
    elements.downloadHtml.disabled = false;
    setStatus("AI enhanced CV is ready. Review it, then download or edit.");
    await recordUsage("ai_enhance", { template: state.selectedTemplate, fileType: state.uploadedFileType });
  } catch (error) {
    setStatus(error.message || "AI enhance could not complete. You can still generate the CV normally.");
  } finally {
    elements.aiEnhance.disabled = false;
    elements.aiEnhance.textContent = "AI Enhance CV";
  }
});

elements.generate?.addEventListener("click", async () => {
  const text = elements.resumeText.value.trim();
  if (!state.currentUser) {
    setStatus("Please sign in first.");
    return;
  }
  if (!text) {
    setStatus("Upload a resume or paste content before generating.");
    return;
  }

  state.generatedHtml = buildCvHtml(text);
  renderCv(state.generatedHtml);
  elements.downloadPdf.disabled = false;
  elements.downloadHtml.disabled = false;
  setStatus("CV generated. You can download it as PDF or HTML.");
  await recordUsage("generate", { template: state.selectedTemplate, fileType: state.uploadedFileType });
});

elements.downloadHtml?.addEventListener("click", async () => {
  if (!state.generatedHtml) return;
  const blob = new Blob([buildStandaloneHtml()], { type: "text/html" });
  downloadBlob(blob, `generated-cv-${state.selectedTemplate}.html`);
  await recordUsage("download_html", { template: state.selectedTemplate, fileType: state.uploadedFileType });
});

elements.downloadPdf?.addEventListener("click", async () => {
  if (!state.generatedHtml) return;
  setStatus("Preparing PDF download...");
  try {
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js");
    await window.html2pdf()
      .set({
        margin: 0.35,
        filename: `generated-cv-${state.selectedTemplate}.pdf`,
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "in", format: "a4", orientation: "portrait" }
      })
      .from(elements.preview)
      .save();
    setStatus("PDF downloaded.");
  } catch {
    window.print();
    setStatus("PDF library could not load, so browser print was opened instead.");
  }
  await recordUsage("download_pdf", { template: state.selectedTemplate, fileType: state.uploadedFileType });
});

async function parseResumeFile(file) {
  const name = file.name.toLowerCase();
  if (file.type === "application/pdf" || name.endsWith(".pdf")) return parsePdf(file);
  if (name.endsWith(".docx")) return parseDocx(file);
  if (file.type.startsWith("image/")) return parseImage(file);
  const text = await file.text();
  return name.endsWith(".html") || name.endsWith(".htm") ? stripHtml(text) : text;
}

async function parsePdf(file) {
  const pdfjs = await import("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.mjs";
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => item.str).join(" "));
  }
  return pages.join("\n\n");
}

async function parseDocx(file) {
  await loadScript("https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js");
  const result = await window.mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return result.value;
}

async function parseImage(file) {
  await loadScript("https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js");
  setStatus("Running OCR on the image. This can take a moment...");
  const result = await window.Tesseract.recognize(file, "eng");
  return result.data.text;
}

function buildCvHtml(text) {
  const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const name = findName(lines);
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
  const phone = text.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0] || "";
  const skills = collectLines(lines, ["skill", "tool", "technology"], 10);
  const experience = collectLines(lines, ["experience", "project", "work", "engineer", "lead", "consultant"], 12);
  const education = collectLines(lines, ["education", "degree", "university", "institute", "bca", "mca"], 6);
  const summary = lines.filter((line) => line !== name && line !== email && line !== phone).slice(0, 4).join(" ");

  return `
    <header>
      <span>${escapeHtml(titleCase(state.selectedTemplate))} CV</span>
      <h3>${escapeHtml(name)}</h3>
      <p>${escapeHtml([email, phone].filter(Boolean).join(" | ") || "Contact details available on request")}</p>
    </header>
    <section>
      <h4>Professional Summary</h4>
      <p>${escapeHtml(summary || "Quality-focused professional with experience across automation, delivery, and engineering collaboration.")}</p>
    </section>
    ${renderListSection("Core Skills", skills)}
    ${renderListSection("Experience Highlights", experience)}
    ${renderListSection("Education & Certifications", education)}
  `;
}

async function enhanceResumeWithAgent(text, prompt = "") {
  const endpoint = localStorage.getItem("cvAiEndpoint");
  if (endpoint) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: "rewrite_cv",
          instructions: "Create concise, truthful CV content. Do not invent employers, dates, tools, metrics, degrees, or certifications. Keep it ATS friendly.",
          userPrompt: prompt,
          resumeText: text
        })
      });
      if (!response.ok) throw new Error("AI endpoint failed.");
      const data = await response.json();
      if (data?.enhancedText) return data.enhancedText.trim();
      if (data?.text) return data.text.trim();
    } catch (error) {
      console.warn("Configured AI endpoint failed. Falling back to browser enhancer.", error);
    }
  }
  const llmText = await enhanceWithFreeLlm(text, prompt);
  if (llmText) return llmText;
  return buildLocalAgentEnhancement(text, prompt);
}

async function enhanceWithFreeLlm(text, prompt = "") {
  const agentPrompt = buildCvAgentPrompt(text, prompt);
  try {
    await loadScript("https://js.puter.com/v2/");
    if (window.puter?.ai?.chat) {
      const result = await window.puter.ai.chat(agentPrompt);
      const content = normalizeLlmResponse(result);
      if (content) return content;
    }
  } catch (error) {
    console.warn("Puter free LLM was not available. Trying fallback LLM.", error);
  }

  try {
    const response = await fetch("https://text.pollinations.ai/openai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai",
        messages: [
          { role: "system", content: "You rewrite CV content truthfully and concisely. Never invent facts." },
          { role: "user", content: agentPrompt }
        ],
        temperature: 0.35
      })
    });
    if (!response.ok) throw new Error("Fallback LLM failed.");
    const data = await response.json();
    const content = normalizeLlmResponse(data);
    if (content) return content;
  } catch (error) {
    console.warn("Fallback free LLM was not available. Using browser enhancer.", error);
  }

  return "";
}

function buildCvAgentPrompt(text, prompt = "") {
  return [
    "Rewrite this resume into clean CV content.",
    "Keep it ATS friendly, simple, and human sounding.",
    "Do not invent employers, dates, tools, metrics, degrees, certifications, or achievements.",
    "Preserve real names, companies, tools, dates, email, and phone if present.",
    "Return plain text only with these sections: Professional Summary, Core Skills, Experience Highlights, Education & Certifications.",
    prompt ? `User requested changes: ${prompt}` : "User requested changes: improve clarity and structure.",
    "",
    "Resume text:",
    text.slice(0, 12000)
  ].join("\n");
}

function normalizeLlmResponse(result) {
  if (!result) return "";
  if (typeof result === "string") return result.trim();
  if (typeof result.message?.content === "string") return result.message.content.trim();
  if (Array.isArray(result.choices)) {
    const content = result.choices[0]?.message?.content || result.choices[0]?.text;
    if (typeof content === "string") return content.trim();
  }
  if (typeof result.text === "string") return result.text.trim();
  if (typeof result.content === "string") return result.content.trim();
  return "";
}

function buildLocalAgentEnhancement(text, prompt = "") {
  const lines = text.split(/\n+/).map((line) => cleanResumeLine(line)).filter(Boolean);
  const promptLine = cleanResumeLine(prompt);
  const name = findName(lines);
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
  const phone = text.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0] || "";
  const skills = collectLines(lines, ["skill", "tool", "technology", "automation", "testing", "api", "playwright", "selenium", "jmeter", "k6", "jenkins", "git"], 10);
  const experience = collectLines(lines, ["experience", "project", "work", "engineer", "lead", "consultant", "automation", "quality", "testing"], 14);
  const education = collectLines(lines, ["education", "degree", "university", "institute", "certification", "bca", "mca"], 6);
  const summarySource = lines.filter((line) => line !== name && line !== email && line !== phone).slice(0, 6).join(" ");
  const summary = summarizeForCv(summarySource);

  return [
    name,
    [email, phone].filter(Boolean).join(" | "),
    "",
    "Professional Summary",
    summary,
    ...(promptLine ? ["", "Requested Changes", `- ${promptLine}`] : []),
    "",
    "Core Skills",
    ...formatAgentBullets(skills, "Skilled in"),
    "",
    "Experience Highlights",
    ...formatAgentBullets(experience, "Worked on"),
    "",
    "Education & Certifications",
    ...formatAgentBullets(education, "Completed")
  ].filter((line, index, list) => line || list[index - 1]).join("\n");
}

function summarizeForCv(text) {
  const compact = cleanResumeLine(text).slice(0, 420);
  if (!compact) return "Quality-focused professional with experience across automation, delivery, and engineering collaboration.";
  return compact.endsWith(".") ? compact : `${compact}.`;
}

function formatAgentBullets(items, prefix) {
  const cleanItems = items.map((item) => cleanResumeLine(item)).filter(Boolean).slice(0, 8);
  if (!cleanItems.length) return [`- ${prefix} relevant responsibilities and outcomes from the uploaded resume.`];
  return cleanItems.map((item) => {
    const withoutBullet = item.replace(/^[-*•\d.)\s]+/, "");
    const sentence = withoutBullet.endsWith(".") ? withoutBullet : `${withoutBullet}.`;
    return `- ${sentence}`;
  });
}

function cleanResumeLine(value = "") {
  return value.replace(/\s+/g, " ").replace(/[•]+/g, "-").trim();
}

function renderCv(html) {
  elements.preview.className = `cv-document template-${state.selectedTemplate}`;
  elements.preview.innerHTML = html;
}

function renderListSection(title, items) {
  const safeItems = (items.length ? items : ["Add details after reviewing the parsed resume content."])
    .slice(0, 8)
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
  return `<section><h4>${escapeHtml(title)}</h4><ul>${safeItems}</ul></section>`;
}

function findName(lines) {
  return lines.find((line) =>
    line.length <= 48 &&
    !line.includes("@") &&
    !/\d{4,}/.test(line) &&
    /[a-z]/i.test(line)
  ) || "Candidate Name";
}

function collectLines(lines, keywords, max) {
  const keywordPattern = new RegExp(keywords.join("|"), "i");
  return lines
    .filter((line) => line.length > 18 && line.length < 220 && keywordPattern.test(line))
    .slice(0, max);
}

async function ensureUserDocument(user) {
  const userRef = doc(db, "users", user.uid);
  const snapshot = await getDoc(userRef);
  await setDoc(userRef, {
    uid: user.uid,
    email: user.email || "",
    displayName: user.displayName || "",
    photoURL: user.photoURL || "",
    createdAt: snapshot.exists() ? snapshot.data().createdAt : serverTimestamp(),
    lastSeenAt: serverTimestamp()
  }, { merge: true });
}

async function recordLogin(user) {
  await ensureUserDocument(user);
  await Promise.all([
    setDoc(doc(db, "users", user.uid), {
      loginCount: increment(1),
      lastLoginAt: serverTimestamp(),
      lastSeenAt: serverTimestamp()
    }, { merge: true }),
    addDoc(collection(db, "users", user.uid, "events"), {
      type: "login",
      uid: user.uid,
      email: user.email || "",
      createdAt: serverTimestamp()
    })
  ]);
}

async function recordUsage(type, details = {}) {
  if (!state.currentUser) return;
  const userRef = doc(db, "users", state.currentUser.uid);
  const generationIncrement = type === "generate" ? 1 : 0;
  const downloadIncrement = type.startsWith("download") ? 1 : 0;
  await Promise.all([
    setDoc(userRef, {
      generationCount: increment(generationIncrement),
      downloadCount: increment(downloadIncrement),
      lastTemplate: details.template || state.selectedTemplate,
      lastFileType: details.fileType || "unknown",
      lastUsedAt: serverTimestamp(),
      lastSeenAt: serverTimestamp()
    }, { merge: true }),
    addDoc(collection(db, "users", state.currentUser.uid, "events"), {
      type,
      uid: state.currentUser.uid,
      email: state.currentUser.email || "",
      template: details.template || state.selectedTemplate,
      fileType: details.fileType || "unknown",
      createdAt: serverTimestamp()
    })
  ]);
}

let unsubscribeAdminUsage;
function subscribeToAdminUsage() {
  if (unsubscribeAdminUsage) return;
  unsubscribeAdminUsage = onSnapshot(query(collection(db, "users")), (snapshot) => {
    const users = snapshot.docs.map((entry) => entry.data());
    const generations = users.reduce((total, user) => total + (user.generationCount || 0), 0);
    const downloads = users.reduce((total, user) => total + (user.downloadCount || 0), 0);
    const latest = users
      .map((user) => user.lastUsedAt || user.lastLoginAt || user.lastSeenAt)
      .filter(Boolean)
      .sort((a, b) => (b.seconds || 0) - (a.seconds || 0))[0];
    elements.totalUsers.textContent = users.length;
    elements.totalGenerations.textContent = generations;
    elements.totalDownloads.textContent = downloads;
    elements.lastActivity.textContent = latest?.toDate ? latest.toDate().toLocaleString() : "--";
  });
}

function updateWordCount() {
  const count = elements.resumeText.value.trim().split(/\s+/).filter(Boolean).length;
  elements.wordCount.textContent = `${count} words`;
}

function buildStandaloneHtml() {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Generated CV</title><style>${cvPrintCss()}</style></head><body>${state.generatedHtml}</body></html>`;
}

function cvPrintCss() {
  return "body{font-family:Arial,sans-serif;max-width:820px;margin:32px auto;color:#101820}header{border-bottom:2px solid #101820;padding-bottom:18px}h3{font-size:34px;margin:8px 0}h4{margin:24px 0 8px;color:#006862;text-transform:uppercase;font-size:14px}p,li{line-height:1.55;color:#33404a}";
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      if (existing.dataset.loaded) resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function stripHtml(html) {
  const documentFragment = new DOMParser().parseFromString(html, "text/html");
  return documentFragment.body.textContent || "";
}

function escapeHtml(value = "") {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  }[char]));
}

function titleCase(value = "") {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function readableFirebaseError(error) {
  if (error?.code === "auth/configuration-not-found") {
    return "Firebase Authentication is not enabled yet. In Firebase Console, open Authentication, click Get started, then enable Google sign-in.";
  }
  if (error?.code === "auth/unauthorized-domain") {
    return "This domain is not authorized in Firebase Authentication. Add localhost and your live domain in Firebase Console.";
  }
  return error?.message || "Firebase sign in failed.";
}
