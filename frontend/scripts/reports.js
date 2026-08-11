import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
orderBy

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


let operationalDays = {};

async function loadOperationalDays(){

    operationalDays = {};

    const branch =
        localStorage.getItem("branch");

    const snap = await getDocs(
        query(
            collection(window.db, "days"),
            where("branch", "==", branch)
        )
    );

    snap.forEach(docSnap => {

        const d = docSnap.data();

        const dayId =
            String(d.day_id || "");

        if (!dayId) return;

        // 🔥 OPERATIONAL DATE
        // Shift 1 ke actual start time se date niklegi
        let startMs =
            Number(d.shift1?.startMs || 0);

        let date;

        if (startMs) {

            date = new Date(startMs);

        } else {

            date = new Date(d.date);
        }

        if (isNaN(date.getTime())) return;

        operationalDays[dayId] = {

            raw: d,

            startDate: date,

            month: date.getMonth(),

            year: date.getFullYear(),

            day: date.getDate()
        };

    });

    console.log(
        "📊 REPORT OPERATIONAL DAYS:",
        operationalDays
    );
}


buttons[2].onclick = () => {

    currentReport = "inventory";

    buttons.forEach(btn =>
        btn.classList.remove("active")
    );

    buttons[2].classList.add("active");
};

document.getElementById("viewReportBtn").onclick = async () => {

    if (currentReport === "game") {

        await loadOperationalDays();

        loadReport();

    } else if (currentReport === "canteen") {

        loadCanteenReport();

    } else {

        loadInventoryReport();
    }
};

async function loadReport() {

    let dates = getDates();

    if (!dates) return;

    let box =
        document.getElementById("reportOutput");

    box.innerHTML = "Loading...";

    try {

        // ==========================================
        // 🔥 REPORT DATA AB DAYS SNAPSHOT SE AYEGA
        // ==========================================

        let rows = [];

        Object.values(operationalDays).forEach(day => {

            const d = day.raw;

            const operationalDate =
                day.startDate;

            // ======================================
            // DATE FILTER
            // ======================================

            if (
                operationalDate < dates.from ||
                operationalDate > dates.to
            ) {
                return;
            }

            const s1 =
                d.shift1 || {};

            const s2 =
                d.shift2 || {};

            const combined =
                d.combined || {};

            // ======================================
            // SHIFT 1 BALANCE
            // ======================================

            const shift1Balance =
                Number(s1.gameBalance || 0) +
                Number(s1.canteenBalance || 0);

            // ======================================
            // SHIFT 2 BALANCE
            // ======================================

            const shift2Balance =
                Number(s2.gameBalance || 0) +
                Number(s2.canteenBalance || 0);

            // ======================================
            // DATE
            // ======================================

            const dateLabel =
                operationalDate.toLocaleDateString(
                    "en-PK",
                    {
                        timeZone: "Asia/Karachi",
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit"
                    }
                );

            // ======================================
            // SHIFT 1 TIMING
            // ======================================

            let shift1Timing = "-";

            if (
                s1.startMs &&
                s1.endMs
            ) {

                const start =
                    new Date(s1.startMs)
                    .toLocaleTimeString(
                        "en-PK",
                        {
                            timeZone: "Asia/Karachi",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true
                        }
                    );

                const close =
                    new Date(s1.endMs)
                    .toLocaleTimeString(
                        "en-PK",
                        {
                            timeZone: "Asia/Karachi",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true
                        }
                    );

                shift1Timing =
                    `${start} → ${close}`;
            }

            // ======================================
            // SHIFT 2 TIMING
            // ======================================

            let shift2Timing = "-";

            if (
                s2.startMs &&
                s2.endMs
            ) {

                const start =
                    new Date(s2.startMs)
                    .toLocaleTimeString(
                        "en-PK",
                        {
                            timeZone: "Asia/Karachi",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true
                        }
                    );

                const close =
                    new Date(s2.endMs)
                    .toLocaleTimeString(
                        "en-PK",
                        {
                            timeZone: "Asia/Karachi",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true
                        }
                    );

                shift2Timing =
                    `${start} → ${close}`;
            }

            // ======================================
            // SAVE ROW
            // ======================================

            rows.push({

                date:
                    dateLabel,

                dateMs:
                    operationalDate.getTime(),

                shift1Closing:
                    Number(
                        s1.closingCash || 0
                    ),

                shift1Balance:
                    shift1Balance,

                shift1Discount:
                    Number(
                        s1.discount || 0
                    ),

                shift1Timing:
                    shift1Timing,

                shift2Closing:
                    Number(
                        s2.closingCash || 0
                    ),

                shift2Balance:
                    shift2Balance,

                shift2Discount:
                    Number(
                        s2.discount || 0
                    ),

                shift2Timing:
                    shift2Timing,

                expenses:
                    Number(
                        combined.expenses || 0
                    ),

                easypaisa:
                    Number(
                        combined.easypaisa || 0
                    ),

                combinedClosing:
                    Number(
                        combined.closingCash || 0
                    )
            });

        });

        // ==========================================
        // SORT DATE WISE
        // ==========================================

        rows.sort(
            (a, b) =>
                a.dateMs - b.dateMs
        );

        // ==========================================
        // NO DATA
        // ==========================================

        if (rows.length === 0) {

            box.innerHTML = `
                <div class="report-card">
                    <h3>No report data found</h3>
                    <p>
                        Selected date range mein
                        koi closed operational day nahi mila.
                    </p>
                </div>
            `;

            return;
        }

        // ==========================================
        // BUILD TABLE
        // ==========================================

        let rowsHtml = "";

        rows.forEach(row => {

            rowsHtml += `

                <tr>

                    <td>
                        <b>${row.date}</b>
                    </td>

                    <!-- SHIFT 1 CLOSING -->
                    <td>
                        Rs ${row.shift1Closing}
                    </td>

                    <!-- SHIFT 1 BALANCE -->
                    <td>
                        Rs ${row.shift1Balance}
                    </td>

                    <!-- SHIFT 1 DISCOUNT -->
                    <td>
                        Rs ${row.shift1Discount}
                    </td>

                    <!-- SHIFT 1 TIMING -->
                    <td>
                        ${row.shift1Timing}
                    </td>

                    <!-- SHIFT 2 CLOSING -->
                    <td>
                        Rs ${row.shift2Closing}
                    </td>

                    <!-- SHIFT 2 BALANCE -->
                    <td>
                        Rs ${row.shift2Balance}
                    </td>

                    <!-- SHIFT 2 DISCOUNT -->
                    <td>
                        Rs ${row.shift2Discount}
                    </td>

                    <!-- SHIFT 2 TIMING -->
                    <td>
                        ${row.shift2Timing}
                    </td>

                    <!-- EXPENSE -->
                    <td>
                        Rs ${row.expenses}
                    </td>

                    <!-- EASYPAISA -->
                    <td>
                        Rs ${row.easypaisa}
                    </td>

                    <!-- COMBINED CLOSING -->
                    <td>
                        <b>
                            Rs ${row.combinedClosing}
                        </b>
                    </td>

                </tr>

            `;
        });

        // ==========================================
        // FINAL REPORT
        // ==========================================

        box.innerHTML = `

            <h2>
                Game Report
            </h2>

            <div
                style="
                    width:100%;
                    overflow-x:auto;
                    margin-top:15px;
                "
            >

                <table
                    class="report-table"
                    style="
                        min-width:1500px;
                        white-space:nowrap;
                    "
                >

                    <thead>

                        <tr>

                            <th>
                                Date
                            </th>

                            <th>
                                Shift 1<br>
                                Closing Cash
                            </th>

                            <th>
                                Shift 1<br>
                                Balance
                            </th>

                            <th>
                                Shift 1<br>
                                Discount
                            </th>

                            <th>
                                Shift 1<br>
                                Timing
                            </th>

                            <th>
                                Shift 2<br>
                                Closing Cash
                            </th>

                            <th>
                                Shift 2<br>
                                Balance
                            </th>

                            <th>
                                Shift 2<br>
                                Discount
                            </th>

                            <th>
                                Shift 2<br>
                                Timing
                            </th>

                            <th>
                                Expenses
                            </th>

                            <th>
                                EasyPaisa
                            </th>

                            <th>
                                Combined<br>
                                Closing Cash
                            </th>

                        </tr>

                    </thead>

                    <tbody>

                        ${rowsHtml}

                    </tbody>

                </table>

            </div>

        `;

    } catch (err) {

        console.error(
            "❌ REPORT ERROR:",
            err
        );

        box.innerHTML =
            "Error loading report";
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
async function loadInventoryReport() {

    let dates = getDates();
    if (!dates) return;

    let branch =
        localStorage.getItem("branch");

    let box =
        document.getElementById("reportOutput");

    box.innerHTML = "Loading...";

    try {

        const snap = await getDocs(

            query(
                collection(window.db, "inventory_logs"),
                where("branch", "==", branch)
            )
        );

        let added = 0;
        let sold = 0;
        let deleted = 0;

        let addItems = [];
        let soldItems = [];

        snap.forEach(doc => {

            let d = doc.data();

            let date;

            if (d.created_at?.seconds) {

                date = new Date(
                    d.created_at.seconds * 1000
                );

            } else {

                date = new Date(d.created_at);
            }

            if (
                date < dates.from ||
                date > dates.to
            ) return;

            // =====================
            // ADD
            // =====================

            if (d.type === "add") {

                added += Number(d.qty || 0);

                addItems.push(`
                    <tr>
                        <td>${d.item_name}</td>
                        <td>${d.qty}</td>
                    </tr>
                `);
            }

            // =====================
            // DELETE
            // =====================

            if (d.type === "delete") {

                deleted += Number(d.qty || 0);
            }

            // =====================
            // SALE
            // =====================

            if (d.type === "sale") {

                sold += Number(d.qty || 0);

                soldItems.push(`
                    <tr>
                        <td>${d.item_name}</td>
                        <td>${d.qty}</td>
                    </tr>
                `);
            }
        });

        let remaining =
            added - sold - deleted;

        box.innerHTML = `

            <h2>Inventory Report</h2>

            <div class="report-card">
                <b>Total Added:</b>
                ${added}
            </div>

            <div class="report-card">
                <b>Total Sold:</b>
                  ${sold}
            </div>

            <div class="report-card">
                <b>Total Deleted:</b>
                ${deleted}
            </div>

            <div class="report-card">
                <b>Remaining Stock:</b>
                ${remaining}
            </div>

            <hr>

            <h3>Added Items</h3>

            <table class="report-table">
                <tr>
                    <th>Item</th>
                    <th>Qty</th>
                </tr>

                ${addItems.join("")}
            </table>

            <hr>

            <h3>Sold Items</h3>

            <table class="report-table">
                <tr>
                    <th>Item</th>
                    <th>Qty</th>
                </tr>

                ${soldItems.join("")}
            </table>
        `;

    } catch (err) {

        console.error(err);

        box.innerHTML =
            "Error loading inventory report";
    }
}

document.getElementById("printReportBtn").onclick = printReportThermal;
