// ══════════════════════════════════════════
//  Cortex — app.js
// ══════════════════════════════════════════

const PAGES = ["practice", "courses", "dictionary", "rating", "profile"];

// ── Navigation ──────────────────────────────
function navigate(page) {
  PAGES.forEach((p) => {
    document.getElementById("page-" + p).classList.remove("active");
  });

  document.getElementById("page-" + page).classList.add("active");

  document.querySelectorAll(".nav-item").forEach((btn, i) => {
    const isActive = PAGES[i] === page;
    btn.classList.toggle("active", isActive);
    btn.classList.toggle("text-slate-500", !isActive);
  });

  window.scrollTo({ top: 0, behavior: "instant" });
}

// ── Dictionary toggle ────────────────────────
function dictToggle(tab) {
  ["courses", "words"].forEach((t) => {
    document
      .getElementById("dict-toggle-" + t)
      .classList.toggle("active", t === tab);
  });
}

// ── Telegram WebApp init ─────────────────────
function initTelegram() {
  if (!window.Telegram?.WebApp) return;

  const tg = window.Telegram.WebApp;
  tg.ready();
  tg.expand();

  const user = tg.initDataUnsafe?.user;
  if (!user) return;

  // Сохраняем user_id для API запросов
  window.telegramUserId = user.id;

  // Подставляем имя пользователя из Telegram
  document.querySelectorAll(".tg-username").forEach((el) => {
    el.textContent =
      user.first_name + (user.last_name ? " " + user.last_name : "");
  });

  // Подставляем аватар если есть
  if (user.photo_url) {
    document.querySelectorAll(".tg-avatar").forEach((el) => {
      el.src = user.photo_url;
    });
  }
}

// ── Init ─────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  initTelegram();
});
