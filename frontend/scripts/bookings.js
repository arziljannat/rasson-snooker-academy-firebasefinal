import {
    collection,
    query,
    where,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    doc
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

    if (filter) {
        filter.value = today;
    }

    if (bookingDate) {
        bookingDate.value = today;
        bookingDate.min = today;
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


    const bookingDate =
        document.getElementById(
            "bookingDate"
        );

    if (bookingDate) {

        const today =
            getLocalDateString(
                new Date()
            );

        bookingDate.value = today;
        bookingDate.min = today;

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
    bookingDate,
    startTime,
    endTime
) {

    return bookings.some(
        booking => {

            if (
    editingBookingId &&
    booking.id === editingBookingId
) {
    return false;
}

            /*
               Cancelled / No Show booking
               does not block the resource.
            */

            if (
                booking.status === "cancelled" ||
                booking.status === "no_show"
            ) {

                return false;

            }


            /*
               Must be same date.
            */

            if (
                booking.date !==
                bookingDate
            ) {

                return false;

            }


            /*
               Must be same Table / Room / Pool.
            */

            if (
                booking.resource_id !==
                resourceId
            ) {

                return false;

            }


            /*
               Time overlap:

               Existing: 8 PM - 10 PM
               New:      9 PM - 11 PM

               = BLOCKED

               Existing: 8 PM - 10 PM
               New:     10 PM - 11 PM

               = ALLOWED
            */

            return (
                startTime <
                    booking.end_time
                &&
                endTime >
                    booking.start_time
            );

        }
    );

}


/* =========================================================
   FIND AVAILABLE RESOURCE
   FOR "ANY AVAILABLE"
   ========================================================= */

function findAvailableResource(
    type,
    bookingDate,
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
                bookingDate,
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


            const startTime =
                document.getElementById(
                    "bookingStartTime"
                ).value;


            const endTime =
                document.getElementById(
                    "bookingEndTime"
                ).value;


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


            if (
                startTime >= endTime
            ) {

                showBookingError(
                    "End time must be after start time."
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


                const bookingData = {

                    branch:
                        BRANCH,

                    customer_name:
                        customerName,

                    customer_phone:
                        customerPhone,

                    date:
                        bookingDate,

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

    await updateDoc(

        doc(
            window.db,
            "bookings",
            editingBookingId
        ),

        {
            ...bookingData,

            /*
               Existing booking ka
               original status preserve karo.
            */

            status:
                bookings.find(
                    item =>
                        item.id ===
                        editingBookingId
                )?.status ||
                "confirmed",

            /*
               Original creation date
               overwrite nahi karni.
            */

            created_at:
                bookings.find(
                    item =>
                        item.id ===
                        editingBookingId
                )?.created_at ||
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
        booking.date || "";


    document.getElementById(
        "bookingStartTime"
    ).value =
        booking.start_time || "";


    document.getElementById(
        "bookingEndTime"
    ).value =
        booking.end_time || "";


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

                if (
                    selectedDate &&
                    booking.date !== selectedDate
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
                    -
                    ${formatBookingTime(
                        booking.end_time
                    )}
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

    <span
        class="booking-payment-status ${
            booking.payment_status === "paid"
                ? "paid"
                : "unpaid"
        }"
    >
        ${
            booking.payment_status === "paid"
                ? "Paid"
                : "Unpaid"
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

    const today =
        getLocalDateString(
            new Date()
        );


    const todayBookings =
        bookings.filter(
            booking =>

                booking.date === today &&

                booking.status !==
                    "cancelled"

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
