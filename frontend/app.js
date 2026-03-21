// ══════════════════════════════════════════
//  Cortex — app.js
// ══════════════════════════════════════════

const API_BASE_URL = "https://cortex-production-8ae8.up.railway.app";
const PAGES = ["practice", "courses", "dictionary", "rating", "profile"];

// Вопросы загружаются из questions.json
let QUIZ_QUESTIONS = [];

// ── Загрузка вопросов из JSON ─────────────
async function loadQuestions() {
  try {
    const res = await fetch("./questions.json");
    QUIZ_QUESTIONS = await res.json();
    console.log(`[Quiz] Загружено ${QUIZ_QUESTIONS.length} вопросов`);
  } catch (e) {
    console.error("[Quiz] Ошибка загрузки questions.json:", e);
    // Fallback — минимальный набор
    QUIZ_QUESTIONS = [
      {
        id: "q1",
        level: "easy",
        question: "Что означает аббревиатура AI?",
        options: [
          "Automated Internet",
          "Artificial Intelligence",
          "Advanced Integration",
          "Automatic Input",
        ],
        answer: 1,
        explanation: "AI = Artificial Intelligence — искусственный интеллект.",
      },
      {
        id: "q2",
        level: "medium",
        question: "Что такое переобучение (overfitting)?",
        options: [
          "Модель медленно учится",
          "Хорошо на трейне, плохо на новых данных",
          "Много памяти",
          "Долго обучалась",
        ],
        answer: 1,
        explanation: "Overfitting — модель запомнила данные вместо паттернов.",
      },
      {
        id: "q3",
        level: "hard",
        question: "Что такое RLHF?",
        options: [
          "Reinforcement Learning from Human Feedback",
          "Recursive Layer Hyperparameter Framework",
          "Regularized Loss Heuristic Functions",
          "Real-time Learning High Fidelity",
        ],
        answer: 0,
        explanation:
          "RLHF — обучение с подкреплением на основе обратной связи людей.",
      },
    ];
  }
}

// ── API ──────────────────────────────────────
async function apiRequest(endpoint, options = {}) {
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    console.error(`[API] ${endpoint}:`, e.message);
    return null;
  }
}

const getUserStats = (id) => apiRequest(`/stats/${id}`);
const getLeaderboard = () => apiRequest("/leaderboard");
const submitAnswer = (data) =>
  apiRequest("/answer", { method: "POST", body: JSON.stringify(data) });
const finishGame = (data) =>
  apiRequest("/game/finish", { method: "POST", body: JSON.stringify(data) });

// ── Утилиты ──────────────────────────────────
function getRankLabel(score) {
  if (score < 50) return "🐣 Новичок";
  if (score < 200) return "🧑‍💻 Джуниор";
  if (score < 500) return "🚀 Мидл";
  if (score < 1000) return "🧠 Сеньор";
  return "🏆 AI Мастер";
}

function getLevel(score) {
  return Math.max(1, Math.floor(score / 250) + 1);
}

function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function getInitials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function setAvatar(wrapId, photoUrl, name) {
  const wrap = document.getElementById(wrapId);
  if (!wrap) return;
  if (photoUrl) {
    wrap.innerHTML = `<img src="${photoUrl}" class="w-full h-full object-cover rounded-full" onerror="this.parentNode.innerHTML='<span class=\\'avatar-initials\\'>${getInitials(name)}</span>'" />`;
  } else {
    wrap.innerHTML = `<span class="avatar-initials">${getInitials(name)}</span>`;
  }
}

// ── Скролл к последнему сообщению ───────────
function scrollToBottom() {
  setTimeout(() => {
    const opts = document.getElementById("quiz-options");
    if (opts) {
      opts.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, 150);
}

// ── Navigation ───────────────────────────────
function navigate(page) {
  const qc = document.getElementById("quiz-content");
  if (qc && !qc.classList.contains("hidden")) {
    quizClose(false);
  }

  PAGES.forEach((p) => {
    document.getElementById("page-" + p).classList.remove("active");
  });
  document.getElementById("page-" + page).classList.add("active");

  document.querySelectorAll(".nav-item").forEach((btn, i) => {
    const active = PAGES[i] === page;
    btn.classList.toggle("active", active);
    btn.classList.toggle("text-slate-500", !active);
  });

  window.scrollTo({ top: 0, behavior: "instant" });

  if (page === "rating") loadLeaderboard();
  if (page === "profile" && window.telegramUserId)
    loadProfileStats(window.telegramUserId);
}

// ── Quiz ─────────────────────────────────────
function quizOpen() {
  document.getElementById("practice-content").classList.add("hidden");
  document.getElementById("quiz-content").classList.remove("hidden");

  const hd = document.getElementById("header-default");
  const hq = document.getElementById("header-quiz");
  if (hd) {
    hd.classList.add("hidden");
    hd.classList.remove("flex");
  }
  if (hq) {
    hq.classList.remove("hidden");
    hq.classList.add("flex");
  }

  window.scrollTo({ top: 0, behavior: "instant" });
}

function quizClose(scroll = true) {
  const qc = document.getElementById("quiz-content");
  const pc = document.getElementById("practice-content");
  if (!qc || !pc) return;

  qc.classList.add("hidden");
  pc.classList.remove("hidden");

  const hd = document.getElementById("header-default");
  const hq = document.getElementById("header-quiz");
  if (hq) {
    hq.classList.add("hidden");
    hq.classList.remove("flex");
  }
  if (hd) {
    hd.classList.remove("hidden");
    hd.classList.add("flex");
  }

  if (scroll) window.scrollTo({ top: 0, behavior: "instant" });
}

// ── Dictionary toggle ────────────────────────
function dictToggle(tab) {
  ["courses", "words"].forEach((t) => {
    document
      .getElementById("dict-toggle-" + t)
      .classList.toggle("active", t === tab);
  });
}

// ── Telegram init ────────────────────────────
function initTelegram() {
  let user = null;

  try {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
      // Пробуем оба способа получить данные
      user = tg.initDataUnsafe?.user || null;
    }
  } catch (e) {
    console.warn("Telegram init error:", e);
  }

  if (user && user.id) {
    window.telegramUserId = user.id;
    const name =
      [user.first_name, user.last_name].filter(Boolean).join(" ") ||
      user.username ||
      "Пользователь";
    const photoUrl = user.photo_url || null;

    document
      .querySelectorAll(".tg-username")
      .forEach((el) => (el.textContent = name));
    setAvatar("practice-avatar-wrap", photoUrl, name);
    setAvatar("profile-avatar-wrap", photoUrl, name);

    loadUserStats(user.id);
    loadProfileStats(user.id);
  } else {
    // Данные TG недоступны — показываем заглушки
    // Это нормально при открытии в браузере (не через бота)
    console.warn("Telegram user unavailable — running in browser mode");

    document
      .querySelectorAll(".tg-username")
      .forEach((el) => (el.textContent = "Пользователь"));
    setAvatar("practice-avatar-wrap", null, "П");
    setAvatar("profile-avatar-wrap", null, "П");

    setEl("header-xp", "0 XP");
    setEl("practice-level-badge", "LVL 1");
    setEl("practice-rank", "🐣 Новичок");
    setEl("daily-label", "0");
    setEl("practice-games", "0 игр");
    setEl("practice-score", "0 XP");
    setEl("practice-accuracy", "0%");
    setEl("streak-label", "Начни игру!");

    setEl("profile-xp", "0");
    setEl("profile-games", "0");
    setEl("profile-accuracy", "0%");
    setEl("profile-xp-label", "0 / 2000 XP");
    setEl("profile-level-badge", "LVL 1");
    setEl("profile-rank-label", "🐣 Новичок");
    setEl("profile-daily-pct", "0%");
    setEl("profile-balance", "0 монет");
  }
}

// ── Загрузка статистики ───────────────────────
async function loadUserStats(userId) {
  const stats = await getUserStats(userId);
  if (!stats) return;

  const score = stats.total_score;
  const level = getLevel(score);
  const rank = getRankLabel(score);

  setEl("header-xp", score.toLocaleString() + " XP");
  setEl("practice-level-badge", "LVL " + level);
  setEl("practice-rank", rank);
  setEl("practice-games", stats.games_played + " игр");
  setEl("practice-score", score.toLocaleString() + " XP");
  setEl("practice-accuracy", stats.accuracy + "%");
  setEl("streak-label", "Серия: " + stats.games_played + " игр");

  const accBar = document.getElementById("practice-accuracy-bar");
  if (accBar) accBar.style.width = Math.min(stats.accuracy, 100) + "%";

  const done = stats.total_answers % 10;
  setEl("daily-label", done);
  const dp = document.getElementById("daily-progress");
  if (dp) dp.style.width = (done / 10) * 100 + "%";

  setEl("dict-streak", stats.games_played + " игр");
  setEl("my-rank-score", score.toLocaleString() + " XP");
}

// ── Профиль ──────────────────────────────────
async function loadProfileStats(userId) {
  const stats = await getUserStats(userId);
  if (!stats) return;

  const score = stats.total_score;
  const level = getLevel(score);
  const rank = getRankLabel(score);
  const pct = Math.min((score / 2000) * 100, 100);
  const dailyPct =
    stats.total_answers > 0
      ? Math.round((stats.correct_answers / stats.total_answers) * 100)
      : 0;

  setEl("profile-xp", score.toLocaleString());
  setEl("profile-games", stats.games_played);
  setEl("profile-accuracy", stats.accuracy + "%");
  setEl("profile-xp-label", score + " / 2000 XP");
  setEl("profile-level-badge", "LVL " + level);
  setEl("profile-rank-label", rank);
  setEl("profile-daily-pct", dailyPct + "%");
  setEl("profile-balance", (score * 4).toLocaleString() + " монет");

  const lvlBar = document.getElementById("profile-level-bar");
  if (lvlBar) lvlBar.style.width = pct + "%";
}

// ── Лидерборд ────────────────────────────────
async function loadLeaderboard() {
  const container = document.getElementById("leaderboard-list");
  if (!container) return;

  container.innerHTML = `<div class="flex items-center justify-center py-8 text-on-surface-variant text-sm font-mono">Загрузка...</div>`;

  const rows = await getLeaderboard();

  if (!rows || !rows.length) {
    container.innerHTML = `<div class="flex items-center justify-center py-8 text-on-surface-variant text-sm font-mono">Пока никого нет — сыграй первым!</div>`;
    return;
  }

  const myRow = rows.find((r) => r.user_id === window.telegramUserId);
  if (myRow) setEl("my-rank-pos", "#" + myRow.position);

  const medal = ["🥇", "🥈", "🥉"];
  container.innerHTML = rows
    .map((r, i) => {
      const rankClass =
        i === 0
          ? "rank-1"
          : i === 1
            ? "rank-2"
            : i === 2
              ? "rank-3"
              : "text-on-surface-variant";
      const isMe = r.user_id === window.telegramUserId;
      return `
      <div class="bg-surface-container-low rounded-xl p-3.5 flex items-center gap-3 ${isMe ? "border border-primary/40 bg-primary/5" : ""}">
        <span class="font-mono w-7 text-center text-sm font-bold ${rankClass}">${medal[i] || r.position}</span>
        <div class="w-8 h-8 rounded-full ${isMe ? "bg-primary/20" : "bg-surface-container"} flex items-center justify-center shrink-0 text-xs font-bold ${isMe ? "text-primary" : "text-on-surface-variant"}">
          ${isMe ? "Вы" : "?"}
        </div>
        <p class="flex-1 text-sm font-medium ${isMe ? "text-primary font-bold" : ""}">
          ${isMe ? "Вы" : "User_" + String(r.user_id).slice(-4)}
        </p>
        <span class="${rankClass} text-sm font-mono font-bold">${r.score.toLocaleString()} XP</span>
      </div>`;
    })
    .join("");
}

// ══════════════════════════════════════════
//  QUIZ
// ══════════════════════════════════════════

const QUIZ_CONFIG = {
  questionsPerRound: 5,
  points: { easy: 10, medium: 20, hard: 40 },
};

let quizState = {
  questions: [],
  currentIndex: 0,
  score: 0,
  correctCount: 0,
  locked: false,
};

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function quizStart() {
  if (!QUIZ_QUESTIONS.length) {
    addBotMessage("Вопросы ещё загружаются, попробуй через секунду...");
    return;
  }

  quizState = {
    questions: shuffleArray(QUIZ_QUESTIONS).slice(
      0,
      QUIZ_CONFIG.questionsPerRound,
    ),
    currentIndex: 0,
    score: 0,
    correctCount: 0,
    locked: false,
  };

  const messages = document.getElementById("quiz-messages");
  messages.innerHTML = "";

  const opts = document.createElement("div");
  opts.id = "quiz-options";
  opts.className = "space-y-2 mt-2";
  messages.appendChild(opts);

  setEl("quiz-score", "0 XP");
  setEl("quiz-progress", `Вопрос 1/${QUIZ_CONFIG.questionsPerRound}`);
  const bar = document.getElementById("quiz-progress-bar");
  if (bar) bar.style.width = "0%";

  addBotMessage(`Поехали! Вопрос 1 из ${QUIZ_CONFIG.questionsPerRound}:`);
  quizShowQuestion();
}

function quizShowQuestion() {
  const q = quizState.questions[quizState.currentIndex];
  const lc =
    q.level === "easy"
      ? "text-green-400 bg-green-500/20"
      : q.level === "medium"
        ? "text-yellow-400 bg-yellow-500/20"
        : "text-red-400 bg-red-500/20";

  document.getElementById("quiz-messages").insertAdjacentHTML(
    "beforeend",
    `
    <div class="flex gap-3">
      <div class="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-tertiary/20 flex items-center justify-center shrink-0 mt-1">
        <span class="material-symbols-outlined text-primary text-sm" style="font-variation-settings:'FILL' 1">psychology</span>
      </div>
      <div class="glass rounded-2xl rounded-tl-sm p-4 max-w-[90%] border border-white/5">
        <span class="px-2 py-0.5 rounded text-[9px] font-bold uppercase font-mono ${lc}">${q.level}</span>
        <p class="text-sm font-semibold leading-relaxed mt-2">${q.question}</p>
      </div>
    </div>`,
  );

  // Варианты ответов — рендерим ПОСЛЕ сообщения
  renderOptions(q);
  quizUpdateProgress();
  scrollToBottom();
}

function renderOptions(q) {
  const messages = document.getElementById("quiz-messages");
  let opts = document.getElementById("quiz-options");

  if (!opts) {
    opts = document.createElement("div");
    opts.id = "quiz-options";
    messages.appendChild(opts);
  } else {
    messages.appendChild(opts);
  }

  opts.innerHTML = "";
  opts.className = "space-y-2 mt-2";

  q.options.forEach((opt, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      "w-full py-3 px-4 bg-surface-container-highest border border-white/10 rounded-xl text-sm font-semibold text-left flex items-center gap-3 active:scale-95 transition-all";
    btn.addEventListener("click", () => quizAnswer(i));
    btn.innerHTML = `
      <span class="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center shrink-0 text-xs font-bold font-mono">${String.fromCharCode(65 + i)}</span>
      <span>${opt}</span>`;
    opts.appendChild(btn);
  });
}

async function quizAnswer(idx) {
  if (quizState.locked) return;
  quizState.locked = true;

  const q = quizState.questions[quizState.currentIndex];
  const ok = idx === q.answer;
  if (ok) {
    quizState.score += QUIZ_CONFIG.points[q.level];
    quizState.correctCount++;
  }

  // Подсвечиваем кнопки
  const btns = document.querySelectorAll("#quiz-options button");
  btns.forEach((btn, i) => {
    btn.style.pointerEvents = "none";
    if (i === idx) btn.classList.add(ok ? "bg-green-500/20" : "bg-red-500/20");
    if (!ok && i === q.answer) btn.classList.add("bg-green-500/20");
  });

  // Ответ пользователя в чат
  document.getElementById("quiz-messages").insertAdjacentHTML(
    "beforeend",
    `
    <div class="flex gap-3 flex-row-reverse">
      <div class="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-1">
        <span class="material-symbols-outlined text-primary text-sm" style="font-variation-settings:'FILL' 1">person</span>
      </div>
      <div class="bg-primary text-on-primary rounded-2xl rounded-tr-sm p-3.5 max-w-[85%]">
        <p class="text-sm">${q.options[idx]}</p>
      </div>
    </div>`,
  );

  scrollToBottom();

  // Отправляем на сервер
  if (window.telegramUserId) {
    submitAnswer({
      user_id: window.telegramUserId,
      question_id: String(q.id),
      answer: q.options[idx],
      is_correct: ok,
      difficulty: q.level,
    });
  }

  // Задержка перед объяснением
  setTimeout(() => {
    document.getElementById("quiz-messages").insertAdjacentHTML(
      "beforeend",
      `
      <div class="flex gap-3">
        <div class="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-tertiary/20 flex items-center justify-center shrink-0 mt-1">
          <span class="material-symbols-outlined text-primary text-sm" style="font-variation-settings:'FILL' 1">psychology</span>
        </div>
        <div class="glass rounded-2xl rounded-tl-sm p-4 max-w-[90%] border border-white/5">
          <div class="flex items-center gap-2 mb-2">
            <span class="material-symbols-outlined text-lg ${ok ? "text-green-400" : "text-red-400"}" style="font-variation-settings:'FILL' 1">${ok ? "check_circle" : "cancel"}</span>
            <span class="font-bold ${ok ? "text-green-400" : "text-red-400"}">${ok ? "Правильно!" : "Неверно"}</span>
            ${!ok ? `<span class="text-xs text-on-surface-variant ml-1">→ <span class="text-green-400">${q.options[q.answer]}</span></span>` : ""}
          </div>
          <p class="text-sm text-on-surface-variant leading-relaxed">${q.explanation}</p>
          ${ok ? `<p class="text-xs text-primary font-mono mt-2 font-bold">+${QUIZ_CONFIG.points[q.level]} XP</p>` : ""}
        </div>
      </div>`,
    );

    setEl("quiz-score", quizState.score + " XP");
    scrollToBottom();

    setTimeout(() => {
      quizState.currentIndex++;
      quizState.locked = false;

      if (quizState.currentIndex < quizState.questions.length) {
        addBotMessage(
          `Вопрос ${quizState.currentIndex + 1} из ${QUIZ_CONFIG.questionsPerRound}:`,
        );
        quizShowQuestion();
      } else {
        quizFinish();
      }
    }, 1600);
  }, 500);
}

function addBotMessage(text) {
  document.getElementById("quiz-messages").insertAdjacentHTML(
    "beforeend",
    `
    <div class="flex gap-3">
      <div class="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-tertiary/20 flex items-center justify-center shrink-0 mt-1">
        <span class="material-symbols-outlined text-primary text-sm" style="font-variation-settings:'FILL' 1">psychology</span>
      </div>
      <div class="glass rounded-2xl rounded-tl-sm p-3.5 max-w-[85%] border border-white/5">
        <p class="text-sm leading-relaxed">${text}</p>
      </div>
    </div>`,
  );
  scrollToBottom();
}

function quizUpdateProgress() {
  const pct = (quizState.currentIndex / QUIZ_CONFIG.questionsPerRound) * 100;
  const bar = document.getElementById("quiz-progress-bar");
  if (bar) bar.style.width = pct + "%";
  setEl(
    "quiz-progress",
    `Вопрос ${quizState.currentIndex + 1}/${QUIZ_CONFIG.questionsPerRound}`,
  );
}

async function quizFinish() {
  const bar = document.getElementById("quiz-progress-bar");
  if (bar) bar.style.width = "100%";
  setEl("quiz-progress", "Завершено!");

  const pct = Math.round(
    (quizState.correctCount / quizState.questions.length) * 100,
  );
  const verdict =
    pct === 100
      ? "🏆 Идеально!"
      : pct >= 80
        ? "🎉 Отлично!"
        : pct >= 60
          ? "👍 Неплохо!"
          : "📚 Продолжай учиться!";

  document.getElementById("quiz-messages").insertAdjacentHTML(
    "beforeend",
    `
    <div class="flex gap-3">
      <div class="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center shrink-0 mt-1">
        <span class="material-symbols-outlined text-yellow-400 text-sm" style="font-variation-settings:'FILL' 1">emoji_events</span>
      </div>
      <div class="glass rounded-2xl rounded-tl-sm p-4 max-w-[90%] border border-white/5">
        <p class="font-bold mb-1">${verdict}</p>
        <p class="text-xs text-on-surface-variant mb-3">Викторина завершена</p>
        <div class="grid grid-cols-2 gap-2 mb-3">
          <div class="bg-surface-container-highest rounded-lg p-3 text-center">
            <p class="text-[9px] text-on-surface-variant uppercase font-mono">Правильно</p>
            <p class="text-xl font-bold text-primary">${quizState.correctCount}/${quizState.questions.length}</p>
          </div>
          <div class="bg-surface-container-highest rounded-lg p-3 text-center">
            <p class="text-[9px] text-on-surface-variant uppercase font-mono">Точность</p>
            <p class="text-xl font-bold text-tertiary">${pct}%</p>
          </div>
        </div>
        <div class="bg-primary/10 rounded-lg p-3 text-center border border-primary/20">
          <p class="text-[9px] text-on-surface-variant uppercase font-mono">Заработано XP</p>
          <p class="text-2xl font-bold text-primary">${quizState.score} XP</p>
        </div>
      </div>
    </div>`,
  );

  const messages = document.getElementById("quiz-messages");
  const opts = document.getElementById("quiz-options");
  opts.innerHTML = "";
  opts.className = "mt-2";
  messages.appendChild(opts);

  const restartBtn = document.createElement("button");
  restartBtn.type = "button";
  restartBtn.className =
    "w-full py-3.5 px-4 bg-gradient-to-r from-primary to-primary-dim text-on-primary rounded-xl text-sm font-bold flex items-center justify-center gap-2 active:scale-95 transition-all";
  restartBtn.addEventListener("click", quizStart);
  restartBtn.innerHTML = `<span class="material-symbols-outlined text-lg">refresh</span>Пройти ещё раз`;
  opts.appendChild(restartBtn);

  scrollToBottom();

  if (window.telegramUserId) {
    await finishGame({
      user_id: window.telegramUserId,
      score: quizState.score,
      correct_count: quizState.correctCount,
      total_count: quizState.questions.length,
    });
    loadUserStats(window.telegramUserId);
  }
}

function quizRestart() {
  quizStart();
}

// ── Init ─────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  // Загружаем вопросы параллельно с инициализацией TG
  await loadQuestions();
  // Задержка для корректной инициализации TG WebApp на мобильных
  setTimeout(initTelegram, 150);
});
