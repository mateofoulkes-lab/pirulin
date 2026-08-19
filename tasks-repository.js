import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js";

const SHARED_TASKS_PATH = ["shared", "tasks", "items"];

function requireFirebase() {
  const state = window.PirulinFirebase;
  if (!state?.db || !state?.user || !state?.person) {
    throw new Error("Pirulín todavía no terminó de autenticar.");
  }
  return state;
}

function privateTasksCollection() {
  const { db, user } = requireFirebase();
  return collection(db, "users", user.uid, "tasks");
}

function sharedTasksCollection() {
  const { db } = requireFirebase();
  return collection(db, ...SHARED_TASKS_PATH);
}

function normalizeTask(input = {}) {
  const now = Date.now();
  const state = window.PirulinFirebase;
  const createdBy = input.createdBy || state?.person || null;
  const createdByUid = input.createdByUid || state?.user?.uid || null;
  const reminder = input.reminderMinutes;

  return {
    id: String(input.id || `task-${now}-${Math.random().toString(36).slice(2, 8)}`),
    title: String(input.title || "").trim(),
    categoryId: input.categoryId || null,
    categoryName: input.categoryName || null,
    date: input.date || null,
    time: input.time || null,
    reminderMinutes: Number.isFinite(Number(reminder)) && Number(reminder) >= 0 ? Number(reminder) : null,
    repeat: input.repeat || { type: "none", days: [] },
    persistent: !!input.persistent,
    shared: !!input.shared,
    createdBy,
    createdByUid,
    completed: !!input.completed,
    notes: input.notes || null,
    link: input.link || null,
    parentId: input.parentId || null,
    order: Number.isFinite(Number(input.order)) ? Number(input.order) : 0,
    subtasks: Array.isArray(input.subtasks) ? input.subtasks : [],
    updatedAtClient: now
  };
}

function taskDocRef(task) {
  const normalized = normalizeTask(task);
  const base = normalized.shared ? sharedTasksCollection() : privateTasksCollection();
  return { normalized, ref: doc(base, normalized.id) };
}

async function saveTask(task) {
  const { normalized, ref } = taskDocRef(task);
  if (!normalized.title) throw new Error("La tarea necesita título.");

  await setDoc(ref, {
    ...normalized,
    updatedAt: serverTimestamp()
  }, { merge: true });

  return normalized;
}

async function deleteTask(task) {
  const { ref } = taskDocRef(task);
  await deleteDoc(ref);
}

async function moveTaskBetweenScopes(task, shared) {
  const oldTask = normalizeTask(task);
  const oldRef = taskDocRef(oldTask).ref;
  const nextTask = { ...oldTask, shared: !!shared };
  const nextRef = taskDocRef(nextTask).ref;

  if (oldRef.path === nextRef.path) {
    return saveTask(nextTask);
  }

  await setDoc(nextRef, {
    ...nextTask,
    updatedAt: serverTimestamp()
  }, { merge: true });
  await deleteDoc(oldRef);
  return nextTask;
}

function subscribeTasks({ onChange, onError } = {}) {
  const privateItems = new Map();
  const sharedItems = new Map();
  let privateReady = false;
  let sharedReady = false;

  const emit = () => {
    if (!privateReady || !sharedReady) return;
    const tasks = [...privateItems.values(), ...sharedItems.values()]
      .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
    onChange?.(tasks);
  };

  const unsubPrivate = onSnapshot(
    privateTasksCollection(),
    snapshot => {
      privateItems.clear();
      snapshot.forEach(item => privateItems.set(item.id, { ...item.data(), id: item.id, shared: false }));
      privateReady = true;
      emit();
    },
    error => onError?.(error)
  );

  const unsubShared = onSnapshot(
    sharedTasksCollection(),
    snapshot => {
      sharedItems.clear();
      snapshot.forEach(item => sharedItems.set(item.id, { ...item.data(), id: item.id, shared: true }));
      sharedReady = true;
      emit();
    },
    error => onError?.(error)
  );

  return () => {
    unsubPrivate();
    unsubShared();
  };
}

window.PirulinTasks = {
  normalizeTask,
  saveTask,
  deleteTask,
  moveTaskBetweenScopes,
  subscribeTasks
};

export {
  normalizeTask,
  saveTask,
  deleteTask,
  moveTaskBetweenScopes,
  subscribeTasks
};
