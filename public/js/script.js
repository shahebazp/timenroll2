import { db, collection, getDocs, query, where } from "./firebase-config.js";

console.log("Login Script Loaded"); // This will show in console if working

async function login() {
    const idInput = document.getElementById("loginId").value.trim();
    const pwdInput = document.getElementById("password").value.trim();
    const error = document.getElementById("errorMsg");
    const btn = document.getElementById("loginBtn");

    error.innerText = "";

    if (!idInput || !pwdInput) {
        error.innerText = "Please enter username and password";
        return;
    }

    // Show Loading
    btn.innerText = "Checking...";
    btn.disabled = true;

    try {
        // --- 1. ADMIN CHECK (Static) ---
        if (idInput === "ZERO" && pwdInput === "Khan@123") {
            console.log("Admin Logged In");
            localStorage.setItem("loggedIn", "true");
            localStorage.setItem("role", "admin");
            window.location.href = "html/admin-dashboard.html";
            return;
        }

        // --- 2. FIREBASE CHECK (Teachers) ---
        const q = query(
            collection(db, "teachers"),
            where("email", "==", idInput),
            where("password", "==", pwdInput)
        );

        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const teacherData = querySnapshot.docs[0].data();
            localStorage.setItem("loggedIn", "true");
            localStorage.setItem("role", "teacher");
            localStorage.setItem("userEmail", teacherData.email);
            localStorage.setItem("userName", teacherData.name);
            window.location.href = "html/teacher-dashboard.html";
        } else {
            error.innerText = "Invalid credentials";
            btn.innerText = "Login"; // Reset button
            btn.disabled = false;
        }

    } catch (e) {
        console.error("Login Error:", e);
        error.innerText = "Error: " + e.message;
        btn.innerText = "Login";
        btn.disabled = false;
    }
}

// Attach Listeners Automatically
document.addEventListener("DOMContentLoaded", () => {

    // Click Listener
    const loginBtn = document.getElementById("loginBtn");
    if (loginBtn) {
        loginBtn.addEventListener("click", login);
    }

    // Enter Key Listener
    const passField = document.getElementById("password");
    if (passField) {
        passField.addEventListener("keypress", (event) => {
            if (event.key === "Enter") login();
        });
    }

    // Cursor Glow (Visuals)
    const glow = document.getElementById("cursor-glow");
    if (glow) {
        document.addEventListener("mousemove", (e) => {
            glow.style.left = e.clientX + "px";
            glow.style.top = e.clientY + "px";
            glow.style.opacity = "1";
        });
        document.addEventListener("mouseleave", () => {
            glow.style.opacity = "0";
        });
    }
});