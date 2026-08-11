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

let fromDate = "";

let toDate = "";


// ======================================================
// CURRENT OPERATIONAL DAY
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

        const data = d.data();

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

    // Firebase Timestamp
    if (
        typeof value === "object" &&
        value.seconds
    ) {

        const d =
            new Date(
                value.seconds * 1000
            );

        return isNaN(d.getTime())
            ? null
            : d;
    }

    // Firestore Timestamp with toDate()
    if (
        typeof value === "object" &&
        typeof value.toDate === "function"
    ) {

        const d =
            value.toDate();

        return isNaN(d.getTime())
            ? null
            : d;
    }

    const d =
        new Date(value);

    return isNaN(d.getTime())
        ? null
        : d;
}


// ======================================================
// LOAD OPERATIONAL DAYS
// SAME DAYS SOURCE AS REPORTS / DASHBOARD
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

        const data =
            docSnap.data();

        const dayBranch =
            String(
                data.branch || ""
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
                data.day_id ||
                docSnap.id ||
                ""
            ).trim();

        if (!dayId) {
            return;
        }


        // ==================================================
        // OPERATIONAL DAY START
        // ==================================================

        let rawStart =
            data.shift1?.startMs ||
            data.shift1?.start_ms ||
            data.start_time ||
            data.startTime ||
            data.created_at ||
            data.date;


        const startDate =
            getRecordDate(
                rawStart
            );


        if (!startDate) {
            return;
        }


        // ==================================================
        // OPERATIONAL DAY END
        // ==================================================

        let rawEnd =
            data.shift2?.endMs ||
            data.shift2?.end_ms ||
            data.end_time ||
            data.endTime ||
            data.close_time ||
            data.closeTime;


        let endDate =
            getRecordDate(
                rawEnd
            );


        // Current open day:
        // its end is NOW
        if (!endDate) {

            endDate =
                new Date();

        }


        // ==================================================
        // CLOSED STATUS
        // ==================================================

        const isClosed =

            data.is_closed === true ||

            data.closed === true ||

            data.day_closed === true ||

            !!data.close_time ||

            !!data.closeTime ||

            !!data.end_time ||

            !!data.endTime ||

            !!data.shift2?.endMs ||

            !!data.shift2?.end_ms;


        operationalDays[dayId] = {

            raw: {
                ...data,

                is_closed:
                    isClosed
            },

            startDate,

            endDate,

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
        ).trim();


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
        .filter(day => {

            return (
                day.raw?.is_closed !== true
            );

        })
        .sort(
            (a, b) =>
                b.startDate.getTime() -
                a.startDate.getTime()
        );


    if (openDays.length) {

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
        record?.currentDayId ||
        ""
    ).trim();

}


// ======================================================
// GET OPERATIONAL DAY OF EXPENSE
// ======================================================

function getExpenseOperationalDay(expense) {

    const dayId =
        getRecordDayId(
            expense
        );


    if (
        dayId &&
        operationalDays[dayId]
    ) {

        return operationalDays[dayId];

    }


    return null;

}


// ======================================================
// GET OPERATIONAL MONTH
// ======================================================

function getExpenseOperationalMonth(expense) {

    const day =
        getExpenseOperationalDay(
            expense
        );


    if (day) {

        return day.operationalMonth;

    }


    // Existing saved field
    if (
        expense.operational_month
    ) {

        return expense.operational_month;

    }


    // Legacy fallback
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
// FORMAT TIME
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
                "short",

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
        ).value.trim();

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
        !amount ||
        amount <= 0
    ) {

        alert(
            "Fill all fields"
        );

        return;
    }


    // ==================================================
    // CURRENT OPERATIONAL DAY
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


    // ==================================================
    // SAVE
    // ==================================================

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
                    : new Date().toISOString()

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
        ).value.trim();

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
        !amount ||
        amount <= 0
    ) {

        alert(
            "Fill all fields"
        );

        return;
    }


    // ==================================================
    // IMPORTANT
    // day_id NEVER changes during edit
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
                    : new Date().toISOString()

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
// DATE RANGE FILTER
// BASED ON OPERATIONAL DAY
// ======================================================

window.filterByDateRange = function () {

    fromDate =
        document.getElementById(
            "fromDate"
        ).value;

    toDate =
        document.getElementById(
            "toDate"
        ).value;


    renderTable();

};


// ======================================================
// CHECK OPERATIONAL DAY DATE RANGE
// ======================================================

function isOperationalDayInDateRange(
    day
) {

    if (!day) {
        return false;
    }


    // No date filter
    if (
        !fromDate &&
        !toDate
    ) {

        return true;

    }


    // ==================================================
    // FROM DATE
    // ==================================================

    if (fromDate) {

        const from =
            new Date(
                `${fromDate}T00:00:00`
            );


        // Compare operational day START
        if (
            day.startDate <
            from
        ) {

            return false;

        }

    }


    // ==================================================
    // TO DATE
    // ==================================================

    if (toDate) {

        const to =
            new Date(
                `${toDate}T23:59:59.999`
            );


        // Compare operational day START
        if (
            day.startDate >
            to
        ) {

            return false;

        }

    }


    return true;

}


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
// RENDER TABLE
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
        // TYPE FILTER
        // ==================================================

        if (
            selectedType !== "all" &&
            e.type !== selectedType
        ) {

            return;

        }


        // ==================================================
        // OPERATIONAL DAY FILTER
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
                    currentDay.endDate
                ) {

                    return;

                }

            }

        }


        // ==================================================
        // DATE RANGE
        // OPERATIONAL DAY BASED
        // ==================================================

        const expenseDay =
            getExpenseOperationalDay(
                e
            );


        if (
            fromDate ||
            toDate
        ) {

            if (
                !isOperationalDayInDateRange(
                    expenseDay
                )
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

            const safeCreatedAt =
                String(
                    e.created_at || ""
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
                        '${safeCreatedAt}'
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
