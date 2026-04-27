import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  query,
  where,
  onSnapshot,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { increment } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { orderBy, limit } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// 🔥 DAY ID PERSIST FIX
if (!localStorage.getItem("currentDayId")) {
    localStorage.setItem("currentDayId", Date.now());
}

window.currentDayId = Number(localStorage.getItem("currentDayId"));

let firebaseExpenses = [];
// 🔥 AUTO REFRESH FUNCTION
async function autoRefreshUI() {
    await loadShiftsFromFirebase();
    renderTables();
}

const BRANCH = localStorage.getItem("branch");
const ROLE = localStorage.getItem("role"); // admin / staff
let inventoryItems = [];

// 🔥 HELPER FUNCTIONS (ADD AT TOP)
function getItemName(item) {
    return item.item_name || item.name || "Unknown Item";
}

function getItemStock(item) {
    return item.stock || 0;
}






/******************************************************
 * GLOBAL DATA + LOCALSTORAGE SETUP
 ******************************************************/
let tables = [];

let shift1 = null;   // ✅ ADD
let shift2 = null;   // ✅ ADD
async function loadShiftsFromFirebase() {

   

const q = query(
    collection(window.db, "shifts"),
    where("branch", "==", BRANCH),
    where("day_id", "==", window.currentDayId)
);
const snap = await getDocs(q);
const docs = snap.docs;
    
shift1 = null;
shift2 = null;

docs.forEach(doc => {
    const d = doc.data();

    if (d.shift_number === 1 && !shift1) {
        shift1 = {
            openTime: d.open_time,
            closeTime: d.close_time,
            startMs: Number(d.start_ms) || 0,
            endMs: Number(d.end_ms) || 0,      
            gameTotal: d.game_total,
            canteenTotal: d.canteen_total,
            gameCollection: d.game_collection,
            canteenCollection: d.canteen_collection,
            expenses: d.expenses,
            closingCash: d.closing_cash,
            gameBalance: (d.game_total || 0) - (d.game_collection || 0),
            canteenBalance: (d.canteen_total || 0) - (d.canteen_collection || 0)
        };
    }

    if (d.shift_number === 2 && !shift2) {
        shift2 = {
            openTime: d.open_time,
            closeTime: d.close_time,
            startMs: Number(d.start_ms) || 0,
            endMs: Number(d.end_ms) || 0,      
            gameTotal: d.game_total,
            canteenTotal: d.canteen_total,
            gameCollection: d.game_collection,
            canteenCollection: d.canteen_collection,
            expenses: d.expenses,
            closingCash: d.closing_cash,
            gameBalance: (d.game_total || 0) - (d.game_collection || 0),
            canteenBalance: (d.canteen_total || 0) - (d.canteen_collection || 0)
        };
    }
});

    // 🔥 BUTTON STATE FIX
    const btn = document.getElementById("shiftCloseBtn");

    if (!shift1) {
        btn.innerText = "Shift 1 Close";
    }
    else if (!shift2) {
        btn.innerText = "Shift 2 Close";
    }
    else {
        btn.innerText = "Day Close";
    }

    console.log("🔥 SHIFTS LOADED:", shift1, shift2);
}

let editTargetId = null;
let deleteTargetId = null;

/******************************************************
 * PAGE LOAD INITIALIZER
 ******************************************************/

document.addEventListener("DOMContentLoaded", async () => {
  await loadShiftsFromFirebase();
    // 🔥 ENSURE DAY ID ALWAYS EXISTS
    listenExpensesRealtime();
    listenInventoryRealtime();
    listenTablesRealtime();

    bindAddTablePopup();
    bindShiftButtons();
    bindHistoryButtons();

    setTimeout(() => {
        restoreTimers();
    }, 500);

    // ❌ OLD METHOD REMOVE
    // await restoreRunningTables();

    // ✅ NEW REALTIME METHOD ADD
    listenRunningSessionsRealtime();

});

  function listenInventoryRealtime() {

    const q = query(
        collection(window.db, "inventory"),
        where("branch", "==", BRANCH)
    );

    onSnapshot(q, (snapshot) => {

        inventoryItems = [];

        snapshot.forEach(docSnap => {
            inventoryItems.push({
                id: docSnap.id,
                ...docSnap.data()
            });
        });

        console.log("🔥 REALTIME INVENTORY:", inventoryItems);
    });
}

function listenTablesRealtime() {

    const q = query(
        collection(window.db, "tables"),
        where("branch", "==", BRANCH)
    );

    onSnapshot(q, (snapshot) => {
        

        let newTables = [];

        snapshot.forEach(docSnap => {

    const t = docSnap.data();

    console.log("🔥 FIREBASE DATA:", t); // ✅ ADD KIYA

    newTables.push({
        id: docSnap.id,
        name: t.table_id || "Table 1",

                frameRate: Number(t.frame_rate || 8),
                centuryRate: Number(t.century_rate || 10),

            playType: t.play_type || "frame",
                isRunning: false,
                checkinTime: null,
                checkoutTime: null,

                playSeconds: 0,
                liveAmount: 0,

                canteenTotal: 0,
                canteenItems: {},

                history: []
            });
        });

        // 🔥 overwrite tables

    tables = newTables.map(nt => {

    let old = tables.find(o => String(o.id) === String(nt.id));

    return {
        ...nt,

        isRunning: old?.isRunning || false,
        afterCheckout: old?.afterCheckout || false,

        checkinTime: old?.checkinTime || null,
        checkoutTime: old?.checkoutTime || null,

        playSeconds: old?.playSeconds || 0,
        liveAmount: old?.liveAmount || 0,

        finalAmount: old?.finalAmount || 0,
        finalSeconds: old?.finalSeconds || 0,

        canteenTotal: old?.canteenTotal || 0,
        canteenItems: old?.canteenItems || {},

        history: []
    };
});

setTimeout(async () => {

    await rebuildHistoryFromSessions(); // 🔥 ADD THIS

    renderTables();

}, 100);
});
}



// inventory load function
async function loadInventory() {

    const q = query(
        collection(window.db, "inventory"),
        where("branch", "==", BRANCH)
    );

    const snap = await getDocs(q);

    inventoryItems = [];

    snap.forEach(docSnap => {
        inventoryItems.push({
            id: docSnap.id,
            ...docSnap.data()
        });
    });

    console.log("🔥 INVENTORY LOADED:", inventoryItems);
}


function listenExpensesRealtime() {

    const q = query(
        collection(window.db, "expenses"),
        where("branch", "==", BRANCH),
        where("day_id", "==", window.currentDayId)
    );

    onSnapshot(q, (snapshot) => {

        firebaseExpenses = [];

        snapshot.forEach(doc => {
            firebaseExpenses.push(doc.data());
        });

        console.log("🔥 FIREBASE EXPENSES:", firebaseExpenses);
    });
}
/******************************************************
 * ADD TABLE POPUP BINDING (FIX)
 ******************************************************/
function bindAddTablePopup() {

    const addBtn = document.getElementById("addTableBtn");

if (ROLE !== "admin") {
    addBtn.disabled = true;
    addBtn.style.opacity = "0.4";
    addBtn.style.cursor = "not-allowed";
} else {
    addBtn.onclick = () => {
        document.getElementById("addTablePopup").classList.remove("hidden");
    };
}

    document.getElementById("cancelAddBtn").onclick = () => {
        document.getElementById("addTablePopup").classList.add("hidden");
    };

    document.getElementById("createTableBtn").onclick = async () => {

        let name = document.getElementById("tableNameInput").value.trim();
        let frame = document.getElementById("frameRateInput").value;
        let cen = document.getElementById("centuryRateInput").value;

        if (!name) return alert("Enter table name");

        // 🔥 FIREBASE SAVE
        await addDoc(collection(window.db, "tables"), {
            table_id: name,
            frame_rate: Number(frame) || 8,
            century_rate: Number(cen) || 10,
            branch: BRANCH
        });

        document.getElementById("addTablePopup").classList.add("hidden");
    };
}

/******************************************************
 * CREATE DEFAULT TABLES (FIRST TIME ONLY)
 ******************************************************/
function loadDefaultTables() {

    let names = ["Table 1", "Table 2", "Table 3", "Table 4", "Table 5", "Table 6"];

    names.forEach(name => {
tables.push({
    id: Date.now() + Math.random(),
    name,
    frameRate: 7,
    centuryRate: 10,
    selectedRate: 7,

    isRunning: false,
    checkinTime: null,
    checkoutTime: null,
    playSeconds: 0,
    liveAmount: 0,
    canteenTotal: 0,

    canteenItems: {}, // ✅ FIX

    history: []
});
    });

     
}

/******************************************************
 * RENDER ALL TABLE CARDS
 ******************************************************/
function renderTables() {
    const box = document.getElementById("tablesContainer");
    box.innerHTML = "";

    // 🔥 SORT TABLES + ROOMS PROPER ORDER
const sortedTables = [...tables].sort((a, b) => {

    const getType = (name) => {
        if (name.toLowerCase().startsWith("table")) return 1;
if (name.toLowerCase().startsWith("room")) return 2;
        return 3;
    };

    const typeA = getType(a.name);
    const typeB = getType(b.name);

    // 🔹 pehle Table → phir Room
    if (typeA !== typeB) return typeA - typeB;

    // 🔹 number sort (Table 1, Table 2...)
  const numA = parseInt(((a.name || "").match(/\d+/) || [0])[0]);
  const numB = parseInt(((b.name || "").match(/\d+/) || [0])[0]);

    return numA - numB;
});


// 🔥 AB LOOP CHANGE KARO
sortedTables.forEach(t => {

        const div = document.createElement("div");
        div.classList.add("table-box");

        div.innerHTML = `
            <div class="table-title">${t.name}</div>

<div class="rate-selector">
<select onchange="handleRateChange('${t.id}', this)">

<option value="frame-${t.frameRate}" 
${t.playType === "frame" ? "selected" : ""}>
Frame (${t.frameRate})
</option>

<option value="century-${t.centuryRate}" 
${t.playType === "century" ? "selected" : ""}>
Century (${t.centuryRate})
</option>

</select>
            </div>

            <div class="timer-box">
                <div class="timer-line"><span>Check-in:</span><span id="checkin-${t.id}">--:--:--</span></div>
                <div class="timer-line"><span>Checkout:</span><span id="checkout-${t.id}">--:--:--</span></div>
                <div class="timer-line"><span>Play Time:</span><span id="playtime-${t.id}">00:00:00</span></div>
                <div class="timer-line"><span>Amount:</span><span id="amount-${t.id}">0</span></div>
                <div class="timer-line" style="font-size:12px; color:#0f0;" id="canteen-items-${t.id}"></div>
            </div>

            <div class="table-actions">

                <div class="big-btn-row">
                    <button id="checkinBtn-${t.id}" class="neon-btn big-btn" onclick="checkIn('${t.id}')">CHECK IN</button>
                    <button id="checkoutBtn-${t.id}" class="neon-btn big-btn red hidden" onclick="checkOut('${t.id}')">CHECK OUT</button>
                    <div id="afterRow-${t.id}" class="dual-btn-row hidden">
                        <button class="neon-btn big-btn" onclick="showBill('${t.id}')">VIEW BILL</button>
                        <button class="neon-btn big-btn" onclick="checkIn('${t.id}')">CHECK IN</button>
                    </div>
                </div>

                <div class="second-row">
                    <button id="historyBtn-${t.id}" class="neon-btn small-btn" onclick="openHistory('${t.id}')">HISTORY</button>
                    <button id="editBtn-${t.id}" class="neon-btn small-btn" onclick="editTable('${t.id}')">EDIT</button>
                    <button id="deleteBtn-${t.id}" class="neon-btn small-btn red" onclick="deleteTableOpen('${t.id}')">DELETE</button>

                   <button id="canteenBtn-${t.id}" class="neon-btn small-btn hidden" onclick="openCanteen('${t.id}')">CANTEEN</button>
                    <button id="shiftBtn-${t.id}" class="neon-btn small-btn hidden" onclick="openTableShift('${t.id}')">SHIFT TABLE</button>
                </div>

            </div>
        `;

        box.appendChild(div);

        // 🔥 ROLE CONTROL (IMPORTANT)
if (ROLE !== "admin") {

    let editBtn = document.getElementById(`editBtn-${t.id}`);
    let delBtn = document.getElementById(`deleteBtn-${t.id}`);

    if (editBtn) {
        editBtn.disabled = true;
        editBtn.style.opacity = "0.4";
        editBtn.style.cursor = "not-allowed";
    }

    if (delBtn) {
        delBtn.disabled = true;
        delBtn.style.opacity = "0.4";
        delBtn.style.cursor = "not-allowed";
    }
}
        // 🔥 AFTER RENDER → APPLY STATE
setTimeout(() => {

    tables.forEach(t => {

        updateDisplay(t.id);

        if (t.afterCheckout) {
            updateButtons(t.id, "afterCheckout");
        }
        else if (t.isRunning) {
            updateButtons(t.id, "running");
        }
        else {
            updateButtons(t.id, "idle");
        }

    });

}, 50);
    });
}

/******************************************************
 * CHANGE RATE
 ******************************************************/
async function changeRate(id, rateType, value) {

    let table = tables.find(t => String(t.id) === String(id));
    if (!table) return;

    if (rateType === "frame") {
        table.frameRate = Number(value);
        table.playType = "frame";
    } 
    else if (rateType === "century") {
        table.centuryRate = Number(value);
        table.playType = "century";
    }

    updateDisplay(id);

    if (table.isRunning) {
        updateButtons(id, "running");
    }

    // 🔥 SAVE TO FIREBASE
    await updateDoc(doc(window.db, "tables", id), {
        play_type: table.playType,
        frame_rate: table.frameRate,
        century_rate: table.centuryRate
    });
}
function handleRateChange(id, select) {
    const value = select.value;

    const [type, rate] = value.split("-");

    changeRate(id, type, rate);

}
/******************************************************
 * CHECK-IN FUNCTION
 ******************************************************/
async function checkIn(id) {
    let t = tables.find(x => String(x.id) === String(id));

    if (t.isRunning) return;

// 🔥 ADD THIS LOCK (EXACT YAHAIN)
if (window._creatingSession) {
    console.log("⛔ Session already creating...");
    return;
}
window._creatingSession = true;

    t.isRunning = true;
    t.checkinTime = Date.now();

  
    

    t.afterCheckout = false;
    // 🔥 AGAR PREVIOUS BILL UNPAID HAI → VIEW BILL HIDE
updateButtons(id, "idle");
    
    

    t.checkoutTime = null;
    t.playSeconds = 0;
    t.liveAmount = 0;
    t.canteenTotal = 0;
    t.canteenItems = {};

    updateButtons(id, "running");
    runTimer(id);
    

// 🔥 STEP 1: check if already running session exists
const q = query(
    collection(window.db, "sessions"),
    where("table_id", "==", t.name),
    where("branch", "==", BRANCH),
    where("end_time", "==", null)
);

const snap = await getDocs(q);

// 🔥 STEP 2: if exists → DO NOT create new
if (!snap.empty) {
    console.log("⚠️ Session already exists, skipping new check-in");

    // 🔥 FORCE UI FIX
    t.isRunning = true;

    window._creatingSession = false; // 🔥 IMPORTANT
    return;
}

// 🔥 STEP 3: create new session
try {

    await addDoc(collection(window.db, "sessions"), {
        table_id: t.name,
        branch: BRANCH,

        start_time: new Date().toISOString(),
        end_time: null,

        play_type: t.playType,
        frame_rate: t.frameRate,
        century_rate: t.centuryRate,
        day_id: window.currentDayId
    });

} catch (err) {
    console.error("❌ Session create error:", err);
} finally {
    // 🔥 LOCK RELEASE (VERY IMPORTANT)
    window._creatingSession = false;
}
}



/******************************************************
 * CHECK-OUT FUNCTION
 ******************************************************/
async function checkOut(id) {

    let t = tables.find(x => String(x.id) === String(id));


// 🔥 FINAL FREEZE (IMPORTANT)
t.afterCheckout = true;
t.isRunning = false; // 🔥 FORCE STOP
t.checkoutTime = Date.now();

t.finalSeconds = t.playSeconds;
t.finalAmount = t.liveAmount;   // ✅ ADD THIS HERE

  
    // 🔥 FIREBASE UPDATE
    const q = query(
        collection(window.db, "sessions"),
        where("table_id", "==", t.name),
        where("branch", "==", BRANCH),
        where("end_time", "==", null)
    );

    const snap = await getDocs(q);

    let latestSession = null;
let latestTime = 0;

snap.forEach(d => {
    const data = d.data();

    let time = new Date(data.start_time).getTime();

    if (time > latestTime) {
        latestTime = time;
        latestSession = d;
    }
});

if (latestSession) {
   await updateDoc(doc(window.db, "sessions", latestSession.id), {
    end_time: new Date().toISOString(),

    final_amount: t.finalAmount,
    final_seconds: t.finalSeconds,
    canteen_total: t.canteenTotal,

    canteen_items: t.canteenItems, // 🔥 ADD THIS

    paid: false,
    day_id: window.currentDayId
});
}
  // 🔥 SAVE HISTORY (MAIN FIX)
t.history.push({
    checkin: t.checkinTime,
    checkout: t.checkoutTime,
    playSeconds: t.finalSeconds,
    amount: t.finalAmount,
    canteenAmount: t.canteenTotal,
    total: t.finalAmount + t.canteenTotal,
    paid: false,
    paidTime: null,
    rate: t.playType === "century" ? t.centuryRate : t.frameRate,
    canteenItems: { ...t.canteenItems }
});

    // 🔥 HISTORY SAVE (CORRECT PLACE)
    if (!t.history) t.history = [];

    updateButtons(id, "afterCheckout");
    updateDisplay(id);
}
/******************************************************
 * TIMER — (1 SEC = 1 MIN CHARGE FIX)
 ******************************************************/
function runTimer(id) {
    let t = tables.find(x => String(x.id) === String(id));

    // 🔥 FREEZE FIX
    if (!t || !t.isRunning || t.afterCheckout) return;

    t.playSeconds = Math.floor((Date.now() - t.checkinTime) / 1000);

    // FIXED BILLING
    const rate = t.playType === "century" ? t.centuryRate : t.frameRate;
t.liveAmount = Math.ceil(t.playSeconds / 60) * rate;

    updateDisplay(id);
     

    setTimeout(() => runTimer(id), 1000);
}

/******************************************************
 * UPDATE DISPLAY
 ******************************************************/
function updateDisplay(id) {

    let t = tables.find(x => String(x.id) === String(id));
    if (!t) return;

    // 🔥 SAFE ELEMENT GET
    let checkinEl = document.getElementById(`checkin-${id}`);
    let checkoutEl = document.getElementById(`checkout-${id}`);
    let playtimeEl = document.getElementById(`playtime-${id}`);
    let amountEl = document.getElementById(`amount-${id}`);
    let canteenEl = document.getElementById(`canteen-items-${id}`);

    // ❌ AGAR DOM READY NA HO → SKIP
    if (!checkinEl || !checkoutEl || !playtimeEl || !amountEl) return;

    checkinEl.innerText = t.checkinTime ? formatTime(t.checkinTime) : "--:--:--";
    checkoutEl.innerText = t.checkoutTime ? formatTime(t.checkoutTime) : "--:--:--";

    playtimeEl.innerText =
        formatSeconds(t.afterCheckout ? t.finalSeconds : t.playSeconds);

    let amount = t.afterCheckout
        ? (t.finalAmount + t.canteenTotal)
        : (t.liveAmount + t.canteenTotal);

    amountEl.innerText = amount;

    let itemsHTML = "";
    Object.values(t.canteenItems).forEach(item => {
        itemsHTML += `${item.name} x${item.qty}<br>`;
    });

    if (canteenEl) canteenEl.innerHTML = itemsHTML;
}

/******************************************************
 * FORMAT HELPERS
 ******************************************************/
function formatTime(ms){
    return new Date(ms).toLocaleTimeString('en-PK', {
        timeZone: 'Asia/Karachi',   // ✅ Pakistan time force
        hour: '2-digit',
        minute: '2-digit',
        hour12: true               // ✅ AM/PM
    });
}
function pad(n){ return n<10 ? "0"+n : n; }
function formatSeconds(sec){
    let h = Math.floor(sec/3600);
    let m = Math.floor((sec%3600)/60);
    let s = sec%60;
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/******************************************************
 * BUTTON STATUS LOGIC (FULL FIX)
 ******************************************************/
function updateButtons(id, mode) {

    let checkInBtn = document.getElementById(`checkinBtn-${id}`);
    let checkOutBtn = document.getElementById(`checkoutBtn-${id}`);
    let afterRow = document.getElementById(`afterRow-${id}`);

    let histBtn = document.getElementById(`historyBtn-${id}`);
    let editBtn = document.getElementById(`editBtn-${id}`);
    let delBtn = document.getElementById(`deleteBtn-${id}`);

    let canteenBtn = document.getElementById(`canteenBtn-${id}`);
    let shiftBtn = document.getElementById(`shiftBtn-${id}`);

    let t = tables.find(x => String(x.id) === String(id));
    let last = t.history[t.history.length - 1];

    // 🔥 RUNNING MODE
    if (mode === "running") {

        checkInBtn.classList.add("hidden");
        checkOutBtn.classList.remove("hidden");
        afterRow.classList.add("hidden");

        histBtn.classList.remove("hidden");
        editBtn.classList.add("hidden");
        delBtn.classList.add("hidden");

        canteenBtn.classList.remove("hidden");
        shiftBtn.classList.remove("hidden");

        return;
    }

    // 🔥 AFTER CHECKOUT MODE
    if (mode === "afterCheckout") {

        checkInBtn.classList.add("hidden");
        checkOutBtn.classList.add("hidden");

        histBtn.classList.remove("hidden");
        editBtn.classList.remove("hidden");
        delBtn.classList.remove("hidden");

        canteenBtn.classList.add("hidden");
        shiftBtn.classList.add("hidden");

        // 🔥 LOGIC
        if (last && !last.paid) {
            afterRow.classList.remove("hidden"); // VIEW BILL SHOW
        } else {
            afterRow.classList.add("hidden");
            checkInBtn.classList.remove("hidden"); // CHECKIN SHOW
        }

        return;
    }

    // 🔥 IDLE MODE
    checkInBtn.classList.remove("hidden");
    checkOutBtn.classList.add("hidden");
    afterRow.classList.add("hidden");

    histBtn.classList.remove("hidden");
    editBtn.classList.remove("hidden");
    delBtn.classList.remove("hidden");

    canteenBtn.classList.add("hidden");
    shiftBtn.classList.add("hidden");
}
/******************************************************
 * BILL POPUP — SHOW BILL FOR A TABLE
 ******************************************************/
async function showBill(id) {

    let t = tables.find(x => String(x.id) === String(id));

    let academy = localStorage.getItem("academyName") || "Rasson Snooker Academy";
    let branch = BRANCH || "Rasson1";

    let checkin = t.checkinTime ? formatTime(t.checkinTime) : "--";
    let checkout = t.checkoutTime ? formatTime(t.checkoutTime) : "--";
    let playtime = formatSeconds(t.finalSeconds || t.playSeconds);

    let bill = document.getElementById("billDetails");

    let canteenDetails = "";
    let canteenTotal = 0;

    Object.values(t.canteenItems || {}).forEach(item => {
        let total = item.qty * item.price;
        canteenTotal += total;

        canteenDetails += `<p>${item.name} x${item.qty}</p>`;
    });

    if (!canteenDetails) canteenDetails = `<p>No items</p>`;

    let gameAmount = t.finalAmount || t.liveAmount;

    bill.innerHTML = `
<div style="width:300px; margin:auto; font-family:monospace; color:#000; background:#fff; padding:15px; border-radius:10px;">

    <center>
    <img src="../assets/bill-logo.png" style="width:120px; margin-bottom:5px;">
    <h3 style="margin:0;">${academy}</h3>
    <small>${branch}</small>
</center>

    <hr>

    <p><b>Table:</b> ${t.name}</p>
    <p><b>Check-in:</b> ${checkin}</p>
    <p><b>Checkout:</b> ${checkout}</p>
    <p><b>Play Time:</b> ${playtime}</p>

    <hr>

    <p><b>Game Charges</b></p>
    <p>Rs ${gameAmount}</p>

    <hr>

    <p><b>Canteen</b></p>
    ${Object.values(t.canteenItems || {}).map(item => `
        <div style="display:flex; justify-content:space-between;">
            <span>${item.name} x${item.qty}</span>
            <span>${item.qty * item.price}</span>
        </div>
    `).join("") || "<p>No items</p>"}

    <hr>

    <div style="display:flex; justify-content:space-between;">
        <b>Total</b>
        <b>Rs ${gameAmount + canteenTotal}</b>
    </div>

    <hr>

    <hr>

<center>
    <img src="../assets/QR-bill.png" style="width:100px;">
    <br>
    <small>Scan & Pay</small>
</center>

</div>
`;

    document.getElementById("billPopup").classList.remove("hidden");

    document.getElementById("paidBtn").onclick = () => completePayment(id);
    document.getElementById("cancelBillBtn").onclick =
        () => document.getElementById("billPopup").classList.add("hidden");
}

async function completePayment(id) {

    let t = tables.find(x => String(x.id) === String(id));
    if (!t || !t.history.length) return;

    let last = t.history[t.history.length - 1];

    last.paid = true;
  last.paidTime = Date.now();

// 🔥 FIREBASE UPDATE (MAIN FIX)
// 🔥 GET ONLY LAST CLOSED SESSION
const q = query(
    collection(window.db, "sessions"),
    where("table_id", "==", t.name),
    where("branch", "==", BRANCH)
);

// 🔥 ONLY LAST SESSION KO PAID KARO
const snap = await getDocs(q);

let latestSession = null;
let latestTime = 0;

snap.forEach(d => {
    const data = d.data();
   if (!data.end_time) return;

    let time = new Date(data.end_time).getTime();

    if (time > latestTime) {
        latestTime = time;
        latestSession = { id: d.id, ...data };
    }
});

if (latestSession) {
    await updateDoc(doc(window.db, "sessions", latestSession.id), {
        paid: true,
      paid_time: new Date().toISOString()
    });
}

     

    document.getElementById("billPopup").classList.add("hidden");

    // 🔥 UI UPDATE (IMPORTANT)
    updateButtons(id, "afterCheckout");

    printThermalBill(id);
}




/******************************************************
 * CANTEEN POPUP — FOOD ITEMS
 ******************************************************/
async function openCanteen(id) {

    let t = tables.find(x => String(x.id) === String(id));

    if (!t) return;

let list = document.getElementById("canteenList");
list.innerHTML = "";

inventoryItems.forEach(item => {

    list.innerHTML += `
        <div style="margin-bottom:10px;">
            <b>${getItemName(item)}</b> - Rs ${item.selling_price || item.price || 0}
            <br>
            <small style="color:${getItemStock(item) <= 5 ? 'red' : 'lime'}">
                Stock: ${getItemStock(item)}
                ${getItemStock(item) <= 5 ? '⚠️ LOW' : ''}
            </small>
            <button 
                ${getItemStock(item) <= 0 ? 'disabled style="opacity:0.3"' : ''}
                onclick="addItem('${id}', '${item.id}', ${item.selling_price || item.price || 0}, '${getItemName(item)}')">
                ➕
            </button>
            <button onclick="removeItem('${id}', '${item.id}', ${item.selling_price || item.price || 0}, '${getItemName(item)}')">➖</button>
        </div>
    `;
});

    document.getElementById("canteenPopup").classList.remove("hidden");

    document.getElementById("closeCanteenBtn").onclick =
        () => document.getElementById("canteenPopup").classList.add("hidden");
}

async function addItem(tableId, itemId, price, name) {

    let t = tables.find(x => String(x.id) === String(tableId));
    if (!t) return;

    if (t.afterCheckout) return alert("Bill already closed");

    // 🔥 GET ITEM FROM FIREBASE MEMORY
    const item = inventoryItems.find(i => i.id === itemId);

    // 🔥 STOCK CHECK
    if (!item || getItemStock(item) <= 0) {
        alert("Out of stock ❌");
        return;
    }

    if (!t.canteenItems[itemId]) {
        t.canteenItems[itemId] = { 
    name: getItemName(item), 
    qty: 0, 
    price 
};
    }

    t.canteenItems[itemId].qty += 1;
    t.canteenTotal += price;

    // 🔥 STOCK MINUS
    await updateDoc(doc(window.db, "inventory", itemId), {
        stock: increment(-1)
    });

    // 🔥 LOCAL UPDATE (IMPORTANT)
    item.stock = Math.max(0, (item.stock || 0) - 1);

    updateDisplay(tableId);
    openCanteen(tableId);
}

async function removeItem(tableId, itemId, price, name) {

    let t = tables.find(x => String(x.id) === String(tableId));
    if (!t || !t.canteenItems[itemId]) return;

    // 🔥 FREEZE LOCK
    if (t.afterCheckout) return;

    t.canteenItems[itemId].qty -= 1;
    t.canteenTotal -= price;

    if (t.canteenItems[itemId].qty <= 0) {
        delete t.canteenItems[itemId];
    }

    // 🔥 STOCK BACK FIREBASE
    const itemRef = doc(window.db, "inventory", itemId);

    await updateDoc(itemRef, {
        stock: increment(1)
    });

    updateDisplay(tableId);
    openCanteen(tableId);
}


/******************************************************
 * EDIT TABLE POPUP
 ******************************************************/
function editTable(id) {
    if (ROLE !== "admin") {
        alert("Only admin can edit ❌");
        return;
    }
    let t = tables.find(x => String(x.id) === String(id));
    editTargetId = id;

    document.getElementById("editTableName").value = t.name;
    document.getElementById("editFrameRate").value = t.frameRate;
    document.getElementById("editCenturyRate").value = t.centuryRate;

    document.getElementById("editTablePopup").classList.remove("hidden");

    document.getElementById("saveEditBtn").onclick = updateTable;
    document.getElementById("cancelEditBtn").onclick = () =>
        document.getElementById("editTablePopup").classList.add("hidden");
}

async function updateTable() {

    let t = tables.find(x => x.id === editTargetId);

    t.name = document.getElementById("editTableName").value.trim();
    t.frameRate = Number(document.getElementById("editFrameRate").value);
    t.centuryRate = Number(document.getElementById("editCenturyRate").value);

    // 🔥 FIREBASE UPDATE
    await updateDoc(doc(window.db, "tables", editTargetId), {
        table_id: t.name,
        frame_rate: t.frameRate,
        century_rate: t.centuryRate
    });

     
    renderTables();

    document.getElementById("editTablePopup").classList.add("hidden");
}

/******************************************************
 * DELETE TABLE POPUP
 ******************************************************/
function deleteTableOpen(id) {
    if (ROLE !== "admin") {
        alert("Only admin can delete ❌");
        return;
    }
    deleteTargetId = id;
    document.getElementById("deletePopup").classList.remove("hidden");

    document.getElementById("confirmDeleteBtn").onclick = deleteTableConfirm;
    document.getElementById("cancelDeleteBtn").onclick =
        () => document.getElementById("deletePopup").classList.add("hidden");
}

async function deleteTableConfirm() {

    // 🔥 FIREBASE DELETE
    await deleteDoc(doc(window.db, "tables", deleteTargetId));

    tables = tables.filter(x => x.id !== deleteTargetId);

     
    renderTables();

    document.getElementById("deletePopup").classList.add("hidden");
}

/******************************************************
 * OPEN HISTORY POPUP (FULL FIX)
 ******************************************************/
function openHistory(id) {

    let t = tables.find(x => String(x.id) === String(id));

    let body = document.getElementById("historyTableBody");
    body.innerHTML = "";

    if (t.history.length === 0) {
        body.innerHTML = `
            <tr><td colspan="9" style="text-align:center;">No history found.</td></tr>
        `;
    } else {
        t.history.forEach((h, index) => {
            body.innerHTML += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${formatTime(h.checkin)}</td>
                    <td>${formatTime(h.checkout)}</td>
                    <td>${formatSeconds(h.playSeconds)}</td>
                    <td>${h.rate}</td>
                    <td>${h.amount}</td>
                    <td>${h.canteenAmount}</td>
                    <td>${h.total}</td>
                    <td>
    ${h.paid
        ? `<button class="paid-btn" disabled>PAID</button>`
        : `<button class="unpaid-btn" onclick="openBillFromHistory('${id}', ${index})">UNPAID</button>`
    }
</td>

                </tr>
            `;
        });
    }

    document.getElementById("historyPopup").classList.remove("hidden");

    document.getElementById("closeHistoryBtn").onclick =
        () => document.getElementById("historyPopup").classList.add("hidden");
}

function openBillFromHistory(tableId, historyIndex) {

    let t = tables.find(x => String(x.id) === String(tableId));
    let h = t.history[historyIndex];

    let academy = localStorage.getItem("academyName") || "Rasson Snooker Academy";
    let branch = BRANCH || "Rasson1";

    let checkin = h.checkin ? formatTime(h.checkin) : "--";
    let checkout = h.checkout ? formatTime(h.checkout) : "--";
    let playtime = formatSeconds(h.playSeconds || 0);

    let bill = document.getElementById("billDetails");

    

    const canteenItems = Object.values(h.canteenItems || {});
document.getElementById("paidBtn").onclick = async () => {

    let t = tables.find(x => String(x.id) === String(tableId));
    let h = t.history[historyIndex];

    // ✅ MARK PAID
    h.paid = true;
    h.paidTime = Date.now();

    // 🔥 FIREBASE UPDATE (MAIN FIX)
    const q = query(
        collection(window.db, "sessions"),
        where("table_id", "==", t.name),
        where("branch", "==", BRANCH)
    );

    const snap = await getDocs(q);

    let targetSession = null;

    snap.forEach(d => {
        const data = d.data();

        const checkinMatch =
            new Date(data.start_time).getTime() === h.checkin &&
            new Date(data.end_time).getTime() === h.checkout;

        if (checkinMatch) {
            targetSession = d;
        }
    });

    if (targetSession) {
        await updateDoc(doc(window.db, "sessions", targetSession.id), {
            paid: true,
            paid_time: new Date().toISOString()
        });
    }

    // ✅ CLOSE BILL
    document.getElementById("billPopup").classList.add("hidden");

    // ✅ UI UPDATE
    openHistory(tableId);

    // ✅ PRINT
    printThermalBill(tableId, h);
};

// 🔥 CANTEEN LIST
let canteenHTML = "";
let canteenTotal = 0;

canteenItems.forEach(item => {
    const total = item.qty * item.price;
    canteenTotal += total;

    canteenHTML += `
    <div style="display:flex; justify-content:space-between;">
        <span>${item.name} x${item.qty}</span>
        <span>${total}</span>
    </div>
    `;
});

if (!canteenHTML) canteenHTML = "<p>No items</p>";

const gameAmount = h.amount || 0;
const finalTotal = gameAmount + canteenTotal;

bill.innerHTML = `
<div style="width:300px; margin:auto; font-family:monospace; color:#000; background:#fff; padding:15px; border-radius:10px;">

    <!-- 🔥 LOGO -->
    <center>
        <img src="../assets/bill-logo.png" style="width:120px;">
        <h3 style="margin:5px 0;">${academy}</h3>
        <small>${branch}</small>
    </center>

    <hr>

    <!-- TABLE INFO -->
    <p><b>Table:</b> ${t.name}</p>
    <p><b>Check-in:</b> ${checkin}</p>
    <p><b>Checkout:</b> ${checkout}</p>
    <p><b>Play Time:</b> ${playtime}</p>

    <hr>

    <!-- 🔥 CANTEEN -->
    <p><b>Canteen</b></p>
    ${canteenHTML}

    <div style="display:flex; justify-content:space-between;">
        <b>Canteen Total</b>
        <b>Rs ${canteenTotal}</b>
    </div>

    <hr>

    <!-- 🔥 GAME -->
    <div style="display:flex; justify-content:space-between;">
        <span>Game Charges</span>
        <span>Rs ${gameAmount}</span>
    </div>

    <hr>

    <!-- 🔥 FINAL TOTAL -->
    <div style="display:flex; justify-content:space-between; font-size:18px;">
        <b>Total</b>
        <b>Rs ${finalTotal}</b>
    </div>

    <hr>

    <!-- 🔥 QR -->
    <center>
        <img src="../assets/QR-bill.png" style="width:100px;">
        <br>
        <small>Scan & Pay</small>
    </center>

    <hr>

    <center>
        <small>Thanks for visiting ❤️</small>
    </center>

</div>
`;

    document.getElementById("billPopup").classList.remove("hidden");
}
/******************************************************
 * SHIFT TABLE POPUP (OPEN)
 ******************************************************/
function openTableShift(id) {
    let t = tables.find(x => String(x.id) === String(id));

    if (!t.isRunning) {
        alert("Only running tables can be shifted.");
        return;
    }

    window._shiftSourceTable = id;

    let sel = document.getElementById("shiftTableSelect");
    sel.innerHTML = "";

    // ✅ SORT SAME LIKE UI (Tables first, then Rooms)
const sortedTables = [...tables].sort((a, b) => {

    const getType = (name = "") => {
    name = String(name).toLowerCase();

    if (name.startsWith("table")) return 1;
    if (name.startsWith("room")) return 2;

    return 3;
};

    const typeA = getType(a.name);
    const typeB = getType(b.name);

    if (typeA !== typeB) return typeA - typeB;

    const numA = parseInt(((a.name || "").match(/\d+/) || [0])[0]);
    const numB = parseInt(((b.name || "").match(/\d+/) || [0])[0]);

    return numA - numB;
});


// ✅ LOOP ON SORTED DATA
sortedTables.forEach(tb => {
    if (!tb.isRunning && tb.id !== id) {
        sel.innerHTML += `<option value="${tb.id}">${tb.name}</option>`;
    }
});

    if (sel.innerHTML === "") {
        alert("No free tables available to shift.");
        return;
    }

    document.getElementById("shiftTablePopup").classList.remove("hidden");

    document.getElementById("cancelShiftTableBtn").onclick =
        () => document.getElementById("shiftTablePopup").classList.add("hidden");

    document.getElementById("confirmShiftTableBtn").onclick =
        shiftPlayerToNewTable;
}

/******************************************************
 * SHIFT PLAYER TO NEW TABLE (MAIN LOGIC)
 ******************************************************/
async function shiftPlayerToNewTable() {

    let oldId = window._shiftSourceTable;
    let newId = document.getElementById("shiftTableSelect").value;

    let oldT = tables.find(x => String(x.id) === String(oldId));
    let newT = tables.find(x => String(x.id) === String(newId));

    if (!oldT || !newT) return;

    // 🔥 MOVE SESSION (LOCAL)
    newT.isRunning = true;
    newT.checkinTime = oldT.checkinTime;
    newT.playSeconds = oldT.playSeconds;
    newT.liveAmount = oldT.liveAmount;
    newT.canteenTotal = oldT.canteenTotal;
    newT.canteenItems = { ...oldT.canteenItems };

    runTimer(newT.id);

    // 🔥 RESET OLD TABLE
    oldT.isRunning = false;
    oldT.checkinTime = null;
    oldT.checkoutTime = null;
    oldT.playSeconds = 0;
    oldT.liveAmount = 0;
    oldT.canteenTotal = 0;
    oldT.canteenItems = {};

     
    renderTables();

    document.getElementById("shiftTablePopup").classList.add("hidden");

    // 🔥 FIREBASE SYNC (IMPORTANT FIX)
    try {
        const q = query(
            collection(window.db, "sessions"),
            where("table_id", "==", oldT.name),
            where("branch", "==", BRANCH),
            where("end_time", "==", null)
        );

        const snap = await getDocs(q);

        snap.forEach(async (d) => {
            await updateDoc(doc(window.db, "sessions", d.id), {
                table_id: newT.name
            });
        });

    } catch (err) {
        console.error("Shift Firebase error:", err);
    }

    alert(`Shifted successfully to ${newT.name}`);
}
/******************************************************
 * SHIFT BUTTON BINDING
 ******************************************************/
function bindShiftButtons() {

    // 🔥 SHIFT START TRACKER
    document.getElementById("shiftCloseBtn").onclick = openShiftSummary;

    document.getElementById("confirmShiftCloseBtn").onclick = () => {

        let btn = document.getElementById("shiftCloseBtn");

        if (btn.innerText.includes("Day")) {
            closeDay();
        }
        else if (btn.innerText.includes("1")) {
            closeShift1();
        }
        else {
            closeShift2();
        }
    };

    document.getElementById("cancelShiftSummaryBtn").onclick =
        () => hidePopup("shiftSummaryPopup");
    hidePopup("shiftSummaryPopup");

}

/******************************************************
 * POPUP SHOW/HIDE
 ******************************************************/
function showPopup(id) {
    document.getElementById(id).classList.remove("hidden");
}
function hidePopup(id) {
    document.getElementById(id).classList.add("hidden");
}

/******************************************************
 * OPEN SHIFT SUMMARY POPUP (Shift1 + Shift2 + Combined)
 ******************************************************/
function openShiftSummary() {

    let btn = document.getElementById("shiftCloseBtn");
    let summaryBody = document.getElementById("shiftSummaryBody");
    let title = document.getElementById("shiftSummaryTitle");



    let now = new Date().toLocaleString('en-PK', {
    timeZone: 'Asia/Karachi'
});

    
    


    // Title Logic
    if (btn.innerText.includes("Day")) {
        title.innerText = "Day Summary";
        document.getElementById("confirmShiftCloseBtn").innerText = "Close Day";
    } else {
        title.innerText = "Shift Summary";
        document.getElementById("confirmShiftCloseBtn").innerText = "Close Shift";
    }

// Load frozen snapshots of shift1 & shift2
let s1 = shift1 || null;
let s2 = shift2 || null;

let combined = null;

if (s1 && s2) {
    combined = {
        gameTotal: s1.gameTotal + s2.gameTotal,
        canteenTotal: s1.canteenTotal + s2.canteenTotal,

        gameCollection: s1.gameCollection + s2.gameCollection,
        canteenCollection: s1.canteenCollection + s2.canteenCollection,

        expenses: s1.expenses + s2.expenses
    };

    combined.gameBalance = combined.gameTotal - combined.gameCollection;
    combined.canteenBalance = combined.canteenTotal - combined.canteenCollection;

    combined.closingCash =
        (combined.gameCollection + combined.canteenCollection) - combined.expenses;
}


// APPLY to HTML table
summaryBody.innerHTML = `
<tr>
    <td>Shift 1</td>
    <td>${s1?.gameTotal || 0}</td>
    <td>${s1?.canteenTotal || 0}</td>
    <td>${s1?.gameCollection || 0}</td>
    <td>${s1?.canteenCollection || 0}</td>
    <td>${s1?.gameBalance || 0}</td>
    <td>${s1?.canteenBalance || 0}</td>
    <td>${s1?.expenses || 0}</td>
    <td>${s1?.closingCash || 0}</td>
    <td>${s1?.openTime || "-"}</td>
    <td>${s1?.closeTime || "-"}</td>
</tr>

<tr>
    <td>Shift 2</td>
    <td>${s2?.gameTotal || 0}</td>
    <td>${s2?.canteenTotal || 0}</td>
    <td>${s2?.gameCollection || 0}</td>
    <td>${s2?.canteenCollection || 0}</td>
    <td>${s2?.gameBalance || 0}</td>
    <td>${s2?.canteenBalance || 0}</td>
    <td>${s2?.expenses || 0}</td>
    <td>${s2?.closingCash || 0}</td>
    <td>${s2?.openTime || "-"}</td>
    <td>${s2?.closeTime || "-"}</td>
</tr>

${combined ? (
"<tr class='combined-row'>" +
"<td>Combined</td>" +
"<td>" + combined.gameTotal + "</td>" +
"<td>" + combined.canteenTotal + "</td>" +
"<td>" + combined.gameCollection + "</td>" +
"<td>" + combined.canteenCollection + "</td>" +
"<td>" + combined.gameBalance + "</td>" +
"<td>" + combined.canteenBalance + "</td>" +
"<td>" + combined.expenses + "</td>" +
"<td>" + combined.closingCash + "</td>" +
"<td>-</td>" +
"<td>-</td>" +
"</tr>"
) : ""}
`;


    showPopup("shiftSummaryPopup");
}

/******************************************************
 * SHIFT 1 CLOSE (running tables allowed)
 ******************************************************/
async function closeShift1() {
  const q = query(
    collection(window.db, "shifts"),
    where("branch", "==", BRANCH),
    where("shift_number", "==", 1),
    where("day_id", "==", window.currentDayId) // 🔥 MAIN FIX
);

const snap = await getDocs(q);

if (!snap.empty) {
    alert("Shift 1 already closed ❌");
    return;
}


let now = Date.now();

let startMs = now - 1000;
let endMs = now;

// ❗ CRITICAL FIX
if (!endMs || endMs < 100000) {
    endMs = Date.now();
}

// 🔥 STEP 1: FIRST REBUILD HISTORY
await rebuildHistoryFromSessions();

// 🔥 STEP 2: THEN GET HISTORY
let allHistory = tables.flatMap(t => t.history);

if (allHistory.length > 0) {
    let firstSession = allHistory.sort((a,b) => a.checkin - b.checkin)[0];

    if (firstSession && firstSession.checkin) {
        startMs = firstSession.checkin;
    }
}

// 🔥 STEP 3: CALCULATE
let shiftData = calculateShiftSnapshot(startMs, endMs);

    shift1 = {
        shift: 1,
        openTime: new Date(startMs).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' }),
        closeTime: new Date(endMs).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' }),
        startMs: startMs,
        endMs: endMs,
        ...shiftData
    };

    

    document.getElementById("shiftCloseBtn").innerText = "Shift 2 Close";
    hidePopup("shiftSummaryPopup");


  console.log("🔥 SHIFT1 SAVE CHECK:", {
    startMs,
    endMs
});

// ✅ BACKEND SAVE

// 🔥 FIREBASE SAVE SHIFT 1
await addDoc(collection(window.db, "shifts"), {
    tables: tables.map(t => ({
        table_id: t.name,
        total: t.history.reduce((sum, h) => sum + (h.total || 0), 0)
    })),
    shift_number: 1,
    branch: BRANCH,

    day_id: window.currentDayId,

    open_time: shift1.openTime,
    close_time: shift1.closeTime,

    start_ms: shift1.startMs,   // ✅ ADD
    end_ms: shift1.endMs,        // ✅ ADD

    game_total: shiftData.gameTotal,
canteen_total: shiftData.canteenTotal,

game_collection: shiftData.gameCollection,
canteen_collection: shiftData.canteenCollection,

expenses: shiftData.expenses,
closing_cash: shiftData.closingCash,

    created_at: new Date().toISOString()
});
alert("Shift 1 closed successfully ✅");
  await loadShiftsFromFirebase();
}




/******************************************************
 * SHIFT 2 CLOSE (no running tables allowed)
 ******************************************************/
async function closeShift2() {

  const q = query(
    collection(window.db, "shifts"),
    where("branch", "==", BRANCH),
    where("shift_number", "==", 2),
    where("day_id", "==", window.currentDayId)
);

const snap = await getDocs(q);

if (!snap.empty) {
    alert("Shift 2 already closed ❌");
    return;
}

    // cannot close if any table still running
    let running = tables.some(t => t.isRunning);
    if (running) {
        alert("Close all tables in Shift 2");
        return;
    }

    let now = Date.now();

    // Shift1 snapshot required
    let s1 = shift1 || {};

    let startMs = shift1?.endMs;

// 🔥 HARD FIX (NO FAIL SYSTEM)
if (!startMs) {

    console.log("⚠️ shift1 missing → forcing reload");

    // ✅ STEP 1: reload shifts
    await loadShiftsFromFirebase();

    startMs = shift1?.endMs;

    // ✅ STEP 2: STILL MISSING → WAIT + FETCH
    if (!startMs) {

        await new Promise(res => setTimeout(res, 800)); // 🔥 WAIT

        const q = query(
            collection(window.db, "shifts"),
            where("branch", "==", BRANCH),
            where("shift_number", "==", 1),
            where("day_id", "==", window.currentDayId)
        );

        const snap = await getDocs(q);

        snap.forEach(doc => {
            const d = doc.data();
            startMs = d.end_ms;
        });
    }

    // ❌ FINAL FAIL (should never happen now)
    if (!startMs) {
        alert("Shift1 data still missing ❌ (FINAL)");
        return;
    }
}
    let endMs = now;

    
    let shiftData = calculateShiftSnapshot(startMs, endMs);

    shift2 = {
        shift: 2,
        openTime: new Date(startMs).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' }),
        closeTime: new Date(endMs).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' }),
        startMs: startMs,
        endMs: endMs,
        ...shiftData
    };

    

    document.getElementById("shiftCloseBtn").innerText = "Day Close";
    hidePopup("shiftSummaryPopup");

// ✅ BACKEND SAVE

// 🔥 FIREBASE SAVE SHIFT 2
await addDoc(collection(window.db, "shifts"), {
    tables: tables.map(t => ({
        table_id: t.name,
        total: t.history.reduce((sum, h) => sum + (h.total || 0), 0)
    })),
    shift_number: 2,
    branch: BRANCH,

    day_id: window.currentDayId,

    open_time: shift2.openTime,
    close_time: shift2.closeTime,
    start_ms: shift2.startMs,
    end_ms: shift2.endMs,

    game_total: shiftData.gameTotal,
canteen_total: shiftData.canteenTotal,

game_collection: shiftData.gameCollection,
canteen_collection: shiftData.canteenCollection,

expenses: shiftData.expenses,
closing_cash: shiftData.closingCash,

    created_at: new Date().toISOString()
});

alert("Shift 2 closed successfully ✅");
  await loadShiftsFromFirebase();
}



/******************************************************
 * DAY CLOSE — RESET EVERYTHING + NEW DAY START
 ******************************************************/
async function closeDay() {

   const today = new Date().toLocaleDateString("en-CA"); // ✅ FIX
    let s1 = shift1;
    let s2 = shift2;

    if (!s1 || !s2) {
        alert("Please close Shift 1 and Shift 2 before Day Close.");
        return;
    }

    // --------------- BUILD COMBINED SUMMARY --------------------
    let combined = {
        gameTotal: (s1.gameTotal || 0) + (s2.gameTotal || 0),
        canteenTotal: (s1.canteenTotal || 0) + (s2.canteenTotal || 0),

        gameCollection: (s1.gameCollection || 0) + (s2.gameCollection || 0),
        canteenCollection: (s1.canteenCollection || 0) + (s2.canteenCollection || 0),

        gameBalance: (s1.gameBalance || 0) + (s2.gameBalance || 0),
        canteenBalance: (s1.canteenBalance || 0) + (s2.canteenBalance || 0),

        expenses: (s1.expenses || 0) + (s2.expenses || 0),
    };

    combined.closingCash =
        (combined.gameCollection + combined.canteenCollection) - combined.expenses;


    // 🔥🔥🔥 STEP 1: SAVE SNAPSHOT BEFORE RESET (MAIN FIX)
    const tablesSnapshot = tables.map(t => ({
    table_id: t.name,
    history: t.history.map(h => ({ ...h }))
}));


    // 🔥🔥🔥 STEP 2: FIREBASE SAVE (PEHLE SAVE KARO)
    try {

       
// ==========================
// 🔥 DUPLICATE SHIFT CHECK (ADD THIS)
// ==========================


// 👉 identify shift (simple logic)


// 🔥 SAFE DATA CLEAN (VERY IMPORTANT)
const safeShift1 = JSON.parse(JSON.stringify(s1 || {}));
const safeShift2 = JSON.parse(JSON.stringify(s2 || {}));
const safeTables = JSON.parse(JSON.stringify(tablesSnapshot || {}));
const safeCombined = JSON.parse(JSON.stringify(combined || {}));

      const q = query(
    collection(window.db, "days"),
    where("branch", "==", BRANCH),
    where("day_id", "==", window.currentDayId)
);

const snap = await getDocs(q);

if (!snap.empty) {
    alert("Day already closed ❌");
    return;
}

await addDoc(collection(window.db, "days"), {
    tables: safeTables,
    date: today,
    day_id: window.currentDayId, // 🔥 ADD THIS
    branch: BRANCH,
    shift: "day",

    shift1: safeShift1,
    shift2: safeShift2,
    combined: safeCombined,

    created_at: new Date().toISOString()
});

// 🔥 FINAL SAFE DATA (DIRECT FROM SHIFT OBJECTS)
let printData = {
    gameTotal: (s1?.gameTotal || 0) + (s2?.gameTotal || 0),
    canteenTotal: (s1?.canteenTotal || 0) + (s2?.canteenTotal || 0),

    gameCollection: (s1?.gameCollection || 0) + (s2?.gameCollection || 0),
    canteenCollection: (s1?.canteenCollection || 0) + (s2?.canteenCollection || 0),

    expenses: (s1?.expenses || 0) + (s2?.expenses || 0)
};

printData.closingCash =
    (printData.gameCollection + printData.canteenCollection) - printData.expenses;

// 🔥 DEBUG (optional)
console.log("🔥 DAY PRINT DATA:", printData);

// 🔥 PRINT
printShiftThermal("Day Summary", printData, shift1, shift2);
} catch (err) {
    alert("Error saving day data ❌");
    return;
}


    // 🔥🔥🔥 STEP 3: AB RESET KARO (SAFE)
    const newDayId = Date.now();
window.currentDayId = newDayId;
localStorage.setItem("currentDayId", newDayId);

    tables.forEach(t => {
        t.history = [];
        t.isRunning = false;
        t.checkinTime = null;
        t.checkoutTime = null;
        t.playSeconds = 0;
        t.liveAmount = 0;
        t.canteenTotal = 0;
        t.canteenItems = {};
    });

     
    renderTables();

    document.getElementById("shiftCloseBtn").innerText = "Shift 1 Close";

    hidePopup("shiftSummaryPopup");

    shift1 = null;
    shift2 = null;

    alert("Day Closed Successfully & Saved in Day History!");
  setTimeout(autoRefreshUI, 1200);
}



/******************************************************
 * SHIFT HELPERS
 ******************************************************/
function getGameTotal() {
    return tables.reduce((sum, t) => sum + t.liveAmount, 0);
}

function getTotalCollection() {
    return tables.reduce((sum, t) => sum + (t.liveAmount + t.canteenTotal), 0);
}

function calculateShiftSnapshot(startTime, endTime) {

    let gameTotal = 0;
    let canteenTotal = 0;
    let gameCollection = 0;
    let canteenCollection = 0;
    let gameBalance = 0;
    let canteenBalance = 0;

    tables.forEach(t => {
        t.history.forEach(h => {

            let g = Number(h.amount || 0);
            let c = Number(h.canteenAmount || 0);

            // =========================
            // 🔥 TOTAL (checkout based)
            // =========================
            if (h.checkout >= startTime && h.checkout <= endTime) {

                gameTotal += g;
                canteenTotal += c;

                // ❗ UNPAID → balance
                if (!h.paid) {
                    gameBalance += g;
                    canteenBalance += c;
                }
            }

            // =========================
            // 🔥 COLLECTION (paidTime based)
            // =========================
            if (h.paid && h.paidTime) {
        if (h.paidTime >= (startTime - 1000) && h.paidTime <= endTime) {

        gameCollection += g;
        canteenCollection += c;
        }
      }

        });
    });

    // =========================
    // 🔥 EXPENSES
    // =========================
    let expenses = firebaseExpenses
        .filter(e => {
            let time = e.created_at ? new Date(e.created_at).getTime() : 0;
            return time >= startTime && time <= endTime;
        })
        .reduce((sum, e) => sum + Number(e.amount || 0), 0);

    // =========================
    // 🔥 FINAL BALANCE FIX
    // =========================
    let closingCash = (gameCollection + canteenCollection) - expenses;

    return {
        gameTotal,
        canteenTotal,
        gameCollection,
        canteenCollection,
        gameBalance,
        canteenBalance,
        expenses,
        closingCash
    };
}


/******************************************************
 * HISTORY BUTTON BINDING
 ******************************************************/
function bindHistoryButtons() {

    // DAY HISTORY
    document.getElementById("dayHistoryBtn").onclick = openDayHistory;

    // 🔥 ADD THIS LINE (MAIN FIX)
    document.getElementById("tableHistoryBtn").onclick = openTableHistory;

    document.getElementById("cancelDayHistoryBtn").onclick =
        () => hidePopup("dayHistoryPopup");
    document.getElementById("cancelTableHistoryBtn").onclick =
        () => hidePopup("tableHistoryPopup");

    document.addEventListener("click", function(e) {

        if (e.target && e.target.id === "printDayHistoryBtn") {

            let index = document.getElementById("dayHistoryDateSelect").selectedIndex;
            let d = window._daysData[index];

            if (!d) {
                alert("No data found ❌");
                return;
            }

            printDayHistoryThermal(d);
        }

        if (e.target && e.target.id === "printTableHistoryBtn") {

            let tableId = document.getElementById("tableHistoryTableSelect").value;
            let dayIndex = document.getElementById("tableHistoryDateSelect").selectedIndex;

            if (!tableId || dayIndex < 0) {
                alert("Select table & date first ❌");
                return;
            }

            printTableHistoryThermal();
        }

    });
}
/******************************************************
 * 🟢 OPEN DAY HISTORY POPUP
 ******************************************************/
async function openDayHistory() {

    const q = query(
        collection(window.db, "days"),
        where("branch", "==", BRANCH)
    );

    const snap = await getDocs(q);

    let sel = document.getElementById("dayHistoryDateSelect");
    sel.innerHTML = "";

    let days = [];

    snap.forEach(doc => {
    let d = doc.data();
    days.push(d);
});

// 🔥 SORT
days.sort((a, b) => {
    return new Date(b.created_at) - new Date(a.created_at);
});

// 🔥 AB DROPDOWN BANAO
days.forEach(d => {

    let openTime = d.shift1?.startMs 
        ? new Date(d.shift1.startMs).toLocaleTimeString('en-PK', {
    timeZone: 'Asia/Karachi',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
}) 
        : "-";

    let closeTime = d.shift2?.endMs 
        ? new Date(d.shift2.endMs).toLocaleTimeString('en-PK', {
    timeZone: 'Asia/Karachi',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
}) 
        : "-";

    sel.innerHTML += `
<option>
    ${d.date} (${openTime} → ${closeTime})
</option>`;
});

    window._daysData = days;

    loadDaySummaryFirebase();

    document.getElementById("dayHistoryDateSelect").onchange = loadDaySummaryFirebase;

    showPopup("dayHistoryPopup");
}
function loadDaySummaryFirebase() {

    let index = document.getElementById("dayHistoryDateSelect").selectedIndex;
    let d = window._daysData[index];

    if (!d) return;

    let s1 = d.shift1 || {};
    let s2 = d.shift2 || {};
    let c = d.combined || {};

document.getElementById("dayShift1Body").innerHTML = `
<tr>
<td colspan="7">
    <div class="summary-box">

        <div class="summary-row">
            <span>🎮 Game</span>
            <span>${s1.gameTotal || 0}</span>
        </div>

        <div class="summary-row">
            <span>🍔 Canteen</span>
            <span>${s1.canteenTotal || 0}</span>
        </div>

        <div class="summary-row">
            <span>💰 Game Collection</span>
            <span>${s1.gameCollection || 0}</span>
        </div>

        <div class="summary-row">
            <span>🧾 Canteen Collection</span>
            <span>${s1.canteenCollection || 0}</span>
        </div>

        <div class="summary-row">
            <span>⚖️ Balance</span>
            <span>${(s1.gameBalance || 0) + (s1.canteenBalance || 0)}</span>
        </div>

        <div class="summary-row">
            <span>💸 Expenses</span>
            <span>${s1.expenses || 0}</span>
        </div>

        <div class="summary-row total">
            <span>💵 Cash</span>
            <span>${s1.closingCash || 0}</span>
        </div>

    </div>
</td>
</tr>
`;

document.getElementById("dayShift2Body").innerHTML = `
<tr>
<td colspan="7">
    <div class="summary-box">

        <div class="summary-row">
            <span>🎮 Game</span>
            <span>${s2.gameTotal || 0}</span>
        </div>

        <div class="summary-row">
            <span>🍔 Canteen</span>
            <span>${s2.canteenTotal || 0}</span>
        </div>

        <div class="summary-row">
            <span>💰 Game Collection</span>
            <span>${s2.gameCollection || 0}</span>
        </div>

        <div class="summary-row">
            <span>🧾 Canteen Collection</span>
            <span>${s2.canteenCollection || 0}</span>
        </div>

        <div class="summary-row">
            <span>⚖️ Balance</span>
            <span>${(s2.gameBalance || 0) + (s2.canteenBalance || 0)}</span>
        </div>

        <div class="summary-row">
            <span>💸 Expenses</span>
            <span>${s2.expenses || 0}</span>
        </div>

        <div class="summary-row total">
            <span>💵 Cash</span>
            <span>${s2.closingCash || 0}</span>
        </div>

    </div>
</td>
</tr>
`;

    document.getElementById("dayCombinedBody").innerHTML = `
    <tr>
        <td>${c.gameTotal || 0}</td>
        <td>${c.canteenTotal || 0}</td>
        <td>${c.gameCollection || 0}</td>
        <td>${c.canteenCollection || 0}</td>
        <td>${c.gameBalance || 0}</td>
        <td>${c.canteenBalance || 0}</td>
        <td>${c.expenses || 0}</td>
        <td>${c.closingCash || 0}</td>

        <!-- ✅ MAIN FIX -->
        <td>
    ${d.date}<br>
    (${s1.startMs ? new Date(s1.startMs).toLocaleTimeString('en-PK', {
    timeZone: 'Asia/Karachi',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
}) : "-"}
     →
     ${s2.endMs ? new Date(s2.endMs).toLocaleTimeString('en-PK', {
    timeZone: 'Asia/Karachi',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
}) : "-"})
</td>
    </tr>
`;
}

/******************************************************
 * 🟢 BUILD DAY SUMMARY (SHIFT 1 + SHIFT 2 + COMBINED)
 ******************************************************/


/******************************************************
 * 🟢 BUILD A SINGLE SUMMARY ROW
 ******************************************************/
function buildDayRow(s) {
    return `
        <tr>
            <td>${s.gameTotal}</td>
            <td>${s.canteenTotal}</td>
            <td>${s.gameCollection}</td>
            <td>${s.canteenCollection}</td>
            <td>${s.gameBalance}</td>
            <td>${s.canteenBalance}</td>
            <td>${s.expenses}</td>
            <td>${s.closingCash}</td>
        </tr>
    `;

}


/******************************************************
 * 🟢 OPEN TABLE HISTORY POPUP
 ******************************************************/
function openTableHistory() {

    let dateSel = document.getElementById("tableHistoryDateSelect");
    dateSel.innerHTML = "";

    // 🔥 Firebase day history use karo
    (window._daysData || []).forEach((d, i) => {
        let openTime = d.shift1?.startMs 
    ? new Date(d.shift1.startMs).toLocaleTimeString('en-PK', {
    timeZone: 'Asia/Karachi',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
}) 
    : "-";

let closeTime = d.shift2?.endMs 
    ? new Date(d.shift2.endMs).toLocaleTimeString('en-PK', {
    timeZone: 'Asia/Karachi',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
}) 
    : "-";

dateSel.innerHTML += `
<option value="${i}">
    ${d.date} (${openTime} → ${closeTime})
</option>`;
    });

    let tableSel = document.getElementById("tableHistoryTableSelect");
    tableSel.innerHTML = tables
        .map(t => `<option value="${t.id}">${t.name}</option>`)
        .join("");

    document.getElementById("tableHistoryBranch").innerText =
        "Branch: " + (BRANCH || "Rasson1");

    loadSelectedTableHistory();

    showPopup("tableHistoryPopup");

    document.getElementById("tableHistoryDateSelect").onchange = loadSelectedTableHistory;
    document.getElementById("tableHistoryTableSelect").onchange = loadSelectedTableHistory;
}

/******************************************************
 * 🟢 LOAD SUMMARY FOR SELECTED TABLE
 ******************************************************/
function loadSelectedTableHistory() {

    let tableId = document.getElementById("tableHistoryTableSelect").value;
    let t = tables.find(x => String(x.id) === String(tableId));

    if (!t) return;


let dayIndex = document.getElementById("tableHistoryDateSelect").selectedIndex;

if (!window._daysData || dayIndex < 0 || !window._daysData[dayIndex]) {
    console.log("⚠️ No day data found");
    return;
}

let selectedDay = window._daysData[dayIndex];

if (!selectedDay) return;

// 🔥 find table from firebase day data
let tableData = selectedDay.tables?.find(tb => tb.table_id === t.name);

// agar data na mile
if (!tableData) {
    document.getElementById("tableShift1Body").innerHTML = buildTableHistoryRow(t, {});
    document.getElementById("tableShift2Body").innerHTML = buildTableHistoryRow(t, {});
    document.getElementById("tableCombinedBody").innerHTML = buildTableHistoryRow(t, {});
    return;
}

// 🔥 calculate from history
let t1 = { time:0, game:0, canteen:0, total:0 };
let t2 = { time:0, game:0, canteen:0, total:0 };

// 👉 simple version (full day same data)
let s1 = selectedDay.shift1;
let s2 = selectedDay.shift2;

// 🔥 SHIFT 1 CALC
tableData.history.forEach(h => {
    if (s1 && h.checkin >= s1.startMs && h.checkout <= s1.endMs) {
        t1.time += h.playSeconds || 0;
        t1.game += h.amount || 0;
        t1.canteen += h.canteenAmount || 0;
        t1.total += h.total || 0;
    }
});

// 🔥 SHIFT 2 CALC
tableData.history.forEach(h => {
    if (s2 && h.checkin >= s2.startMs && h.checkout <= s2.endMs) {
        t2.time += h.playSeconds || 0;
        t2.game += h.amount || 0;
        t2.canteen += h.canteenAmount || 0;
        t2.total += h.total || 0;
    }
});

let combined = {
    time: t1.time + t2.time,
    game: t1.game + t2.game,
    canteen: t1.canteen + t2.canteen,
    total: t1.total + t2.total
};

document.getElementById("tableShift1Body").innerHTML = buildTableHistoryRow(t, t1);
document.getElementById("tableShift2Body").innerHTML = buildTableHistoryRow(t, t2);
document.getElementById("tableCombinedBody").innerHTML = buildTableHistoryRow(t, combined);
    
}

/******************************************************
 * 🟢 CALCULATE TABLE SUMMARY FOR SPECIFIC SHIFT
 ******************************************************/
function getTableShiftTotalsFromDay(t, shiftData) {

    if (!shiftData || !shiftData.startMs || !shiftData.endMs) {
        return { time: 0, game: 0, canteen: 0, total: 0 };
    }

    let start = shiftData.startMs;
    let end = shiftData.endMs;

    let total = 0;
    let game = 0;
    let canteen = 0;
    let time = 0;

    t.history.forEach(h => {

        if (h.checkin >= start && h.checkout <= end) {

            total += Number(h.total || 0);
            game += Number(h.amount || 0);
            canteen += Number(h.canteenAmount || 0);
            time += Number(h.playSeconds || 0);
        }
    });

    return { total, game, canteen, time };
}


/******************************************************
 * 🟢 BUILD TABLE HISTORY ROW
 ******************************************************/
function buildTableHistoryRow(t, d) {
    return `
    <tr>
    <td colspan="4">
        <div class="history-box">

            <div class="history-title">
                🎱 ${t.name}
            </div>

            <div class="history-row">
                <span>⏱ Play Time</span>
                <span>${formatSeconds(d.time || 0)}</span>
            </div>

            <div class="history-row">
                <span>🎮 Game</span>
                <span>${d.game || 0}</span>
            </div>

            <div class="history-row">
                <span>🍔 Canteen</span>
                <span>${d.canteen || 0}</span>
            </div>

            <div class="history-row total">
                <span>💵 Total</span>
                <span>${d.total || 0}</span>
            </div>

        </div>
    </td>
    </tr>
    `;
}
/******************************************************
 * TABLE HISTORY PAGINATION (FINAL FIX)
 ******************************************************/

let historyPage = 1;
let historyPerPage = 5;  // 5 rows per page (you can change this)

function nextPage() {
    let tableId = document.getElementById("tableHistoryTableSelect").value;
    let t = tables.find(x => String(x.id) === String(tableId));

    if (!t || t.history.length === 0) return;

    let maxPage = Math.ceil(t.history.length / historyPerPage);
    if (historyPage < maxPage) {
        historyPage++;
        renderHistoryPage();
    }
}

function prevPage() {
    if (historyPage > 1) {
        historyPage--;
        renderHistoryPage();
    }
}

function renderHistoryPage() {

    let tableId = document.getElementById("tableHistoryTableSelect").value;
    let t = tables.find(x => String(x.id) === String(tableId));

    let body = document.getElementById("historyTableBody");
    body.innerHTML = "";

    if (!t || t.history.length === 0) {
        body.innerHTML = "<tr><td colspan='9'>No history found.</td></tr>";
        return;
    }

    let start = (historyPage - 1) * historyPerPage;
    let end = start + historyPerPage;

    let pageRows = t.history.slice(start, end);

    pageRows.forEach((h, index) => {
        body.innerHTML += `
            <tr>
                <td>${start + index + 1}</td>
                <td>${formatTime(h.checkin)}</td>
                <td>${formatTime(h.checkout)}</td>
                <td>${formatSeconds(h.playSeconds)}</td>
                <td>${h.rate}</td>
                <td>${h.amount}</td>
                <td>${h.canteenAmount}</td>
                <td>${h.total}</td>
<td>
${h.paid
    ? `<button class="paid-btn" disabled>PAID</button>`
    : `<button class="unpaid-btn" onclick="openBillFromHistory('${tableId}', ${start + index})">UNPAID</button>`
}
</td>


            </tr>
        `;
    });

    // Update current page number display
    document.getElementById("pageNumber").innerText = historyPage;
}

/******************************************************
 * 🟢 RESTORE TIMERS ON PAGE LOAD
 ******************************************************/
function restoreTimers() {

    tables.forEach(t => {

        if (t.isRunning) {
            runTimer(t.id);
        }

        updateDisplay(t.id);
        if (t.isRunning) {
    updateButtons(t.id, "running");
}
else if (t.afterCheckout) {
    updateButtons(t.id, "afterCheckout");   // ✅ FIX
}
else {
    updateButtons(t.id, "idle");
}
    });
}

// ===============================================
// AUTO SYNC OFFLINE QUEUE EVERY 5 SEC
// ===============================================



// ✅ FIX: HTML BUTTON ACCESS
window.checkIn = checkIn;
window.checkOut = checkOut;
window.openHistory = openHistory;
window.editTable = editTable;
window.deleteTableOpen = deleteTableOpen;
window.openCanteen = openCanteen;
window.openTableShift = openTableShift;
window.showBill = showBill;
window.handleRateChange = handleRateChange;
// 🔥 ADD THIS
window.addItem = addItem;
window.removeItem = removeItem;
window.openBillFromHistory = openBillFromHistory;


//thernal bill print 
function printThermalBill(id, historyData = null) {

    let t = tables.find(x => String(x.id) === String(id));
let h = historyData;
    if (!t) return;

    let academy = "Rasson Snooker Academy";
    let branch = BRANCH || "rasson1";

    let checkin = h ? formatTime(h.checkin) : (t.checkinTime ? formatTime(t.checkinTime) : "--");
    let checkout = h ? formatTime(h.checkout) : (t.checkoutTime ? formatTime(t.checkoutTime) : "--");
    let playtime = h ? formatSeconds(h.playSeconds) : formatSeconds(t.finalSeconds || t.playSeconds);

    let gameAmount = h ? h.amount : (t.finalAmount || t.liveAmount);

    // 🔥 CANTEEN
    let canteenHTML = "";
    let canteenTotal = 0;

    let itemsSource = h ? h.canteenItems : t.canteenItems;

Object.values(itemsSource || {}).forEach(item => {
        let total = item.qty * item.price;
        canteenTotal += total;

        canteenHTML += `
        <div style="display:flex; justify-content:space-between;">
            <span>${item.name} x${item.qty}</span>
            <span>${total}</span>
        </div>`;
    });

    if (!canteenHTML) canteenHTML = "<div>No items</div>";

    let finalTotal = gameAmount + canteenTotal;

    // 🔥 PRINT WINDOW
    let win = window.open("", "", "width=300,height=600");

    win.document.write(`
    <html>
    <head>
        <title>Print</title>
        <style>
            body { font-family: monospace; width: 250px; margin: auto; }
            .center { text-align:center; }
            .row { display:flex; justify-content:space-between; }
            hr { border:1px dashed #000; }
        </style>
    </head>
    <body>

        <div class="center">
            <img src="../assets/bill-logo.png" width="80"><br>
            <b>${academy}</b><br>
            ${branch}
        </div>

        <hr>

        <div>Table: ${t.name}</div>
        <div>In: ${checkin}</div>
        <div>Out: ${checkout}</div>
        <div>Time: ${playtime}</div>

        <hr>

        <div><b>Game</b></div>
        <div class="row"><span>Charges</span><span>${gameAmount}</span></div>

        <hr>

        <div><b>Canteen</b></div>
        ${canteenHTML}

        <div class="row"><b>Canteen Total</b><b>${canteenTotal}</b></div>

        <hr>

        <div class="row"><b>Total</b><b>${finalTotal}</b></div>

        <hr>

        <div class="center">
            <img src="../assets/QR-bill.png" width="80"><br>
            Scan & Pay
        </div>

        <hr>

        <div class="center">Thank you ❤️</div>

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


async function restoreRunningTables() {

    const q = query(
        collection(window.db, "sessions"),
        where("branch", "==", BRANCH),
        where("end_time", "==", null)
    );

    const snap = await getDocs(q);

    snap.forEach(docSnap => {

        const s = docSnap.data();

        let t = tables.find(x => x.name === s.table_id);
        if (!t) return;

        let start = new Date(s.start_time).getTime();

        // 🔥 FIX: if time is too old (more than 12 hours), ignore
        let now = Date.now();
        let diffHours = (now - start) / (1000 * 60 * 60);

        if (diffHours > 12) {
            console.log("⚠️ OLD SESSION IGNORED:", s);
            return;
        }

        t.isRunning = true;
t.checkinTime = start;

// 🔥 IMPORTANT RESET
t.afterCheckout = false;

runTimer(t.id);
    });

    renderTables();
}



function listenRunningSessionsRealtime() {


    const q = query(
        collection(window.db, "sessions"),
        where("branch", "==", BRANCH),
        where("end_time", "==", null)
    );

    onSnapshot(q, (snapshot) => {

        // 🔄 reset all tables first
        let activeTables = new Set();

snapshot.forEach(docSnap => {
    const s = docSnap.data();
    activeTables.add(s.table_id);
});

tables.forEach(t => {

    if (t.afterCheckout) return;

    if (activeTables.has(t.name)) {
        t.isRunning = true;
    } else {
        t.isRunning = false;
    }

});
        snapshot.forEach(docSnap => {

            const s = docSnap.data();

            let t = tables.find(x => x.name === s.table_id);
            if (!t) return;

            let start = new Date(s.start_time).getTime();

            let now = Date.now();
            let diffHours = (now - start) / (1000 * 60 * 60);

            if (diffHours > 12){
                console.log("⚠️ OLD SESSION IGNORED:", s);
                return;
            }

            // ❌ AGAR CHECKOUT HO CHUKA HAI TO IGNORE
if (t.afterCheckout) return;

t.isRunning = true;
t.checkinTime = start;

runTimer(t.id);
        });

        renderTables();

// 🔥 FORCE STATE FROM SESSIONS
setTimeout(() => {

    tables.forEach(t => {

        // 🔥 AGAR SESSION ACTIVE HAI → FORCE RUNNING
        if (activeTables.has(t.name)) {
    t.isRunning = true;
} else {
    t.isRunning = false;
}

        updateDisplay(t.id);

        if (t.afterCheckout) {
            updateButtons(t.id, "afterCheckout");
        }
        else if (t.isRunning) {
            updateButtons(t.id, "running");
        }
        else {
            updateButtons(t.id, "idle");
        }

    });

}, 100);

}); // ✅ YE MISSING THA
}



function printShiftThermal(title, data, s1 = {}, s2 = {}) {

    if (!data) {
        alert("No data to print ❌");
        return;
    }

    let win = window.open("", "_blank", "width=300,height=600");

    if (!win) {
        alert("Popup blocked ❌");
        return;
    }

    let html = `
    <html>
    <head>
        <title>Print</title>
        <style>
            body { font-family: monospace; width: 250px; margin:auto; }
            .center { text-align:center; }
            .row { display:flex; justify-content:space-between; }
            hr { border:1px dashed #000; }
            .small { font-size:12px; }
        </style>
    </head>
    <body>

        <div class="center">
            <h3>${title}</h3>
            <small>${BRANCH}</small>
        </div>

        <hr>

        <div>
            <b>Shift 1</b><br>
            <span class="small">
                ${s1.openTime || "-"} <br>
                → ${s1.closeTime || "-"}
            </span>
        </div>

        <hr>

        <div>
            <b>Shift 2</b><br>
            <span class="small">
                ${s2.openTime || "-"} <br>
                → ${s2.closeTime || "-"}
            </span>
        </div>

        <hr>

        <div class="row"><span>Game Total</span><span>${data.gameTotal || 0}</span></div>
        <div class="row"><span>Canteen</span><span>${data.canteenTotal || 0}</span></div>

        <hr>

        <div class="row"><span>Game Collection</span><span>${data.gameCollection || 0}</span></div>
        <div class="row"><span>Canteen Collection</span><span>${data.canteenCollection || 0}</span></div>

        <hr>

        <div class="row"><span>Expenses</span><span>${data.expenses || 0}</span></div>

        <hr>

        <div class="row"><b>Closing Cash</b><b>${data.closingCash || 0}</b></div>

        <hr>

        <div class="center">
            {new Date().toLocaleString('en-PK', {
    timeZone: 'Asia/Karachi'
})
        </div>

    </body>
    </html>
    `;

    win.document.open();
    win.document.write(html);
    win.document.close();

    let checkReady = setInterval(() => {
        if (win.document.readyState === "complete") {
            clearInterval(checkReady);

            win.focus();

            setTimeout(() => {
                win.print();
                win.close();
            }, 300);
        }
    }, 50);
}

/// day history thermal print

function printDayHistoryThermal(d) {

    let s1 = d.shift1 || {};
    let s2 = d.shift2 || {};
    let c = d.combined || {};

    let openTime = s1.startMs 
        ? new Date(s1.startMs).toLocaleTimeString('en-PK', {
    timeZone: 'Asia/Karachi',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
}) 
        : "-";

    let closeTime = s2.endMs 
        ? new Date(s2.endMs).toLocaleTimeString('en-PK', {
    timeZone: 'Asia/Karachi',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
}) 
        : "-";

    let win = window.open("", "_blank", "width=300,height=600");

    let html = `
    <html>
    <head>
        <style>
            body { 
                font-family: monospace; 
                width: 250px; 
                margin:auto; 
                text-align:center;
            }
            .row { display:flex; justify-content:space-between; }
            hr { border:1px dashed #000; }
        </style>
    </head>
    <body>

    <h3>Day History</h3>
    <small>${BRANCH}</small>

    <hr>

    <div>
        ${d.date}<br>
        (${openTime} → ${closeTime})
    </div>

    <hr>

<b>Shift 1</b>
<div class="row"><span>Game</span><span>${s1.gameTotal || 0}</span></div>
<div class="row"><span>Canteen</span><span>${s1.canteenTotal || 0}</span></div>
<div class="row"><span>Game Collection</span><span>${s1.gameCollection || 0}</span></div>
<div class="row"><span>Canteen Collection</span><span>${s1.canteenCollection || 0}</span></div>
<div class="row"><span>Balance</span><span>${(s1.gameBalance || 0)+(s1.canteenBalance || 0)}</span></div>
<div class="row"><span>Expenses</span><span>${s1.expenses || 0}</span></div>
<div class="row"><b>Cash</b><b>${s1.closingCash || 0}</b></div>

<hr>

<b>Shift 2</b>
<div class="row"><span>Game</span><span>${s2.gameTotal || 0}</span></div>
<div class="row"><span>Canteen</span><span>${s2.canteenTotal || 0}</span></div>
<div class="row"><span>Game Collection</span><span>${s2.gameCollection || 0}</span></div>
<div class="row"><span>Canteen Collection</span><span>${s2.canteenCollection || 0}</span></div>
<div class="row"><span>Balance</span><span>${(s2.gameBalance || 0)+(s2.canteenBalance || 0)}</span></div>
<div class="row"><span>Expenses</span><span>${s2.expenses || 0}</span></div>
<div class="row"><b>Cash</b><b>${s2.closingCash || 0}</b></div>

<hr>

<b>Combined</b>
<div class="row"><span>Game</span><span>${c.gameTotal || 0}</span></div>
<div class="row"><span>Canteen</span><span>${c.canteenTotal || 0}</span></div>
<div class="row"><span>Collection</span><span>${(c.gameCollection||0)+(c.canteenCollection||0)}</span></div>
<div class="row"><span>Balance</span><span>${(c.gameBalance||0)+(c.canteenBalance||0)}</span></div>
<div class="row"><span>Expenses</span><span>${c.expenses || 0}</span></div>

<hr>

<div class="row"><b>Final Cash</b><b>${c.closingCash || 0}</b></div>

    <hr>

    <div>${new Date().toLocaleString('en-PK', {
    timeZone: 'Asia/Karachi'
})}</div>

    </body>
    </html>
    `;

    win.document.open();
    win.document.write(html);
    win.document.close();

    setTimeout(() => {
        win.print();
        win.close();
    }, 300);
}

/// table history thermal print

function printTableHistoryThermal() {

    let tableId = document.getElementById("tableHistoryTableSelect").value;
    let t = tables.find(x => String(x.id) === String(tableId));

    let dayIndex = document.getElementById("tableHistoryDateSelect").selectedIndex;
    let d = window._daysData[dayIndex];

    if (!t || !d) return;

    let tableData = d.tables?.find(tb => tb.table_id === t.name);

    let total = 0;
    let game = 0;
    let canteen = 0;
    let time = 0;

    (tableData?.history || []).forEach(h => {
        total += h.total || 0;
        game += h.amount || 0;
        canteen += h.canteenAmount || 0;
        time += h.playSeconds || 0;
    });

    let win = window.open("", "_blank", "width=300,height=600");

    let html = `
    <html>
    <head>
        <style>
            body { 
                font-family: monospace; 
                width: 250px; 
                margin:auto; 
                text-align:center;
            }
            .row { display:flex; justify-content:space-between; }
            hr { border:1px dashed #000; }
        </style>
    </head>
    <body>

    <h3>Table History</h3>
    <small>${BRANCH}</small>

    <hr>

    <div>
        ${t.name}<br>
        ${d.date}
    </div>

    <hr>

    <div class="row"><span>Play Time</span><span>${formatSeconds(time)}</span></div>
    <div class="row"><span>Game</span><span>${game}</span></div>
    <div class="row"><span>Canteen</span><span>${canteen}</span></div>

    <hr>

    <div class="row"><b>Total</b><b>${total}</b></div>

    <hr>

    <div>${new Date().toLocaleString('en-PK', {
    timeZone: 'Asia/Karachi'
})}</div>

    </body>
    </html>
    `;

    win.document.open();
    win.document.write(html);
    win.document.close();

    setTimeout(() => {
        win.print();
        win.close();
    }, 300);
}

async function rebuildHistoryFromSessions() {

    const q = query(
        collection(window.db, "sessions"),
        where("branch", "==", BRANCH)
    );

    const snap = await getDocs(q);

    // 🔥 TODAY FILTER
    // 🔥 FIXED (LOCAL DAY SAFE)
let now = new Date();

let startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0, 0, 0, 0
).getTime();

    // 🔥 RESET
    tables.forEach(t => t.history = []);

    snap.forEach(docSnap => {

        const s = docSnap.data();

        // ❌ ignore running
        if (!s.end_time) return;

  

const currentDayId = window.currentDayId;

// ✅ ONLY CURRENT ACTIVE DAY
if (s.day_id != currentDayId) {
    return;
}

        let t = tables.find(x => x.name === s.table_id);
        if (!t) return;

        t.history.push({
            checkin: new Date(s.start_time).getTime(),
            checkout: new Date(s.end_time).getTime(),
            playSeconds: s.final_seconds || 0,
            amount: s.final_amount || 0,
            canteenAmount: s.canteen_total || 0,
            total: (s.final_amount || 0) + (s.canteen_total || 0),
            paid: s.paid === true,
          paidTime: s.paid_time ? new Date(s.paid_time).getTime() : null,
            rate: s.play_type === "century" ? s.century_rate : s.frame_rate,
            canteenItems: s.canteen_items || {}
        });
    });

    console.log("🔥 ONLY TODAY HISTORY LOADED");
}
//fix deployment issues
