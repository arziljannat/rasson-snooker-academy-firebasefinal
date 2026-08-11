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
    getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

console.log("EXPENSES FIREBASE LOADED");

const db = window.db;

const branch =
    (localStorage.getItem("branch") || "")
        .toLowerCase()
        .replace(/\s+/g, "");

const role =
    (localStorage.getItem("role") || "")
        .toLowerCase();

let expenseData = [];

let operationalDays = {};

let editId = null;

let selectedType = "all";

let selectedDay = "current";

let selectedMonth = null;

let selectedYear = null;


// ======================================================
// CURRENT DAY
// ======================================================

async function loadCurrentDayId() {

    const snap =
        await getDocs(
            collection(
                db,
                "system"
            )
        );


    snap.forEach(d => {

        const data =
            d.data();


        const dataBranch =
            String(
                data.branch || ""
            )
            .toLowerCase()
            .replace(/\s+/g, "");


        if (
            data.type === "current_day" &&
            dataBranch === branch
        ) {

            window.currentDayId =
                data.day_id;

            window.currentDayCreatedAt =
                data.created_at || null;

        }

    });


    console.log(
        "✅ CURRENT OPERATIONAL DAY:",
        window.currentDayId
    );

}


// ======================================================
// DATE HELPER
// ======================================================

function getRecordDate(value) {

    if (!value) {
        return null;
    }


    if (
        typeof value === "object" &&
        value.seconds
    ) {

        const d =
            new Date(
                value.seconds * 1000
            );

        return isNaN(
            d.getTime()
        )
            ? null
            : d;

    }


    const d =
        new Date(value);


    return isNaN(
        d.getTime()
    )
        ? null
        : d;

}


// ======================================================
// LOAD OPERATIONAL DAYS
// SAME DAYS SOURCE AS DASHBOARD / REPORTS
// ======================================================

async function loadOperationalDays() {

    operationalDays = {};


    const snap =
        await getDocs(
            collection(
                db,
                "days"
            )
        );


    snap.forEach(docSnap => {

        const d =
            docSnap.data();


        const dayBranch =
            String(
                d.branch || ""
            )
            .toLowerCase()
            .replace(/\s+/g, "");


        if (
            dayBranch !== branch
        ) {
            return;
        }


        const dayId =
            String(
                d.day_id ||
                docSnap.id ||
                ""
            )
            .trim();


        if (!dayId) {
            return;
        }


        // ==================================================
        // OPERATIONAL DAY START
        // ==================================================

        let rawDate =
            d.start_time ||
            d.created_at ||
            d.date;


        // OLD DAY FIX
        if (
            !rawDate &&
            d.shift1?.startMs
        ) {

            rawDate =
                d.shift1.startMs;

        }


        if (
            !rawDate &&
            d.shift1?.start_ms
        ) {

            rawDate =
                d.shift1.start_ms;

        }


        const startDate =
            getRecordDate(
                rawDate
            );


        if (!startDate) {
            return;
        }


        // ==================================================
        // CLOSED CHECK
        // ==================================================

        const isClosed =

            d.is_closed === true ||

            d.closed === true ||

            d.day_closed === true ||

            !!d.close_time ||

            !!d.closeTime ||

            !!d.end_time ||

            !!d.endTime ||

            !!d.shift2?.close_time ||

            !!d.shift2?.closeTime ||

            !!d.shift2?.endMs ||

            !!d.shift2?.end_ms;


        operationalDays[dayId] = {

            raw: {
                ...d,
                is_closed:
                    isClosed
            },

            startDate,

            month:
                startDate.getMonth(),

            year:
                startDate.getFullYear(),

            day:
                startDate.getDate(),

            operationalMonth:
                `${startDate.getFullYear()}-${String(
                    startDate.getMonth() + 1
                ).padStart(2, "0")}`

        };

    });


    console.log(
        "📅 OPERATIONAL DAYS LOADED:",
        operationalDays
    );

}


// ======================================================
// CURRENT OPERATIONAL DAY
// ======================================================

function getCurrentOperationalDay() {

    const currentId =
        String(
            window.currentDayId || ""
        )
        .trim();


    if (
        currentId &&
        operationalDays[currentId]
    ) {

        return operationalDays[currentId];

    }


    // ==================================================
    // FALLBACK — LATEST OPEN DAY
    // ==================================================

    const openDays =
        Object.values(
            operationalDays
        )
        .filter(day =>
            day.raw?.is_closed !== true
        )
        .sort(
            (a, b) =>
                b.startDate.getTime() -
                a.startDate.getTime()
        );


    if (
        openDays.length
    ) {

        return openDays[0];

    }


    return null;

}


// ======================================================
// RECORD DAY ID
// ======================================================

function getRecordDayId(record) {

    return String(
        record?.day_id ||
        record?.dayId ||
        record?.current_day_id ||
        ""
    )
    .trim();

}


// ======================================================
// RECORD OPERATIONAL MONTH
// ======================================================

function getExpenseOperationalMonth(expense) {

    const dayId =
        getRecordDayId(
            expense
        );


    // PRIMARY
    if (
        dayId &&
        operationalDays[dayId]
    ) {

        return operationalDays[dayId]
            .operationalMonth;

    }


    // EXISTING SAVED FIELD
    if (
        expense.operational_month
    ) {

        return expense.operational_month;

    }


    // LEGACY FALLBACK
    const date =
        getRecordDate(
            expense.created_at
        );


    if (!date) {
        return null;
    }


    return (
        date.getFullYear() +
        "-" +
        String(
            date.getMonth() + 1
        ).padStart(2, "0")
    );

}


// ======================================================
// TIME FORMAT
// ======================================================

function formatTime(timestamp) {

    const date =
        getRecordDate(
            timestamp
        );


    if (!date) {
        return "-";
    }


    return date.toLocaleString(
        "en-PK",
        {

            day:
                "2-digit",

            month:
                "2-digit",

            year:
                "numeric",

            hour:
                "2-digit",

            minute:
                "2-digit",

            hour12:
                true,

            timeZone:
                "Asia/Karachi"

        }
    );

}


// ======================================================
// POPUP
// ======================================================

window.openAddPopup = () => {

    document
        .getElementById(
            "addPopup"
        )
        .classList
        .remove("hide");

};


window.closeAddPopup = () => {

    document
        .getElementById(
            "addPopup"
        )
        .classList
        .add("hide");

};


window.closeEditPopup = () => {

    document
        .getElementById(
            "editPopup"
        )
        .classList
        .add("hide");

};


// ======================================================
// SAVE EXPENSE
// ======================================================

window.saveExpense = async () => {

    const type =
        document.getElementById(
            "newType"
        ).value;

    const title =
        document.getElementById(
            "newTitle"
        ).value;

    const amount =
        Number(
            document.getElementById(
                "newAmount"
            ).value
        );

    const selectedDate =
        document.getElementById(
            "newDate"
        ).value;

    const shift =
        document.getElementById(
            "newShift"
        ).value;


    if (
        !title ||
        !amount
    ) {

        alert(
            "Fill all fields"
        );

        return;
    }


    // ==================================================
    // CURRENT OPERATIONAL DAY REQUIRED
    // ==================================================

    const currentDay =
        getCurrentOperationalDay();


    if (
        !window.currentDayId ||
        !currentDay
    ) {

        alert(
            "Current Operational Day not found."
        );

        return;
    }


    await addDoc(
        collection(
            db,
            "expenses"
        ),
        {

            type,

            title,

            amount,

            shift,

            branch:
                branch,

            // 🔥 PRIMARY OPERATIONAL DAY
            day_id:
                window.currentDayId,

            // 🔥 OPERATIONAL DAY START
            day_created_at:
                currentDay.startDate,

            // 🔥 OPERATIONAL MONTH
            operational_month:
                currentDay.operationalMonth,

            // ACTUAL ENTRY TIME
            created_at:
                selectedDate
                    ? new Date(
                        selectedDate
                    ).toISOString()
                    : new Date()
                        .toISOString()

        }
    );


    document.getElementById(
        "newTitle"
    ).value = "";

    document.getElementById(
        "newAmount"
    ).value = "";

    document.getElementById(
        "newDate"
    ).value = "";


    closeAddPopup();

};


// ======================================================
// EDIT
// ======================================================

window.editExpense = (
    id,
    title,
    amount,
    type,
    shift,
    created_at
) => {

    editId = id;


    document.getElementById(
        "editTitle"
    ).value =
        title || "";


    document.getElementById(
        "editAmount"
    ).value =
        amount || 0;


    document.getElementById(
        "editType"
    ).value =
        type || "";


    document.getElementById(
        "editShift"
    ).value =
        shift || "shift1";


    if (created_at) {

        const d =
            getRecordDate(
                created_at
            );


        if (d) {

            const localDate =
                new Date(
                    d.getTime() -
                    d.getTimezoneOffset() *
                    60000
                );


            document.getElementById(
                "editDate"
            ).value =
                localDate
                    .toISOString()
                    .slice(
                        0,
                        16
                    );

        }

    }


    document
        .getElementById(
            "editPopup"
        )
        .classList
        .remove("hide");

};


// ======================================================
// UPDATE
// ======================================================

window.updateExpense = async () => {

    const title =
        document.getElementById(
            "editTitle"
        ).value;

    const amount =
        Number(
            document.getElementById(
                "editAmount"
            ).value
        );

    const type =
        document.getElementById(
            "editType"
        ).value;

    const shift =
        document.getElementById(
            "editShift"
        ).value;

    const editDate =
        document.getElementById(
            "editDate"
        ).value;


    if (
        !title ||
        !amount
    ) {

        alert(
            "Fill all fields"
        );

        return;
    }


    // ==================================================
    // IMPORTANT:
    // DAY_ID CHANGE NAHI KARNA
    // ==================================================

    await updateDoc(
        doc(
            db,
            "expenses",
            editId
        ),
        {

            title,

            amount,

            type,

            shift,

            created_at:
                editDate
                    ? new Date(
                        editDate
                    ).toISOString()
                    : new Date()
                        .toISOString()

        }
    );


    editId = null;

    closeEditPopup();

};


// ======================================================
// DELETE
// ======================================================

window.deleteExpense = async (
    id
) => {

    if (
        !confirm(
            "Delete this expense?"
        )
    ) {
        return;
    }


    await deleteDoc(
        doc(
            db,
            "expenses",
            id
        )
    );

};


// ======================================================
// MONTH FILTER
// ======================================================

window.filterExpensesByMonth = () => {

    const input =
        document.getElementById(
            "monthFilter"
        );


    if (
        !input ||
        !input.value
    ) {
        return;
    }


    const parts =
        input.value.split("-");


    selectedYear =
        Number(
            parts[0]
        );

    selectedMonth =
        Number(
            parts[1]
        ) - 1;


    renderTable();

};


// ======================================================
// DEFAULT MONTH
// OPERATIONAL DAY MONTH
// ======================================================

function setDefaultMonth() {

    const currentDay =
        getCurrentOperationalDay();


    let year;
    let month;


    if (
        currentDay?.startDate
    ) {

        year =
            currentDay.startDate
                .getFullYear();

        month =
            currentDay.startDate
                .getMonth();

    } else {

        const now =
            new Date();

        year =
            now.getFullYear();

        month =
            now.getMonth();

    }


    selectedYear =
        year;

    selectedMonth =
        month;


    const input =
        document.getElementById(
            "monthFilter"
        );


    if (input) {

        input.value =
            `${year}-${String(
                month + 1
            ).padStart(
                2,
                "0"
            )}`;

    }

}


// ======================================================
// RENDER
// ======================================================

function renderTable() {

    const body =
        document.getElementById(
            "expensesBody"
        );


    if (!body) {
        return;
    }


    body.innerHTML = "";


    let total = 0;


    expenseData.forEach(e => {

        // ==================================================
        // TYPE
        // ==================================================

        if (
            selectedType !== "all" &&
            e.type !== selectedType
        ) {

            return;

        }


        // ==================================================
        // CURRENT OPERATIONAL DAY
        // ==================================================

        if (
            selectedDay === "current"
        ) {

            const recordDayId =
                getRecordDayId(e);


            if (
                recordDayId
            ) {

                if (
                    String(
                        recordDayId
                    ) !== String(
                        window.currentDayId
                    )
                ) {

                    return;

                }

            } else {

                // Legacy record without day_id
                const currentDay =
                    getCurrentOperationalDay();


                const expenseDate =
                    getRecordDate(
                        e.created_at
                    );


                if (
                    !currentDay ||
                    !expenseDate ||
                    expenseDate <
                    currentDay.startDate ||
                    expenseDate >
                    new Date()
                ) {

                    return;

                }

            }

        }


        // ==================================================
        // MONTH FILTER
        // OPERATIONAL MONTH
        // ==================================================

        if (
            selectedYear !== null &&
            selectedMonth !== null
        ) {

            const selectedKey =
                `${selectedYear}-${String(
                    selectedMonth + 1
                ).padStart(
                    2,
                    "0"
                )}`;


            const expenseMonth =
                getExpenseOperationalMonth(
                    e
                );


            if (
                expenseMonth !==
                selectedKey
            ) {

                return;

            }

        }


        // ==================================================
        // TOTAL
        // ==================================================

        total +=
            Number(
                e.amount || 0
            );


        // ==================================================
        // ACTIONS
        // ==================================================

        let actions = "";


        if (
            role === "admin" ||
            role === "super_admin"
        ) {

            const safeTitle =
                String(
                    e.title || ""
                )
                .replace(
                    /'/g,
                    "\\'"
                );

            const safeType =
                String(
                    e.type || ""
                )
                .replace(
                    /'/g,
                    "\\'"
                );


            actions = `

                <button
                    class="btn-green"
                    onclick="editExpense(
                        '${e.id}',
                        '${safeTitle}',
                        ${Number(e.amount || 0)},
                        '${safeType}',
                        '${e.shift || "shift1"}',
                        '${e.created_at || ""}'
                    )"
                >
                    Edit
                </button>

                <button
                    class="btn-red"
                    onclick="deleteExpense(
                        '${e.id}'
                    )"
                >
                    Delete
                </button>

            `;

        }


        body.innerHTML += `

            <tr>

                <td>
                    ${e.title || "-"}
                </td>

                <td>
                    ${e.amount || 0}
                </td>

                <td>
                    ${e.type || "-"}
                </td>

                <td>
                    ${
                        e.shift === "shift2"
                            ? "Shift 2"
                            : "Shift 1"
                    }
                </td>

                <td>
                    ${formatTime(
                        e.created_at
                    )}
                </td>

                <td>
                    ${actions}
                </td>

            </tr>

        `;

    });


    document.getElementById(
        "todayTotal"
    ).innerText =
        total + " PKR";

}


// ======================================================
// TYPE FILTER
// ======================================================

window.filterByType = function () {

    selectedType =
        document.getElementById(
            "filterType"
        ).value;


    renderTable();

};


// ======================================================
// DAY FILTER
// ======================================================

window.filterByDay = function () {

    selectedDay =
        document.getElementById(
            "dayFilter"
        ).value;


    renderTable();

};


// ======================================================
// SEARCH
// ======================================================

window.searchExpenses = function () {

    const search =
        document.getElementById(
            "searchInput"
        )
        .value
        .toLowerCase();


    const rows =
        document.querySelectorAll(
            "#expensesBody tr"
        );


    rows.forEach(row => {

        const text =
            row.innerText
                .toLowerCase();


        row.style.display =
            text.includes(search)
                ? ""
                : "none";

    });

};


// ======================================================
// REALTIME LISTENER
// ======================================================

function startExpensesListener() {

    const q =
        query(

            collection(
                db,
                "expenses"
            ),

            where(
                "branch",
                "==",
                branch
            ),

            orderBy(
                "created_at",
                "desc"
            )

        );


    onSnapshot(
        q,
        snap => {

            expenseData = [];


            snap.forEach(
                docSnap => {

                    expenseData.push({

                        id:
                            docSnap.id,

                        ...docSnap.data()

                    });

                }
            );


            renderTable();

        },

        error => {

            console.error(
                "❌ EXPENSE LISTENER ERROR:",
                error
            );

        }
    );

}


// ======================================================
// INIT
// ======================================================

async function initExpenses() {

    try {

        // 1
        await loadCurrentDayId();


        // 2
        await loadOperationalDays();


        // 3
        setDefaultMonth();


        // 4
        startExpensesListener();


        console.log(
            "✅ EXPENSES OPERATIONAL DAY READY",
            {
                currentDayId:
                    window.currentDayId,

                currentDay:
                    getCurrentOperationalDay()

            }
        );

    }

    catch (error) {

        console.error(
            "❌ EXPENSE INIT ERROR:",
            error
        );

    }

}


initExpenses();
