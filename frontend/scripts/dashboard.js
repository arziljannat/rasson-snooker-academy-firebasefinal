import { collection, onSnapshot } 
from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
    loadDashboardRealtime();
});

const role = (localStorage.getItem("role") || "").toLowerCase();

let incomeChart, billsChart, hourlyChart;
let tablesData = [];
let sessionsData = [];
let canteenData = [];
let expenseData = [];

function loadDashboardRealtime() {

    const branch = (localStorage.getItem("branch") || "").toLowerCase();
    if (!branch) return;

    const todayStart = new Date();
    todayStart.setHours(0,0,0,0);

    onSnapshot(collection(window.db, "tables"), snap => {
        tablesData=[];
        snap.forEach(d=>{
            let t=d.data();
            if((t.branch || "").toLowerCase() === branch) tablesData.push(t);
        });
        updateDashboard();
    });

    onSnapshot(collection(window.db, "sessions"), snap => {
        sessionsData=[];
        snap.forEach(d=>{
            let s=d.data();
            if((s.branch || "").toLowerCase() === branch) sessionsData.push(s);
        });
        updateDashboard();
    });

    onSnapshot(collection(window.db, "canteen_logs"), snap => {
        canteenData=[];
        snap.forEach(d=>{
            let c=d.data();
            if((c.branch || "").toLowerCase() === branch) canteenData.push(c);
        });
        updateDashboard();
    });

    onSnapshot(collection(window.db, "expenses"), snap => {
        expenseData=[];
        snap.forEach(d=>{
            let e=d.data();
            if((e.branch || "").toLowerCase() === branch) expenseData.push(e);
        });
  updateDashboard();
          });

    
// ✅ EASYPAISA
onSnapshot(collection(window.db, "easypaisa"), snap => {

    let todayEasy = 0;
    let monthlyEasy = 0;

    let now = new Date();
    const currentDayId = localStorage.getItem("currentDayId");

    snap.forEach(d => {

        let e = d.data();

        if ((e.branch || "").toLowerCase() !== branch) return;

        let amount = Number(e.amount || 0);

        let date;

        if (e.created_at?.seconds) {
            date = new Date(e.created_at.seconds * 1000);
        } else {
            date = new Date(e.created_at);
        }

        // TODAY
        if (String(e.day_id) === String(currentDayId)) {
            todayEasy += amount;
        }

        // MONTHLY
        if (
            date.getMonth() === now.getMonth() &&
            date.getFullYear() === now.getFullYear()
        ) {
            monthlyEasy += amount;
        }
    });

    setText("todayEasyPaisa", todayEasy);
    setText("monthlyEasyPaisa", monthlyEasy);

});
}
        
      

function updateDashboard() {

    let now = new Date();
    const currentDayId = localStorage.getItem("currentDayId");
    let todayStart = new Date();
    todayStart.setHours(0,0,0,0);

    let today_game_total=0, today_paid=0, today_unpaid=0;
    let today_sessions=0, completed_sessions=0;
    let today_canteen_total=0;
    let today_expense=0;

    let monthly_income=0;
    let today_easy = 0;
    let monthly_easy = 0;
    let monthly_canteen=0;
    let monthly_expense=0;
    let shift1Monthly = 0;
    let shift2Monthly = 0;
    // ================= SESSIONS =================
    sessionsData.forEach(s=>{

    let date = new Date(s.start_time || s.startTime || s.created_at);
    let amount = Number(s.final_amount || 0);

    // 🔥 CURRENT DAY ONLY
    if(String(s.day_id) === String(currentDayId)){
        if(date>=todayStart){
            today_sessions++;
            today_game_total+=amount;

            if(s.paid) today_paid++; else today_unpaid++;
            if(s.end_time) completed_sessions++;
        }
    }

    // 🔥 MONTHLY (NO DAY FILTER)
    if(date.getMonth()===now.getMonth() && date.getFullYear()===now.getFullYear()){
        monthly_income += amount;

        let hour = date.getHours();
        if(hour < 18){
            shift1Monthly += amount;
        } else {
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
if(date.getMonth()===now.getMonth() && date.getFullYear()===now.getFullYear()){
    monthly_canteen+=amount;
}
});

// 🔥 ALSO FROM SESSIONS (VERY IMPORTANT)
    // 🔥 ALSO FROM SESSIONS (VERY IMPORTANT)
sessionsData.forEach(s=>{

    let date = new Date(s.start_time || s.startTime || s.created_at);
    let canteen = Number(s.canteen_total || 0);

    // 🔥 CURRENT DAY
    if(String(s.day_id) === String(currentDayId)){
        if(date>=todayStart){
            today_canteen_total += canteen;
        }
    }

    // 🔥 MONTHLY (NO DAY FILTER)
    if(date.getMonth()===now.getMonth() && date.getFullYear()===now.getFullYear()){
        monthly_canteen += canteen;
    }
});

    // ================= EXPENSE =================
    expenseData.forEach(e=>{
        let date=new Date(e.created_at);
let amount=Number(e.amount||0);

// 🔥 CURRENT DAY
if(String(e.day_id) === String(currentDayId)){
    if(date>=todayStart){
        today_expense+=amount;
    }
}

// 🔥 MONTHLY
if(date.getMonth()===now.getMonth() && date.getFullYear()===now.getFullYear()){
    monthly_expense+=amount;
}
    });

    // ================= EASYPAISA =================
const easyCardsToday = document.getElementById("todayEasyPaisa");
const easyCardsMonth = document.getElementById("monthlyEasyPaisa");

if (easyCardsToday) {
    today_easy = Number(easyCardsToday.innerText || 0);
}

if (easyCardsMonth) {
    monthly_easy = Number(easyCardsMonth.innerText || 0);
}

    // ================= UI =================
    setText("totalTables", tablesData.length);
    setText("activeTables", tablesData.filter(t=>t.isRunning).length);
    setText("freeTables", tablesData.length - tablesData.filter(t=>t.isRunning).length);

    setText("todaySessions", today_sessions);
    setText("completedSessions", completed_sessions);

    setText("todayIncome", today_game_total);
    setText("todayCanteen", today_canteen_total);
    setText("todayExpenses", today_expense);

    setText(
    "netIncome",
    (today_game_total + today_canteen_total)
    - today_expense
    - today_easy
);

    setText("paidBills", today_paid);
    setText("unpaidBills", today_unpaid);

    setText("monthlyIncome", monthly_income);
    setText("monthlycanteen", monthly_canteen);
    setText("monthlyExpenses", monthly_expense);

    setText(
    "netProfit",
    (monthly_income + monthly_canteen)
    - monthly_expense
    - monthly_easy
);
    setText("shift1Monthly", shift1Monthly);
    setText("shift2Monthly", shift2Monthly);

    let daysPassed = new Date().getDate();
    let monthlyAvg = monthly_income / daysPassed;
    setText("monthlyAverage", Math.round(monthlyAvg));

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

    let now = new Date();
    let daysInMonth = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();

    let labels = [];
    let incomeArr = new Array(daysInMonth).fill(0);
    let canteenArr = new Array(daysInMonth).fill(0);
    let expenseArr = new Array(daysInMonth).fill(0);
    let profitArr = new Array(daysInMonth).fill(0);

    let shift1Arr = new Array(daysInMonth).fill(0);
    let shift2Arr = new Array(daysInMonth).fill(0);

    for(let i=1;i<=daysInMonth;i++){
        labels.push(i);
    }

    // 🔥 SESSIONS
    sessionsData.forEach(s=>{
        let d = new Date(s.start_time || s.startTime || s.created_at);
        if(d.getMonth() !== now.getMonth()) return;

        let day = d.getDate()-1;
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

    // 🔥 CANTEEN
    // 🔥 CANTEEN (logs)
canteenData.forEach(c=>{
    let d = new Date(c.time || c.created_at || c.date);
    if(d.getMonth() !== now.getMonth()) return;

    let day = d.getDate()-1;
    canteenArr[day] += Number(c.total || c.amount || 0);
});

// 🔥 CANTEEN FROM SESSIONS (SEPARATE LOOP)
sessionsData.forEach(s=>{
    let d = new Date(s.start_time || s.startTime || s.created_at);
    if(d.getMonth() !== now.getMonth()) return;

    let day = d.getDate()-1;
    canteenArr[day] += Number(s.canteen_total || 0);
});

    // 🔥 EXPENSE
    expenseData.forEach(e=>{
        let d = new Date(e.created_at);
        if(d.getMonth() !== now.getMonth()) return;

        let day = d.getDate()-1;
        expenseArr[day] += Number(e.amount||0);
    });

    // 🔥 PROFIT
    for(let i=0;i<daysInMonth;i++){
        profitArr[i] = (incomeArr[i] + canteenArr[i]) - expenseArr[i];
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
