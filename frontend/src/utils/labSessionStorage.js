const DB_NAME = "tuiangfenlei-lab-sessions";
const DB_VERSION = 1;
const DATASET_STORE = "datasets";
const SESSION_PREFIX = "tuiangfenlei:lab-session:";

function sessionKey(experimentId) {
  return `${SESSION_PREFIX}${experimentId}`;
}

export function saveLabSession(experimentId, session) {
  if (typeof window === "undefined" || !experimentId) return;
  window.localStorage.setItem(sessionKey(experimentId), JSON.stringify(session));
}

export function loadLabSession(experimentId) {
  if (typeof window === "undefined" || !experimentId) return null;
  try {
    const raw = window.localStorage.getItem(sessionKey(experimentId));
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn("Lab session restore failed:", error);
    return null;
  }
}

export function clearLabSession(experimentId) {
  if (typeof window === "undefined" || !experimentId) return;
  window.localStorage.removeItem(sessionKey(experimentId));
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("当前浏览器不支持 IndexedDB。"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DATASET_STORE)) {
        db.createObjectStore(DATASET_STORE, { keyPath: "experimentId" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("实验图片存储不可用。"));
  });
}

async function runStore(mode, operation) {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(DATASET_STORE, mode);
      const request = operation(transaction.objectStore(DATASET_STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("实验图片存储失败。"));
    });
  } finally {
    db.close();
  }
}

export function saveLabDatasetFiles(experimentId, classMap, batchTestMap) {
  if (!experimentId) return Promise.resolve();
  return runStore("readwrite", (store) => store.put({
    experimentId,
    savedAt: new Date().toISOString(),
    trainingGroups: classMap.map((group) => ({
      id: group.id,
      name: group.name,
      files: group.files.map((entry) => entry.file || entry)
    })),
    testGroups: batchTestMap.map((group) => ({
      classId: group.classId,
      name: group.name,
      files: group.files.map((entry) => entry.file || entry)
    }))
  }));
}

export function loadLabDatasetFiles(experimentId) {
  if (!experimentId) return Promise.resolve(null);
  return runStore("readonly", (store) => store.get(experimentId));
}

export function clearLabDatasetFiles(experimentId) {
  if (!experimentId) return Promise.resolve();
  return runStore("readwrite", (store) => store.delete(experimentId));
}
