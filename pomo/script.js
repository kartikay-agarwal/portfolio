// Hooman Pomodoro - separated JS
// Features applied:
// - Timestamp-based timer (no drift)
// - Clamped progress ring
// - Non-blocking toast instead of alert
// - Task persistence (localStorage)
// - Improved drag & drop using closest('li')
// - Consistent auto-advance with long break after N sessions
// - Accessibility labels + keyboard shortcuts
// - Theme & variant persistence

(() => {
  // === Storage keys & defaults ===
  const STORAGE = {
    TASKS: 'hooman_tasks_v1',
    SESSIONS: 'hooman_sessions_v1', // stores daily session map
    SETTINGS: 'hooman_settings_v1'
  };

  const defaults = {
    focusTime: 60 * 60, // default 60min; variant buttons will change
    breakTime: 10 * 60,
    longBreakTime: 20 * 60,
    longBreakAfter: 4,
    autoAdvance: true,
    theme: 'pink'
  };

  // === DOM refs ===
  const timerDisplay = document.getElementById('timer');
  const startBtn = document.getElementById('start');
  const stopBtn = document.getElementById('stop');
  const resetBtn = document.getElementById('reset');
  const sessionsDoneEl = document.getElementById('sessions');

  const circle = document.querySelector('.progress-bar');
  const radius = circle.r.baseVal.value;
  const circumference = 2 * Math.PI * radius;
  circle.style.strokeDasharray = circumference;
  circle.style.strokeDashoffset = circumference;

  const toggleMusic = document.getElementById('toggleMusic');
  const toggleTodo = document.getElementById('toggleTodo');
  const toggleStats = document.getElementById('toggleStats');
  const toggleVariants = document.getElementById('toggleVariants');
  const musicPopup = document.getElementById('musicPopup');
  const todoPopup = document.getElementById('todoPopup');
  const statsPopup = document.getElementById('statsPopup');
  const variantsPopup = document.getElementById('variantsPopup');

  const taskInput = document.getElementById('taskInput');
  const addTaskBtn = document.getElementById('addTask');
  const taskList = document.getElementById('taskList');

  const todaySessionsEl = document.getElementById('todaySessions');
  const currentStreakEl = document.getElementById('currentStreak');
  const statsGraph = document.getElementById('statsGraph');

  const variantsBtns = document.querySelectorAll('.variant-btn');
  const themeToggle = document.getElementById('themeToggle');
  const root = document.getElementById('appRoot');

  // Sound
  const beep = new Audio('https://www.soundjay.com/buttons/sounds/beep-07.mp3');

  // Timer state
  let settings = loadSettings();
  let focusTime = settings.focusTime ?? defaults.focusTime;
  let breakTime = settings.breakTime ?? defaults.breakTime;
  let longBreakTime = settings.longBreakTime ?? defaults.longBreakTime;
  let longBreakAfter = settings.longBreakAfter ?? defaults.longBreakAfter;
  let autoAdvance = settings.autoAdvance ?? defaults.autoAdvance;
  let theme = settings.theme ?? defaults.theme;

  let onBreak = false;
  let isRunning = false;
  let sessionCount = 0; // total for current page loaded (will sync with sessions store)
  let timeLeft = focusTime;
  let timerId = null;
  let endTime = null;
  let completedSessionsSinceLong = 0;

  // Initialize UI from persisted settings
  document.body.classList.remove('pink', 'black');
  document.body.classList.add(theme);

  // === Helpers ===
  function saveSettings() {
    const s = { focusTime, breakTime, longBreakTime, longBreakAfter, autoAdvance, theme };
    localStorage.setItem(STORAGE.SETTINGS, JSON.stringify(s));
  }
  function loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE.SETTINGS);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function showToast(msg, ms = 3000) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._hide);
    t._hide = setTimeout(() => t.classList.remove('show'), ms);
  }

  function clampPercent(p) {
    if (!isFinite(p)) return 0;
    return Math.max(0, Math.min(100, p));
  }

  function setProgress(percent) {
    percent = clampPercent(percent);
    circle.style.strokeDashoffset = circumference - (percent / 100) * circumference;
  }

  function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }

  function updateDisplay() {
    timerDisplay.textContent = formatTime(timeLeft);
    const total = onBreak ? breakTime : focusTime;
    const percent = total > 0 ? ((total - timeLeft) / total) * 100 : 0;
    setProgress(percent);
  }

  // === Timestamp-based timer ===
  function startTimer() {
    if (isRunning) return;
    isRunning = true;
    document.querySelector('.timer-panel').classList.add('active');

    endTime = Date.now() + timeLeft * 1000;

    // tick function updates timeLeft from endTime to avoid drift
    function tick() {
      const remainingMs = endTime - Date.now();
      timeLeft = Math.max(0, Math.ceil(remainingMs / 1000));
      updateDisplay();

      if (timeLeft <= 0) {
        clearInterval(timerId);
        timerId = null;
        isRunning = false;
        // play beep if allowed
        beep.play().catch(() => {});
        onPeriodEnd();
      }
    }

    tick();
    timerId = setInterval(tick, 250);
  }

  function stopTimer() {
    if (timerId) { clearInterval(timerId); timerId = null; }
    isRunning = false;
    document.querySelector('.timer-panel').classList.remove('active');
  }

  function resetTimer() {
    stopTimer();
    onBreak = false;
    timeLeft = focusTime;
    updateDisplay();
  }

  // Called when a period (focus or break) ends
  function onPeriodEnd() {
    if (!onBreak) {
      // focus ended -> increment sessions
      sessionCount++;
      completedSessionsSinceLong++;
      sessionsDoneEl.textContent = sessionCount;
      persistSessionForToday();
      updateStatsUI();

      // decide break type
      const useLong = completedSessionsSinceLong >= longBreakAfter;
      onBreak = true;
      timeLeft = useLong ? longBreakTime : breakTime;
      if (useLong) completedSessionsSinceLong = 0;

      showToast('Focus complete! Time for a break. 🎉');
      if (autoAdvance) startTimer();
    } else {
      // break ended -> back to focus
      onBreak = false;
      timeLeft = focusTime;
      showToast('Break over! Back to focus. 💪');
      if (autoAdvance) startTimer();
    }
    updateDisplay();
  }

  // === Persistence: tasks and sessions ===
  function loadTasks() {
    try {
      const raw = localStorage.getItem(STORAGE.TASKS);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }
  function saveTasks(tasks) {
    localStorage.setItem(STORAGE.TASKS, JSON.stringify(tasks));
  }

  function renderTasks() {
    const tasks = loadTasks();
    taskList.innerHTML = '';
    tasks.forEach((t, idx) => {
      const li = document.createElement('li');
      li.dataset.index = idx;

      const text = document.createElement('span');
      text.textContent = t.text;
      if (t.done) li.classList.add('done');

      const btns = document.createElement('div');

      const completeBtn = document.createElement('button');
      completeBtn.textContent = '✔';
      completeBtn.title = 'Mark complete';
      completeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tasks = loadTasks();
        tasks[idx].done = !tasks[idx].done;
        saveTasks(tasks);
        renderTasks();
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '✖';
      deleteBtn.title = 'Delete task';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tasks = loadTasks();
        tasks.splice(idx, 1);
        saveTasks(tasks);
        renderTasks();
      });

      btns.appendChild(completeBtn);
      btns.appendChild(deleteBtn);

      li.appendChild(text);
      li.appendChild(btns);

      li.draggable = true;
      taskList.appendChild(li);
    });
  }

  // Better drag & drop using closest('li') and reordering persisted tasks
  function enableDrag(listEl) {
    let dragged = null;
    listEl.addEventListener('dragstart', (e) => {
      const li = e.target.closest('li');
      if (!li) return;
      dragged = li;
      e.dataTransfer?.setData('text/plain', '');
      setTimeout(() => li.classList.add('dragging'), 0);
    });
    listEl.addEventListener('dragend', (e) => {
      if (dragged) dragged.classList.remove('dragging');
      dragged = null;
    });
    listEl.addEventListener('dragover', (e) => {
      e.preventDefault();
      const after = getDragAfterElement(listEl, e.clientY);
      const dragging = listEl.querySelector('.dragging');
      if (!dragging) return;
      if (after == null) listEl.appendChild(dragging);
      else listEl.insertBefore(dragging, after);
    });
    listEl.addEventListener('drop', (e) => {
      e.preventDefault();
      // update persisted order
      const items = Array.from(listEl.querySelectorAll('li'));
      const tasks = items.map(li => {
        const span = li.querySelector('span');
        const done = li.classList.contains('done');
        return { text: span ? span.textContent : '', done };
      });
      saveTasks(tasks);
      renderTasks();
    });

    function getDragAfterElement(container, y) {
      const elements = [...container.querySelectorAll('li:not(.dragging)')];
      return elements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
          return { offset: offset, element: child };
        } else return closest;
      }, { offset: -Infinity }).element;
    }
  }

  // === Sessions per day (simple) ===
  function loadSessionStore() {
    try {
      const raw = localStorage.getItem(STORAGE.SESSIONS);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }
  function saveSessionStore(store) {
    localStorage.setItem(STORAGE.SESSIONS, JSON.stringify(store));
  }

  function persistSessionForToday() {
    const store = loadSessionStore();
    const today = new Date().toISOString().slice(0, 10);
    store[today] = (store[today] || 0) + 1;
    saveSessionStore(store);
  }

  function updateStatsUI() {
    const store = loadSessionStore();
    const today = new Date().toISOString().slice(0, 10);
    const todaySes = store[today] || 0;
    todaySessionsEl.textContent = todaySes;
    // compute streak: consecutive days with sessions
    const keys = Object.keys(store).sort().reverse(); // newest first
    let streak = 0;
    for (let i = 0; ; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      if (store[key] && store[key] > 0) streak++;
      else break;
    }
    currentStreakEl.textContent = streak;
    // graph last 7 days
    statsGraph.innerHTML = '';
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const val = store[key] || 0;
      const bar = document.createElement('div');
      bar.style.width = '20px';
      bar.style.height = `${Math.min(100, val * 10)}px`;
      bar.style.background = `rgba(255,77,166, ${0.4 + Math.min(1, val / 4) * 0.6})`;
      bar.style.borderRadius = '4px';
      statsGraph.appendChild(bar);
    }
  }

  // === UI wiring ===
  startBtn.addEventListener('click', startTimer);
  stopBtn.addEventListener('click', stopTimer);
  resetBtn.addEventListener('click', resetTimer);

  // Floating popups
  toggleMusic.onclick = () => togglePanel(musicPopup, toggleMusic);
  toggleTodo.onclick = () => togglePanel(todoPopup, toggleTodo);
  toggleStats.onclick = () => togglePanel(statsPopup, toggleStats);
  toggleVariants.onclick = () => togglePanel(variantsPopup, toggleVariants);

  function togglePanel(panel, toggleBtn) {
    const open = panel.classList.toggle('panel-open');
    panel.setAttribute('aria-hidden', !open);
    // close other panels if opened (optional)
  }

  // Theme toggle & persistence
  themeToggle.onclick = () => {
    document.body.classList.toggle('pink');
    document.body.classList.toggle('black');
    theme = document.body.classList.contains('black') ? 'black' : 'pink';
    saveSettings();
    showToast(`Theme: ${theme}`);
  };

  // Variants
  variantsBtns.forEach(btn => {
    btn.onclick = () => {
      focusTime = parseInt(btn.dataset.focus, 10) * 60;
      breakTime = parseInt(btn.dataset.break, 10) * 60;
      timeLeft = focusTime;
      saveSettings();
      updateDisplay();
      showToast(`Set ${btn.textContent} variant`);
    };
  });

  // Tasks
  addTaskBtn.addEventListener('click', () => {
    const t = taskInput.value.trim();
    if (!t) return;
    const tasks = loadTasks();
    tasks.push({ text: t, done: false });
    saveTasks(tasks);
    taskInput.value = '';
    renderTasks();
  });

  // Enter to add task
  taskInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      addTaskBtn.click();
    }
  });

  enableDrag(taskList);

  // click outside to close popups
  document.addEventListener('click', (e) => {
    if (!musicPopup.contains(e.target) && e.target !== toggleMusic) musicPopup.classList.remove('panel-open');
    if (!todoPopup.contains(e.target) && e.target !== toggleTodo) todoPopup.classList.remove('panel-open');
    if (!statsPopup.contains(e.target) && e.target !== toggleStats) statsPopup.classList.remove('panel-open');
    if (!variantsPopup.contains(e.target) && e.target !== toggleVariants) variantsPopup.classList.remove('panel-open');
  });

  // keyboard shortcuts: Space toggles start/stop
  document.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.code === 'Space') {
      // avoid triggering when focused on input elements
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      e.preventDefault();
      if (isRunning) stopTimer(); else startTimer();
    }
    // R to reset
    if (e.key.toLowerCase() === 'r' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      resetTimer();
      showToast('Timer reset');
    }
  });

  // Click-to-play beep permission hint (silent play may be blocked)
  document.addEventListener('click', () => { beep.play().catch(()=>{}); }, { once: true });

  // Initialize session count from today's stored sessions
  function initSessionCount() {
    const store = loadSessionStore();
    const today = new Date().toISOString().slice(0, 10);
    sessionCount = store[today] || 0;
    sessionsDoneEl.textContent = sessionCount;
  }

  // Click outside animations: ensure panels aria-hidden synced
  document.querySelectorAll('.popup-panel').forEach(p => {
    const observer = new MutationObserver(() => p.setAttribute('aria-hidden', !p.classList.contains('panel-open')));
    observer.observe(p, { attributes: true, attributeFilter: ['class'] });
  });

  // Initial render
  renderTasks();
  initSessionCount();
  updateStatsUI();
  updateDisplay();

  // Save settings on unload
  window.addEventListener('beforeunload', saveSettings);
})();
