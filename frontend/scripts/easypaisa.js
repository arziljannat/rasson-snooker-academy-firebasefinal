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


console.log("✅ EASYPAISA FIREBASE LOADED");


// ======================================================
// FIREBASE
// ======================================================

const db = window.db;

if (!db) {
    console.error("❌ Firebase DB not loaded");
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

let fromDate = "";

let toDate = "";


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

        return isNaN(d.getTime())
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
// PAKISTAN DATE KEY
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
// OPERATIONAL MONTH
// ======================================================

function getMonthKey(date) {

    if (!date) {
        return null;
    }


    const parts =
        new Intl.DateTimeFormat(
            "en-US",
            {
                timeZone: "Asia/Karachi",
                year: "numeric",
                month: "2-digit"
            }
        ).formatToParts(date);


    const year =
        parts.find(
            p => p.type === "year"
        )?.value;


    const month =
        parts.find(
            p => p.type === "month"
        )?.value;


    if (!year || !month) {
        return null;
    }


    return `${year}-${month}`;

}


// ======================================================
// CURRENT DAY ID
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

            window.currentDayId = null;

            window.currentDayCreatedAt = null;

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

    catch (error) {

        console.error(
            "❌ EASYPAISA CURRENT DAY ERROR:",
            error
        );

    }

}


// ======================================================
// LOAD OPERATIONAL DAYS
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
                    "");


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


            // ==========================================
            // START
            // ==========================================

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


            // ==========================================
            // END
            // ==========================================

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


            if (!endDate) {

                endDate =
                    new Date();

            }


            // ==========================================
            // CLOSED
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


            operationalDays[dayId] =
                dayObject;


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

            else if (
                startDate.getTime() <
                existing.startDate.getTime()
            ) {

                operationalDaysByDate[
                    operationalDateKey
                ] =
                    dayObject;

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

    catch (error) {

        console.error(
            "❌ EASYPAISA DAYS ERROR:",
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
            window.currentDayId || ""
        ).trim();


    // ==============================================
    // 1. DIRECT DAY ID
    // ==============================================

    if (
        currentId &&
        operationalDays[currentId]
    ) {

        return operationalDays[currentId];

    }


    // ==============================================
    // 2. STRING / NUMBER MATCH
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
    // 3. SYSTEM CURRENT DAY FALLBACK
    // ==============================================

    const systemDay =
        window.currentOperationalDayRecord;


    if (
        systemDay &&
        currentId
    ) {

        let rawStart = null;


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


        // ==========================================
        // If no start date found
        // use created_at or today
        // ==========================================

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
                is_closed: false
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


        operationalDays[currentId] =
            fallbackDay;


        console.log(
            "✅ EASYPAISA CURRENT DAY BUILT FROM SYSTEM:",
            fallbackDay
        );


        return fallbackDay;

    }


    // ==============================================
    // 4. LATEST OPEN DAY
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
// ======================================================

function getEasyOperationalDay(
    easy
) {

    const dayId =
        getRecordDayId(
            easy
        );


    // ==============================================
    // PRIMARY — SAVED DAY ID
    // ==============================================

    if (
        dayId &&
        operationalDays[dayId]
    ) {

        return operationalDays[dayId];

    }


    // ==============================================
    // CURRENT DAY FALLBACK
    // ==============================================

    if (
        dayId &&
        String(
            window.currentDayId || ""
        ).trim()
        ===
        dayId
    ) {

        return getCurrentOperationalDay();

    }


    // ==============================================
    // LEGACY DATA
    // ==============================================

    const easyDate =
        getRecordDate(
            easy.created_at
        );


    if (!easyDate) {
        return null;
    }


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
        amount.value = "";
    }


    if (note) {
        note.value = "";
    }


    window.editId = null;

};


// ======================================================
// SAVE
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

window.editId = null;


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


    window.editId =
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


        if (
            !window.editId
        ) {

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
                window.editId
            ),
            {

                amount,

                note

            }
        );


        console.log(
            "✅ EASYPAISA UPDATED:",
            window.editId
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


    renderTable();

};


// ======================================================
// CURRENT MONTH FILTER
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
// DATE RANGE SUPPORT
// ======================================================

window.filterEasyByDateRange = function () {

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
// CHECK DATE RANGE
// ======================================================

function isEasyInSelectedDateRange(
    easy
) {

    if (
        !fromDate &&
        !toDate
    ) {

        return true;

    }


    const easyDay =
        getEasyOperationalDay(
            easy
        );


    if (!easyDay) {

        // Legacy fallback
        const easyDate =
            getRecordDate(
                easy.created_at
            );


        if (!easyDate) {
            return false;
        }


        if (fromDate) {

            const from =
                new Date(
                    `${fromDate}T00:00:00`
                );


            if (
                easyDate < from
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
                easyDate > to
            ) {

                return false;

            }

        }


        return true;

    }


    // ==============================================
    // MONTH FILTER
    // ==============================================

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


    if (
        fromMonth &&
        toMonth &&
        fromMonth === toMonth
    ) {

        return (
            easyDay.operationalMonth ===
            fromMonth
        );

    }


    // ==============================================
    // MULTI MONTH RANGE
    // ==============================================

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
// RENDER
// ======================================================

function renderTable() {

    const tbody =
        document.getElementById(
            "easyTable"
        );


    if (!tbody) {
        return;
    }


    tbody.innerHTML = "";


    let total = 0;


    easyData.forEach(e => {

        // ==============================================
        // DATE / MONTH FILTER
        // ==============================================

        if (
            !isEasyInSelectedDateRange(
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

        let actions = "";


        if (
            role === "admin" ||
            role === "super_admin"
        ) {

            actions = `

                <button
                    class="btn-green"
                    onclick='editEasy(
                        ${JSON.stringify(e.id)},
                        ${Number(e.amount || 0)},
                        ${JSON.stringify(e.note || "")}
                    )'
                >
                    Edit
                </button>

                <button
                    class="btn-red"
                    onclick='deleteEasy(
                        ${JSON.stringify(e.id)}
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

            easyData = [];


            snap.forEach(
                docSnap => {

                    easyData.push({

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

        // Default current operational month
        setCurrentMonthFilter();

        startEasyListener();


        console.log(
            "✅ EASYPAISA OPERATIONAL ACCOUNTING READY",
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
            "❌ EASYPAISA INIT ERROR:",
            error
        );

    }

}


initEasyPaisa();
