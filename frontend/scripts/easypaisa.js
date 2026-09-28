import {
    collection,
    addDoc,
    onSnapshot,
    deleteDoc,
    doc,
    updateDoc,
    getDocs,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";


console.log(
    "✅ EASYPAISA FIREBASE LOADED"
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

function normalizeBranch(
    value
) {

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

let easyData = [];

let operationalDays = {};

let operationalDaysByDate = {};

let fromDate = "";

let toDate = "";

let easyDayFilter = "all";


// ======================================================
// DATE HELPER
// ======================================================

function getRecordDate(
    value
) {

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
        new Date(
            value
        );


    return isNaN(
        d.getTime()
    )
        ? null
        : d;

}


// ======================================================
// PAKISTAN DATE KEY
// ======================================================

function getPakistanDateKey(
    date
) {

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

function getMonthKey(
    date
) {

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
// CURRENT OPERATIONAL DAY
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
            docSnap => {

                const data =
                    docSnap.data();


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
                            docSnap.id,

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
            "❌ CURRENT DAY LOAD ERROR:",
            error
        );

    }

}


// ======================================================
// LOAD OPERATIONAL DAYS
//
// SAME "days" COLLECTION
// USED BY ACCOUNTING / REPORTS
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
                // OPERATIONAL DAY START
                //
                // SHIFT 1 START PRIMARY
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
                // OPERATIONAL DAY END
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


                // ==========================================
                // OPEN DAY
                // ==========================================

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


                // ==========================================
                // OPERATIONAL MONTH
                //
                // MONTH = DAY START MONTH
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

                    operationalMonth

                };


                operationalDays[
                    dayId
                ] =
                    dayObject;


                // ==========================================
                // DATE INDEX
                // ==========================================

                const dateKey =
                    getPakistanDateKey(
                        startDate
                    );


                const existing =
                    operationalDaysByDate[
                        dateKey
                    ];


                if (!existing) {

                    operationalDaysByDate[
                        dateKey
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
                        dateKey
                    ] =
                        dayObject;

                }

                else if (

                    startDate.getTime()
                    <
                    existing.startDate.getTime()

                ) {

                    operationalDaysByDate[
                        dateKey
                    ] =
                        dayObject;

                }

            }
        );


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
    // PRIMARY
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
    // FALLBACK
    // LATEST OPEN DAY
    // ==============================================

    const openDays =
        Object.values(
            operationalDays
        )
        .filter(
            day => {

                return (
                    day.raw?.is_closed !== true
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


    // ==============================================
    // SYSTEM RECORD FALLBACK
    // ==============================================

    const systemDay =
        window.currentOperationalDayRecord;


    if (
        systemDay
    ) {

        let rawStart =
            systemDay.shift1?.startMs ||
            systemDay.shift1?.start_ms ||
            systemDay.start_time ||
            systemDay.startTime ||
            systemDay.created_at;


        let startDate =
            getRecordDate(
                rawStart
            );


        if (!startDate) {

            startDate =
                new Date();

        }


        const fallback = {

            raw: {

                ...systemDay,

                is_closed:
                    false

            },

            dayId:
                String(
                    window.currentDayId ||
                    systemDay.day_id ||
                    ""
                ).trim(),

            startDate,

            endDate:
                new Date(),

            operationalMonth:
                getMonthKey(
                    startDate
                )

        };


        if (
            fallback.dayId
        ) {

            operationalDays[
                fallback.dayId
            ] =
                fallback;

        }


        return fallback;

    }


    return null;

}


// ======================================================
// RECORD DAY ID
// ======================================================

function getRecordDayId(
    record
) {

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


    // ==============================================
    // EXACT PAKISTAN DATE
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

        return String(
            easy.operational_month
        ).trim();

    }


    return getMonthKey(
        getRecordDate(
            easy.created_at
        )
    );

}


// ======================================================
// TIME FORMAT
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


    window.editId =
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


        // ==============================================
        // SAVE
        //
        // ACCOUNTING FIELDS PRESERVED
        // ==============================================

        await addDoc(
            collection(
                db,
                "easypaisa"
            ),
            {

                amount,

                note,

                branch:
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
// DELETE EASYPAISA
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

window.editId =
    null;


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

window.filterEasyByMonth =
function () {

    const input =
        document.getElementById(
            "monthFilter"
        );


    const selectedMonth =
        input
            ? input.value
            : "";


    if (
        !selectedMonth
    ) {

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
//
// DEFAULT MONTH = CURRENT CALENDAR MONTH
//
// Example:
// August 2026 → 2026-08
// September 2026 → 2026-09
//
// Current operational day ka month yahan use nahi hoga.
// ======================================================

function setCurrentMonthFilter() {

    // ==============================================
    // CURRENT CALENDAR MONTH
    // ==============================================

    const currentDate =
        new Date();


    const operationalMonth =
        getMonthKey(
            currentDate
        );


    // ==============================================
    // SAFETY CHECK
    // ==============================================

    if (
        !operationalMonth
    ) {

        console.error(
            "❌ CURRENT MONTH COULD NOT BE DETECTED"
        );

        return;

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


    // ==============================================
    // HTML MONTH INPUT
    // ==============================================

    const monthInput =
        document.getElementById(
            "monthFilter"
        );


    if (
        monthInput
    ) {

        monthInput.value =
            operationalMonth;

    }


    // ==============================================
    // DEBUG
    // ==============================================

    console.log(
        "📅 EASYPAISA CURRENT CALENDAR MONTH:",
        operationalMonth
    );


    console.log(
        "📅 EASYPAISA FILTER:",
        fromDate,
        "→",
        toDate
    );

}


// ======================================================
// DAY FILTER
// ======================================================

window.filterEasyByDay =
function () {

    const input =
        document.getElementById(
            "easyDayFilter"
        );


    easyDayFilter =
        input
            ? input.value
            : "all";


    console.log(
        "🔥 EASYPAISA DAY FILTER:",
        easyDayFilter
    );


    // ==============================================
    // CURRENT DAY
    //
    // Date range ko remove nahi karna.
    // render mein current day priority hai.
    // ==============================================

    if (
        easyDayFilter ===
        "current"
    ) {

        renderTable();

        return;

    }


    // ==============================================
    // ALL DAYS
    //
    // Current operational month
    // ==============================================

    setCurrentMonthFilter();

    renderTable();

};


// ======================================================
// DATE RANGE SUPPORT
// ======================================================

window.filterEasyByDateRange =
function () {

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
// CHECK EASYPAISA FILTER
// ======================================================

function isEasyInSelectedDateRange(
    easy
) {

    // ==================================================
    // CURRENT DAY
    // ==================================================

    if (
        easyDayFilter ===
        "current"
    ) {

        const currentDayId =
            String(
                window.currentDayId ||
                ""
            )
            .trim();


        const easyDayId =
            getRecordDayId(
                easy
            );


        // ==============================================
        // PRIMARY — SAVED DAY ID
        // ==============================================

        if (
            currentDayId &&
            easyDayId
        ) {

            return (
                easyDayId ===
                currentDayId
            );

        }


        // ==============================================
        // LEGACY FALLBACK
        // ==============================================

        const easyDay =
            getEasyOperationalDay(
                easy
            );


        if (!easyDay) {

            return false;

        }


        return (

            String(
                easyDay.dayId ||
                ""
            )
            .trim()

            ===

            currentDayId

        );

    }


    // ==================================================
    // ALL DAYS
    //
    // ALL DAYS =
    // CURRENT SELECTED OPERATIONAL MONTH
    // ==================================================

    if (
        easyDayFilter ===
        "all"
    ) {

        const monthInput =
            document.getElementById(
                "monthFilter"
            );


        let selectedOperationalMonth =
            monthInput
                ? monthInput.value
                : "";


        // ==============================================
        // FALLBACK CURRENT OPERATIONAL MONTH
        // ==============================================

        if (
            !selectedOperationalMonth
        ) {

            const currentDay =
                getCurrentOperationalDay();


            if (
                currentDay &&
                currentDay.operationalMonth
            ) {

                selectedOperationalMonth =
                    currentDay.operationalMonth;

            }

        }


        // ==============================================
        // FINAL FALLBACK
        // ==============================================

        if (
            !selectedOperationalMonth
        ) {

            selectedOperationalMonth =
                getMonthKey(
                    new Date()
                );

        }


        // ==============================================
        // PRIMARY:
        // SAVED operational_month
        // ==============================================

        if (
            easy.operational_month
        ) {

            return (

                String(
                    easy.operational_month
                )
                .trim()

                ===

                String(
                    selectedOperationalMonth
                )
                .trim()

            );

        }


        // ==============================================
        // SECONDARY:
        // OPERATIONAL DAY
        // ==============================================

        const easyDay =
            getEasyOperationalDay(
                easy
            );


        if (
            easyDay
        ) {

            return (

                String(
                    easyDay.operationalMonth
                )
                .trim()

                ===

                String(
                    selectedOperationalMonth
                )
                .trim()

            );

        }


        // ==============================================
        // LEGACY FALLBACK
        // ==============================================

        const easyDate =
            getRecordDate(
                easy.created_at
            );


        if (!easyDate) {

            return false;

        }


        return (

            getMonthKey(
                easyDate
            )

            ===

            selectedOperationalMonth

        );

    }


    // ==================================================
    // DATE RANGE
    // ==================================================

    const easyDay =
        getEasyOperationalDay(
            easy
        );


    // ==================================================
    // LEGACY RECORD
    // ==================================================

    if (!easyDay) {

        const easyDate =
            getRecordDate(
                easy.created_at
            );


        if (!easyDate) {

            return false;

        }


        if (
            fromDate
        ) {

            const from =
                new Date(
                    `${fromDate}T00:00:00`
                );


            if (
                easyDate <
                from
            ) {

                return false;

            }

        }


        if (
            toDate
        ) {

            const to =
                new Date(
                    `${toDate}T23:59:59.999`
                );


            if (
                easyDate >
                to
            ) {

                return false;

            }

        }


        return true;

    }


    // ==================================================
    // SAME OPERATIONAL MONTH
    // ==================================================

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
        fromMonth ===
        toMonth
    ) {

        return (

            easyDay.operationalMonth
            ===
            fromMonth

        );

    }


    // ==================================================
    // MULTI MONTH / CUSTOM RANGE
    // ==================================================

    if (
        fromDate
    ) {

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


    if (
        toDate
    ) {

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

function escapeHtml(
    value
) {

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


    easyData.forEach(
        e => {

            // ==============================================
            // DATE / MONTH / DAY FILTER
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

        }
    );


    // ==============================================
    // TOTAL
    // ==============================================

    const totalElement =
        document.getElementById(
            "todayEasyTotal"
        );


    if (
        totalElement
    ) {

        totalElement.innerText =
            total.toLocaleString()
            +
            " PKR";

    }


    console.log(
        "💰 EASYPAISA FILTERED TOTAL:",
        total
    );

}


// ======================================================
// REALTIME LISTENER
//
// 🔥 IMPORTANT FIX:
//
// Firebase mein:
// where("branch", "==", branch)
//
// USE NAHI HO RAHA.
//
// Pehle complete collection load hogi.
// Phir JS normalized branch se filter karega.
//
// Rasson4 / rasson 4 / RASSON4
// sab correctly match honge.
// ======================================================

function startEasyListener() {

    const easyCollection =
        collection(
            db,
            "easypaisa"
        );


    onSnapshot(

        easyCollection,

        snap => {

            easyData =
                [];


            snap.forEach(
                docSnap => {

                    const data =
                        docSnap.data();


                    // ==========================================
                    // BRANCH NORMALIZATION
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


                    // ==========================================
                    // DELETED RECORDS
                    // ==========================================

                    if (
                        data.is_deleted ===
                        true
                    ) {

                        return;

                    }


                    easyData.push({

                        id:
                            docSnap.id,

                        ...data

                    });

                }
            );


            // ==============================================
            // NEWEST FIRST
            // ==============================================

            easyData.sort(
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
                "📥 EASYPAISA CURRENT BRANCH:",
                branch
            );


            console.log(
                "📥 EASYPAISA RECORDS:",
                easyData.length
            );


            console.log(
                "📥 EASYPAISA DATA:",
                easyData
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

        // ==============================================
        // 1. CURRENT DAY
        // ==============================================

        await loadCurrentDayId();


        // ==============================================
        // 2. ALL OPERATIONAL DAYS
        // ==============================================

        await loadOperationalDays();


        // ==============================================
        // 3. DEFAULT FILTER
        //
        // ALL DAYS
        // CURRENT OPERATIONAL MONTH
        // ==============================================

        easyDayFilter =
            "all";


        const dayFilter =
            document.getElementById(
                "easyDayFilter"
            );


        if (
            dayFilter
        ) {

            dayFilter.value =
                "all";

        }


        // ==============================================
        // 4. DEFAULT CURRENT OPERATIONAL MONTH
        // ==============================================

        setCurrentMonthFilter();


        // ==============================================
        // 5. START REALTIME LISTENER
        // ==============================================

        startEasyListener();


        console.log(
            "✅ EASYPAISA OPERATIONAL ACCOUNTING READY",
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
            "❌ EASYPAISA INIT ERROR:",
            error
        );

    }

}


initEasyPaisa();
