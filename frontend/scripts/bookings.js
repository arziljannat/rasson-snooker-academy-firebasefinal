import {
    collection,
    query,
    where,
    onSnapshot
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
   TEMP FORM TEST
   ========================================================= */

/*
   IMPORTANT:

   Is step mein booking Firebase
   mein SAVE NAHI kar rahe.

   Pehle confirm karenge ke:

   1. popup works
   2. current branch correct hai
   3. tables load ho rahe hain
   4. rooms load ho rahe hain
   5. pool load ho raha hai

   Uske baad next step mein
   bookings collection banegi.
*/


const bookingForm =
    document.getElementById(
        "bookingForm"
    );


if (bookingForm) {

    bookingForm.addEventListener(
        "submit",
        event => {

            event.preventDefault();


            const type =
                document.getElementById(
                    "bookingResourceType"
                )?.value;


            const resource =
                document.getElementById(
                    "bookingResource"
                )?.value;


            if (
                !type ||
                !resource
            ) {

                showBookingError(
                    "Please select Table / Room / Pool."
                );

                return;

            }


            console.log(
                "BOOKING FORM TEST OK"
            );


            console.log({

                customer:
                    document.getElementById(
                        "bookingCustomerName"
                    )?.value,

                phone:
                    document.getElementById(
                        "bookingCustomerPhone"
                    )?.value,

                date:
                    document.getElementById(
                        "bookingDate"
                    )?.value,

                start:
                    document.getElementById(
                        "bookingStartTime"
                    )?.value,

                end:
                    document.getElementById(
                        "bookingEndTime"
                    )?.value,

                type,

                resource

            });


            alert(
                "Booking form is working.\nFirebase save will be added in next step."
            );

        }
    );

}


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
