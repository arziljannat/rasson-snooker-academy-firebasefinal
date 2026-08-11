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

const branch = (localStorage.getItem("branch") || "")
    .toLowerCase()
    .replace(/\s+/g, "");

const role =
    (localStorage.getItem("role") || "")
        .toLowerCase();

let easyData = [];

let operationalDays = {};

let selectedMonth = null;
let selectedYear = null;

let editId = null;


// ======================================================
// GET RECORD DAY ID
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

    if (!value) return null;

    if (
        typeof value === "object" &&
        value.seconds
    ) {

        const date =
            new Date(value.seconds * 1000);

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
// OPERATIONAL DATE KEY
// ======================================================

function getOperationalMonth(day) {

    if (!day?.startDate) {
        return null;
    }

    return (
        day.startDate.getFullYear() +
        "-" +
        String(
            day.startDate.getMonth() + 1
        ).padStart(2, "0")
    );

}


// ======================================================
// LOAD CURRENT OPERATIONAL DAY
// ======================================================

async function loadCurrentDayId() {

    const snap =
        await getDocs(
            collection(db, "system")
        );

    snap.forEach(d => {

        const data = d.data();

        if (
            data.type === "current_day" &&
            String(data.branch || "")
                .toLowerCase()
                .replace(/\s+/g, "")
                === branch
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
// SAME SOURCE AS REPORTS / DASHBOARD
// ======================================================

async function loadOperationalDays() {

    operationalDays = {};

    const snap =
        await getDocs(
            collection(db, "days")
        );

    snap.forEach(docSnap => {

        const data =
            docSnap.data();

        const documentBranch =
            String(data.branch || "")
                .toLowerCase()
                .replace(/\s+/g, "");

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
        // OPERATIONAL DATE
        // SAME PRIORITY AS REPORTS
        // ==============================================

        let rawDate =
            data.shift1?.startMs ||
            data.shift1?.start_ms ||
            data.shift2?.startMs ||
            data.shift2?.start_ms ||
            data.start_time ||
            data.created_at ||
            data.date;


        if (!rawDate) {
            return;
        }


        const startDate =
            getRecordDate(rawDate);


        if (!startDate) {
            return;
        }


        // ==============================================
        // CLOSED CHECK
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


        operationalDays[dayId] = {

            raw: {
                ...data,
                is_closed: isClosed
            },

            startDate,

            month:
                startDate.getMonth(),

            year:
                startDate.getFullYear(),

            day:
                startDate.getDate(),

            operationalMonth:
                getOperationalMonth({
                    startDate
                })

        };

    });


    console.log(
        "📅 EASY OPERATIONAL DAYS:",
        operationalDays
    );

}


// ======================================================
// FIND CURRENT OPERATIONAL DAY
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


    // ==============================================
    // FALLBACK: LATEST OPEN DAY
    // ==============================================

    const openDays =
        Object.values(
            operationalDays
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

        const fallbackId =
            String(
                latest.raw?.day_id || ""
            ).trim();

        if (fallbackId) {

            window.currentDayId =
                fallbackId;

        }

        return latest;

    }


    return null;

}


// ======================================================
// CHECK RECORD OPERATIONAL MONTH
// ======================================================

function getEasyOperationalMonth(record) {

    const dayId =
        getRecordDayId(record);


    // ==============================================
    // PRIMARY: DAY ID
    // ==============================================

    if (
        dayId &&
        operationalDays[dayId]
    ) {

        return operationalDays[dayId]
            .operationalMonth;

    }


    // ==============================================
    // OLD RECORD FALLBACK
    // ==============================================

    if (
        record.operational_month
    ) {

        return record.operational_month;

    }


    // ==============================================
    // LEGACY FALLBACK
    // ==============================================

    const date =
        getRecordDate(
            record.created_at
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
// POPUP
// ======================================================

window.openEasyPopup = () => {

    document
        .getElementById("easyPopup")
        .classList
        .remove("hide");

};


window.closeEasyPopup = () => {

    document
        .getElementById("easyPopup")
        .classList
        .add("hide");


    document.getElementById(
        "easyAmount"
    ).value = "";

    document.getElementById(
        "easyNote"
    ).value = "";


    editId = null;

};


// ======================================================
// SAVE
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


    if (!amount || amount <= 0) {

        alert(
            "Enter valid amount"
        );

        return;
    }


    // ==============================================
    // CURRENT OPERATIONAL DAY MUST EXIST
    // ==============================================

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


    const operationalMonth =
        currentDay.operationalMonth;


    await addDoc(
        collection(
            db,
            "easypaisa"
        ),
        {

            amount,

            note,

            branch:
                String(branch)
                    .toLowerCase()
                    .replace(/\s+/g, ""),

            // 🔥 MAIN OPERATIONAL DAY ID
            day_id:
                window.currentDayId,

            // 🔥 OPERATIONAL DAY OPENING DATE
            day_created_at:
                currentDay.startDate,

            // 🔥 SAME MONTH LOGIC
            operational_month:
                operationalMonth,

            created_at:
                serverTimestamp()

        }
    );


    document.getElementById(
        "easyAmount"
    ).value = "";

    document.getElementById(
        "easyNote"
    ).value = "";


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

    editId = id;


    document.getElementById(
        "easyAmount"
    ).value = amount;


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
// KARACHI TIME FORMAT
// ======================================================

function formatTime(timestamp) {

    if (!timestamp) {
        return "-";
    }


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


    if (!input?.value) {
        return;
    }


    const parts =
        input.value.split("-");


    selectedYear =
        Number(parts[0]);


    selectedMonth =
        Number(parts[1]) - 1;


    renderTable();

};


// ======================================================
// SET DEFAULT MONTH
// CURRENT OPERATIONAL DAY MONTH
// ======================================================

function setDefaultMonth() {

    const currentDay =
        getCurrentOperationalDay();


    let year;
    let month;


    if (currentDay?.startDate) {

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
            ).padStart(2, "0")}`;

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


    let total = 0;


    easyData.forEach(e => {

        const operationalMonth =
            getEasyOperationalMonth(e);


        // ==============================================
        // MONTH FILTER
        // BASED ON OPERATIONAL DAY
        // ==============================================

        if (
            selectedYear !== null &&
            selectedMonth !== null
        ) {

            const selectedKey =
                `${selectedYear}-${String(
                    selectedMonth + 1
                ).padStart(2, "0")}`;


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
                        ${Number(e.amount || 0)},
                        '${safeNote}'
                    )"
                >
                    Edit
                </button>

                <button
                    class="btn-red"
                    onclick="deleteEasy('${e.id}')"
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
                    ${e.amount}
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


    document.getElementById(
        "todayEasyTotal"
    ).innerText =
        total + " PKR";

}


// ======================================================
// START REALTIME LISTENER
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
// PAGE START
// ======================================================

async function initEasyPaisa() {

    try {

        // 1
        await loadCurrentDayId();


        // 2
        await loadOperationalDays();


        // 3
        getCurrentOperationalDay();


        // 4
        setDefaultMonth();


        // 5
        startEasyListener();


        console.log(
            "✅ EASYPAISA OPERATIONAL DAY READY",
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
