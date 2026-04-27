// ==========================
// 🔥 FIREBASE IMPORT
// ==========================
import { 
    collection, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    doc, 
    onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

console.log("EXPENSES FIREBASE LOADED");

const role = localStorage.getItem("role");
const branch = localStorage.getItem("branch");

let expensesList = [];
let selectedId = null;


// ==========================
// 🔥 REALTIME LOAD
// ==========================
document.addEventListener("DOMContentLoaded", () => {
    listenExpensesRealtime();
});

function listenExpensesRealtime() {

    onSnapshot(collection(window.db, "expenses"), (snap) => {

        let today = new Date();
        today.setHours(0,0,0,0);

        expensesList = [];

        snap.forEach(docSnap => {

            const e = docSnap.data();

            if (e.branch !== branch) return;

            const time = new Date(e.created_at);
            if (time < today) return;

            expensesList.push({
                id: docSnap.id,
                ...e
            });
        });

        renderExpenses(expensesList);
    });
}


// ==========================
// 🟢 RENDER
// ==========================
function renderExpenses(list) {

    const body = document.getElementById("expensesBody");
    body.innerHTML = "";

    let total = 0;
    list.forEach(x => total += Number(x.amount || 0));

    document.getElementById("todayTotal").innerText = total + " PKR";

    list.forEach(x => {

        body.innerHTML += `
            <tr>
                <td>${x.title}</td>
                <td>${x.amount}</td>
                <td>${x.expense_type}</td>
                <td>${new Date(x.created_at).toLocaleString()}</td>
                <td>
                    ${(role === "admin" || role === "manager") ? `
                        <button class='btn-green' onclick="openEditPopup('${x.id}', '${x.title}', ${x.amount}, '${x.expense_type}')">Edit</button>
                        <button class='btn-red' onclick="deleteExpense('${x.id}')">Delete</button>
                    ` : `<span style="color:gray;">No Access</span>`}
                </td>
            </tr>
        `;
    });
}


// ==========================
// 🔍 SEARCH
// ==========================
window.searchExpenses = function () {
    const key = document.getElementById("searchInput").value.toLowerCase();

    const filtered = expensesList.filter(x =>
        x.title.toLowerCase().includes(key)
    );

    renderExpenses(filtered);
}


// ==========================
// 🔽 FILTER
// ==========================
window.filterByType = function () {

    const type = document.getElementById("filterType").value;

    if (type === "all") return renderExpenses(expensesList);

    const filtered = expensesList.filter(x => x.expense_type === type);

    renderExpenses(filtered);
}


window.filterByDay = function () {

    const val = document.getElementById("dayFilter").value;

    const currentDayId = localStorage.getItem("currentDayId");

    if (val === "all") {
        return renderExpenses(expensesList);
    }

    if (val === "current") {

        const filtered = expensesList.filter(x =>
            x.day_id && String(x.day_id) === String(currentDayId)
        );

        return renderExpenses(filtered);
    }
}

// ==========================
// 📦 POPUPS (FIXED)
// ==========================
window.openAddPopup = function () {
    const popup = document.getElementById("addPopup");

    popup.style.display = "flex";
}

window.closeAddPopup = function () {
    const popup = document.getElementById("addPopup");

    popup.style.display = "none";
}


// EDIT
window.openEditPopup = function (id, title, amount, type) {

    if (!(role === "admin" || role === "manager")) return alert("Access Denied!");

    selectedId = id;

    document.getElementById("editTitle").value = title;
    document.getElementById("editAmount").value = amount;
    document.getElementById("editType").value = type;

    document.getElementById("editPopup").style.display = "flex";
}

window.closeEditPopup = function () {
    document.getElementById("editPopup").style.display = "none";
}


// ==========================
// ➕ ADD EXPENSE (FIXED)
// ==========================
window.saveExpense = async function () {
    try {

        await addDoc(collection(window.db, "expenses"), {
    title: document.getElementById("newTitle").value,
    amount: Number(document.getElementById("newAmount").value),
    expense_type: document.getElementById("newType").value,
    branch: branch,

    day_id: Number(localStorage.getItem("currentDayId")), // ✅ ADD THIS

    created_at: new Date().toISOString()
});

        // clear
        document.getElementById("newTitle").value = "";
        document.getElementById("newAmount").value = "";

        // 🔥 FORCE CLOSE AFTER SMALL DELAY
        alert("Expense saved successfully ✅");

        closeAddPopup();

    } catch (err) {
        console.error("SAVE ERROR:", err);
    }
}


// ==========================
// ✏️ UPDATE (FIXED)
// ==========================
window.updateExpense = async function () {
    try {

        await updateDoc(doc(window.db, "expenses", selectedId), {
            title: document.getElementById("editTitle").value,
            amount: Number(document.getElementById("editAmount").value),
            expense_type: document.getElementById("editType").value
        });

        alert("Expense updated successfully ✏️");

        closeEditPopup();

    } catch (err) {
        console.error("UPDATE ERROR:", err);
    }
}


// ==========================
// 🗑 DELETE
// ==========================
window.deleteExpense = async function (id) {

    if (!(role === "admin" || role === "manager")) return alert("Access Denied!");

    if (!confirm("Delete expense?")) return;

    await deleteDoc(doc(window.db, "expenses", id));
}
