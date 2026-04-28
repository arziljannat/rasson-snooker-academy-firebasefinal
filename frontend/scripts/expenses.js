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
    serverTimestamp,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

console.log("EXPENSES FIREBASE LOADED");

const db = window.db;

const branch = (localStorage.getItem("branch") || "").toLowerCase();
const role = (localStorage.getItem("role") || "").toLowerCase();

let expenseData = [];
let editId = null;

let selectedType = "all";
let selectedDay = "all";

// =========================
// LOAD CURRENT DAY ID
// =========================
async function loadCurrentDayId() {

    const snap = await getDocs(collection(db, "system"));

    snap.forEach(d => {
        const data = d.data();

        if (data.type === "current_day" && data.branch === branch) {
            window.currentDayId = data.day_id;
        }
    });

    console.log("✅ CURRENT DAY ID LOADED:", window.currentDayId);
}

// =========================
// TIME FORMAT
// =========================
function formatTime(timestamp) {

    if (!timestamp) return "-";

    let date;

    if (timestamp.seconds) {
        date = new Date(timestamp.seconds * 1000);
    } else {
        date = new Date(timestamp);
    }

    return date.toLocaleString("en-PK", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Karachi"
    });
}

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
    const selectedDate =
    document.getElementById("newDate").value;

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
        created_at: selectedDate
    ? new Date(selectedDate).toISOString()
    : new Date().toISOString()
    });

    document.getElementById("newTitle").value = "";
    document.getElementById("newAmount").value = "";
    document.getElementById("newDate").value = "";

    closeAddPopup();
};

// =========================
// EDIT
// =========================
window.editExpense = (id, title, amount, type) => {

    editId = id;

    document.getElementById("editTitle").value = title;
    document.getElementById("editAmount").value = amount;
    document.getElementById("editType").value = type;
    if (created_at) {

    let d;

    if (created_at.seconds) {
        d = new Date(created_at.seconds * 1000);
    } else {
        d = new Date(created_at);
    }

    document.getElementById("editDate").value =
        d.toISOString().slice(0,16);
}

    document.getElementById("editPopup").classList.remove("hide");
};

// =========================
// UPDATE
// =========================
window.updateExpense = async () => {

    const title = document.getElementById("editTitle").value;
    const amount = Number(document.getElementById("editAmount").value);
    const type = document.getElementById("editType").value;
    const editDate =
    document.getElementById("editDate").value;

    await updateDoc(doc(db, "expenses", editId), {
        title,
        amount,
        type
        created_at: editDate
    ? new Date(editDate).toISOString()
    : new Date().toISOString()
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

        // FILTER TYPE
        if (selectedType !== "all" && e.type !== selectedType) return;

        // FILTER DAY
        if (selectedDay === "current" && e.day_id !== window.currentDayId) return;

        total += Number(e.amount || 0);

        let actions = "";
        let expenseDate;

if (e.created_at?.seconds) {
    expenseDate = new Date(e.created_at.seconds * 1000);
} else {
    expenseDate = new Date(e.created_at);
}

const now = new Date();

const isOldMonth =
    expenseDate.getMonth() !== now.getMonth() ||
    expenseDate.getFullYear() !== now.getFullYear();

        if (
    role === "admin" ||
    role === "super_admin" ||
    !isOldMonth
) {
            actions = `
                <button class="btn-green"onclick="editExpense(
'${e.id}',
'${e.title}',
${e.amount},
'${e.type}',
'${e.created_at || ""}'
)">Edit</button>
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

// =========================
// FILTERS
// =========================
window.filterByType = function () {
    selectedType = document.getElementById("filterType").value;
    renderTable();
};

window.filterByDay = function () {
    selectedDay = document.getElementById("dayFilter").value;
    renderTable();
};

// =========================
// SEARCH
// =========================
window.searchExpenses = function () {

    const search =
        document.getElementById("searchInput")
        .value
        .toLowerCase();

    const rows =
        document.querySelectorAll("#expensesBody tr");

    rows.forEach(row => {

        const text =
            row.innerText.toLowerCase();

        if (text.includes(search)) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }
    });
};

// =========================
// LISTENER START
// =========================
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
    orderBy("created_at", "desc")
);

    onSnapshot(q, (snap) => {

        expenseData = [];

        const now = new Date();

snap.forEach(d => {

    let data = d.data();

    let expenseDate;

    if (data.created_at?.seconds) {
        expenseDate = new Date(data.created_at.seconds * 1000);
    } else {
        expenseDate = new Date(data.created_at);
    }

    // ✅ ONLY CURRENT MONTH
    if (
        expenseDate.getMonth() === now.getMonth() &&
        expenseDate.getFullYear() === now.getFullYear()
    ) {
        expenseData.push({
            id: d.id,
            ...data
        });
    }
});

        renderTable();
    });
}

// =========================
// INIT
// =========================
await loadCurrentDayId();
startExpensesListener();
