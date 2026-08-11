import {
    collection,
    getDocs
}
from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";


// ======================================================
// PAGE LOAD
// ======================================================

document.addEventListener("DOMContentLoaded", async () => {

    const branch =
        (localStorage.getItem("branch") || "")
        .toLowerCase()
        .trim();


    // ==================================================
    // GET CURRENT OPERATIONAL DAY
    // ==================================================

    const snap = await getDocs(
        collection(window.db, "system")
    );


    snap.forEach(d => {

        let data = d.data();

        if (
            data.type === "current_day" &&
            (data.branch || "").toLowerCase().trim() === branch
        ) {

            window.currentDayId =
                data.day_id;

        }

    });


    console.log(
        "🔥 DASHBOARD CURRENT DAY:",
        window.currentDayId
    );


    // ==================================================
    // LOAD OPERATIONAL DAYS FIRST
    // ==================================================

    await loadOperationalDays();

    // Resolve the real OPEN operational day for this branch.
    // This prevents Today from becoming 0 when the system
    // current_day id is stale/missing.
    resolveCurrentOperationalDay();

    console.log(
        "🔥 DASHBOARD TODAY OPERATIONAL DAY:",
        getCurrentOperationalDayDebug()
    );


    // ==================================================
    // LOAD ALL DASHBOARD DATA
    // ONLY AFTER EVERYTHING LOADS
    // ==================================================

    await loadDashboardRealtime();


    // ==================================================
    // MONTH FILTER
    // ==================================================

    const monthInput =
        document.getElementById(
            "dashboardMonthFilter"
        );


    if(monthInput){

        let operationalCurrent =
            operationalDays[
                String(window.currentDayId)
            ];


        if(operationalCurrent){

            selectedMonth =
                operationalCurrent.month;

            selectedYear =
                operationalCurrent.year;


            monthInput.value =
                `${selectedYear}-${String(
                    selectedMonth + 1
                ).padStart(2,"0")}`;

        }

        else{

            let now =
                new Date();


            monthInput.value =
                `${now.getFullYear()}-${String(
                    now.getMonth() + 1
                ).padStart(2,"0")}`;

        }


        monthInput.addEventListener(
            "change",
            (e) => {

                let value =
                    e.target.value;


                if(!value) return;


                let parts =
                    value.split("-");


                selectedYear =
                    Number(parts[0]);


                selectedMonth =
                    Number(parts[1]) - 1;


                updateDashboard();

            }
        );

    }

});


// ======================================================
// ROLE
// ======================================================

const role =
    (localStorage.getItem("role") || "")
    .toLowerCase();


// ======================================================
// GLOBAL DATA
// ======================================================

let tablesData = [];

let sessionsData = [];

let canteenData = [];

let expenseData = [];

let realtimeTodayEasy = 0;

let realtimeMonthlyEasy = 0;

let selectedMonth =
    new Date().getMonth();

let selectedYear =
    new Date().getFullYear();

let operationalDays = {};


// ======================================================
// SET TEXT
// ======================================================

function setText(id, value){

    const el =
        document.getElementById(id);


    if(el){

        el.innerText =
            value ?? 0;

    }

}


// ======================================================
// COMMON DAY ID HELPER
// ======================================================

function getRecordDayId(record){

    return String(

        record?.day_id ||

        record?.dayId ||

        record?.current_day_id ||

        record?.currentDayId ||

        ""

    ).trim();

}


// ======================================================
// DATE HELPER
// Supports Firestore Timestamp + normal dates
// ======================================================

function getRecordDate(value){

    if(!value) return null;


    // Firestore Timestamp
    if(
        typeof value === "object" &&
        value.seconds
    ){

        const date =
            new Date(
                value.seconds * 1000
            );

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
// CURRENT OPERATIONAL DAY RESOLVER
// ======================================================
// Today on the dashboard means the CURRENT OPEN
// OPERATIONAL DAY, not simply the calendar date.
// This also handles old records where day_id is missing.
// ======================================================

function resolveCurrentOperationalDay(){

    const branch =
        (localStorage.getItem("branch") || "")
        .toLowerCase()
        .trim();

    const configuredId =
        String(window.currentDayId || "").trim();

    // 1) Prefer the configured current_day record
    if(
        configuredId &&
        operationalDays[configuredId] &&
        (operationalDays[configuredId].raw?.branch || "")
            .toLowerCase()
            .trim() === branch &&
        operationalDays[configuredId].raw?.is_closed !== true
    ){

        return operationalDays[configuredId];

    }

    // 2) Fallback: latest OPEN operational day for this branch
    const openDays =
        Object.values(operationalDays || {})
        .filter(day => {

            return (
                (day.raw?.branch || "")
                    .toLowerCase()
                    .trim() === branch
                &&
                day.raw?.is_closed !== true
                &&
                day.startDate
            );

        })
        .sort(
            (a,b) =>
                b.startDate.getTime() -
                a.startDate.getTime()
        );

    if(openDays.length){

        const fallbackId =
            String(
                openDays[0].raw?.day_id || ""
            ).trim();

        if(fallbackId){

            window.currentDayId =
                fallbackId;

        }

        return openDays[0];

    }

    return null;

}


// ======================================================
// CURRENT OPERATIONAL DAY RECORD CHECK
// ======================================================
// First use day_id when it exists.
// If old data has no day_id, use the current operational
// day's start_time -> now range.
// ======================================================

function isRecordInCurrentOperationalDay(record){

    const currentDay =
        resolveCurrentOperationalDay();

    if(!currentDay) return false;

    const currentId =
        String(
            window.currentDayId || ""
        ).trim();

    const recordDayId =
        getRecordDayId(record);

    // Exact day_id match = safest match
    if(
        recordDayId &&
        currentId &&
        recordDayId === currentId
    ){

        return true;

    }

    // If a record has another explicit day_id,
    // do not move it into Today.
    if(recordDayId){

        return false;

    }

    // Legacy records without day_id:
    // use the operational day's actual start time.
    const date =
        getRecordDate(
            record?.start_time ||
            record?.startTime ||
            record?.created_at ||
            record?.time ||
            record?.date
        );

    if(!date || !currentDay.startDate){

        return false;

    }

    const now =
        new Date();

    return (
        date >= currentDay.startDate &&
        date <= now
    );

}


// ======================================================
// TODAY OPERATIONAL DAY DEBUG
// ======================================================

function getCurrentOperationalDayDebug(){

    const day =
        resolveCurrentOperationalDay();

    if(!day){

        return {

            dayId:
                window.currentDayId,

            startDate:
                null,

            branch:
                localStorage.getItem("branch"),

            found:
                false

        };

    }

    return {

        dayId:
            window.currentDayId,

        startDate:
            day.startDate,

        branch:
            day.raw?.branch,

        closed:
            day.raw?.is_closed,

        found:
            true

    };

}


// ======================================================
// LOAD OPERATIONAL DAYS
// ======================================================

async function loadOperationalDays(){

    operationalDays = {};


    const snap =
        await getDocs(
            collection(window.db, "days")
        );


    snap.forEach(doc => {

        let d =
            doc.data();


        let dayId =
            String(
                d.day_id || ""
            ).trim();


        // ==============================================
        // GET DAY DATE
        // ==============================================

        let rawDate =
            d.start_time ||
            d.created_at ||
            d.date;


        // ==============================================
        // OLD DAY FIX
        // ==============================================

        if(
            !d.start_time &&
            d.shift1?.startMs
        ){

            rawDate =
                d.shift1.startMs;

        }


        if(!rawDate) return;


        let date =
            getRecordDate(rawDate);


        if(!date) return;


        // ==============================================
        // CLOSED CHECK
        // ==============================================

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

            !!d.shift1?.close_time ||

            !!d.shift1?.closeTime;


        // ==============================================
        // SAVE OPERATIONAL DAY
        // ==============================================

        operationalDays[dayId] = {

            raw: {

                ...d,

                is_closed:
                    isClosed

            },


            startDate:
                date,


            month:
                date.getMonth(),


            year:
                date.getFullYear(),


            day:
                date.getDate(),


            isCurrent:

                String(d.day_id) ===
                String(window.currentDayId)

        };


    });


    console.log(
        "📅 OPERATIONAL DAYS LOADED:",
        Object.keys(
            operationalDays
        ).length
    );

}


// ======================================================
// MONTHLY ACCOUNTING
// OPERATIONAL DATE BASED
//
// IMPORTANT:
// 1 operational date = 1 accounting day
//
// Agar Firebase mein same operational date ke
// duplicate day records hon to sirf FIRST record
// accounting mein count hoga.
//
// Is se:
// - Monthly Income double nahi hoga
// - Monthly Expense double nahi hoga
// - EasyPaisa double nahi hoga
// - Shift totals double nahi honge
// ======================================================

function getMonthlyOperationalAccounting(){

    const branch =
        (localStorage.getItem("branch") || "")
        .toLowerCase()
        .trim();


    let result = {

        gameCollection: 0,

        gameBalance: 0,

        discount: 0,

        expense: 0,

        easyPaisa: 0,

        shift1: 0,

        shift2: 0,

        days: 0

    };


    // ==================================================
    // UNIQUE OPERATIONAL DATES
    // ==================================================

    const countedDates =
        new Set();


    Object.values(
        operationalDays || {}
    ).forEach(day => {

        const raw =
            day.raw || {};


        // ==============================================
        // BRANCH
        // ==============================================

        if(

            (raw.branch || "")
            .toLowerCase()
            .trim()

            !==

            branch

        ){

            return;

        }


        // ==============================================
        // MONTH
        // ==============================================

        if(

            day.month !==
            selectedMonth ||

            day.year !==
            selectedYear

        ){

            return;

        }


        // ==============================================
        // ONLY CLOSED OPERATIONAL DAYS
        // ==============================================

        if(
            raw.is_closed !== true
        ){

            return;

        }


        // ==============================================
        // OPERATIONAL DATE KEY
        //
        // Asia/Karachi
        // ==============================================

        if(
            !day.startDate
        ){

            return;

        }


        const operationalDateKey =
            new Intl.DateTimeFormat(
                "en-CA",
                {
                    timeZone:
                        "Asia/Karachi",

                    year:
                        "numeric",

                    month:
                        "2-digit",

                    day:
                        "2-digit"
                }
            ).format(
                new Date(
                    day.startDate
                )
            );


        // ==============================================
        // DUPLICATE OPERATIONAL DAY
        // ==============================================

        if(
            countedDates.has(
                operationalDateKey
            )
        ){

            console.warn(
                "⚠️ DASHBOARD DUPLICATE OPERATIONAL DAY SKIPPED:",
                operationalDateKey,
                raw.day_id
            );

            return;

        }


        // ==============================================
        // MARK DATE AS COUNTED
        // ==============================================

        countedDates.add(
            operationalDateKey
        );


        // ==============================================
        // SHIFT DATA
        // ==============================================

        const s1 =
            raw.shift1 || {};


        const s2 =
            raw.shift2 || {};


        const combined =
            raw.combined || {};


        // ==============================================
        // SHIFT 1 COLLECTION
        // ==============================================

        const shift1Collection =
            Number(
                s1.gameCollection || 0
            );


        // ==============================================
        // SHIFT 2 COLLECTION
        // ==============================================

        const shift2Collection =
            Number(
                s2.gameCollection || 0
            );


        result.shift1 +=
            shift1Collection;


        result.shift2 +=
            shift2Collection;


        result.gameCollection +=
            shift1Collection +
            shift2Collection;


        // ==============================================
        // BALANCE
        // ==============================================

        result.gameBalance +=

            Number(
                s1.gameBalance || 0
            )

            +

            Number(
                s2.gameBalance || 0
            );


        // ==============================================
        // DISCOUNT
        // ==============================================

        result.discount +=

            Number(
                s1.discount || 0
            )

            +

            Number(
                s2.discount || 0
            );


        // ==============================================
        // EXPENSE
        // ==============================================

        result.expense +=

            Number(
                s1.expenses || 0
            )

            +

            Number(
                s2.expenses || 0
            );


        // ==============================================
        // EASYPAISA
        // ==============================================

        result.easyPaisa +=

            Number(
                combined.easypaisa || 0
            );


        // ==============================================
        // COUNT UNIQUE OPERATIONAL DAY
        // ==============================================

        result.days++;

    });


    console.log(
        "📊 DASHBOARD MONTHLY ACCOUNTING:",
        result
    );


    console.log(
        "📅 DASHBOARD UNIQUE ACCOUNTING DAYS:",
        Array.from(
            countedDates
        )
    );


    return result;

}


// ======================================================
// LOAD ALL DASHBOARD DATA
// ONE UPDATE ONLY AFTER EVERYTHING LOADS
// ======================================================

async function loadDashboardRealtime(){

    const branch =

        (localStorage.getItem("branch") || "")
        .toLowerCase()
        .trim();


    if(!branch) return;


    // ==================================================
    // TABLES
    // ==================================================

    const tablesSnap =

        await getDocs(
            collection(
                window.db,
                "tables"
            )
        );


    tablesData = [];


    let uniqueTables = {};


    tablesSnap.forEach(d => {

        let t =
            d.data();


        if(

            (t.branch || "")
            .toLowerCase()
            .trim()

            !==

            branch

        ){

            return;

        }


        let tableName =

            (
                t.table_id ||
                t.name ||
                ""
            )
            .toLowerCase()
            .trim();


        if(
            uniqueTables[tableName]
        ){

            return;

        }


        uniqueTables[tableName] =
            true;


        tablesData.push(t);

    });


    // ==================================================
    // SESSIONS
    // ==================================================

    const sessionsSnap =

        await getDocs(
            collection(
                window.db,
                "sessions"
            )
        );


    sessionsData = [];


    sessionsSnap.forEach(d => {

        let s =
            d.data();


        if(

            (s.branch || "")
            .toLowerCase()
            .trim()

            ===

            branch

        ){

            sessionsData.push(s);

        }

    });


    // ==================================================
    // CANTEEN
    // ==================================================

    const canteenSnap =

        await getDocs(
            collection(
                window.db,
                "canteen_logs"
            )
        );


    canteenData = [];


    canteenSnap.forEach(d => {

        let c =
            d.data();


        if(

            (c.branch || "")
            .toLowerCase()
            .trim()

            ===

            branch

        ){

            canteenData.push(c);

        }

    });


    // ==================================================
    // EXPENSES
    // ==================================================

    const expenseSnap =

        await getDocs(
            collection(
                window.db,
                "expenses"
            )
        );


    expenseData = [];


    expenseSnap.forEach(d => {

        let e =
            d.data();


        if(

            (e.branch || "")
            .toLowerCase()
            .trim()

            ===

            branch

        ){

            expenseData.push(e);

        }

    });


    // ==================================================
    // EASYPAISA
    // ==================================================

    const easySnap =

        await getDocs(
            collection(
                window.db,
                "easypaisa"
            )
        );


    window.latestEasyDocs = [];


    let todayEasy = 0;


    const currentDayId =
        window.currentDayId;


    easySnap.forEach(d => {

        let e =
            d.data();


        // ==============================================
        // DELETED
        // ==============================================

        if(
            e.is_deleted === true
        ){

            return;

        }


        // ==============================================
        // BRANCH
        // ==============================================

        if(

            (e.branch || "")
            .toLowerCase()
            .trim()

            !==

            branch

        ){

            return;

        }


        window.latestEasyDocs.push(e);


        let amount =
            Number(
                e.amount || 0
            );


        let recordDayId =
            getRecordDayId(e);


        let operational =
            operationalDays[
                recordDayId
            ];


        // ==============================================
        // TODAY EASYPAISA
        // ==============================================

        if(

            isRecordInCurrentOperationalDay(e)

            &&

            !operational?.raw?.is_closed

        ){

            todayEasy +=
                amount;

        }

    });


    realtimeTodayEasy =
        todayEasy;


    setText(
        "todayEasyPaisa",
        todayEasy
    );


    // ==================================================
    // IMPORTANT:
    // UPDATE DASHBOARD ONLY ONCE
    // ==================================================

    await updateDashboard();

}

// ======================================================
// UPDATE DASHBOARD
// ======================================================

async function updateDashboard(){

    const currentDayId =
        String(window.currentDayId || "").trim();


    const currentOperationalDay =
        resolveCurrentOperationalDay();


    let todayStart =
        currentOperationalDay?.startDate
            ? new Date(currentOperationalDay.startDate)
            : new Date();


    if(!currentOperationalDay){

        todayStart.setHours(
            0,
            0,
            0,
            0
        );

    }


    // ==================================================
    // TODAY VARIABLES
    // ==================================================

    let today_game_total = 0;

    let today_paid = 0;

    let today_unpaid = 0;

    let today_sessions = 0;

    let completed_sessions = 0;

    let today_canteen_total = 0;

    let today_expense = 0;


    // ==================================================
    // MONTHLY DATA
    // REPORTS KE SAME OPERATIONAL DAYS SOURCE SE
    // ==================================================

    const monthlyAccounting =
        getMonthlyOperationalAccounting();


    let monthly_income =
        Number(
            monthlyAccounting.gameCollection || 0
        );


    let monthly_expense =
        Number(
            monthlyAccounting.expense || 0
        );


    let monthly_easy =
        Number(
            monthlyAccounting.easyPaisa || 0
        );


    let shift1Monthly =
        Number(
            monthlyAccounting.shift1 || 0
        );


    let shift2Monthly =
        Number(
            monthlyAccounting.shift2 || 0
        );


    let monthly_canteen = 0;


    let today_easy =
        Number(
            realtimeTodayEasy || 0
        );


    // ==================================================
    // SESSIONS
    // ==================================================

    sessionsData.forEach(s => {


        // ----------------------------------------------
        // DELETED SESSION
        // ----------------------------------------------

        if(
            s.is_deleted === true
        ){

            return;

        }


        // ----------------------------------------------
        // DATE
        // ----------------------------------------------

        const date =
            getRecordDate(

                s.start_time ||

                s.startTime ||

                s.created_at

            );


        if(!date){

            return;

        }


        // ----------------------------------------------
        // AMOUNT
        // ----------------------------------------------

        const amount =

            Number(

                s.final_game_amount ??

                s.final_amount ??

                s.total_amount ??

                s.amount ??

                0

            );


        // ----------------------------------------------
        // SESSION DAY ID
        // ----------------------------------------------

        const sessionDayId =
            getRecordDayId(s);


        const operational =
            sessionDayId
                ? operationalDays[sessionDayId]
                : null;


        // ==================================================
        // TODAY
        // ==================================================
        // Exact day_id first.
        // If day_id missing, isRecordInCurrentOperationalDay()
        // uses current operational day timing.
        // ==================================================

        const isToday =
            isRecordInCurrentOperationalDay(s);


        if(isToday){

            today_sessions++;

            today_game_total +=
                amount;


            // ------------------------------------------
            // PAID / UNPAID
            // ------------------------------------------

            if(
                s.paid === true ||

                s.payment_status === "paid" ||

                s.status === "paid"
            ){

                today_paid++;

            }

            else{

                today_unpaid++;

            }


            // ------------------------------------------
            // COMPLETED
            // ------------------------------------------

            if(

                s.end_time ||

                s.endTime ||

                s.checkout_time ||

                s.checkoutTime

            ){

                completed_sessions++;

            }

        }


        // ==================================================
        // MONTHLY
        // ==================================================
        // IMPORTANT:
        // Monthly dashboard uses SAME operational day
        // source as Revenue Report.
        // ==================================================

        if(

            operational &&

            operational.month ===
            selectedMonth &&

            operational.year ===
            selectedYear &&

            operational.raw?.is_closed === true

        ){

            // Game collection is taken from closed
            // operational days, not calendar date.

            // Do NOT add here because monthly_income
            // already comes from getMonthlyOperationalAccounting().

        }

    });


    // ======================================================
    // CANTEEN LOGS
    // ======================================================

    canteenData.forEach(c => {


        const date =
            getRecordDate(

                c.time ||

                c.created_at ||

                c.date

            );


        if(!date){

            return;

        }


        const amount =

            Number(

                c.total ||

                c.amount ||

                0

            );


        const recordDayId =
            getRecordDayId(c);


        const operational =
            recordDayId
                ? operationalDays[recordDayId]
                : null;


        // ==================================================
        // TODAY
        // ==================================================

        const isToday =
            isRecordInCurrentOperationalDay(c);


        if(isToday){

            today_canteen_total +=
                amount;

        }


        // ==================================================
        // MONTHLY
        // ==================================================

        if(

            operational &&

            operational.month ===
            selectedMonth &&

            operational.year ===
            selectedYear &&

            operational.raw?.is_closed === true

        ){

            monthly_canteen +=
                amount;

        }

    });


    // ======================================================
    // CANTEEN FROM SESSIONS
    // ======================================================
    // Only add session canteen for TODAY.
    //
    // Monthly canteen already comes from canteen_logs.
    // This prevents double counting.
    // ======================================================

    sessionsData.forEach(s => {


        if(
            s.is_deleted === true
        ){

            return;

        }


        const date =
            getRecordDate(

                s.start_time ||

                s.startTime ||

                s.created_at

            );


        if(!date){

            return;

        }


        const canteen =
            Number(
                s.canteen_total || 0
            );


        if(canteen <= 0){

            return;

        }


        // ==================================================
        // TODAY ONLY
        // ==================================================

        if(
            isRecordInCurrentOperationalDay(s)
        ){

            today_canteen_total +=
                canteen;

        }

    });


    // ======================================================
    // EXPENSES
    // ======================================================

    expenseData.forEach(e => {


        if(
            e.is_deleted === true
        ){

            return;

        }


        const date =
            getRecordDate(
                e.created_at
            );


        if(!date){

            return;

        }


        const amount =
            Number(
                e.amount || 0
            );


        // ==================================================
        // TODAY
        // ==================================================

        if(
            isRecordInCurrentOperationalDay(e)
        ){

            today_expense +=
                amount;

        }


        // ==================================================
        // MONTHLY
        // ==================================================
        // monthly_expense already comes from
        // getMonthlyOperationalAccounting()
        // using the SAME days collection as reports.
        // So do NOT add it again here.

    });


    // ======================================================
    // TABLE COUNT
    // ======================================================

    setText(
        "totalTables",
        tablesData.length
    );


    // ======================================================
    // ACTIVE TABLES
    // ======================================================

    const activeTablesCount =

        sessionsData.filter(s => {


            if(
                s.is_deleted === true
            ){

                return false;

            }


            const isToday =
                isRecordInCurrentOperationalDay(s);


            if(!isToday){

                return false;

            }


            const running =

                !s.end_time &&

                !s.endTime &&

                !s.checkout_time &&

                !s.checkoutTime &&

                !s.closeTime &&

                !s.close_time;


            return running;

        }).length;


    setText(
        "activeTables",
        activeTablesCount
    );


    setText(
        "freeTables",
        Math.max(
            0,
            tablesData.length -
            activeTablesCount
        )
    );


    // ======================================================
    // TODAY UI
    // ======================================================

    setText(
        "todaySessions",
        today_sessions
    );


    setText(
        "completedSessions",
        completed_sessions
    );


    setText(
        "todayIncome",
        today_game_total
    );


    setText(
        "todayCanteen",
        today_canteen_total
    );


    setText(
        "todayExpenses",
        today_expense
    );


    // ======================================================
    // TODAY NET INCOME
    // ======================================================

    const finalTodayNet =

        Number(
            today_game_total || 0
        )

        +

        Number(
            today_canteen_total || 0
        )

        -

        Number(
            today_expense || 0
        )

        -

        Number(
            today_easy || 0
        );


    setText(
        "netIncome",
        finalTodayNet
    );


    // ======================================================
    // PAID / UNPAID
    // ======================================================

    setText(
        "paidBills",
        today_paid
    );


    setText(
        "unpaidBills",
        today_unpaid
    );


    // ======================================================
    // MONTHLY UI
    // ======================================================

    setText(
        "monthlyIncome",
        monthly_income
    );


    setText(
        "monthlycanteen",
        monthly_canteen
    );


    setText(
        "monthlyExpenses",
        monthly_expense
    );


    setText(
        "monthlyEasyPaisa",
        monthly_easy
    );


    // ======================================================
    // MONTHLY PROFIT
    // ======================================================

    const finalMonthlyProfit =

        Number(
            monthly_income || 0
        )

        +

        Number(
            monthly_canteen || 0
        )

        -

        Number(
            monthly_expense || 0
        )

        -

        Number(
            monthly_easy || 0
        );


    setText(
        "netProfit",
        finalMonthlyProfit
    );


    // ======================================================
    // SHIFT MONTHLY
    // ======================================================

    setText(
        "shift1Monthly",
        shift1Monthly
    );


    setText(
        "shift2Monthly",
        shift2Monthly
    );


// ======================================================
// UNIQUE CLOSED OPERATIONAL DAYS
// FOR MONTHLY AVERAGE
// ======================================================

const uniqueMonthDates =
    new Set();


Object.values(
    operationalDays || {}
).forEach(d => {

    if(

        d.month !==
        selectedMonth ||

        d.year !==
        selectedYear ||

        d.raw?.is_closed !== true ||

        !d.startDate

    ){

        return;

    }


    const dateKey =
        new Intl.DateTimeFormat(
            "en-CA",
            {
                timeZone:
                    "Asia/Karachi",

                year:
                    "numeric",

                month:
                    "2-digit",

                day:
                    "2-digit"
            }
        ).format(
            new Date(
                d.startDate
            )
        );


    uniqueMonthDates.add(
        dateKey
    );

});


let operationalMonthDays =
    uniqueMonthDates.size;


    if(
        operationalMonthDays <= 0
    ){

        operationalMonthDays = 1;

    }


    const monthlyAvg =

        Number(
            monthly_income || 0
        )

        /

        operationalMonthDays;


    setText(
        "monthlyAverage",
        Math.round(
            monthlyAvg
        )
    );


    // ======================================================
    // TABLE SALES BOXES
    // ======================================================

    renderTableSalesBoxes();


    // ======================================================
    // ROLE CONTROL
    // ======================================================

    if(
        role === "staff"
    ){

        document
            .querySelectorAll(
                ".admin-only"
            )
            .forEach(el => {

                el.style.display =
                    "none";

            });

    }


    // ======================================================
    // FINAL DEBUG
    // ======================================================

    console.log(
        "📊 DASHBOARD FINAL VALUES:",
        {

            branch:
                localStorage.getItem(
                    "branch"
                ),

            currentDayId,

            currentOperationalDay:
                currentOperationalDay
                    ? {
                        dayId:
                            currentOperationalDay.raw?.day_id,

                        start:
                            currentOperationalDay.startDate,

                        closed:
                            currentOperationalDay.raw?.is_closed
                    }
                    : null,

            selectedMonth:
                selectedMonth + 1,

            selectedYear,

            today_sessions,

            completed_sessions,

            today_game_total,

            today_canteen_total,

            today_expense,

            today_easy,

            today_paid,

            today_unpaid,

            monthly_income,

            monthly_canteen,

            monthly_expense,

            monthly_easy,

            shift1Monthly,

            shift2Monthly,

            monthlyAvg

        }
    );

}


// ======================================================
// TABLE SALES BOXES
// ======================================================

function renderTableSalesBoxes(){


    // ==================================================
    // STAFF CONTAINER
    // ==================================================

    const staffContainer =
        document.getElementById(
            "staffTableSalesContainer"
        );


    // ==================================================
    // ADMIN CONTAINER
    // ==================================================

    const adminContainer =
        document.getElementById(
            "tableSalesContainer"
        );


    if(staffContainer){

        staffContainer.innerHTML =
            "";

    }


    if(adminContainer){

        adminContainer.innerHTML =
            "";

    }


    let staffStats = {};

    let adminStats = {};


    // ==================================================
    // CREATE TABLES
    // ==================================================

    tablesData.forEach(t => {


        const tableName =

            t.table_id ||

            t.name ||

            "Unknown Table";


        staffStats[tableName] = {

            shift1: 0,

            shift2: 0,

            total: 0

        };


        adminStats[tableName] = {

            shift1: 0,

            shift2: 0,

            total: 0

        };

    });


    // ==================================================
    // SESSION LOOP
    // ==================================================

    sessionsData.forEach(s => {


        if(
            s.is_deleted === true
        ){

            return;

        }


        const tableName =

            s.table_id ||

            s.table ||

            s.table_name ||

            "Unknown Table";


        if(
            !staffStats[tableName]
        ){

            staffStats[tableName] = {

                shift1: 0,

                shift2: 0,

                total: 0

            };

        }


        if(
            !adminStats[tableName]
        ){

            adminStats[tableName] = {

                shift1: 0,

                shift2: 0,

                total: 0

            };

        }


        const amount =

            Number(

                s.final_game_amount ??

                s.final_amount ??

                s.total_amount ??

                s.amount ??

                0

            );


        const sessionDate =

            getRecordDate(

                s.start_time ||

                s.startTime ||

                s.created_at

            );


        if(!sessionDate){

            return;

        }


        const hour =
            sessionDate.getHours();


        const shiftKey =

            (
                hour >= 9 &&
                hour < 20
            )

            ?

            "shift1"

            :

            "shift2";


        const dayId =
            getRecordDayId(s);


        const operational =
            dayId
                ? operationalDays[dayId]
                : null;


        // ==================================================
        // STAFF
        // CURRENT OPEN OPERATIONAL DAY
        // ==================================================

        if(
            isRecordInCurrentOperationalDay(s)
        ){

            staffStats[tableName][shiftKey]
                += amount;

            staffStats[tableName].total
                += amount;

        }


        // ==================================================
        // ADMIN
        // SELECTED MONTH
        // CLOSED OPERATIONAL DAYS
        // ==================================================

        if(

            operational &&

            operational.month ===
            selectedMonth &&

            operational.year ===
            selectedYear &&

            operational.raw?.is_closed === true

        ){

            adminStats[tableName][shiftKey]
                += amount;

            adminStats[tableName].total
                += amount;

        }

    });


    // ==================================================
    // SORT TABLES
    // ==================================================

    function sortTables(obj){

        return Object.keys(obj).sort(
            (a,b) => {

                const aLower =
                    a.toLowerCase();

                const bLower =
                    b.toLowerCase();


                const aIsRoom =
                    aLower.includes(
                        "room"
                    );


                const bIsRoom =
                    bLower.includes(
                        "room"
                    );


                if(
                    aIsRoom &&
                    !bIsRoom
                ){

                    return 1;

                }


                if(
                    !aIsRoom &&
                    bIsRoom
                ){

                    return -1;

                }


                const aNum =
                    parseInt(
                        a.match(/\d+/)?.[0] || 0
                    );


                const bNum =
                    parseInt(
                        b.match(/\d+/)?.[0] || 0
                    );


                return aNum - bNum;

            }
        );

    }


    // ==================================================
    // STAFF UI
    // ==================================================

    if(staffContainer){

        sortTables(
            staffStats
        ).forEach(table => {


            const t =
                staffStats[table];


            staffContainer.innerHTML += `

                <div class="table-sale-box">

                    <h2>${table}</h2>

                    <p>
                        Shift1 : ${t.shift1}
                    </p>

                    <p>
                        Shift2 : ${t.shift2}
                    </p>

                    <p>
                        Total : ${t.total}
                    </p>

                </div>

            `;

        });

    }


    // ==================================================
    // ADMIN UI
    // ==================================================

    if(adminContainer){

        sortTables(
            adminStats
        ).forEach(table => {


            const t =
                adminStats[table];


            adminContainer.innerHTML += `

                <div class="table-sale-box">

                    <h2>${table}</h2>

                    <p>
                        Shift1 : ${t.shift1}
                    </p>

                    <p>
                        Shift2 : ${t.shift2}
                    </p>

                    <p>
                        Total : ${t.total}
                    </p>

                </div>

            `;

        });

    }

}
