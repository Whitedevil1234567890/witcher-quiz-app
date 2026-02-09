const API_URL = "https://script.google.com/macros/s/AKfycbwoOaaWG7lOI-2YBcYKCQqAjIKJo9qH1mjOn6vJ3IOmxS3bUSThm3NBfRR4mw6WBFEU/exec"; // 🔁 PASTE YOUR GOOGLE SCRIPT URL HERE

let questions = [];
let currentQuestion = 0;
let answers = {};
let violations = 0;
let userName = "";
let userRoll = "";
let quizEnded = false;

/* ---------- SCREEN CONTROL ---------- */
function showScreen(id) {
  document.querySelectorAll(".card").forEach(c => c.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

/* ---------- START QUIZ LOGIN ---------- */
async function startQuiz() {
  userName = document.getElementById("name").value.trim();
  userRoll = document.getElementById("roll").value.trim();

  if (!userName || !userRoll) {
    document.getElementById("login-error").innerText = "Please enter all fields";
    return;
  }

  const res = await fetch(`${API_URL}?type=checkRoll&roll=${userRoll}`);
  const text = await res.text();

  if (text === "USED") {
    document.getElementById("login-error").innerText = "This roll number already attempted the quiz.";
  } else {
    showScreen("instruction-screen");
  }
}

/* ---------- BEGIN QUIZ ---------- */
async function beginQuiz() {
  document.documentElement.requestFullscreen();
  setupAntiCheat();

  const res = await fetch(`${API_URL}?type=questions`);
  questions = await res.json();

  showScreen("quiz-screen");
  loadQuestion();
}

/* ---------- LOAD QUESTION ---------- */
function loadQuestion() {
  const q = questions[currentQuestion];
  document.getElementById("question-count").innerText = `Question ${currentQuestion + 1} / ${questions.length}`;
  document.getElementById("question-text").innerText = q[1];

  const optionsContainer = document.getElementById("options-container");
  optionsContainer.innerHTML = "";

  ["A", "B", "C", "D"].forEach((letter, index) => {
    const optionText = q[index + 2];
    const div = document.createElement("div");
    div.className = "option";
    div.innerHTML = `
      <label>
        <input type="radio" name="option" value="${letter}" ${answers[currentQuestion] === letter ? "checked" : ""}>
        ${optionText}
      </label>
    `;
    div.onclick = () => {
      answers[currentQuestion] = letter;
      loadQuestion();
    };
    optionsContainer.appendChild(div);
  });
}

/* ---------- NAVIGATION ---------- */
function nextQuestion() {
  if (currentQuestion < questions.length - 1) {
    currentQuestion++;
    loadQuestion();
  }
}

function prevQuestion() {
  if (currentQuestion > 0) {
    currentQuestion--;
    loadQuestion();
  }
}

/* ---------- ANTI CHEAT ---------- */
function setupAntiCheat() {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) registerViolation();
  });

  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement) registerViolation();
  });

  window.onbeforeunload = () => "Leaving will submit your quiz.";
  history.pushState(null, null, location.href);
  window.onpopstate = () => registerViolation();
}

function registerViolation() {
  if (quizEnded) return;

  violations++;
  document.getElementById("violation-count").innerText = `Violations: ${violations}`;
  alert("Warning! Do not switch tabs or exit fullscreen.");

  if (violations >= 3) {
    submitQuiz(true);
  }
}

/* ---------- SUBMIT QUIZ ---------- */
async function submitQuiz(forced = false) {
  quizEnded = true;

  let score = 0;
  questions.forEach((q, i) => {
    if (answers[i] === q[6]) score++;
  });

  const data = {
    name: userName,
    roll: userRoll,
    answers: Object.values(answers),
    score: score,
    violations: violations,
    status: forced ? "Terminated" : "Completed"
  };

  await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify(data)
  });

  document.exitFullscreen();
  showResult(score, forced);
}

/* ---------- SHOW RESULT ---------- */
function showResult(score, forced) {
  showScreen("result-screen");
  document.getElementById("final-score").innerText = `Your Score: ${score}`;
  document.getElementById("final-status").innerText = forced ? "Quiz Auto-Submitted Due to Violations" : "Quiz Completed Successfully";
}

/* ---------- LEADERBOARD ---------- */
async function showLeaderboard() {
  const res = await fetch(`${API_URL}?type=leaderboard`);
  const data = await res.json();

  showScreen("leaderboard-screen");
  const body = document.getElementById("leaderboard-body");
  body.innerHTML = "";

  data.forEach((row, index) => {
    body.innerHTML += `
      <tr>
        <td>${index + 1}</td>
        <td>${row[1]}</td>
        <td>${row[2]}</td>
        <td>${row[4]}</td>
      </tr>
    `;
  });
}
