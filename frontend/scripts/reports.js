import {
  collection,
  getDocs,
  query,
  where,
  addDoc

} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";



function getDates() {
    let fromInput = document.getElementById("fromDate").value;
    let toInput = document.getElementById("toDate").value;

    if (!fromInput || !toInput) {
        alert("Select date range");
        return null;
    }

    let from = new Date(fromInput);
    let to = new Date(toInput);

    from.setHours(0,0,0,0);
    to.setHours(23,59,59,999);

    return { from, to };
}

const buttons = document.querySelectorAll(".report-btn");

let currentReport = "game";

buttons.forEach(btn => btn.classList.remove("active"));
buttons[0].classList.add("active");

buttons[0].onclick = () => {
    currentReport = "game";
    buttons.forEach(btn => btn.classList.remove("active"));
    buttons[0].classList.add("active");
};

buttons[1].onclick = () => {
    currentReport = "canteen";
    buttons.forEach(btn => btn.classList.remove("active"));
    buttons[1].classList.add("active");
};

document.getElementById("viewReportBtn").onclick = () => {
    if (currentReport === "game") {
        loadReport();
    } else {
        loadCanteenReport();
    }
};

async function loadReport() {

    let dates = getDates();
    if (!dates) return;

    let branch = localStorage.getItem("branch");
    let box = document.getElementById("reportOutput");

    box.innerHTML = "Loading...";

    try {

        // =========================
        // LOAD COLLECTIONS
        // =========================

        const sessionsSnap = await getDocs(
            query(
                collection(window.db, "sessions"),
                where("branch", "==", branch)
            )
        );

        const expenseSnap = await getDocs(
            query(
                collection(window.db, "expenses"),
                where("branch", "==", branch)
            )
        );

        const easySnap = await getDocs(
            query(
                collection(window.db, "easypaisa"),
                where("branch", "==", branch)
            )
        );

        const canteenSnap = await getDocs(
            query(
                collection(window.db, "canteen_logs"),
                where("branch", "==", branch)
            )
        );

        // =========================
        // TOTALS
        // =========================

        let totalGame = 0;
        let totalCanteen = 0;
        let totalExpense = 0;
        let totalEasy = 0;

        // =========================
        // GAME INCOME
        // =========================

        sessionsSnap.forEach(doc => {

            let d = doc.data();

            if (!d.checkout_time) return;

            let date;

            if (d.checkout_time.seconds) {
                date = new Date(d.checkout_time.seconds * 1000);
            } else {
                date = new Date(d.checkout_time);
            }

            if (date >= dates.from && date <= dates.to) {

                totalGame += Number(d.total_price || 0);
            }
        });

        // =========================
        // CANTEEN
        // =========================

        canteenSnap.forEach(doc => {

            let d = doc.data();

            let date;

            if (d.created_at?.seconds) {
                date = new Date(d.created_at.seconds * 1000);
            } else {
                date = new Date(d.created_at);
            }

            if (date >= dates.from && date <= dates.to) {

                totalCanteen += Number(d.total || 0);
            }
        });

        // =========================
        // EXPENSES
        // =========================

        expenseSnap.forEach(doc => {

            let d = doc.data();

            let date;

            if (d.created_at?.seconds) {
                date = new Date(d.created_at.seconds * 1000);
            } else {
                date = new Date(d.created_at);
            }

            if (date >= dates.from && date <= dates.to) {

                totalExpense += Number(d.amount || 0);
            }
        });

        // =========================
        // EASYPAISA
        // =========================

        easySnap.forEach(doc => {

            let d = doc.data();

            let date;

            if (d.created_at?.seconds) {
                date = new Date(d.created_at.seconds * 1000);
            } else {
                date = new Date(d.created_at);
            }

            if (date >= dates.from && date <= dates.to) {

                totalEasy += Number(d.amount || 0);
            }
        });

        // =========================
        // NET
        // =========================

        let gross =
            totalGame + totalCanteen;

        let net =
            gross - totalExpense - totalEasy;

        // =========================
        // HTML
        // =========================

        let html = `
            <h2>Game Report</h2>

            <div class="report-card">
                <b>Game Income:</b>
                Rs ${totalGame}
            </div>

            <div class="report-card">
                <b>Canteen:</b>
                Rs ${totalCanteen}
            </div>

            <div class="report-card">
                <b>Expenses:</b>
                Rs ${totalExpense}
            </div>

            <div class="report-card">
                <b>EasyPaisa:</b>
                Rs ${totalEasy}
            </div>

            <hr>

            <h2 style="color:#00ffcc;">
                Net Profit:
                Rs ${net}
            </h2>
        `;

        box.innerHTML = html;

    } catch (err) {

        console.error(err);

        box.innerHTML =
            "Error loading report";
    }
}

async function loadCanteenReport() {

    let dates = getDates();
    if (!dates) return;

    let branch = localStorage.getItem("branch");
    let box = document.getElementById("reportOutput");

    box.innerHTML = "Loading...";

    try {

        const q = query(
            collection(window.db, "days"),
            where("branch", "==", branch)
        );

        const snap = await getDocs(q);

        let total = 0;

        snap.forEach(doc => {

            let d = doc.data();
            let date = new Date(d.date + "T00:00:00");

            if (date >= dates.from && date <= dates.to) {
                total += d.combined?.canteenTotal || 0;
            }
        });

        box.innerHTML = "<h3>Canteen Report</h3><h2>Total: Rs " + total + "</h2>";

    } catch (err) {
        console.error(err);
        box.innerHTML = "Error loading canteen report";
    }
}

/// PRINTING FUNCTION report thermal printer

function printReportThermal() {

    let content = document.getElementById("reportOutput").innerHTML;

    let win = window.open("", "", "width=300,height=600");

    win.document.write(`
    <html>
    <head>
        <title>Print</title>
        <style>
            body { font-family: monospace; width: 250px; margin:auto; }
            .center { text-align:center; }
            hr { border:1px dashed #000; margin:5px 0; }
            .report-card { margin-bottom:10px; }
        </style>
    </head>
    <body>

        <div class="center">
            <h3>Rasson Snooker Academy</h3>
            <small>${localStorage.getItem("branch")}</small>
        </div>

        <hr>

        ${content}

        <hr>

        <div class="center">
            ${new Date().toLocaleString()}
        </div>

        <script>
            window.onload = function() {
                window.print();
                window.close();
            }
        </script>

    </body>
    </html>
    `);

    win.document.close();
}

document.getElementById("printReportBtn").onclick = printReportThermal;
