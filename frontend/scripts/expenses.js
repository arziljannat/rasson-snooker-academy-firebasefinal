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


if (!db) {

    console.error(
        "❌ Firebase DB not loaded"
    );

}


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

let selectedDay = "all";

let fromDate = "";

let toDate = "";


// ======================================================
// DATE KEY
// PAKISTAN / OPERATIONAL DATE
// ======================================================

function getPakistanDateKey(date) {

    if (!date) {
        return null;
    }


    return date.toLocaleDateString(
        "en-CA",
        {
            timeZone: "Asia/Karachi"
        }
    );

}


// ======================================================
// MONTH KEY
// YYYY-MM
// ======================================================

function getMonthKey(date) {

    if (!date) {
        return null;
    }


    return date.toLocaleDateString(
        "en-CA",
        {
            timeZone: "Asia/Karachi",
            year: "numeric",
            month: "2-digit"
        }
    );

}


// ======================================================
// DEFAULT CURRENT OPERATIONAL MONTH
//
// IMPORTANT:
// Calendar month use nahi karna.
// Current Operational Day ka START month use hoga.
//
// Example:
//
// 31 July 9 AM
//      ↓
// 1 August 9 AM
//
// Accounting Month = JULY
// ======================================================

function setCurrentMonthFilter() {

    const currentDay =
        getCurrentOperationalDay();


    let operationalMonth = null;


    // ==================================================
    // PRIMARY
    // CURRENT OPERATIONAL DAY
    // ==================================================

    if (
        currentDay &&
        currentDay.startDate
    ) {

        operationalMonth =
            currentDay.operationalMonth;

    }


    // ==================================================
    // FALLBACK
    // AGAR OPERATIONAL DAY NA MILE
    // ==================================================

    if (!operationalMonth) {

        const now =
            new Date();

        operationalMonth =
            getMonthKey(now);

    }


    // ==================================================
    // MONTH START
    // ==================================================

    fromDate =
        `${operationalMonth}-01`;


    // ==================================================
    // MONTH END
    // ==================================================

    const parts =
        operationalMonth.split("-");


    const year =
        Number(parts[0]);


    const month =
        Number(parts[1]);


    const lastDay =
        new Date(
            year,
            month,
            0
        ).getDate();


    toDate =
        `${operationalMonth}-${String(
            lastDay
        ).padStart(2, "0")}`;


    // ==================================================
    // SET HTML INPUTS
    // ==================================================

    const fromInput =
        document.getElementById(
            "fromDate"
        );


    const toInput =
        document.getElementById(
            "toDate"
        );


    if (fromInput) {

        fromInput.value =
            fromDate;

    }


    if (toInput) {

        toInput.value =
            toDate;

    }


    console.log(
        "📅 CURRENT OPERATIONAL MONTH:",
        operationalMonth
    );


    console.log(
        "📅 FILTER:",
        fromDate,
        "→",
        toDate
    );

}


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

        const data =
            d.data();


        const dataBranch =
            String(
                data.branch || ""
            )
            .toLowerCase()
            .replace(
                /\s+/g,
                ""
            );


        if (
            data.type === "current_day" &&
            dataBranch === branch
        ) {

            window.currentDayId =
                data.day_id;


            window.currentDayCreatedAt =
                data.created_at ||
                null;

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


    // ==================================================
    // FIREBASE TIMESTAMP
    // ==================================================

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


    // ==================================================
    // FIRESTORE TIMESTAMP toDate()
    // ==================================================

    if (
        typeof value === "object" &&
        typeof value.toDate === "function"
    ) {

        const d =
            value.toDate();


        return isNaN(
            d.getTime()
        )
            ? null
            : d;

    }


    // ==================================================
    // NORMAL DATE / STRING
    // ==================================================

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
//
// SAME DAYS COLLECTION USED FOR OPERATIONAL ACCOUNTING
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


        // ==================================================
        // BRANCH
        // ==================================================

        const dayBranch =
            String(
                data.branch || ""
            )
            .toLowerCase()
            .replace(
                /\s+/g,
                ""
            );


        if (
            dayBranch !== branch
        ) {

            return;

        }


        // ==================================================
        // DAY ID
        // ==================================================

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
        //
        // SHIFT 1 START IS PRIMARY
        // ==================================================

        let rawStart = null;


        if (
            data.shift1?.startMs
        ) {

            rawStart =
                data.shift1.startMs;

        }

        else if (
            data.shift1?.start_ms
        ) {

            rawStart =
                data.shift1.start_ms;

        }

        else if (
            data.start_time
        ) {

            rawStart =
                data.start_time;

        }

        else if (
            data.startTime
        ) {

            rawStart =
                data.startTime;

        }

        else if (
            data.created_at
        ) {

            rawStart =
                data.created_at;

        }

        else if (
            data.date
        ) {

            rawStart =
                data.date;

        }


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

        let rawEnd = null;


        if (
            data.shift2?.endMs
        ) {

            rawEnd =
                data.shift2.endMs;

        }

        else if (
            data.shift2?.end_ms
        ) {

            rawEnd =
                data.shift2.end_ms;

        }

        else if (
            data.end_time
        ) {

            rawEnd =
                data.end_time;

        }

        else if (
            data.endTime
        ) {

            rawEnd =
                data.endTime;

        }

        else if (
            data.close_time
        ) {

            rawEnd =
                data.close_time;

        }

        else if (
            data.closeTime
        ) {

            rawEnd =
                data.closeTime;

        }


        let endDate =
            getRecordDate(
                rawEnd
            );


        // ==================================================
        // CURRENT OPEN DAY
        // ==================================================

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


        // ==================================================
        // OPERATIONAL MONTH
        //
        // IMPORTANT:
        // START DATE KA MONTH
        // ==================================================

        const operationalMonth =
            getMonthKey(
                startDate
            );


        operationalDays[dayId] = {

            raw: {
                ...data,

                is_closed:
                    isClosed
            },


            startDate,


            endDate,


            operationalMonth

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


    // ==================================================
    // PRIMARY
    // CURRENT DAY ID
    // ==================================================

    if (
        currentId &&
        operationalDays[currentId]
    ) {

        return operationalDays[currentId];

    }


    // ==================================================
    // FALLBACK
    // LATEST OPEN DAY
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
        record?.currentDayId ||
        ""
    ).trim();

}


// ======================================================
// GET OPERATIONAL DAY OF EXPENSE
// ======================================================

function getExpenseOperationalDay(
    expense
) {

    const dayId =
        getRecordDayId(
            expense
        );


    // ==================================================
    // 1. EXPENSE HAS DAY_ID
    // ==================================================

    if (
        dayId &&
        operationalDays[dayId]
    ) {

        return operationalDays[dayId];

    }


    // ==================================================
    // 2. OLD EXPENSE
    //
    // DAY_ID MISSING
    // CREATED_AT SE OPERATIONAL DAY FIND KARO
    // ==================================================

    const expenseDate =
        getRecordDate(
            expense.created_at
        );


    if (!expenseDate) {

        return null;

    }


    for (
        const day of
        Object.values(
            operationalDays
        )
    ) {

        if (
            expenseDate >=
                day.startDate &&

            expenseDate <=
                day.endDate
        ) {

            return day;

        }

    }


    return null;

}


// ======================================================
// GET OPERATIONAL MONTH
// ======================================================

function getExpenseOperationalMonth(
    expense
) {

    // ==================================================
    // FIRST PRIORITY
    // OPERATIONAL DAY
    // ==================================================

    const day =
        getExpenseOperationalDay(
            expense
        );


    if (day) {

        return day.operationalMonth;

    }


    // ==================================================
    // SECOND PRIORITY
    // SAVED OPERATIONAL MONTH
    // ==================================================

    if (
        expense.operational_month
    ) {

        return expense.operational_month;

    }


    // ==================================================
    // THIRD PRIORITY
    // LEGACY CALENDAR DATE
    // ==================================================

    const date =
        getRecordDate(
            expense.created_at
        );


    if (!date) {

        return null;

    }


    return getMonthKey(
        date
    );

}


// ======================================================
// FORMAT TIME
// ======================================================

function formatTime(
    timestamp
) {

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
        .remove(
            "hide"
        );

};


window.closeAddPopup = () => {

    document
        .getElementById(
            "addPopup"
        )
        .classList
        .add(
            "hide"
        );

};


window.closeEditPopup = () => {

    document
        .getElementById(
            "editPopup"
        )
        .classList
        .add(
            "hide"
        );

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


            // PRIMARY OPERATIONAL DAY
            day_id:
                window.currentDayId,


            // OPERATIONAL DAY START
            day_created_at:
                currentDay.startDate,


            // OPERATIONAL MONTH
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

    editId =
        id;


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
        .remove(
            "hide"
        );

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
    //
    // day_id / operational_month
    // CHANGE NAHI HOGA
    //
    // EXPENSE APNE ORIGINAL
    // OPERATIONAL DAY MEIN RAHEGA
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


    editId =
        null;


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

    const input =
        document.getElementById(
            "filterType"
        );


    selectedType =
        input
            ? input.value
            : "all";


    renderTable();

};


// ======================================================
// DAY FILTER
// ======================================================

window.filterByDay = function () {

    const input =
        document.getElementById(
            "dayFilter"
        );


    selectedDay =
        input
            ? input.value
            : "all";


    renderTable();

};


// ======================================================
// DATE RANGE FILTER
//
// SAFE VERSION
// NULL ERROR NAHI AYEGA
// ======================================================

window.filterByDateRange = function () {

    const fromInput =
        document.getElementById(
            "fromDate"
        );


    const toInput =
        document.getElementById(
            "toDate"
        );


    fromDate =
        fromInput
            ? fromInput.value
            : "";


    toDate =
        toInput
            ? toInput.value
            : "";


    renderTable();

};


// ======================================================
// CHECK OPERATIONAL DAY DATE RANGE
//
// DATE FILTER OPERATIONAL DAY START PAR
// ======================================================

function isOperationalDayInDateRange(
    day
) {

    if (!day) {

        return false;

    }


    // ==================================================
    // NO DATE FILTER
    // ==================================================

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
// CHECK CURRENT SELECTED OPERATIONAL MONTH
// ======================================================

function isExpenseInSelectedMonth(
    expense
) {

    if (
        !fromDate ||
        !toDate
    ) {

        return true;

    }


    // ==================================================
    // IF USER SELECTED EXACT MONTH
    // ==================================================

    const fromMonth =
        fromDate.slice(
            0,
            7
        );


    const toMonth =
        toDate.slice(
            0,
            7
        );


    // ==================================================
    // SAME MONTH
    // USE OPERATIONAL MONTH
    // ==================================================

    if (
        fromMonth ===
        toMonth
    ) {

        const expenseMonth =
            getExpenseOperationalMonth(
                expense
            );


        if (!expenseMonth) {

            return false;

        }


        return (
            expenseMonth ===
            fromMonth
        );

    }


    // ==================================================
    // MULTI-MONTH CUSTOM RANGE
    //
    // OPERATIONAL DAY START DATE
    // ==================================================

    const expenseDay =
        getExpenseOperationalDay(
            expense
        );


    return isOperationalDayInDateRange(
        expenseDay
    );

}


// ======================================================
// SEARCH
// ======================================================

window.searchExpenses = function () {

    const input =
        document.getElementById(
            "searchInput"
        );


    if (!input) {

        return;

    }


    const search =
        input.value
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


    let total =
        0;


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
        // CURRENT OPERATIONAL DAY FILTER
        // ==================================================

        if (
            selectedDay === "current"
        ) {

            const currentDay =
                getCurrentOperationalDay();


            if (!currentDay) {

                return;

            }


            const expenseDay =
                getExpenseOperationalDay(
                    e
                );


            if (!expenseDay) {

                return;

            }


            const expenseDayId =
                getRecordDayId(
                    e
                );


            const currentDayId =
                String(
                    window.currentDayId ||
                    ""
                ).trim();


            // ==================================================
            // EXACT DAY ID MATCH
            // ==================================================

            if (
                expenseDayId
            ) {

                if (
                    String(
                        expenseDayId
                    ) !==
                    currentDayId
                ) {

                    return;

                }

            }

            else {

                // ==================================================
                // LEGACY RECORD
                // ==================================================

                if (
                    expenseDay.startDate.getTime() !==
                    currentDay.startDate.getTime()
                ) {

                    return;

                }

            }

        }


        // ==================================================
        // MONTH / DATE FILTER
        //
        // CURRENT MONTH = OPERATIONAL MONTH
        // ==================================================

        if (
            fromDate ||
            toDate
        ) {

            if (
                !isExpenseInSelectedMonth(
                    e
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

        let actions =
            "";


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
                        ${Number(
                            e.amount || 0
                        )},
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


        // ==================================================
        // TABLE ROW
        // ==================================================

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


    // ==================================================
    // CURRENT MONTH TOTAL
    // ==================================================

    const totalElement =
        document.getElementById(
            "todayTotal"
        );


    if (totalElement) {

        totalElement.innerText =
            total + " PKR";

    }

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

            expenseData =
                [];


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

        // ==================================================
        // 1. CURRENT DAY
        // ==================================================

        await loadCurrentDayId();


        // ==================================================
        // 2. ALL OPERATIONAL DAYS
        // ==================================================

        await loadOperationalDays();


        // ==================================================
        // 3. DEFAULT CURRENT OPERATIONAL MONTH
        // ==================================================

        setCurrentMonthFilter();


        // ==================================================
        // 4. LISTENER
        // ==================================================

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
