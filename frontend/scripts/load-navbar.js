
console.log("LOAD-NAVBAR JS LOADED");


let lastBookingIds = new Set();

document.addEventListener("DOMContentLoaded", () => {
    fetch("../html/navbar.html")
        .then(res => res.text())
        .then(html => {
            document.body.insertAdjacentHTML("afterbegin", html);
            initializeNavbar();
        });
});

function initializeNavbar() {

    let role = (localStorage.getItem("role") || "").trim().toLowerCase();
    let branch = localStorage.getItem("branch");

    if (!branch) {
        console.error("No branch → redirect login");
        window.location.href = "../index.html";
        return;
    }

    console.log("CURRENT BRANCH:", branch);

    let sel = document.getElementById("branchSelect");

    // ✅ SET BRANCH (SAFE MATCH)
    if (branch && sel) {
        const options = Array.from(sel.options);

        let match = options.find(opt =>
            opt.value.replace(/\s+/g, "").toLowerCase() === branch.toLowerCase()
        );

        if (match) {
            sel.value = match.value;
        } else {
            console.warn("Branch not found in dropdown:", branch);
        }
    }

    // ✅ BRANCH CHANGE
    if (sel) {
        sel.addEventListener("change", () => {

            const selected = sel.value.replace(/\s+/g, "").trim();

            console.log("NEW SELECTED BRANCH:", selected);

            if (!selected) {
                alert("Invalid branch");
                return;
            }

            localStorage.setItem("branch", selected);
            location.reload();
        });
    }

    // ✅ STAFF RESTRICTION
    if (role === "staff") {
        setTimeout(() => {
            document.querySelectorAll(".admin-only").forEach(el => {
                el.style.display = "none";
            });
        }, 300);
    }

    // ✅ ACTIVE PAGE
    let current = window.location.pathname.split("/").pop().replace(".html", "");
    document.querySelectorAll(".nav-btn").forEach(btn => {
        if (btn.dataset.page === current) btn.classList.add("active-nav");
    });

    // ✅ LOGOUT
    document.getElementById("logoutBtn").addEventListener("click", () => {
        localStorage.clear();
        window.location.href = "../index.html";
    });

    // ✅ NAVIGATION
    window.goTo = function (page) {
        window.location.href = `../html/${page}.html`;
    };


    // ✅ DIGITAL CLOCK
    function updateClock() {

        const clock = document.getElementById("digitalClock");

        if (!clock) return;

        const now = new Date();

        let hours = now.getHours();

        const minutes = String(
            now.getMinutes()
        ).padStart(2, "0");

        const seconds = String(
            now.getSeconds()
        ).padStart(2, "0");

        const period =
            hours >= 12 ? "PM" : "AM";

        hours = hours % 12;

        if (hours === 0) {
            hours = 12;
        }

        const formattedHours =
            String(hours).padStart(2, "0");

        clock.textContent =
            `${formattedHours}:${minutes}:${seconds} ${period}`;
    }


    // Clock immediately show karo
    updateClock();


    // Har second update karo
    setInterval(
        updateClock,
        1000
    );

    startBookingNotificationListener();

}
function startBookingNotificationListener() {

    const db = window.db;

    const {
        collection,
        query,
        where,
        onSnapshot
    } = window.fs;

    const branch =
        localStorage.getItem("branch");

    if (!branch) return;

    const badge =
        document.getElementById(
            "bookingNotificationBadge"
        );

    const q = query(
        collection(db, "bookings"),

        where("branch", "==", branch),

        where(
            "booking_source",
            "==",
            "online_customer"
        ),

        where(
            "notification_unread",
            "==",
            true
        )
    );

    onSnapshot(q, snapshot => {

        const unread =
            snapshot.size;

        if (badge) {

            badge.textContent =
                unread;

            badge.style.display =
                unread > 0
                    ? "flex"
                    : "none";

        }

        snapshot.docChanges().forEach(change => {

            if (change.type !== "added") {
                return;
            }

            console.log(
                "🔔 NEW BOOKING:",
                change.doc.data()
            );

        });

    });

}


