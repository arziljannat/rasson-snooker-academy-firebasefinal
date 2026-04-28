import {
    collection,
    addDoc,
    onSnapshot,
    query,
    where,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const db = window.db;

const branch = localStorage.getItem("branch");
const currentDayId = Number(localStorage.getItem("currentDayId"));

let easyData = [];

// =========================
// ADD EASYPAISA
// =========================
window.addEasy = async function () {

    const amount = Number(prompt("Enter EasyPaisa Amount"));
    const note = prompt("Enter note (optional)");

    if (!amount || amount <= 0) {
        alert("Invalid amount");
        return;
    }

    await addDoc(collection(db, "easypaisa"), {
        amount,
        note,
        branch,
        day_id: currentDayId,
        created_at: new Date().toISOString()
    });

    alert("EasyPaisa Added ✅");
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
// RENDER
// =========================
function renderTable() {

    const tbody = document.getElementById("easyTable");
    tbody.innerHTML = "";

    let total = 0;

    easyData.forEach(e => {

        total += Number(e.amount || 0);

        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${new Date(e.created_at).toLocaleTimeString()}</td>
            <td>${e.amount}</td>
            <td>${e.note || "-"}</td>
        `;

        tbody.appendChild(tr);
    });

    document.getElementById("todayEasyTotal").innerText = total + " PKR";
}
