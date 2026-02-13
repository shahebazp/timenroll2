// 1. Get current logged-in user
const currentUserEmail = localStorage.getItem("userEmail");
const teachers = JSON.parse(localStorage.getItem("teachers")) || [];

// Find the specific teacher object
const myProfile = teachers.find(t => t.email === currentUserEmail);

// If for some reason the teacher isn't found (deleted?), kick them out
if (!myProfile) {
    alert("User profile not found. Please contact Admin.");
    localStorage.clear();
    window.location.href = "../index.html";
}

// Display Name
document.getElementById("welcomeMsg").innerText = "Logged in as: " + myProfile.name;

/* =============================
   RENDER MY CLASSES
============================= */
function renderMyClasses() {
    const grid = document.getElementById("myClassesGrid");
    grid.innerHTML = "";

    if (myProfile.classes.length === 0) {
        grid.innerHTML = "<p style='color:#666;'>No classes assigned yet.</p>";
        return;
    }

    myProfile.classes.forEach(cls => {
        grid.innerHTML += `
        <div class="stat-card">
            <h2 style="font-size: 32px;">${cls}</h2>
            <p>Class Assigned</p>
            <button class="btn-primary" style="margin-top:15px; width:100%; background:#00b4d8;" onclick="openAttendance('${cls}')">
              Mark Attendance
            </button>
        </div>`;
    });
}

/* =============================
   UPDATE PASSWORD
============================= */
function updatePassword() {
    const newPass = document.getElementById("newPass").value.trim();

    if (!newPass) {
        alert("Please enter a new password");
        return;
    }

    if (newPass.length < 6) {
        alert("Password must be at least 6 characters");
        return;
    }

    // Update the teacher's password in the main list
    // We use 'map' to update ONLY the matching teacher
    const updatedTeachers = teachers.map(t => {
        if (t.email === currentUserEmail) {
            return { ...t, password: newPass }; // Update password
        }
        return t;
    });

    // Save back to storage
    localStorage.setItem("teachers", JSON.stringify(updatedTeachers));

    alert("Password updated successfully! Admin will see the new password.");
    document.getElementById("newPass").value = "";
}

/* =============================
   NAVIGATION
============================= */
function openAttendance(cls) {
    // We will build this page next
    localStorage.setItem("currentClass", cls);
    alert("Coming soon: Attendance page for " + cls);
    // location.href = "mark-attendance.html"; 
}

// Run on load
renderMyClasses();