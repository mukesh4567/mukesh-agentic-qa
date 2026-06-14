const header = document.querySelector("[data-header]");
const navLinks = Array.from(document.querySelectorAll(".nav a"));
const sections = navLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

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

window.addEventListener("scroll", () => {
  updateHeader();
  updateActiveLink();
}, { passive: true });

updateHeader();
updateActiveLink();
