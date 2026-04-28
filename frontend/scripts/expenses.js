// ==========================
// 🔥 FIREBASE IMPORT
// ==========================
import { 
    collection, 
    addDoc, 
    onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

console.log("EXPENSES FIREBASE LOADED");



// ==========================
// 🟢 RENDER
// ==========================
function renderEasy(list) {

    const body = document.getElementById("easyTable");
    body.innerHTML = "";

    let total = 0;
    list.forEach(x => total += Number(x.amount || 0));

    list.forEach(x => {

        body.innerHTML += `
            <tr>
                <td>${new Date(x.created_at).toLocaleTimeString()}</td>
                <td>${x.amount}</td>
                <td>${x.note || "-"}</td>
            </tr>
        `;
    });

    console.log("TODAY EASYPAISA:", total);
}

// ==========================
// ➕ ADD EASYPAISA
// ==========================
window.addEasy = async function () {

    const amount = Number(document.getElementById("amount").value);
    const note = document.getElementById("note").value;

    if (!amount || amount <= 0) {
        alert("Enter valid amount");
        return;
    }

    await addDoc(collection(window.db, "easypaisa"), {

        amount,
        note,
        branch,

        day_id: Number(localStorage.getItem("currentDayId")), // 🔥 IMPORTANT

        created_at: new Date().toISOString()
    });

    document.getElementById("amount").value = "";
    document.getElementById("note").value = "";

    alert("EasyPaisa added ✅");
}
