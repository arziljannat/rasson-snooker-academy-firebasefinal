import {
    collection,
    addDoc,
    onSnapshot,
    query,
    where,
    orderBy,
    deleteDoc,
    doc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const db = window.db;
if (!db) {
    console.error("❌ Firebase DB not loaded");
}

const branch = (localStorage.getItem("branch") || "").toLowerCase();
const role = (localStorage.getItem("role") || "").toLowerCase();
const currentDayId = Number(localStorage.getItem("currentDayId"));

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
        day_id: currentDayId,
        created_at: new Date().toISOString()
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
let editId = null;

window.editEasy = (id, amount, note) => {

    editId = id;

    document.getElementById("easyAmount").value = amount;
    document.getElementById("easyNote").value = note;

    openEasyPopup();
};

window.updateEasy = async () => {

    const amount = Number(document.getElementById("easyAmount").value);
    const note = document.getElementById("easyNote").value;

    await updateDoc(doc(db, "easypaisa", editId), {
        amount,
        note
    });

    editId = null;
    closeEasyPopup();
};

// =========================
// REALTIME LOAD
// =========================
const q = query(
    collection(db, "easypaisa"),
    where("branch", "==", branch)
);

onSnapshot(q, (snap) => {

    easyData = [];

    snap.forEach(d => {
        easyData.push({ id: d.id, ...d.data() });
    });

    renderTable();
});

// =========================
// KARACHI TIME FORMAT
// =========================
function formatTime(dateStr) {
    return new Date(dateStr).toLocaleString("en-PK", {
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
