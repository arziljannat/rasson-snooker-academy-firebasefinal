import {
    collection,
    query,
    where,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDocs,
    orderBy,
    limit
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
/* =========================================================
   CURRENT BRANCH
   ========================================================= */

const BRANCH = (
    localStorage.getItem("branch") || ""
)
.replace(/\s+/g, "")
.toLowerCase();


/* =========================================================
   DATA
   ========================================================= */

let branchResources = [];
let bookings = [];

/* Currently editing booking ID */
let editingBookingId = null;

/* =========================================================
   PAGE START
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    window.disableBookingNotificationPopup = true;

    console.log("BOOKINGS JS LOADED");
    console.log("CURRENT BOOKING BRANCH:", BRANCH);

    if (!BRANCH) {
        console.error("Booking branch not found.");
        return;
    }

    showCurrentBranch();

    setDefaultDates();

    setupBookingPopup();

    setupResourceType();

    loadCurrentBookingDayId();

    loadBranchResources();

    loadBookings();

});


/* =========================================================
   SHOW CURRENT BRANCH
   ========================================================= */

function showCurrentBranch() {

    const el = document.getElementById(
        "bookingBranchName"
    );

    if (!el) return;

    el.innerText =
        "Branch: " + formatBranchName(BRANCH);

}


function formatBranchName(branch) {

    const match =
        branch.match(/^rasson(\d+)$/i);

    if (match) {
        return "Rasson " + match[1];
    }

    return branch;
}


/* =========================================================
   DEFAULT DATE
   ========================================================= */

function setDefaultDates() {

    const today =
        getLocalDateString(new Date());

    const filter =
        document.getElementById(
            "bookingDateFilter"
        );

    const bookingDate =
        document.getElementById(
            "bookingDate"
        );

    const bookingEndDate =
        document.getElementById(
            "bookingEndDate"
        );


    if (filter) {
        filter.value = today;
    }


    if (bookingDate) {

        bookingDate.value = today;
        bookingDate.min = today;

    }


    if (bookingEndDate) {

        bookingEndDate.value = today;
        bookingEndDate.min = today;

    }


    /*
       Start Date change ho to
       End Date automatically same date ho.

       Example:
       Start = 24 July
       End automatically = 24 July

       Overnight booking ho to user
       End Date ko 25 July select kar sakta hai.
    */

    if (
        bookingDate &&
        bookingEndDate
    ) {

        bookingDate.addEventListener(
            "change",
            () => {

                bookingEndDate.min =
                    bookingDate.value;


                if (
                    !bookingEndDate.value ||
                    bookingEndDate.value <
                    bookingDate.value
                ) {

                    bookingEndDate.value =
                        bookingDate.value;

                }

            }
        );

    }

}


function getLocalDateString(date) {

    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            date.getDate()
        ).padStart(2, "0");

    return `${year}-${month}-${day}`;

}


/* =========================================================
   CURRENT OPERATIONAL DAY ID
   ========================================================= */

let currentBookingDayId = null;
async function loadCurrentBookingDayId() {

    if (!window.db) {

        console.log(
            "Waiting for Firebase DB..."
        );

        setTimeout(
            loadCurrentBookingDayId,
            500
        );

        return;
    }

    try {

        const currentDayQuery =
            query(
                collection(
                    window.db,
                    "system"
                ),

                where(
                    "branch",
                    "==",
                    BRANCH
                ),

                where(
                    "type",
                    "==",
                    "current_day"
                ),

                orderBy(
                    "created_at",
                    "desc"
                ),

                limit(1)
            );


        const snapshot =
            await getDocs(
                currentDayQuery
            );


        if (snapshot.empty) {

            console.error(
                "❌ BOOKING CURRENT DAY NOT FOUND"
            );

            currentBookingDayId = null;

            renderBookings();

            return;
        }


        const data =
            snapshot.docs[0].data();


        currentBookingDayId =
            data.day_id || null;


        console.log(
            "🔥 BOOKING CURRENT DAY ID:",
            currentBookingDayId
        );


        renderBookings();

    }

    catch (error) {

        console.error(
            "❌ BOOKING CURRENT DAY LOAD ERROR:",
            error
        );

        currentBookingDayId = null;

    }

}


function getCurrentBookingDayId() {

    return currentBookingDayId;

}



/* =========================================================
   BOOKING POPUP
   ========================================================= */

function setupBookingPopup() {

    const newBtn =
        document.getElementById(
            "newBookingBtn"
        );

    const modal =
        document.getElementById(
            "bookingModal"
        );

    const closeBtn =
        document.getElementById(
            "closeBookingModalBtn"
        );

    const cancelBtn =
        document.getElementById(
            "cancelBookingBtn"
        );


    if (newBtn) {

        newBtn.addEventListener(
            "click",
            () => {

                resetBookingForm();

                modal?.classList.remove(
                    "hidden"
                );

            }
        );

    }


    if (closeBtn) {

        closeBtn.addEventListener(
            "click",
            closeBookingPopup
        );

    }


    if (cancelBtn) {

        cancelBtn.addEventListener(
            "click",
            closeBookingPopup
        );

    }


    if (modal) {

        modal.addEventListener(
            "click",
            event => {

                if (event.target === modal) {
                    closeBookingPopup();
                }

            }
        );

    }

}


function closeBookingPopup() {

    const modal =
        document.getElementById(
            "bookingModal"
        );

    if (modal) {
        modal.classList.add("hidden");
    }

}


/* =========================================================
   RESET FORM
   ========================================================= */

function resetBookingForm() {

    editingBookingId = null;

const modalTitle =
    document.getElementById(
        "bookingModalTitle"
    );

const saveButton =
    document.getElementById(
        "saveBookingBtn"
    );

if (modalTitle) {
    modalTitle.innerText =
        "New Booking";
}

if (saveButton) {
    saveButton.innerText =
        "Confirm Booking";
}

    const form =
        document.getElementById(
            "bookingForm"
        );

    if (form) {
        form.reset();
    }

    /* =========================
   RESET CUSTOM TIME PICKER
   ========================= */

bookingTimePeriod.start = "AM";
bookingTimePeriod.end = "AM";


/* Start + End ke SUN ko active karo */

document.querySelectorAll(
    ".time-icon-btn"
)
.forEach(button => {

    const isDay =
        button.dataset.period === "AM";

    button.classList.toggle(
        "active",
        isDay
    );

});


/* Hidden final time clear karo */

const startHidden =
    document.getElementById(
        "bookingStartTime"
    );

const endHidden =
    document.getElementById(
        "bookingEndTime"
    );


if (startHidden) {
    startHidden.value = "";
}


if (endHidden) {
    endHidden.value = "";
}


const bookingDate =
    document.getElementById(
        "bookingDate"
    );

const bookingEndDate =
    document.getElementById(
        "bookingEndDate"
    );


const today =
    getLocalDateString(
        new Date()
    );


if (bookingDate) {

    bookingDate.value = today;
    bookingDate.min = today;

}


if (bookingEndDate) {

    bookingEndDate.value = today;
    bookingEndDate.min = today;

}


    const advance =
        document.getElementById(
            "bookingAdvance"
        );

    if (advance) {
        advance.value = "0";
    }


    const resource =
        document.getElementById(
            "bookingResource"
        );

    if (resource) {

        resource.innerHTML = `
            <option value="">
                Select Type First
            </option>
        `;

        resource.disabled = true;

    }


    hideBookingError();

}


/* =========================================================
   RESOURCE TYPE
   ========================================================= */

function setupResourceType() {

    const typeSelect =
        document.getElementById(
            "bookingResourceType"
        );

    if (!typeSelect) return;


    typeSelect.addEventListener(
        "change",
        () => {

            populateResourceDropdown();

        }
    );

}


/* =========================================================
   LOAD TABLES / ROOMS / POOL
   FROM EXISTING TABLES COLLECTION
   ========================================================= */

function loadBranchResources() {

    if (!window.db) {

        console.error(
            "Firebase DB not ready."
        );

        setTimeout(
            loadBranchResources,
            500
        );

        return;
    }


    console.log(
        "Loading booking resources for:",
        BRANCH
    );


    const resourcesQuery =
        query(
            collection(
                window.db,
                "tables"
            ),

            where(
                "branch",
                "==",
                BRANCH
            )
        );


    onSnapshot(

        resourcesQuery,

        snapshot => {

            branchResources = [];


            snapshot.forEach(
                documentSnapshot => {

                    const data =
                        documentSnapshot.data();


                    /*
                       IMPORTANT:

                       Existing tables collection
                       is only being READ.

                       Nothing is changed here.
                    */


                    const resourceName =
                        String(
                            data.table_id || ""
                        ).trim();


                    if (!resourceName) {
                        return;
                    }


                    branchResources.push({

                        firestoreId:
                            documentSnapshot.id,

                        name:
                            resourceName,

                        type:
                            detectResourceType(
                                resourceName
                            )

                    });

                }
            );


            sortResources();


            console.log(
                "BOOKING RESOURCES:",
                branchResources
            );


            populateResourceDropdown();

        },

        error => {

            console.error(
                "BOOKING RESOURCE ERROR:",
                error
            );

            showBookingError(
                "Could not load Tables / Rooms / Pool."
            );

        }

    );

}


/* =========================================================
   IDENTIFY TABLE / ROOM / POOL
   ========================================================= */

function detectResourceType(name) {

    const lowerName =
        name.toLowerCase();


    if (
        lowerName.startsWith("room")
    ) {

        return "room";

    }


    if (
        lowerName.startsWith("pool")
    ) {

        return "pool";

    }


    /*
       Everything else in existing
       tables collection is treated
       as a normal snooker table.
    */

    return "table";

}


/* =========================================================
   SORT RESOURCES
   ========================================================= */

function sortResources() {

    const order = {
        table: 1,
        room: 2,
        pool: 3
    };


    branchResources.sort(
        (a, b) => {

            if (
                order[a.type] !==
                order[b.type]
            ) {

                return (
                    order[a.type] -
                    order[b.type]
                );

            }


            return a.name.localeCompare(

                b.name,

                undefined,

                {
                    numeric: true,
                    sensitivity: "base"
                }

            );

        }
    );

}


/* =========================================================
   SHOW RESOURCES IN DROPDOWN
   ========================================================= */

function populateResourceDropdown() {

    const typeSelect =
        document.getElementById(
            "bookingResourceType"
        );


    const resourceSelect =
        document.getElementById(
            "bookingResource"
        );


    if (
        !typeSelect ||
        !resourceSelect
    ) {

        return;

    }


    const selectedType =
        typeSelect.value;


    resourceSelect.innerHTML = "";


    if (!selectedType) {

        resourceSelect.disabled = true;

        resourceSelect.innerHTML = `
            <option value="">
                Select Type First
            </option>
        `;

        return;

    }


    const resources =
        branchResources.filter(
            resource =>
                resource.type ===
                selectedType
        );


    if (resources.length === 0) {

        resourceSelect.disabled = true;

        resourceSelect.innerHTML = `
            <option value="">
                No ${getTypeLabel(selectedType)}
                Found In This Branch
            </option>
        `;

        return;

    }


    resourceSelect.disabled = false;


    /*
       OPTION 3:

       Staff can either choose
       ANY AVAILABLE resource
       or a SPECIFIC resource.
    */

    const anyOption =
        document.createElement(
            "option"
        );


    anyOption.value =
        "ANY";


    anyOption.textContent =
        "Any Available " +
        getTypeLabel(
            selectedType
        );


    resourceSelect.appendChild(
        anyOption
    );


    resources.forEach(
        resource => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                resource.firestoreId;


            option.textContent =
                resource.name;


            resourceSelect.appendChild(
                option
            );

        }
    );

}


/* =========================================================
   LOAD BOOKINGS FOR CURRENT BRANCH
   ========================================================= */

function loadBookings() {

    if (!window.db) {

        setTimeout(
            loadBookings,
            500
        );

        return;
    }


    const bookingsQuery =
        query(
            collection(
                window.db,
                "bookings"
            ),

            where(
                "branch",
                "==",
                BRANCH
            )
        );


    onSnapshot(

        bookingsQuery,

        snapshot => {

            bookings = [];


            snapshot.forEach(
                documentSnapshot => {

                    bookings.push({

                        id:
                            documentSnapshot.id,

                        ...documentSnapshot.data()

                    });

                }
            );

            snapshot.forEach(async (documentSnapshot) => {

    const data = documentSnapshot.data();

    if (
        data.booking_source === "online_customer" &&
        data.notification_unread === true
    ) {

        try {

            await updateDoc(

                doc(
                    window.db,
                    "bookings",
                    documentSnapshot.id
                ),

                {
                    notification_unread: false,
                    notification_popup: true
                }

            );

        } catch (e) {

            console.error(
                "Notification update failed:",
                e
            );

        }

    }

});


            console.log(
                "CURRENT BRANCH BOOKINGS:",
                bookings
            );

            renderBookings();

        },

        error => {

            console.error(
                "BOOKINGS LOAD ERROR:",
                error
            );

        }

    );

}


/* =========================================================
   CHECK SPECIFIC RESOURCE DOUBLE BOOKING
   ========================================================= */

function hasBookingConflict(
    resourceId,
    startDate,
    endDate,
    startTime,
    endTime
) {

    const newStart =
        new Date(
            startDate +
            "T" +
            startTime +
            ":00"
        );

    const newEnd =
        new Date(
            endDate +
            "T" +
            endTime +
            ":00"
        );


    return bookings.some(
        booking => {

                        // ==========================================
            // 🔥 CURRENT OPERATIONAL DAY ONLY
            // Purane Day Close ki bookings conflict
            // create nahi karengi.
            // ==========================================

            const currentDayId =
                getCurrentBookingDayId();

            if (
                currentDayId &&
                String(booking.day_id || "") !==
                String(currentDayId)
            ) {
                return false;
            }

            console.log("🔍 CONFLICT CHECK BOOKING:", {
    id: booking.id,
    currentDayId: currentDayId,
    bookingDayId: booking.day_id,
    status: booking.status,
    resource_id: booking.resource_id,
    resource_name: booking.resource_name,
    start_date: booking.start_date,
    end_date: booking.end_date,
    start_time: booking.start_time,
    end_time: booking.end_time,
    actual_end_at: booking.actual_end_at,
    checked_out_at: booking.checked_out_at,
    completed_at: booking.completed_at
});

            /* Editing mein apni booking ignore */
            if (
                editingBookingId &&
                booking.id === editingBookingId
            ) {
                return false;
            }


            /* Cancelled / No Show block nahi karega */
            if (
                booking.status === "cancelled" ||
                booking.status === "no_show"
            ) {
                return false;
            }


            /* Sirf same Table / Room / Pool */
            if (
                booking.resource_id !== resourceId
            ) {
                return false;
            }


            /*
               OLD BOOKINGS COMPATIBILITY:

               Purani booking mein end_date nahi hai
               to uski date ko hi end date samjho.
            */

            const existingStartDate =
                booking.start_date ||
                booking.date;


            const existingEndDate =
                booking.end_date ||
                booking.date;


            if (
                !existingStartDate ||
                !existingEndDate ||
                !booking.start_time ||
                !booking.end_time
            ) {
                return false;
            }


            const existingStart =
                new Date(
                    existingStartDate +
                    "T" +
                    booking.start_time +
                    ":00"
                );


let existingEnd;

/*
   Agar booking wala customer checkout
   kar chuka hai to actual checkout time
   booking ka effective end hoga.
*/
if (booking.actual_end_at) {

    existingEnd =
        new Date(
            booking.actual_end_at
        );

} else {

    existingEnd =
        new Date(
            existingEndDate +
            "T" +
            booking.end_time +
            ":00"
        );

}

            /*
               OVERLAP:

               New Start < Existing End
               AND
               New End > Existing Start
            */

const isConflict =
    newStart < existingEnd &&
    newEnd > existingStart;


if (isConflict) {

    console.log(
        "❌ BOOKING CAUSING CONFLICT:",
        {
            bookingId:
                booking.id,

            resource:
                booking.resource_name,

            status:
                booking.status,

            bookingDayId:
                booking.day_id,

            existingStart:
                existingStart.toString(),

            existingEnd:
                existingEnd.toString(),

            originalEndTime:
                booking.end_time,

            actual_end_at:
                booking.actual_end_at,

            checked_out_at:
                booking.checked_out_at,

            completed_at:
                booking.completed_at,

            newStart:
                newStart.toString(),

            newEnd:
                newEnd.toString()
        }
    );

}


return isConflict;
        }
    );

}


/* =========================================================
   FIND AVAILABLE RESOURCE
   FOR "ANY AVAILABLE"
   ========================================================= */

function findAvailableResource(
    type,
    startDate,
    endDate,
    startTime,
    endTime
) {

    const resources =
        branchResources.filter(
            resource =>
                resource.type === type
        );


    return resources.find(
        resource =>

            !hasBookingConflict(
                resource.firestoreId,
                startDate,
                endDate,
                startTime,
                endTime
            )

    ) || null;

}

/* =========================================================
   TYPE LABEL
   ========================================================= */

function getTypeLabel(type) {

    if (type === "room") {
        return "Room";
    }

    if (type === "pool") {
        return "Pool";
    }

    return "Table";

}


/* =========================================================
   CUSTOM BOOKING TIME PICKER
   ========================================================= */

let bookingTimePeriod = {
    start: "AM",
    end: "AM"
};


/*
   HOUR + MINUTE + DAY/NIGHT
   ko 24-hour time mein convert karta hai.

   05 : 00 + SUN  = 05:00
   05 : 00 + MOON = 17:00
*/

function buildBookingTime(target) {

    const hourInput =
        document.getElementById(
            target === "start"
                ? "bookingStartHour"
                : "bookingEndHour"
        );

    const minuteInput =
        document.getElementById(
            target === "start"
                ? "bookingStartMinute"
                : "bookingEndMinute"
        );

    const hiddenInput =
        document.getElementById(
            target === "start"
                ? "bookingStartTime"
                : "bookingEndTime"
        );


    if (
        !hourInput ||
        !minuteInput ||
        !hiddenInput
    ) {
        return "";
    }


    let hour =
        Number(hourInput.value);

    let minute =
        Number(minuteInput.value);


    if (
        !hour ||
        hour < 1 ||
        hour > 12 ||
        Number.isNaN(minute) ||
        minute < 0 ||
        minute > 59
    ) {

        hiddenInput.value = "";

        return "";

    }


    const period =
        bookingTimePeriod[target];


    /* 12 AM = 00:xx */

    if (period === "AM") {

        if (hour === 12) {
            hour = 0;
        }

    }

    /* PM: 1 PM = 13:xx */

    else {

        if (hour !== 12) {
            hour += 12;
        }

    }


    const finalTime =
        String(hour).padStart(2, "0") +
        ":" +
        String(minute).padStart(2, "0");


    hiddenInput.value =
        finalTime;


    return finalTime;

}


/* =========================================================
   DAY / NIGHT BUTTON CLICK
   ========================================================= */

document.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                ".time-icon-btn"
            );


        if (!button) {
            return;
        }


        const target =
            button.dataset.timeTarget;

        const period =
            button.dataset.period;


        if (
            !target ||
            !period
        ) {
            return;
        }


        bookingTimePeriod[target] =
            period;


        document.querySelectorAll(
            `.time-icon-btn[data-time-target="${target}"]`
        )
        .forEach(btn => {

            btn.classList.toggle(
                "active",
                btn === button
            );

        });


        buildBookingTime(
            target
        );

    }
);


/* =========================================================
   HOUR / MINUTE INPUT
   ========================================================= */

[
    "bookingStartHour",
    "bookingStartMinute",
    "bookingEndHour",
    "bookingEndMinute"
]
.forEach(id => {

    const input =
        document.getElementById(id);


    if (!input) {
        return;
    }


    input.addEventListener(
        "input",
        () => {

            if (
                id.includes("Start")
            ) {

                buildBookingTime(
                    "start"
                );

            }

            else {

                buildBookingTime(
                    "end"
                );

            }

        }
    );

});


/* =========================================================
   SAVE BOOKING TO FIREBASE
   ========================================================= */

const bookingForm =
    document.getElementById(
        "bookingForm"
    );


if (bookingForm) {

    bookingForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            hideBookingError();


            /* =========================
               GET FORM VALUES
               ========================= */

            const customerName =
                document.getElementById(
                    "bookingCustomerName"
                ).value.trim();


            const customerPhone =
                document.getElementById(
                    "bookingCustomerPhone"
                ).value.trim();


const bookingDate =
    document.getElementById(
        "bookingDate"
    ).value;


const bookingEndDate =
    document.getElementById(
        "bookingEndDate"
    ).value;


/*
   Hour + Minute + Day/Night
   se final 24-hour time
*/

const startTime =
    buildBookingTime(
        "start"
    );


const endTime =
    buildBookingTime(
        "end"
    );


            const resourceType =
                document.getElementById(
                    "bookingResourceType"
                ).value;


            const selectedResource =
                document.getElementById(
                    "bookingResource"
                ).value;


            const advanceAmount =
                Number(
                    document.getElementById(
                        "bookingAdvance"
                    ).value || 0
                );


            const paymentStatus =
                document.getElementById(
                    "bookingPaymentStatus"
                ).value;


            const notes =
                document.getElementById(
                    "bookingNotes"
                ).value.trim();



            /* =========================
               BASIC VALIDATION
               ========================= */

if (
    !customerName ||
    !customerPhone ||
    !bookingDate ||
    !bookingEndDate ||
    !startTime ||
    !endTime ||
    !resourceType ||
    !selectedResource
) {

                showBookingError(
                    "Please fill all required fields."
                );

                return;

            }


const startDateTime =
    new Date(
        bookingDate +
        "T" +
        startTime +
        ":00"
    );


const endDateTime =
    new Date(
        bookingEndDate +
        "T" +
        endTime +
        ":00"
    );


if (
    endDateTime <= startDateTime
) {

    showBookingError(
        "End date/time must be after start date/time."
    );

    return;

}


            /* =========================
               RESOURCE
               ========================= */

            let finalResource = null;

            let assignmentMode =
                "specific";


            /*
               ANY AVAILABLE
            */

            if (
                selectedResource ===
                "ANY"
            ) {

                finalResource =
                    findAvailableResource(
                        resourceType,
                        bookingDate,
                        bookingEndDate,
                        startTime,
                        endTime
                    );


                if (!finalResource) {

                    showBookingError(
                        "No available " +
                        getTypeLabel(
                            resourceType
                        ) +
                        " found for this time."
                    );

                    return;

                }


                assignmentMode =
                    "any_available";

            }

            else {

                /*
                   SPECIFIC RESOURCE
                */

                finalResource =
                    branchResources.find(
                        resource =>
                            resource.firestoreId ===
                            selectedResource
                    );


                if (!finalResource) {

                    showBookingError(
                        "Selected Table / Room / Pool was not found."
                    );

                    return;

                }


                if (
                    hasBookingConflict(
                        finalResource.firestoreId,
                        bookingDate,
                        bookingEndDate,
                        startTime,
                        endTime
                    )
                ) {

                    showBookingError(
                        finalResource.name +
                        " is already booked during this time."
                    );

                    return;

                }

            }



            /* =========================
               SAVE BUTTON
               ========================= */

            const saveButton =
                document.getElementById(
                    "saveBookingBtn"
                );


            saveButton.disabled = true;

            saveButton.innerText =
                "Saving...";



            /* =========================
               FIREBASE SAVE
               ========================= */

            try {

                const now =
                    new Date().toISOString();

                const currentDayId =
    getCurrentBookingDayId();


if (!currentDayId) {

    showBookingError(
        "Current operational day is not ready. Please refresh the page."
    );

    return;

}


                const bookingData = {

                    branch:
                        BRANCH,

                    day_id: currentDayId,

                    booking_source:
                        "staff_manual",

                    customer_name:
                        customerName,

                    customer_phone:
                        customerPhone,

                    date:
                        bookingDate,

                    start_date:
                        bookingDate,

                    end_date:
                        bookingEndDate,

                    start_time:
                        startTime,

                    end_time:
                        endTime,

                    resource_type:
                        resourceType,

                    resource_id:
                        finalResource.firestoreId,

                    resource_name:
                        finalResource.name,

                    assignment_mode:
                        assignmentMode,

                    advance_amount:
                        advanceAmount,

                    payment_status:
                        paymentStatus,

                    advance_paid_at:
                    (
                        paymentStatus === "paid" &&
                        advanceAmount > 0
                            )
                        ? now
                        : null,

                    notes:
                        notes,

                    status:
                        "confirmed",

                    created_at:
                        now,

                    updated_at:
                        now

                };

    if (editingBookingId) {

const existingBooking =
    bookings.find(
        item =>
            item.id ===
            editingBookingId
    );

let advancePaidAt = null;

/*
   Advance ab bhi PAID hai aur amount > 0 hai.
*/
if (
    paymentStatus === "paid" &&
    advanceAmount > 0
) {

    /*
       Pehle se paid tha to original
       receive time preserve karo.

       Agar abhi pehli baar Paid kiya hai
       to current time save karo.
    */
    advancePaidAt =
        existingBooking?.advance_paid_at ||
        now;
}


await updateDoc(

    doc(
        window.db,
        "bookings",
        editingBookingId
    ),

    {
        ...bookingData,

        // Advance ka original payment time preserve
        advance_paid_at:
            advancePaidAt,

        /*
           Existing booking ka
           original status preserve karo.
        */
        status:
            existingBooking?.status ||
            "confirmed",

        /*
           Original creation date
           overwrite nahi karni.
        */
        created_at:
            existingBooking?.created_at ||
            now,

        updated_at:
            now
    }

);


    console.log(
        "BOOKING UPDATED:",
        editingBookingId
    );


    alert(
        "Booking updated successfully."
    );

}

else {

    const docRef =
        await addDoc(

            collection(
                window.db,
                "bookings"
            ),

            bookingData

        );


    console.log(
        "BOOKING SAVED:",
        docRef.id
    );


    alert(
        "Booking confirmed successfully."
    );

}


closeBookingPopup();

editingBookingId = null;


            }

            catch (error) {

                console.error(
                    "BOOKING SAVE ERROR:",
                    error
                );


                showBookingError(
                    "Booking could not be saved. Check Firebase permissions."
                );

            }

            finally {

                saveButton.disabled =
                    false;

                saveButton.innerText =
                    "Confirm Booking";

            }

        }
    );

}

/* =========================================================
   FILL CUSTOM TIME PICKER FOR EDIT
   ========================================================= */

function fillBookingTimePicker(
    target,
    time
) {

    if (!time) {
        return;
    }


    const parts =
        time.split(":");


    let hour =
        Number(parts[0]);

    const minute =
        parts[1] || "00";


    const period =
        hour >= 12
            ? "PM"
            : "AM";


    /*
       24-hour -> 12-hour

       17:00 = 5:00 PM
       07:00 = 7:00 AM
       00:00 = 12:00 AM
       12:00 = 12:00 PM
    */

    hour =
        hour % 12;


    if (hour === 0) {
        hour = 12;
    }


    const hourInput =
        document.getElementById(
            target === "start"
                ? "bookingStartHour"
                : "bookingEndHour"
        );


    const minuteInput =
        document.getElementById(
            target === "start"
                ? "bookingStartMinute"
                : "bookingEndMinute"
        );


    if (hourInput) {
        hourInput.value = hour;
    }


    if (minuteInput) {
        minuteInput.value = minute;
    }


    bookingTimePeriod[target] =
        period;


    /*
       Correct SUN / MOON
       button active karo
    */

    document.querySelectorAll(
        `.time-icon-btn[data-time-target="${target}"]`
    )
    .forEach(button => {

        button.classList.toggle(
            "active",
            button.dataset.period === period
        );

    });


    /*
       Hidden 24-hour value
       dobara build karo
    */

    buildBookingTime(
        target
    );

}


/* =========================================================
   EDIT BOOKING
   ========================================================= */

window.editBooking =
function(
    bookingId
) {

    const booking =
        bookings.find(
            item =>
                item.id === bookingId
        );


    if (!booking) {

        alert(
            "Booking not found."
        );

        return;

    }


    if (
        booking.status === "cancelled" ||
        booking.status === "completed"
    ) {

        alert(
            "This booking can no longer be edited."
        );

        return;

    }


    editingBookingId =
        bookingId;


    /* =========================
       POPUP TITLE
       ========================= */

    const modalTitle =
        document.getElementById(
            "bookingModalTitle"
        );


    const saveButton =
        document.getElementById(
            "saveBookingBtn"
        );


    if (modalTitle) {

        modalTitle.innerText =
            "Edit Booking";

    }


    if (saveButton) {

        saveButton.innerText =
            "Save Changes";

    }


    /* =========================
       FILL EXISTING DATA
       ========================= */

    document.getElementById(
        "bookingCustomerName"
    ).value =
        booking.customer_name || "";


    document.getElementById(
        "bookingCustomerPhone"
    ).value =
        booking.customer_phone || "";


document.getElementById(
    "bookingDate"
).value =
    booking.start_date ||
    booking.date ||
    "";


document.getElementById(
    "bookingEndDate"
).value =
    booking.end_date ||
    booking.date ||
    "";


/*
   Visible Hour / Minute +
   Day/Night buttons fill karo
*/

fillBookingTimePicker(
    "start",
    booking.start_time
);


fillBookingTimePicker(
    "end",
    booking.end_time
);


    document.getElementById(
        "bookingResourceType"
    ).value =
        booking.resource_type || "";


    document.getElementById(
        "bookingAdvance"
    ).value =
        Number(
            booking.advance_amount || 0
        );


    document.getElementById(
        "bookingPaymentStatus"
    ).value =
        booking.payment_status || "unpaid";


    document.getElementById(
        "bookingNotes"
    ).value =
        booking.notes || "";


    /* =========================
       RESOURCE DROPDOWN
       ========================= */

    populateResourceDropdown();


    const resourceSelect =
        document.getElementById(
            "bookingResource"
        );


    if (resourceSelect) {

        resourceSelect.value =
            booking.resource_id || "";

    }


    hideBookingError();


    /* =========================
       OPEN POPUP
       ========================= */

    const modal =
        document.getElementById(
            "bookingModal"
        );


    modal?.classList.remove(
        "hidden"
    );

};


window.verifyPayment = async function (bookingId) {

    try {

        await updateDoc(
            doc(window.db, "bookings", bookingId),
            {
                payment_status: "paid",
                advance_paid: true,
                advance_paid_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }
        );

        alert("Payment verified successfully.");

    } catch (error) {

        console.error(error);

        alert("Payment verification failed.");

    }

};



window.acceptBooking = async function (bookingId) {

    try {

        await updateDoc(
            doc(window.db, "bookings", bookingId),
            {
                status: "confirmed",
                updated_at: new Date().toISOString()
            }
        );

    } catch (error) {

        console.error(error);
        alert("Booking could not be accepted.");

    }

};

window.rejectBooking = async function (bookingId) {

    try {

        await updateDoc(
            doc(window.db, "bookings", bookingId),
            {
                status: "rejected",
                updated_at: new Date().toISOString()
            }
        );

    } catch (error) {

        console.error(error);
        alert("Booking could not be rejected.");

    }

};




/* =========================================================
   MARK BOOKING AS ARRIVED
   ========================================================= */

window.markBookingArrived =
async function(
    bookingId
) {

    const booking =
        bookings.find(
            item =>
                item.id === bookingId
        );

    if (!booking) {
        alert("Booking not found.");
        return;
    }

    if (booking.status !== "confirmed") {
        alert("Only confirmed booking can be marked as Arrived.");
        return;
    }

    const confirmed =
        confirm(
            "Mark this customer as Arrived?\n\n" +
            "Customer: " +
            (booking.customer_name || "Customer") +
            "\n" +
            "Resource: " +
            (booking.resource_name || "-")
        );

    if (!confirmed) {
        return;
    }

    try {

        const now =
            new Date().toISOString();

        await updateDoc(
            doc(
                window.db,
                "bookings",
                bookingId
            ),
            {
                status: "arrived",
                arrived_at: now,
                updated_at: now
            }
        );

        console.log(
            "BOOKING ARRIVED:",
            bookingId
        );

    }

    catch (error) {

        console.error(
            "BOOKING ARRIVED ERROR:",
            error
        );

        alert(
            "Booking could not be marked as Arrived."
        );

    }

};


/* =========================================================
   MARK BOOKING AS NO SHOW
   ========================================================= */

window.markBookingNoShow =
async function(
    bookingId
) {

    const booking =
        bookings.find(
            item =>
                item.id === bookingId
        );

    if (!booking) {
        alert("Booking not found.");
        return;
    }

    if (booking.status !== "confirmed") {
        alert("Only confirmed booking can be marked as No Show.");
        return;
    }

    const confirmed =
        confirm(
            "Mark this booking as No Show?\n\n" +
            "Customer: " +
            (booking.customer_name || "Customer") +
            "\n" +
            "Resource: " +
            (booking.resource_name || "-")
        );

    if (!confirmed) {
        return;
    }

    try {

        const now =
            new Date().toISOString();

        await updateDoc(
            doc(
                window.db,
                "bookings",
                bookingId
            ),
            {
                status: "no_show",
                no_show_at: now,
                updated_at: now
            }
        );

        console.log(
            "BOOKING NO SHOW:",
            bookingId
        );

    }

    catch (error) {

        console.error(
            "BOOKING NO SHOW ERROR:",
            error
        );

        alert(
            "Booking could not be marked as No Show."
        );

    }

};


/* =========================================================
   PROCEED BOOKING TO TABLE / ROOM / POOL
   ========================================================= */

window.proceedBooking =
function(
    bookingId
) {

    const booking =
        bookings.find(
            item =>
                item.id === bookingId
        );


    if (!booking) {

        alert(
            "Booking not found."
        );

        return;

    }


    /*
       SAFETY:
       Sirf Arrived booking
       proceed ho sakti hai.
    */

    if (
        booking.status !== "arrived"
    ) {

        alert(
            "Customer must be marked Arrived first."
        );

        return;

    }


    if (
        !booking.resource_id
    ) {

        alert(
            "Booked Table / Room / Pool not found."
        );

        return;

    }


    /*
       Booking ki information temporarily
       browser mein save karenge.

       Tables page isko read karega.
    */

    const proceedData = {

        booking_id:
            booking.id,

        resource_id:
            booking.resource_id,

        resource_name:
            booking.resource_name || "",

        resource_type:
            booking.resource_type || "",

        customer_name:
            booking.customer_name || "",

        customer_phone:
            booking.customer_phone || "",

        advance_amount:
            Number(
                booking.advance_amount || 0
            ),

        payment_status:
            booking.payment_status || "unpaid",

        advance_paid_at:
    booking.advance_paid_at || null,

        branch:
            booking.branch || BRANCH

    };


    localStorage.setItem(
        "pendingBookingProceed",
        JSON.stringify(
            proceedData
        )
    );


    /*
       Existing Tables page par jao.
       Abhi session create NAHI ho raha.
    */

    window.location.href =
        "../html/tables.html";

};

/* =========================================================
   CANCEL BOOKING
   ========================================================= */

window.cancelBooking =
async function(
    bookingId
) {

    const booking =
        bookings.find(
            item =>
                item.id === bookingId
        );


    if (!booking) {

        alert(
            "Booking not found."
        );

        return;

    }


    if (
        booking.status ===
        "cancelled"
    ) {

        alert(
            "This booking is already cancelled."
        );

        return;

    }


    const customerName =
        booking.customer_name ||
        "Customer";


    const resourceName =
        booking.resource_name ||
        getTypeLabel(
            booking.resource_type
        );


    const confirmed =
        confirm(

            "Cancel this booking?\n\n" +

            "Customer: " +
            customerName +
            "\n" +

            "Resource: " +
            resourceName +
            "\n" +

            "Time: " +
            formatBookingTime(
                booking.start_time
            ) +
            " - " +
            formatBookingTime(
                booking.end_time
            )

        );


    if (!confirmed) {
        return;
    }


    try {

        await updateDoc(

            doc(
                window.db,
                "bookings",
                bookingId
            ),

            {

                status:
                    "cancelled",

                cancelled_at:
                    new Date()
                    .toISOString(),

                updated_at:
                    new Date()
                    .toISOString()

            }

        );


        console.log(
            "BOOKING CANCELLED:",
            bookingId
        );


        alert(
            "Booking cancelled successfully."
        );

    }

    catch (error) {

        console.error(
            "BOOKING CANCEL ERROR:",
            error
        );


        alert(
            "Booking could not be cancelled."
        );

    }

};

/* =========================================================
   DELETE CANCELLED BOOKING
   ========================================================= */

window.deleteBooking =
async function(
    bookingId
) {

    const booking =
        bookings.find(
            item =>
                item.id === bookingId
        );


    if (!booking) {

        alert(
            "Booking not found."
        );

        return;

    }


    /*
       SAFETY:
       Only cancelled bookings
       can be permanently deleted.
    */

    if (
        booking.status !==
        "cancelled"
    ) {

        alert(
            "Only cancelled bookings can be deleted."
        );

        return;

    }


    const customerName =
        booking.customer_name ||
        "Customer";


    const resourceName =
        booking.resource_name ||
        getTypeLabel(
            booking.resource_type
        );


    const confirmed =
        confirm(

            "Permanently delete this cancelled booking?\n\n" +

            "Customer: " +
            customerName +
            "\n" +

            "Resource: " +
            resourceName +
            "\n" +

            "Time: " +
            formatBookingTime(
                booking.start_time
            ) +
            " - " +
            formatBookingTime(
                booking.end_time
            ) +
            "\n\n" +

            "This action cannot be undone."

        );


    if (!confirmed) {
        return;
    }


    try {

        await deleteDoc(

            doc(
                window.db,
                "bookings",
                bookingId
            )

        );


        console.log(
            "BOOKING DELETED:",
            bookingId
        );


        alert(
            "Cancelled booking deleted successfully."
        );

    }

    catch (error) {

        console.error(
            "BOOKING DELETE ERROR:",
            error
        );


        alert(
            "Booking could not be deleted."
        );

    }

};

/* =========================================================
   RENDER BOOKINGS
   ========================================================= */

function renderBookings() {

    const tableBody =
        document.getElementById(
            "bookingsTableBody"
        );

    const noBookings =
        document.getElementById(
            "noBookingsMessage"
        );

    if (!tableBody) return;


    /* =========================
       FILTER VALUES
       ========================= */

    const selectedDate =
        document.getElementById(
            "bookingDateFilter"
        )?.value || "";


    const selectedStatus =
        document.getElementById(
            "bookingStatusFilter"
        )?.value || "all";


    const searchText =
        (
            document.getElementById(
                "bookingSearch"
            )?.value || ""
        )
        .trim()
        .toLowerCase();



    /* =========================
       FILTER BOOKINGS
       ========================= */

    let filteredBookings =
        bookings.filter(
            booking => {


const currentDayId =
    getCurrentBookingDayId();

/*
   Manual + Online dono bookings
   sirf CURRENT OPERATIONAL DAY ki
   show hongi.
*/
if (
    currentDayId &&
    String(booking.day_id || "") !==
    String(currentDayId)
) {
    return false;
}
                

const bookingDisplayDate =
    booking.start_date ||
    booking.date ||
    "";

if (
    selectedDate &&
    bookingDisplayDate !== selectedDate
) {

    return false;

}


                if (
                    selectedStatus !== "all" &&
                    booking.status !== selectedStatus
                ) {

                    return false;

                }


                if (searchText) {

                    const searchData = [

                        booking.customer_name || "",

                        booking.customer_phone || "",

                        booking.resource_name || "",

                        booking.resource_type || ""

                    ]
                    .join(" ")
                    .toLowerCase();


                    if (
                        !searchData.includes(
                            searchText
                        )
                    ) {

                        return false;

                    }

                }


                return true;

            }
        );



    /* =========================
       SORT BY START TIME
       ========================= */

    filteredBookings.sort(
        (a, b) => {

            return (
                (a.start_time || "")
                .localeCompare(
                    b.start_time || ""
                )
            );

        }
    );



    /* =========================
       CLEAR OLD ROWS
       ========================= */

    tableBody.innerHTML = "";



    /* =========================
       NO BOOKINGS
       ========================= */

    if (
        filteredBookings.length === 0
    ) {

        if (noBookings) {
            noBookings.style.display =
                "block";
        }

    }

    else {

        if (noBookings) {
            noBookings.style.display =
                "none";
        }

    }



    /* =========================
       CREATE ROWS
       ========================= */

    filteredBookings.forEach(
        booking => {

            const row =
                document.createElement(
                    "tr"
                );


            row.innerHTML = `

<td>
    ${formatBookingTime(
        booking.start_time
    )}
    →
    ${formatBookingTime(
        booking.end_time
    )}

    ${
        (
            booking.end_date ||
            booking.date
        ) !==
        (
            booking.start_date ||
            booking.date
        )
            ? `<span class="booking-next-day">
                   (Next Day)
               </span>`
            : ""
    }
</td>


                <td>
                    ${escapeBookingText(
                        booking.customer_name
                    )}
                </td>


                <td>
                    ${escapeBookingText(
                        booking.customer_phone
                    )}
                </td>


                <td>
                    ${getTypeLabel(
                        booking.resource_type
                    )}
                </td>
                
                
                <td>
                    ${
                        booking.booking_source === "online_customer"
                            ? `
                                <span class="booking-source online">
                                    ONLINE
                                </span>
                            `
                            : `
                                <span class="booking-source staff">
                                    STAFF
                                </span>
                            `
                    }
                </td>
                
                
                <td>
                    ${escapeBookingText(
                        booking.resource_name
                    )}
                </td>


                <td>
                    Rs.
                    ${Number(
                        booking.advance_amount || 0
                    ).toLocaleString()}
                </td>

<td>

    <span class="booking-payment-status
        ${
            booking.payment_status === "paid"
                ? "paid"
                : booking.payment_status === "verification_pending"
                ? "pending"
                : "unpaid"
        }"
    >

        ${
            booking.payment_status === "paid"
                ? "🟢 Paid"
                : booking.payment_status === "verification_pending"
                ? "🟠 Verification Pending"
                : "🔴 Unpaid"
        }

    </span>

</td>


<td
    title="${escapeBookingText(
        booking.notes || ""
    )}"
>
    ${escapeBookingText(
        booking.notes || "-"
    )}
</td>
                

                <td>

                    <span
                        class="booking-status
                        ${getBookingStatusClass(
                            booking.status
                        )}"
                    >

                        ${getBookingStatusLabel(
                            booking.status
                        )}

                    </span>

                </td>


<td>

${
    booking.status === "pending"
    ? `
        ${
            booking.payment_status === "verification_pending"
            ? `
                <button
                    type="button"
                    class="booking-action-btn proceed"
                    onclick="verifyPayment('${booking.id}')"
                >
                    Verify Payment
                </button>
            `
            : ""
        }

        ${
            booking.payment_status === "paid"
            ? `
                <button
                    type="button"
                    class="booking-action-btn arrived"
                    onclick="acceptBooking('${booking.id}')"
                >
                    Accept
                </button>
            `
            : ""
        }

        <button
            type="button"
            class="booking-action-btn cancel"
            onclick="rejectBooking('${booking.id}')"
        >
            Reject
        </button>
    `
    : ""
}


${
    booking.status === "confirmed"
    ? `
        <button
            type="button"
            class="booking-action-btn arrived"
            onclick="markBookingArrived('${booking.id}')"
        >
            Arrived
        </button>
    `
    : ""
}


${
    booking.status === "arrived"
    ? `
        <button
            type="button"
            class="booking-action-btn proceed"
            onclick="proceedBooking('${booking.id}')"
        >
            Proceed
        </button>
    `
    : ""
}


${
    booking.status === "confirmed"
    ? `
        <button
            type="button"
            class="booking-action-btn no-show"
            onclick="markBookingNoShow('${booking.id}')"
        >
            No Show
        </button>
    `
    : ""
}


${
    booking.status !== "cancelled"
    &&
    booking.status !== "completed"
    ? `
        <button
            type="button"
            class="booking-action-btn edit"
            onclick="editBooking('${booking.id}')"
        >
            Edit
        </button>
    `
    : ""
}

    ${
        booking.status !== "cancelled"
        &&
        booking.status !== "completed"
        ? `
            <button
                type="button"
                class="booking-action-btn cancel"
                onclick="cancelBooking('${booking.id}')"
            >
                Cancel
            </button>
        `
        : ""
    }


    ${
        booking.status === "cancelled"
        ? `
            <button
                type="button"
                class="booking-action-btn delete"
                onclick="deleteBooking('${booking.id}')"
            >
                Delete
            </button>
        `
        : ""
    }

</td>

            `;


            tableBody.appendChild(
                row
            );

        }
    );


    updateBookingSummary();

}


/* =========================================================
   BOOKING SUMMARY
   ========================================================= */

function updateBookingSummary() {

const currentDayId =
    getCurrentBookingDayId();

const todayBookings =
    bookings.filter(
        booking => {

            if (
                !currentDayId ||
                String(booking.day_id || "") !==
                String(currentDayId)
            ) {
                return false;
            }

            if (
                booking.status === "cancelled"
            ) {
                return false;
            }

            return true;
        }
    );

    const confirmed =
        todayBookings.filter(
            booking =>
                booking.status ===
                "confirmed"
        );


    const advanceTotal =
        todayBookings.reduce(
            (total, booking) => {

                /*
                   Only count advance
                   marked as PAID.
                */

                if (
                    booking.payment_status ===
                    "paid"
                ) {

                    return (
                        total +
                        Number(
                            booking.advance_amount ||
                            0
                        )
                    );

                }

                return total;

            },

            0
        );


    const totalEl =
        document.getElementById(
            "todayBookingCount"
        );


    const confirmedEl =
        document.getElementById(
            "confirmedBookingCount"
        );


    const advanceEl =
        document.getElementById(
            "bookingAdvanceTotal"
        );


    if (totalEl) {

        totalEl.innerText =
            todayBookings.length;

    }


    if (confirmedEl) {

        confirmedEl.innerText =
            confirmed.length;

    }


    if (advanceEl) {

        advanceEl.innerText =
            "Rs. " +
            advanceTotal.toLocaleString();

    }

}


/* =========================================================
   FORMAT BOOKING TIME
   ========================================================= */

function formatBookingTime(
    time
) {

    if (!time) {
        return "-";
    }


    const parts =
        time.split(":");


    let hour =
        Number(parts[0]);


    const minute =
        parts[1] || "00";


    const period =
        hour >= 12
            ? "PM"
            : "AM";


    hour =
        hour % 12;


    if (hour === 0) {
        hour = 12;
    }


    return (
        hour +
        ":" +
        minute +
        " " +
        period
    );

}


/* =========================================================
   BOOKING STATUS
   ========================================================= */

function getBookingStatusLabel(
    status
) {
    if (
    status === "pending"
) {

    return "Pending";

}
    if (
    status === "rejected"
) {

    return "Rejected";

}

    if (
        status === "no_show"
    ) {

        return "No Show";

    }


    if (
        status === "arrived"
    ) {

        return "Arrived";

    }


    if (
        status === "completed"
    ) {

        return "Completed";

    }


    if (
        status === "cancelled"
    ) {

        return "Cancelled";

    }


    return "Confirmed";

}


function getBookingStatusClass(
    status
) {
    if (
    status === "pending"
) {

    return "pending";

}

    if (
    status === "rejected"
) {

    return "rejected";

}

    if (
        status === "no_show"
    ) {

        return "no-show";

    }


    return status || "confirmed";

}


/* =========================================================
   SAFE TEXT
   ========================================================= */

function escapeBookingText(
    value
) {

    return String(
        value || "-"
    )

    .replaceAll(
        "&",
        "&amp;"
    )

    .replaceAll(
        "<",
        "&lt;"
    )

    .replaceAll(
        ">",
        "&gt;"
    )

    .replaceAll(
        '"',
        "&quot;"
    )

    .replaceAll(
        "'",
        "&#039;"
    );

}


/* =========================================================
   BOOKING FILTER EVENTS
   ========================================================= */

document
    .getElementById(
        "bookingDateFilter"
    )
    ?.addEventListener(
        "change",
        renderBookings
    );


document
    .getElementById(
        "bookingStatusFilter"
    )
    ?.addEventListener(
        "change",
        renderBookings
    );


document
    .getElementById(
        "bookingSearch"
    )
    ?.addEventListener(
        "input",
        renderBookings
    );


/* =========================================================
   ERROR
   ========================================================= */

function showBookingError(
    message
) {

    const errorBox =
        document.getElementById(
            "bookingError"
        );


    if (!errorBox) return;


    errorBox.innerText =
        message;


    errorBox.classList.remove(
        "hidden"
    );

}


function hideBookingError() {

    const errorBox =
        document.getElementById(
            "bookingError"
        );


    if (!errorBox) return;


    errorBox.innerText = "";


    errorBox.classList.add(
        "hidden"
    );

}
