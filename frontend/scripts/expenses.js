import {
    collection,
    addDoc,
    onSnapshot,
    deleteDoc,
    doc,
    updateDoc,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";


console.log(
    "EXPENSES FIREBASE LOADED"
);


// ======================================================
// FIREBASE
// ======================================================

const db =
    window.db;


if (!db) {

    console.error(
        "❌ Firebase DB not loaded"
    );

}


// ======================================================
// BRANCH / ROLE
//
// 🔥 IMPORTANT:
// Branch ko hamesha normalize karenge.
//
// Rasson4
// rasson4
// RASSON4
// Rasson 4
//
// sab -> rasson4
// ======================================================

function normalizeBranch(value) {

    return String(
        value || ""
    )
    .trim()
    .toLowerCase()
    .replace(
        /\s+/g,
        ""
    );

}


const branch =
    normalizeBranch(
        localStorage.getItem(
            "branch"
        )
    );


const role =
    String(
        localStorage.getItem(
            "role"
        ) || ""
    )
    .trim()
    .toLowerCase();


console.log(
    "📌 CURRENT BRANCH:",
    branch
);


// ======================================================
// DATA
// ======================================================

let expenseData = [];

let operationalDays = {};

let operationalDaysByDate = {};

let editId = null;

let selectedType = "all";

let selectedDay = "all";

let fromDate = "";

let toDate = "";

let searchText = "";


// ======================================================
// DATE HELPER
// ======================================================

function getRecordDate(value) {

    if (!value) {

        return null;

    }


    // ==============================================
    // FIREBASE TIMESTAMP
    // ==============================================

    if (
        typeof value === "object" &&
        value.seconds !== undefined
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


    // ==============================================
    // FIRESTORE TIMESTAMP toDate()
    // ==============================================

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


    // ==============================================
    // NORMAL DATE / STRING
    // ==============================================

    const d =
        new Date(value);


    return isNaN(
        d.getTime()
    )
        ? null
        : d;

}


// ======================================================
// PAKISTAN DATE KEY
// ======================================================

function getPakistanDateKey(date) {

    if (!date) {

        return null;

    }


    return date.toLocaleDateString(
        "en-CA",
        {
            timeZone:
                "Asia/Karachi"
        }
    );

}


// ======================================================
// MONTH KEY
// ======================================================

function getMonthKey(date) {

    if (!date) {

        return null;

    }


    const parts =
        new Intl.DateTimeFormat(
            "en-US",
            {
                timeZone:
                    "Asia/Karachi",

                year:
                    "numeric",

                month:
                    "2-digit"
            }
        )
        .formatToParts(
            date
        );


    const year =
        parts.find(
            p =>
                p.type ===
                "year"
        )?.value;


    const month =
        parts.find(
            p =>
                p.type ===
                "month"
        )?.value;


    if (
        !year ||
        !month
    ) {

        return null;

    }


    return (
        `${year}-${month}`
    );

}


// ======================================================
// CURRENT OPERATIONAL DAY ID
// ======================================================

async function loadCurrentDayId() {

    try {

        const snap =
            await getDocs(
                collection(
                    db,
                    "system"
                )
            );


        let foundCurrentDay =
            null;


        snap.forEach(
            d => {

                const data =
                    d.data();


                const dataBranch =
                    normalizeBranch(
                        data.branch
                    );


                if (
                    data.type ===
                    "current_day" &&

                    dataBranch ===
                    branch
                ) {

                    foundCurrentDay = {

                        id:
                            d.id,

                        ...data

                    };

                }

            }
        );


        if (
            foundCurrentDay
        ) {

            window.currentDayId =
                foundCurrentDay.day_id ||
                foundCurrentDay.id ||
                null;


            window.currentDayCreatedAt =
                foundCurrentDay.created_at ||
                null;


            window.currentOperationalDayRecord =
                foundCurrentDay;

        }

        else {

            window.currentDayId =
                null;

            window.currentDayCreatedAt =
                null;

            window.currentOperationalDayRecord =
                null;

        }


        console.log(
            "✅ CURRENT OPERATIONAL DAY:",
            window.currentDayId
        );


        console.log(
            "📌 CURRENT DAY SYSTEM RECORD:",
            window.currentOperationalDayRecord
        );

    }

    catch (error) {

        console.error(
            "❌ CURRENT DAY LOAD ERROR:",
            error
        );

    }

}


// ======================================================
// LOAD OPERATIONAL DAYS
//
// SAME DAYS COLLECTION USED BY ACCOUNTING
// ======================================================

async function loadOperationalDays() {

    operationalDays = {};

    operationalDaysByDate = {};


    try {

        const snap =
            await getDocs(
                collection(
                    db,
                    "days"
                )
            );


        snap.forEach(
            docSnap => {

                const data =
                    docSnap.data();


                // ==========================================
                // BRANCH
                // ==========================================

                const dayBranch =
                    normalizeBranch(
                        data.branch
                    );


                if (
                    dayBranch !==
                    branch
                ) {

                    return;

                }


                // ==========================================
                // DAY ID
                // ==========================================

                const dayId =
                    String(
                        data.day_id ||
                        docSnap.id ||
                        ""
                    )
                    .trim();


                if (!dayId) {

                    return;

                }


                // ==========================================
                // START DATE
                //
                // Shift 1 start is primary
                // ==========================================

                let rawStart =
                    null;


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


                // ==========================================
                // END DATE
                // ==========================================

                let rawEnd =
                    null;


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


                if (!endDate) {

                    endDate =
                        new Date();

                }


                // ==========================================
                // CLOSED STATUS
                // ==========================================

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


                // ==========================================
                // OPERATIONAL DATE
                // ==========================================

                const operationalDateKey =
                    getPakistanDateKey(
                        startDate
                    );


                // ==========================================
                // OPERATIONAL MONTH
                // ==========================================

                const operationalMonth =
                    getMonthKey(
                        startDate
                    );


                const dayObject = {

                    raw: {

                        ...data,

                        is_closed:
                            isClosed

                    },

                    dayId,

                    startDate,

                    endDate,

                    operationalDateKey,

                    operationalMonth

                };


                operationalDays[
                    dayId
                ] =
                    dayObject;


                // ==========================================
                // CANONICAL DAY BY DATE
                // ==========================================

                const existing =
                    operationalDaysByDate[
                        operationalDateKey
                    ];


                if (!existing) {

                    operationalDaysByDate[
                        operationalDateKey
                    ] =
                        dayObject;

                }

                else if (

                    String(
                        window.currentDayId ||
                        ""
                    ).trim()
                    ===
                    dayId

                ) {

                    operationalDaysByDate[
                        operationalDateKey
                    ] =
                        dayObject;

                }

                else if (

                    startDate.getTime()
                    <
                    existing.startDate.getTime()

                ) {

                    operationalDaysByDate[
                        operationalDateKey
                    ] =
                        dayObject;

                }

            }
        );


        console.log(
            "📅 OPERATIONAL DAYS LOADED:",
            operationalDays
        );


        console.log(
            "📅 CANONICAL OPERATIONAL DAYS:",
            operationalDaysByDate
        );

    }

    catch (error) {

        console.error(
            "❌ OPERATIONAL DAYS LOAD ERROR:",
            error
        );

    }

}


// ======================================================
// CURRENT OPERATIONAL DAY
// ======================================================

function getCurrentOperationalDay() {

    const currentId =
        String(
            window.currentDayId ||
            ""
        )
        .trim();


    // ==============================================
    // 1. DIRECT DAY ID
    // ==============================================

    if (
        currentId &&
        operationalDays[
            currentId
        ]
    ) {

        return operationalDays[
            currentId
        ];

    }


    // ==============================================
    // 2. STRING MATCH
    // ==============================================

    if (currentId) {

        const matchedDay =
            Object.values(
                operationalDays
            )
            .find(
                day => {

                    return (
                        String(
                            day.dayId ||
                            ""
                        )
                        .trim()
                        ===
                        currentId
                    );

                }
            );


        if (matchedDay) {

            return matchedDay;

        }

    }


    // ==============================================
    // 3. SYSTEM CURRENT DAY FALLBACK
    // ==============================================

    const systemDay =
        window.currentOperationalDayRecord;


    if (
        systemDay &&
        currentId
    ) {

        let rawStart =
            null;


        if (
            systemDay.shift1?.startMs
        ) {

            rawStart =
                systemDay.shift1.startMs;

        }

        else if (
            systemDay.shift1?.start_ms
        ) {

            rawStart =
                systemDay.shift1.start_ms;

        }

        else if (
            systemDay.start_time
        ) {

            rawStart =
                systemDay.start_time;

        }

        else if (
            systemDay.startTime
        ) {

            rawStart =
                systemDay.startTime;

        }

        else if (
            systemDay.created_at
        ) {

            rawStart =
                systemDay.created_at;

        }


        let startDate =
            getRecordDate(
                rawStart
            );


        if (!startDate) {

            startDate =
                getRecordDate(
                    systemDay.created_at
                );

        }


        if (!startDate) {

            startDate =
                new Date();

        }


        const fallbackDay = {

            raw: {

                ...systemDay,

                is_closed:
                    false

            },

            dayId:
                currentId,

            startDate,

            endDate:
                new Date(),

            operationalDateKey:
                getPakistanDateKey(
                    startDate
                ),

            operationalMonth:
                getMonthKey(
                    startDate
                )

        };


        operationalDays[
            currentId
        ] =
            fallbackDay;


        return fallbackDay;

    }


    // ==============================================
    // 4. LATEST OPEN DAY
    // ==============================================

    const openDays =
        Object.values(
            operationalDaysByDate
        )
        .filter(
            day => {

                return (
                    day.raw?.is_closed !== true &&
                    day.startDate
                );

            }
        )
        .sort(
            (a, b) =>
                b.startDate.getTime()
                -
                a.startDate.getTime()
        );


    if (
        openDays.length
    ) {

        const latest =
            openDays[0];


        window.currentDayId =
            latest.dayId;


        return latest;

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

    )
    .trim();

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


    // ==============================================
    // PRIMARY — SAVED DAY ID
    // ==============================================

    if (
        dayId &&
        operationalDays[
            dayId
        ]
    ) {

        return operationalDays[
            dayId
        ];

    }


    // ==============================================
    // CURRENT DAY FALLBACK
    // ==============================================

    if (

        dayId &&

        String(
            window.currentDayId ||
            ""
        )
        .trim()
        ===
        dayId

    ) {

        return getCurrentOperationalDay();

    }


    // ==============================================
    // LEGACY RECORD
    // ==============================================

    const expenseDate =
        getRecordDate(
            expense.created_at
        );


    if (!expenseDate) {

        return null;

    }


    // ==============================================
    // EXACT PAKISTAN DATE
    // ==============================================

    const dateKey =
        getPakistanDateKey(
            expenseDate
        );


    const canonicalDay =
        operationalDaysByDate[
            dateKey
        ];


    if (

        canonicalDay &&

        expenseDate >=
            canonicalDay.startDate &&

        expenseDate <=
            canonicalDay.endDate

    ) {

        return canonicalDay;

    }


    // ==============================================
    // FULL RANGE FALLBACK
    // ==============================================

    for (
        const day of
        Object.values(
            operationalDaysByDate
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
// EXPENSE OPERATIONAL MONTH
// ======================================================

function getExpenseOperationalMonth(
    expense
) {

    const day =
        getExpenseOperationalDay(
            expense
        );


    // ==============================================
    // FIRST PRIORITY:
    // OPERATIONAL DAY
    // ==============================================

    if (day) {

        return day.operationalMonth;

    }


    // ==============================================
    // SECOND PRIORITY:
    // SAVED OPERATIONAL MONTH
    // ==============================================

    if (
        expense.operational_month
    ) {

        return expense.operational_month;

    }


    // ==============================================
    // THIRD PRIORITY:
    // LEGACY CALENDAR DATE
    // ==============================================

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
        ).value
        .trim();


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


    // ==============================================
    // CURRENT OPERATIONAL DAY
    // ==============================================

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


    // ==============================================
    // SAVE
    //
    // 🔥 ACCOUNTING FIELDS PRESERVED
    // ==============================================

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
                    : new Date()
                        .toISOString()

        }
    );


    document.getElementById(
        "newTitle"
    ).value =
        "";


    document.getElementById(
        "newAmount"
    ).value =
        "";


    document.getElementById(
        "newDate"
    ).value =
        "";


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


    if (
        created_at
    ) {

        const d =
            getRecordDate(
                created_at
            );


        if (d) {

            const localDate =
                new Date(
                    d.getTime()
                    -
                    d.getTimezoneOffset()
                    *
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
        ).value
        .trim();


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


    // ==============================================
    // IMPORTANT:
    // day_id / operational_month
    // CHANGE NAHI KARNA
    // ==============================================

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
// ======================================================

function isOperationalDayInDateRange(
    day
) {

    if (!day) {

        return false;

    }


    // ==============================================
    // NO DATE FILTER
    // ==============================================

    if (
        !fromDate &&
        !toDate
    ) {

        return true;

    }


    // ==============================================
    // FROM DATE
    // ==============================================

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


    // ==============================================
    // TO DATE
    // ==============================================

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
// CHECK SELECTED MONTH
// ======================================================

function isExpenseInSelectedMonth(
    expense
) {

    if (
        !fromDate &&
        !toDate
    ) {

        return true;

    }


    const fromMonth =
        fromDate
            ? fromDate.slice(
                0,
                7
            )
            : "";


    const toMonth =
        toDate
            ? toDate.slice(
                0,
                7
            )
            : "";


    // ==============================================
    // SAME MONTH
    // USE OPERATIONAL MONTH
    // ==============================================

    if (
        fromMonth &&
        toMonth &&
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


    // ==============================================
    // MULTI-MONTH RANGE
    // OPERATIONAL DAY START
    // ==============================================

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


    searchText =
        input.value
            .trim()
            .toLowerCase();


    renderTable();

};


// ======================================================
// PRINT FILTERED EXPENSES
// ======================================================

window.printFilteredExpenses = function () {

    const rows =
        document.querySelectorAll(
            "#expensesBody tr"
        );


    if (!rows.length) {

        alert(
            "No expenses found to print."
        );

        return;

    }


    let total =
        0;


    let tableRows =
        "";


    rows.forEach(
        row => {

            const cells =
                row.querySelectorAll(
                    "td"
                );


            if (
                cells.length <
                5
            ) {

                return;

            }


            const title =
                cells[0]
                    .innerText
                    .trim();


            const amountText =
                cells[1]
                    .innerText
                    .trim();


            const type =
                cells[2]
                    .innerText
                    .trim();


            const shift =
                cells[3]
                    .innerText
                    .trim();


            const date =
                cells[4]
                    .innerText
                    .trim();


            const amount =
                Number(
                    amountText.replace(
                        /[^0-9.-]/g,
                        ""
                    )
                ) || 0;


            total +=
                amount;


            tableRows += `

                <tr>

                    <td>
                        ${title}
                    </td>

                    <td>
                        ${amountText}
                    </td>

                    <td>
                        ${type}
                    </td>

                    <td>
                        ${shift}
                    </td>

                    <td>
                        ${date}
                    </td>

                </tr>

            `;

        }
    );


    if (!tableRows) {

        alert(
            "No expenses found to print."
        );

        return;

    }


    const searchValue =
        document.getElementById(
            "searchInput"
        )?.value
        || "";


    const fromValue =
        document.getElementById(
            "fromDate"
        )?.value
        || "";


    const toValue =
        document.getElementById(
            "toDate"
        )?.value
        || "";


    const typeValue =
        document.getElementById(
            "filterType"
        )?.value
        || "all";


    const dayValue =
        document.getElementById(
            "dayFilter"
        )?.value
        || "all";


    const printWindow =
        window.open(
            "",
            "_blank",
            "width=1000,height=800"
        );


    if (!printWindow) {

        alert(
            "Please allow pop-ups to print."
        );

        return;

    }


    printWindow.document.write(`

<!DOCTYPE html>

<html>

<head>

<title>
Rasson Snooker Academy - Expense Report
</title>

<style>

body {

    font-family:
        Arial,
        sans-serif;

    padding:
        30px;

    color:
        #111;

}

h1 {

    text-align:
        center;

    margin-bottom:
        5px;

}

h2 {

    text-align:
        center;

    margin-top:
        0;

    font-size:
        18px;

}

.info {

    margin-top:
        25px;

    line-height:
        1.8;

}

table {

    width:
        100%;

    border-collapse:
        collapse;

    margin-top:
        25px;

}

th,
td {

    border:
        1px solid #222;

    padding:
        10px;

    text-align:
        center;

}

th {

    background:
        #eee;

}

.total {

    margin-top:
        20px;

    text-align:
        right;

    font-size:
        20px;

    font-weight:
        bold;

}

@media print {

    body {

        padding:
            10px;

    }

}

</style>

</head>

<body>

<h1>
RASSON SNOOKER ACADEMY
</h1>

<h2>
EXPENSE REPORT
</h2>

<div class="info">

<b>Branch:</b>
${branch || "-"}

<br>

<b>Expense Type:</b>
${typeValue}

<br>

<b>Day Filter:</b>
${dayValue}

<br>

<b>From:</b>
${fromValue || "-"}

&nbsp;&nbsp;

<b>To:</b>
${toValue || "-"}

<br>

<b>Search:</b>
${searchValue || "All Expenses"}

</div>

<table>

<thead>

<tr>

<th>
Title
</th>

<th>
Amount
</th>

<th>
Type
</th>

<th>
Shift
</th>

<th>
Date & Time
</th>

</tr>

</thead>

<tbody>

${tableRows}

</tbody>

</table>

<div class="total">

Total:
${total.toLocaleString()}
PKR

</div>

<script>

window.onload = function () {

    window.print();

};

<\/script>

</body>

</html>

`);


    printWindow.document.close();

};


// ======================================================
// SET CURRENT OPERATIONAL MONTH
// ======================================================

function setCurrentMonthFilter() {

    const currentDay =
        getCurrentOperationalDay();


    let operationalMonth =
        null;


    // ==============================================
    // CURRENT OPERATIONAL DAY
    // ==============================================

    if (
        currentDay &&
        currentDay.startDate
    ) {

        operationalMonth =
            currentDay.operationalMonth;

    }


    // ==============================================
    // FALLBACK — CURRENT PAKISTAN MONTH
    // ==============================================

    if (
        !operationalMonth
    ) {

        operationalMonth =
            getMonthKey(
                new Date()
            );

    }


    // ==============================================
    // MONTH START
    // ==============================================

    fromDate =
        `${operationalMonth}-01`;


    // ==============================================
    // MONTH END
    // ==============================================

    const parts =
        operationalMonth.split(
            "-"
        );


    const year =
        Number(
            parts[0]
        );


    const month =
        Number(
            parts[1]
        );


    const lastDay =
        new Date(
            year,
            month,
            0
        ).getDate();


    toDate =
        `${operationalMonth}-${String(
            lastDay
        ).padStart(
            2,
            "0"
        )}`;


    console.log(
        "📅 CURRENT OPERATIONAL MONTH:",
        operationalMonth
    );


    console.log(
        "📅 EXPENSE FILTER:",
        fromDate,
        "→",
        toDate
    );

}


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


    body.innerHTML =
        "";


    let total =
        0;


    expenseData.forEach(
        e => {

            // ==============================================
            // TYPE FILTER
            // ==============================================

            if (
                selectedType !==
                "all" &&

                e.type !==
                selectedType
            ) {

                return;

            }


            // ==============================================
            // CURRENT OPERATIONAL DAY
            // ==============================================

            if (
                selectedDay ===
                "current"
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


                const expenseDayId =
                    getRecordDayId(
                        e
                    );


                const currentDayId =
                    String(
                        window.currentDayId ||
                        ""
                    )
                    .trim();


                // ==========================================
                // EXACT DAY ID MATCH
                // ==========================================

                if (
                    expenseDayId
                ) {

                    if (
                        String(
                            expenseDayId
                        )
                        !==
                        currentDayId
                    ) {

                        return;

                    }

                }

                // ==========================================
                // LEGACY RECORD
                // ==========================================

                else {

                    if (
                        !expenseDay
                    ) {

                        return;

                    }


                    if (
                        expenseDay.startDate
                            .getTime()
                        !==
                        currentDay.startDate
                            .getTime()
                    ) {

                        return;

                    }

                }

            }


            // ==============================================
            // OPERATIONAL MONTH / DATE RANGE
            // ==============================================

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


            // ==============================================
            // SEARCH TITLE
            // ==============================================

            if (
                searchText
            ) {

                const expenseTitle =
                    String(
                        e.title || ""
                    )
                    .toLowerCase();


                if (
                    !expenseTitle.includes(
                        searchText
                    )
                ) {

                    return;

                }

            }


            // ==============================================
            // TOTAL
            // ==============================================

            total +=
                Number(
                    e.amount || 0
                );


            // ==============================================
            // ACTIONS
            // ==============================================

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


            // ==============================================
            // TABLE ROW
            // ==============================================

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
                            e.shift ===
                            "shift2"

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

        }
    );


    // ==============================================
    // TOTAL
    // ==============================================

    const totalElement =
        document.getElementById(
            "todayTotal"
        );


    if (
        totalElement
    ) {

        totalElement.innerText =
            total.toLocaleString()
            +
            " PKR";

    }


    // ==============================================
    // TOTAL LABEL
    // ==============================================

    const totalLabel =
        document.getElementById(
            "totalLabel"
        );


    if (
        totalLabel
    ) {

        if (
            searchText
        ) {

            totalLabel.innerText =
                "Search Total:";

        }

        else {

            totalLabel.innerText =
                "Current Month Total:";

        }

    }

}


// ======================================================
// REALTIME LISTENER
//
// 🔥 MAIN FIX
//
// Firebase query mein:
// where("branch", "==", branch)
//
// USE NAHI KAR RAHE.
//
// Pehle saare expenses load honge,
// phir JS normalized branch se filter karega.
//
// Is se Rasson4 / rasson4 / Rasson 4
// sab match honge.
// ======================================================

function startExpensesListener() {

    const expenseCollection =
        collection(
            db,
            "expenses"
        );


    onSnapshot(

        expenseCollection,

        snap => {

            expenseData =
                [];


            snap.forEach(
                docSnap => {

                    const data =
                        docSnap.data();


                    // ==========================================
                    // NORMALIZED FIREBASE BRANCH
                    // ==========================================

                    const recordBranch =
                        normalizeBranch(
                            data.branch
                        );


                    // ==========================================
                    // CURRENT BRANCH ONLY
                    // ==========================================

                    if (
                        recordBranch !==
                        branch
                    ) {

                        return;

                    }


                    expenseData.push({

                        id:
                            docSnap.id,

                        ...data

                    });

                }
            );


            // ==============================================
            // SORT NEWEST FIRST
            // ==============================================

            expenseData.sort(
                (a, b) => {

                    const dateA =
                        getRecordDate(
                            a.created_at
                        );


                    const dateB =
                        getRecordDate(
                            b.created_at
                        );


                    return (

                        (
                            dateB?.getTime()
                            || 0
                        )

                        -

                        (
                            dateA?.getTime()
                            || 0
                        )

                    );

                }
            );


            console.log(
                "📥 EXPENSE CURRENT BRANCH:",
                branch
            );


            console.log(
                "📥 EXPENSE RECORDS FOR BRANCH:",
                expenseData.length
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

        // ==============================================
        // 1. CURRENT DAY
        // ==============================================

        await loadCurrentDayId();


        // ==============================================
        // 2. OPERATIONAL DAYS
        // ==============================================

        await loadOperationalDays();


        // ==============================================
        // 3. DEFAULT CURRENT OPERATIONAL MONTH
        // ==============================================

        setCurrentMonthFilter();


        // ==============================================
        // 4. REALTIME LISTENER
        // ==============================================

        startExpensesListener();


        console.log(
            "✅ EXPENSES OPERATIONAL ACCOUNTING READY",
            {

                currentDayId:
                    window.currentDayId,

                currentDay:
                    getCurrentOperationalDay(),

                branch:
                    branch

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
