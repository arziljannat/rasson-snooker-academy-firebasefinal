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
    getDocs,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";


console.log(
    "EASYPAISA FIREBASE LOADED"
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
// ======================================================

const branch =
    (localStorage.getItem("branch") || "")
        .toLowerCase()
        .replace(/\s+/g, "");


const role =
    (localStorage.getItem("role") || "")
        .toLowerCase();


// ======================================================
// DATA
// ======================================================

let easyData = [];

let operationalDays = {};

let operationalDaysByDate = {};

let editId = null;

let easyDayFilter = "all";

let fromDate = "";

let toDate = "";


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
// OPERATIONAL MONTH KEY
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
        ).formatToParts(
            date
        );


    const year =
        parts.find(
            p => p.type === "year"
        )?.value;


    const month =
        parts.find(
            p => p.type === "month"
        )?.value;


    if (
        !year ||
        !month
    ) {

        return null;

    }


    return `${year}-${month}`;

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


    // Firebase Timestamp toDate()
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


    const d =
        new Date(value);


    return isNaN(
        d.getTime()
    )
        ? null
        : d;

}


// ======================================================
// CURRENT DAY ID
// ======================================================

async function loadCurrentDayId() {

    const snap =
        await getDocs(
            collection(
                db,
                "system"
            )
        );


    let foundCurrentDay =
        null;


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

            foundCurrentDay = {

                id:
                    d.id,

                ...data

            };

        }

    });


    if (foundCurrentDay) {

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
        "✅ EASYPAISA CURRENT OPERATIONAL DAY:",
        window.currentDayId
    );


    console.log(
        "📌 EASYPAISA CURRENT DAY SYSTEM RECORD:",
        window.currentOperationalDayRecord
    );

}


// ======================================================
// LOAD OPERATIONAL DAYS
//
// SAME LOGIC AS EXPENSES
// ======================================================

async function loadOperationalDays() {

    operationalDays = {};

    operationalDaysByDate = {};


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
            .replace(
                /\s+/g,
                ""
            );


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


        // ==============================================
        // OPERATIONAL DAY START
        // ==============================================

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


        // ==============================================
        // END
        // ==============================================

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


        // ==============================================
        // CLOSED
        // ==============================================

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


        const operationalDateKey =
            getPakistanDateKey(
                startDate
            );


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


        // ==============================================
        // DAY ID LOOKUP
        // ==============================================

        operationalDays[dayId] =
            dayObject;


        // ==============================================
        // CANONICAL DATE LOOKUP
        // ==============================================

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

        else {

            // Current operational day gets priority
            if (
                String(
                    window.currentDayId || ""
                ).trim()
                ===
                dayId
            ) {

                operationalDaysByDate[
                    operationalDateKey
                ] =
                    dayObject;

            }

            // Otherwise earliest start
            else if (
                startDate.getTime() <
                existing.startDate.getTime()
            ) {

                operationalDaysByDate[
                    operationalDateKey
                ] =
                    dayObject;

            }

        }

    });


    console.log(
        "📅 EASYPAISA OPERATIONAL DAYS:",
        operationalDays
    );


    console.log(
        "📅 EASYPAISA CANONICAL DAYS:",
        operationalDaysByDate
    );

}


// ======================================================
// CURRENT OPERATIONAL DAY
//
// SAME LOGIC AS EXPENSES
// ======================================================

function getCurrentOperationalDay() {

    const currentId =
        String(
            window.currentDayId || ""
        ).trim();


    // ==============================================
    // STEP 1
    // DIRECT DAY-ID LOOKUP
    // ==============================================

    if (
        currentId &&
        operationalDays[currentId]
    ) {

        return operationalDays[currentId];

    }


    // ==============================================
    // STEP 2
    // DAY-ID MATCH
    // ==============================================

    if (currentId) {

        const matchedDay =
            Object.values(
                operationalDays
            )
            .find(day => {

                return (
                    String(
                        day.dayId || ""
                    ).trim()
                    ===
                    currentId
                );

            });


        if (matchedDay) {

            return matchedDay;

        }

    }


    // ==============================================
    // STEP 3
    // CURRENT DAY SYSTEM RECORD FALLBACK
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


        const startDate =
            getRecordDate(
                rawStart
            );


        if (startDate) {

            let rawEnd =
                null;


            if (
                systemDay.shift2?.endMs
            ) {

                rawEnd =
                    systemDay.shift2.endMs;

            }

            else if (
                systemDay.shift2?.end_ms
            ) {

                rawEnd =
                    systemDay.shift2.end_ms;

            }

            else if (
                systemDay.end_time
            ) {

                rawEnd =
                    systemDay.end_time;

            }

            else if (
                systemDay.endTime
            ) {

                rawEnd =
                    systemDay.endTime;

            }


            let endDate =
                getRecordDate(
                    rawEnd
                );


            if (!endDate) {

                endDate =
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

                endDate,

                operationalDateKey:
                    getPakistanDateKey(
                        startDate
                    ),

                operationalMonth:
                    getMonthKey(
                        startDate
                    )

            };


            operationalDays[currentId] =
                fallbackDay;


            console.log(
                "✅ EASYPAISA CURRENT DAY BUILT FROM SYSTEM:",
                fallbackDay
            );


            return fallbackDay;

        }

    }


    // ==============================================
    // STEP 4
    // LATEST OPEN DAY
    // ==============================================

    const openDays =
        Object.values(
            operationalDaysByDate
        )
        .filter(day => {

            return (
                day.raw?.is_closed !== true &&
                day.startDate
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
    ).trim();

}


// ======================================================
// EASYPAISA OPERATIONAL DAY
//
// SAME MAPPING STYLE AS EXPENSES
// ======================================================

function getEasyOperationalDay(
    easy
) {

    const dayId =
        getRecordDayId(
            easy
        );


    // ==============================================
    // PRIMARY
    // SAVED DAY ID
    // ==============================================

    if (
        dayId &&
        operationalDays[dayId]
    ) {

        return operationalDays[dayId];

    }


    // ==============================================
    // LEGACY FALLBACK
    // ==============================================

    const easyDate =
        getRecordDate(
            easy.created_at
        );


    if (!easyDate) {

        return null;

    }


    // ==============================================
    // EXACT DATE FIRST
    // ==============================================

    const dateKey =
        getPakistanDateKey(
            easyDate
        );


    const canonicalDay =
        operationalDaysByDate[
            dateKey
        ];


    if (
        canonicalDay &&
        easyDate >=
            canonicalDay.startDate &&
        easyDate <=
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
            easyDate >=
                day.startDate &&

            easyDate <=
                day.endDate
        ) {

            return day;

        }

    }


    return null;

}


// ======================================================
// EASYPAISA OPERATIONAL MONTH
//
// SAME LOGIC AS EXPENSES
// ======================================================

function getEasyOperationalMonth(
    easy
) {

    const day =
        getEasyOperationalDay(
            easy
        );


    if (day) {

        return day.operationalMonth;

    }


    if (
        easy.operational_month
    ) {

        return easy.operational_month;

    }


    return getMonthKey(
        getRecordDate(
            easy.created_at
        )
    );

}


// ======================================================
// CURRENT OPERATIONAL MONTH
// ======================================================

function setCurrentMonthFilter() {

    const currentDay =
        getCurrentOperationalDay();


    let operationalMonth =
        null;


    if (
        currentDay &&
        currentDay.startDate
    ) {

        operationalMonth =
            currentDay.operationalMonth;

    }


    if (!operationalMonth) {

        operationalMonth =
            getMonthKey(
                new Date()
            );

    }


    fromDate =
        `${operationalMonth}-01`;


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


    const monthInput =
        document.getElementById(
            "monthFilter"
        );


    if (monthInput) {

        monthInput.value =
            operationalMonth;

    }


    console.log(
        "📅 EASYPAISA CURRENT OPERATIONAL MONTH:",
        operationalMonth
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

            second:
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

window.openEasyPopup = () => {

    document
        .getElementById(
            "easyPopup"
        )
        .classList
        .remove(
            "hide"
        );

};


window.closeEasyPopup = () => {

    document
        .getElementById(
            "easyPopup"
        )
        .classList
        .add(
            "hide"
        );


    const amount =
        document.getElementById(
            "easyAmount"
        );


    const note =
        document.getElementById(
            "easyNote"
        );


    if (amount) {

        amount.value =
            "";

    }


    if (note) {

        note.value =
            "";

    }


    editId =
        null;

};


// ======================================================
// SAVE EASYPAISA
// ======================================================

window.saveEasy = async () => {

    try {

        const amount =
            Number(
                document.getElementById(
                    "easyAmount"
                ).value
            );


        const note =
            document.getElementById(
                "easyNote"
            ).value.trim();


        if (
            !amount ||
            amount <= 0
        ) {

            alert(
                "Enter valid amount"
            );

            return;

        }


        const currentDay =
            getCurrentOperationalDay();


        if (
            !window.currentDayId ||
            !currentDay
        ) {

            alert(
                "Current Operational Day not found."
            );

            console.error(
                "❌ EASYPAISA SAVE BLOCKED:",
                {

                    currentDayId:
                        window.currentDayId,

                    currentDay

                }
            );

            return;

        }


        await addDoc(
            collection(
                db,
                "easypaisa"
            ),
            {

                amount,

                note,

                branch,

                day_id:
                    window.currentDayId,

                day_created_at:
                    currentDay.startDate,

                operational_month:
                    currentDay.operationalMonth,

                created_at:
                    serverTimestamp()

            }
        );


        console.log(
            "✅ EASYPAISA SAVED"
        );


        closeEasyPopup();

    }

    catch (error) {

        console.error(
            "❌ EASYPAISA SAVE ERROR:",
            error
        );


        alert(
            "EasyPaisa save failed. Check console."
        );

    }

};


// ======================================================
// DELETE
// ======================================================

window.deleteEasy = async (
    id
) => {

    try {

        if (
            role !== "admin" &&
            role !== "super_admin"
        ) {

            alert(
                "Only admin can delete EasyPaisa."
            );

            return;

        }


        if (
            !confirm(
                "Delete this entry?"
            )
        ) {

            return;

        }


        await deleteDoc(
            doc(
                db,
                "easypaisa",
                id
            )
        );


        console.log(
            "✅ EASYPAISA DELETED:",
            id
        );

    }

    catch (error) {

        console.error(
            "❌ EASYPAISA DELETE ERROR:",
            error
        );

    }

};


// ======================================================
// EDIT
// ======================================================

window.editEasy = (
    id,
    amount,
    note
) => {

    if (
        role !== "admin" &&
        role !== "super_admin"
    ) {

        alert(
            "Only admin can edit EasyPaisa."
        );

        return;

    }


    editId =
        id;


    document.getElementById(
        "easyAmount"
    ).value =
        amount || "";


    document.getElementById(
        "easyNote"
    ).value =
        note || "";


    openEasyPopup();

};


// ======================================================
// UPDATE
// ======================================================

window.updateEasy = async () => {

    try {

        if (
            role !== "admin" &&
            role !== "super_admin"
        ) {

            alert(
                "Only admin can edit EasyPaisa."
            );

            return;

        }


        if (!editId) {

            alert(
                "No EasyPaisa entry selected."
            );

            return;

        }


        const amount =
            Number(
                document.getElementById(
                    "easyAmount"
                ).value
            );


        const note =
            document.getElementById(
                "easyNote"
            ).value.trim();


        if (
            !amount ||
            amount <= 0
        ) {

            alert(
                "Enter valid amount"
            );

            return;

        }


        await updateDoc(
            doc(
                db,
                "easypaisa",
                editId
            ),
            {

                amount,

                note

            }
        );


        console.log(
            "✅ EASYPAISA UPDATED:",
            editId
        );


        closeEasyPopup();

    }

    catch (error) {

        console.error(
            "❌ EASYPAISA UPDATE ERROR:",
            error
        );

    }

};


// ======================================================
// DAY FILTER
//
// ONLY TWO OPTIONS:
// all / current
// ======================================================

window.filterEasyByDay = function () {

    const input =
        document.getElementById(
            "easyDayFilter"
        );


    easyDayFilter =
        input
            ? input.value
            : "all";


    console.log(
        "📅 EASYPAISA DAY FILTER:",
        easyDayFilter
    );


    renderTable();

};


// ======================================================
// MONTH FILTER
// ======================================================

window.filterEasyByMonth = function () {

    const input =
        document.getElementById(
            "monthFilter"
        );


    const selectedMonth =
        input
            ? input.value
            : "";


    if (!selectedMonth) {

        setCurrentMonthFilter();

        renderTable();

        return;

    }


    fromDate =
        `${selectedMonth}-01`;


    const parts =
        selectedMonth.split(
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
        `${selectedMonth}-${String(
            lastDay
        ).padStart(
            2,
            "0"
        )}`;


    console.log(
        "📅 EASYPAISA SELECTED MONTH:",
        selectedMonth
    );


    renderTable();

};


// ======================================================
// EASYPAISA MONTH FILTER
//
// SAME MONTH LOGIC AS EXPENSES
// ======================================================

function isEasyInSelectedMonth(
    easy
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
            : null;


    const toMonth =
        toDate
            ? toDate.slice(
                0,
                7
            )
            : null;


    // ==============================================
    // SAME MONTH
    // ==============================================

    if (
        fromMonth &&
        toMonth &&
        fromMonth === toMonth
    ) {

        const easyMonth =
            getEasyOperationalMonth(
                easy
            );


        return (
            easyMonth ===
            fromMonth
        );

    }


    // ==============================================
    // MULTI-MONTH RANGE
    // ==============================================

    const easyDay =
        getEasyOperationalDay(
            easy
        );


    if (!easyDay) {

        return false;

    }


    if (fromDate) {

        const from =
            new Date(
                `${fromDate}T00:00:00`
            );


        if (
            easyDay.startDate <
            from
        ) {

            return false;

        }

    }


    if (toDate) {

        const to =
            new Date(
                `${toDate}T23:59:59.999`
            );


        if (
            easyDay.startDate >
            to
        ) {

            return false;

        }

    }


    return true;

}


// ======================================================
// EASYPAISA FILTER
//
// FILTER 1:
// Current Day / All Days
//
// FILTER 2:
// Operational Month
// ======================================================

function isEasyVisible(
    easy
) {

    // ==============================================
    // FILTER 1
    // CURRENT OPERATIONAL DAY
    // ==============================================

    if (
        easyDayFilter === "current"
    ) {

        const currentDay =
            getCurrentOperationalDay();


        if (!currentDay) {

            return false;

        }


        const easyDay =
            getEasyOperationalDay(
                easy
            );


        if (!easyDay) {

            return false;

        }


        const easyDayId =
            getRecordDayId(
                easy
            );


        const currentDayId =
            String(
                window.currentDayId ||
                ""
            ).trim();


        // Saved day_id available
        if (
            easyDayId
        ) {

            return (
                easyDayId ===
                currentDayId
            );

        }


        // Legacy record
        return (
            easyDay.startDate.getTime()
            ===
            currentDay.startDate.getTime()
        );

    }


    // ==============================================
    // FILTER 2
    // SELECTED OPERATIONAL MONTH
    // ==============================================

    return isEasyInSelectedMonth(
        easy
    );

}


// ======================================================
// ESCAPE HTML
// ======================================================

function escapeHtml(value) {

    return String(
        value ?? ""
    )
    .replace(
        /&/g,
        "&amp;"
    )
    .replace(
        /</g,
        "&lt;"
    )
    .replace(
        />/g,
        "&gt;"
    )
    .replace(
        /"/g,
        "&quot;"
    )
    .replace(
        /'/g,
        "&#039;"
    );

}


// ======================================================
// RENDER TABLE
// ======================================================

function renderTable() {

    const tbody =
        document.getElementById(
            "easyTable"
        );


    if (!tbody) {

        return;

    }


    tbody.innerHTML =
        "";


    let total =
        0;


    easyData.forEach(e => {

        // ==============================================
        // APPLY BOTH FILTERS
        // ==============================================

        if (
            !isEasyVisible(
                e
            )
        ) {

            return;

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

            actions = `

                <button
                    class="btn-green"
                    onclick='editEasy(
                        ${JSON.stringify(
                            e.id
                        )},
                        ${Number(
                            e.amount || 0
                        )},
                        ${JSON.stringify(
                            e.note || ""
                        )}
                    )'
                >
                    Edit
                </button>

                <button
                    class="btn-red"
                    onclick='deleteEasy(
                        ${JSON.stringify(
                            e.id
                        )}
                    )'
                >
                    Delete
                </button>

            `;

        }


        // ==============================================
        // TABLE ROW
        // ==============================================

        tbody.innerHTML += `

            <tr>

                <td>
                    ${formatTime(
                        e.created_at
                    )}
                </td>

                <td>
                    ${Number(
                        e.amount || 0
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        e.note || "-"
                    )}
                </td>

                <td>
                    ${actions}
                </td>

            </tr>

        `;

    });


    // ==============================================
    // TOTAL
    // ==============================================

    const totalElement =
        document.getElementById(
            "todayEasyTotal"
        );


    if (totalElement) {

        totalElement.innerText =
            total.toLocaleString() +
            " PKR";

    }


    console.log(
        "💰 EASYPAISA FILTERED TOTAL:",
        total
    );

}


// ======================================================
// REALTIME LISTENER
// ======================================================

function startEasyListener() {

    const q =
        query(

            collection(
                db,
                "easypaisa"
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

            easyData =
                [];


            snap.forEach(
                docSnap => {

                    easyData.push({

                        id:
                            docSnap.id,

                        ...docSnap.data()

                    });

                }
            );


            console.log(
                "📥 EASYPAISA RECORDS:",
                easyData.length
            );


            renderTable();

        },

        error => {

            console.error(
                "❌ EASYPAISA LISTENER ERROR:",
                error
            );

        }

    );

}


// ======================================================
// INIT
// ======================================================

async function initEasyPaisa() {

    try {

        await loadCurrentDayId();

        await loadOperationalDays();


        // ==============================================
        // DEFAULT DAY FILTER
        // ==============================================

        easyDayFilter =
            "all";


        const dayFilter =
            document.getElementById(
                "easyDayFilter"
            );


        if (dayFilter) {

            dayFilter.value =
                "all";

        }


        // ==============================================
        // DEFAULT OPERATIONAL MONTH
        // ==============================================

        setCurrentMonthFilter();


        // ==============================================
        // START FIREBASE LISTENER
        // ==============================================

        startEasyListener();


        console.log(
            "✅ EASYPAISA OPERATIONAL ACCOUNTING READY",
            {

                currentDayId:
                    window.currentDayId,

                currentDay:
                    getCurrentOperationalDay(),

                operationalMonth:
                    fromDate
                        ? fromDate.slice(
                            0,
                            7
                        )
                        : null

            }
        );

    }

    catch (error) {

        console.error(
            "❌ EASYPAISA INIT ERROR:",
            error
        );

    }

}


initEasyPaisa();
