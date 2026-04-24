

import { collection, onSnapshot, getDocs, query, where } 
from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";


document.addEventListener("DOMContentLoaded", () => {
    loadDashboardRealtime();
});

const role = (localStorage.getItem("role") || "").toLowerCase();

let incomeChart, billsChart, hourlyChart;

function loadDashboardRealtime() {

    const branch = localStorage.getItem("branch");
    if (!branch) return;

    const todayStart = new Date();
    todayStart.setHours(0,0,0,0);

    let tablesData=[], sessionsData=[], canteenData=[], expenseData=[];

    onSnapshot(collection(window.db, "tables"), snap => {
        tablesData=[]; snap.forEach(d=>{
            let t=d.data(); if(t.branch===branch) tablesData.push(t);
        }); updateDashboard();
    });

    onSnapshot(collection(window.db, "sessions"), snap => {
        sessionsData=[]; snap.forEach(d=>{
            let s=d.data(); if(s.branch===branch) sessionsData.push(s);
        }); updateDashboard();
    });

    onSnapshot(collection(window.db, "canteen_logs"), snap => {
        canteenData=[]; snap.forEach(d=>{
            let c=d.data(); if(c.branch===branch) canteenData.push(c);
        }); updateDashboard();
    });

    onSnapshot(collection(window.db, "expenses"), snap => {
        expenseData=[]; snap.forEach(d=>{
            let e=d.data(); if(e.branch===branch) expenseData.push(e);
        }); updateDashboard();
    });

    function updateDashboard() {

        let today_game_total=0, today_paid=0, today_unpaid=0;
        let today_sessions=0, completed_sessions=0;

        let hourly=new Array(24).fill(0);
        let tableEarnings={}, itemSales={};

        sessionsData.forEach(s=>{
            let date=new Date(s.start_time);
            if(date<todayStart) return;

            let amount=Number(s.total_amount||0);

            today_sessions++;
            today_game_total+=amount;

            hourly[date.getHours()]+=amount;

            let table=s.table_id||"Unknown";
            tableEarnings[table]=(tableEarnings[table]||0)+amount;

            if(s.paid) today_paid++; else today_unpaid++;
            if(s.end_time) completed_sessions++;
        });

        let today_canteen_total=0;
        canteenData.forEach(c=>{
            let time=new Date(c.time);
            if(time>=todayStart){
                today_canteen_total+=Number(c.total||0);

                (c.items||[]).forEach(item=>{
                    let name=item.name||"Item";
                    itemSales[name]=(itemSales[name]||0)+(item.qty||1);
                });
            }
        });

        let today_expense=0;
        expenseData.forEach(e=>{
            let time=new Date(e.created_at);
            if(time>=todayStart)
                today_expense+=Number(e.amount||0);
        });

        let monthly_income=0;
        sessionsData.forEach(s=>{
            let d=new Date(s.start_time);
            if(d.getMonth()===new Date().getMonth())
                monthly_income+=Number(s.total_amount||0);
        });

        // UI SET
        setText("totalTables", tablesData.length);
        setText("activeTables", tablesData.filter(t=>t.isRunning).length);
        setText("freeTables", tablesData.length - tablesData.filter(t=>t.isRunning).length);

        setText("todaySessions", today_sessions);
        setText("completedSessions", completed_sessions);

        setText("timeIncome", today_game_total);
        setText("canteenIncome", today_canteen_total);
        setText("totalIncome", today_game_total+today_canteen_total);

        setText("paidBills", today_paid);
        setText("unpaidBills", today_unpaid);

        setText("monthlyIncome", monthly_income);
        setText("monthlyExpense", today_expense);
        setText("netProfit", monthly_income - today_expense);

        // CHARTS
        renderCharts(today_game_total, today_canteen_total, today_paid, today_unpaid);
        renderHourlyChart(hourly);

        // TOP TABLES
        let topTables=Object.entries(tableEarnings).sort((a,b)=>b[1]-a[1]).slice(0,5);
        document.getElementById("topTablesList").innerHTML =
            topTables.map((t,i)=>`${i+1}. ${t[0]} → Rs ${t[1]}`).join("<br>");

        // TOP ITEMS
        let topItems=Object.entries(itemSales).sort((a,b)=>b[1]-a[1]).slice(0,5);
        document.getElementById("topItemsList").innerHTML =
            topItems.map((t,i)=>`${i+1}. ${t[0]} → ${t[1]} qty`).join("<br>");

        if(role==="staff"){
            document.querySelectorAll(".admin-only").forEach(el=>el.style.display="none");
        }
    }
}


function renderCharts(g,c,p,u){
    if(incomeChart) incomeChart.destroy();
    if(billsChart) billsChart.destroy();

    const commonOptions = {
        responsive: true,
        plugins: {
            legend: {
                labels: {
                    color: "#00ffcc",
                    font: {
                        size: 14,
                        weight: "bold"
                    }
                }
            }
        }
    };

    // INCOME CHART
    incomeChart = new Chart(document.getElementById("incomeChart"), {
        type: "doughnut",
        data: {
            labels: ["Game", "Canteen"],
            datasets: [{
                data: [g, c],
                backgroundColor: ["#00ffcc", "#ff4d6d"],
                borderWidth: 2,
                borderColor: "#000"
            }]
        },
        options: commonOptions
    });

    // BILLS CHART
    billsChart = new Chart(document.getElementById("billsChart"), {
        type: "pie",
        data: {
            labels: ["Paid", "Unpaid"],
            datasets: [{
                data: [p, u],
                backgroundColor: ["#00ffaa", "#ff3b3b"],
                borderWidth: 2,
                borderColor: "#000"
            }]
        },
        options: commonOptions
    });
}



// =======================
// HOURLY CHART FUNCTION
// =======================
function renderHourlyChart(data){
    if(hourlyChart) hourlyChart.destroy();

    hourlyChart = new Chart(document.getElementById("hourlyChart"), {
        type: "line",
        data: {
            labels: [...Array(24).keys()],
            datasets: [{
                label: "Hourly Income",
                data: data,
                borderColor: "#00ffcc",
                backgroundColor: "rgba(0,255,204,0.2)",
                tension: 0.4,
                fill: true,
                pointBackgroundColor: "#00ffaa",
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    labels: {
                        color: "#00ffcc",
                        font: { size: 14 }
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: "#00ffcc" },
                    grid: { color: "rgba(0,255,204,0.1)" }
                },
                y: {
                    ticks: { color: "#00ffcc" },
                    grid: { color: "rgba(0,255,204,0.1)" }
                }
            }
        }
    });
}



// =========================
// SAFE TEXT FUNCTION (FIX)
// =========================
function setText(id, value) {
    const el = document.getElementById(id);
    if (el) {
        el.innerText = value ?? 0;
    }
}
