// ══════════════════════════════════════════
//  Cortex — app.js
// ══════════════════════════════════════════

// ── Конфигурация API ────────────────────────
const API_BASE_URL = "https://cortex-production-8ae8.up.railway.app";

const PAGES = [
  "practice",
  "courses",
  "dictionary",
  "quiz",
  "rating",
  "profile",
];

// ── API функции ──────────────────────────────
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    headers: { "Content-Type": "application/json" },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ detail: "Request failed" }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
}

// Получить статистику пользователя
async function getUserStats(userId) {
  return await apiRequest(`/stats/${userId}`);
}

// Отправить ответ на вопрос
async function submitAnswer(
  userId,
  questionId,
  answer,
  isCorrect,
  difficulty = "medium",
) {
  return await apiRequest("/answer", {
    method: "POST",
    body: JSON.stringify({
      user_id: userId,
      question_id: questionId,
      answer,
      is_correct: isCorrect,
      difficulty,
    }),
  });
}

// Завершить игру
async function finishGame(userId, score, correctCount, totalCount) {
  return await apiRequest("/game/finish", {
    method: "POST",
    body: JSON.stringify({
      user_id: userId,
      score,
      correct_count: correctCount,
      total_count: totalCount,
    }),
  });
}

// Получить лидерборд
async function getLeaderboard(limit = 10) {
  return await apiRequest(`/leaderboard?limit=${limit}`);
}

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

  // Загружаем статистику пользователя после инициализации
  loadUserStats(user.id);
}

// ── Загрузка статистики ─────────────────────
async function loadUserStats(userId) {
  try {
    const stats = await getUserStats(userId);
    // Обновляем XP в хедере
    const xpElement = document.getElementById("header-xp");
    if (xpElement) {
      xpElement.textContent = `${stats.total_score.toLocaleString()} XP`;
    }
    console.log("User stats loaded:", stats);
  } catch (error) {
    console.warn("Не удалось загрузить статистику:", error.message);
  }
}

// ══════════════════════════════════════════
//  QUIZ / ВИКТОРИНА
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
  isFinished: false,
};

// Вопросы для викторины
const QUIZ_QUESTIONS = [
  {
    id: "q1",
    level: "easy",
    question: "Что такое нейронная сеть?",
    options: [
      "Сеть интернет-провайдеров",
      "Математическая модель, вдохновлённая работой мозга",
      "Протокол передачи данных",
      "Антивирусная программа",
    ],
    answer: 1,
    explanation:
      "Нейронная сеть — это набор алгоритмов, смоделированных по образцу человеческого мозга.",
  },
  {
    id: "q2",
    level: "easy",
    question: "Что означает аббревиатура 'AI'?",
    options: [
      "Automated Internet",
      "Artificial Intelligence",
      "Advanced Integration",
      "Automatic Input",
    ],
    answer: 1,
    explanation:
      "AI расшифровывается как Artificial Intelligence — искусственный интеллект.",
  },
  {
    id: "q3",
    level: "medium",
    question: "Что такое 'переобучение' (overfitting)?",
    options: [
      "Модель слишком медленно обучается",
      "Модель отлично работает на обучающих данных, но плохо на новых",
      "Модель использует слишком много памяти",
      "Модель обучалась слишком долго",
    ],
    answer: 1,
    explanation:
      "Overfitting — когда модель запомнила обучающие данные вместо того, чтобы выучить общие паттерны.",
  },
  {
    id: "q4",
    level: "medium",
    question:
      "Какая функция активации чаще всего используется в скрытых слоях?",
    options: ["Sigmoid", "Tanh", "ReLU", "Softmax"],
    answer: 2,
    explanation:
      "ReLU популярна из-за простоты и эффективного решения проблемы затухающих градиентов.",
  },
  {
    id: "q5",
    level: "hard",
    question: "Что такое 'hallucination' в больших языковых моделях?",
    options: [
      "Генерация изображений низкого качества",
      "Когда модель уверенно выдаёт ложную информацию",
      "Ошибка при обучении модели",
      "Эффект дублирования токенов",
    ],
    answer: 1,
    explanation:
      "Галлюцинации LLM — это генерация правдоподобно звучащей, но фактически неверной информации.",
  },
  {
    id: "q6",
    level: "hard",
    question: "Что такое RLHF?",
    options: [
      "Reinforcement Learning from Human Feedback",
      "Recursive Layer Hyperparameter Framework",
      "Regularized Loss with Heuristic Functions",
      "Real-time Learning with High Fidelity",
    ],
    answer: 0,
    explanation:
      "RLHF — обучение с подкреплением на основе обратной связи от людей для выравнивания моделей.",
  },
  {
    id: "q7",
    level: "easy",
    question: "Что такое машинное обучение (ML)?",
    options: [
      "Обучение людей работе с машинами",
      "Раздел AI, где системы учатся на данных",
      "Производство роботов",
      "Язык программирования",
    ],
    answer: 1,
    explanation:
      "Machine Learning — подраздел AI, где алгоритмы автоматически улучшаются через опыт.",
  },
  {
    id: "q8",
    level: "medium",
    question: "Что такое Transformer в AI?",
    options: [
      "Электрический трансформатор",
      "Архитектура нейросетей на основе внимания",
      "Метод сжатия данных",
      "Алгоритм сортировки",
    ],
    answer: 1,
    explanation:
      "Transformer — архитектура на основе self-attention, основа GPT и BERT.",
  },
];

// Перемешивание массива (Fisher-Yates)
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Начало викторины
function quizStart() {
  quizState = {
    questions: shuffleArray(QUIZ_QUESTIONS).slice(
      0,
      QUIZ_CONFIG.questionsPerRound,
    ),
    currentIndex: 0,
    score: 0,
    correctCount: 0,
    isFinished: false,
  };

  // Очищаем сообщения
  const messagesContainer = document.getElementById("quiz-messages");
  messagesContainer.innerHTML = "";

  // Добавляем сообщение о начале
  addBotMessage(
    `Отлично! Начинаем викторину. Вопрос ${quizState.currentIndex + 1} из ${QUIZ_CONFIG.questionsPerRound}:`,
  );

  // Показываем первый вопрос
  quizShowQuestion();
}

// Показать вопрос
function quizShowQuestion() {
  const question = quizState.questions[quizState.currentIndex];

  // Добавляем вопрос в чат
  const messagesContainer = document.getElementById("quiz-messages");

  const questionHtml = `
    <div class="flex gap-3" data-question-id="${question.id}">
      <div class="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-tertiary/20 flex items-center justify-center shrink-0">
        <span class="material-symbols-outlined text-primary text-sm" style="font-variation-settings:'FILL' 1">psychology</span>
      </div>
      <div class="glass rounded-2xl rounded-tl-sm p-4 max-w-[90%] border border-white/5">
        <div class="flex items-center gap-2 mb-2">
          <span class="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider font-mono ${
            question.level === "easy"
              ? "bg-green-500/20 text-green-400"
              : question.level === "medium"
                ? "bg-yellow-500/20 text-yellow-400"
                : "bg-red-500/20 text-red-400"
          }">${question.level}</span>
        </div>
        <p class="text-base font-semibold leading-relaxed">${question.question}</p>
      </div>
    </div>
  `;

  messagesContainer.insertAdjacentHTML("beforeend", questionHtml);

  // Показываем варианты ответов
  quizShowOptions(question);
  quizUpdateProgress();
  scrollToBottom();
}

// Показать варианты ответов
function quizShowOptions(question) {
  const optionsContainer = document.getElementById("quiz-options");
  optionsContainer.innerHTML = "";
  optionsContainer.className =
    "glass rounded-xl p-3 border border-white/5 space-y-2";

  question.options.forEach((option, index) => {
    const btn = document.createElement("button");
    btn.className =
      "w-full py-3.5 px-4 bg-surface-container-highest hover:bg-primary/20 border border-white/5 rounded-xl text-sm font-semibold text-left card-hover transition-all flex items-center gap-3";
    btn.onclick = () => quizHandleAnswer(index);
    btn.innerHTML = `
      <span class="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center shrink-0 text-xs font-bold font-mono">
        ${String.fromCharCode(65 + index)}
      </span>
      <span>${option}</span>
    `;
    optionsContainer.appendChild(btn);
  });
}

// Обработка ответа
async function quizHandleAnswer(selectedIndex) {
  if (quizState.isFinished) return;

  const question = quizState.questions[quizState.currentIndex];
  const isCorrect = selectedIndex === question.answer;

  // Блокируем повторные нажатия
  quizState.isFinished = true;

  // Добавляем ответ пользователя в чат
  const messagesContainer = document.getElementById("quiz-messages");
  const userAnswerHtml = `
    <div class="flex gap-3 flex-row-reverse">
      <div class="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
        <span class="material-symbols-outlined text-primary text-sm" style="font-variation-settings:'FILL' 1">person</span>
      </div>
      <div class="bg-primary text-on-primary rounded-2xl rounded-tr-sm p-3.5 max-w-[85%]">
        <p class="text-sm">${question.options[selectedIndex]}</p>
      </div>
    </div>
  `;
  messagesContainer.insertAdjacentHTML("beforeend", userAnswerHtml);

  // Обновляем счёт
  if (isCorrect) {
    quizState.score += QUIZ_CONFIG.points[question.level];
    quizState.correctCount++;
  }

  // Отправляем ответ на сервер
  if (window.telegramUserId) {
    try {
      await submitAnswer(
        window.telegramUserId,
        question.id,
        question.options[selectedIndex],
        isCorrect,
        question.level,
      );
    } catch (error) {
      console.warn("Не удалось отправить ответ на сервер:", error);
    }
  }

  // Показываем результат
  setTimeout(() => {
    const resultHtml = `
      <div class="flex gap-3">
        <div class="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-tertiary/20 flex items-center justify-center shrink-0">
          <span class="material-symbols-outlined text-primary text-sm" style="font-variation-settings:'FILL' 1">psychology</span>
        </div>
        <div class="glass rounded-2xl rounded-tl-sm p-4 max-w-[90%] border border-white/5">
          <div class="flex items-center gap-2 mb-2">
            <span class="material-symbols-outlined text-lg ${isCorrect ? "text-green-400" : "text-red-400"}" style="font-variation-settings:'FILL' 1">
              ${isCorrect ? "check_circle" : "cancel"}
            </span>
            <span class="font-bold ${isCorrect ? "text-green-400" : "text-red-400"}">
              ${isCorrect ? "Правильно!" : "Неверно"}
            </span>
          </div>
          <p class="text-sm leading-relaxed text-on-surface-variant">${question.explanation}</p>
          ${isCorrect ? `<p class="text-xs text-primary font-mono mt-2">+${QUIZ_CONFIG.points[question.level]} XP</p>` : ""}
        </div>
      </div>
    `;
    messagesContainer.insertAdjacentHTML("beforeend", resultHtml);

    // Обновляем счёт в UI
    document.getElementById("quiz-score").textContent = `${quizState.score} XP`;

    // Переходим к следующему вопросу или завершаем
    setTimeout(() => {
      quizState.currentIndex++;
      quizState.isFinished = false;

      if (quizState.currentIndex < quizState.questions.length) {
        addBotMessage(
          `Вопрос ${quizState.currentIndex + 1} из ${QUIZ_CONFIG.questionsPerRound}:`,
        );
        quizShowQuestion();
      } else {
        quizFinish();
      }
    }, 1500);
  }, 500);

  scrollToBottom();
}

// Добавить сообщение от бота
function addBotMessage(text) {
  const messagesContainer = document.getElementById("quiz-messages");
  const html = `
    <div class="flex gap-3">
      <div class="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-tertiary/20 flex items-center justify-center shrink-0">
        <span class="material-symbols-outlined text-primary text-sm" style="font-variation-settings:'FILL' 1">psychology</span>
      </div>
      <div class="glass rounded-2xl rounded-tl-sm p-3.5 max-w-[85%] border border-white/5">
        <p class="text-sm leading-relaxed">${text}</p>
      </div>
    </div>
  `;
  messagesContainer.insertAdjacentHTML("beforeend", html);
}

// Обновить прогресс
function quizUpdateProgress() {
  const progress =
    (quizState.currentIndex / QUIZ_CONFIG.questionsPerRound) * 100;
  document.getElementById("quiz-progress-bar").style.width = `${progress}%`;
  document.getElementById("quiz-progress").textContent =
    `Вопрос ${quizState.currentIndex + 1}/${QUIZ_CONFIG.questionsPerRound}`;
}

// Завершение викторины
async function quizFinish() {
  quizState.isFinished = true;

  const messagesContainer = document.getElementById("quiz-messages");

  // Прогресс бар на 100%
  document.getElementById("quiz-progress-bar").style.width = "100%";
  document.getElementById("quiz-progress").textContent = "Завершено!";

  // Финальное сообщение
  const percentage = Math.round(
    (quizState.correctCount / quizState.questions.length) * 100,
  );
  const resultHtml = `
    <div class="flex gap-3">
      <div class="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center shrink-0">
        <span class="material-symbols-outlined text-yellow-400 text-sm" style="font-variation-settings:'FILL' 1">emoji_events</span>
      </div>
      <div class="glass rounded-2xl rounded-tl-sm p-4 max-w-[90%] border border-white/5">
        <p class="text-base font-bold mb-3">🎉 Викторина завершена!</p>
        <div class="grid grid-cols-2 gap-3 mb-3">
          <div class="bg-surface-container-highest rounded-lg p-3 text-center">
            <p class="text-[9px] text-on-surface-variant uppercase font-mono">Правильно</p>
            <p class="text-xl font-bold text-primary">${quizState.correctCount}/${quizState.questions.length}</p>
          </div>
          <div class="bg-surface-container-highest rounded-lg p-3 text-center">
            <p class="text-[9px] text-on-surface-variant uppercase font-mono">Точность</p>
            <p class="text-xl font-bold text-tertiary">${percentage}%</p>
          </div>
        </div>
        <div class="bg-primary/10 rounded-lg p-3 text-center border border-primary/20">
          <p class="text-[9px] text-on-surface-variant uppercase font-mono">Заработано XP</p>
          <p class="text-2xl font-bold text-primary">${quizState.score} XP</p>
        </div>
      </div>
    </div>
  `;
  messagesContainer.insertAdjacentHTML("beforeend", resultHtml);

  // Кнопка рестарта
  const optionsContainer = document.getElementById("quiz-options");
  optionsContainer.innerHTML = `
    <button class="w-full py-3.5 px-4 bg-gradient-to-r from-primary to-primary-dim text-on-primary rounded-xl text-sm font-bold card-hover" onclick="quizRestart()">
      <span class="material-symbols-outlined text-lg align-middle mr-2">refresh</span>
      Пройти ещё раз
    </button>
  `;

  // Отправляем результат на сервер
  if (window.telegramUserId) {
    try {
      await finishGame(
        window.telegramUserId,
        quizState.score,
        quizState.correctCount,
        quizState.questions.length,
      );
      // Обновляем общую статистику
      loadUserStats(window.telegramUserId);
    } catch (error) {
      console.warn("Не удалось отправить результат:", error);
    }
  }

  scrollToBottom();
}

// Перезапуск викторины
function quizRestart() {
  quizStart();
}

// Прокрутка вниз
function scrollToBottom() {
  const messagesContainer = document.getElementById("quiz-messages");
  setTimeout(() => {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }, 100);
}

// ── Init ─────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  initTelegram();
});
