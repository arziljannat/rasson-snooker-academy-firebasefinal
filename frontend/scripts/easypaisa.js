import {
    collection,
    addDoc,
    onSnapshot,
    query,
    where,
    orderBy,
    deleteDoc,
    doc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

async function loadCurrentDayId() {

    const snap = await getDocs(collection(db, "system"));

    snap.forEach(d => {

        const data = d.data();

        if (data.type === "current_day" && data.branch === branch) {
            window.currentDayId = data.day_id;
        }
    });

    console.log("✅ EASY CURRENT DAY ID:", window.currentDayId);
}

const db = window.db;
if (!db) {
    console.error("❌ Firebase DB not loaded");
}

const branch = (localStorage.getItem("branch") || "").toLowerCase();
const role = (localStorage.getItem("role") || "").toLowerCase();
const currentDayId = window.currentDayId;

let easyData = [];

// =========================
// POPUP
// =========================
window.openEasyPopup = () => {
    document.getElementById("easyPopup").classList.remove("hide");
};

window.closeEasyPopup = () => {
    document.getElementById("easyPopup").classList.add("hide");
};

// =========================
// SAVE
// =========================
window.saveEasy = async () => {

    const amount = Number(document.getElementById("easyAmount").value);
    const note = document.getElementById("easyNote").value;

    if (!amount || amount <= 0) {
        alert("Enter valid amount");
        return;
    }

    await addDoc(collection(db, "easypaisa"), {
        amount,
        note,
        branch,
        day_id: window.currentDayId,
        created_at: serverTimestamp()
    });

    document.getElementById("easyAmount").value = "";
    document.getElementById("easyNote").value = "";

    closeEasyPopup();
};

// =========================
// DELETE (ADMIN ONLY)
// =========================
window.deleteEasy = async (id) => {

    if (!confirm("Delete this entry?")) return;

    await deleteDoc(doc(db, "easypaisa", id));
};

// =========================
// EDIT
// =========================
window.editId = null;

window.editEasy = (id, amount, note) => {

   window.editId = id;

    document.getElementById("easyAmount").value = amount;
    document.getElementById("easyNote").value = note;

    openEasyPopup();
};

window.updateEasy = async () => {

    const amount = Number(document.getElementById("easyAmount").value);
    const note = document.getElementById("easyNote").value;

    await updateDoc(doc(db, "easypaisa", window.editId), {
    amount,
    note
});

    window.editId = null;
    closeEasyPopup();
};

// =========================
// KARACHI TIME FORMAT
// =========================
function formatTime(timestamp) {

    if (!timestamp) return "-";

    let date;

    // 🔥 Firebase timestamp handle
    if (timestamp.seconds) {
        date = new Date(timestamp.seconds * 1000);
    } else {
        date = new Date(timestamp);
    }

    return date.toLocaleString("en-PK", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
        timeZone: "Asia/Karachi"
    });
}

// =========================
// RENDER
// =========================
function renderTable() {

    const tbody = document.getElementById("easyTable");
    tbody.innerHTML = "";

    let total = 0;

    easyData.forEach(e => {

        total += Number(e.amount || 0);

        let actions = "";

        if (role === "admin" || role === "super_admin") {
            actions = `
                <button class="btn-green" onclick="editEasy('${e.id}', ${e.amount}, '${e.note || ""}')">Edit</button>
                <button class="btn-red" onclick="deleteEasy('${e.id}')">Delete</button>
            `;
        }

        tbody.innerHTML += `
            <tr>
                <td>${formatTime(e.created_at)}</td>
                <td>${e.amount}</td>
                <td>${e.note || "-"}</td>
                <td>${actions}</td>
            </tr>
        `;
    });

    document.getElementById("todayEasyTotal").innerText = total + " PKR";
}

await loadCurrentDayId();
startEasyListener();
function startEasyListener() {

    if (!window.currentDayId) {
        console.log("⏳ Waiting for Easy Day ID...");
        setTimeout(startEasyListener, 500);
        return;
    }

    console.log("✅ EASY DAY ID READY:", window.currentDayId);

    const q = query(
        collection(db, "easypaisa"),
        where("branch", "==", branch),
        where("day_id", "==", window.currentDayId),
        orderBy("created_at", "desc")
    );

    onSnapshot(q, (snap) => {

        easyData = [];

        snap.forEach(d => {
            easyData.push({ id: d.id, ...d.data() });
        });

        renderTable();
    });
}

startEasyListener();
