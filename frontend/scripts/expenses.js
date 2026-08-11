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

const db = window.db;

if (!db) {
    console.error("❌ Firebase DB not loaded");
}

const branch =
    (localStorage.getItem("branch") || "")
        .toLowerCase()
        .replace(/\s+/g, "");

const role =
    (localStorage.getItem("role") || "")
        .toLowerCase();

let easyData = [];

let operationalDays = {};

// 🔥 CANONICAL OPERATIONAL DAYS BY DATE
let operationalDaysByDate = {};

let selectedMonth = null;
let selectedYear = null;

let editId = null;


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
// GET DATE
// ======================================================

function getRecordDate(value) {

    if (!value) {
        return null;
    }


    if (
        typeof value === "object" &&
        value.seconds !== undefined
    ) {

        const date =
            new Date(
                value.seconds * 1000
            );

        return isNaN(date.getTime())
            ? null
            : date;

    }


    if (
        typeof value === "object" &&
        typeof value.toDate === "function"
    ) {

        const date =
            value.toDate();

        return isNaN(date.getTime())
            ? null
            : date;

    }


    const date =
        new Date(value);


    return isNaN(date.getTime())
        ? null
        : date;

}


// ======================================================
// PAKISTAN OPERATIONAL DATE KEY
// ======================================================

function getOperationalDateKey(date) {

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
// YYYY-MM
// ======================================================

function getOperationalMonthFromDate(date) {

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
// LOAD CURRENT OPERATIONAL DAY
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
                data.created_at || null;

        }

    });


    console.log(
        "✅ EASY CURRENT DAY ID:",
        window.currentDayId
    );

}


// ======================================================
// LOAD OPERATIONAL DAYS
//
// IMPORTANT:
//
// operationalDays:
//     day_id → day record
//
// operationalDaysByDate:
//     YYYY-MM-DD → ONE CANONICAL DAY
//
// Duplicate day documents are NOT deleted.
// They are only normalized for lookup.
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


        const documentBranch =
            String(
                data.branch || ""
            )
            .toLowerCase()
            .replace(
                /\s+/g,
                "");


        if (
            documentBranch !== branch
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


        // ==============================================
        // OPERATIONAL DAY END
        // ==============================================

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
            getOperationalDateKey(
                startDate
            );


        const operationalMonth =
            getOperationalMonthFromDate(
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

            operationalMonth,

            month:
                startDate.getMonth(),

            year:
                startDate.getFullYear(),

            day:
                startDate.getDate()

        };


        // ==============================================
        // KEEP ORIGINAL DAY-ID MAPPING
        // ==============================================

        operationalDays[dayId] =
            dayObject;


        // ==============================================
        // CANONICAL DATE MAPPING
        //
        // SAME DATE KE MULTIPLE DAY RECORDS
        // KO PAGE LEVEL PAR DUPLICATE NAHI
        // BANNE DENA.
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

            // Current day ID ko priority
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

            // Otherwise keep earliest operational start
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
        "📅 EASY OPERATIONAL DAYS:",
        operationalDays
    );


    console.log(
        "📅 EASY CANONICAL OPERATIONAL DAYS:",
        operationalDaysByDate
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


    // ==============================================
    // PRIMARY
    // ==============================================

    if (
        currentId &&
        operationalDays[currentId]
    ) {

        return operationalDays[currentId];

    }


    // ==============================================
    // FALLBACK
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


    if (openDays.length) {

        const latest =
            openDays[0];


        window.currentDayId =
            latest.dayId;


        return latest;

    }


    return null;

}


// ======================================================
// GET EASYPAISA OPERATIONAL DAY
// ======================================================

function getEasyOperationalDay(record) {

    const dayId =
        getRecordDayId(
            record
        );


    // ==============================================
    // DAY ID IS AUTHORITATIVE
    // ==============================================

    if (
        dayId &&
        operationalDays[dayId]
    ) {

        return operationalDays[dayId];

    }


    // ==============================================
    // LEGACY RECORD
    // FIND BY ACTUAL ENTRY TIME
    // ==============================================

    const easyDate =
        getRecordDate(
            record.created_at
        );


    if (!easyDate) {
        return null;
    }


    // First try exact operational date
    const dateKey =
        getOperationalDateKey(
            easyDate
        );


    if (
        operationalDaysByDate[dateKey]
    ) {

        const day =
            operationalDaysByDate[
                dateKey
            ];


        if (
            easyDate >= day.startDate &&
            easyDate <= day.endDate
        ) {

            return day;

        }

    }


    // Full range fallback
    for (
        const day of
        Object.values(
            operationalDaysByDate
        )
    ) {

        if (
            easyDate >= day.startDate &&
            easyDate <= day.endDate
        ) {

            return day;

        }

    }


    return null;

}


// ======================================================
// GET EASYPAISA OPERATIONAL MONTH
// ======================================================

function getEasyOperationalMonth(record) {

    // ==============================================
    // PRIMARY: OPERATIONAL DAY
    // ==============================================

    const day =
        getEasyOperationalDay(
            record
        );


    if (day) {

        return day.operationalMonth;

    }


    // ==============================================
    // SAVED MONTH
    // ==============================================

    if (
        record.operational_month
    ) {

        return record.operational_month;

    }


    // ==============================================
    // LEGACY
    // ==============================================

    const date =
        getRecordDate(
            record.created_at
        );


    return getOperationalMonthFromDate(
        date
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


    document.getElementById(
        "easyAmount"
    ).value = "";


    document.getElementById(
        "easyNote"
    ).value = "";


    editId = null;

};


// ======================================================
// SAVE EASYPAISA
// ======================================================

window.saveEasy = async () => {

    const amount =
        Number(
            document.getElementById(
                "easyAmount"
            ).value
        );


    const note =
        document.getElementById(
            "easyNote"
        ).value;


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
        !currentDay ||
        !window.currentDayId
    ) {

        alert(
            "Current Operational Day not found."
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


    closeEasyPopup();

};


// ======================================================
// DELETE
// ======================================================

window.deleteEasy = async (id) => {

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

};


// ======================================================
// EDIT
// ======================================================

window.editEasy = (
    id,
    amount,
    note
) => {

    editId =
        id;


    document.getElementById(
        "easyAmount"
    ).value =
        amount;


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

    const amount =
        Number(
            document.getElementById(
                "easyAmount"
            ).value
        );


    const note =
        document.getElementById(
            "easyNote"
        ).value;


    if (
        !amount ||
        amount <= 0
    ) {

        alert(
            "Enter valid amount"
        );

        return;

    }


    if (!editId) {

        alert(
            "Edit record not found."
        );

        return;

    }


    // IMPORTANT:
    // day_id / operational_month
    // ko edit nahi karna.

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


    closeEasyPopup();

};


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

            year:
                "numeric",

            month:
                "short",

            day:
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
// MONTH FILTER
// ======================================================

window.filterEasyByMonth = () => {

    const input =
        document.getElementById(
            "monthFilter"
        );


    if (
        !input?.value
    ) {

        return;

    }


    const parts =
        input.value.split(
            "-"
        );


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
// DEFAULT CURRENT OPERATIONAL MONTH
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

    }

    else {

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


    tbody.innerHTML = "";


    let total =
        0;


    easyData.forEach(e => {

        const operationalMonth =
            getEasyOperationalMonth(
                e
            );


        // ==============================================
        // SELECTED OPERATIONAL MONTH
        // ==============================================

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


            if (
                operationalMonth !==
                selectedKey
            ) {

                return;

            }

        }


        total +=
            Number(
                e.amount || 0
            );


        let actions = "";


        if (
            role === "admin" ||
            role === "super_admin"
        ) {

            const safeNote =
                String(
                    e.note || ""
                )
                .replace(
                    /'/g,
                    "\\'"
                );


            actions = `

                <button
                    class="btn-green"
                    onclick="editEasy(
                        '${e.id}',
                        ${Number(
                            e.amount || 0
                        )},
                        '${safeNote}'
                    )"
                >
                    Edit
                </button>

                <button
                    class="btn-red"
                    onclick="deleteEasy(
                        '${e.id}'
                    )"
                >
                    Delete
                </button>

            `;

        }


        tbody.innerHTML += `

            <tr>

                <td>
                    ${formatTime(
                        e.created_at
                    )}
                </td>

                <td>
                    ${e.amount || 0}
                </td>

                <td>
                    ${e.note || "-"}
                </td>

                <td>
                    ${actions}
                </td>

            </tr>

        `;

    });


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

    console.log(
        "🔥 EASYPAISA LISTENER START"
    );


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

        getCurrentOperationalDay();

        setDefaultMonth();

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
