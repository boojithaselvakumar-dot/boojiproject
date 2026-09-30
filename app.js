const viewRoot = document.querySelector('#view');
const statusLabel = document.querySelector('#connection-status');
const messageHistory = [];
let geminiConfigured = false;
let currentView = 'tutor';
let sessionsCompleted = Number(localStorage.getItem('edugenie-sessions') || 0);

const decks = {
  Biology: [
    ['What is photosynthesis?', 'The process plants use to turn light, water, and carbon dioxide into glucose and oxygen.'],
    ['What is the role of chlorophyll?', 'It absorbs light energy, especially red and blue wavelengths, to power photosynthesis.'],
    ['Where does photosynthesis happen?', 'In chloroplasts, mainly in the leaves of plants.'],
    ['What are the two main stages?', 'The light-dependent reactions and the Calvin cycle.'],
    ['What gas do plants absorb?', 'Carbon dioxide enters the leaf through tiny pores called stomata.'],
    ['What is cellular respiration?', 'The process cells use to release energy from glucose, usually using oxygen.'],
    ['What is an ecosystem?', 'A community of living organisms interacting with each other and their environment.'],
    ['What is a producer?', 'An organism, such as a plant, that makes its own food and forms the base of a food chain.'],
  ],
  Mathematics: [
    ['What is the Pythagorean theorem?', 'For a right triangle, a squared plus b squared equals c squared, where c is the hypotenuse.'],
    ['What is a prime number?', 'A whole number greater than 1 with exactly two factors: 1 and itself.'],
    ['How do you find the area of a triangle?', 'Multiply the base by the height, then divide by 2.'],
  ],
  History: [
    ['When did the Renaissance begin?', 'It began in Italy in the 14th century and spread through Europe over the following centuries.'],
    ['What was the Silk Road?', 'A network of trade routes connecting Asia, the Middle East, and Europe.'],
    ['What is a primary source?', 'A firsthand record from the time being studied, such as a letter, artifact, or diary.'],
  ],
};

const quizQuestions = [
  { question: 'Which part of a plant cell captures light energy?', options: ['Mitochondrion', 'Chloroplast', 'Nucleus', 'Cell wall'], answer: 1, detail: 'Chloroplasts contain chlorophyll, the pigment that absorbs light for photosynthesis.' },
  { question: 'What is the value of 3² + 4²?', options: ['14', '20', '25', '49'], answer: 2, detail: '3² is 9 and 4² is 16, so 9 + 16 = 25.' },
  { question: 'Which is a primary historical source?', options: ['A modern textbook', 'A museum website', 'A soldier’s letter from the war', 'A documentary made decades later'], answer: 2, detail: 'A letter written at the time is a firsthand account, making it a primary source.' },
  { question: 'What do plants release during photosynthesis?', options: ['Nitrogen', 'Oxygen', 'Methane', 'Helium'], answer: 1, detail: 'Oxygen is released when water molecules are split during the light-dependent reactions.' },
  { question: 'Which number is prime?', options: ['21', '27', '31', '39'], answer: 2, detail: '31 has no positive divisors other than 1 and 31.' },
];

let deckName = 'Biology';
let cardIndex = 0;
let cardFlipped = false;
let quizIndex = 0;
let quizScore = 0;
let quizAnswered = false;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function setGoalProgress() {
  const count = document.querySelector('#goal-count');
  const progress = document.querySelector('#goal-progress');
  if (count) count.textContent = Math.min(sessionsCompleted, 5);
  if (progress) progress.style.width = `${Math.min(sessionsCompleted, 5) * 20}%`;
}

function completeSession() {
  sessionsCompleted += 1;
  localStorage.setItem('edugenie-sessions', String(sessionsCompleted));
  setGoalProgress();
}

function heading(title, subtitle, eyebrow = 'YOUR LEARNING SPACE') {
  const date = new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date());
  return `<div class="page-heading ${currentView === 'tutor' ? '' : 'mode-heading'}">
    <div><span class="eyebrow">${eyebrow}</span><h1>${title}</h1><p>${subtitle}</p></div>
    <span class="date-pill">${date}</span>
  </div>`;
}

function renderTutor() {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  viewRoot.innerHTML = `${heading(`${greeting}, Alex <span class="heading-spark">✳</span>`, 'Make today a little smarter. What’s on your mind?')}
    <div class="tutor-grid">
      <section class="chat-panel" aria-label="EduGenie tutor chat">
        <div class="chat-topline"><span class="genie-avatar" aria-hidden="true">✳</span><div><div class="chat-title">Your study buddy</div><div class="chat-caption">${geminiConfigured ? 'Gemini is ready to help' : 'Demo tutor · connect Gemini for AI answers'}</div></div><span class="chat-context">Learning mode</span></div>
        <div class="chat-body" id="chat-body" role="log" aria-live="polite"><div class="message"><span class="message-avatar" aria-hidden="true">✳</span><div class="message-bubble">Hey Alex! I’m here to make tricky topics feel a bit simpler. Pick a prompt to get started, or ask me anything you’re learning.</div></div></div>
        <div class="suggestion-wrap"><div class="suggestion-label">A few places we could start</div><div class="suggestions"><button class="suggestion-chip" data-prompt="Explain photosynthesis in a simple way">Explain photosynthesis</button><button class="suggestion-chip" data-prompt="Help me understand fractions with an example">Fractions, please</button><button class="suggestion-chip" data-prompt="Give me a quick study plan for today">Plan a study session</button></div></div>
        <form class="chat-form" id="chat-form"><textarea id="chat-input" rows="1" maxlength="4000" aria-label="Your question" placeholder="Ask anything you’re learning..."></textarea><button class="send-button" type="submit" aria-label="Send message" title="Send message">↑</button></form>
        <div class="chat-footnote">${geminiConfigured ? 'Gemini can make mistakes. Check important information.' : 'Demo mode: connect a Gemini API key to enable AI-powered answers.'}</div>
      </section>
      <aside class="side-content" aria-label="Study suggestions">
        <section class="subject-section"><h2 class="aside-title">Pick up a subject</h2><div class="subject-list">
          <button class="subject-row" data-topic="Biology"><span class="subject-mark bio">B</span><span class="subject-text">Biology<small>Photosynthesis &amp; cells</small></span><span class="subject-arrow">›</span></button>
          <button class="subject-row" data-topic="Mathematics"><span class="subject-mark math">π</span><span class="subject-text">Mathematics<small>Algebra &amp; geometry</small></span><span class="subject-arrow">›</span></button>
          <button class="subject-row" data-topic="History"><span class="subject-mark hist">H</span><span class="subject-text">History<small>World history essentials</small></span><span class="subject-arrow">›</span></button>
        </div></section>
        <section class="focus-panel"><h2 class="aside-title">A small win for today</h2><p>Try a 10-minute review. One concept understood is progress worth keeping.</p><button class="focus-link" data-view="cards">Start with flashcards <span aria-hidden="true">→</span></button></section>
        <section><h2 class="aside-title">Study tools</h2><div class="mini-tools"><button class="tool-tile" data-view="cards"><span class="tool-glyph" aria-hidden="true">▤</span>Flashcards</button><button class="tool-tile" data-view="quiz"><span class="tool-glyph" aria-hidden="true">◉</span>Quick quiz</button></div></section>
      </aside>
    </div>`;
  attachTutorListeners();
}

function addMessage(role, text, typing = false) {
  const body = document.querySelector('#chat-body');
  const item = document.createElement('div');
  item.className = `message ${role === 'user' ? 'user' : ''}${typing ? ' typing' : ''}`;
  const avatar = role === 'user' ? '' : '<span class="message-avatar" aria-hidden="true">✳</span>';
  item.innerHTML = `${avatar}<div class="message-bubble">${escapeHtml(text)}</div>`;
  body.append(item);
  body.scrollTop = body.scrollHeight;
  return item;
}

function demoAnswer(question) {
  const normalized = question.toLowerCase();
  if (normalized.includes('photosynthesis')) return 'Think of a leaf as a tiny solar-powered kitchen. It uses light, water, and carbon dioxide to make glucose (the plant’s food), releasing oxygen along the way. The short version is: light + water + carbon dioxide → glucose + oxygen.';
  if (normalized.includes('fraction')) return 'A fraction is a way to describe part of a whole. If a pizza is cut into 4 equal slices and you eat 1, you ate 1/4. The bottom number (denominator) tells you how many equal parts there are; the top (numerator) tells you how many you have.';
  if (normalized.includes('plan') || normalized.includes('study')) return 'Here’s a gentle 20-minute plan: spend 5 minutes reviewing one topic, 10 minutes practicing it (try explaining it without notes), then use the last 5 minutes to write down what still feels fuzzy. A short break after is part of the plan.';
  return `Good question about “${question}.” Start by breaking it into the smallest pieces you already recognize. What part feels most confusing right now? I can help you work through it step by step.\n\nThis is a demo reply. Add a Gemini API key to enable AI-powered tutoring.`;
}

async function sendQuestion(question) {
  const trimmed = question.trim();
  if (!trimmed) return;
  const form = document.querySelector('#chat-form');
  const input = document.querySelector('#chat-input');
  const sendButton = form.querySelector('button[type="submit"]');
  const suggestions = document.querySelector('.suggestion-wrap');
  if (suggestions) suggestions.hidden = true;
  addMessage('user', trimmed);
  messageHistory.push({ role: 'user', content: trimmed });
  input.value = '';
  sendButton.disabled = true;
  const pending = addMessage('assistant', geminiConfigured ? 'Thinking through that...' : 'Let me think that through...', true);
  completeSession();
  try {
    let answer;
    if (geminiConfigured) {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: messageHistory }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Could not reach Gemini. Please try again.');
      answer = payload.answer;
    } else {
      await new Promise((resolve) => setTimeout(resolve, 420));
      answer = demoAnswer(trimmed);
    }
    messageHistory.push({ role: 'assistant', content: answer });
    pending.querySelector('.message-bubble').textContent = answer;
    pending.classList.remove('typing');
  } catch (error) {
    pending.querySelector('.message-bubble').textContent = error.message;
    pending.querySelector('.message-bubble').classList.add('error-note');
    pending.classList.remove('typing');
    messageHistory.pop();
  } finally {
    sendButton.disabled = false;
    input.focus();
    document.querySelector('#chat-body').scrollTop = document.querySelector('#chat-body').scrollHeight;
  }
}

function attachTutorListeners() {
  document.querySelector('#chat-form').addEventListener('submit', (event) => {
    event.preventDefault();
    sendQuestion(document.querySelector('#chat-input').value);
  });
  document.querySelectorAll('[data-prompt]').forEach((button) => button.addEventListener('click', () => sendQuestion(button.dataset.prompt)));
  document.querySelectorAll('[data-topic]').forEach((button) => button.addEventListener('click', () => {
    const topic = button.dataset.topic;
    messageHistory.length = 0;
    renderTutor();
    sendQuestion(`Help me review ${topic}. Start with one key idea and a clear example.`);
  }));
}

function renderCards() {
  const cards = decks[deckName];
  const [front, back] = cards[cardIndex];
  viewRoot.innerHTML = `${heading('Make it stick.', 'One card at a time. No cramming required.', 'YOUR STUDY DECK')}
    <div class="study-layout"><section class="study-main"><div class="study-toolbar"><span class="study-label">${cards.length} cards in this deck</span><label><span class="visually-hidden">Choose a subject</span><select class="deck-select" id="deck-select">${Object.keys(decks).map((name) => `<option ${name === deckName ? 'selected' : ''}>${name}</option>`).join('')}</select></label></div>
      <button class="flashcard ${cardFlipped ? 'flipped' : ''}" id="flashcard" aria-label="${cardFlipped ? 'Show question' : 'Reveal answer'}"><span class="card-kicker">${cardFlipped ? 'THE ANSWER' : `${deckName.toUpperCase()} · QUESTION`}</span><span class="card-copy">${escapeHtml(cardFlipped ? back : front)}</span><span class="card-hint">${cardFlipped ? 'Tap to see the question' : 'Tap anywhere to reveal'}</span></button>
      <div class="card-controls"><button class="icon-button" id="card-prev" aria-label="Previous card" title="Previous card">‹</button><span class="card-position">${cardIndex + 1} / ${cards.length}</span><button class="icon-button" id="card-next" aria-label="Next card" title="Next card">›</button></div>
    </section><aside class="study-aside"><section class="study-note"><h2 class="aside-title">Study tip</h2><p>Try to say the answer out loud before you flip. Retrieving an idea from memory helps it last.</p></section><section class="study-counts"><h2 class="aside-title">Your progress</h2><div class="count-row"><span>Current deck</span><strong>${deckName}</strong></div><div class="count-row"><span>Cards to review</span><strong>${cards.length}</strong></div><div class="count-row"><span>Daily focus</span><strong>10 min</strong></div></section></aside></div>`;

  document.querySelector('#deck-select').addEventListener('change', (event) => {
    deckName = event.target.value;
    cardIndex = 0;
    cardFlipped = false;
    renderCards();
  });
  document.querySelector('#flashcard').addEventListener('click', () => { cardFlipped = !cardFlipped; renderCards(); });
  document.querySelector('#card-prev').addEventListener('click', () => changeCard(-1));
  document.querySelector('#card-next').addEventListener('click', () => changeCard(1));
}

function changeCard(direction) {
  const deckLength = decks[deckName].length;
  cardIndex = (cardIndex + direction + deckLength) % deckLength;
  cardFlipped = false;
  completeSession();
  renderCards();
}

function renderQuiz() {
  if (quizIndex >= quizQuestions.length) {
    viewRoot.innerHTML = `${heading('Quick quiz', 'A little practice makes a big difference.', 'CHECK YOUR KNOWLEDGE')}<section class="quiz-panel quiz-result"><span class="result-mark">${quizScore >= 3 ? '✦' : '↗'}</span><h2>${quizScore >= 4 ? 'Brilliant work!' : quizScore >= 2 ? 'Nice progress!' : 'Good start!'}</h2><p>You got ${quizScore} out of ${quizQuestions.length} correct. Every try is a step forward.</p><button class="quiz-next" id="quiz-restart">Try again <span aria-hidden="true">↻</span></button></section>`;
    document.querySelector('#quiz-restart').addEventListener('click', () => {
      quizIndex = 0;
      quizScore = 0;
      quizAnswered = false;
      renderQuiz();
    });
    return;
  }

  const item = quizQuestions[quizIndex];
  viewRoot.innerHTML = `${heading('Quick quiz', 'A little practice makes a big difference.', 'CHECK YOUR KNOWLEDGE')}<section class="quiz-panel"><div class="quiz-top"><span>Mixed review</span><span>Question ${quizIndex + 1} of ${quizQuestions.length}</span></div><div class="quiz-progress"><span style="width:${(quizIndex / quizQuestions.length) * 100}%"></span></div><h2 class="quiz-question">${item.question}</h2><div class="quiz-options">${item.options.map((option, index) => `<button class="quiz-option" data-answer="${index}" ${quizAnswered ? 'disabled' : ''}><span class="option-key">${String.fromCharCode(65 + index)}</span>${option}</button>`).join('')}</div><div class="quiz-feedback" id="quiz-feedback">${quizAnswered ? `${quizScore > 0 ? 'Good thinking!' : 'Keep going!'} ${item.detail}` : 'Choose the answer that feels right.'}</div>${quizAnswered ? '<button class="quiz-next" id="quiz-next">Next question <span aria-hidden="true">→</span></button>' : ''}</section><div class="study-note" style="max-width:760px;margin-top:14px"><h2 class="aside-title">No pressure</h2><p>Use this as a quick check-in, not a scorecard. The explanation after each answer is part of the practice.</p></div>`;

  document.querySelectorAll('.quiz-option').forEach((button) => button.addEventListener('click', () => {
    if (quizAnswered) return;
    quizAnswered = true;
    const selected = Number(button.dataset.answer);
    if (selected === item.answer) quizScore += 1;
    completeSession();
    document.querySelectorAll('.quiz-option').forEach((option) => {
      option.disabled = true;
      const answerIndex = Number(option.dataset.answer);
      if (answerIndex === item.answer) option.classList.add('correct');
      else if (answerIndex === selected) option.classList.add('incorrect');
    });
    const feedback = document.querySelector('#quiz-feedback');
    feedback.textContent = `${selected === item.answer ? 'Exactly right!' : 'Not quite, and that’s okay.'} ${item.detail}`;
    const nextButton = document.createElement('button');
    nextButton.className = 'quiz-next';
    nextButton.id = 'quiz-next';
    nextButton.innerHTML = 'Next question <span aria-hidden="true">→</span>';
    nextButton.addEventListener('click', nextQuestion);
    document.querySelector('.quiz-panel').append(nextButton);
  }));
  const nextButton = document.querySelector('#quiz-next');
  if (nextButton) nextButton.addEventListener('click', nextQuestion);
}

function nextQuestion() {
  quizIndex += 1;
  quizAnswered = false;
  renderQuiz();
}

function switchView(name) {
  currentView = name;
  document.querySelectorAll('.nav-item').forEach((button) => {
    const active = button.dataset.view === name;
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  if (name === 'tutor') renderTutor();
  if (name === 'cards') renderCards();
  if (name === 'quiz') renderQuiz();
  setGoalProgress();
}

document.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => switchView(button.dataset.view)));
document.querySelector('#today-date').textContent = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date());
setGoalProgress();
switchView('tutor');

fetch('/api/status')
  .then((response) => response.json())
  .then((status) => {
    geminiConfigured = Boolean(status.geminiConfigured);
    statusLabel.textContent = geminiConfigured ? 'Gemini tutor connected' : 'Demo tutor active';
    statusLabel.previousElementSibling.style.background = geminiConfigured ? '#8cb68c' : '#d2a372';
    if (currentView === 'tutor') renderTutor();
  })
  .catch(() => {
    statusLabel.textContent = 'Tutor unavailable';
    if (currentView === 'tutor') renderTutor();
  });