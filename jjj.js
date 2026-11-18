const STORAGE_KEY = "foodsaver_products";
const SETTINGS_KEY = "foodsaver_settings";

let products = [];
let darkMode = false;

const $ = (id) => document.getElementById(id);

function todayISO() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


function formatDate(date) {
    if (!date) return "";

    return new Date(date + "T00:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
    });
}

function dayDifference(date) {
    const today = new Date(todayISO() + "T00:00:00");
    const expiration = new Date(date + "T00:00:00");

    return Math.round((expiration - today) / (1000 * 60 * 60 * 24));
}

function getStatus(product) {
    const days = dayDifference(product.expiration);

    if (days < 0) {
        return "Expired";
    }

    if (days <= 7) {
        return "Expiring Soon";
    }

    return "Available";
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
        const characters = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        };

        return characters[char];
    });
}

function loadProducts() {
    const savedProducts = localStorage.getItem(STORAGE_KEY);

    products = savedProducts ? JSON.parse(savedProducts) : [];
}

function saveProducts() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

function loadSettings() {
    const savedSettings = localStorage.getItem(SETTINGS_KEY);

    if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        darkMode = settings.darkMode || false;
    }

    $("darkModeToggle").checked = darkMode;
    document.body.classList.toggle("dark-mode", darkMode);
}

function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
        darkMode: darkMode
    }));
}

function showToast(message) {
    const toast = $("toast");

    toast.textContent = message;
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}

function navigate(page) {
    document.querySelectorAll(".page").forEach(section => {
        section.classList.remove("active-page");
    });

    document.querySelectorAll(".nav-link").forEach(button => {
        button.classList.remove("active");
    });

    const selectedPage = $("page-" + page);

    if (selectedPage) {
        selectedPage.classList.add("active-page");
    }

    const selectedButton = document.querySelector(
        `.nav-link[data-page="${page}"]`
    );

    if (selectedButton) {
        selectedButton.classList.add("active");
    }

    $("pageHeading").textContent = {
        dashboard: "Dashboard",
        inventory: "Food Inventory",
        expiration: "Expiration Monitoring",
        notifications: "Notifications",
        reports: "Reports",
        settings: "Settings"
    }[page] || "Dashboard";

    $("sidebar").classList.remove("show");

    renderAll();
}

function renderDashboard() {
    const total = products.length;

    const available = products.filter(
        product => getStatus(product) === "Available"
    ).length;

    const expiring = products.filter(
        product => getStatus(product) === "Expiring Soon"
    ).length;

    const expired = products.filter(
        product => getStatus(product) === "Expired"
    ).length;

    $("totalProducts").textContent = total;
    $("availableProducts").textContent = available;
    $("expiringProducts").textContent = expiring;
    $("expiredProducts").textContent = expired;

    const recent = [...products]
        .sort((a, b) => b.addedAt - a.addedAt)
        .slice(0, 5);

    if (recent.length === 0) {
        $("recentProducts").innerHTML = `
            <div class="empty-state">
                <p>No products added yet.</p>
                <small>Add products in Food Inventory.</small>
            </div>
        `;
        return;
    }

    $("recentProducts").innerHTML = recent.map(product => `
        <div class="recent-item">
            <div>
                <strong>${escapeHTML(product.name)}</strong>
                <small>
                    ${escapeHTML(product.category)} ·
                    ${escapeHTML(product.quantity)} ${escapeHTML(product.unit)}
                </small>
            </div>

            <span class="status-badge ${getStatus(product).toLowerCase().replace(" ", "-")}">
                ${getStatus(product)}
            </span>
        </div>
    `).join("");
}

function renderInventory() {
    const search = $("searchInput").value.toLowerCase();
    const category = $("categoryFilter").value;
    const status = $("statusFilter").value;

    const filteredProducts = products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(search);
        const matchesCategory = !category || product.category === category;
        const matchesStatus = !status || getStatus(product) === status;

        return matchesSearch && matchesCategory && matchesStatus;
    });

    if (filteredProducts.length === 0) {
        $("inventoryTable").innerHTML = `
            <div class="empty-state">
                <p>No products found.</p>
                <small>Try adding a product or changing your filters.</small>
            </div>
        `;
        return;
    }

    $("inventoryTable").innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>Product Name</th>
                    <th>Category</th>
                    <th>Quantity</th>
                    <th>Expiration Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>

            <tbody>
                ${filteredProducts.map(product => `
                    <tr>
                        <td>${escapeHTML(product.name)}</td>

                        <td>${escapeHTML(product.category)}</td>

                        <td>
                            ${escapeHTML(product.quantity)}
                            ${escapeHTML(product.unit)}
                        </td>

                        <td>${formatDate(product.expiration)}</td>

                        <td>
                            <span class="status-badge ${getStatus(product).toLowerCase().replace(" ", "-")}">
                                ${getStatus(product)}
                            </span>
                        </td>

                        <td>
                            <button class="action-btn edit-btn"
                                data-edit="${product.id}">
                                Edit
                            </button>

                            <button class="action-btn delete-btn"
                                data-delete="${product.id}">
                                Delete
                            </button>
                        </td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;
}

function renderExpiration() {
    const expiring = products.filter(
        product => getStatus(product) === "Expiring Soon"
    );

    const expired = products.filter(
        product => getStatus(product) === "Expired"
    );

    $("expiringCount").textContent = expiring.length;
    $("expiredCount").textContent = expired.length;

    const items = [...expiring, ...expired].sort(
        (a, b) => a.expiration.localeCompare(b.expiration)
    );

    if (items.length === 0) {
        $("expirationList").innerHTML = `
            <div class="empty-state">
                <p>No products need attention.</p>
                <small>Your inventory is up to date.</small>
            </div>
        `;
        return;
    }

    $("expirationList").innerHTML = items.map(product => `
        <div class="expiration-item">
            <div>
                <strong>${escapeHTML(product.name)}</strong>
                <small>
                    Expires: ${formatDate(product.expiration)}
                </small>
            </div>

            <span class="status-badge ${getStatus(product).toLowerCase().replace(" ", "-")}">
                ${getStatus(product)}
            </span>
        </div>
    `).join("");
}

function renderNotifications() {
    const alerts = products.filter(
        product => getStatus(product) !== "Available"
    );

    $("notificationBadge").textContent = alerts.length;

    $("notificationBadge").classList.toggle(
        "hidden",
        alerts.length === 0
    );

    if (alerts.length === 0) {
        $("notificationList").innerHTML = `
            <div class="empty-state">
                <p>No notifications.</p>
                <small>There are no expiration alerts right now.</small>
            </div>
        `;
        return;
    }

    $("notificationList").innerHTML = alerts.map(product => {
        const status = getStatus(product);

        let message = "";

        if (status === "Expired") {
            message = "This product has already expired.";
        } else {
            message = "This product is expiring within 7 days.";
        }

        return `
            <div class="notification-item">
                <div>
                    <strong>${escapeHTML(product.name)}</strong>
                    <p>${message}</p>
                    <small>Expiration date: ${formatDate(product.expiration)}</small>
                </div>

                <span class="status-badge ${status.toLowerCase().replace(" ", "-")}">
                    ${status}
                </span>
            </div>
        `;
    }).join("");
}

function renderReports() {
    const available = products.filter(
        product => getStatus(product) === "Available"
    ).length;

    const expiring = products.filter(
        product => getStatus(product) === "Expiring Soon"
    ).length;

    const expired = products.filter(
        product => getStatus(product) === "Expired"
    ).length;

    $("reportTotal").textContent = products.length;
    $("reportAvailable").textContent = available;
    $("reportExpiring").textContent = expiring;
    $("reportExpired").textContent = expired;

    const categories = {};

    products.forEach(product => {
        categories[product.category] =
            (categories[product.category] || 0) + 1;
    });

    if (Object.keys(categories).length === 0) {
        $("categoryReport").innerHTML = `
            <div class="empty-state">
                <p>No category data available.</p>
            </div>
        `;
        return;
    }

    $("categoryReport").innerHTML = Object.entries(categories)
        .map(([category, count]) => `
            <div class="category-item">
                <span>${escapeHTML(category)}</span>
                <strong>${count}</strong>
            </div>
        `).join("");
}

function renderAll() {
    renderDashboard();
    renderInventory();
    renderExpiration();
    renderNotifications();
    renderReports();
}

function openModal(product = null) {
    $("productForm").reset();
    $("productId").value = "";

    if (product) {
        $("modalTitle").textContent = "Edit Product";

        $("productId").value = product.id;
        $("productName").value = product.name;
        $("productCategory").value = product.category;
        $("productQuantity").value = product.quantity;
        $("productUnit").value = product.unit;
        $("productExpiration").value = product.expiration;
    } else {
        $("modalTitle").textContent = "Add New Product";
        $("productExpiration").min = todayISO();
    }

    $("productModal").classList.remove("hidden");
}

function closeModal() {
    $("productModal").classList.add("hidden");
    $("productForm").reset();
}

function handleProductSubmit(event) {
    event.preventDefault();

    const id = $("productId").value;

    const name = $("productName").value.trim();
    const category = $("productCategory").value;
    const quantity = Number($("productQuantity").value);
    const unit = $("productUnit").value;
    const expiration = $("productExpiration").value;

    if (!name || !category || !unit || !expiration || quantity <= 0) {
        showToast("Please complete all fields.");
        return;
    }

    if (expiration < todayISO()) {
        showToast("Expiration date cannot be in the past.");
        return;
    }

    if (id) {
        const index = products.findIndex(
            product => String(product.id) === id
        );

        if (index !== -1) {
            products[index] = {
                ...products[index],
                name,
                category,
                quantity,
                unit,
                expiration
            };
        }

        showToast("Product updated successfully!");

    } else {
        const newProduct = {
            id: Date.now(),
            name,
            category,
            quantity,
            unit,
            expiration,
            addedAt: Date.now()
        };

        products.push(newProduct);

        showToast("Product added successfully!");
    }

    saveProducts();
    closeModal();
    renderAll();
}

function editProduct(id) {
    const product = products.find(
        item => String(item.id) === String(id)
    );

    if (product) {
        openModal(product);
    }
}

function deleteProduct(id) {
    const confirmed = confirm(
        "Are you sure you want to delete this product?"
    );

    if (!confirmed) return;

    products = products.filter(
        product => String(product.id) !== String(id)
    );

    saveProducts();
    renderAll();

    showToast("Product deleted successfully!");
}

function clearAllData() {
    if (products.length === 0) {
        showToast("Your inventory is already empty.");
        return;
    }

    const confirmed = confirm(
        "Are you sure you want to delete all inventory data?"
    );

    if (!confirmed) return;

    products = [];

    saveProducts();
    renderAll();

    showToast("All inventory data has been cleared.");
}

function printReport() {
    window.print();
}

function updateDate() {
    $("todayLabel").textContent = new Date().toLocaleDateString(
        "en-US",
        {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric"
        }
    );

    $("yearLabel").textContent = new Date().getFullYear();
}

function startApp() {
    $("welcomeScreen").classList.add("hidden");
    $("app").classList.remove("hidden");

    renderAll();

    showToast("Welcome to FoodSaver!");
}

function init() {
    loadProducts();
    loadSettings();
    updateDate();

    $("getStartedBtn").addEventListener("click", startApp);

    document.querySelectorAll(".nav-link").forEach(button => {
        button.addEventListener("click", () => {
            navigate(button.dataset.page);
        });
    });

    document.querySelectorAll("[data-go]").forEach(button => {
        button.addEventListener("click", () => {
            navigate(button.dataset.go);
        });
    });

    $("addProductBtn").addEventListener("click", () => {
        openModal();
    });

    $("closeModalBtn").addEventListener("click", closeModal);
    $("cancelModalBtn").addEventListener("click", closeModal);

    $("productModal").addEventListener("click", event => {
        if (event.target.hasAttribute("data-close-modal")) {
            closeModal();
        }
    });

    $("productForm").addEventListener(
        "submit",
        handleProductSubmit
    );

    $("searchInput").addEventListener("input", renderInventory);

    $("categoryFilter").addEventListener(
        "change",
        renderInventory
    );

    $("statusFilter").addEventListener(
        "change",
        renderInventory
    );

    $("inventoryTable").addEventListener("click", event => {
        const editButton = event.target.closest("[data-edit]");
        const deleteButton = event.target.closest("[data-delete]");

        if (editButton) {
            editProduct(editButton.dataset.edit);
        }

        if (deleteButton) {
            deleteProduct(deleteButton.dataset.delete);
        }
    });

    $("refreshNotifications").addEventListener("click", () => {
        renderNotifications();
        showToast("Notifications refreshed.");
    });

    $("printReportBtn").addEventListener("click", printReport);

    $("clearDataBtn").addEventListener("click", clearAllData);


    // DARK MODE
    $("darkModeToggle").addEventListener("change", event => {
        darkMode = event.target.checked;

        document.body.classList.toggle("dark-mode", darkMode);

        saveSettings();
    });

    $("menuToggle").addEventListener("click", () => {
        $("sidebar").classList.toggle("show");
    });

    renderAll();
}

document.addEventListener("DOMContentLoaded", init);
