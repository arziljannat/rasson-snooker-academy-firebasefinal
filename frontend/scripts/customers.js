import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";


const db = window.db;

const CURRENT_BRANCH = (
    localStorage.getItem("branch") || ""
)
.replace(/\s+/g, "")
.toLowerCase();


let customers = [];


/* =====================================================
   PHONE NORMALIZATION

   03001234567
   +923001234567
   923001234567

   sab same customer identify karenge
===================================================== */

function normalizePhone(phone) {

    let value = String(phone || "")
        .replace(/\D/g, "");

    if (value.startsWith("0092")) {
        value = value.substring(4);
    }

    if (value.startsWith("92")) {
        value = value.substring(2);
    }

    if (value.startsWith("0")) {
        value = value.substring(1);
    }

    return value;
}


/* =====================================================
   CUSTOMER ID
===================================================== */

function generateCustomerId() {

    const timePart =
        Date.now()
            .toString()
            .slice(-8);

    const randomPart =
        Math.floor(
            100 + Math.random() * 900
        );

    return `C-${timePart}${randomPart}`;
}


/* =====================================================
   LOAD CUSTOMERS

   IMPORTANT:
   Customers GLOBAL hain.
   Branch filter yahan nahi lagana.
===================================================== */

async function loadCustomers() {

    try {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    "customers"
                )
            );

        customers = [];

        snapshot.forEach(docSnap => {

            customers.push({
                id: docSnap.id,
                ...docSnap.data()
            });

        });

        customers.sort((a, b) => {

            const aTime =
                new Date(
                    a.created_at || 0
                ).getTime();

            const bTime =
                new Date(
                    b.created_at || 0
                ).getTime();

            return bTime - aTime;

        });


        renderCustomers(customers);

        updateSummary();

    }
    catch (error) {

        console.error(
            "CUSTOMERS LOAD ERROR:",
            error
        );

        alert(
            "Customers load nahi ho sake."
        );

    }

}


/* =====================================================
   RENDER
===================================================== */

function renderCustomers(list) {

    const body =
        document.getElementById(
            "customersBody"
        );

    if (!body) return;

    body.innerHTML = "";


    if (!list.length) {

        body.innerHTML = `
            <tr>
                <td colspan="8">
                    No customers found
                </td>
            </tr>
        `;

        return;
    }


    list.forEach(customer => {

        const balance =
            Number(
                customer.balance || 0
            );

        const purchase =
            Number(
                customer.total_purchase || 0
            );

        const visits =
            Number(
                customer.total_visits || 0
            );


        const row =
            document.createElement("tr");


        row.innerHTML = `

            <td>
                ${customer.customer_id || "-"}
            </td>

            <td>
                ${escapeHtml(customer.name || "-")}
            </td>

            <td>
                ${escapeHtml(customer.phone || "-")}
            </td>

            <td>
                ${formatBranch(
                    customer.created_at_branch
                )}
            </td>

            <td>
                ${visits}
            </td>

            <td>
                ${purchase.toLocaleString()} PKR
            </td>

            <td class="${
                balance > 0
                    ? "balance-due"
                    : "balance-clear"
            }">
                ${balance.toLocaleString()} PKR
            </td>

            <td>

                <button
                    class="view-customer-btn"
                    onclick="openCustomerProfile('${customer.id}')"
                >
                    View
                </button>

            </td>

        `;


        body.appendChild(row);

    });

}


/* =====================================================
   SUMMARY
===================================================== */

function updateSummary() {

    const total =
        customers.length;


    const totalBalance =
        customers.reduce(
            (sum, customer) =>
                sum +
                Number(
                    customer.balance || 0
                ),
            0
        );


    const currentBranchCustomers =
        customers.filter(customer =>

            (
                customer.created_at_branch || ""
            )
            .replace(/\s+/g, "")
            .toLowerCase()

            === CURRENT_BRANCH

        ).length;


    document.getElementById(
        "totalCustomers"
    ).textContent =
        total.toLocaleString();


    document.getElementById(
        "totalReceivable"
    ).textContent =
        `${totalBalance.toLocaleString()} PKR`;


    document.getElementById(
        "branchCustomers"
    ).textContent =
        currentBranchCustomers.toLocaleString();

}


/* =====================================================
   ADD CUSTOMER POPUP
===================================================== */

window.openCustomerPopup = () => {

    document
        .getElementById(
            "customerPopup"
        )
        .classList
        .remove("hide");

};


window.closeCustomerPopup = () => {

    document
        .getElementById(
            "customerPopup"
        )
        .classList
        .add("hide");

};


/* =====================================================
   SAVE CUSTOMER
===================================================== */

window.saveCustomer = async () => {

    const name =
        document
            .getElementById(
                "customerName"
            )
            .value
            .trim();


    const phone =
        document
            .getElementById(
                "customerPhone"
            )
            .value
            .trim();


    const notes =
        document
            .getElementById(
                "customerNotes"
            )
            .value
            .trim();


    if (!name) {

        alert(
            "Customer name enter karein."
        );

        return;

    }


    if (!phone) {

        alert(
            "Mobile number enter karein."
        );

        return;

    }


    const normalizedPhone =
        normalizePhone(phone);


    if (
        normalizedPhone.length < 10
    ) {

        alert(
            "Valid mobile number enter karein."
        );

        return;

    }


    /*
       GLOBAL DUPLICATE CHECK

       Branch intentionally check nahi kar rahe.

       Same phone Rasson1 / Rasson8 par
       bhi SAME customer hai.
    */

    const duplicateQuery =
        query(
            collection(
                db,
                "customers"
            ),

            where(
                "phone_normalized",
                "==",
                normalizedPhone
            )
        );


    const duplicateSnapshot =
        await getDocs(
            duplicateQuery
        );


    if (!duplicateSnapshot.empty) {

        const existing =
            duplicateSnapshot
                .docs[0]
                .data();


        alert(
            `Customer already exists.\n\n` +
            `${existing.name || ""}\n` +
            `${existing.phone || ""}\n` +
            `${existing.customer_id || ""}`
        );

        return;

    }


    try {

        const now =
            new Date()
                .toISOString();


        await addDoc(
            collection(
                db,
                "customers"
            ),
            {

                customer_id:
                    generateCustomerId(),

                name,

                phone,

                phone_normalized:
                    normalizedPhone,

                notes,

                /*
                   CUSTOMER GLOBAL HAI.

                   Ye sirf batata hai
                   pehli baar kis branch
                   se create hua.
                */

                created_at_branch:
                    CURRENT_BRANCH,

                source:
                    "software",

                total_visits: 0,

                total_purchase: 0,

                total_received: 0,

                balance: 0,

                created_at:
                    now,

                updated_at:
                    now

            }
        );


        document.getElementById(
            "customerName"
        ).value = "";

        document.getElementById(
            "customerPhone"
        ).value = "";

        document.getElementById(
            "customerNotes"
        ).value = "";


        closeCustomerPopup();


        alert(
            "Customer added successfully."
        );


        await loadCustomers();

    }
    catch (error) {

        console.error(
            "CUSTOMER SAVE ERROR:",
            error
        );

        alert(
            "Customer save nahi hua."
        );

    }

};


/* =====================================================
   SEARCH
===================================================== */

const searchInput =
    document.getElementById(
        "customerSearch"
    );


if (searchInput) {

    searchInput.addEventListener(
        "input",
        () => {

            const value =
                searchInput
                    .value
                    .trim()
                    .toLowerCase();


            const phoneSearch =
                normalizePhone(value);


            const filtered =
                customers.filter(customer => {

                    const name =
                        String(
                            customer.name || ""
                        )
                        .toLowerCase();


                    const phone =
                        String(
                            customer.phone_normalized || ""
                        );


                    const customerId =
                        String(
                            customer.customer_id || ""
                        )
                        .toLowerCase();


                    return (
                        name.includes(value) ||

                        customerId.includes(value) ||

                        (
                            phoneSearch &&
                            phone.includes(
                                phoneSearch
                            )
                        )
                    );

                });


            renderCustomers(
                filtered
            );

        }
    );

}


/* =====================================================
   CUSTOMER PROFILE
===================================================== */

window.openCustomerProfile =
async (documentId) => {

    const customer =
        customers.find(
            item =>
                item.id === documentId
        );


    if (!customer) return;


    document.getElementById(
        "profileName"
    ).textContent =
        customer.name || "Customer";


    document.getElementById(
        "profileCustomerId"
    ).textContent =
        customer.customer_id || "-";


    document.getElementById(
        "profilePhone"
    ).textContent =
        customer.phone || "-";


    document.getElementById(
        "profileVisits"
    ).textContent =
        Number(
            customer.total_visits || 0
        ).toLocaleString();


    document.getElementById(
        "profilePurchase"
    ).textContent =
        `${
            Number(
                customer.total_purchase || 0
            ).toLocaleString()
        } PKR`;


    document.getElementById(
        "profileBalance"
    ).textContent =
        `${
            Number(
                customer.balance || 0
            ).toLocaleString()
        } PKR`;


    document
        .getElementById(
            "customerProfilePopup"
        )
        .classList
        .remove("hide");


    await loadCustomerLedger(
        documentId
    );

};


window.closeCustomerProfile = () => {

    document
        .getElementById(
            "customerProfilePopup"
        )
        .classList
        .add("hide");

};


/* =====================================================
   LEDGER

   Abhi ledger empty hoga.
   Tables integration ke baad
   transactions yahan aayengi.
===================================================== */

async function loadCustomerLedger(
    customerDocumentId
) {

    const body =
        document.getElementById(
            "customerLedgerBody"
        );


    body.innerHTML = `
        <tr>
            <td colspan="6">
                Loading...
            </td>
        </tr>
    `;


    try {

        const ledgerQuery =
            query(
                collection(
                    db,
                    "customer_ledger"
                ),

                where(
                    "customer_id",
                    "==",
                    customerDocumentId
                )
            );


        const snapshot =
            await getDocs(
                ledgerQuery
            );


        const ledger = [];


        snapshot.forEach(docSnap => {

            ledger.push({
                id: docSnap.id,
                ...docSnap.data()
            });

        });


        ledger.sort(
            (a, b) =>
                new Date(
                    b.created_at || 0
                ) -
                new Date(
                    a.created_at || 0
                )
        );


        if (!ledger.length) {

            body.innerHTML = `
                <tr>
                    <td colspan="6">
                        No transactions yet
                    </td>
                </tr>
            `;

            return;

        }


        body.innerHTML = "";


        ledger.forEach(item => {

            const row =
                document.createElement(
                    "tr"
                );


            row.innerHTML = `

                <td>
                    ${formatDate(
                        item.created_at
                    )}
                </td>

                <td>
                    ${formatBranch(
                        item.branch
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        item.description || "-"
                    )}
                </td>

                <td>
                    ${Number(
                        item.debit || 0
                    ).toLocaleString()}
                </td>

                <td>
                    ${Number(
                        item.credit || 0
                    ).toLocaleString()}
                </td>

                <td>
                    ${Number(
                        item.balance_after || 0
                    ).toLocaleString()}
                </td>

            `;


            body.appendChild(
                row
            );

        });

    }
    catch (error) {

        console.error(
            "LEDGER LOAD ERROR:",
            error
        );


        body.innerHTML = `
            <tr>
                <td colspan="6">
                    Ledger could not load
                </td>
            </tr>
        `;

    }

}


/* =====================================================
   HELPERS
===================================================== */

function formatBranch(value) {

    if (!value) return "-";

    const clean =
        String(value)
            .replace(/\s+/g, "")
            .toLowerCase();

    const match =
        clean.match(
            /^rasson(\d+)$/
        );

    if (match) {
        return `Rasson ${match[1]}`;
    }

    return value;

}


function formatDate(value) {

    if (!value) return "-";

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) return "-";


    return date.toLocaleString(
        "en-PK",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true
        }
    );

}


function escapeHtml(value) {

    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/* =====================================================
   START
===================================================== */

loadCustomers();
