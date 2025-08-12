// UI behaviors: theme toggle, mobile menu, footer year
(function () {
  // Theme
  const themeBtn = document.getElementById("themeToggle");
  const sun = document.getElementById("sun");
  const moon = document.getElementById("moon");

  function setTheme(mode) {
    if (mode === "dark") {
      document.documentElement.classList.add("dark");
      sun?.classList.remove("hidden");
      moon?.classList.add("hidden");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      sun?.classList.add("hidden");
      moon?.classList.remove("hidden");
      localStorage.setItem("theme", "light");
    }
  }

  const pref = localStorage.getItem("theme") ||
    (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  setTheme(pref);
  themeBtn?.addEventListener("click", () =>
    setTheme(document.documentElement.classList.contains("dark") ? "light" : "dark")
  );

  // Mobile menu
  const menuBtn = document.getElementById("menuBtn");
  const mobileMenu = document.getElementById("mobileMenu");
  menuBtn?.addEventListener("click", () => {
    const hidden = mobileMenu.classList.toggle("hidden");
    menuBtn.setAttribute("aria-expanded", String(!hidden));
  });

  // Footer year
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
