import {
    collection,
    addDoc,
    onSnapshot,
    query,
    where,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const db = window.db;

const branch = (localStorage.getItem("branch") || "").toLowerCase();
const currentDayId = Number(localStorage.getItem("currentDayId"));

let easyData = [];

// =========================
// ➕ ADD EASYPAISA
// =========================
window.addEasy = async function () {

    const amount = Number(document.getElementById("amount").value);
    const note = document.getElementById("note").value;

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

    document.getElementById("amount").value = "";
    document.getElementById("note").value = "";
};

// =========================
// REALTIME LOAD
// =========================
const q = query(
    collection(db, "easypaisa"),
    where("branch", "==", branch),
    where("day_id", "==", currentDayId),
    orderBy("created_at", "desc")
);

onSnapshot(q, (snap) => {

    easyData = [];

    snap.forEach(doc => {
        easyData.push(doc.data());
    });

    renderTable();
});

// =========================
// RENDER TABLE
// =========================
function renderTable() {

    const tbody = document.getElementById("easyTable");
    tbody.innerHTML = "";

    easyData.forEach(e => {

        const tr = document.createElement("tr");

        const time = new Date(e.created_at).toLocaleTimeString();

        tr.innerHTML = `
            <td>${time}</td>
            <td>${e.amount}</td>
            <td>${e.note || "-"}</td>
        `;

        tbody.appendChild(tr);
    });
}
