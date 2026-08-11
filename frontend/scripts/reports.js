import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
orderBy

} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";



function getDates() {

    const fromInput =
        document.getElementById("fromDate").value;

    const toInput =
        document.getElementById("toDate").value;


    if (!fromInput || !toInput) {

        alert("Select date range");

        return null;
    }


    // ==========================================
    // INPUT: YYYY-MM-DD
    // ==========================================

    const [fy, fm, fd] =
        fromInput.split("-").map(Number);

    const [ty, tm, td] =
        toInput.split("-").map(Number);


    // ==========================================
    // LOCAL CALENDAR DATE
    // ==========================================

    const from =
        new Date(
            fy,
            fm - 1,
            fd,
            0,
            0,
            0,
            0
        );


    const to =
        new Date(
            ty,
            tm - 1,
            td,
            23,
            59,
            59,
            999
        );


    return {

        from,
        to,

        // 🔥 DATE KEYS
        // Timezone ka issue nahi hoga

        fromKey:
            `${fy}-${String(fm).padStart(2, "0")}-${String(fd).padStart(2, "0")}`,

        toKey:
            `${ty}-${String(tm).padStart(2, "0")}-${String(td).padStart(2, "0")}`

    };
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



buttons[2].onclick = () => {

    currentReport = "inventory";

    buttons.forEach(btn =>
        btn.classList.remove("active")
    );

    buttons[2].classList.add("active");
};

document.getElementById("viewReportBtn").onclick = async () => {

    try {

        if (currentReport === "game") {

            // ======================================
            // DAYS LOAD KARO
            // ======================================

            const days =
                await loadOperationalDays();


            // ======================================
            // REPORT KO WAHI DATA PASS KARO
            // ======================================

            await loadReport(days);


        } else if (currentReport === "canteen") {

            await loadCanteenReport();


        } else {

            await loadInventoryReport();

        }

    } catch (err) {

        console.error(
            "❌ REPORT BUTTON ERROR:",
            err
        );

    }

};

async function loadReport(days) {

    if (!days) {

        console.error(
            "❌ REPORT: days data missing"
        );

        return;
    }


    let dates = getDates();

    if (!dates) return;

    let box =
        document.getElementById("reportOutput");

    box.innerHTML = "Loading...";

    try {

        // ==========================================
        // MONEY FORMAT
        // ==========================================

        const money = (value) => {

            return Number(value || 0)
                .toLocaleString("en-PK");

        };


        // ==========================================
        // DATE FORMAT
        // ==========================================

        const formatDate = (date) => {

            return date.toLocaleDateString(
                "en-PK",
                {
                    timeZone: "Asia/Karachi",
                    day: "2-digit",
                    month: "long",
                    year: "numeric"
                }
            );

        };


        // ==========================================
        // TIME FORMAT
        // ==========================================

        const formatTime = (ms) => {

            if (!ms) return "-";

            return new Date(ms).toLocaleTimeString(
                "en-PK",
                {
                    timeZone: "Asia/Karachi",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true
                }
            );

        };


        // ==========================================
        // MONTH TITLE
        // ==========================================

        const formatMonthRange = (from, to) => {

            const fromMonth =
                from.toLocaleDateString(
                    "en-PK",
                    {
                        month: "long",
                        year: "numeric",
                        timeZone: "Asia/Karachi"
                    }
                );

            const toMonth =
                to.toLocaleDateString(
                    "en-PK",
                    {
                        month: "long",
                        year: "numeric",
                        timeZone: "Asia/Karachi"
                    }
                );

            if (fromMonth === toMonth) {

                return fromMonth;

            }

            return `${fromMonth} → ${toMonth}`;

        };


        // ==========================================
        // REPORT ROWS
        // ==========================================

        let rows = [];


        Object.values(days || {}).forEach(day => {

            const d =
                day.raw || {};

            const s1 =
                d.shift1 || {};

            const s2 =
                d.shift2 || {};

            const combined =
                d.combined || {};


            // ======================================
            // OPERATIONAL DATE
            // ======================================

            let operationalDate;

            if (s1.startMs) {

                operationalDate =
                    new Date(
                        Number(s1.startMs)
                    );

            } else if (d.date) {

                operationalDate =
                    new Date(d.date);

            } else {

                return;

            }


            if (
                isNaN(
                    operationalDate.getTime()
                )
            ) {

                return;

            }


            // ======================================
            // CALENDAR DATE FILTER
            // TIME IGNORE KARO
            // ======================================
            
            const operationalKey =
                new Intl.DateTimeFormat(
                    "en-CA",
                    {
                        timeZone: "Asia/Karachi",
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit"
                    }
                ).format(operationalDate);
            
            
            if (
                operationalKey < dates.fromKey ||
                operationalKey > dates.toKey
            ) {
            
                return;
            
            }


            // ======================================
            // SHIFT 1
            // GAME VALUES ONLY
            // CANTEEN SEPARATE REPORT MEIN HAI
            // ======================================

            const shift1Collection =
                Number(
                    s1.gameCollection || 0
                );

            const shift1Balance =
                Number(
                    s1.gameBalance || 0
                );

            const shift1Discount =
                Number(
                    s1.discount || 0
                );

            const shift1Expense =
                Number(
                    s1.expenses || 0
                );


            // ======================================
            // SHIFT 2
            // GAME VALUES ONLY
            // ======================================

            const shift2Collection =
                Number(
                    s2.gameCollection || 0
                );

            const shift2Balance =
                Number(
                    s2.gameBalance || 0
                );

            const shift2Discount =
                Number(
                    s2.discount || 0
                );

            const shift2Expense =
                Number(
                    s2.expenses || 0
                );


            // ======================================
            // TOTALS OF BOTH SHIFTS
            // ======================================

            const totalCollection =
                shift1Collection +
                shift2Collection;


            const totalBalance =
                shift1Balance +
                shift2Balance;


            const totalDiscount =
                shift1Discount +
                shift2Discount;


            const totalExpense =
                shift1Expense +
                shift2Expense;


            // ======================================
            // EASYPAISA
            // COMBINED VALUE
            // ======================================

            const easypaisa =
                Number(
                    combined.easypaisa || 0
                );


            // ======================================
            // NET CASH
            //
            // Total Collection
            // - Total Balance
            // - Total Discount
            // - Total Expense
            // - EasyPaisa
            // ======================================
            
            const finalClosingCash =
                totalCollection -
                totalBalance -
                totalDiscount -
                totalExpense -
                easypaisa;


            // ======================================
            // COMBINED TIMING
            //
            // SHIFT 1 START
            //       ↓
            // SHIFT 2 CLOSE
            // ======================================

            let combinedTiming = "-";

            if (
                s1.startMs &&
                s2.endMs
            ) {

                combinedTiming =
                    `${formatTime(s1.startMs)} → ${formatTime(s2.endMs)}`;

            }


            // ======================================
            // SAVE ROW
            // ======================================

            rows.push({

                date:
                    formatDate(
                        operationalDate
                    ),

                dateMs:
                    operationalDate.getTime(),


                // SHIFT 1
                shift1Collection,
                shift1Balance,
                shift1Discount,
                shift1Expense,


                // SHIFT 2
                shift2Collection,
                shift2Balance,
                shift2Discount,
                shift2Expense,


                // BOTH SHIFTS TOTAL
                totalCollection,
                totalBalance,
                totalDiscount,
                totalExpense,


                // OTHER
                easypaisa,
                finalClosingCash,


                // TIMING
                combinedTiming,

                startMs:
                    Number(
                        s1.startMs || 0
                    ),

                endMs:
                    Number(
                        s2.endMs || 0
                    )

            });

        });


        // ==========================================
        // SORT DATE
        // ==========================================

              console.log(
            "📊 REPORT FILTER RESULT:",
            {
                from:
                    dates.fromKey,
        
                to:
                    dates.toKey,
        
                availableDays:
                    Object.keys(days || {}).length,
        
                matchedRows:
                    rows.length
            }
        );

        rows.sort(
            (a, b) =>
                a.dateMs - b.dateMs
        );


        // ==========================================
        // NO DATA
        // ==========================================

        if (rows.length === 0) {

            box.innerHTML = `

                <div
                    style="
                        text-align:center;
                        padding:35px;
                        color:#00ffcc;
                    "
                >

                    <h3>
                        No Report Data Found
                    </h3>

                    <p>
                        Selected date range mein
                        koi closed operational day nahi mila.
                    </p>

                </div>

            `;

            return;

        }


        // ==========================================
        // GRAND TOTALS
        // SELECTED DATES KA TOTAL
        // ==========================================

        let grandShift1Collection = 0;
        let grandShift2Collection = 0;
        let grandTotalCollection = 0;

        let grandShift1Balance = 0;
        let grandShift2Balance = 0;
        let grandTotalBalance = 0;

        let grandShift1Discount = 0;
        let grandShift2Discount = 0;
        let grandTotalDiscount = 0;

        let grandShift1Expense = 0;
        let grandShift2Expense = 0;
        let grandTotalExpense = 0;

        let grandEasyPaisa = 0;
        let grandClosingCash = 0;


        rows.forEach(row => {

            grandShift1Collection +=
                row.shift1Collection;

            grandShift2Collection +=
                row.shift2Collection;

            grandTotalCollection +=
                row.totalCollection;


            grandShift1Balance +=
                row.shift1Balance;

            grandShift2Balance +=
                row.shift2Balance;

            grandTotalBalance +=
                row.totalBalance;


            grandShift1Discount +=
                row.shift1Discount;

            grandShift2Discount +=
                row.shift2Discount;

            grandTotalDiscount +=
                row.totalDiscount;


            grandShift1Expense +=
                row.shift1Expense;

            grandShift2Expense +=
                row.shift2Expense;

            grandTotalExpense +=
                row.totalExpense;


            grandEasyPaisa +=
                row.easypaisa;


            grandClosingCash +=
                row.finalClosingCash;

        });


        // ==========================================
        // TOTAL SELECTED RANGE TIMING
        // ==========================================

        let totalTiming = "-";

        const firstRow =
            rows[0];

        const lastRow =
            rows[rows.length - 1];


        if (
            firstRow.startMs &&
            lastRow.endMs
        ) {

            totalTiming =
                `${formatTime(firstRow.startMs)} → ${formatTime(lastRow.endMs)}`;

        }


        // ==========================================
        // MONTH TITLE
        // ==========================================

        const monthTitle =
            formatMonthRange(
                dates.from,
                dates.to
            );


        // ==========================================
        // BUILD DAILY ROWS
        // ==========================================

        let rowsHtml = "";


        rows.forEach(row => {

            rowsHtml += `

                <tr>

                    <!-- DATE -->

                    <td class="report-center date-cell">

                        <strong>
                            ${row.date}
                        </strong>

                    </td>


                    <!-- SHIFT 1 COLLECTION -->

                    <td class="report-center">

                        Rs ${money(
                            row.shift1Collection
                        )}

                    </td>


                    <!-- SHIFT 2 COLLECTION -->

                    <td class="report-center">

                        Rs ${money(
                            row.shift2Collection
                        )}

                    </td>


                    <!-- TOTAL COLLECTION -->

                    <td
                        class="
                            report-center
                            total-column
                        "
                    >

                        <strong>
                            Rs ${money(
                                row.totalCollection
                            )}
                        </strong>

                    </td>


                    <!-- SHIFT 1 BALANCE -->

                    <td class="report-center">

                        Rs ${money(
                            row.shift1Balance
                        )}

                    </td>


                    <!-- SHIFT 2 BALANCE -->

                    <td class="report-center">

                        Rs ${money(
                            row.shift2Balance
                        )}

                    </td>


                    <!-- TOTAL BALANCE -->

                    <td
                        class="
                            report-center
                            total-column
                        "
                    >

                        <strong>
                            Rs ${money(
                                row.totalBalance
                            )}
                        </strong>

                    </td>


                    <!-- SHIFT 1 DISCOUNT -->

                    <td class="report-center">

                        Rs ${money(
                            row.shift1Discount
                        )}

                    </td>


                    <!-- SHIFT 2 DISCOUNT -->

                    <td class="report-center">

                        Rs ${money(
                            row.shift2Discount
                        )}

                    </td>


                    <!-- TOTAL DISCOUNT -->

                    <td
                        class="
                            report-center
                            total-column
                        "
                    >

                        <strong>
                            Rs ${money(
                                row.totalDiscount
                            )}
                        </strong>

                    </td>


                    <!-- SHIFT 1 EXPENSE -->

                    <td class="report-center">

                        Rs ${money(
                            row.shift1Expense
                        )}

                    </td>


                    <!-- SHIFT 2 EXPENSE -->

                    <td class="report-center">

                        Rs ${money(
                            row.shift2Expense
                        )}

                    </td>


                    <!-- TOTAL EXPENSE -->

                    <td
                        class="
                            report-center
                            total-column
                        "
                    >

                        <strong>
                            Rs ${money(
                                row.totalExpense
                            )}
                        </strong>

                    </td>


                    <!-- EASYPAISA -->

                    <td
                        class="
                            report-center
                            easypaisa-column
                        "
                    >
                    
                        <strong>
                            Rs ${money(
                                row.easypaisa
                            )}
                        </strong>
                    
                    </td>


                    <!-- FINAL CLOSING CASH -->

                    <td
                        class="
                            report-center
                            closing-cash-column
                        "
                    >

                        <strong>

                            Rs ${money(
                                row.finalClosingCash
                            )}

                        </strong>

                    </td>


                    <!-- COMBINED TIMING -->

                    <td
                        class="
                            report-center
                            combined-timing
                        "
                    >

                        ${row.combinedTiming}

                    </td>

                </tr>

            `;

        });


        // ==========================================
        // FINAL REPORT HTML
        // ==========================================

        box.innerHTML = `

            <style>

                /* =====================================
                   MAIN WRAPPER
                ===================================== */

                .game-report-wrapper {

                    width:100%;

                    overflow-x:auto;

                    margin-top:15px;

                    border-radius:14px;

                    background:
                        rgba(0,0,0,0.45);

                    border:
                        1px solid
                        rgba(0,255,204,0.25);

                }


                /* =====================================
                   MAIN TABLE
                ===================================== */

                .game-report-table {

                    width:100%;

                    min-width:2100px;

                    border-collapse:separate;

                    border-spacing:0;

                    table-layout:fixed;

                    color:#fff;

                }


                .game-report-table th {

                    padding:14px 8px;

                    text-align:center;

                    vertical-align:middle;

                    color:#00ffcc;

                    font-size:13px;

                    font-weight:800;

                    line-height:1.25;

                    background:
                        rgba(0,0,0,0.82);

                    border-right:
                        1px solid
                        rgba(0,255,204,0.22);

                    border-bottom:
                        1px solid
                        rgba(0,255,204,0.40);

                }


                .game-report-table td {

                    padding:13px 7px;

                    text-align:center;

                    vertical-align:middle;

                    font-size:13px;

                    font-weight:600;

                    background:
                        rgba(0,0,0,0.32);

                    border-right:
                        1px solid
                        rgba(0,255,204,0.15);

                    border-bottom:
                        1px solid
                        rgba(0,255,204,0.15);

                }


                .game-report-table tr:hover td {

                    background:
                        rgba(0,255,204,0.08);

                }


                /* =====================================
                   CENTER
                ===================================== */

                .report-center {

                    text-align:center !important;

                    vertical-align:middle !important;

                }


                .date-cell {

                    color:#fff;

                    font-weight:800;

                }


                /* =====================================
                   TOTAL COLUMNS
                ===================================== */

                .total-column {

                    color:#00ffcc;

                    font-weight:900 !important;

                    background:
                        rgba(0,255,204,0.06) !important;

                }

                /* =====================================
                   EASYPAISA HIGHLIGHT
                 ===================================== */
                
                .easypaisa-column {
                
                    color:#00ffcc !important;
                
                    font-weight:900 !important;
                
                    background:
                        rgba(0,255,204,0.06) !important;
                
                }


                /* =====================================
                   FINAL CASH
                ===================================== */

                .closing-cash-column {

                    color:#fff;

                    font-size:15px !important;

                    font-weight:900 !important;

                    background:
                        rgba(255,215,0,0.08) !important;

                }


                /* =====================================
                   COMBINED TIMING
                ===================================== */

                .combined-timing {

                    color:#00ffcc;

                    font-weight:800 !important;

                    line-height:1.4;

                }


                /* =====================================
                   TOTAL SUMMARY TITLE
                ===================================== */

                .report-total-title {

                    margin-top:25px;

                    padding:15px 18px;

                    border:
                        1px solid
                        rgba(0,255,204,0.35);

                    border-bottom:none;

                    border-radius:
                        12px 12px 0 0;

                    background:
                        rgba(0,0,0,0.72);

                    color:#00ffcc;

                    font-size:18px;

                    font-weight:900;

                    text-align:left;

                }


                /* =====================================
                   TOTAL SUMMARY TABLE
                ===================================== */

                .report-total-wrapper {

                    width:100%;

                    overflow-x:auto;

                    border-radius:
                        0 0 12px 12px;

                }


                .report-total-table {

                    width:100%;

                    min-width:2100px;

                    border-collapse:collapse;

                    table-layout:fixed;

                    color:#fff;

                }


                .report-total-table th {

                    padding:12px 7px;

                    text-align:center;

                    vertical-align:middle;

                    color:#00ffcc;

                    font-size:12px;

                    line-height:1.25;

                    background:
                        rgba(0,0,0,0.80);

                    border:
                        1px solid
                        rgba(0,255,204,0.25);

                }


                .report-total-table td {

                    padding:16px 7px;

                    text-align:center;

                    vertical-align:middle;

                    font-size:14px;

                    font-weight:900;

                    background:
                        rgba(0,255,204,0.05);

                    border:
                        1px solid
                        rgba(0,255,204,0.25);

                }


                .summary-total {

                    color:#00ffcc;

                    font-weight:900;

                }


                .summary-final {

                    color:#fff;

                    font-size:17px !important;

                    background:
                        rgba(255,215,0,0.08) !important;

                }


                /* =====================================
                   TOTAL TIMING
                ===================================== */

                .total-timing-box {

                    margin-top:12px;

                    padding:14px;

                    text-align:center;

                    border:
                        1px solid
                        rgba(0,255,204,0.30);

                    border-radius:10px;

                    background:
                        rgba(0,0,0,0.55);

                    color:#00ffcc;

                    font-weight:800;

                }


                /* =====================================
                   NOTE
                ===================================== */

                .report-note {

                    margin-top:12px;

                    padding:10px;

                    text-align:center;

                    color:#999;

                    font-size:12px;

                }

            </style>


            <!-- =====================================
                 TITLE
            ====================================== -->

            <h2
                style="
                    color:#00ffcc;
                    text-align:left;
                    margin-bottom:12px;
                "
            >
                🎟️ Game Report
            </h2>


            <!-- =====================================
                 DAILY REPORT
            ====================================== -->

            <div
                class="game-report-wrapper"
            >

                <table
                    class="game-report-table"
                >

                    <thead>

                        <tr>

                            <th>
                                Date
                            </th>


                            <th>
                                Shift 1<br>
                                Collection
                            </th>


                            <th>
                                Shift 2<br>
                                Collection
                            </th>


                            <th>
                                Total<br>
                                Collection
                            </th>


                            <th>
                                Shift 1<br>
                                Balance
                            </th>


                            <th>
                                Shift 2<br>
                                Balance
                            </th>


                            <th>
                                Total<br>
                                Balance
                            </th>


                            <th>
                                Shift 1<br>
                                Discount
                            </th>


                            <th>
                                Shift 2<br>
                                Discount
                            </th>


                            <th>
                                Total<br>
                                Discount
                            </th>


                            <th>
                                Shift 1<br>
                                Expense
                            </th>


                            <th>
                                Shift 2<br>
                                Expense
                            </th>


                            <th>
                                Total<br>
                                Expense
                            </th>


                            <th>
                                EasyPaisa
                            </th>


                            <th>
                                Final<br>
                                Closing Cash
                            </th>


                            <th>
                                Combined<br>
                                Timing
                            </th>

                        </tr>

                    </thead>


                    <tbody>

                        ${rowsHtml}

                    </tbody>

                </table>

            </div>


            <!-- =====================================
                 TOTAL SUMMARY
            ====================================== -->

            <div
                class="report-total-title"
            >

                📊 Total Summary
                (${monthTitle})

            </div>


            <div
                class="report-total-wrapper"
            >

                <table
                    class="report-total-table"
                >

                    <thead>

                        <tr>

                            <th>
                                Shift 1<br>
                                Collection
                            </th>

                            <th>
                                Shift 2<br>
                                Collection
                            </th>

                            <th>
                                Total<br>
                                Collection
                            </th>


                            <th>
                                Shift 1<br>
                                Balance
                            </th>

                            <th>
                                Shift 2<br>
                                Balance
                            </th>

                            <th>
                                Total<br>
                                Balance
                            </th>


                            <th>
                                Shift 1<br>
                                Discount
                            </th>

                            <th>
                                Shift 2<br>
                                Discount
                            </th>

                            <th>
                                Total<br>
                                Discount
                            </th>


                            <th>
                                Shift 1<br>
                                Expense
                            </th>

                            <th>
                                Shift 2<br>
                                Expense
                            </th>

                            <th>
                                Total<br>
                                Expense
                            </th>


                            <th>
                                EasyPaisa
                            </th>

                            <th>
                                Final<br>
                                Closing Cash
                            </th>

                        </tr>

                    </thead>


                    <tbody>

                        <tr>

                            <!-- COLLECTION -->

                            <td>
                                Rs ${money(
                                    grandShift1Collection
                                )}
                            </td>

                            <td>
                                Rs ${money(
                                    grandShift2Collection
                                )}
                            </td>

                            <td
                                class="
                                    summary-total
                                "
                            >
                                Rs ${money(
                                    grandTotalCollection
                                )}
                            </td>


                            <!-- BALANCE -->

                            <td>
                                Rs ${money(
                                    grandShift1Balance
                                )}
                            </td>

                            <td>
                                Rs ${money(
                                    grandShift2Balance
                                )}
                            </td>

                            <td
                                class="
                                    summary-total
                                "
                            >
                                Rs ${money(
                                    grandTotalBalance
                                )}
                            </td>


                            <!-- DISCOUNT -->

                            <td>
                                Rs ${money(
                                    grandShift1Discount
                                )}
                            </td>

                            <td>
                                Rs ${money(
                                    grandShift2Discount
                                )}
                            </td>

                            <td
                                class="
                                    summary-total
                                "
                            >
                                Rs ${money(
                                    grandTotalDiscount
                                )}
                            </td>


                            <!-- EXPENSE -->

                            <td>
                                Rs ${money(
                                    grandShift1Expense
                                )}
                            </td>

                            <td>
                                Rs ${money(
                                    grandShift2Expense
                                )}
                            </td>

                            <td
                                class="
                                    summary-total
                                "
                            >
                                Rs ${money(
                                    grandTotalExpense
                                )}
                            </td>


                            <!-- EASYPAISA -->

                            <td
                                class="
                                    summary-total
                                    easypaisa-column
                                "
                            >
                            
                                Rs ${money(
                                    grandEasyPaisa
                                )}
                            
                            </td>


                            <!-- FINAL CASH -->

                            <td
                                class="
                                    summary-final
                                "
                            >
                                Rs ${money(
                                    grandClosingCash
                                )}
                            </td>

                        </tr>

                    </tbody>

                </table>

            </div>


            <!-- =====================================
                 TOTAL TIMING
            ====================================== -->

            <div
                class="total-timing-box"
            >

                🕐 Selected Period Operational Timing

                <br>

                <span
                    style="
                        font-size:17px;
                        color:#fff;
                    "
                >
                    ${totalTiming}
                </span>

            </div>


            <div
                class="report-note"
            >

                ℹ️ Collection, Balance, Discount
                and Expenses are shown separately
                for Shift 1 and Shift 2.

            </div>

        `;


    } catch (err) {

        console.error(
            "❌ REPORT ERROR:",
            err
        );

        box.innerHTML = `

            <div
                style="
                    text-align:center;
                    padding:25px;
                    color:#ff6b6b;
                "
            >

                Error loading report ❌

            </div>

        `;

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
