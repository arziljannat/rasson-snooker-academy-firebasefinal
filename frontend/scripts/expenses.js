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

const branch = (localStorage.getItem("branch") || "")
    .toLowerCase()
    .replace(/\s+/g, "");
const role = (localStorage.getItem("role") || "").toLowerCase();

let expenseData = [];
let editId = null;

let selectedType = "all";
let selectedDay = "all";
let selectedMonth = null;
let selectedClosedDay = "all";
let closedDaysData = [];

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
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Karachi"
    });
}
// =========================
// LOAD CLOSED DAYS
// =========================
async function loadClosedDays() {

    const monthInput =
        document.getElementById("monthFilter");

    if (!monthInput) return;

    const selected =
        monthInput.value;

    if (!selected) return;

    const [year, month] =
        selected.split("-");

    const q = query(
        collection(db, "days"),
        where("branch", "==", branch)
    );

    const snap = await getDocs(q);

    closedDaysData = [];

    snap.forEach(docSnap => {

        const d = docSnap.data();

        let operationalDate =
            d.shift1?.startMs
                ? new Date(d.shift1.startMs)
                : new Date(d.date);

        const monthStr =
            `${operationalDate.getFullYear()}-${String(
                operationalDate.getMonth() + 1
            ).padStart(2, "0")}`;

        if (monthStr !== selected) return;

        closedDaysData.push(d);
    });

    // latest first
    closedDaysData.sort((a, b) => {
        return new Date(b.created_at) - new Date(a.created_at);
    });

    const select =
        document.getElementById("closedDayFilter");

select.innerHTML = `
    <option value="all">
        All Days
    </option>

    <option value="current">
        Current/Open Day
    </option>
`;

    closedDaysData.forEach((d, index) => {

        const openTime =
            d.shift1?.startMs
                ? new Date(d.shift1.startMs)
                    .toLocaleTimeString("en-PK", {
                        timeZone: "Asia/Karachi",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true
                    })
                : "-";

        const closeTime =
            d.shift2?.endMs
                ? new Date(d.shift2.endMs)
                    .toLocaleTimeString("en-PK", {
                        timeZone: "Asia/Karachi",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true
                    })
                : "-";

        const label =
            `${d.date} (${openTime} → ${closeTime})`;

        select.innerHTML += `
            <option value="${d.day_id}">
                ${label}
            </option>
        `;
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

const shift =
    document.getElementById("newShift").value;

const title = document.getElementById("newTitle").value;
    const amount = Number(document.getElementById("newAmount").value);
    const selectedDate =
    document.getElementById("newDate").value;

const finalDate =
    selectedDate
        ? new Date(selectedDate)
        : new Date();

if (!title || !amount) {
    alert("Fill all fields");
    return;
}

const selectedClosed =
    document.getElementById("closedDayFilter")?.value
    || "current";

const finalLinkedDayId =
    selectedClosed === "current"
        ? window.currentDayId
        : selectedClosed;

await addDoc(collection(db, "expenses"), {
    type,
    shift,
    title,
    amount,
    
    branch: String(branch)
        .toLowerCase()
        .replace(/\s+/g, ""),

    linked_day_id: Number(finalLinkedDayId),

    created_at: finalDate.toISOString()
});

    localStorage.setItem(
    "forceRefreshClosedDay",
    finalLinkedDayId
);

    document.getElementById("newTitle").value = "";
    document.getElementById("newAmount").value = "";
    document.getElementById("newDate").value = "";

    closeAddPopup();
if (window.refreshCurrentDayHistory) {
    await window.refreshCurrentDayHistory(finalLinkedDayId);
}
};

// =========================
// EDIT
// =========================
window.editExpense = (
    id,
    title,
    amount,
    type,
    shift,
    created_at
) => {

    editId = id;

    document.getElementById("editTitle").value = title;
    document.getElementById("editAmount").value = amount;
    document.getElementById("editType").value = type;
    document.getElementById("editShift").value =
    shift || "shift1";
    if (created_at) {

    let d;

    if (created_at.seconds) {

        d = new Date(created_at.seconds * 1000);

    } else {

        d = new Date(created_at);
    }

    // ✅ INVALID DATE FIX
    if (!isNaN(d.getTime())) {

        const localDate =
            new Date(d.getTime() - d.getTimezoneOffset() * 60000);

        document.getElementById("editDate").value =
            localDate.toISOString().slice(0, 16);

    } else {

        document.getElementById("editDate").value = "";
    }
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
    const shift =
    document.getElementById("editShift").value;
    
    const editDate =
    document.getElementById("editDate").value;
    const finalEditDate =
    editDate
        ? new Date(editDate)
        : new Date();

const selectedClosed =
    document.getElementById("closedDayFilter")?.value
    || "current";

const finalLinkedDayId =
    selectedClosed === "current"
        ? window.currentDayId
        : selectedClosed;

await updateDoc(doc(db, "expenses", editId), {
    title,
    amount,
    type,
    shift,

    linked_day_id: Number(finalLinkedDayId),

    created_at: finalEditDate.toISOString()
});

    localStorage.setItem(
    "forceRefreshClosedDay",
    finalLinkedDayId
);

    editId = null;
    closeEditPopup();
if (window.refreshCurrentDayHistory) {
    await window.refreshCurrentDayHistory(finalLinkedDayId);
}
};

// =========================
// DELETE
// =========================
window.deleteExpense = async (id) => {

    if (!confirm("Delete this expense?")) return;

    const expenseItem =
        expenseData.find(e => e.id === id);

    const finalLinkedDayId =
        expenseItem?.linked_day_id ||
        window.currentDayId;

    await deleteDoc(doc(db, "expenses", id));

    localStorage.setItem(
        "forceRefreshClosedDay",
        finalLinkedDayId
    );

    if (window.refreshCurrentDayHistory) {

        await window.refreshCurrentDayHistory(
            finalLinkedDayId
        );
    }
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

        // =========================
// DAY FILTER
// =========================

// CURRENT DAY ONLY
if (selectedDay === "current") {

    if (
        String(
            e.linked_day_id ||
            e.day_id
        ) !== String(window.currentDayId)
    ) {
        return;
    }
}

// ALL DAYS = CURRENT MONTH ONLY
if (selectedDay === "all") {

    let expenseDate;

    if (e.created_at?.seconds) {

        expenseDate =
            new Date(e.created_at.seconds * 1000);

    } else {

        expenseDate =
            new Date(e.created_at);
    }

    const now = new Date();

    if (
        expenseDate.getMonth() !== now.getMonth() ||
        expenseDate.getFullYear() !== now.getFullYear()
    ) {
        return;
    }
}

// =========================
// ALL DAYS
// =========================
if (
    selectedClosedDay === "all"
) {

    // show everything
}

// CLOSED DAY FILTER
if (
    selectedClosedDay !== "current"
    &&
    selectedClosedDay !== "all"
) {

    console.log(
        "CHECKING:",
        {
            expenseTitle: e.title,
            expenseDay:
                String(
                    e.linked_day_id ||
                    e.day_id
                ),
            selectedClosedDay:
                String(selectedClosedDay)
        }
    );

    let matched = false;

    // =========================
    // NEW SYSTEM
    // =========================
    if (
        String(e.linked_day_id) ===
        String(selectedClosedDay)
    ) {
        matched = true;
    }

    // =========================
    // OLD DATA FALLBACK
    // =========================
    if (!matched) {

        const selectedDayData =
            closedDaysData.find(
                d =>
                    String(d.day_id) ===
                    String(selectedClosedDay)
            );

        if (selectedDayData) {

            const expenseDate =
                new Date(e.created_at);

            const closedDate =
                new Date(selectedDayData.date);

            if (
                expenseDate.getDate() === closedDate.getDate() &&
                expenseDate.getMonth() === closedDate.getMonth() &&
                expenseDate.getFullYear() === closedDate.getFullYear()
            ) {
                matched = true;
            }
        }
    }

    if (!matched) {
        return;
    }
}

       if (selectedMonth) {

let operationalDate;

// priority = created_at
if (e.created_at) {

    if (e.created_at.seconds) {

        operationalDate =
            new Date(e.created_at.seconds * 1000);

    } else {

        operationalDate =
            new Date(e.created_at);
    }

} else {

    operationalDate =
        new Date(
            Number(
                e.linked_day_id ||
                e.day_id
            )
        );
}

if (isNaN(operationalDate.getTime())) return;

const expenseMonth =
    `${operationalDate.getFullYear()}-${String(
        operationalDate.getMonth() + 1
    ).padStart(2, "0")}`;

if (expenseMonth !== selectedMonth) return;
}
        
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
    role === "super_admin"
)
{
            actions = `
                <button class="btn-green"onclick="editExpense(
'${e.id}',
'${e.title}',
${e.amount},
'${e.type}',
'${e.shift || "shift1"}',
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
                <td>${e.shift || "-"}</td>
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

window.filterByMonth = async function () {

    selectedMonth =
        document.getElementById("monthFilter").value;

    await loadClosedDays();

    renderTable();
};



window.filterByClosedDay = function () {

    selectedClosedDay =
        document.getElementById("closedDayFilter").value;

    console.log(
        "SELECTED CLOSED DAY:",
        selectedClosedDay
    );

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

        if (!selectedMonth) {

    selectedMonth =
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const monthInput =
        document.getElementById("monthFilter");

    if (monthInput) {
        monthInput.value = selectedMonth;
    }
}

snap.forEach(d => {

    let data = d.data();

    let expenseDate;

    if (data.created_at?.seconds) {
        expenseDate = new Date(data.created_at.seconds * 1000);
    } else {
        expenseDate = new Date(data.created_at);
    }

    expenseData.push({
    id: d.id,
    ...data
        });
});
        console.log(
    "EXPENSE DATA:",
    expenseData
);

        renderTable();
    });
}

// =========================
// INIT
// =========================
if (
    role !== "admin" &&
    role !== "super_admin"
) {

    // HIDE MONTH FILTER
    const monthBox =
        document.getElementById("monthFilterBox");

    if (monthBox) {
        monthBox.style.display = "none";
    }

    // HIDE DATE INPUT
    const newDate =
        document.getElementById("newDate");

    if (newDate) {
        newDate.style.display = "none";
    }

    // HIDE EDIT DATE INPUT
    const editDate =
        document.getElementById("editDate");

    if (editDate) {
        editDate.style.display = "none";
    }
}

await loadCurrentDayId();

const now = new Date();

selectedMonth =
    `${now.getFullYear()}-${String(
        now.getMonth() + 1
    ).padStart(2, "0")}`;

document.getElementById("monthFilter").value =
    selectedMonth;

await loadClosedDays();

startExpensesListener();
