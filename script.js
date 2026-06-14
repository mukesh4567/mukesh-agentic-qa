const header = document.querySelector("[data-header]");
const navLinks = Array.from(document.querySelectorAll(".nav a"));
const sections = navLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);
const revealTargets = document.querySelectorAll(
  ".section, .metrics div, .feature, .perf-card, .chart-card, .pipeline-card, .timeline-item, .mini-item, .highlight-list p, .credential-grid > div"
);

function updateHeader() {
  header.classList.toggle("is-scrolled", window.scrollY > 40);
}

function updateActiveLink() {
  const current = sections.findLast((section) => section.offsetTop - 120 <= window.scrollY);
  navLinks.forEach((link) => {
    link.classList.toggle("is-active", current && link.getAttribute("href") === `#${current.id}`);
  });
}

document.querySelector("[data-copy-email]")?.addEventListener("click", async (event) => {
  const button = event.currentTarget;
  const email = button.dataset.copyEmail;
  try {
    await navigator.clipboard.writeText(email);
    button.textContent = "Email Copied";
    window.setTimeout(() => {
      button.textContent = "Copy Email";
    }, 1800);
  } catch {
    window.location.href = `mailto:${email}`;
  }
});

if ("IntersectionObserver" in window) {
  revealTargets.forEach((target) => target.classList.add("reveal"));

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.14 });

  revealTargets.forEach((target) => revealObserver.observe(target));
} else {
  revealTargets.forEach((target) => target.classList.add("is-visible"));
}

window.addEventListener("scroll", () => {
  updateHeader();
  updateActiveLink();
}, { passive: true });

updateHeader();
updateActiveLink();
