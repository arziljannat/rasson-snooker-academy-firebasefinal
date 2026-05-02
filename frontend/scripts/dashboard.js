import {
    collection,
    getDocs
}
from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
document.addEventListener("DOMContentLoaded", async () => {

    const branch = (localStorage.getItem("branch") || "").toLowerCase();

    const snap = await getDocs(
    collection(window.db, "system")
);

    snap.forEach(d => {

        let data = d.data();

        if (
            data.type === "current_day" &&
            (data.branch || "").toLowerCase() === branch
        ) {
            window.currentDayId = data.day_id;
        }
    });

    console.log("🔥 DASHBOARD CURRENT DAY:", window.currentDayId);

    await loadOperationalDays();

    loadDashboardRealtime();

    // ✅ MONTH FILTER
const monthInput = document.getElementById("dashboardMonthFilter");

if(monthInput){

    let operationalCurrent =
        operationalDays[String(window.currentDayId)];

    if(operationalCurrent){

        selectedMonth =
            operationalCurrent.month;

        selectedYear =
            operationalCurrent.year;

        monthInput.value =
`${selectedYear}-${String(selectedMonth+1).padStart(2,"0")}`;

    }else{

        let now = new Date();

        monthInput.value =
`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
    }

    monthInput.addEventListener("change", (e)=>{

        let value = e.target.value;

        if(!value) return;

        let parts = value.split("-");

        selectedYear = Number(parts[0]);
        selectedMonth = Number(parts[1]) - 1;

        updateDashboard();
    });
}
});

const role = (localStorage.getItem("role") || "").toLowerCase();

let incomeChart, billsChart, hourlyChart;
let tablesData = [];
let sessionsData = [];
let canteenData = [];
let expenseData = [];
let realtimeTodayEasy = 0;
let realtimeMonthlyEasy = 0;
let selectedMonth = new Date().getMonth();
let selectedYear = new Date().getFullYear();

let operationalDays = {};

async function loadOperationalDays(){

    operationalDays = {};

    const snap = await getDocs(
        collection(window.db, "days")
    );

    snap.forEach(doc => {

        let d = doc.data();

        let dayId =
            String(d.day_id || "");

       let rawDate =
            d.start_time ||
            d.created_at ||
            d.date;

// 🔥 FIX FOR OLD DAYS
if (!d.start_time && d.shift1?.startMs) {
    rawDate = d.shift1.startMs;
}

if(!rawDate) return;

let date = new Date(rawDate);

        if(isNaN(date.getTime())) return;

        // 🔥 ONLY CLOSED DAYS
// 🔥 SKIP ONLY CURRENT RUNNING DAY

operationalDays[dayId] = {

    raw: d,

    startDate: date,

    month: date.getMonth(),

    year: date.getFullYear(),

    day: date.getDate(),

    isCurrent:
        String(d.day_id) ===
        String(window.currentDayId)
};
    });
}



function loadDashboardRealtime() {

    const branch = (localStorage.getItem("branch") || "").toLowerCase();
    if (!branch) return;

    const todayStart = new Date();
    todayStart.setHours(0,0,0,0);

    getDocs(collection(window.db, "tables")).then(snap => {

    tablesData = [];

    let uniqueTables = {};

    snap.forEach(d => {

        let t = d.data();

        // ONLY CURRENT BRANCH
        if ((t.branch || "").toLowerCase() !== branch) return;

        // TABLE NAME
        let tableName =
            (t.table_id || t.name || "")
            .toLowerCase()
            .trim();

        // SKIP DUPLICATES
        if (uniqueTables[tableName]) return;

        uniqueTables[tableName] = true;

        tablesData.push(t);
    });

    updateDashboard();
});

    getDocs(collection(window.db, "sessions")).then(snap => {
        sessionsData=[];
        snap.forEach(d=>{
            let s=d.data();
            if((s.branch || "").toLowerCase() === branch) sessionsData.push(s);
        });
        updateDashboard();
    });

    getDocs(collection(window.db, "canteen_logs")).then(snap => {
        canteenData=[];
        snap.forEach(d=>{
            let c=d.data();
            if((c.branch || "").toLowerCase() === branch) canteenData.push(c);
        });
        updateDashboard();
    });

    getDocs(collection(window.db, "expenses")).then(snap => {
        expenseData=[];
        snap.forEach(d=>{
            let e=d.data();
            if((e.branch || "").toLowerCase() === branch) expenseData.push(e);
        });
  updateDashboard();
          });

    
// ✅ EASYPAISA
getDocs(collection(window.db, "easypaisa")).then(snap => {

    window.latestEasyDocs = [];

    let todayEasy = 0;
    let monthlyEasy = 0;

    let now = new Date();
    const currentDayId = window.currentDayId;

    snap.forEach(d => {

        let e = d.data();
        window.latestEasyDocs.push(e);

        if ((e.branch || "").toLowerCase() !== branch) return;

        let amount = Number(e.amount || 0);

        let date;

        let rawDate =
    e.created_at?.seconds
    ? e.created_at.seconds * 1000
    : e.created_at;

if (!rawDate) return;

date = new Date(rawDate);

if (isNaN(date.getTime())) return;

        // TODAY
        if (String(e.day_id) === String(currentDayId)) {
            todayEasy += amount;
        }
        // MONTHLY
if (
    date.getMonth() === selectedMonth &&
    date.getFullYear() === selectedYear
) {
    monthlyEasy += amount;
}

    });

    setText("todayEasyPaisa", todayEasy);
    
    realtimeTodayEasy = todayEasy;
    realtimeMonthlyEasy = monthlyEasy;
    

});
}
        
      

async function updateDashboard() {

    let now = new Date();
    const currentDayId = window.currentDayId;
    let todayStart = new Date();
    todayStart.setHours(0,0,0,0);

    let today_game_total=0, today_paid=0, today_unpaid=0;
    let today_sessions=0, completed_sessions=0;
    let today_canteen_total=0;
    let today_expense=0;

    let monthly_income=0;

    let today_easy = realtimeTodayEasy || 0;
    // 🔥 RESET TODAY VALUES FOR OPERATIONAL DAY
            today_sessions = 0;
            completed_sessions = 0;
            today_game_total = 0;
            today_paid = 0;
            today_unpaid = 0;
            today_canteen_total = 0;
            today_expense = 0;
            let monthly_easy = 0;

(window.latestEasyDocs || []).forEach(e => {
    let rawDate =
    e.created_at?.seconds
    ? e.created_at.seconds * 1000
    : e.created_at;

if (!rawDate) return;

let date = new Date(rawDate);

if (isNaN(date.getTime())) return;

if (
    (e.branch || "").toLowerCase() !==
    (localStorage.getItem("branch") || "").toLowerCase()
) return;

    if (!e.created_at) return;
    const easyMonth =
    date.getMonth();

const easyYear =
    date.getFullYear();

    let operational =
    operationalDays[String(e.day_id)];

if(
    operational &&
    operational.month === selectedMonth &&
    operational.year === selectedYear &&
    operational.raw?.is_closed === true
){
    monthly_easy += Number(e.amount || 0);
}
});

    let monthly_canteen=0;
    let monthly_expense=0;
    let shift1Monthly = 0;
    let shift2Monthly = 0;
    // ================= SESSIONS =================
    sessionsData.forEach(s=>{
        // 🔥 SKIP DELETED SESSIONS
if (s.is_deleted === true) return;

    let date = new Date(s.start_time || s.startTime || s.created_at);
    let amount = Number(
    s.final_amount ||
    s.total_amount ||
    s.amount ||
    0
);

    // 🔥 CURRENT DAY ONLY

let sessionDayId =
    s.day_id ||
    s.dayId ||
    s.current_day_id ||
    0;

 let operational =
    operationalDays[String(sessionDayId)];       

if(String(sessionDayId) === String(currentDayId)){

    const operational =
    operationalDays[String(sessionDayId)];

if(
    operational &&
    operational.raw?.is_closed === true &&
    !operational.isCurrent
){
    return;
}

    if (isNaN(date.getTime())) return;

    today_sessions++;
    today_game_total += amount;

    if(s.paid){
        today_paid++;
    } else {
        today_unpaid++;
    }

    if(s.end_time){
        completed_sessions++;
    }
}

    // 🔥 MONTHLY (NO DAY FILTER)
    // 🔥 MONTHLY OPERATIONAL LOGIC
if(
    operational &&
    operational.month === selectedMonth &&
    operational.year === selectedYear &&
    operational.raw?.is_closed === true
){

    monthly_income += amount;

    let startHour =
        operational.startDate.getHours();

    if(startHour < 18){

        shift1Monthly += amount;

    }else{

        shift2Monthly += amount;
    }
}

});

    // ================= CANTEEN =================

// 🔥 FROM CANTEEN LOGS
canteenData.forEach(c=>{
    let date = new Date(c.time || c.created_at || c.date);
let amount = Number(c.total || c.amount || 0);

// 🔥 CURRENT DAY
if(String(c.day_id) === String(currentDayId)){
    if(date>=todayStart){
        today_canteen_total+=amount;
    }
}

// 🔥 MONTHLY (NO FILTER)
let operational =
    operationalDays[String(c.day_id)];

if(
    operational &&
    operational.month === selectedMonth &&
    operational.year === selectedYear &&
    operational.raw?.is_closed === true
){
    monthly_canteen += amount;
}
});

// 🔥 ALSO FROM SESSIONS (VERY IMPORTANT)
    // 🔥 ALSO FROM SESSIONS (VERY IMPORTANT)
sessionsData.forEach(s=>{

    // 🔥 SKIP DELETED SESSIONS
    if (s.is_deleted === true) return;

    let date = new Date(
        s.start_time ||
        s.startTime ||
        s.created_at
    );

    let canteen =
        Number(s.canteen_total || 0);

    // 🔥 CURRENT DAY
    if(String(s.day_id) === String(currentDayId)){

        if(date >= todayStart){
            today_canteen_total += canteen;
        }
    }

    // 🔥 MONTHLY
    let operational =
        operationalDays[String(s.day_id)];

    if(
        operational &&
        operational.month === selectedMonth &&
        operational.year === selectedYear &&
        operational.raw?.is_closed === true
    ){
        monthly_canteen += canteen;
    }
});

    // ================= EXPENSE =================
    expenseData.forEach(e=>{

    let date;

    if (e.created_at?.seconds) {
        date = new Date(e.created_at.seconds * 1000);
    } else {
        date = new Date(e.created_at);
    }

    if(isNaN(date.getTime())) return;

    let amount = Number(e.amount || 0);

    // TODAY
    if(String(e.day_id) === String(currentDayId)){
        today_expense += amount;
    }

    // MONTHLY
    let operational =
    operationalDays[String(e.day_id)];

if(
    operational &&
    operational.month === selectedMonth &&
    operational.year === selectedYear &&
    operational.raw?.is_closed === true
){
    monthly_expense += amount;
}
});

    // ================= EASYPAISA =================


    // ================= UI =================
    setText("totalTables", tablesData.length);
const activeTablesCount = sessionsData.filter(s => {

    // 🔥 SKIP DELETED
    if (s.is_deleted === true) return false;

    // 🔥 ONLY CURRENT OPERATIONAL DAY
    const sameDay =
        String(
            s.day_id ||
            s.dayId ||
            s.current_day_id ||
            ""
        ) === String(currentDayId);

    // 🔥 RUNNING SESSION
    const running =
        !s.end_time &&
        !s.endTime &&
        !s.checkout_time &&
        !s.checkoutTime &&
        !s.closeTime &&
        !s.close_time;

    // 🔥 IGNORE OLD CLOSED DAYS
    const operational =
        operationalDays[
            String(
                s.day_id ||
                s.dayId ||
                s.current_day_id ||
                ""
            )
        ];

   if (
    operational &&
    operational.raw?.is_closed === true &&
    !operational.isCurrent
) {
    return false;
}

    return sameDay && running;

}).length;
    
setText("activeTables", activeTablesCount);
setText("freeTables", tablesData.length - activeTablesCount);

    setText("todaySessions", today_sessions);
    setText("completedSessions", completed_sessions);

    setText("todayIncome", today_game_total);
    setText("todayCanteen", today_canteen_total);
    setText("todayExpenses", today_expense);

    const finalTodayNet =
    Number(today_game_total || 0)
    + Number(today_canteen_total || 0)
    - Number(today_expense || 0)
    - Number(today_easy || 0);

setText("netIncome", finalTodayNet);

    setText("paidBills", today_paid);
    setText("unpaidBills", today_unpaid);

    setText("monthlyIncome", monthly_income);
    setText("monthlycanteen", monthly_canteen);
    setText("monthlyExpenses", monthly_expense);
    setText("monthlyEasyPaisa", monthly_easy);

    const finalMonthlyProfit =
    Number(monthly_income || 0)
    + Number(monthly_canteen || 0)
    - Number(monthly_expense || 0)
    - Number(monthly_easy || 0);

setText("netProfit", finalMonthlyProfit);
    setText("shift1Monthly", shift1Monthly);
    setText("shift2Monthly", shift2Monthly);

    let totalMonthDays = new Date(
    selectedYear,
    selectedMonth + 1,
    0
).getDate();

let monthlyAvg =
    Number(monthly_income || 0) / totalMonthDays;

setText(
    "monthlyAverage",
    Math.round(monthlyAvg)
);

    // 🔥 REALTIME CHARTS
    renderMonthlyCharts(sessionsData, canteenData, expenseData);

    // 🔥 ROLE CONTROL
    if(role==="staff"){
        document.querySelectorAll(".admin-only")
            .forEach(el=>el.style.display="none");
    }

            console.log({
        today_canteen_total,
        monthly_canteen,
        shift1Monthly,
        shift2Monthly
        });
}

// ================= CHARTS =================

function renderCharts(g,c,p,u){
    if(incomeChart) incomeChart.destroy();
    if(billsChart) billsChart.destroy();

    incomeChart = new Chart(document.getElementById("incomeChart"), {
        type: "doughnut",
        data: {
            labels: ["Game", "Canteen"],
            datasets: [{
                data: [g, c],
                backgroundColor: ["#00ffcc", "#ff4d6d"]
            }]
        }
    });

    billsChart = new Chart(document.getElementById("billsChart"), {
        type: "pie",
        data: {
            labels: ["Paid", "Unpaid"],
            datasets: [{
                data: [p, u],
                backgroundColor: ["#00ffaa", "#ff3b3b"]
            }]
        }
    });
}

// ================= SAFE TEXT =================

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) {
        el.innerText = value ?? 0;
    }
}

function renderMonthlyCharts(sessionsData, canteenData, expenseData){

    let daysInMonth = new Date(
    selectedYear,
    selectedMonth + 1,
    0
).getDate();

    let labels = [];
    let incomeArr = new Array(daysInMonth).fill(0);
    let canteenArr = new Array(daysInMonth).fill(0);
    let expenseArr = new Array(daysInMonth).fill(0);
    let profitArr = new Array(daysInMonth).fill(0);

    let easyArr = new Array(daysInMonth).fill(0);

    let shift1Arr = new Array(daysInMonth).fill(0);
    let shift2Arr = new Array(daysInMonth).fill(0);

    for(let i=1;i<=daysInMonth;i++){
        labels.push(i);
    }

    // 🔥 SESSIONS
    sessionsData.forEach(s=>{

        // 🔥 SKIP DELETED SESSIONS
if (s.is_deleted === true) return;
        
        let operational =
    operationalDays[String(s.day_id)];

if(
    !operational ||
    operational.month !== selectedMonth ||
    operational.year !== selectedYear ||
    operational.raw?.is_closed === true
) return;

let d = operational.startDate;

let day = operational.day - 1;
        let amount = Number(
    s.final_amount ||
    s.total_amount ||
    s.amount ||
    0
);
        let canteen = Number(s.canteen_total || 0);

        incomeArr[day] += amount;
        

        // SHIFT LOGIC (simple split)
        let hour = d.getHours();
        if(hour < 18){
            shift1Arr[day] += amount;
        } else {
            shift2Arr[day] += amount;
        }
    });

    // 🔥 CANTEEN (logs)
canteenData.forEach(c=>{
    let operational =
    operationalDays[String(c.day_id)];

if(
    !operational ||
    operational.month !== selectedMonth ||
    operational.year !== selectedYear ||
    operational.raw?.is_closed === true
) return;

let day = operational.day - 1;
    canteenArr[day] += Number(c.total || c.amount || 0);
});

// 🔥 CANTEEN FROM SESSIONS (SEPARATE LOOP)
sessionsData.forEach(s=>{

    // 🔥 SKIP DELETED SESSIONS
    if (s.is_deleted === true) return;

    let operational =
        operationalDays[String(s.day_id)];

    if(
    !operational ||
    operational.month !== selectedMonth ||
    operational.year !== selectedYear ||
    operational.raw?.is_closed === true
) return;

    let day = operational.day - 1;

    canteenArr[day] += Number(s.canteen_total || 0);
});

    // 🔥 EXPENSE
    expenseData.forEach(e=>{

    let date;

    if (e.created_at?.seconds) {
        date = new Date(e.created_at.seconds * 1000);
    } else {
        date = new Date(e.created_at);
    }

    if(isNaN(date.getTime())) return;
        let operational =
    operationalDays[String(e.day_id)];

if(
    !operational ||
    operational.month !== selectedMonth ||
    operational.year !== selectedYear ||
    operational.raw?.is_closed === true
) return;

let day = operational.day - 1;

    expenseArr[day] += Number(e.amount || 0);
});

    // 🔥 PROFIT
    // 🔥 EASYPAISA
const easypaisaDocs = window.latestEasyDocs || [];

easypaisaDocs.forEach(e=>{

    if (
        (e.branch || "").toLowerCase() !==
        (localStorage.getItem("branch") || "").toLowerCase()
    ) return;

    let rawDate =
        e.created_at?.seconds
        ? e.created_at.seconds * 1000
        : e.created_at;

    if (!rawDate) return;

    let date = new Date(rawDate);

    if (isNaN(date.getTime())) return;

    let operational =
    operationalDays[String(e.day_id)];

if(
    !operational ||
    operational.month !== selectedMonth ||
    operational.year !== selectedYear ||
    operational.raw?.is_closed === true
) return;

let day = operational.day - 1;

    easyArr[day] += Number(e.amount || 0);
});

// 🔥 PROFIT
for(let i=0;i<daysInMonth;i++){

    profitArr[i] =
        incomeArr[i]
        + canteenArr[i]
        - expenseArr[i]
        - easyArr[i];
}

    // 🔥 CREATE CHARTS
    createChart("monthlyIncomeChart", "Income", labels, incomeArr);
    createChart("monthlyCanteenChart", "Canteen", labels, canteenArr);
    createChart("monthlyExpenseChart", "Expenses", labels, expenseArr);
    createChart("monthlyProfitChart", "Profit", labels, profitArr);

    // 🔥 SHIFT CHART
    // 🔥 SHIFT CHART (FIXED)
let ctx = document.getElementById("shiftChart");

if(window.shiftChartInstance){
    window.shiftChartInstance.destroy();
}

window.shiftChartInstance = new Chart(ctx, {
    type: "line",
    data: {
        labels: labels,
        datasets: [
    {
        label: "Shift 1",
        data: shift1Arr,
        borderColor: "#00ffcc",
        tension: 0.5,
        fill: false
    },
    {
        label: "Shift 2",
        data: shift2Arr,
        borderColor: "#ff4d6d",
        tension: 0.5,
        fill: false
    }
]
    },
    options: {
        responsive: true,
        animation: {
            duration: 1200,
            easing: "easeOutBounce"
        },
        plugins: {
            legend: {
                labels: { color: "#00ffcc" }
            }
        },
        scales: {
            x: {
                ticks: { color: "#aaa" },
                grid: { color: "rgba(255,255,255,0.05)" }
            },
            y: {
                ticks: { color: "#aaa" },
                grid: { color: "rgba(255,255,255,0.05)" }
            }
        }
    }
});
}

function createChart(id, label, labels, data){

    let ctx = document.getElementById(id);
    if(!ctx) return;

    if(!window.chartStore){
        window.chartStore = {};
    }

    if(window.chartStore[id]){
        window.chartStore[id].destroy();
    }

    const context = ctx.getContext("2d");

    // 🔥 ANIMATED GRADIENT
    let gradient = context.createLinearGradient(0,0,0,350);
    gradient.addColorStop(0, "rgba(0,255,204,0.5)");
    gradient.addColorStop(0.5, "rgba(0,255,204,0.2)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");

    let chart = new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [{
                label: label,
                data: data,

                borderColor: "#00ffcc",
                backgroundColor: gradient,

                borderWidth: 2,

                pointBackgroundColor: "#00ffcc",
                pointBorderColor: "#ffffff",
                pointBorderWidth: 2,

                pointRadius: 3,
                pointHoverRadius: 10,

                tension: 0.45,
                fill: true,
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            animation: {
                duration: 1500,
                easing: "easeOutExpo"
            },

            interaction: {
                mode: "nearest",
                intersect: false
            },

            plugins: {
                legend: { display: false },

                tooltip: {
                    backgroundColor: "rgba(0,0,0,0.85)",
                    borderColor: "#00ffcc",
                    borderWidth: 1,
                    titleColor: "#00ffcc",
                    bodyColor: "#fff",
                    padding: 10,
                    displayColors: false,
                    callbacks: {
                        label: function(ctx){
                            return "Rs " + ctx.raw;
                        }
                    }
                }
            },

            scales: {
                x: {
                    ticks: { color: "#888" },
                    grid: { color: "rgba(255,255,255,0.04)" }
                },
                y: {
                    ticks: { color: "#888" },
                    grid: { color: "rgba(255,255,255,0.04)" }
                }
            },

            hover: {
                mode: "nearest",
                intersect: false
            }
        },

        plugins: [

            // 🔥 GLOW LINE
            {
                id: "glow",
                beforeDatasetDraw(chart){
                    const ctx = chart.ctx;
                    ctx.save();
                    ctx.shadowColor = "#00ffcc";
                    ctx.shadowBlur = 25;
                },
                afterDatasetDraw(chart){
                    chart.ctx.restore();
                }
            },

            // 🔥 PULSE DOT ANIMATION
           {
    id: "pulseDot",
    afterDatasetsDraw(chart){
        const ctx = chart.ctx;
        const meta = chart.getDatasetMeta(0);

        meta.data.forEach(point => {
            ctx.save();
            ctx.beginPath();
            ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(0,255,204,0.2)";
            ctx.fill();
            ctx.restore();
        });
    }
}

]
    });

    window.chartStore[id] = chart;
}
