
const token = localStorage.getItem("productvault_token");

if (!token) {
    window.location.replace("/");
} else {
    initializeDashboard();
}

function initializeDashboard() {
    const productsElement = document.getElementById("products");
    const statusElement = document.getElementById("status");
    const formPanel = document.getElementById("product-form");
    const editor = document.getElementById("product-editor");
    const searchInput = document.getElementById("search");
    const sortSelect = document.getElementById("sort");

    const LIMIT = 6;

    let page = 0;
    let totalPages = 0;
    let totalProducts = 0;
    let loading = false;
    let searchMode = false;
    let editingId = null;
    let searchTimer = null;
    let requestVersion = 0;
    let scrollTriggerArmed = true;

    if (
        !productsElement ||
        !statusElement ||
        !formPanel ||
        !editor ||
        !searchInput ||
        !sortSelect
    ) {
        console.error("A required dashboard element is missing.");
        return;
    }

    // Remove any Load More button left by an earlier version.
    document.getElementById("load-more-products")?.remove();

    async function api(url, options = {}) {
        const headers = {
            Authorization: `Bearer ${token}`,
            ...options.headers
        };

        if (options.body) {
            headers["Content-Type"] = "application/json";
        }

        const response = await fetch(url, {
            ...options,
            headers,
            cache: "no-store"
        });

        const result = await response.json().catch(() => ({}));

        if (response.status === 401) {
            localStorage.removeItem("productvault_token");
            localStorage.removeItem("productvault_user");
            window.location.replace("/");
            throw new Error("Session expired. Please log in again.");
        }

        if (!response.ok) {
            throw new Error(result.message || "Request failed.");
        }

        return result;
    }

    function makeElement(tag, text, className = "") {
        const element = document.createElement(tag);
        element.textContent = text;

        if (className) {
            element.className = className;
        }

        return element;
    }

    function updateStatus() {
        const count =
            productsElement.querySelectorAll(".product-card").length;

        if (searchMode) {
            statusElement.textContent =
                `Showing ${count} matching products`;
        } else if (totalProducts === 0) {
            statusElement.textContent = "No products available.";
        } else {
            statusElement.textContent =
                `Showing ${count} of ${totalProducts} products` +
                (page >= totalPages
                    ? " — All products loaded."
                    : ` — Batch ${page} of ${totalPages}. Scroll down for 6 more.`);
        }
    }

    function renderProduct(product) {
        const card = makeElement("article", "", "product-card");
        card.dataset.productId = product.id;

        if (product.image_path) {
            const image = document.createElement("img");
            image.src = product.image_path;
            image.alt = product.name;
            image.style.width = "100%";
            image.style.height = "180px";
            image.style.objectFit = "contain";
            card.appendChild(image);
        }

        card.appendChild(makeElement("h3", product.name));
        card.appendChild(
            makeElement("p", product.description || "No description")
        );
        card.appendChild(
            makeElement(
                "p",
                `Price: ${Number(product.price).toFixed(2)}`,
                "price"
            )
        );

        const actions = makeElement("div", "", "card-actions");

        const editButton = makeElement("button", "Edit");
        editButton.addEventListener("click", () => openForm(product));

        const deleteButton = makeElement("button", "Delete", "danger");
        deleteButton.addEventListener("click", () => deleteProduct(product.id));

        actions.append(editButton, deleteButton);
        card.appendChild(actions);
        productsElement.appendChild(card);
    }

    async function loadBatch(reset = false) {
        if (loading) return;

        if (reset) {
            requestVersion++;
            page = 0;
            totalPages = 0;
            totalProducts = 0;
            searchMode = false;
            scrollTriggerArmed = true;
            productsElement.replaceChildren();
        } else if (page >= totalPages) {
            return;
        }

        const thisRequest = requestVersion;
        loading = true;
        updateStatus();

        try {
            const requestedPage = page + 1;

            const params = new URLSearchParams({
                page: String(requestedPage),
                limit: String(LIMIT),
                sort: sortSelect.value
            });

            const result = await api(
                `/api/products?${params.toString()}&_=${Date.now()}`
            );

            if (thisRequest !== requestVersion) return;

            if (!Array.isArray(result.products)) {
                throw new Error("The server returned an invalid product list.");
            }

            page = requestedPage;
            totalPages = Number(result.totalPages) || 0;
            totalProducts = Number(result.total) || 0;

            result.products.forEach(renderProduct);

            console.log("Product batch loaded:", {
                batch: page,
                requested: LIMIT,
                received: result.products.length,
                displayed: productsElement.querySelectorAll(".product-card").length,
                total: totalProducts
            });
        } catch (error) {
            if (thisRequest === requestVersion) {
                console.error("Product loading failed:", error);
                statusElement.textContent =
                    `Could not load products: ${error.message}`;
            }
        } finally {
            if (thisRequest === requestVersion) {
                loading = false;
                updateStatus();
            }
        }
    }

    // Automatic infinite scrolling: one batch per bottom-reaching scroll.
    function handleScroll() {
        if (loading || searchMode || page >= totalPages) return;

        const distanceFromBottom =
            document.documentElement.scrollHeight -
            window.innerHeight -
            window.scrollY;

        // Rearm only after moving away from the bottom.
        if (distanceFromBottom > 250) {
            scrollTriggerArmed = true;
            return;
        }

        if (distanceFromBottom <= 100 && scrollTriggerArmed) {
            scrollTriggerArmed = false;
            loadBatch();
        }
    }

    function openForm(product = null) {
        editingId = product ? product.id : null;

        document.getElementById("form-title").textContent =
            product ? "Edit Product" : "Add Product";
        document.getElementById("product-name").value =
            product?.name || "";
        document.getElementById("product-description").value =
            product?.description || "";
        document.getElementById("product-price").value =
            product?.price ?? "";
        document.getElementById("form-error").textContent = "";

        formPanel.style.display = "block";
        formPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    document.getElementById("add-product").addEventListener("click", () => {
        openForm();
    });

    document.getElementById("cancel-form").addEventListener("click", () => {
        formPanel.style.display = "none";
        editor.reset();
        editingId = null;
    });

    editor.addEventListener("submit", async event => {
        event.preventDefault();

        const name = document.getElementById("product-name").value.trim();
        const description =
            document.getElementById("product-description").value.trim();
        const price = Number(
            document.getElementById("product-price").value
        );

        if (!name || !Number.isFinite(price) || price < 0) {
            document.getElementById("form-error").textContent =
                "Enter a product name and a valid price.";
            return;
        }

        try {
            await api(
                editingId
                    ? `/api/products/${editingId}`
                    : "/api/products",
                {
                    method: editingId ? "PUT" : "POST",
                    body: JSON.stringify({
                        name,
                        description,
                        price,
                        image_path: ""
                    })
                }
            );

            formPanel.style.display = "none";
            editor.reset();
            editingId = null;
            searchInput.value = "";

            await loadBatch(true);
        } catch (error) {
            document.getElementById("form-error").textContent =
                error.message;
        }
    });

    async function deleteProduct(id) {
        if (!confirm("Are you sure you want to delete this product?")) return;

        try {
            await api(`/api/products/${id}`, { method: "DELETE" });
            await loadBatch(true);
        } catch (error) {
            statusElement.textContent = error.message;
        }
    }

    async function searchAllProducts() {
        if (loading) return;

        requestVersion++;
        const thisRequest = requestVersion;

        loading = true;
        searchMode = true;
        productsElement.replaceChildren();
        statusElement.textContent = "Searching products...";

        try {
            const params = new URLSearchParams({
                page: "1",
                limit: "100",
                sort: sortSelect.value
            });

            const result = await api(
                `/api/products?${params.toString()}&_=${Date.now()}`
            );

            if (thisRequest !== requestVersion) return;

            const term = searchInput.value.trim().toLowerCase();

            (result.products || [])
                .filter(product =>
                    String(product.name).toLowerCase().includes(term) ||
                    String(product.description || "")
                        .toLowerCase()
                        .includes(term)
                )
                .forEach(renderProduct);
        } catch (error) {
            if (thisRequest === requestVersion) {
                statusElement.textContent = `Search failed: ${error.message}`;
            }
        } finally {
            if (thisRequest === requestVersion) {
                loading = false;
                updateStatus();
            }
        }
    }

    sortSelect.addEventListener("change", () => {
        if (searchInput.value.trim()) {
            searchAllProducts();
        } else {
            loadBatch(true);
        }
    });

    searchInput.addEventListener("input", () => {
        clearTimeout(searchTimer);

        searchTimer = setTimeout(() => {
            if (searchInput.value.trim()) {
                searchAllProducts();
            } else {
                loadBatch(true);
            }
        }, 300);
    });

    document.getElementById("logout").addEventListener("click", () => {
        localStorage.removeItem("productvault_token");
        localStorage.removeItem("productvault_user");
        window.location.replace("/");
    });

    window.addEventListener("scroll", handleScroll, { passive: true });

    // Initial request loads only batch 1: six products.
    loadBatch(true);
}
