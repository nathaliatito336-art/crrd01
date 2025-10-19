// script.js - IndexedDB-backed app with GM erase-show-password functionality

// ---------- IndexedDB setup ----------

const DB_NAME = "CrownReportsDB";

const DB_VERSION = 1;

let db = null;

function openDatabase() {

  return new Promise((resolve, reject) => {

    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onerror = (e) => reject(e.target.error);

    req.onupgradeneeded = (e) => {

      const _db = e.target.result;

      if (!_db.objectStoreNames.contains("reports")) {

        const store = _db.createObjectStore("reports", { keyPath: "id" });

        store.createIndex("username", "username", { unique: false });

        store.createIndex("dept", "dept", { unique: false });

        store.createIndex("date", "date", { unique: false });

      }

      if (!_db.objectStoreNames.contains("images")) {

        const istore = _db.createObjectStore("images", { keyPath: "id" });

        istore.createIndex("reportId", "reportId", { unique: false });

      }

    };

    req.onsuccess = (e) => {

      db = e.target.result;

      resolve(db);

    };

  });

}

// ---------- localStorage users ----------

const getUsers = () => JSON.parse(localStorage.getItem("users") || "[]");

const saveUsers = (u) => localStorage.setItem("users", JSON.stringify(u));

const getActiveUser = () => JSON.parse(localStorage.getItem("activeUser") || "null");

const setActiveUser = (u) => localStorage.setItem("activeUser", JSON.stringify(u));

// ---------- DOM ----------

const qs = s => document.querySelector(s);

const loginSection = qs("#loginSection");

const registerSection = qs("#registerSection");

const profileSection = qs("#profileSection");

const loginUsername = qs("#loginUsername");

const loginPassword = qs("#loginPassword");

const loginBtn = qs("#loginBtn");

const regUsername = qs("#regUsername");

const regPassword = qs("#regPassword");

const regDept = qs("#regDept");

const gmCode = qs("#gmCode");

const gmCodeContainer = qs("#gmCodeContainer");

const registerBtn = qs("#registerBtn");

const toRegister = qs("#toRegister");

const toLogin = qs("#toLogin");

const displayUsername = qs("#displayUsername");

const displayDept = qs("#displayDept");

const profileImg = qs("#profileImg");

const uploadPic = qs("#uploadPic");

const logoutBtn = qs("#logoutBtn");

const activityDate = qs("#activityDate");

const activityInput = qs("#activityInput");

const activityImages = qs("#activityImages");

const addActivity = qs("#addActivity");

const clearForm = qs("#clearForm");

const progressFill = qs("#progressFill");

const reportsList = qs("#reportsList");

const filterDept = qs("#filterDept");

const fromDate = qs("#fromDate");

const toDate = qs("#toDate");

const searchText = qs("#searchText");

const filterReportsBtn = qs("#filterReports");

const clearFiltersBtn = qs("#clearFilters");

const gmEraseContainer = qs("#gmEraseContainer");

const eraseSelect = qs("#eraseSelect");

const eraseUserBtn = qs("#eraseUserBtn");

const eraseInfo = qs("#eraseInfo");

const eraseUsername = qs("#eraseUsername");

const eraseDept = qs("#eraseDept");

const erasePassword = qs("#erasePassword");

// ---------- Navigation ----------

toRegister.addEventListener("click", e => { e.preventDefault(); loginSection.classList.add("hidden"); registerSection.classList.remove("hidden"); });

toLogin.addEventListener("click", e => { e.preventDefault(); registerSection.classList.add("hidden"); loginSection.classList.remove("hidden"); });

regDept.addEventListener("change", e => gmCodeContainer.classList.toggle("hidden", e.target.value !== "GM"));

// ---------- Register ----------

registerBtn.addEventListener("click", () => {

  const u = regUsername.value.trim();

  const p = regPassword.value.trim();

  const d = regDept.value;

  const gm = (gmCode && gmCode.value || "").trim();

  if (!u || !p || !d) return alert("Fill all fields.");

  if (d === "GM" && gm !== "CRRD") return alert("Invalid GM code.");

  const users = getUsers();

  if (users.find(x => x.username === u)) return alert("Username exists.");

  users.push({ username: u, password: p, dept: d, profilePic: "default-profile.png" });

  saveUsers(users);

  alert("Registered. Please login.");

  regUsername.value = regPassword.value = ""; regDept.value = ""; if (gmCode) gmCode.value = "";

  registerSection.classList.add("hidden");

  loginSection.classList.remove("hidden");

});

// ---------- Login ----------

loginBtn.addEventListener("click", () => {

  const u = loginUsername.value.trim();

  const p = loginPassword.value.trim();

  const users = getUsers();

  const user = users.find(x => x.username === u && x.password === p);

  if (!user) return alert("Invalid login.");

  setActiveUser(user);

  loginUsername.value = loginPassword.value = "";

  initUIForActiveUser(user);

});

// ---------- Profile picture ----------

profileImg.addEventListener("click", () => uploadPic.click());

uploadPic.addEventListener("change", () => {

  const file = uploadPic.files && uploadPic.files[0];

  if (!file) return;

  const fr = new FileReader();

  fr.onload = () => {

    const users = getUsers();

    const active = getActiveUser();

    const idx = users.findIndex(u => u.username === active.username);

    if (idx !== -1) {

      users[idx].profilePic = fr.result;

      saveUsers(users);

      setActiveUser(users[idx]);

      profileImg.src = fr.result;

    }

  };

  fr.readAsDataURL(file);

});

// ---------- IndexedDB helpers ----------

function addReportToDB(report) {

  return new Promise((resolve, reject) => {

    const tx = db.transaction("reports", "readwrite");

    const store = tx.objectStore("reports");

    const req = store.add(report);

    req.onsuccess = () => resolve(req.result);

    req.onerror = e => reject(e.target.error);

  });

}

function getAllReportsFromDB() {

  return new Promise((resolve, reject) => {

    const tx = db.transaction("reports", "readonly");

    const store = tx.objectStore("reports");

    const req = store.getAll();

    req.onsuccess = () => resolve(req.result || []);

    req.onerror = e => reject(e.target.error);

  });

}

function deleteReportFromDB(id) {

  return new Promise((resolve, reject) => {

    const tx = db.transaction("reports", "readwrite");

    const store = tx.objectStore("reports");

    const req = store.delete(id);

    req.onsuccess = () => resolve();

    req.onerror = e => reject(e.target.error);

  });

}

function addImageToDB(imageObj) {

  return new Promise((resolve, reject) => {

    const tx = db.transaction("images", "readwrite");

    const store = tx.objectStore("images");

    const req = store.add(imageObj);

    req.onsuccess = () => resolve(req.result);

    req.onerror = e => reject(e.target.error);

  });

}

function getImagesByReportId(reportId) {

  return new Promise((resolve, reject) => {

    const tx = db.transaction("images", "readonly");

    const store = tx.objectStore("images");

    const req = store.getAll();

    req.onsuccess = e => {

      const all = e.target.result || [];

      resolve(all.filter(i => String(i.reportId) === String(reportId)));

    };

    req.onerror = e => reject(e.target.error);

  });

}

function deleteImagesByReportId(reportId) {

  return new Promise((resolve, reject) => {

    const tx = db.transaction("images", "readwrite");

    const store = tx.objectStore("images");

    const req = store.getAll();

    req.onsuccess = e => {

      const all = e.target.result || [];

      const toDelete = all.filter(i => String(i.reportId) === String(reportId));

      toDelete.forEach(item => store.delete(item.id));

    };

    req.onerror = e => reject(e.target.error);

    tx.oncomplete = () => resolve();

    tx.onerror = () => resolve();

  });

}

function deleteImagesByUsername(username) {

  return new Promise((resolve, reject) => {

    getAllReportsFromDB().then(all => {

      const userReports = all.filter(r => r.username === username);

      const ids = userReports.map(r => r.id);

      const promises = ids.map(id => deleteImagesByReportId(id));

      Promise.all(promises).then(() => resolve()).catch(reject);

    }).catch(reject);

  });

}

// ---------- Utilities ----------

const uid = () => Date.now() + "_" + Math.random().toString(36).slice(2,9);

function escapeHtml(s) {

  if (s === null || s === undefined) return "";

  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");

}

// ---------- Submit report ----------

addActivity.addEventListener("click", async () => {

  const active = getActiveUser();

  if (!active) return alert("Please login first.");

  const date = activityDate.value;

  const text = activityInput.value.trim();

  const files = Array.from(activityImages.files || []);

  if (!date) return alert("Select a date.");

  if (!text && files.length === 0) return alert("Enter details or attach images.");

  const reportId = uid();

  const report = { id: reportId, username: active.username, dept: active.dept, text, date, createdAt: new Date().toISOString() };

  try {

    await addReportToDB(report);

  } catch (err) {

    console.error("Failed to create report:", err);

    return alert("Failed to create report.");

  }

  if (files.length > 0) {

    progressFill.style.width = "0%";

    for (let i = 0; i < files.length; i++) {

      const file = files[i];

      const imageObj = { id: uid(), reportId, fileName: file.name, blob: file, createdAt: new Date().toISOString() };

      try {

        await addImageToDB(imageObj);

      } catch (err) {

        console.error("Failed to save image:", err);

        alert("Failed to save an image (storage may be full).");

        break;

      }

      progressFill.style.width = `${Math.round(((i+1)/files.length)*100)}%`;

      await new Promise(r => setTimeout(r, 30));

    }

    setTimeout(()=> progressFill.style.width = "0%", 300);

  }

  activityDate.value = "";

  activityInput.value = "";

  activityImages.value = "";

  alert("Report saved.");

  applyFiltersAndLoadReports();

});

// ---------- Render reports ----------

async function loadReportsRaw() {

  if (!db) await openDatabase();

  const reports = await getAllReportsFromDB();

  return reports;

}

async function renderReports(reports) {

  reportsList.innerHTML = "";

  const active = getActiveUser();

  if (!active) return;

  reports.sort((a,b) => (new Date(b.createdAt).getTime() || 0) - (new Date(a.createdAt).getTime() || 0));

  for (const r of reports) {

    if (active.dept !== "GM" && r.username !== active.username) continue;

    const card = document.createElement("div");

    card.className = "report";

    const h = document.createElement("h4");

    h.innerHTML = `${escapeHtml(r.username)} (${escapeHtml(r.dept)}) | ${escapeHtml(r.date)}`;

    card.appendChild(h);

    const p = document.createElement("p");

    p.textContent = r.text || "";

    card.appendChild(p);

    const imgs = await getImagesByReportId(r.id);

    const count = imgs.length;

    const btns = document.createElement("div");

    btns.className = "buttons";

    const viewBtn = document.createElement("button");

    viewBtn.className = "view-attachments";

    viewBtn.textContent = `📎 View Attachments (${count})`;

    viewBtn.addEventListener("click", async () => {

      const existing = card.querySelector(".image-grid");

      if (existing) { existing.remove(); return; }

      if (!imgs || imgs.length === 0) return alert("No attachments for this report.");

      const grid = document.createElement("div"); grid.className = "image-grid";

      for (const imgRec of imgs) {

        const url = URL.createObjectURL(imgRec.blob);

        const imgEl = document.createElement("img");

        imgEl.src = url; imgEl.alt = imgRec.fileName || "attachment";

        imgEl.addEventListener("click", () => {

          const w = window.open("");

          w.document.write(`<html><head><title>Attachment</title></head><body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center"><img src="${url}" style="max-width:100%;max-height:100vh"></body></html>`);

        });

        grid.appendChild(imgEl);

      }

      card.appendChild(grid);

    });

    btns.appendChild(viewBtn);

    if (active.username === r.username || active.dept === "GM") {

      const delBtn = document.createElement("button");

      delBtn.textContent = "Delete";

      delBtn.addEventListener("click", async () => {

        if (!confirm(`Delete report by ${r.username} dated ${r.date}?`)) return;

        try {

          await deleteReportFromDB(r.id);

          await deleteImagesByReportId(r.id);

          applyFiltersAndLoadReports();

        } catch (err) {

          console.error("Delete failed:", err);

          alert("Failed to delete report.");

        }

      });

      btns.appendChild(delBtn);

    }

    card.appendChild(btns);

    reportsList.appendChild(card);

  }

}

// ---------- Filters pipeline ----------

async function applyFiltersAndLoadReports() {

  const all = await loadReportsRaw();

  const dept = filterDept.value || "";

  const fFrom = fromDate.value || "";

  const fTo = toDate.value || "";

  const search = (searchText.value || "").trim().toLowerCase();

  const filtered = all.filter(r => {

    if (dept && r.dept !== dept) return false;

    if (fFrom && r.date < fFrom) return false;

    if (fTo && r.date > fTo) return false;

    if (search) {

      const hay = ((r.text || "") + " " + r.username + " " + r.dept).toLowerCase();

      if (!hay.includes(search)) return false;

    }

    return true;

  });

  await renderReports(filtered);

}

// ---------- GM erase user (with password display) ----------

function setupEraseUsers(user) {

  if (!user || user.dept !== "GM") {

    gmEraseContainer.classList.add("hidden");

    return;

  }

  gmEraseContainer.classList.remove("hidden");

  eraseSelect.innerHTML = '<option value="">Select User</option>';

  getUsers().filter(u => u.username !== user.username).forEach(u => {

    const opt = document.createElement("option");

    opt.value = u.username;

    opt.textContent = `${u.username} (${u.dept})`;

    eraseSelect.appendChild(opt);

  });

  // hide erase info initially

  eraseInfo.classList.add("hidden");

  eraseUsername.value = eraseDept.value = erasePassword.value = "";

}

eraseSelect.addEventListener("change", () => {

  const sel = eraseSelect.value;

  if (!sel) {

    eraseInfo.classList.add("hidden");

    eraseUsername.value = eraseDept.value = erasePassword.value = "";

    return;

  }

  const users = getUsers();

  const u = users.find(x => x.username === sel);

  if (!u) {

    eraseInfo.classList.add("hidden");

    return;

  }

  // show fields with user's details including password (GM-only)

  eraseUsername.value = u.username;

  eraseDept.value = u.dept;

  erasePassword.value = u.password;

  eraseInfo.classList.remove("hidden");

});

eraseUserBtn.addEventListener("click", async () => {

  const sel = eraseSelect.value;

  if (!sel) return alert("Select a user.");

  if (!confirm(`Erase ${sel} and all their data? This cannot be undone.`)) return;

  // remove user from localStorage

  const users = getUsers().filter(u => u.username !== sel);

  saveUsers(users);

  // remove reports & images in DB

  const all = await loadReportsRaw();

  const toRemove = all.filter(r => r.username === sel);

  for (const r of toRemove) {

    await deleteReportFromDB(r.id);

    await deleteImagesByReportId(r.id);

  }

  alert("User and their reports erased.");

  const active = getActiveUser();

  setupEraseUsers(active);

  applyFiltersAndLoadReports();

});

// ---------- UI init for active user ----------

function initUIForActiveUser(user) {

  loginSection.classList.add("hidden");

  registerSection.classList.add("hidden");

  profileSection.classList.remove("hidden");

  displayUsername.textContent = user.username;

  displayDept.textContent = user.dept;

  profileImg.src = user.profilePic || "default-profile.png";

  setupEraseUsers(user);

  applyFiltersAndLoadReports();

}

// logout

logoutBtn.addEventListener("click", () => {

  localStorage.removeItem("activeUser");

  profileSection.classList.add("hidden");

  loginSection.classList.remove("hidden");

});

// filters wiring

filterReportsBtn.addEventListener("click", () => applyFiltersAndLoadReports());

clearFiltersBtn.addEventListener("click", () => {

  filterDept.value = ""; fromDate.value = ""; toDate.value = ""; searchText.value = "";

  applyFiltersAndLoadReports();

});

// initial load

window.addEventListener("DOMContentLoaded", async () => {

  try {

    await openDatabase();

  } catch (err) {

    console.error("Failed to open DB:", err);

    alert("IndexedDB not available in this browser.");

    return;

  }

  const active = getActiveUser();

  if (active) initUIForActiveUser(active);

  else loginSection.classList.remove("hidden");

});