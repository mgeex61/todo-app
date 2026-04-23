let currentFilter = "all";
let currentSearch = "";
let celebrationShown = false;
let draggedTaskIndex = null;
let audioContext = null;
let timeInterval = null;

function getAppData() {
  return JSON.parse(localStorage.getItem("todoAppData")) || {
    profileName: "",
    currentListId: "default",
    lists: [
      {
        id: "default",
        name: "Meine Liste",
        tasks: []
      }
    ]
  };
}

function saveAppData(data) {
  localStorage.setItem("todoAppData", JSON.stringify(data));
}

function normalizeTasks(tasks) {
  return (tasks || []).map((task) => ({
    title: task.title || "",
    open: Boolean(task.open),
    editing: Boolean(task.editing),
    subtasks: (task.subtasks || []).map((subtask) => {
      if (typeof subtask === "string") {
        return {
          text: subtask,
          done: false,
          editing: false
        };
      }

      return {
        text: subtask.text || "",
        done: Boolean(subtask.done),
        editing: Boolean(subtask.editing)
      };
    })
  }));
}

function getCurrentList() {
  const data = getAppData();

  if (!data.lists || data.lists.length === 0) {
    data.lists = [{ id: "default", name: "Meine Liste", tasks: [] }];
    data.currentListId = "default";
    saveAppData(data);
  }

  let list = data.lists.find((item) => item.id === data.currentListId);

  if (!list) {
    list = data.lists[0];
    data.currentListId = list.id;
    saveAppData(data);
  }

  list.tasks = normalizeTasks(list.tasks);
  return list;
}

function updateCurrentListTasks(tasks) {
  const data = getAppData();
  const index = data.lists.findIndex((item) => item.id === data.currentListId);
  if (index === -1) return;
  data.lists[index].tasks = normalizeTasks(tasks);
  saveAppData(data);
}

function renderListSelector() {
  const data = getAppData();
  const select = document.getElementById("listSelect");
  if (!select) return;

  select.innerHTML = "";

  data.lists.forEach((list) => {
    const option = document.createElement("option");
    option.value = list.id;
    option.textContent = list.name;
    option.selected = list.id === data.currentListId;
    select.appendChild(option);
  });
}

function createNewList() {
  const name = prompt("Wie soll die neue Liste heißen?");
  if (!name || !name.trim()) return;

  const data = getAppData();
  const newList = {
    id: `list-${Date.now()}`,
    name: name.trim(),
    tasks: []
  };

  data.lists.push(newList);
  data.currentListId = newList.id;
  saveAppData(data);
  renderListSelector();
  loadTasks();
}

function deleteCurrentList() {
  const data = getAppData();

  if (data.lists.length <= 1) {
    alert("Du brauchst mindestens eine Liste.");
    return;
  }

  const currentList = data.lists.find((item) => item.id === data.currentListId);
  if (!currentList) return;

  const confirmed = confirm(`Liste "${currentList.name}" wirklich löschen?`);
  if (!confirmed) return;

  data.lists = data.lists.filter((item) => item.id !== data.currentListId);
  data.currentListId = data.lists[0].id;
  saveAppData(data);
  renderListSelector();
  loadTasks();
}

function saveProfileAndClose() {
  const name = document.getElementById("nameInput").value.trim();
  const data = getAppData();
  data.profileName = name;
  saveAppData(data);
  closeWelcome();
  updateProfileTexts();
}

function closeWelcome() {
  const welcomeCard = document.getElementById("welcomeCard");
  if (welcomeCard) {
    welcomeCard.classList.add("hidden");
  }
  localStorage.setItem("welcomeSeen", "true");
}

function loadWelcomeState() {
  const welcomeSeen = localStorage.getItem("welcomeSeen");
  const welcomeCard = document.getElementById("welcomeCard");
  if (welcomeSeen === "true" && welcomeCard) {
    welcomeCard.classList.add("hidden");
  }
}

function updateProfileTexts() {
  const data = getAppData();
  const name = (data.profileName || "").trim();

  document.getElementById("mainTitle").textContent = name
    ? `${name}s To-Do Liste`
    : "Meine To-Do Liste";

  document.getElementById("subHeadline").textContent = name
    ? `Willkommen ${name}. Klar. Einfach. Fokus auf das, was wichtig ist.`
    : "Klar. Einfach. Fokus auf das, was wichtig ist.";
}

function playDoneSound() {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(650, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(980, audioContext.currentTime + 0.12);

    gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.05, audioContext.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.16);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.16);
  } catch (error) {
    console.log("Sound konnte nicht abgespielt werden.");
  }
}

function addTask() {
  const input = document.getElementById("taskInput");
  const taskText = input.value.trim();
  if (!taskText) return;

  const list = getCurrentList();
  list.tasks.push({
    title: taskText,
    subtasks: [],
    open: false,
    editing: false
  });

  updateCurrentListTasks(list.tasks);
  input.value = "";
  loadTasks();
}

function deleteTask(taskIndex) {
  const list = getCurrentList();
  list.tasks.splice(taskIndex, 1);
  updateCurrentListTasks(list.tasks);
  loadTasks();
}

function toggleTask(taskIndex) {
  const list = getCurrentList();
  list.tasks[taskIndex].open = !list.tasks[taskIndex].open;
  updateCurrentListTasks(list.tasks);
  loadTasks();
}

function startEditTask(taskIndex) {
  const list = getCurrentList();
  list.tasks[taskIndex].editing = true;
  updateCurrentListTasks(list.tasks);
  loadTasks();
}

function cancelEditTask(taskIndex) {
  const list = getCurrentList();
  list.tasks[taskIndex].editing = false;
  updateCurrentListTasks(list.tasks);
  loadTasks();
}

function saveTaskEdit(taskIndex) {
  const input = document.getElementById(`edit-task-input-${taskIndex}`);
  if (!input) return;

  const newText = input.value.trim();
  if (!newText) return;

  const list = getCurrentList();
  list.tasks[taskIndex].title = newText;
  list.tasks[taskIndex].editing = false;
  updateCurrentListTasks(list.tasks);
  loadTasks();
}

function addSubtask(taskIndex) {
  const input = document.getElementById(`subtask-input-${taskIndex}`);
  if (!input) return;

  const subtaskText = input.value.trim();
  if (!subtaskText) return;

  const list = getCurrentList();
  list.tasks[taskIndex].subtasks.push({
    text: subtaskText,
    done: false,
    editing: false
  });

  updateCurrentListTasks(list.tasks);
  input.value = "";
  loadTasks();
}

function deleteSubtask(taskIndex, subtaskIndex) {
  const list = getCurrentList();
  list.tasks[taskIndex].subtasks.splice(subtaskIndex, 1);
  updateCurrentListTasks(list.tasks);
  loadTasks();
}

function toggleSubtaskDone(taskIndex, subtaskIndex) {
  const list = getCurrentList();
  const subtask = list.tasks[taskIndex].subtasks[subtaskIndex];
  subtask.done = !subtask.done;

  if (subtask.done) {
    playDoneSound();
  }

  updateCurrentListTasks(list.tasks);
  loadTasks();
}

function startEditSubtask(taskIndex, subtaskIndex) {
  const list = getCurrentList();
  list.tasks[taskIndex].subtasks[subtaskIndex].editing = true;
  updateCurrentListTasks(list.tasks);
  loadTasks();
}

function cancelEditSubtask(taskIndex, subtaskIndex) {
  const list = getCurrentList();
  list.tasks[taskIndex].subtasks[subtaskIndex].editing = false;
  updateCurrentListTasks(list.tasks);
  loadTasks();
}

function saveSubtaskEdit(taskIndex, subtaskIndex) {
  const input = document.getElementById(`edit-subtask-input-${taskIndex}-${subtaskIndex}`);
  if (!input) return;

  const newText = input.value.trim();
  if (!newText) return;

  const list = getCurrentList();
  list.tasks[taskIndex].subtasks[subtaskIndex].text = newText;
  list.tasks[taskIndex].subtasks[subtaskIndex].editing = false;
  updateCurrentListTasks(list.tasks);
  loadTasks();
}

function moveTask(fromIndex, toIndex) {
  const list = getCurrentList();

  if (
    fromIndex === null ||
    toIndex === null ||
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0
  ) {
    return;
  }

  const movedItem = list.tasks.splice(fromIndex, 1)[0];
  list.tasks.splice(toIndex, 0, movedItem);

  updateCurrentListTasks(list.tasks);
  loadTasks();
}

function updateStats(tasks) {
  const taskCount = tasks.length;
  let subtaskCount = 0;
  let doneCount = 0;

  tasks.forEach((task) => {
    subtaskCount += task.subtasks.length;
    task.subtasks.forEach((subtask) => {
      if (subtask.done) doneCount++;
    });
  });

  document.getElementById("taskCount").textContent = taskCount;
  document.getElementById("subtaskCount").textContent = subtaskCount;
  document.getElementById("doneCount").textContent = doneCount;

  const progressPercent = subtaskCount === 0 ? 0 : Math.round((doneCount / subtaskCount) * 100);
  document.getElementById("progressText").textContent = `${progressPercent}%`;
  document.getElementById("progressFill").style.width = `${progressPercent}%`;

  handleCelebration(progressPercent, subtaskCount);
}

function handleCelebration(progressPercent, subtaskCount) {
  if (progressPercent === 100 && subtaskCount > 0 && !celebrationShown) {
    celebrationShown = true;
    showCelebration();
  }

  if (progressPercent < 100) {
    celebrationShown = false;
  }
}

function showCelebration() {
  const overlay = document.getElementById("celebrationOverlay");
  overlay.classList.add("show");
  spawnConfetti();

  setTimeout(() => {
    overlay.classList.remove("show");
  }, 1800);
}

function spawnConfetti() {
  const layer = document.getElementById("confettiLayer");
  if (!layer) return;

  const emojis = ["🎉", "✨", "🥳", "🎊"];
  layer.innerHTML = "";

  for (let i = 0; i < 18; i++) {
    const confetti = document.createElement("div");
    confetti.className = "confetti";
    confetti.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    confetti.style.left = `${Math.random() * 100}%`;
    confetti.style.animationDuration = `${2 + Math.random()}s`;
    confetti.style.fontSize = `${18 + Math.random() * 10}px`;
    layer.appendChild(confetti);
  }

  setTimeout(() => {
    layer.innerHTML = "";
  }, 2600);
}

function updateDateTime() {
  const now = new Date();

  document.getElementById("currentDate").textContent = now.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  document.getElementById("currentTime").textContent = now.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function toggleTheme() {
  document.body.classList.toggle("dark");
  const isDark = document.body.classList.contains("dark");
  localStorage.setItem("theme", isDark ? "dark" : "light");
  document.getElementById("themeToggle").textContent = isDark ? "☀️" : "🌙";
}

function loadTheme() {
  const savedTheme = localStorage.getItem("theme");
  const isDark = savedTheme === "dark";

  document.body.classList.toggle("dark", isDark);
  document.getElementById("themeToggle").textContent = isDark ? "☀️" : "🌙";
}

function setupGlobalInputs() {
  document.getElementById("taskInput").addEventListener("keydown", (event) => {
    if (event.key === "Enter") addTask();
  });

  document.getElementById("searchInput").addEventListener("input", (event) => {
    currentSearch = event.target.value.toLowerCase();
    loadTasks();
  });

  document.getElementById("listSelect").addEventListener("change", (event) => {
    const data = getAppData();
    data.currentListId = event.target.value;
    saveAppData(data);
    loadTasks();
  });

  document.getElementById("nameInput").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      saveProfileAndClose();
    }
  });
}

function setupFilterButtons() {
  const buttons = document.querySelectorAll(".filter-btn");

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      buttons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      currentFilter = button.dataset.filter;
      loadTasks();
    });
  });
}

function setupDynamicEnterListeners() {
  document.querySelectorAll("[id^='subtask-input-']").forEach((input) => {
    input.onkeydown = (event) => {
      if (event.key === "Enter") {
        addSubtask(Number(input.id.split("-").pop()));
      }
    };
  });

  document.querySelectorAll("[id^='edit-task-input-']").forEach((input) => {
    input.onkeydown = (event) => {
      if (event.key === "Enter") {
        saveTaskEdit(Number(input.id.split("-").pop()));
      }
    };
  });

  document.querySelectorAll("[id^='edit-subtask-input-']").forEach((input) => {
    input.onkeydown = (event) => {
      if (event.key === "Enter") {
        const parts = input.id.split("-");
        saveSubtaskEdit(Number(parts[3]), Number(parts[4]));
      }
    };
  });
}

function taskMatchesFilter(task) {
  if (currentFilter === "all") return true;

  const subtasks = task.subtasks || [];
  const hasOpen = subtasks.some((subtask) => !subtask.done);

  if (currentFilter === "done") {
    return subtasks.length > 0 && !hasOpen;
  }

  if (currentFilter === "open") {
    return subtasks.length === 0 || hasOpen;
  }

  return true;
}

function taskMatchesSearch(task) {
  if (!currentSearch) return true;

  const titleMatch = task.title.toLowerCase().includes(currentSearch);
  const subtaskMatch = task.subtasks.some((subtask) =>
    subtask.text.toLowerCase().includes(currentSearch)
  );

  return titleMatch || subtaskMatch;
}

function createEmptyState() {
  const taskList = document.getElementById("taskList");
  taskList.innerHTML = `
    <div class="empty-state">
      <div class="empty-emoji">☁️</div>
      <h2>Nichts gefunden.</h2>
      <p>Versuch eine andere Suche oder füge neue Aufgaben hinzu.</p>
    </div>
  `;
}

function loadTasks() {
  renderListSelector();

  const taskList = document.getElementById("taskList");
  taskList.innerHTML = "";

  const list = getCurrentList();
  const tasks = normalizeTasks(list.tasks);
  updateCurrentListTasks(tasks);
  updateStats(tasks);

  const visibleTasks = tasks
    .map((task, originalIndex) => ({ task, originalIndex }))
    .filter(({ task }) => taskMatchesFilter(task) && taskMatchesSearch(task));

  if (visibleTasks.length === 0) {
    createEmptyState();
    return;
  }

  visibleTasks.forEach(({ task, originalIndex }) => {
    const taskCard = document.createElement("div");
    taskCard.className = "task-card";
    taskCard.draggable = true;

    taskCard.addEventListener("dragstart", () => {
      draggedTaskIndex = originalIndex;
      taskCard.classList.add("dragging");
    });

    taskCard.addEventListener("dragend", () => {
      draggedTaskIndex = null;
      taskCard.classList.remove("dragging");
      document.querySelectorAll(".task-card").forEach((card) => card.classList.remove("drag-over"));
    });

    taskCard.addEventListener("dragover", (event) => {
      event.preventDefault();
      taskCard.classList.add("drag-over");
    });

    taskCard.addEventListener("dragleave", () => {
      taskCard.classList.remove("drag-over");
    });

    taskCard.addEventListener("drop", () => {
      taskCard.classList.remove("drag-over");
      moveTask(draggedTaskIndex, originalIndex);
    });

    const taskHeader = document.createElement("div");
    taskHeader.className = "task-header";

    const titleBtn = document.createElement("button");
    titleBtn.className = "task-title-btn";
    titleBtn.textContent = task.open ? `▼ ${task.title}` : `▶ ${task.title}`;
    titleBtn.onclick = () => toggleTask(originalIndex);

    const editBtn = document.createElement("button");
    editBtn.className = "icon-btn edit-btn";
    editBtn.textContent = "✎";
    editBtn.onclick = () => startEditTask(originalIndex);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "icon-btn delete-btn";
    deleteBtn.textContent = "✕";
    deleteBtn.onclick = () => deleteTask(originalIndex);

    taskHeader.appendChild(titleBtn);
    taskHeader.appendChild(editBtn);
    taskHeader.appendChild(deleteBtn);
    taskCard.appendChild(taskHeader);

    if (task.editing) {
      const editRow = document.createElement("div");
      editRow.className = "edit-row";

      const editInput = document.createElement("input");
      editInput.className = "edit-input";
      editInput.id = `edit-task-input-${originalIndex}`;
      editInput.value = task.title;

      const saveBtn = document.createElement("button");
      saveBtn.className = "save-btn";
      saveBtn.textContent = "Speichern";
      saveBtn.onclick = () => saveTaskEdit(originalIndex);

      const cancelBtn = document.createElement("button");
      cancelBtn.className = "cancel-btn";
      cancelBtn.textContent = "Abbrechen";
      cancelBtn.onclick = () => cancelEditTask(originalIndex);

      editRow.appendChild(editInput);
      editRow.appendChild(saveBtn);
      editRow.appendChild(cancelBtn);
      taskCard.appendChild(editRow);
    }

    if (task.open) {
      const subtaskArea = document.createElement("div");
      subtaskArea.className = "subtask-area";

      const subtaskRow = document.createElement("div");
      subtaskRow.className = "subtask-row";

      const subtaskInput = document.createElement("input");
      subtaskInput.type = "text";
      subtaskInput.placeholder = "Unterpunkt hinzufügen...";
      subtaskInput.id = `subtask-input-${originalIndex}`;

      const addSubtaskBtn = document.createElement("button");
      addSubtaskBtn.className = "subtask-add-btn";
      addSubtaskBtn.textContent = "+";
      addSubtaskBtn.onclick = () => addSubtask(originalIndex);

      subtaskRow.appendChild(subtaskInput);
      subtaskRow.appendChild(addSubtaskBtn);
      subtaskArea.appendChild(subtaskRow);

      task.subtasks.forEach((subtask, subtaskIndex) => {
        if (subtask.editing) {
          const editSubtaskRow = document.createElement("div");
          editSubtaskRow.className = "subtask-edit-row";

          const editInput = document.createElement("input");
          editInput.className = "edit-input";
          editInput.id = `edit-subtask-input-${originalIndex}-${subtaskIndex}`;
          editInput.value = subtask.text;

          const saveBtn = document.createElement("button");
          saveBtn.className = "save-btn";
          saveBtn.textContent = "Speichern";
          saveBtn.onclick = () => saveSubtaskEdit(originalIndex, subtaskIndex);

          const cancelBtn = document.createElement("button");
          cancelBtn.className = "cancel-btn";
          cancelBtn.textContent = "Abbrechen";
          cancelBtn.onclick = () => cancelEditSubtask(originalIndex, subtaskIndex);

          editSubtaskRow.appendChild(editInput);
          editSubtaskRow.appendChild(saveBtn);
          editSubtaskRow.appendChild(cancelBtn);
          subtaskArea.appendChild(editSubtaskRow);
        } else {
          const subtaskItem = document.createElement("div");
          subtaskItem.className = subtask.done ? "subtask-item done" : "subtask-item";

          const left = document.createElement("div");
          left.className = "subtask-left";

          const checkCircle = document.createElement("div");
          checkCircle.className = subtask.done ? "check-circle checked" : "check-circle";
          checkCircle.onclick = () => toggleSubtaskDone(originalIndex, subtaskIndex);

          const subtaskText = document.createElement("span");
          subtaskText.className = subtask.done ? "subtask-text checked-text" : "subtask-text";
          subtaskText.textContent = subtask.text;

          const actions = document.createElement("div");
          actions.className = "subtask-actions";

          const subtaskEditBtn = document.createElement("button");
          subtaskEditBtn.className = "subtask-small-btn subtask-edit-btn";
          subtaskEditBtn.textContent = "✎";
          subtaskEditBtn.onclick = () => startEditSubtask(originalIndex, subtaskIndex);

          const subtaskDeleteBtn = document.createElement("button");
          subtaskDeleteBtn.className = "subtask-small-btn subtask-delete-btn";
          subtaskDeleteBtn.textContent = "✕";
          subtaskDeleteBtn.onclick = () => deleteSubtask(originalIndex, subtaskIndex);

          left.appendChild(checkCircle);
          left.appendChild(subtaskText);

          actions.appendChild(subtaskEditBtn);
          actions.appendChild(subtaskDeleteBtn);

          subtaskItem.appendChild(left);
          subtaskItem.appendChild(actions);
          subtaskArea.appendChild(subtaskItem);
        }
      });

      taskCard.appendChild(subtaskArea);
    }

    taskList.appendChild(taskCard);
  });

  setupDynamicEnterListeners();
}

function initTime() {
  updateDateTime();
  if (timeInterval) clearInterval(timeInterval);
  timeInterval = setInterval(updateDateTime, 60000);
}

loadTheme();
loadWelcomeState();
updateProfileTexts();
renderListSelector();
initTime();
setupGlobalInputs();
setupFilterButtons();
loadTasks();
