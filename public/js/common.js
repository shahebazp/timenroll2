document.addEventListener("DOMContentLoaded", () => {

    /* 1. CHECK LOGIN STATUS */
    if (!window.location.pathname.endsWith("index.html") &&
        localStorage.getItem("loggedIn") !== "true") {
        window.location.href = "../index.html"; // Go up one level to root
    }

    /* 2. HIGHLIGHT ACTIVE MENU LINK */
    const currentPage = window.location.pathname.split("/").pop();
    const navLinks = document.querySelectorAll(".sidebar nav a");
    navLinks.forEach(link => {
        if (link.getAttribute("href") === currentPage) {
            link.classList.add("active");
        }
    });

    /* 3. INJECT MOBILE MENU BUTTON */
    if (window.innerWidth <= 768) {
        const btn = document.createElement("button");
        btn.innerHTML = "☰";
        btn.className = "mobile-toggle";
        btn.onclick = toggleSidebar;
        document.body.appendChild(btn);
    }

    /* 4. INJECT LOGOUT MODAL HTML */
    const modalHtml = `
    <div id="logoutModal" class="modal-overlay">
        <div class="modal-box">
            <h3>Logging Out</h3>
            <p>Are you sure you want to exit?</p>
            <div class="modal-actions">
                <button class="action-btn" style="background:#f1f2f6; color:#333; padding:10px 20px;" onclick="closeLogout()">Cancel</button>
                <button class="btn-primary" style="background:#ff7675; padding:10px 20px;" onclick="confirmLogout()">Logout</button>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
});

/* ===========================
   SIDEBAR LOGIC
=========================== */
function toggleSidebar() {
    document.querySelector(".sidebar").classList.toggle("open");
}

// Close sidebar when clicking outside (Optional UX improvement)
document.addEventListener('click', function (event) {
    const sidebar = document.querySelector('.sidebar');
    const btn = document.querySelector('.mobile-toggle');
    if (window.innerWidth <= 768 && sidebar.classList.contains('open') &&
        !sidebar.contains(event.target) && !btn.contains(event.target)) {
        sidebar.classList.remove('open');
    }
});

/* ===========================
   LOGOUT LOGIC
=========================== */
function logout() {
    // Show the custom modal instead of boring alert
    document.getElementById("logoutModal").classList.add("active");
}

function closeLogout() {
    document.getElementById("logoutModal").classList.remove("active");
}

function confirmLogout() {
    localStorage.removeItem("loggedIn");
    localStorage.removeItem("role");
    window.location.href = "../index.html";
}