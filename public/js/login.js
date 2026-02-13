import { db, collection, getDocs, query, where } from "./firebase-config.js";

// Make login function global
window.handleLogin = async function (event) {
    event.preventDefault(); // Stop page reload

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const btn = document.querySelector(".login-btn");
    const errorMsg = document.getElementById("error-msg");

    if (!email || !password) {
        showError("Please enter email and password");
        return;
    }

    btn.innerText = "Checking...";
    btn.disabled = true;
    errorMsg.style.display = "none";

    try {
        // 1. CHECK IF ADMIN
        // Note: For real security, we should use Firebase Auth, but for this project
        // checking the collections directly is okay.
        const adminQ = query(
            collection(db, "admin"),
            where("email", "==", email),
            where("password", "==", password)
        );

        const adminSnap = await getDocs(adminQ);

        if (!adminSnap.empty) {
            // ✅ IT IS AN ADMIN
            localStorage.setItem("userRole", "admin");
            localStorage.setItem("userEmail", email);
            window.location.href = "html/admin-dashboard.html";
            return;
        }

        // 2. IF NOT ADMIN, CHECK IF TEACHER
        const teacherQ = query(
            collection(db, "teachers"),
            where("email", "==", email),
            where("password", "==", password)
        );

        const teacherSnap = await getDocs(teacherQ);

        if (!teacherSnap.empty) {
            // ✅ IT IS A TEACHER
            const teacherData = teacherSnap.docs[0].data();
            localStorage.setItem("userRole", "teacher");
            localStorage.setItem("teacherName", teacherData.name); // Save name for dashboard
            localStorage.setItem("teacherEmail", email);
            window.location.href = "html/teacher-dashboard.html";
            return;
        }

        // 3. IF NEITHER -> FAIL
        showError("Invalid Email or Password");
        btn.innerText = "Login";
        btn.disabled = false;

    } catch (error) {
        console.error("Login Error:", error);
        showError("Something went wrong. Check console.");
        btn.innerText = "Login";
        btn.disabled = false;
    }
}

function showError(msg) {
    const el = document.getElementById("error-msg");
    el.innerText = msg;
    el.style.display = "block";
}