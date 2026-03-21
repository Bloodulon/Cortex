// ══════════════════════════════════════════
//  Cortex — app.js
// ══════════════════════════════════════════

const API_BASE_URL = "https://cortex-production-8ae8.up.railway.app";
const PAGES = ["practice", "courses", "dictionary", "rating", "profile"];

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

// ── Navigation ───────────────────────────────
function navigate(page) {
  quizClose(false);

  PAGES.forEach(p => {
    document.getElementById("page-" + p).classList.remove("active");
  });
  document.getElementById("page-" + page).classList.add("active");

  document.querySelectorAll(".nav-item").forEach((btn, i) => {
    const active = PAGES[i] === page;
    btn.classList.toggle("active", active);
    btn.classList.toggle("text-slate-500", !active);
  });

  window.scrollTo({ top: 0, behavior: "instant" });

  if (page === "rating")  loadLeaderboard();
  if (page === "profile" && window.telegramUserId) loadProfileStats(window.telegramUserId);
}

// ── Quiz внутри Practice ─────────────────────
function quizOpen() {
  document.getElementById("practice-content").classList.add("hidden");
  document.getElementById("quiz-content").classList.remove("hidden");

  // Переключаем хедер
  document.getElementById("header-default").classList.add("hidden");
  document.getElementById("header-default").classList.remove("flex");
  document.getElementById("header-quiz").classList.remove("hidden");
  document.getElementById("header-quiz").classList.add("flex");

  // Сбрасываем счёт в хедере
  document.getElementById("quiz-score").textContent = "0 XP";

  window.scrollTo({ top: 0, behavior: "instant" });
}

function quizClose(scroll = true) {
  const qc = document.getElementById("quiz-content");
  const pc = document.getElementById("practice-content");
  if (!qc || !pc) return;

  qc.classList.add("hidden");
  pc.classList.remove("hidden");

  // Возвращаем обычный хедер
  document.getElementById("header-quiz").classList.add("hidden");
  document.getElementById("header-quiz").classList.remove("flex");
  document.getElementById("header-default").classList.remove("hidden");
  document.getElementById("header-default").classList.add("flex");

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
  if (!window.Telegram?.WebApp) return;
  const tg = window.Telegram.WebApp;
  tg.ready();
  tg.expand();

  const user = tg.initDataUnsafe?.user;
  if (!user) return;

  window.telegramUserId = user.id;

  // Имя везде где есть класс tg-username
  const name = user.first_name + (user.last_name ? " " + user.last_name : "");
  document.querySelectorAll(".tg-username").forEach(el => el.textContent = name);

  // Аватарка в практике и профиле
  if (user.photo_url) {
    setAvatar("practice-avatar-wrap", "practice-avatar-icon", user.photo_url);
    setAvatar("profile-avatar-wrap",  "profile-avatar-icon",  user.photo_url);
  }

  // Позиция в рейтинге — имя
  setEl("my-rank-pos", "#—");

  loadUserStats(user.id);
  loadProfileStats(user.id);
}

// ── Утилиты ──────────────────────────────────
function getRankLabel(score) {
  if (score < 50)   return "🐣 Новичок";
  if (score < 200)  return "🧑‍💻 Джуниор";
  if (score < 500)  return "🚀 Мидл";
  if (score < 1000) return "🧠 Сеньор";
  return "🏆 AI Мастер";
}

function getLevel(score) {
  return Math.floor(score / 250) + 1;
}

function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function setAvatar(wrapId, iconId, photoUrl) {
  const wrap = document.getElementById(wrapId);
  const icon = document.getElementById(iconId);
  if (!wrap) return;
  if (photoUrl) {
    wrap.innerHTML = `<img src="${photoUrl}" class="w-full h-full object-cover rounded-full" />`;
  } else if (icon) {
    icon.style.display = "block";
  }
}

// ── Статистика хедер + practice ──────────────
async function loadUserStats(userId) {
  const stats = await getUserStats(userId);
  if (!stats) return;

  const score = stats.total_score;
  const level = getLevel(score);
  const rank  = getRankLabel(score);

  // Хедер
  setEl("header-xp", score.toLocaleString() + " XP");

  // Practice hero
  setEl("practice-level-badge", "LVL " + level);
  setEl("practice-rank", rank);
  setEl("practice-games", stats.games_played + " игр");
  setEl("practice-score", "+" + score.toLocaleString() + " XP");
  setEl("practice-accuracy", stats.accuracy + "%");
  setEl("streak-label", "Серия: " + stats.games_played + " игр");

  // Accuracy bar
  const accBar = document.getElementById("practice-accuracy-bar");
  if (accBar) accBar.style.width = stats.accuracy + "%";

  // Daily goal
  const done = stats.total_answers % 10;
  setEl("daily-label", done);
  const dp = document.getElementById("daily-progress");
  if (dp) dp.style.width = (done / 10 * 100) + "%";

  // Dictionary streak
  setEl("dict-streak", stats.games_played + " игр");

  // My position in rating
  setEl("my-rank-score", score.toLocaleString() + " XP");
}

// ── Профиль ──────────────────────────────────
async function loadProfileStats(userId) {
  const stats = await getUserStats(userId);
  if (!stats) return;

  const score = stats.total_score;
  const level = getLevel(score);
  const rank  = getRankLabel(score);
  const pct   = Math.min(score / 2000 * 100, 100);
  const dailyPct = stats.total_answers > 0 ? Math.round(stats.correct_answers / stats.total_answers * 100) : 0;

  setEl("profile-xp",        score.toLocaleString());
  setEl("profile-games",     stats.games_played);
  setEl("profile-accuracy",  stats.accuracy + "%");
  setEl("profile-xp-label",  score + " / 2000 XP");
  setEl("profile-level-badge", "LVL " + level);
  setEl("profile-rank-label",  rank);
  setEl("profile-daily-pct",   dailyPct + "%");
  setEl("profile-balance",     score * 4 + " монет");

  const lvlBar = document.getElementById("profile-level-bar");
  if (lvlBar) lvlBar.style.width = pct + "%";
}

// ── Лидерборд ────────────────────────────────
async function loadLeaderboard() {
  const rows = await getLeaderboard();
  if (!rows || !rows.length) return;

  const container = document.getElementById("leaderboard-list");
  if (!container) return;

  container.innerHTML = rows.map((r, i) => {
    const rankClass = i === 0 ? "rank-1" : i === 1 ? "rank-2" : i === 2 ? "rank-3" : "text-on-surface-variant";
    const isMe = r.user_id === window.telegramUserId;
    return `
      <div class="bg-surface-container-low rounded-xl p-3.5 flex items-center gap-3 card-hover ${isMe ? "border border-primary/40" : ""}">
        <span class="font-mono w-7 text-center text-sm font-bold ${rankClass}">${r.position}</span>
        <div class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center shrink-0">
          <span class="material-symbols-outlined text-on-surface-variant text-sm" style="font-variation-settings:'FILL' 1">person</span>
        </div>
        <p class="flex-1 text-sm font-medium">${isMe ? "Вы" : "User_" + String(r.user_id).slice(-4)}</p>
        <span class="${rankClass} text-sm font-mono font-bold">${r.score.toLocaleString()} XP</span>
      </div>`;
  }).join("");
}

// ══════════════════════════════════════════
//  QUIZ
// ══════════════════════════════════════════

const QUIZ_CONFIG = { questionsPerRound: 5, points: { easy: 10, medium: 20, hard: 40 } };
let quizState = { questions: [], currentIndex: 0, score: 0, correctCount: 0, locked: false };

const QUIZ_QUESTIONS = [
  { id:"q1", level:"easy",   question:"Что такое нейронная сеть?", options:["Сеть интернет-провайдеров","Математическая модель, вдохновлённая работой мозга","Протокол передачи данных","Антивирусная программа"], answer:1, explanation:"Нейронная сеть — набор алгоритмов, смоделированных по образцу мозга." },
  { id:"q2", level:"easy",   question:"Что означает аббревиатура 'AI'?", options:["Automated Internet","Artificial Intelligence","Advanced Integration","Automatic Input"], answer:1, explanation:"AI = Artificial Intelligence — искусственный интеллект." },
  { id:"q3", level:"medium", question:"Что такое 'переобучение' (overfitting)?", options:["Модель медленно обучается","Отлично на обучающих данных, плохо на новых","Использует много памяти","Обучалась слишком долго"], answer:1, explanation:"Overfitting — модель запомнила данные вместо паттернов." },
  { id:"q4", level:"medium", question:"Какая функция активации популярна в скрытых слоях?", options:["Sigmoid","Tanh","ReLU","Softmax"], answer:2, explanation:"ReLU решает проблему затухающих градиентов." },
  { id:"q5", level:"hard",   question:"Что такое 'hallucination' в LLM?", options:["Генерация плохих изображений","Модель уверенно выдаёт ложную информацию","Ошибка обучения","Дублирование токенов"], answer:1, explanation:"Галлюцинации — правдоподобная, но неверная информация." },
  { id:"q6", level:"hard",   question:"Что такое RLHF?", options:["Reinforcement Learning from Human Feedback","Recursive Layer Hyperparameter Framework","Regularized Loss with Heuristic Functions","Real-time Learning High Fidelity"], answer:0, explanation:"RLHF — обучение с подкреплением на основе обратной связи людей." },
  { id:"q7", level:"easy",   question:"Что такое машинное обучение (ML)?", options:["Обучение людей с машинами","Раздел AI, где системы учатся на данных","Производство роботов","Язык программирования"], answer:1, explanation:"ML — алгоритмы улучшаются через опыт." },
  { id:"q8", level:"medium", question:"Что такое Transformer в AI?", options:["Электрический трансформатор","Архитектура нейросетей на основе внимания","Метод сжатия данных","Алгоритм сортировки"], answer:1, explanation:"Transformer — архитектура на self-attention, основа GPT и BERT." },
];

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function quizStart() {
  quizState = { questions: shuffleArray(QUIZ_QUESTIONS).slice(0, QUIZ_CONFIG.questionsPerRound), currentIndex:0, score:0, correctCount:0, locked:false };
  document.getElementById("quiz-messages").innerHTML = "";
  document.getElementById("quiz-score").textContent = "0 XP";
  addBotMessage(`Отлично! Начинаем. Вопрос 1 из ${QUIZ_CONFIG.questionsPerRound}:`);
  quizShowQuestion();
}

function quizShowQuestion() {
  const q = quizState.questions[quizState.currentIndex];
  const lc = q.level === "easy" ? "text-green-400 bg-green-500/20" : q.level === "medium" ? "text-yellow-400 bg-yellow-500/20" : "text-red-400 bg-red-500/20";

  document.getElementById("quiz-messages").insertAdjacentHTML("beforeend", `
    <div class="flex gap-3">
      <div class="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-tertiary/20 flex items-center justify-center shrink-0">
        <span class="material-symbols-outlined text-primary text-sm" style="font-variation-settings:'FILL' 1">psychology</span>
      </div>
      <div class="glass rounded-2xl rounded-tl-sm p-4 max-w-[90%] border border-white/5">
        <span class="px-2 py-0.5 rounded text-[9px] font-bold uppercase font-mono ${lc}">${q.level}</span>
        <p class="text-sm font-semibold leading-relaxed mt-2">${q.question}</p>
      </div>
    </div>`);

  const opts = document.getElementById("quiz-options");
  opts.innerHTML = "";
  opts.className = "glass rounded-xl p-3 border border-white/5 space-y-2";
  q.options.forEach((opt, i) => {
    const btn = document.createElement("button");
    btn.className = "w-full py-3 px-4 bg-surface-container-highest hover:bg-primary/20 border border-white/5 rounded-xl text-sm font-semibold text-left card-hover flex items-center gap-3";
    btn.onclick = () => quizAnswer(i);
    btn.innerHTML = `<span class="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center shrink-0 text-xs font-bold font-mono">${String.fromCharCode(65+i)}</span><span>${opt}</span>`;
    opts.appendChild(btn);
  });

  quizUpdateProgress();
  scrollToBottom();
}

async function quizAnswer(idx) {
  if (quizState.locked) return;
  quizState.locked = true;

  const q = quizState.questions[quizState.currentIndex];
  const ok = idx === q.answer;
  if (ok) { quizState.score += QUIZ_CONFIG.points[q.level]; quizState.correctCount++; }

  document.getElementById("quiz-messages").insertAdjacentHTML("beforeend", `
    <div class="flex gap-3 flex-row-reverse">
      <div class="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
        <span class="material-symbols-outlined text-primary text-sm" style="font-variation-settings:'FILL' 1">person</span>
      </div>
      <div class="bg-primary text-on-primary rounded-2xl rounded-tr-sm p-3.5 max-w-[85%]">
        <p class="text-sm">${q.options[idx]}</p>
      </div>
    </div>`);

  if (window.telegramUserId) {
    submitAnswer({ user_id: window.telegramUserId, question_id: q.id, answer: q.options[idx], is_correct: ok, difficulty: q.level });
  }

  setTimeout(() => {
    document.getElementById("quiz-messages").insertAdjacentHTML("beforeend", `
      <div class="flex gap-3">
        <div class="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-tertiary/20 flex items-center justify-center shrink-0">
          <span class="material-symbols-outlined text-primary text-sm" style="font-variation-settings:'FILL' 1">psychology</span>
        </div>
        <div class="glass rounded-2xl rounded-tl-sm p-4 max-w-[90%] border border-white/5">
          <div class="flex items-center gap-2 mb-1">
            <span class="material-symbols-outlined text-lg ${ok ? "text-green-400":"text-red-400"}" style="font-variation-settings:'FILL' 1">${ok ? "check_circle":"cancel"}</span>
            <span class="font-bold ${ok ? "text-green-400":"text-red-400"}">${ok ? "Правильно!":"Неверно"}</span>
          </div>
          <p class="text-sm text-on-surface-variant leading-relaxed">${q.explanation}</p>
          ${ok ? `<p class="text-xs text-primary font-mono mt-1">+${QUIZ_CONFIG.points[q.level]} XP</p>` : ""}
        </div>
      </div>`);

    document.getElementById("quiz-score").textContent = quizState.score + " XP";

    setTimeout(() => {
      quizState.currentIndex++;
      quizState.locked = false;
      if (quizState.currentIndex < quizState.questions.length) {
        addBotMessage(`Вопрос ${quizState.currentIndex + 1} из ${QUIZ_CONFIG.questionsPerRound}:`);
        quizShowQuestion();
      } else {
        quizFinish();
      }
    }, 1400);
  }, 400);

  scrollToBottom();
}

function addBotMessage(text) {
  document.getElementById("quiz-messages").insertAdjacentHTML("beforeend", `
    <div class="flex gap-3">
      <div class="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-tertiary/20 flex items-center justify-center shrink-0">
        <span class="material-symbols-outlined text-primary text-sm" style="font-variation-settings:'FILL' 1">psychology</span>
      </div>
      <div class="glass rounded-2xl rounded-tl-sm p-3.5 max-w-[85%] border border-white/5">
        <p class="text-sm leading-relaxed">${text}</p>
      </div>
    </div>`);
}

function quizUpdateProgress() {
  const pct = (quizState.currentIndex / QUIZ_CONFIG.questionsPerRound) * 100;
  document.getElementById("quiz-progress-bar").style.width = pct + "%";
  document.getElementById("quiz-progress").textContent = `Вопрос ${quizState.currentIndex + 1}/${QUIZ_CONFIG.questionsPerRound}`;
}

async function quizFinish() {
  document.getElementById("quiz-progress-bar").style.width = "100%";
  document.getElementById("quiz-progress").textContent = "Завершено!";

  const pct = Math.round(quizState.correctCount / quizState.questions.length * 100);
  document.getElementById("quiz-messages").insertAdjacentHTML("beforeend", `
    <div class="flex gap-3">
      <div class="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center shrink-0">
        <span class="material-symbols-outlined text-yellow-400 text-sm" style="font-variation-settings:'FILL' 1">emoji_events</span>
      </div>
      <div class="glass rounded-2xl rounded-tl-sm p-4 max-w-[90%] border border-white/5">
        <p class="font-bold mb-3">🎉 Викторина завершена!</p>
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

  document.getElementById("quiz-options").innerHTML = `
    <button class="w-full py-3.5 px-4 bg-gradient-to-r from-primary to-primary-dim text-on-primary rounded-xl text-sm font-bold card-hover" onclick="quizStart()">
      <span class="material-symbols-outlined text-lg align-middle mr-2">refresh</span>Пройти ещё раз
    </button>`;

  if (window.telegramUserId) {
    await finishGame({ user_id: window.telegramUserId, score: quizState.score, correct_count: quizState.correctCount, total_count: quizState.questions.length });
    loadUserStats(window.telegramUserId);
  }

  scrollToBottom();
}

function quizRestart() { quizStart(); }

function scrollToBottom() {
  setTimeout(() => {
    const el = document.getElementById("quiz-messages");
    if (el) el.scrollTop = el.scrollHeight;
  }, 100);
}

// ── Init ─────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  initTelegram();
});
