const API_BASE_URL = "https://cortex-production-8ae8.up.railway.app";
const PAGES = ["practice", "courses", "dictionary", "rating", "profile"];

// Данные из JSON
let QUIZ_QUESTIONS = [];
let CONFIG = {
  ranks: [
    { label: "🐣 Новичок",   min_xp: 0    },
    { label: "🧑‍💻 Джуниор", min_xp: 50   },
    { label: "🚀 Мидл",      min_xp: 200  },
    { label: "🧠 Сеньор",    min_xp: 500  },
    { label: "🏆 AI Мастер", min_xp: 1000 }
  ],
  levels:    { xp_per_level: 250 },
  coins:     { xp_to_coin_ratio: 10 },
  quiz:      { questions_per_round: 5, points: { easy: 10, medium: 20, hard: 40 } },
  daily_goal:{ target_answers: 10 }
};

// ── Загрузка JSON ─────────────────────────
async function loadData() {
  console.log("[Data] Начинаю загрузку данных с бэкенда...");
  try {
    const [qRes, cRes] = await Promise.all([
      fetch(`${API_BASE_URL}/api/questions`),
      fetch(`${API_BASE_URL}/api/config`),
      fetch(`${API_BASE_URL}/api/cards`)
    ]);

    if (!qRes.ok || !cRes.ok) {
        throw new Error(`Ошибка сети: Q:${qRes.status} C:${cRes.status}`);
    }

    QUIZ_QUESTIONS = await qRes.json();
    CONFIG = await cRes.json();
    CARDS_DATA = await cardRes.json();

    console.log(`[Data] Успешно загружено ${QUIZ_QUESTIONS.length} вопросов с сервера`);
  } catch (e) {
    console.warn("[Data] Ошибка загрузки с бэкенда, используем встроенный конфиг:", e.message);
  }

  await loadCards();
}

async function loadCards() {
  if (Object.keys(CARDS_DATA).length > 0) {
      dictRenderDecks();
      return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/cards`);
    CARDS_DATA = await res.json();
    dictRenderDecks();
  } catch (e) {
    console.error("Ошибка загрузки карт:", e);
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

const getUserStats   = (id)   => apiRequest(`/stats/${id}`);
const getLeaderboard = ()     => apiRequest("/leaderboard");
const submitAnswer   = (data) => apiRequest("/answer",      { method: "POST", body: JSON.stringify(data) });
const finishGame     = (data) => apiRequest("/game/finish", { method: "POST", body: JSON.stringify(data) });

// ── Утилиты ──────────────────────────────────
function getRankLabel(score) {
  const ranks = [...CONFIG.ranks].reverse();
  const rank = ranks.find(r => score >= r.min_xp);
  return rank ? rank.label : "🐣 Новичок";
}

function getLevel(score) {
  return Math.max(1, Math.floor(score / CONFIG.levels.xp_per_level) + 1);
}

function getCoins(score) {
  return Math.floor(score / CONFIG.coins.xp_to_coin_ratio);
}

function formatDays(n) {
  const mod10  = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return n + " дней";
  if (mod10 === 1)                   return n + " день";
  if (mod10 >= 2 && mod10 <= 4)     return n + " дня";
  return n + " дней";
}

function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function getInitials(name) {
  if (!name) return "?";
  return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
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

// ── Скролл ───────────────────────────────────
function scrollToBottom() {
  setTimeout(() => {
    const opts = document.getElementById("quiz-options");
    if (opts) opts.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, 150);
}

// ── Navigation ───────────────────────────────
function navigate(page) {
  const qc = document.getElementById("quiz-content");
  if (qc && !qc.classList.contains("hidden")) quizClose(false);

  PAGES.forEach(p => document.getElementById("page-" + p).classList.remove("active"));
  document.getElementById("page-" + page).classList.add("active");

  document.querySelectorAll(".nav-item").forEach((btn, i) => {
    const active = PAGES[i] === page;
    btn.classList.toggle("active", active);
    btn.classList.toggle("text-slate-500", !active);
  });

  window.scrollTo({ top: 0, behavior: "instant" });

  if (page === "rating")     loadLeaderboard();

  if (page === "profile" && window.telegramUserId) loadProfileStats(window.telegramUserId);
  if (page === "dictionary") dictRender();
}

// ── Quiz open/close ───────────────────────────
function quizOpen() {
  document.getElementById("practice-content").classList.add("hidden");
  document.getElementById("quiz-content").classList.remove("hidden");
  const hd = document.getElementById("header-default");
  const hq = document.getElementById("header-quiz");
  if (hd) { hd.classList.add("hidden"); hd.classList.remove("flex"); }
  if (hq) { hq.classList.remove("hidden"); hq.classList.add("flex"); }
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
  if (hq) { hq.classList.add("hidden"); hq.classList.remove("flex"); }
  if (hd) { hd.classList.remove("hidden"); hd.classList.add("flex"); }
  if (scroll) window.scrollTo({ top: 0, behavior: "instant" });
}

// ── Dictionary toggle ────────────────────────
function dictToggle(tab) {
  ["courses", "words"].forEach(t => {
    document.getElementById("dict-toggle-" + t).classList.toggle("active", t === tab);
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
      user = tg.initDataUnsafe?.user || null;
    }
  } catch (e) {
    console.warn("Telegram init error:", e);
  }

  if (user && user.id) {
    window.telegramUserId = user.id;
    const name = [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username || "Пользователь";
    const photoUrl = user.photo_url || null;

    apiRequest("/register", { method: "POST", body: JSON.stringify({ user_id: user.id, username: name }) });

    document.querySelectorAll(".tg-username").forEach(el => el.textContent = name);
    setAvatar("practice-avatar-wrap", photoUrl, name);
    setAvatar("profile-avatar-wrap",  photoUrl, name);

    loadUserStats(user.id);
    loadProfileStats(user.id);
  } else {
    console.warn("Telegram user unavailable");
    document.querySelectorAll(".tg-username").forEach(el => el.textContent = "Пользователь");
    setAvatar("practice-avatar-wrap", null, "П");
    setAvatar("profile-avatar-wrap",  null, "П");
    setEl("header-xp",            "0 XP");
    setEl("practice-level-badge", "LVL 1");
    setEl("practice-rank",        getRankLabel(0));
    setEl("daily-label",          "0");
    setEl("practice-games",       "0 игр");
    setEl("practice-score",       "0 XP");
    setEl("practice-accuracy",    "0%");
    setEl("streak-label",         "Начни игру!");
    setEl("profile-xp",           "0");
    setEl("profile-games",        "0");
    setEl("profile-accuracy",     "0%");
    setEl("profile-xp-label",     "0 / 2000 XP");
    setEl("profile-level-badge",  "LVL 1");
    setEl("profile-rank-label",   getRankLabel(0));
    setEl("profile-daily-pct",    "0%");
    setEl("profile-balance",      "0 монет");
  }
}

// ── Загрузка статистики ───────────────────────
async function loadUserStats(userId) {
  const stats = await getUserStats(userId);
  if (!stats) return;

  const score = stats.total_score;
  const level = getLevel(score);
  const rank  = getRankLabel(score);
  const target = CONFIG.daily_goal.target_answers;
  window._currentScore  = score;
  window._currentStreak = stats.streak_days || 0;

  setEl("header-xp",            score.toLocaleString() + " XP");
  setEl("practice-level-badge", "LVL " + level);
  setEl("practice-rank",        rank);
  setEl("practice-games",       stats.games_played + " игр");
  setEl("practice-score",       score.toLocaleString() + " XP");
  setEl("practice-accuracy",    stats.accuracy + "%");
  setEl("streak-label",         "Серия: " + formatDays(stats.streak_days || 0));
  setEl("dict-streak",          formatDays(stats.streak_days || 0));

  const accBar = document.getElementById("practice-accuracy-bar");
  if (accBar) accBar.style.width = Math.min(stats.accuracy, 100) + "%";

  const done = stats.total_answers % target;
  setEl("daily-label", done);
  const dp = document.getElementById("daily-progress");
  if (dp) dp.style.width = (done / target * 100) + "%";

  setEl("my-rank-score", score.toLocaleString() + " XP");
}

// ── Профиль ──────────────────────────────────
async function loadProfileStats(userId) {
  const stats = await getUserStats(userId);
  if (!stats) return;

  const score    = stats.total_score;
  const level    = getLevel(score);
  const rank     = getRankLabel(score);
  const maxXp    = CONFIG.levels.xp_per_level * level;
  const pct      = Math.min(score / 2000 * 100, 100);
  const dailyPct = stats.total_answers > 0
    ? Math.round(stats.correct_answers / stats.total_answers * 100) : 0;

  setEl("profile-xp",          score.toLocaleString());
  setEl("profile-games",       stats.games_played);
  setEl("profile-accuracy",    stats.accuracy + "%");
  setEl("profile-xp-label",    score + " / 2000 XP");
  setEl("profile-level-badge", "LVL " + level);
  setEl("profile-rank-label",  rank);
  setEl("profile-daily-pct",   dailyPct + "%");
  setEl("profile-balance",     getCoins(score).toLocaleString() + " монет");

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

  const myRow = rows.find(r => r.user_id === window.telegramUserId);
  if (myRow) setEl("my-rank-pos", "#" + myRow.position);

  const medal = ["🥇","🥈","🥉"];

  container.innerHTML = rows.map((r, i) => {
    const rankClass = i === 0 ? "rank-1" : i === 1 ? "rank-2" : i === 2 ? "rank-3" : "text-on-surface-variant";
    const isMe = r.user_id === window.telegramUserId;
    const displayName = r.username || (isMe ? "Вы" : "Игрок");
    return `
      <div class="bg-surface-container-low rounded-xl p-3.5 flex items-center gap-3 ${isMe ? "border border-primary/40 bg-primary/5" : ""}">
        <span class="font-mono w-7 text-center text-sm font-bold ${rankClass}">${medal[i] || r.position}</span>
        <div class="w-8 h-8 rounded-full ${isMe ? "bg-primary/20" : "bg-surface-container"} flex items-center justify-center shrink-0 text-[10px] font-bold font-mono ${isMe ? "text-primary" : "text-on-surface-variant"}">
          #${r.position}
        </div>
        <p class="flex-1 text-sm font-medium ${isMe ? "text-primary font-bold" : ""}">
          ${isMe ? "Вы · " + displayName : displayName}
        </p>
        <span class="${rankClass} text-sm font-mono font-bold">${r.score.toLocaleString()} XP</span>
      </div>`;
  }).join("");
}

// ══════════════════════════════════════════
//  QUIZ
// ══════════════════════════════════════════

let quizState = { questions: [], currentIndex: 0, score: 0, correctCount: 0, locked: false };

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function quizStart() {
  const perRound = CONFIG.quiz.questions_per_round;

  if (!QUIZ_QUESTIONS.length) {
    addBotMessage("Вопросы ещё загружаются, попробуй через секунду...");
    return;
  }

  quizState = {
    questions: shuffleArray(QUIZ_QUESTIONS).slice(0, perRound),
    currentIndex: 0, score: 0, correctCount: 0, locked: false,
  };

  const messages = document.getElementById("quiz-messages");
  messages.innerHTML = "";

  const opts = document.createElement("div");
  opts.id = "quiz-options";
  opts.className = "space-y-2 mt-2";
  messages.appendChild(opts);

  setEl("quiz-score",    "0 XP");
  setEl("quiz-progress", `Вопрос 1/${perRound}`);
  const bar = document.getElementById("quiz-progress-bar");
  if (bar) bar.style.width = "0%";

  addBotMessage(`Поехали! Вопрос 1 из ${perRound}:`);
  quizShowQuestion();
}

function quizShowQuestion() {
  const q = quizState.questions[quizState.currentIndex];
  const lc = q.level === "easy"
    ? "text-green-400 bg-green-500/20"
    : q.level === "medium"
      ? "text-yellow-400 bg-yellow-500/20"
      : "text-red-400 bg-red-500/20";

  document.getElementById("quiz-messages").insertAdjacentHTML("beforeend", `
    <div class="flex gap-3">
      <div class="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-tertiary/20 flex items-center justify-center shrink-0 mt-1">
        <span class="material-symbols-outlined text-primary text-sm" style="font-variation-settings:'FILL' 1">psychology</span>
      </div>
      <div class="glass rounded-2xl rounded-tl-sm p-4 max-w-[90%] border border-white/5">
        <span class="px-2 py-0.5 rounded text-[9px] font-bold uppercase font-mono ${lc}">${q.level}</span>
        <p class="text-sm font-semibold leading-relaxed mt-2">${q.question}</p>
      </div>
    </div>`);

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
    btn.className = "w-full py-3 px-4 bg-surface-container-highest border border-white/10 rounded-xl text-sm font-semibold text-left flex items-center gap-3 active:scale-95 transition-all";
    btn.addEventListener("click", () => quizAnswer(i));
    btn.innerHTML = `
      <span class="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center shrink-0 text-xs font-bold font-mono">${String.fromCharCode(65+i)}</span>
      <span>${opt}</span>`;
    opts.appendChild(btn);
  });
}

async function quizAnswer(idx) {
  if (quizState.locked) return;
  quizState.locked = true;

  const q   = quizState.questions[quizState.currentIndex];
  const ok  = idx === q.answer;
  const pts = CONFIG.quiz.points[q.level] || 10;

  if (ok) { quizState.score += pts; quizState.correctCount++; }

  document.querySelectorAll("#quiz-options button").forEach((btn, i) => {
    btn.style.pointerEvents = "none";
    if (i === idx) btn.classList.add(ok ? "bg-green-500/20" : "bg-red-500/20");
    if (!ok && i === q.answer) btn.classList.add("bg-green-500/20");
  });

  document.getElementById("quiz-messages").insertAdjacentHTML("beforeend", `
    <div class="flex gap-3 flex-row-reverse">
      <div class="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-1">
        <span class="material-symbols-outlined text-primary text-sm" style="font-variation-settings:'FILL' 1">person</span>
      </div>
      <div class="bg-primary text-on-primary rounded-2xl rounded-tr-sm p-3.5 max-w-[85%]">
        <p class="text-sm">${q.options[idx]}</p>
      </div>
    </div>`);

  scrollToBottom();

  if (window.telegramUserId) {
    submitAnswer({ user_id: window.telegramUserId, question_id: String(q.id), answer: q.options[idx], is_correct: ok, difficulty: q.level });
  }

  setTimeout(() => {
    document.getElementById("quiz-messages").insertAdjacentHTML("beforeend", `
      <div class="flex gap-3">
        <div class="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-tertiary/20 flex items-center justify-center shrink-0 mt-1">
          <span class="material-symbols-outlined text-primary text-sm" style="font-variation-settings:'FILL' 1">psychology</span>
        </div>
        <div class="glass rounded-2xl rounded-tl-sm p-4 max-w-[90%] border border-white/5">
          <div class="flex items-center gap-2 mb-2">
            <span class="material-symbols-outlined text-lg ${ok ? "text-green-400":"text-red-400"}" style="font-variation-settings:'FILL' 1">${ok ? "check_circle":"cancel"}</span>
            <span class="font-bold ${ok ? "text-green-400":"text-red-400"}">${ok ? "Правильно!":"Неверно"}</span>
            ${!ok ? `<span class="text-xs text-on-surface-variant ml-1">→ <span class="text-green-400">${q.options[q.answer]}</span></span>` : ""}
          </div>
          <p class="text-sm text-on-surface-variant leading-relaxed">${q.explanation}</p>
          ${ok ? `<p class="text-xs text-primary font-mono mt-2 font-bold">+${pts} XP</p>` : ""}
        </div>
      </div>`);

    setEl("quiz-score", quizState.score + " XP");
    scrollToBottom();

    setTimeout(() => {
      quizState.currentIndex++;
      quizState.locked = false;
      if (quizState.currentIndex < quizState.questions.length) {
        addBotMessage(`Вопрос ${quizState.currentIndex + 1} из ${CONFIG.quiz.questions_per_round}:`);
        quizShowQuestion();
      } else {
        quizFinish();
      }
    }, 1000);
  }, 500);
}

function addBotMessage(text) {
  document.getElementById("quiz-messages").insertAdjacentHTML("beforeend", `
    <div class="flex gap-3">
      <div class="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-tertiary/20 flex items-center justify-center shrink-0 mt-1">
        <span class="material-symbols-outlined text-primary text-sm" style="font-variation-settings:'FILL' 1">psychology</span>
      </div>
      <div class="glass rounded-2xl rounded-tl-sm p-3.5 max-w-[85%] border border-white/5">
        <p class="text-sm leading-relaxed">${text}</p>
      </div>
    </div>`);
  scrollToBottom();
}

function quizUpdateProgress() {
  const total = CONFIG.quiz.questions_per_round;
  const pct   = (quizState.currentIndex / total) * 100;
  const bar   = document.getElementById("quiz-progress-bar");
  if (bar) bar.style.width = pct + "%";
  setEl("quiz-progress", `Вопрос ${quizState.currentIndex + 1}/${total}`);
}

async function quizFinish() {
  const bar = document.getElementById("quiz-progress-bar");
  if (bar) bar.style.width = "100%";
  setEl("quiz-progress", "Завершено!");

  const pct     = Math.round(quizState.correctCount / quizState.questions.length * 100);
  const verdict = pct === 100 ? "🏆 Идеально!" : pct >= 80 ? "🎉 Отлично!" : pct >= 60 ? "👍 Неплохо!" : "📚 Продолжай учиться!";

  document.getElementById("quiz-messages").insertAdjacentHTML("beforeend", `
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
    </div>`);

  const messages = document.getElementById("quiz-messages");
  const opts = document.getElementById("quiz-options");
  opts.innerHTML = "";
  opts.className = "mt-2";
  messages.appendChild(opts);

  const restartBtn = document.createElement("button");
  restartBtn.type = "button";
  restartBtn.className = "w-full py-3.5 px-4 bg-gradient-to-r from-primary to-primary-dim text-on-primary rounded-xl text-sm font-bold flex items-center justify-center gap-2 active:scale-95 transition-all";
  restartBtn.addEventListener("click", quizStart);
  restartBtn.innerHTML = `<span class="material-symbols-outlined text-lg">refresh</span>Пройти ещё раз`;
  opts.appendChild(restartBtn);

  scrollToBottom();

  if (window.telegramUserId) {
    await finishGame({ user_id: window.telegramUserId, score: quizState.score, correct_count: quizState.correctCount, total_count: quizState.questions.length });
    loadUserStats(window.telegramUserId);
  }
}

function quizRestart() { quizStart(); }

// DICT
let CARDS_DATA = {};
let dictLearnedIds = {};
let dictCardQueue  = [];
let dictCardIndex  = 0;
let dictCardFlipped = false;
let dictSearchQuery = "";

async function loadData() {
  console.log("[Data] Начинаю загрузку данных с бэкенда...");
  try {
    const [qRes, cRes, cardRes] = await Promise.all([
      fetch(`${API_BASE_URL}/api/questions`),
      fetch(`${API_BASE_URL}/api/config`),
      fetch(`${API_BASE_URL}/api/cards`)
    ]);

    if (!qRes.ok || !cRes.ok || !cardRes.ok) {
        throw new Error(`Ошибка сети: Q:${qRes.status} C:${cRes.status} Cards:${cardRes.status}`);
    }

    QUIZ_QUESTIONS = await qRes.json();
    CONFIG = await cRes.json();
    CARDS_DATA = await cardRes.json();

    console.log(`[Data] Успешно загружено ${QUIZ_QUESTIONS.length} вопросов и карточки`);

    dictRenderDecks();

  } catch (e) {
    console.warn("[Data] Ошибка загрузки с бэкенда:", e.message);
  }
}

function dictRender() {
  dictRenderDecks();
}

function dictGetStats() {
  let total = 0, learned = 0;
  Object.entries(CARDS_DATA).forEach(([deckId, cards]) => {
    cards.forEach(c => {
      total++;
      if (dictLearnedIds[deckId + ":" + c.id]) learned++;
    });
  });
  return { total, learned };
}

const DECK_NAMES = {
  ml_basics:  { title: "Основы ML",      icon: "psychology", color: "primary"   },
  algorithms: { title: "Алгоритмы",      icon: "data_object", color: "tertiary" },
  llm:        { title: "LLM и AI",       icon: "smart_toy",   color: "secondary" },
};

function dictGetDeckName(id) {
  return DECK_NAMES[id]?.title || id;
}

function dictRenderDecks() {
  const { total, learned } = dictGetStats();
  const pct = total > 0 ? Math.round(learned / total * 100) : 0;

  setEl("dict-total-count",   total);
  setEl("dict-learned-count", learned);
  setEl("dict-progress-pct",  pct + "%");
  const bar = document.getElementById("dict-progress-bar");
  if (bar) bar.style.width = pct + "%";

  const container = document.getElementById("dict-decks-list");
  if (!container) return;

  const deckIds = Object.keys(CARDS_DATA);
  if (!deckIds.length) {
    container.innerHTML = `<div class="text-center py-10 text-on-surface-variant text-sm font-mono">Карточки не загружены</div>`;
    return;
  }

  const allCount = deckIds.reduce((s, id) => s + CARDS_DATA[id].length, 0);
  const allLearned = deckIds.reduce((s, id) => s + CARDS_DATA[id].filter(c => dictLearnedIds[id + ":" + c.id]).length, 0);

  let html = `
    <button onclick="dictStartCards('all')" class="w-full glass rounded-xl p-4 flex items-center gap-4 card-hover border border-primary/20 glow-blue mb-1">
      <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary-dim flex items-center justify-center shrink-0">
        <span class="material-symbols-outlined text-on-primary text-xl" style="font-variation-settings:'FILL' 1">style</span>
      </div>
      <div class="flex-1 text-left">
        <p class="font-bold">Все карточки</p>
        <p class="text-xs text-on-surface-variant font-mono mt-0.5">${allLearned}/${allCount} изучено</p>
        <div class="progress-bar mt-2"><div class="progress-fill" style="width:${allCount>0?Math.round(allLearned/allCount*100):0}%"></div></div>
      </div>
      <span class="material-symbols-outlined text-primary">play_arrow</span>
    </button>`;

  deckIds.forEach(deckId => {
    const cards   = CARDS_DATA[deckId];
    const info    = DECK_NAMES[deckId] || { title: deckId, icon: "menu_book", color: "primary" };
    const lrnd    = cards.filter(c => dictLearnedIds[deckId + ":" + c.id]).length;
    const pctD    = Math.round(lrnd / cards.length * 100);
    const colorMap = { primary: "from-primary/20 to-primary-dim/20 text-primary", tertiary: "from-tertiary/20 to-purple-500/20 text-tertiary", secondary: "from-secondary/20 to-pink-500/20 text-secondary" };
    const col = colorMap[info.color] || colorMap.primary;

    html += `
      <div class="glass rounded-xl p-4 flex items-center gap-4 card-hover border border-white/5 group" onclick="dictStartCards('${deckId}')">
        <div class="w-12 h-12 rounded-xl bg-gradient-to-br ${col.split(' ').slice(0,2).join(' ')} flex items-center justify-center shrink-0">
          <span class="material-symbols-outlined ${col.split(' ')[2]} text-xl" style="font-variation-settings:'FILL' 1">${info.icon}</span>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between mb-1">
            <p class="font-bold text-sm">${info.title}</p>
            <span class="text-[10px] font-mono text-on-surface-variant">${lrnd}/${cards.length}</span>
          </div>
          <div class="progress-bar"><div class="progress-fill" style="width:${pctD}%"></div></div>
        </div>
        <span class="material-symbols-outlined text-outline group-hover:text-primary transition-colors">chevron_right</span>
      </div>`;
  });

  container.innerHTML = html;

  if (dictSearchQuery) dictSearch(dictSearchQuery);
}

function dictSearch(query) {
  dictSearchQuery = query.trim().toLowerCase();
  if (!dictSearchQuery) { dictRenderDecks(); return; }

  const results = [];
  Object.entries(CARDS_DATA).forEach(([deckId, cards]) => {
    cards.forEach(c => {
      if (
        c.term.toLowerCase().includes(dictSearchQuery) ||
        (c.translation || "").toLowerCase().includes(dictSearchQuery) ||
        (c.definition || "").toLowerCase().includes(dictSearchQuery)
      ) {
        results.push({ ...c, deckId, deckName: dictGetDeckName(deckId) });
      }
    });
  });

  const container = document.getElementById("dict-decks-list");
  if (!container) return;

  if (!results.length) {
    container.innerHTML = `<div class="flex flex-col items-center py-10 gap-3 text-on-surface-variant"><span class="material-symbols-outlined text-4xl">search_off</span><p class="text-sm font-mono">Ничего не найдено</p></div>`;
    return;
  }

  container.innerHTML = results.map(t => {
    const key = t.deckId + ":" + t.id;
    const learned = dictLearnedIds[key];
    return `
      <div class="glass rounded-xl p-4 border border-white/5 card-hover" onclick="dictToggleLearned('${key}')">
        <div class="flex items-start justify-between gap-3">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-[9px] font-bold uppercase font-mono text-on-surface-variant px-1.5 py-0.5 rounded bg-surface-container-high">${t.deckName}</span>
              ${learned ? '<span class="text-[9px] font-bold text-green-400 px-1.5 py-0.5 rounded bg-green-500/10">✓ изучено</span>' : ""}
            </div>
            <p class="font-bold text-sm">${t.term}</p>
            ${t.translation ? `<p class="text-primary text-sm mt-0.5">${t.translation}</p>` : ""}
            <p class="text-on-surface-variant text-xs leading-relaxed mt-1.5">${t.definition}</p>
          </div>
          <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${learned ? "bg-green-500/20" : "bg-surface-container"}">
            <span class="material-symbols-outlined text-sm ${learned ? "text-green-400" : "text-on-surface-variant"}" style="font-variation-settings:'FILL' ${learned ? 1 : 0}">check_circle</span>
          </div>
        </div>
      </div>`;
  }).join("");
}

function dictToggleLearned(key) {
  dictLearnedIds[key] = !dictLearnedIds[key];
  localStorage.setItem("cortex_learned_v2", JSON.stringify(dictLearnedIds));
  dictRenderDecks();
}

// ── Карточки ─────────────────────────────
function dictStartCards(deckId) {
  let cards = [];
  if (deckId === "all") {
    Object.entries(CARDS_DATA).forEach(([dId, dCards]) => {
      dCards.forEach(c => cards.push({ ...c, deckId: dId, deckName: dictGetDeckName(dId) }));
    });
  } else {
    (CARDS_DATA[deckId] || []).forEach(c => cards.push({ ...c, deckId, deckName: dictGetDeckName(deckId) }));
  }

  if (!cards.length) { showDictToast("Карточки не найдены"); return; }

  // Неизученные сначала
  const unlearned = cards.filter(c => !dictLearnedIds[c.deckId + ":" + c.id]);
  const learned   = cards.filter(c =>  dictLearnedIds[c.deckId + ":" + c.id]);
  dictCardQueue   = [...shuffleDict(unlearned), ...shuffleDict(learned)];
  dictCardIndex   = 0;
  dictCardFlipped = false;

  document.getElementById("dict-main").classList.add("hidden");
  document.getElementById("dict-cards-mode").classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "instant" });
  dictShowCard();
}

function dictCloseCards() {
  document.getElementById("dict-cards-mode").classList.add("hidden");
  document.getElementById("dict-main").classList.remove("hidden");
  dictRenderDecks();
}

function dictShowCard() {
  if (!dictCardQueue.length) { dictCloseCards(); return; }
  const t = dictCardQueue[dictCardIndex];

  setEl("card-term",        t.term);
  setEl("card-translation", t.translation || "");
  setEl("card-definition",  t.definition || "");
  setEl("card-deck-label",  t.deckName || "");
  setEl("cards-progress-text", `${dictCardIndex + 1}/${dictCardQueue.length}`);

  const bar = document.getElementById("cards-progress-bar");
  if (bar) bar.style.width = (dictCardIndex / dictCardQueue.length * 100) + "%";

  dictCardFlipped = false;
  document.getElementById("card-front").classList.remove("hidden");
  document.getElementById("card-back").classList.add("hidden");
  document.getElementById("cards-buttons").style.display = "none";
}

function dictFlipCard() {
  if (dictCardFlipped) return;
  dictCardFlipped = true;
  document.getElementById("card-front").classList.add("hidden");
  document.getElementById("card-back").classList.remove("hidden");
  document.getElementById("cards-buttons").style.display = "grid";
}

function dictCardResult(success) {
  const t   = dictCardQueue[dictCardIndex];
  const key = t.deckId + ":" + t.id;
  if (success) dictLearnedIds[key] = true;
  localStorage.setItem("cortex_learned_v2", JSON.stringify(dictLearnedIds));

  dictCardIndex++;
  if (dictCardIndex >= dictCardQueue.length) {
    document.getElementById("dict-cards-mode").classList.add("hidden");
    document.getElementById("dict-main").classList.remove("hidden");
    dictRenderDecks();
    showDictToast("🎉 Колода пройдена!");
  } else {
    dictShowCard();
  }
}

function showDictToast(msg) {
  const t = document.createElement("div");
  t.className = "fixed top-20 left-1/2 -translate-x-1/2 z-[100] bg-surface-container-highest border border-white/10 text-on-surface text-sm font-semibold px-5 py-3 rounded-full shadow-xl whitespace-nowrap";
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}

function shuffleDict(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Модалка стрика ────────────────────────
function showStreakModal() {
  const streak = window._currentStreak || 0;
  const score  = window._currentScore  || 0;

  const modal = document.createElement("div");
  modal.id = "streak-modal";
  modal.className = "fixed inset-0 z-[200] flex items-end justify-center p-4 pb-8";
  modal.innerHTML = `
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" onclick="closeStreakModal()"></div>
    <div class="relative w-full max-w-sm glass rounded-2xl border border-white/10 p-6 space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="font-bold text-lg">Твоя серия</h3>
        <button onclick="closeStreakModal()" class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center">
          <span class="material-symbols-outlined text-on-surface-variant text-sm">close</span>
        </button>
      </div>
      <div class="flex items-center justify-center py-4">
        <div class="text-center">
          <div class="text-7xl mb-2">${streak >= 7 ? "🔥" : streak >= 3 ? "⚡" : "✨"}</div>
          <p class="text-5xl font-black text-orange-400 font-mono">${streak}</p>
          <p class="text-on-surface-variant text-sm mt-1 font-mono">${formatDays(streak)} подряд</p>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div class="bg-surface-container rounded-xl p-3 text-center">
          <p class="text-[9px] text-on-surface-variant uppercase font-mono tracking-wider">Всего XP</p>
          <p class="font-bold text-primary font-mono mt-1">${score.toLocaleString()}</p>
        </div>
        <div class="bg-surface-container rounded-xl p-3 text-center">
          <p class="text-[9px] text-on-surface-variant uppercase font-mono tracking-wider">Статус</p>
          <p class="font-bold mt-1 text-sm">${streak >= 7 ? "🔥 Горю!" : streak >= 3 ? "⚡ Разгоняюсь" : "🌱 Начало"}</p>
        </div>
      </div>
      <button onclick="shareStats(); closeStreakModal();" class="w-full py-3 bg-gradient-to-r from-primary to-primary-dim text-on-primary rounded-xl font-bold text-sm flex items-center justify-center gap-2 card-hover">
        <span class="material-symbols-outlined text-lg">share</span>Поделиться
      </button>
    </div>`;
  document.body.appendChild(modal);
}

function closeStreakModal() {
  document.getElementById("streak-modal")?.remove();
}

// ── Share ─────────────────────────────────
function shareStats() {
  const streak = window._currentStreak || 0;
  const score  = window._currentScore  || 0;
  const rank   = getRankLabel(score);

  const text = `Кортекс ИИ Бот для обучения\n${rank}\nМой профиль:\n🔥 Серия: ${formatDays(streak)}\n⚡ ${score.toLocaleString()} XP\n\nПроверь свои знания AI!`;
  const url  = "https://t.me/ai_education_quiz_bot";

  if (window.Telegram?.WebApp?.openTelegramLink) {
    const encoded = encodeURIComponent(text + "\n" + url);
    window.Telegram.WebApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`);
    return;
  }

  if (navigator.share) {
    navigator.share({ title: "Cortex AI Quiz", text, url }).catch(() => {});
    return;
  }

  navigator.clipboard?.writeText(text + "\n" + url).then(() => {
    showDictToast("📋 Скопировано в буфер!");
  });
}

// ── Init ─────────────────────────────────────
function initTelegram() {
  console.log("[TG-Init] Запуск инициализации...");
  let user = null;

  try {
    if (window.Telegram && window.Telegram.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();

      user = tg.initDataUnsafe?.user || null;
      console.log("[TG-Init] Данные WebApp получены:", user);
    } else {
      console.warn("[TG-Init] window.Telegram.WebApp не найден. Проверьте подключение скрипта в index.html");
    }
  } catch (e) {
    console.error("[TG-Init] Критическая ошибка при обращении к TG API:", e);
  }

  if (user && user.id) {
    window.telegramUserId = user.id;

    const name = [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username || "Пользователь";
    const photoUrl = user.photo_url || null;

    console.log(`[TG-Init] Авторизован: ${name} (ID: ${user.id})`);

    apiRequest("/register", {
      method: "POST",
      body: JSON.stringify({ user_id: user.id, username: name })
    }).then(res => {
      if(res) console.log("[API] Регистрация на сервере прошла успешно");
    });

    document.querySelectorAll(".tg-username").forEach(el => el.textContent = name);
    setAvatar("practice-avatar-wrap", photoUrl, name);
    setAvatar("profile-avatar-wrap",  photoUrl, name);

    loadUserStats(user.id);
    loadProfileStats(user.id);

  } else {
    console.warn("[TG-Init] Работа в режиме Гостя (ID не найден)");

    document.querySelectorAll(".tg-username").forEach(el => el.textContent = "Гость");
    setAvatar("practice-avatar-wrap", null, "Г");
    setAvatar("profile-avatar-wrap",  null, "Г");

    setEl("header-xp",            "0 XP");
    setEl("practice-level-badge", "LVL 1");
    setEl("practice-rank",        getRankLabel(0));
    setEl("streak-label",         "Начни игру!");
    setEl("daily-label",          "0");
    setEl("practice-games",       "0 игр");
    setEl("practice-score",       "0 XP");
    setEl("practice-accuracy",    "0%");

    setEl("profile-xp",           "0");
    setEl("profile-games",        "0");
    setEl("profile-accuracy",     "0%");
    setEl("profile-xp-label",     "0 / 2000 XP");
    setEl("profile-level-badge",  "LVL 1");
    setEl("profile-rank-label",   getRankLabel(0));
    setEl("profile-daily-pct",    "0%");
    setEl("profile-balance",      "0 монет");

    const bars = ["practice-accuracy-bar", "daily-progress", "profile-level-bar", "dict-mastery-bar"];
    bars.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.width = "0%";
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initTelegram();

  loadData();
});
