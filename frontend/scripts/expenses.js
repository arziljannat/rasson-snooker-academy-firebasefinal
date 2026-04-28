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

console.log("EXPENSES FIREBASE LOADED");

const db = window.db;

const branch = (localStorage.getItem("branch") || "").toLowerCase();
const role = (localStorage.getItem("role") || "").toLowerCase();
const currentDayId = window.currentDayId;

let expenseData = [];
let editId = null;

// =========================
// POPUP
// =========================
window.openAddPopup = () => {
    document.getElementById("addPopup").classList.remove("hide");
};

window.closeAddPopup = () => {
    document.getElementById("addPopup").classList.add("hide");
};

window.closeEditPopup = () => {
    document.getElementById("editPopup").classList.add("hide");
};

// =========================
// SAVE EXPENSE
// =========================
window.saveExpense = async () => {

    const type = document.getElementById("newType").value;
    const title = document.getElementById("newTitle").value;
    const amount = Number(document.getElementById("newAmount").value);

    if (!title || !amount) {
        alert("Fill all fields");
        return;
    }

    await addDoc(collection(db, "expenses"), {
        type,
        title,
        amount,
        branch,
        day_id: window.currentDayId,
        created_at: serverTimestamp()
    });

    document.getElementById("newTitle").value = "";
    document.getElementById("newAmount").value = "";

    closeAddPopup();
};

// =========================
// EDIT OPEN
// =========================
window.editExpense = (id, title, amount, type) => {

    editId = id;

    document.getElementById("editTitle").value = title;
    document.getElementById("editAmount").value = amount;
    document.getElementById("editType").value = type;

    document.getElementById("editPopup").classList.remove("hide");
};

// =========================
// UPDATE
// =========================
window.updateExpense = async () => {

    const title = document.getElementById("editTitle").value;
    const amount = Number(document.getElementById("editAmount").value);
    const type = document.getElementById("editType").value;

    await updateDoc(doc(db, "expenses", editId), {
        title,
        amount,
        type
    });

    editId = null;
    closeEditPopup();
};

// =========================
// DELETE
// =========================
window.deleteExpense = async (id) => {

    if (!confirm("Delete this expense?")) return;

    await deleteDoc(doc(db, "expenses", id));
};
// =========================
// RENDER
// =========================
function renderTable() {

    const body = document.getElementById("expensesBody");
    body.innerHTML = "";

    let total = 0;

    expenseData.forEach(e => {

        total += Number(e.amount || 0);

        let actions = "";

        if (role === "admin" || role === "super_admin") {
            actions = `
                <button class="btn-green" onclick="editExpense('${e.id}', '${e.title}', ${e.amount}, '${e.type}')">Edit</button>
                <button class="btn-red" onclick="deleteExpense('${e.id}')">Delete</button>
            `;
        }

        body.innerHTML += `
            <tr>
                <td>${e.title}</td>
                <td>${e.amount}</td>
                <td>${e.type}</td>
                <td>${formatTime(e.created_at)}</td>
                <td>${actions}</td>
            </tr>
        `;
    });

    document.getElementById("todayTotal").innerText = total + " PKR";
}


function startExpensesListener() {

    if (!window.currentDayId) {
        console.log("⏳ Waiting for currentDayId...");
        setTimeout(startExpensesListener, 500);
        return;
    }

    console.log("✅ DAY ID READY:", window.currentDayId);

    const q = query(
        collection(db, "expenses"),
        where("branch", "==", branch),
        where("day_id", "==", window.currentDayId),
        orderBy("created_at", "desc")
    );

    onSnapshot(q, (snap) => {

        expenseData = [];

        snap.forEach(d => {
            expenseData.push({ id: d.id, ...d.data() });
        });

        renderTable();
    });
}

startExpensesListener();
