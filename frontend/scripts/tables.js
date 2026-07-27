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

// 🔥 CENTRAL DAY SYSTEM (FIREBASE)
async function initCurrentDay() {

    const q = query(
        collection(window.db, "system"),
        where("branch", "==", BRANCH),
        where("type", "==", "current_day"),
        orderBy("created_at", "desc"),
        limit(1)
    );

    const snap = await getDocs(q);

    if (!snap.empty) {

        const docSnap = snap.docs[0];

        if (docSnap) {
            const d = docSnap.data();
            window.currentDayId = d.day_id;
        }

        // 🔥 SAFE CHECK ANDAR HI
        if (!window.currentDayId) {
            console.error("❌ DAY ID NOT SET - CRITICAL");
        }

    } else {

        const newDayId = Date.now();

        await addDoc(collection(window.db, "system"), {
            type: "current_day",
            branch: BRANCH,
            day_id: newDayId,
            created_at: new Date().toISOString()
        });

        window.currentDayId = newDayId;
    }

    console.log("🔥 CENTRAL DAY:", window.currentDayId);
}


let firebaseExpenses = [];
let firebaseEasy = [];
// 🔥 AUTO REFRESH FUNCTION
async function autoRefreshUI() {
    loadShiftsFromFirebase();
    renderTables();
}

const BRANCH = (localStorage.getItem("branch") || "").toLowerCase();
const ROLE = localStorage.getItem("role"); // admin / staff
let inventoryItems = [];


/******************************************************
 * PENDING BOOKING FROM BOOKINGS PAGE
 ******************************************************/

let pendingBookingProceed = null;

try {

    const savedBooking =
        localStorage.getItem("pendingBookingProceed");

    if (savedBooking) {

        pendingBookingProceed =
            JSON.parse(savedBooking);

        console.log(
            "PENDING BOOKING PROCEED:",
            pendingBookingProceed
        );

    }

}
catch (error) {

    console.error(
        "PENDING BOOKING READ ERROR:",
        error
    );

    pendingBookingProceed = null;

}



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
function loadShiftsFromFirebase() {

const q = query(
    collection(window.db, "shifts"),
    where("branch", "==", BRANCH),
    where("day_id", "==", window.currentDayId)
);

onSnapshot(q, (snapshot) => {

    shift1 = null;
    shift2 = null;

    snapshot.forEach(docSnap => {
        const d = docSnap.data();

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

advanceCollection: d.advance_collection || 0,

expenses: d.expenses,
                easypaisa: d.easypaisa || 0,
                discount: d.discount || 0,
                closingCash: d.closing_cash,
                gameBalance: d.game_balance || 0,
               canteenBalance: d.canteen_balance || 0
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

advanceCollection: d.advance_collection || 0,

expenses: d.expenses,
                easypaisa: d.easypaisa || 0,
                discount: d.discount || 0,
                closingCash: d.closing_cash,
                gameBalance: d.game_balance || 0,
                canteenBalance: d.canteen_balance || 0
            };
        }
    });

    // 🔥 BUTTON AUTO UPDATE
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

    console.log("🔥 REALTIME SHIFTS:", shift1, shift2);

});
}

let editTargetId = null;
let deleteTargetId = null;

/******************************************************
 * PAGE LOAD INITIALIZER
 ******************************************************/

document.addEventListener("DOMContentLoaded", async () => {

    await initCurrentDay();

    // 🔥 HARD CHECK
    if (!window.currentDayId) {
        alert("Day system failed ❌");
        return;
    }

    console.log("✅ DAY READY:", window.currentDayId);

    loadShiftsFromFirebase();
    listenExpensesRealtime();
    listenEasyRealtime();
    listenInventoryRealtime();
    listenTablesRealtime();
    listenRunningSessionsRealtime();
    listenHistoryRealtime();

    bindAddTablePopup();
    bindShiftButtons();
    bindHistoryButtons();

    setTimeout(() => {
        restoreTimers();
    }, 500);

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

selectedPlayType: t.play_type || "frame",

selectedRate:
    t.selected_rate ||
    (t.play_type === "century"
        ? Number(t.century_rate || 10)
        : Number(t.frame_rate || 8)),
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

  // 👥 KEEP PLAYER NAMES DURING TABLE REALTIME REFRESH
        player1: old?.player1 || "",
        player2: old?.player2 || "",

        playSeconds: old?.playSeconds || 0,
        liveAmount: old?.liveAmount || 0,

        finalAmount: old?.finalAmount || 0,
        finalSeconds: old?.finalSeconds || 0,

        discount: old?.discount || 0,

        canteenTotal: old?.canteenTotal || 0,
        canteenItems: old?.canteenItems || {},

        history: []
    };
});

setTimeout(async () => {

    // 🔥 IMPORTANT
    if (!tables || tables.length === 0) {
        console.log("⛔ Tables not ready yet");
        return;
    }

    console.log("✅ TABLES READY:", tables.length);

    await rebuildHistoryFromSessions();

    // 🔥 DEBUG
    console.log(
        "✅ HISTORY COUNTS:",
        tables.map(t => ({
            table: t.name,
            history: t.history.length
        }))
    );

    renderTables();

}, 800);
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

/// Expenses from firebase

function listenExpensesRealtime() {

const q = query(
    collection(window.db, "expenses"),
    where("branch", "==", BRANCH)
);

    onSnapshot(q, (snapshot) => {

        firebaseExpenses = [];

        snapshot.forEach(doc => {
            firebaseExpenses.push(doc.data());
        });

        console.log("🔥 FIREBASE EXPENSES:", firebaseExpenses);
      // 🔥 AUTO REFRESH DAY HISTORY
refreshCurrentDayHistory();
    });
}

/// easypaisa from firebase

function listenEasyRealtime() {

const q = query(
    collection(window.db, "easypaisa"),
    where("branch", "==", BRANCH)
);

    onSnapshot(q, (snapshot) => {

        firebaseEasy = [];

        snapshot.forEach(doc => {
            firebaseEasy.push(doc.data());
        });

        console.log("🔥 FIREBASE EASYPAISA:", firebaseEasy);
      // 🔥 AUTO REFRESH DAY HISTORY
refreshCurrentDayHistory();
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
 * PENDING BOOKING FROM BOOKINGS PAGE
 ******************************************************/
function getPendingBookingProceed() {
    try {
        const raw = localStorage.getItem("pendingBookingProceed");

        if (!raw) return null;

        const data = JSON.parse(raw);

        // Branch safety
        if (
            data.branch &&
            typeof BRANCH !== "undefined" &&
            data.branch !== BRANCH
        ) {
            return null;
        }

        return data;

    } catch (error) {
        console.error("Pending booking read error:", error);
        return null;
    }
}


/******************************************************
 * CHECK IF THIS IS THE BOOKED TABLE
 ******************************************************/
function isPendingBookedTable(table) {

    const booking = getPendingBookingProceed();

    if (!booking) return false;

    const bookingResourceId =
        String(booking.resource_id || "").trim();

    const tableId =
        String(table.id || "").trim();

    const tableName =
        String(table.name || "").trim();

    /*
       Primary match = Firebase/table document id
       Fallback = resource/table name
    */
    return (
        bookingResourceId === tableId ||
        bookingResourceId === tableName ||
        String(booking.resource_name || "").trim() === tableName
    );
}

/******************************************************
 * RENDER ALL TABLE CARDS
 ******************************************************/
function renderTables() {
    const box = document.getElementById("tablesContainer");
    box.innerHTML = "";

    // 🔥 SEPARATE LAYOUT SECTIONS
    const tablesSection = document.createElement("div");
    tablesSection.className = "game-section tables-section";

    const roomsSection = document.createElement("div");
    roomsSection.className = "game-section rooms-section";

    const poolSection = document.createElement("div");
    poolSection.className = "game-section pool-section";

    tablesSection.innerHTML = `
        <div class="game-section-title">TABLES</div>
        <div class="game-section-grid" id="tablesGrid"></div>
    `;

    roomsSection.innerHTML = `
        <div class="game-section-title">ROOMS</div>
        <div class="game-section-grid" id="roomsGrid"></div>
    `;

    poolSection.innerHTML = `
        <div class="game-section-title">POOL</div>
        <div class="game-section-grid" id="poolGrid"></div>
    `;

    box.appendChild(tablesSection);
    box.appendChild(roomsSection);
    box.appendChild(poolSection);

    const tablesGrid = tablesSection.querySelector("#tablesGrid");
    const roomsGrid = roomsSection.querySelector("#roomsGrid");
    const poolGrid = poolSection.querySelector("#poolGrid");

// 🔥 SORT TABLES + ROOMS + POOL PROPER ORDER
const sortedTables = [...tables].sort((a, b) => {

    const getType = (name = "") => {
        const n = name.toLowerCase();

        if (n.startsWith("table")) return 1;
        if (n.startsWith("room")) return 2;
        if (n.startsWith("pool")) return 3;

        return 4;
    };

    const typeA = getType(a.name);
    const typeB = getType(b.name);

    // Table → Room → Pool
    if (typeA !== typeB) {
        return typeA - typeB;
    }

    // Number order:
    // Table 1, Table 2...
    // Room 1, Room 2...
    // Pool 1, Pool 2...
    const numA = parseInt(((a.name || "").match(/\d+/) || [0])[0]);
    const numB = parseInt(((b.name || "").match(/\d+/) || [0])[0]);

    return numA - numB;
});


// 🔥 AB LOOP CHANGE KARO
sortedTables.forEach(t => {

        const div = document.createElement("div");
        div.classList.add("table-box");

        const hasPendingBooking =
            isPendingBookedTable(t);

        if (hasPendingBooking) {
            div.classList.add("booking-checkin-card");
        }

        const pendingBooking =
            hasPendingBooking
                ? getPendingBookingProceed()
                : null;

        div.innerHTML = `

            ${
                hasPendingBooking
                    ? `
                    <div class="booking-checkin-badge">
                        BOOKING CHECK-IN
                    </div>

                    <div class="booking-customer-info">
                        ${pendingBooking?.customer_name || "Booked Customer"}
                    </div>
                    `
                    : ""
            }

            <div class="table-title">${t.name}</div>


<!-- 🔥 PLAYER NAMES -->
<div class="player-names-box">
<input
    type="text"
    id="player1-${t.id}"
    class="player-name-input"
    placeholder="Player 1"
    value="${t.player1 || ''}"
    onchange="savePlayerNames('${t.id}')"
>

<input
    type="text"
    id="player2-${t.id}"
    class="player-name-input"
    placeholder="Player 2"
    value="${t.player2 || ''}"
    onchange="savePlayerNames('${t.id}')"
>
</div>

<div class="rate-selector">
<select onchange="handleRateChange('${t.id}', this)">

<option value="frame-${t.frameRate}" 
${(t.selectedPlayType || "frame") === "frame" ? "selected" : ""}>
Frame (${t.frameRate})
</option>

<option value="century-${t.centuryRate}" 
${(t.selectedPlayType || "frame") === "century" ? "selected" : ""}>
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

        // 🔥 CARD KO CORRECT SECTION MEIN ADD KARO
const cardName = String(t.name || "").trim().toLowerCase();

if (cardName.startsWith("table")) {
    tablesGrid.appendChild(div);
}
else if (cardName.startsWith("room")) {
    roomsGrid.appendChild(div);
}
else if (cardName.startsWith("pool")) {
    poolGrid.appendChild(div);
}
else {
    // Unknown type safety
    tablesGrid.appendChild(div);
}

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

    }); // sortedTables.forEach END


    // =====================================================
    // 🔥 HIDE EMPTY TABLE / ROOM / POOL SECTIONS
    // =====================================================

    if (tablesGrid.children.length === 0) {
        tablesSection.style.display = "none";
    } else {
        tablesSection.style.display = "";
    }

    if (roomsGrid.children.length === 0) {
        roomsSection.style.display = "none";
    } else {
        roomsSection.style.display = "";
    }

    if (poolGrid.children.length === 0) {
        poolSection.style.display = "none";
    } else {
        poolSection.style.display = "";
    }


} // renderTables END

/******************************************************
 * SAVE PLAYER NAMES — RUNNING SESSION
 ******************************************************/
async function savePlayerNames(tableId) {

    const t = tables.find(
        x => String(x.id) === String(tableId)
    );

    if (!t || !t.isRunning) return;

    const player1Input =
        document.getElementById(`player1-${tableId}`);

    const player2Input =
        document.getElementById(`player2-${tableId}`);

    const player1 =
        player1Input?.value.trim() || "";

    const player2 =
        player2Input?.value.trim() || "";

    // Local state
    t.player1 = player1;
    t.player2 = player2;

    try {

        // Current running session
        const q = query(
            collection(window.db, "sessions"),
            where("table_id", "==", t.name),
            where("branch", "==", BRANCH),
            where("end_time", "==", null)
        );

        const snap = await getDocs(q);

        if (snap.empty) {
            console.warn(
                "⚠️ Running session not found for players:",
                t.name
            );
            return;
        }

        // Safety: latest running session
        let latestDoc = null;
        let latestTime = 0;

        snap.forEach(docSnap => {

            const data = docSnap.data();

            const time =
                new Date(data.start_time).getTime();

            if (time > latestTime) {
                latestTime = time;
                latestDoc = docSnap;
            }

        });

        if (!latestDoc) return;

        await updateDoc(
            doc(
                window.db,
                "sessions",
                latestDoc.id
            ),
            {
                player1_name: player1,
                player2_name: player2,
                players_updated_at:
                    new Date().toISOString()
            }
        );

        console.log(
            "✅ PLAYER NAMES SAVED:",
            t.name,
            player1 || "Guest Player 1",
            "VS",
            player2 || "Guest Player 2"
        );

    }
    catch (err) {

        console.error(
            "❌ PLAYER NAME SAVE ERROR:",
            err
        );

    }
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

  // 👥 GET PLAYER NAMES BEFORE CHECK-IN
const player1Input =
    document.getElementById(`player1-${id}`);

const player2Input =
    document.getElementById(`player2-${id}`);

t.player1 =
    player1Input?.value.trim() || "";

t.player2 =
    player2Input?.value.trim() || "";

console.log(
    "👥 CHECK-IN PLAYERS:",
    t.player1 || "Guest Player 1",
    "VS",
    t.player2 || "Guest Player 2"
);

// =====================================================
// 🔥 BOOKING PROCEED CHECK
// =====================================================

let bookingForThisTable = null;

if (pendingBookingProceed) {

    const bookingBranch =
        String(pendingBookingProceed.branch || "")
        .replace(/\s+/g, "")
        .toLowerCase();

    const currentBranch =
        String(BRANCH || "")
        .replace(/\s+/g, "")
        .toLowerCase();

    const bookingResourceId =
        String(pendingBookingProceed.resource_id || "");

    const bookingResourceName =
        String(pendingBookingProceed.resource_name || "")
        .trim()
        .toLowerCase();

    const currentTableId =
        String(t.id || "");

    const currentTableName =
        String(t.name || "")
        .trim()
        .toLowerCase();

    // ✅ SAME BRANCH + SAME TABLE/ROOM
    if (
        bookingBranch === currentBranch &&
        (
            bookingResourceId === currentTableId ||
            bookingResourceName === currentTableName
        )
    ) {

        bookingForThisTable = pendingBookingProceed;

        console.log(
            "✅ BOOKING MATCHED WITH TABLE:",
            bookingForThisTable
        );
    }
}
  
  

// 🔥 ADD THIS LOCK (EXACT YAHAIN)
if (window._creatingSession) {
    console.log("⛔ Session already creating...");
    return;
}
window._creatingSession = true;

    t.isRunning = true;
    t.checkinTime = Date.now();
  // 🔥 FREEZE CURRENT SESSION RATE
const currentSelected =
document.querySelector(
`select[onchange="handleRateChange('${t.id}', this)"]`
);

let selectedValue = currentSelected
? currentSelected.value
: `frame-${t.frameRate}`;

const [selectedType, selectedRate] =
selectedValue.split("-");

// 🔥 FINAL FREEZE
t.selectedPlayType = selectedType;

t.selectedRate = Number(selectedRate || 0);

  
    

    t.afterCheckout = false;
    // 🔥 AGAR PREVIOUS BILL UNPAID HAI → VIEW BILL HIDE
updateButtons(id, "idle");
    
    

    t.checkoutTime = null;
    t.playSeconds = 0;
    t.liveAmount = 0;

    t.discount = 0;
  
    t.canteenTotal = 0;
    t.canteenItems = {};

    updateButtons(id, "running");
    runTimer(id);
    

// 🔥 STEP 1: check if already running session exists
const q = query(
    collection(window.db, "sessions"),
    where("table_id", "==", t.name),
    where("branch", "==", BRANCH),
    where("end_time", "==", null),
    where("is_deleted", "==", false)
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
  // =====================================================
// 🔥 CHECK IF THIS TABLE HAS PENDING BOOKING
// =====================================================

  
try {

    const sessionData = {
        table_id: t.name,
        branch: BRANCH,

        start_time: new Date().toISOString(),
        end_time: null,

        play_type: t.selectedPlayType,
        selected_rate: t.selectedRate,

        frame_rate: t.frameRate,
        century_rate: t.centuryRate,

        day_id: window.currentDayId,

        is_deleted: false
    };

    // 👥 PLAYER NAMES
sessionData.player1_name = t.player1 || "";
sessionData.player2_name = t.player2 || "";
sessionData.players_updated_at = new Date().toISOString();
  
    // =====================================================
    // 🔥 ATTACH BOOKING DATA TO SESSION
    // =====================================================
    if (bookingForThisTable) {

        sessionData.booking_id =
            bookingForThisTable.booking_id || null;

        sessionData.booking_customer_name =
            bookingForThisTable.customer_name || "";

        sessionData.booking_customer_phone =
            bookingForThisTable.customer_phone || "";

sessionData.booking_advance =
    Number(bookingForThisTable.advance_amount || 0);

        sessionData.booking_advance_payment_status =
            bookingForThisTable.payment_status || "unpaid";

        sessionData.booking_advance_paid_at =
            bookingForThisTable.advance_paid_at || null;

        sessionData.booking_resource_id =
            bookingForThisTable.resource_id || "";

        sessionData.booking_resource_name =
            bookingForThisTable.resource_name || t.name;

        sessionData.from_booking = true;

        console.log(
            "✅ BOOKING ATTACHED TO SESSION:",
            sessionData
        );
    }
    else {
        sessionData.from_booking = false;
    }

await addDoc(
    collection(window.db, "sessions"),
    sessionData
);

  // =====================================================
// ✅ BOOKING CHECK-IN SUCCESS
// =====================================================

if (bookingForThisTable) {

    console.log(
        "✅ BOOKING SESSION STARTED:",
        bookingForThisTable.booking_id
    );

    // Ab booking session mein permanently attach ho chuki hai.
    // Yellow BOOKING CHECK-IN indicator hata sakte hain.
    localStorage.removeItem(
        "pendingBookingProceed"
    );

    pendingBookingProceed = null;
}


} catch (err) {

    console.error(
        "❌ Session create error:",
        err
    );

} finally {

    // 🔥 LOCK RELEASE (VERY IMPORTANT)
    window._creatingSession = false;
}
}



/******************************************************
 * CHECK-OUT FUNCTION
 ******************************************************/
let pendingPlayerCheckout = null;

function checkOut(id) {

    const t = tables.find(
        x => String(x.id) === String(id)
    );

    if (!t || !t.isRunning) return;

    // Current names from inputs bhi read kar lo
    const player1Input =
        document.getElementById(`player1-${id}`);

    const player2Input =
        document.getElementById(`player2-${id}`);

    const player1 =
        player1Input?.value.trim() ||
        t.player1 ||
        "Guest Player 1";

    const player2 =
        player2Input?.value.trim() ||
        t.player2 ||
        "Guest Player 2";

    pendingPlayerCheckout = {
        tableId: id,
        player1,
        player2
    };

    document.getElementById(
        "playerCheckoutTableName"
    ).innerText = t.name;

    document.getElementById(
        "playerCheckoutVs"
    ).innerText = `${player1} VS ${player2}`;

    document.getElementById(
        "checkoutPlayer1Btn"
    ).innerText = player1;

    document.getElementById(
        "checkoutPlayer2Btn"
    ).innerText = player2;

    document.getElementById(
        "playerCheckoutPopup"
    ).classList.remove("hidden");
}


async function completeCheckOut(id) {

    let t = tables.find(x => String(x.id) === String(id));


// 🔥 FINAL FREEZE (IMPORTANT)
t.afterCheckout = true;
t.isRunning = false; // 🔥 FORCE STOP
t.checkoutTime = Date.now();

t.finalSeconds = t.playSeconds;
t.finalAmount = t.liveAmount;   // ✅ ADD THIS HERE

  // 🔥 DEFAULT DISCOUNT
if (!t.discount) {
    t.discount = 0;
}

  // 🔥 GET CURRENT SELECTED RATE AT CHECKOUT
const currentSelected =
document.querySelector(
`select[onchange="handleRateChange('${t.id}', this)"]`
);

let selectedValue = currentSelected
? currentSelected.value
: `frame-${t.frameRate}`;

const [selectedType, selectedRate] =
selectedValue.split("-");

// 🔥 FINAL CHECKOUT VALUES
t.selectedPlayType = selectedType;
t.selectedRate = Number(selectedRate || 0);

  
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

// 🔥 BOOKING DATA FOR LOCAL HISTORY
let checkoutSessionData = null;

if (latestSession) {

    checkoutSessionData = latestSession.data();

    // Exact same time session + booking dono ke liye
    const checkoutNow =
        new Date().toISOString();

    await updateDoc(
        doc(
            window.db,
            "sessions",
            latestSession.id
        ),
        {
            end_time: checkoutNow,

            original_game_amount:
                t.finalAmount,

            discount:
                t.discount || 0,

            final_game_amount:
                t.finalAmount - (t.discount || 0),

            final_amount:
                t.finalAmount - (t.discount || 0),

            final_seconds:
                t.finalSeconds,

            canteen_total:
                t.canteenTotal,

            selected_rate:
                t.selectedRate || 0,

            selected_play_type:
                t.selectedPlayType || t.playType,

            canteen_items:
                t.canteenItems,

            paid: false,

            day_id:
                window.currentDayId
        }
    );


    // ==========================================
    // 🔥 BOOKING SLOT RELEASE ON CHECKOUT
    // ==========================================

    if (checkoutSessionData?.booking_id) {

        try {

await updateDoc(
    doc(
        window.db,
        "bookings",
        checkoutSessionData.booking_id
    ),
    {
        actual_end_at: checkoutNow,
        checked_out_at: checkoutNow,

        // 🔥 BOOKING COMPLETE ON TABLE CHECKOUT
        status: "completed",
        completed_at: checkoutNow,

        updated_at: checkoutNow
    }
);

            console.log(
                "✅ BOOKING SLOT RELEASED ON CHECKOUT:",
                checkoutSessionData.booking_id
            );

        }

        catch (bookingError) {

            console.error(
                "❌ BOOKING CHECKOUT RELEASE ERROR:",
                bookingError
            );

        }

    }

}

    // 🔥 HISTORY SAVE (CORRECT PLACE)
    if (!t.history) t.history = [];
  
  // 🔥 SAVE HISTORY (MAIN FIX)
if (
    latestSession &&
    !t.history.some(h =>
        String(h.sessionId) === String(latestSession.id)
    )
) {
    t.history.push({
        sessionId: latestSession.id,

    checkin: t.checkinTime,
    checkout: t.checkoutTime,
    playSeconds: t.finalSeconds,
    originalAmount: t.finalAmount,

discount: t.discount || 0,

amount:
    t.finalAmount - (t.discount || 0),
    canteenAmount: t.canteenTotal,
    total:
(
    t.finalAmount -
    (t.discount || 0)
)
+
t.canteenTotal,
    paid: false,
    paidTime: null,
rate: t.selectedRate || 0,

playType: t.selectedPlayType || t.playType,
canteenItems: { ...t.canteenItems },

// 🔥 BOOKING DATA
bookingId:
    checkoutSessionData?.booking_id || null,

bookingAdvance:
    Number(checkoutSessionData?.booking_advance || 0),

bookingAdvancePaymentStatus:
    checkoutSessionData?.booking_advance_payment_status || "unpaid",

bookingAdvancePaidAt:
    checkoutSessionData?.booking_advance_paid_at
        ? new Date(checkoutSessionData.booking_advance_paid_at).getTime()
        : null,

fromBooking:
    checkoutSessionData?.from_booking === true ||
    !!checkoutSessionData?.booking_id,

// 🔥 PAYMENT WILL BE CALCULATED ON PAID
remainingPayment: 0
});
  }



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
    const rate = t.selectedRate || (
    t.playType === "century"
        ? t.centuryRate
        : t.frameRate
);
// 🔥 MINIMUM 10 MINUTES BILLING
let chargeMinutes = Math.ceil(t.playSeconds / 60);

// ✅ minimum 10 minutes
if (chargeMinutes < 10) {
    chargeMinutes = 10;
}

let rawAmount = chargeMinutes * rate;

t.liveAmount = smartRoundAmount(rawAmount);


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

let finalGame = t.afterCheckout
? (
    (t.finalAmount || 0)
    -
    (t.discount || 0)
)
: (t.liveAmount || 0);

let amount =
finalGame + (t.canteenTotal || 0);

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

// 🔥 SMART ROUNDING SYSTEM
function smartRoundAmount(amount) {

    let lastDigit = amount % 10;

    // 1 → 5 = DOWN
    if (lastDigit >= 1 && lastDigit <= 5) {
        return amount - lastDigit;
    }

    // 6 → 9 = UP
    if (lastDigit >= 6 && lastDigit <= 9) {
        return amount + (10 - lastDigit);
    }

    return amount;
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

    let originalAmount =
t.finalAmount || t.liveAmount;

let discount =
t.discount || 0;

let gameAmount =
originalAmount - discount;

  // ==============================================
// 🔥 BOOKING ADVANCE - BILL DISPLAY
// ==============================================

let bookingAdvance = 0;

try {

    const q = query(
        collection(window.db, "sessions"),
        where("table_id", "==", t.name),
        where("branch", "==", BRANCH),
        where("is_deleted", "==", false)
    );

    const snap = await getDocs(q);

    let latestSession = null;
    let latestTime = 0;

    snap.forEach(d => {

        const s = d.data();

        if (!s.end_time) return;

        const endTime =
            new Date(s.end_time).getTime();

        if (endTime > latestTime) {
            latestTime = endTime;
            latestSession = s;
        }

    });

    if (
        latestSession &&
        latestSession.booking_id
    ) {

        bookingAdvance =
            Number(
                latestSession.booking_advance || 0
            );

    }

}
catch (error) {

    console.error(
        "BOOKING ADVANCE READ ERROR:",
        error
    );

    bookingAdvance = 0;
}

let billTotal =
    gameAmount + canteenTotal;

let remainingAmount =
    Math.max(
        0,
        billTotal - bookingAdvance
    );

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
    <p><b>Play Type:</b> ${t.selectedPlayType || t.playType}</p>

<p><b>Rate:</b> Rs ${t.selectedRate || 0}</p>

    <hr>

<p><b>Game Charges</b></p>

<p>Original: Rs ${originalAmount}</p>

<p>Discount: Rs ${discount}</p>

<p>Final: Rs ${gameAmount}</p>

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
    <b>Total Bill</b>
    <b>Rs ${billTotal}</b>
</div>

${bookingAdvance > 0 ? `
<div style="display:flex; justify-content:space-between;">
    <span>Advance Paid</span>
    <span>Rs ${bookingAdvance}</span>
</div>

<hr>

<div style="display:flex; justify-content:space-between; font-size:18px;">
    <b>Remaining</b>
    <b>Rs ${remainingAmount}</b>
</div>
` : ""}

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

  document.getElementById("applyDiscountBtn").onclick =
() => applyDiscount(id);
  
    document.getElementById("cancelBillBtn").onclick =
        () => document.getElementById("billPopup").classList.add("hidden");
}


function applyDiscount(tableId) {

    let t = tables.find(x => String(x.id) === String(tableId));

    if (!t) return;

    let input = document.getElementById("discountInput");

    let discount = Number(input.value || 0);

    let original =
        t.finalAmount || t.liveAmount || 0;

    // ❌ negative block
    if (discount < 0) {
        discount = 0;
    }

    // ❌ over-discount block
    if (discount > original) {
        alert("Discount too high ❌");
        return;
    }

    // ✅ SAVE
    t.discount = discount;

    // ✅ LIVE BILL REFRESH
    showBill(tableId);

  // 🔥 LIVE HISTORY UPDATE
if (t.history && t.history.length > 0) {

    let last = t.history[t.history.length - 1];

    last.discount = discount;

    last.originalAmount = original;

    last.amount = original - discount;

    last.total =
        (original - discount)
        + (last.canteenAmount || 0);
}

// 🔥 RESET INPUT
input.value = 0;
  
    // ✅ VISUAL MESSAGE
    alert("Discount Applied ✅");
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
    where("branch", "==", BRANCH),
    where("is_deleted", "==", false)
);

// 🔥 EXACT UNPAID CHECKED-OUT SESSION KO PAID KARO
const snap = await getDocs(q);

let latestSession = null;
let latestTime = 0;

snap.forEach(d => {

    const data = d.data();

    // Running session nahi chahiye
    if (!data.end_time) return;

    // Already paid session dobara select nahi hoga
    if (data.paid === true) return;

    // Deleted session ignore
    if (data.is_deleted === true) return;

    const time =
        new Date(data.end_time).getTime();

    if (time > latestTime) {

        latestTime = time;

        latestSession = {
            id: d.id,
            ...data
        };
    }
});

if (latestSession) {

    const paidNow =
        new Date().toISOString();


      // ==============================================
    // BOOKING ADVANCE PAYMENT CALCULATION
    // ==============================================

const bookingAdvance =
    (
        latestSession.booking_id &&
        latestSession.booking_advance_payment_status === "paid"
    )
        ? Number(latestSession.booking_advance || 0)
        : 0;

    const gameAfterDiscount =
        Math.max(
            0,
            Number(t.finalAmount || 0)
            - Number(t.discount || 0)
        );

    const canteenAmount =
        Number(t.canteenTotal || 0);

    const totalBillAmount =
        gameAfterDiscount + canteenAmount;

    const remainingPayment =
        Math.max(
            0,
            totalBillAmount - bookingAdvance
        );

  // 🔥 SYNC LOCAL HISTORY WITH PAYMENT
last.originalAmount =
    Number(t.finalAmount || 0);

last.amount =
    gameAfterDiscount;

last.canteenAmount =
    canteenAmount;
  
last.bookingAdvance = bookingAdvance;

last.remainingPayment = remainingPayment;

last.totalBillAmount = totalBillAmount;

last.fromBooking =
    !!latestSession.booking_id;

    console.log("💰 PAYMENT CALCULATION:", {
        gameAfterDiscount,
        canteenAmount,
        totalBillAmount,
        bookingAdvance,
        remainingPayment
    });

    // ==============================================
    // EXISTING SESSION PAYMENT
    // ==============================================

await updateDoc(
    doc(
        window.db,
        "sessions",
        latestSession.id
    ),
    {
        paid: true,
        paid_time: paidNow,

        // GAME
        discount:
            Number(t.discount || 0),

        original_game_amount:
            Number(t.finalAmount || 0),

        final_game_amount:
            gameAfterDiscount,

        // CANTEEN
        canteen_amount:
            canteenAmount,

        // FULL BILL BEFORE ADVANCE
        total_bill_amount:
            totalBillAmount,

        // BOOKING ADVANCE
        booking_advance:
            bookingAdvance,

        // CUSTOMER SE AB RECEIVE HUA
        remaining_payment:
            remainingPayment,

        // ACTUAL PAYMENT AT PAID BUTTON
        final_amount:
            remainingPayment
    }
);


    // ==============================================
    // BOOKING → COMPLETED
    // Sirf booking se aaye session par chalega
    // ==============================================

    if (latestSession.booking_id) {

        try {

            await updateDoc(
                doc(
                    window.db,
                    "bookings",
                    latestSession.booking_id
                ),
{
    status: "completed",

    completed_at:
        paidNow,

    /*
       Checkout par actual_end_at pehle
       save ho chuka hoga.

       Agar kisi reason se nahi hua,
       Paid par bhi slot release ho jayega.
    */
    actual_end_at:
        latestSession.end_time ||
        paidNow,

    checked_out_at:
        latestSession.end_time ||
        paidNow,

    updated_at:
        paidNow
}
            );

            console.log(
                "✅ BOOKING COMPLETED:",
                latestSession.booking_id
            );

        }
        catch (bookingError) {

            /*
               IMPORTANT:
               Booking update fail hone se
               existing table payment ko
               fail/crash nahi karenge.
            */

            console.error(
                "❌ BOOKING COMPLETE ERROR:",
                bookingError
            );

        }

    }

}

     

    document.getElementById("billPopup").classList.add("hidden");

    // 🔥 UI UPDATE (IMPORTANT)
    updateButtons(id, "afterCheckout");

    printThermalBill(id, last);
  
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
  // ✅ INVENTORY SALE LOG
await addDoc(
    collection(window.db, "inventory_logs"),
    {
        item_name: getItemName(item),
        qty: 1,
        type: "sale",
        branch: BRANCH,
        created_at: new Date().toISOString()
    }
);

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


        // ==========================================
    // HISTORY SUMMARY COUNTERS
    // ==========================================

    const historyList = Array.isArray(t.history)
        ? t.history
        : [];

    const totalGame = historyList.length;

    const bookingPlay = historyList.filter(h =>
        h.fromBooking === true
    ).length;

    const guestPlay = historyList.filter(h =>
        h.fromBooking !== true
    ).length;

    const paidCount = historyList.filter(h =>
        h.paid === true
    ).length;

    const unpaidCount = historyList.filter(h =>
        h.paid !== true
    ).length;

  const paidAmount = historyList
    .filter(h => h.paid === true)
    .reduce((sum, h) => sum + Number(h.total || 0), 0);

const unpaidAmount = historyList
    .filter(h => h.paid !== true)
    .reduce((sum, h) => sum + Number(h.total || 0), 0);

    // UPDATE TOP BOXES
    document.getElementById("historyTotalGame").textContent =
        totalGame;

    document.getElementById("historyGuestPlay").textContent =
        guestPlay;

    document.getElementById("historyBookingPlay").textContent =
        bookingPlay;

    document.getElementById("historyPaidCount").textContent =
        paidCount;

    document.getElementById("historyUnpaidCount").textContent =
        unpaidCount;

    document.getElementById("historyPaidAmount").textContent =
    `Rs. ${paidAmount.toLocaleString()}`;

document.getElementById("historyUnpaidAmount").textContent =
    `Rs. ${unpaidAmount.toLocaleString()}`;
  

  

    let body = document.getElementById("historyTableBody");
  document.getElementById("historyTableTitle").innerText =
`History - ${t.name}`;
    body.innerHTML = "";

    // 🔥 LATEST CHECKOUT FIRST
t.history.sort((a, b) => {
    return b.checkout - a.checkout;
});
    
    if (t.history.length === 0) {
        body.innerHTML = `
            <tr><td colspan="10" style="text-align:center;">No history found.</td></tr>
        `;
    } else {
        t.history.forEach((h, index) => {
            body.innerHTML += `
                <tr>
                    <td>${index + 1}</td>
<td>
    ${formatTime(h.checkin)}

    ${h.fromBooking
        ? `
        <div style="
            margin-top:4px;
            display:inline-block;
            background:#d4af37;
            color:#000;
            padding:2px 7px;
            border-radius:5px;
            font-size:10px;
            font-weight:bold;
        ">
            BOOKING
        </div>
        `
        : ""
    }
</td>

<td>${formatTime(h.checkout)}</td>
<td>${formatSeconds(h.playSeconds)}</td>
<td>${h.rate}</td>
                    
                    <td>${h.originalAmount || h.amount || 0}</td>
                    
                    <td>${h.discount || 0}</td>
                    
                    <td>${h.canteenAmount || 0}</td>
                    
<td>
    ${
        h.fromBooking && Number(h.bookingAdvance || 0) > 0
            ? `
                <div>${h.totalBillAmount || h.total || 0}</div>
                <small style="color:#00ff9d;">
                    Advance: Rs ${h.bookingAdvance || 0}
                </small>
                <br>
                <small style="color:#ffd700;">
                    Remaining: Rs ${h.remainingPayment || 0}
                </small>
              `
            : `${h.total || 0}`
    }
</td>

<td>
    ${
        h.paid
            ? `<button class="paid-btn" disabled>PAID</button>`
            : `<button class="unpaid-btn" onclick="openBillFromHistory('${id}', ${index})">UNPAID</button>`
    }
</td>

<td>
${ROLE === "admin"
? `
<input 
type="checkbox"
class="historyDeleteCheck"
value="${index}"
>
`
: "-"
}
</td>

                </tr>
            `;
        });
    }

    document.getElementById("historyPopup").classList.remove("hidden");

    document.getElementById("closeHistoryBtn").onclick =
        () => document.getElementById("historyPopup").classList.add("hidden");

  const deleteBtn = document.getElementById("deleteSelectedHistoryBtn");

// 🔥 only admin
if (ROLE === "admin") {

    deleteBtn.classList.remove("hidden");

    deleteBtn.onclick = async () => {

        const checks = document.querySelectorAll(
            ".historyDeleteCheck:checked"
        );

        if (checks.length === 0) {
            alert("Select history first ❌");
            return;
        }

        const ok = confirm(
            `Delete ${checks.length} sessions ?`
        );

        if (!ok) return;

        // reverse delete important
        const indexes = [...checks]
            .map(c => Number(c.value))
            .sort((a,b) => b - a);

// 🔥 FAST MULTIPLE DELETE
for (const i of indexes) {
    await softDeleteSession(id, i);
}

// 🔥 ONLY ONE REFRESH
await rebuildHistoryFromSessions();

renderTables();

openHistory(id);

// 🔥 ONLY ONE SUCCESS ALERT
alert(`${indexes.length} sessions deleted successfully ✅`);
    };

} else {

    deleteBtn.classList.add("hidden");
}
  
}

function openBillFromHistory(tableId, historyIndex) {

    let t = tables.find(x => String(x.id) === String(tableId));
    let h = t.history[historyIndex];

    if (!t || !h) {
    alert("Bill data not found ❌");
    return;
}
    

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
        where("branch", "==", BRANCH),
      where("is_deleted", "==", false)
    );

    const snap = await getDocs(q);

    let targetSession = null;

    snap.forEach(d => {
        const data = d.data();

const startDiff = Math.abs(
    new Date(data.start_time).getTime() - h.checkin
);

const endDiff = Math.abs(
    new Date(data.end_time).getTime() - h.checkout
);

if (startDiff < 5000 && endDiff < 5000) {
    targetSession = d;
}
    });

if (targetSession) {

    const sessionData = targetSession.data();

    const fullGameAmount = Number(
        sessionData.final_game_amount ??
        sessionData.final_amount ??
        0
    );

    const bookingAdvance = Number(
        sessionData.booking_advance || 0
    );

    const isBookingSession =
        sessionData.from_booking === true ||
        !!sessionData.booking_id;

    // Advance sirf GAME collection se minus hoga.
    // Canteen collection ko touch nahi karna.
    const collectedGameAmount = isBookingSession
        ? Math.max(0, fullGameAmount - bookingAdvance)
        : fullGameAmount;

    const paidAt = new Date().toISOString();

    console.log("🔥 HISTORY PAYMENT:", {
        fullGameAmount,
        bookingAdvance,
        isBookingSession,
        collectedGameAmount
    });

    await updateDoc(
        doc(window.db, "sessions", targetSession.id),
        {
            paid: true,
            paid_time: paidAt,

            // 🔥 amount actually collected NOW
            game_collection_amount: collectedGameAmount
        }
    );

    // local history sync
    h.paid = true;
    h.paidTime = new Date(paidAt).getTime();
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

const originalAmount =
h.originalAmount || h.amount || 0;

const discount =
h.discount || 0;

const gameAmount =
originalAmount - discount;

const finalTotal =
gameAmount + canteenTotal;


  // ==============================================
// BOOKING ADVANCE — HISTORY BILL DISPLAY
// ==============================================

const isBookingSession =
    h.fromBooking === true;

const bookingAdvance =
    isBookingSession
        ? Number(h.bookingAdvance || 0)
        : 0;

const totalBillAmount =
    Number(
        h.totalBillAmount ??
        finalTotal
    );

const remainingPayment =
    isBookingSession
        ? Number(
            h.remainingPayment ??
            Math.max(0, totalBillAmount - bookingAdvance)
        )
        : finalTotal;
  

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
    <p><b>Play Type:</b> ${h.playType || "frame"}</p>
    <p><b>Rate:</b> Rs ${h.rate || 0}</p>

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
    <span>Original</span>
    <span>Rs ${originalAmount}</span>
</div>

<div style="display:flex; justify-content:space-between;">
    <span>Discount</span>
    <span>Rs ${discount}</span>
</div>

<div style="display:flex; justify-content:space-between;">
    <span>Final Game</span>
    <span>Rs ${gameAmount}</span>
</div>

    <hr>

<!-- 🔥 FINAL TOTAL -->
<div style="display:flex; justify-content:space-between; font-size:18px;">
    <b>Total Bill</b>
    <b>Rs ${totalBillAmount}</b>
</div>

${isBookingSession ? `
    <hr>

    <div style="display:flex; justify-content:space-between;">
        <span>Booking Advance</span>
        <span>Rs ${bookingAdvance}</span>
    </div>

    <div style="display:flex; justify-content:space-between; font-size:18px; margin-top:8px;">
        <b>Remaining</b>
        <b>Rs ${remainingPayment}</b>
    </div>
` : ""}

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
async function openShiftSummary() {

    let btn = document.getElementById("shiftCloseBtn");
    let summaryBody = document.getElementById("shiftSummaryBody");
    let title = document.getElementById("shiftSummaryTitle");

    // ==========================================
    // TITLE / BUTTON
    // ==========================================
    if (btn.innerText.includes("Day")) {

        title.innerText = "Day Summary";

        document.getElementById(
            "confirmShiftCloseBtn"
        ).innerText = "Close Day";

    } else {

        title.innerText = "Shift Summary";

        document.getElementById(
            "confirmShiftCloseBtn"
        ).innerText = "Close Shift";
    }


    // ==========================================
    // ALWAYS REBUILD LATEST SESSION HISTORY
    // ==========================================
    await rebuildHistoryFromSessions();


    let s1 = shift1 ? { ...shift1 } : null;
    let s2 = shift2 ? { ...shift2 } : null;

    const now = Date.now();


    // ==========================================
    // SHIFT 1 NOT CLOSED YET
    // SHOW LIVE SHIFT 1
    // ==========================================
    if (!shift1) {

        let startMs = now;

        const allHistory =
            tables.flatMap(t => t.history || []);

      console.log("========== SHIFT DEBUG ==========");

console.log("CURRENT DAY ID:", window.currentDayId);

console.table(
    allHistory.map(h => ({
        checkin: h.checkin
            ? new Date(h.checkin).toLocaleString()
            : null,

        checkout: h.checkout
            ? new Date(h.checkout).toLocaleString()
            : null,

        originalAmount: h.originalAmount,
        discount: h.discount,
        amount: h.amount,

        paid: h.paid,

        paidTime: h.paidTime
            ? new Date(h.paidTime).toLocaleString()
            : null,

        playType: h.playType,
        rate: h.rate
    }))
);

console.log("TOTAL HISTORY:", allHistory.length);

console.log(
    "GAME TOTAL:",
    allHistory.reduce(
        (sum, h) => sum + Number(h.amount || 0),
        0
    )
);

console.log("=================================");

        if (allHistory.length > 0) {

            const firstSession =
                [...allHistory]
                .filter(h => h.checkin)
                .sort((a, b) => a.checkin - b.checkin)[0];

            if (firstSession?.checkin) {
                startMs = firstSession.checkin;
            }
        }


        // ======================================
        // RUNNING SESSION MAY BE FIRST SESSION
        // ======================================
        tables.forEach(t => {

            if (
                t.isRunning &&
                t.checkinTime &&
                t.checkinTime < startMs
            ) {
                startMs = t.checkinTime;
            }

        });


        // Safety
        if (!startMs || startMs > now) {
            startMs = now - 1000;
        }


        const liveData =
            calculateShiftSnapshot(
                startMs,
                now
            );


        // ======================================
        // BOOKING ADVANCE
        // ======================================
const bookingAdvance =
    await getBookingAdvanceCollection(
        startMs,
        now,
        1
    );


liveData.advanceCollection = bookingAdvance;

liveData.closingCash =
    (
        liveData.gameCollection +
        liveData.canteenCollection +
        liveData.advanceCollection
    )
    -
    liveData.expenses
    -
    liveData.easypaisa;

        s1 = {

            shift: 1,

            openTime:
                new Date(startMs)
                .toLocaleString(
                    "en-PK",
                    {
                        timeZone:
                            "Asia/Karachi"
                    }
                ),

            closeTime: "Running",

            startMs,
            endMs: now,

            ...liveData
        };
    }


    // ==========================================
    // SHIFT 1 CLOSED
    // SHIFT 2 CURRENTLY RUNNING
    // ==========================================
    else if (shift1 && !shift2) {

        let startMs =
            Number(shift1.endMs || 0);

        if (!startMs) {
            startMs = now - 1000;
        }


        const liveData =
            calculateShiftSnapshot(
                startMs,
                now
            );


        // ======================================
        // BOOKING ADVANCE SHIFT 2
        // ======================================
const bookingAdvance =
    await getBookingAdvanceCollection(
        startMs,
        now,
        2
    );

liveData.advanceCollection = bookingAdvance;

liveData.closingCash =
    (
        liveData.gameCollection +
        liveData.canteenCollection +
        liveData.advanceCollection
    )
    -
    liveData.expenses
    -
    liveData.easypaisa;


        s2 = {

            shift: 2,

            openTime:
                new Date(startMs)
                .toLocaleString(
                    "en-PK",
                    {
                        timeZone:
                            "Asia/Karachi"
                    }
                ),

            closeTime: "Running",

            startMs,
            endMs: now,

            ...liveData
        };
    }


    // ==========================================
    // COMBINED
    // ==========================================
    let combined = null;

    if (s1 && s2) {

        combined = {

            gameTotal:
                Number(s1.gameTotal || 0)
                +
                Number(s2.gameTotal || 0),

            canteenTotal:
                Number(s1.canteenTotal || 0)
                +
                Number(s2.canteenTotal || 0),

            gameCollection:
                Number(s1.gameCollection || 0)
                +
                Number(s2.gameCollection || 0),

            canteenCollection:
                Number(s1.canteenCollection || 0)
                +
                Number(s2.canteenCollection || 0),

            gameBalance:
                Number(s1.gameBalance || 0)
                +
                Number(s2.gameBalance || 0),

            canteenBalance:
                Number(s1.canteenBalance || 0)
                +
                Number(s2.canteenBalance || 0),

            discount:
                Number(s1.discount || 0)
                +
                Number(s2.discount || 0),

            expenses:
                Number(s1.expenses || 0)
                +
                Number(s2.expenses || 0),

            easypaisa:
                Number(s1.easypaisa || 0)
                +
                Number(s2.easypaisa || 0)
        };


combined.closingCash =
    (
        combined.gameCollection +
        combined.canteenCollection +
        combined.advanceCollection
    )
    - combined.expenses
    - (combined.easypaisa || 0);
    }


// ==========================================
// POPUP HTML
// ==========================================
summaryBody.innerHTML = `

<tr>

    <td>Shift 1</td>

    <td>${s1?.gameTotal || 0}</td>

    <td>${s1?.canteenTotal || 0}</td>

    <td>${s1?.gameCollection || 0}</td>

    <td>${s1?.advanceCollection || 0}</td>

    <td>${s1?.canteenCollection || 0}</td>

    <td>${s1?.gameBalance || 0}</td>

    <td>${s1?.canteenBalance || 0}</td>

    <td>${s1?.discount || 0}</td>

    <td>${s1?.expenses || 0}</td>

    <td>${s1?.easypaisa || 0}</td>

    <td>${s1?.closingCash || 0}</td>

    <td>${s1?.openTime || "-"}</td>

    <td>${s1?.closeTime || "-"}</td>

</tr>


<tr>

    <td>Shift 2</td>

    <td>${s2?.gameTotal || 0}</td>

    <td>${s2?.canteenTotal || 0}</td>

    <td>${s2?.gameCollection || 0}</td>

    <td>${s2?.advanceCollection || 0}</td>

    <td>${s2?.canteenCollection || 0}</td>

    <td>${s2?.gameBalance || 0}</td>

    <td>${s2?.canteenBalance || 0}</td>

    <td>${s2?.discount || 0}</td>

    <td>${s2?.expenses || 0}</td>

    <td>${s2?.easypaisa || 0}</td>

    <td>${s2?.closingCash || 0}</td>

    <td>${s2?.openTime || "-"}</td>

    <td>${s2?.closeTime || "-"}</td>

</tr>


${combined ? `

<tr class="combined-row">

    <td>Combined</td>

    <td>${Number(s1?.gameTotal || 0) + Number(s2?.gameTotal || 0)}</td>

    <td>${Number(s1?.canteenTotal || 0) + Number(s2?.canteenTotal || 0)}</td>

    <td>${Number(s1?.gameCollection || 0) + Number(s2?.gameCollection || 0)}</td>

    <td>${Number(s1?.advanceCollection || 0) + Number(s2?.advanceCollection || 0)}</td>

    <td>${Number(s1?.canteenCollection || 0) + Number(s2?.canteenCollection || 0)}</td>

    <td>${Number(s1?.gameBalance || 0) + Number(s2?.gameBalance || 0)}</td>

    <td>${Number(s1?.canteenBalance || 0) + Number(s2?.canteenBalance || 0)}</td>

    <td>${Number(s1?.discount || 0) + Number(s2?.discount || 0)}</td>

    <td>${Number(s1?.expenses || 0) + Number(s2?.expenses || 0)}</td>

    <td>${Number(s1?.easypaisa || 0) + Number(s2?.easypaisa || 0)}</td>

    <td>${Number(s1?.closingCash || 0) + Number(s2?.closingCash || 0)}</td>

    <td>-</td>

    <td>-</td>

</tr>

` : ""}

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

// 🔥 FORCE SAFE TIME
let startMs = now - 1000;
let endMs = now;

// ❗ HARD PROTECTION
if (!endMs || endMs < 100000) {
    endMs = Date.now();
}

// ❗ DOUBLE SAFETY
if (!startMs || startMs <= 0) {
    startMs = endMs - 1000;
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

  // 🔥 BOOKING ADVANCE FOR SHIFT 1
const bookingAdvanceCollection =
    await getBookingAdvanceCollection(
        startMs,
        endMs,
        1
    );

// 🔥 ADD ADVANCE TO GAME COLLECTION
shiftData.advanceCollection =
    bookingAdvanceCollection;

// 🔥 RECALCULATE CLOSING CASH
shiftData.closingCash =
    (
        shiftData.gameCollection +
        shiftData.canteenCollection +
        shiftData.advanceCollection
    )
    -
    shiftData.expenses
    -
    shiftData.easypaisa;

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
// 🔥 FIREBASE SAVE SHIFT 1
const docRef = await addDoc(collection(window.db, "shifts"), {
    tables: tables.map(t => ({
        table_id: t.name,
        total: t.history.reduce((sum, h) => sum + (h.total || 0), 0)
    })),
    shift_number: 1,
    branch: BRANCH,

    day_id: window.currentDayId,

    open_time: shift1.openTime,
    close_time: shift1.closeTime,

    start_ms: shift1.startMs,
    end_ms: shift1.endMs,

    game_total: shiftData.gameTotal,
    canteen_total: shiftData.canteenTotal,

game_collection: shiftData.gameCollection,
canteen_collection: shiftData.canteenCollection,

advance_collection: shiftData.advanceCollection || 0,
    expenses: shiftData.expenses,
easypaisa: shiftData.easypaisa,

discount: shiftData.discount || 0,

closing_cash: shiftData.closingCash,

    created_at: new Date().toISOString()
});

// ✅ CHECK AFTER SAVE (YAHAN LAGAO)
if (!docRef?.id) {
    alert("Shift1 save failed ❌");
    return;
}
alert("Shift 1 closed successfully ✅");
  loadShiftsFromFirebase();
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
    loadShiftsFromFirebase();

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

    if (!startMs) {
    console.log("🔥 FALLBACK ACTIVATED");

    // 🔥 NEVER FAIL SYSTEM
    startMs = Date.now() - (60 * 60 * 1000); // 1 hour back
}
}
    let endMs = now;

    
    let shiftData = calculateShiftSnapshot(startMs, endMs);

// 🔥 BOOKING ADVANCE FOR SHIFT 2
const bookingAdvanceCollection =
    await getBookingAdvanceCollection(
        startMs,
        endMs,
        2
    );

// 🔥 ADVANCE SEPARATE COLLECTION
shiftData.advanceCollection =
    bookingAdvanceCollection;

// 🔥 GAME COLLECTION KO TOUCH NAHI KARNA

// 🔥 CLOSING CASH MEIN ADVANCE INCLUDE HOGA
shiftData.closingCash =
    (
        shiftData.gameCollection +
        shiftData.canteenCollection +
        shiftData.advanceCollection
    )
    -
    shiftData.expenses
    -
    shiftData.easypaisa;
  

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

advance_collection: shiftData.advanceCollection || 0,

expenses: shiftData.expenses,
easypaisa: shiftData.easypaisa,

discount: shiftData.discount || 0,

closing_cash: shiftData.closingCash,

    created_at: new Date().toISOString()
});

alert("Shift 2 closed successfully ✅");
  loadShiftsFromFirebase();
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

        advanceCollection: (s1.advanceCollection || 0) +  (s2.advanceCollection || 0),

        gameBalance: (s1.gameBalance || 0) + (s2.gameBalance || 0),
        canteenBalance: (s1.canteenBalance || 0) + (s2.canteenBalance || 0),

        expenses: (s1.expenses || 0) + (s2.expenses || 0),
        
      
        discount:(s1.discount || 0)+(s2.discount || 0),
      
        easypaisa: (s1.easypaisa || 0) + (s2.easypaisa || 0),
    };

combined.closingCash =
    (
        combined.gameCollection +
        combined.canteenCollection +
        combined.advanceCollection
    )
    - combined.expenses
    - (combined.easypaisa || 0); 


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

// 🔥 ONLY BLOCK IF DAY REALLY EXISTS
let alreadyClosed = false;

snap.forEach(docSnap => {

    const d = docSnap.data();

    // ✅ SAME DAY ONLY
    if (String(d.day_id) === String(window.currentDayId)) {
        alreadyClosed = true;
    }
});

if (alreadyClosed) {

    // 🔥 BUTTON RESET
    document.getElementById("shiftCloseBtn").innerText = "Shift 1 Close";

    // 🔥 RESET LOCAL SHIFTS
    shift1 = null;
    shift2 = null;

    // 🔥 FORCE NEW DAY
    const newDayId = Date.now();

    const systemQ = query(
        collection(window.db, "system"),
        where("branch", "==", BRANCH),
        where("type", "==", "current_day")
    );

    const systemSnap = await getDocs(systemQ);

    for (const d of systemSnap.docs) {

        await updateDoc(doc(window.db, "system", d.id), {
            day_id: newDayId,
            created_at: new Date().toISOString()
        });
    }

    window.currentDayId = newDayId;

    alert("Previous day already closed ✅ New day started.");

    hidePopup("shiftSummaryPopup");

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

  // 🔥 BOOKING ADVANCE
advanceCollection:
    Number(s1?.advanceCollection || 0) +
    Number(s2?.advanceCollection || 0),

    expenses: (s1?.expenses || 0) + (s2?.expenses || 0),
  easypaisa: (s1?.easypaisa || 0) + (s2?.easypaisa || 0),
};

printData.closingCash =
    (
        printData.gameCollection +
        printData.canteenCollection +
        printData.advanceCollection
    )
    - printData.expenses
    - (printData.easypaisa || 0);

// 🔥 DEBUG (optional)
console.log("🔥 DAY PRINT DATA:", printData);

// 🔥 PRINT FORMAT AS DAY HISTORY PRINT
printDayHistoryThermal({
    date: today,
    shift1: shift1,
    shift2: shift2,
    combined: {
        gameTotal: printData.gameTotal,
        canteenTotal: printData.canteenTotal,
        gameCollection: printData.gameCollection,
        canteenCollection: printData.canteenCollection,
        advanceCollection: printData.advanceCollection,
        gameBalance: (shift1?.gameBalance || 0) + (shift2?.gameBalance || 0),
        canteenBalance: (shift1?.canteenBalance || 0) + (shift2?.canteenBalance || 0),
        expenses: printData.expenses,
        closingCash: printData.closingCash
    }
});
} catch (err) {
    alert("Error saving day data ❌");
    return;
}


    // 🔥 UPDATE CENTRAL DAY (FIREBASE)
const q = query(
    collection(window.db, "system"),
    where("branch", "==", BRANCH),
    where("type", "==", "current_day")
);

const snap = await getDocs(q);

const newDayId = Date.now();

snap.forEach(async (d) => {
    await updateDoc(doc(window.db, "system", d.id), {
        day_id: newDayId,
        created_at: new Date().toISOString()
    });
});

window.currentDayId = newDayId;

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


// =====================================================
// 🔥 BOOKING ADVANCE COLLECTION FOR SHIFT
// =====================================================
// =====================================================
// 🔥 BOOKING ADVANCE COLLECTION FOR SHIFT - FIXED
// =====================================================
async function getBookingAdvanceCollection(startTime, endTime, shiftNumber) {

    let totalAdvance = 0;

    // Same booking ka advance dobara count na ho
    const countedBookings = new Set();

    try {

        const q = query(
            collection(window.db, "sessions"),
            where("branch", "==", BRANCH)
        );

        const snap = await getDocs(q);

        console.log(
            "🔎 ADVANCE CHECK — sessions found:",
            snap.size
        );

        snap.forEach(docSnap => {

            const s = docSnap.data();

            // Deleted session ignore
            if (s.is_deleted === true) {
                return;
            }

            // Sirf current operational day
            if (
                String(s.day_id || "") !==
                String(window.currentDayId || "")
            ) {
                return;
            }

            // Booking identify
            const bookingId =
                s.booking_id ||
                s.bookingId ||
                null;

            const isBooking =
                s.from_booking === true ||
                s.fromBooking === true ||
                !!bookingId ||
                !!s.booking_advance_paid_at ||
                !!s.bookingAdvancePaidAt;

            if (!isBooking) {
                return;
            }

            // Advance amount
            const advance = Number(
                s.booking_advance ??
                s.bookingAdvance ??
                s.advance_payment ??
                s.advancePayment ??
                s.advance ??
                0
            );

            if (advance <= 0) {
                return;
            }

            // Payment time
            let paidAt = 0;

            const rawPaidAt =
                s.booking_advance_paid_at ??
                s.bookingAdvancePaidAt ??
                s.paidAt ??
                null;

            if (rawPaidAt) {

                if (
                    typeof rawPaidAt === "object" &&
                    typeof rawPaidAt.toMillis === "function"
                ) {
                    paidAt = rawPaidAt.toMillis();

                } else if (
                    typeof rawPaidAt === "object" &&
                    rawPaidAt.seconds
                ) {
                    paidAt = rawPaidAt.seconds * 1000;

                } else {
                    paidAt = new Date(rawPaidAt).getTime();
                }
            }

            console.log("🔎 ADVANCE SESSION:", {
                id: docSnap.id,
                day_id: s.day_id,
                booking_id: bookingId,
                advance,
                paidAt
            });

            /*
             * IMPORTANT:
             *
             * Shift 1:
             * Current operational day ka advance agar
             * Shift 1 start hone se pehle receive hua ho,
             * to bhi Shift 1 mein count hoga.
             *
             * Shift 2:
             * Sirf Shift 2 ke actual time ke andar
             * receive hua advance count hoga.
             */

            let includeAdvance = false;

const isShift1 = Number(shiftNumber) === 1;

            if (isShift1) {

                // Current day ka advance Shift 1 end tak
                if (
                    !paidAt ||
                    paidAt <= Number(endTime)
                ) {
                    includeAdvance = true;
                }

            } else {

                // Shift 2 / normal time range
                if (
                    paidAt &&
                    paidAt >= Number(startTime) &&
                    paidAt <= Number(endTime)
                ) {
                    includeAdvance = true;
                }
            }

            if (!includeAdvance) {
                return;
            }

            // Same booking duplicate protection
            const uniqueKey =
                bookingId
                    ? String(bookingId)
                    : docSnap.id;

            if (countedBookings.has(uniqueKey)) {

                console.log(
                    "⚠️ DUPLICATE ADVANCE SKIPPED:",
                    uniqueKey
                );

                return;
            }

            countedBookings.add(uniqueKey);

            totalAdvance += advance;

            console.log(
                "✅ ADVANCE INCLUDED:",
                advance,
                "BOOKING:",
                uniqueKey,
                "TOTAL:",
                totalAdvance
            );

        });

    } catch (error) {

        console.error(
            "❌ BOOKING ADVANCE SHIFT ERROR:",
            error
        );
    }

    console.log(
        "💰 BOOKING ADVANCE COLLECTION:",
        totalAdvance
    );

    return totalAdvance;
}


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
    let discount = 0;

    tables.forEach(t => {
        t.history.forEach(h => {

let originalGame =
Number(h.originalAmount || h.amount || 0);

let finalGame =
originalGame - Number(h.discount || 0);

let c = Number(h.canteenAmount || 0);

let d = Number(h.discount || 0);

 
 if (h.checkout >= startTime && h.checkout <= endTime) {
discount += d;

            // =========================
            // 🔥 TOTAL (checkout based)
            // =========================

              gameTotal += originalGame;
              
              canteenTotal += c;

                // ❗ UNPAID → balance
              // 🔥 ONLY UNPAID BILLS GO TO BALANCE
              if (!h.paid) {
              
                 gameBalance += Number(h.amount || 0);
              
                 canteenBalance += Number(h.canteenAmount || 0);
              }
            }

// =========================
// 🔥 COLLECTION (paidTime based)
// =========================
if (h.paid && h.paidTime) {

    if (
        h.paidTime >= (startTime - 1000) &&
        h.paidTime <= endTime
    ) {

        // ==========================================
        // BOOKING SESSION
        // Advance pehle receive ho chuka hai.
        // Paid button par sirf remaining collect hoga.
        // ==========================================
        if (h.fromBooking) {

            const remaining =
                Number(h.remainingPayment || 0);

            /*
             * Existing reports gameCollection +
             * canteenCollection ko separately use karte hain.
             *
             * Remaining ko game se pehle adjust karenge,
             * phir jo amount bache woh canteen collection.
             */

            const gameAfterAdvance =
                Math.max(
                    0,
                    remaining - c
                );

            const canteenPaid =
                Math.min(
                    c,
                    remaining
                );

            gameCollection += gameAfterAdvance;
            canteenCollection += canteenPaid;

        } else {

            // ======================================
            // NORMAL NON-BOOKING SESSION
            // Existing logic exactly same
            // ======================================
            gameCollection += finalGame;
            canteenCollection += c;
        }
    }
}

        });
    });

    // =========================
    // 🔥 EXPENSES
    // =========================
    let expenses = firebaseExpenses
    .filter(e => {

        let time = 0;

        if (e.created_at?.seconds) {
            time = e.created_at.seconds * 1000;
        } else if (e.created_at) {
            time = new Date(e.created_at).getTime();
        }

        return time >= startTime && time <= endTime;
    })
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);
    // =========================
    // 🔥 EASYPAISA
    // =========================
  let easypaisa = firebaseEasy
    .filter(e => {

        let time = 0;

        if (e.created_at?.seconds) {
            time = e.created_at.seconds * 1000;
        } else if (e.created_at) {
            time = new Date(e.created_at).getTime();
        }

        return time >= startTime && time <= endTime;
    })
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);

    // =========================
    // 🔥 FINAL BALANCE FIX
    // =========================
    let closingCash = (gameCollection + canteenCollection) - expenses - easypaisa;

    return {
        gameTotal,
        canteenTotal,
        gameCollection,
        canteenCollection,
        gameBalance,
        canteenBalance,
        expenses,
        easypaisa,
        discount,
        closingCash
    };
}


// 🔥 REFRESH CURRENT DAY HISTORY
async function refreshCurrentDayHistory(dayId = null) {

    try {

        console.log("🔥 Refreshing current day history...");
window.historyData = [];
window.combinedHistoryData = [];

        // 🔥 GET CURRENT DAY
dayId = dayId || window.currentDayId;

const q = query(
    collection(window.db, "days"),
    where("branch", "==", BRANCH),
    where("day_id", "==", Number(dayId))
);

        const snap = await getDocs(q);

if (snap.empty) {

    console.log("⏳ Day history not created yet:", dayId);

    return;
}

        // 🔥 REBUILD TABLE HISTORY
        await rebuildSpecificDayHistory(dayId);

        // 🔥 GET SHIFTS
const shiftsQ = query(
    collection(window.db, "shifts"),
    where("branch", "==", BRANCH),
    where("day_id", "==", Number(dayId))
);

        const shiftsSnap = await getDocs(shiftsQ);

        let latestShift1 = null;
        let latestShift2 = null;

        shiftsSnap.forEach(docSnap => {

            const d = docSnap.data();

            if (d.shift_number === 1) {
                latestShift1 = d;
            }

            if (d.shift_number === 2) {
                latestShift2 = d;
            }
        });

        if (!latestShift1 || !latestShift2) {
            console.log("⚠️ Shift data missing");
            return;
        }

// 🔥 RECALCULATE
const newShift1 = calculateShiftSnapshot(
    latestShift1.start_ms,
    latestShift1.end_ms
);

const newShift2 = calculateShiftSnapshot(
    latestShift2.start_ms,
    latestShift2.end_ms
);

// ==========================================
// 🔥 ADD BOOKING ADVANCE TO CORRECT SHIFT
// Advance direct Firebase booking/session data
// se usi shift mein count hoga jisme receive hua
// ==========================================

const shift1BookingAdvance =
    await getBookingAdvanceCollection(
        latestShift1.start_ms,
        latestShift1.end_ms,
        1
    );

const shift2BookingAdvance =
    await getBookingAdvanceCollection(
        latestShift2.start_ms,
        latestShift2.end_ms,
        2
    );

// 🔥 ADVANCE COLLECTION SEPARATE
// 🔥 ADVANCE SEPARATE RAKHO
newShift1.advanceCollection =
    shift1BookingAdvance;

newShift2.advanceCollection =
    shift2BookingAdvance;

// 🔥 CLOSING CASH MEIN ADVANCE INCLUDE KARO
newShift1.closingCash =
    Number(newShift1.closingCash || 0) +
    Number(shift1BookingAdvance || 0);

newShift2.closingCash =
    Number(newShift2.closingCash || 0) +
    Number(shift2BookingAdvance || 0);
        // 🔥 COMBINED
        const combined = {

            gameTotal:
                newShift1.gameTotal + newShift2.gameTotal,

            canteenTotal:
                newShift1.canteenTotal + newShift2.canteenTotal,

            gameCollection:
                newShift1.gameCollection + newShift2.gameCollection,

            canteenCollection:
                newShift1.canteenCollection + newShift2.canteenCollection,

            advanceCollection:
              Number(newShift1.advanceCollection || 0) +
              Number(newShift2.advanceCollection || 0),

            gameBalance:
                newShift1.gameBalance + newShift2.gameBalance,

            canteenBalance:
                newShift1.canteenBalance + newShift2.canteenBalance,

            expenses:
                newShift1.expenses + newShift2.expenses,

            easypaisa:
            newShift1.easypaisa + newShift2.easypaisa,
            
            discount:
            (newShift1.discount || 0)
            +
            (newShift2.discount || 0),
            
closingCash:
    Number(newShift1.closingCash || 0) +
    Number(newShift2.closingCash || 0)
        };

        // 🔥 TABLE SNAPSHOT
        const tablesSnapshot = tables.map(t => ({
            table_id: t.name,
            history: t.history.map(h => ({ ...h }))
        }));

        // 🔥 UPDATE DAY HISTORY
        snap.forEach(async (d) => {

            await updateDoc(
                doc(window.db, "days", d.id),
                {

                    tables: tablesSnapshot,

                    shift1: {
                        ...latestShift1,
                        ...newShift1
                    },

                    shift2: {
                        ...latestShift2,
                        ...newShift2
                    },

                    combined
                }
            );

          // 🔥 UPDATE LIVE SHIFT VARIABLES
                shift1 = {
                      ...shift1,
                      ...newShift1
                              };

                shift2 = {
                      ...shift2,
                      ...newShift2
                              };
        });

        console.log("✅ Day history updated");
      await loadShiftsFromFirebase();
      // 🔥 REFRESH DAY HISTORY CACHE
const latestDaysQ = query(
    collection(window.db, "days"),
    where("branch", "==", BRANCH)
);

const latestDaysSnap = await getDocs(latestDaysQ);

window._daysData = [];

latestDaysSnap.forEach(docSnap => {
    window._daysData.push(docSnap.data());
});

    } catch (err) {

        console.error("❌ refreshCurrentDayHistory:", err);
    }
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

  const forceRefreshDay =
    localStorage.getItem("forceRefreshClosedDay");

if (forceRefreshDay) {

    console.log(
        "🔄 Force refreshing closed day:",
        forceRefreshDay
    );

    await refreshCurrentDayHistory(forceRefreshDay);

    localStorage.removeItem(
        "forceRefreshClosedDay"
    );
}

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

  // ✅ OPERATIONAL DATE FIX
let operationalDate = d.shift1?.startMs
    ? new Date(d.shift1.startMs)
    : new Date(d.date);

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

sel.innerHTML += `<option>${operationalDate.getFullYear()}-${String(operationalDate.getMonth() + 1).padStart(2, "0")}-${String(operationalDate.getDate()).padStart(2, "0")} (${openTime} → ${closeTime})</option>`;
});

    window._daysData = days;
  // 🔥 SAVE SELECTED CLOSED DAY
const daySelect =
document.getElementById(
    "dayHistoryDateSelect"
);

if (daySelect) {

    daySelect.onchange = () => {

        const index =
            daySelect.selectedIndex;

        const selectedDay =
            window._daysData[index];

        if (selectedDay?.day_id) {

            window.selectedClosedDayId =
                selectedDay.day_id;
        }
    };

    // 🔥 DEFAULT FIRST
    if (window._daysData[0]?.day_id) {

        window.selectedClosedDayId =
            window._daysData[0].day_id;
    }
}

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
    <span>💵 Advance Collection</span>
    <span>${s1.advanceCollection || 0}</span>
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

        <div class="summary-row">
            <span>📲 EasyPaisa</span>
            <span>${s1.easypaisa || 0}</span>
        </div>
      
              <div class="summary-row">
          <span>🎁 Discount</span>
          <span>${s1.discount || 0}</span>
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
            <span>💵 Advance Collection</span>
            <span>${s2.advanceCollection || 0}</span>
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

        <div class="summary-row">
            <span>📲 EasyPaisa</span>
            <span>${s2.easypaisa || 0}</span>
        </div>

        <div class="summary-row">
    <span>🎁 Discount</span>
    <span>${s2.discount || 0}</span>
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
        <td>${c.easypaisa || 0}</td>
        <td>${c.discount || 0}</td>
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

  if (!window._daysData || window._daysData.length === 0) {
    openDayHistory();

    setTimeout(() => {
        openTableHistory();
    }, 1000);

    return;
}

    let dateSel = document.getElementById("tableHistoryDateSelect");
    dateSel.innerHTML = "";

    // 🔥 Firebase day history use karo
    (window._daysData || []).forEach((d, i) => {

      // ✅ OPERATIONAL DATE FIX
let operationalDate = d.shift1?.startMs
    ? new Date(d.shift1.startMs)
    : new Date(d.date);
    
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

dateSel.innerHTML += `<option value="${i}">${operationalDate.getFullYear()}-${String(operationalDate.getMonth() + 1).padStart(2, "0")}-${String(operationalDate.getDate()).padStart(2, "0")} (${openTime} → ${closeTime})</option>`;
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
let historyPerPage = 100;


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
window.softDeleteSession = softDeleteSession;


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

    let originalAmount =
Number(
h
? (h.originalAmount || h.amount)
: (t.finalAmount || t.liveAmount)
) || 0;

let discount =
Number(
h
? (h.discount || 0)
: (t.discount || 0)
);

let gameAmount =
originalAmount - discount;

    let itemsSource = h ? h.canteenItems : t.canteenItems;

    let canteenHTML = "";
    let canteenTotal = 0;

    Object.values(itemsSource || {}).forEach(item => {

        let qty = Number(item.qty) || 0;
        let price = Number(item.price) || 0;
        let total = qty * price;

        canteenTotal += total;

        canteenHTML += `
        <div class="row">
            <span>${item.name} x${qty}</span>
            <span>Rs ${total}</span>
        </div>`;
    });

    if (!canteenHTML) {
        canteenHTML = `<div class="center">No items</div>`;
    }

    let finalTotal = gameAmount + canteenTotal;

let win = window.open("", "_blank", "width=300,height=600");

if (!win) {
    alert("Print popup blocked ❌\nBrowser mein popups allow karo.");
    console.error("❌ printThermalBill: window.open() returned null");
    return;
}

win.document.open();

win.document.write(`
<html>
<head>
<style>
body {
    font-family: monospace;
    width: 260px;
    margin:auto;
    text-align:center;
}

.line {
    border-top:1px dashed #000;
    margin:6px 0;
}

.row {
    display:flex;
    justify-content:space-between;
}

.big {
    font-size:16px;
    font-weight:bold;
}

.logo {
    width:100px;
    margin-bottom:5px;
}
</style>
</head>

<body>

<img src="${window.location.origin}/assets/bill-logo.png" class="logo">

<div class="big">${academy.toUpperCase()}</div>
<div>${branch.toUpperCase()}</div>

<div class="line"></div>

<div class="row"><span>Table</span><span>${t.name}</span></div>
<div class="row"><span>In</span><span>${checkin}</span></div>
<div class="row"><span>Out</span><span>${checkout}</span></div>
<div class="row"><span>Time</span><span>${playtime}</span></div>
<div class="row">
<span>Play Type</span>
<span>${h ? (h.playType || 'Frame') : (t.selectedPlayType || t.playType || 'frame')}</span>
</div>

<div class="row">
<span>Rate</span>
<span>Rs ${h ? (h.rate || 0) : (t.selectedRate || 0)}</span>
</div>

<div class="line"></div>

<div class="big">GAME</div>

<div>Original: Rs ${originalAmount}</div>

<div>Discount: Rs ${discount}</div>

<div>Final: Rs ${gameAmount}</div>

<div class="line"></div>

<div class="big">CANTEEN</div>

${canteenHTML}

<div class="line"></div>

<div class="big">TOTAL</div>
<div class="big">Rs ${finalTotal}</div>

<div class="line"></div>

<img src="${window.location.origin}/assets/QR-bill.png" width="90">
<br>
Scan & Pay

<div class="line"></div>

<div>Thanks ❤️</div>

<script>
window.onload = function(){

    window.print();

    setTimeout(() => {
        window.close();
    }, 800);

}
</script>

</body>
</html>
`);

    win.document.close();
}

// 👥 SAVE PLAYER NAMES IN RUNNING SESSION
window.savePlayerNames = async function(tableId) {

    const t = tables.find(x => String(x.id) === String(tableId));
    if (!t) return;

    const p1Input = document.getElementById(`player1-${tableId}`);
    const p2Input = document.getElementById(`player2-${tableId}`);

    const player1 = p1Input ? p1Input.value.trim() : "";
    const player2 = p2Input ? p2Input.value.trim() : "";

    // local state update
    t.player1 = player1;
    t.player2 = player2;

    // sirf running session mein Firebase update
    if (!t.isRunning) return;

    try {

        const q = query(
            collection(window.db, "sessions"),
            where("branch", "==", BRANCH),
            where("table_id", "==", t.name),
            where("end_time", "==", null)
        );

        const snap = await getDocs(q);

        if (snap.empty) {
            console.log("⚠️ Running session not found for player names:", t.name);
            return;
        }

        for (const docSnap of snap.docs) {

            await updateDoc(docSnap.ref, {
                player1_name: player1,
                player2_name: player2
            });

        }

        console.log("👥 PLAYER NAMES SAVED:", t.name, player1, player2);

    } catch (err) {

        console.error("❌ PLAYER NAME SAVE ERROR:", err);

    }
};



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

// 👥 RESTORE PLAYER NAMES FROM SESSION
t.player1 = s.player1_name || "";
t.player2 = s.player2_name || "";

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
    where("end_time", "==", null),
    where("is_deleted", "==", false)
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

// 👥 REALTIME PLAYER NAMES
t.player1 = s.player1_name || "";
t.player2 = s.player2_name || "";

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


// 🔥 REALTIME HISTORY SYNC
function listenHistoryRealtime() {

    const q = query(
        collection(window.db, "sessions"),
        where("branch", "==", BRANCH)
    );

    onSnapshot(q, async () => {

        console.log("🔥 HISTORY REALTIME UPDATE");

        // 🔥 REBUILD HISTORY
        await rebuildHistoryFromSessions();

        // 🔥 REFRESH UI
        renderTables();

        // 🔥 AGAR HISTORY POPUP OPEN HAI
        const popup =
            document.getElementById("historyPopup");

        if (
            popup &&
            !popup.classList.contains("hidden")
        ) {

            const title =
                document.getElementById("historyTableTitle")
                ?.innerText || "";

            const tableName =
                title.replace("History - ", "").trim();

            const table =
                tables.find(t => t.name === tableName);

            if (table) {
                openHistory(table.id);
            }
        }

    });
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
          ${new Date().toLocaleString('en-PK', {
    timeZone: 'Asia/Karachi'
})}
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
            
                setTimeout(() => {
                    win.close();
                }, 800);
            
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
            .row { text-align:center; margin:3px 0; }
.line { border-top:1px dashed #000; margin:6px 0; }
.big { font-size:16px; font-weight:bold; }
            hr { border:1px dashed #000; }
        </style>
    </head>
    <body>

    <div class="big">DAY HISTORY</div>
    <div>${BRANCH.toUpperCase()}</div>

    <hr>

    <div>
        ${d.date}<br>
        (${openTime} → ${closeTime})
    </div>

    <hr>

<b>Shift 1</b>
<div class="row">
    <span>${s1.startMs ? new Date(s1.startMs).toLocaleTimeString('en-PK',{timeZone:'Asia/Karachi',hour:'2-digit',minute:'2-digit',hour12:true}) : "-"}</span>
    <span>To</span>
    <span>${s1.endMs ? new Date(s1.endMs).toLocaleTimeString('en-PK',{timeZone:'Asia/Karachi',hour:'2-digit',minute:'2-digit',hour12:true}) : "-"}</span>
</div>
<div class="row">Game : Rs ${s1.gameTotal || 0}</div>
<div class="row">Canteen : Rs ${s1.canteenTotal || 0}</div>
<div class="row">Game Collection : Rs ${s1.gameCollection || 0}</div>
<div class="row">Advance Collection : Rs ${s1.advanceCollection || 0}</div>
<div class="row">Canteen Collection : Rs ${s1.canteenCollection || 0}</div>
<div class="row">Balance : Rs ${(s1.gameBalance || 0)+(s1.canteenBalance || 0)}</div>
<div class="row">Expenses : Rs ${s1.expenses || 0}</div>
<div class="row">EasyPaisa : Rs ${s1.easypaisa || 0}</div>

<div class="row">Discount : Rs ${s1.discount || 0}</div>

<div class="row"><b>Cash</b><b>Rs ${s1.closingCash || 0}</b></div>

<hr>

<b>Shift 2</b>
<div class="row">
    <span>${s2.startMs ? new Date(s2.startMs).toLocaleTimeString('en-PK',{timeZone:'Asia/Karachi',hour:'2-digit',minute:'2-digit',hour12:true}) : "-"}</span>
    <span>To</span>
    <span>${s2.endMs ? new Date(s2.endMs).toLocaleTimeString('en-PK',{timeZone:'Asia/Karachi',hour:'2-digit',minute:'2-digit',hour12:true}) : "-"}</span>
</div>
<div class="row">Game : Rs ${s2.gameTotal || 0}</div>
<div class="row">Canteen : Rs ${s2.canteenTotal || 0}</div>
<div class="row">Game Collection : Rs ${s2.gameCollection || 0}</div>
<div class="row">Advance Collection : Rs ${s2.advanceCollection || 0}</div>
<div class="row">Canteen Collection : Rs ${s2.canteenCollection || 0}</div>
<div class="row">Balance : Rs ${(s2.gameBalance || 0)+(s2.canteenBalance || 0)}</div>
<div class="row">Expenses : Rs ${s2.expenses || 0}</div>
<div class="row">EasyPaisa : Rs ${s2.easypaisa || 0}</div>

<div class="row">Discount : Rs ${s2.discount || 0}</div>

<div class="row"><b>Cash</b><b>Rs ${s2.closingCash || 0}</b></div>

<hr>

<b>Combined</b>
<div class="row">
    <span>${s1.startMs ? new Date(s1.startMs).toLocaleTimeString('en-PK',{timeZone:'Asia/Karachi',hour:'2-digit',minute:'2-digit',hour12:true}) : "-"}</span>
    <span>To</span>
    <span>${s2.endMs ? new Date(s2.endMs).toLocaleTimeString('en-PK',{timeZone:'Asia/Karachi',hour:'2-digit',minute:'2-digit',hour12:true}) : "-"}</span>
</div>
<div class="row"><span>Game : Rs ${c.gameTotal || 0}</div>
<div class="row"><span>Canteen : Rs ${c.canteenTotal || 0}</div>
<div class="row"><span>Collection : Rs ${(c.gameCollection||0)+(c.canteenCollection||0)}</div>
<div class="row"><span>Advance Collection : Rs ${c.advanceCollection || 0}</div>
<div class="row"><span>Balance : Rs ${(c.gameBalance||0)+(c.canteenBalance||0)}</div>
<div class="row"><span>Expenses : Rs ${c.expenses || 0}</div>
<div class="row"><span>EasyPaisa : Rs ${c.easypaisa || 0}</div>

<div class="row"><span>Discount : Rs ${c.discount || 0}</div>

<hr>

<div class="line"></div>
<div class="big">FINAL CASH<br>Rs ${c.closingCash || 0}</div>
<div class="line"></div>

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
    
        setTimeout(() => {
            win.close();
        }, 800);
    
    }, 300);
}

/// table history thermal print

function printTableHistoryThermal() {

    let tableId = document.getElementById("tableHistoryTableSelect").value;
    let t = tables.find(x => String(x.id) === String(tableId));

    let dayIndex = document.getElementById("tableHistoryDateSelect").selectedIndex;
    let d = window._daysData[dayIndex];

    if (!t || !d) {
        alert("No data found ❌");
        return;
    }

    let tableData = d.tables?.find(tb => tb.table_id === t.name);

    let total = 0;
    let game = 0;
    let canteen = 0;
    let time = 0;

    (tableData?.history || []).forEach(h => {
        total += Number(h.total || 0);
        game += Number(h.amount || 0);
        canteen += Number(h.canteenAmount || 0);
        time += Number(h.playSeconds || 0);
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
            .line { border-top:1px dashed #000; margin:6px 0; }
            .big { font-size:18px; font-weight:bold; }
        </style>
    </head>
    <body>

    <div class="big">TABLE HISTORY</div>
    <div>${BRANCH.toUpperCase()}</div>

    <div class="line"></div>

    <div>
        ${t.name}<br>
        ${d.date}
    </div>

    <div class="line"></div>

    <div>Play Time : ${formatSeconds(time)}</div>
    <div>Game : Rs ${game}</div>
    <div>Canteen : Rs ${canteen}</div>

    <div class="line"></div>

    <div class="big">TOTAL<br>Rs ${total}</div>

    <div class="line"></div>

    <div>
        ${new Date().toLocaleString('en-PK', {
            timeZone: 'Asia/Karachi'
        })}
    </div>

    </body>
    </html>
    `;

    win.document.write(html);
    win.document.close();

      setTimeout(() => {
      
          win.print();
      
          setTimeout(() => {
              win.close();
          }, 800);
      
      }, 300);
}

async function rebuildHistoryFromSessions() {

    const q = query(
        collection(window.db, "sessions"),
        where("branch", "==", BRANCH)
    );

    const snap = await getDocs(q);

    // 🔥 RESET ALL HISTORY
    tables.forEach(t => t.history = []);

    snap.forEach(docSnap => {

        const s = docSnap.data();
      const sessionDocId = docSnap.id;
      // 🔥 skip deleted
if (s.is_deleted === true) {
    return;
}

        console.log("🔥 SESSION:", s);

        // ❌ ignore running sessions
        if (!s.end_time) return;

        const currentDayId = String(window.currentDayId || "").trim();
        const sessionDayId = String(s.day_id || "").trim();

// ✅ STRICT CURRENT DAY FILTER
// Sirf current open day ke sessions allow honge.
// Missing day_id aur kisi doosre day ke sessions reject honge.

if (!currentDayId) {
    console.warn("⛔ CURRENT DAY ID MISSING");
    return;
}

if (!sessionDayId || sessionDayId !== currentDayId) {
    return;
}

        let t = tables.find(x => x.name === s.table_id);
      
        if (!t) {
            console.log("⛔ TABLE NOT FOUND:", s.table_id);
            return;
        }


        // ==========================================
// DUPLICATE HISTORY PROTECTION
// ==========================================

const alreadyExists = t.history.some(h =>
    String(h.sessionId) === String(sessionDocId)
);

if (alreadyExists) {
    console.warn(
        "⚠️ DUPLICATE SESSION SKIPPED:",
        sessionDocId,
        t.name
    );
    return;
}
      

        t.history.push({
            sessionId: sessionDocId,
          
            checkin: new Date(s.start_time).getTime(),
            checkout: new Date(s.end_time).getTime(),

            playSeconds: s.final_seconds || 0,
            originalAmount:
s.original_game_amount ||
s.final_amount ||
0,

discount:
s.discount || 0,

amount:
s.final_game_amount ||
s.final_amount ||
0,

            canteenAmount: s.canteen_total || 0,

            total:
    Number(
        s.total_bill_amount ??
        (
            Number(s.final_game_amount || s.final_amount || 0)
            +
            Number(s.canteen_total || 0)
        )
    ),

            paid: s.paid === true,

            paidTime: s.paid_time
                ? new Date(s.paid_time).getTime()
                : null,

          bookingAdvance:
    Number(s.booking_advance || 0),

          bookingAdvancePaymentStatus:
    s.booking_advance_payment_status || "unpaid",

bookingAdvancePaidAt:
    s.booking_advance_paid_at
        ? new Date(s.booking_advance_paid_at).getTime()
        : null,

remainingPayment:
    Number(
        s.remaining_payment ??
        Math.max(
            0,
            (
                Number(s.final_game_amount || s.final_amount || 0)
                +
                Number(s.canteen_total || 0)
            )
            -
            Number(s.booking_advance || 0)
        )
    ),

totalBillAmount:
    Number(
        s.total_bill_amount ??
        (
            Number(s.final_game_amount || s.final_amount || 0)
            +
            Number(s.canteen_total || 0)
        )
    ),

fromBooking:
    s.from_booking === true ||
    !!s.booking_id,

rate:
    s.selected_rate ||
    (
        s.play_type === "century"
            ? s.century_rate
            : s.frame_rate
    ),

playType:
    s.selected_play_type ||
    s.play_type ||
    "frame",

canteenItems: s.canteen_items || {}
        });

        console.log("✅ HISTORY PUSHED:", t.name);

    });

    console.log("🔥 ONLY TODAY HISTORY LOADED");
}

// 🔥 LOAD ALL HISTORY FOR DAY RECALC
async function rebuildSpecificDayHistory(dayId) {

    const q = query(
        collection(window.db, "sessions"),
        where("branch", "==", BRANCH)
    );

    const snap = await getDocs(q);

    // 🔥 RESET
    tables.forEach(t => t.history = []);

    snap.forEach(docSnap => {
      

        const s = docSnap.data();
        const sessionDocId = docSnap.id;
      

        // 🔥 SKIP DELETED
        if (s.is_deleted === true) return;

        // 🔥 SKIP RUNNING
        if (!s.end_time) return;

        // 🔥 IMPORTANT
        if (String(s.day_id) !== String(dayId)) return;

        let t = tables.find(x => x.name === s.table_id);

        if (!t) return;

        t.history.push({
          sessionId: docSnap.id,

            checkin: new Date(s.start_time).getTime(),
            checkout: new Date(s.end_time).getTime(),

            playSeconds: s.final_seconds || 0,
            originalAmount:
s.original_game_amount ||
s.final_amount ||
0,

discount:
s.discount || 0,

amount:
s.final_game_amount ||
s.final_amount ||
0,

            canteenAmount: s.canteen_total || 0,

total:
    Number(
        s.total_bill_amount ??
        (
            Number(s.final_game_amount || s.final_amount || 0)
            +
            Number(s.canteen_total || 0)
        )
    ),

            paid: s.paid === true,

            paidTime: s.paid_time
                ? new Date(s.paid_time).getTime()
                : null,

          bookingAdvance:
    Number(s.booking_advance || 0),

          bookingAdvancePaymentStatus:
    s.booking_advance_payment_status || "unpaid",

bookingAdvancePaidAt:
    s.booking_advance_paid_at
        ? new Date(s.booking_advance_paid_at).getTime()
        : null,

remainingPayment:
    Number(
        s.remaining_payment ??
        Math.max(
            0,
            (
                Number(s.final_game_amount || s.final_amount || 0)
                +
                Number(s.canteen_total || 0)
            )
            -
            Number(s.booking_advance || 0)
        )
    ),

totalBillAmount:
    Number(
        s.total_bill_amount ??
        (
            Number(s.final_game_amount || s.final_amount || 0)
            +
            Number(s.canteen_total || 0)
        )
    ),

fromBooking:
    s.from_booking === true ||
    !!s.booking_id,

rate:
    s.selected_rate ||
    (
        s.play_type === "century"
        ? s.century_rate
        : s.frame_rate
    ),

playType:
    s.selected_play_type ||
    s.play_type ||
    "frame",

            canteenItems: s.canteen_items || {}
        });

    });

    console.log("✅ SPECIFIC DAY HISTORY LOADED:", dayId);
}


/******************************************************
 * SOFT DELETE SESSION
 ******************************************************/
/******************************************************
 * SOFT DELETE SESSION — EXACT FIRESTORE DOC
 ******************************************************/
async function softDeleteSession(tableId, historyIndex) {

    if (ROLE !== "admin") {
        alert("Only admin can delete ❌");
        return false;
    }

    const t = tables.find(
        x => String(x.id) === String(tableId)
    );

    if (!t) {
        console.error("❌ Table not found:", tableId);
        return false;
    }

    const h = t.history[historyIndex];

    if (!h) {
        console.error("❌ History not found:", historyIndex);
        return false;
    }

    // 🔥 EXACT FIRESTORE SESSION DOCUMENT ID
    const sessionId = h.sessionId;

    console.log("🔥 DELETE HISTORY:", h);
    console.log("🔥 EXACT SESSION ID:", sessionId);

    if (!sessionId) {
        console.error("❌ sessionId missing from history:", h);
        alert("Session ID not found ❌");
        return false;
    }

    try {

        // 🔥 NO QUERY
        // 🔥 NO TIME MATCHING
        // 🔥 DIRECT EXACT DOCUMENT
        const sessionRef = doc(
            window.db,
            "sessions",
            sessionId
        );

        await updateDoc(sessionRef, {
            is_deleted: true,
            deleted_at: new Date().toISOString(),
            deleted_by: ROLE
        });

        console.log(
            "✅ EXACT SESSION SOFT DELETED:",
            sessionId
        );

        // 🔥 REMOVE FROM LOCAL HISTORY
        t.history.splice(historyIndex, 1);

        return true;

    } catch (err) {

        console.error(
            "❌ SOFT DELETE FAILED:",
            sessionId,
            err
        );

        alert("Delete failed ❌");
        return false;
    }
}
//fix deployment issues
