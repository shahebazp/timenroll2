import { db, collection, getDocs, doc, setDoc, getDoc, query, where } from "./firebase-config.js";

/* ===========================
   1. INIT & STATS (CLOUD)
=========================== */
document.addEventListener("DOMContentLoaded", async () => {
    loadDashboardCounts();

    // Make functions available globally for HTML buttons
    window.openTeacherAttendance = openTeacherAttendance;
    window.closeModal = closeModal;
    window.loadTeacherList = loadTeacherList;
    window.saveTeacherAttendance = saveTeacherAttendance;
    window.openReports = openReports;
    window.switchReport = switchReport;
    window.downloadStudentReport = downloadStudentReport;
    window.downloadTeacherReport = downloadTeacherReport;
});

async function loadDashboardCounts() {
    try {
        const tSnap = await getDocs(collection(db, "teachers"));
        const sSnap = await getDocs(collection(db, "students"));
        const cSnap = await getDocs(collection(db, "classes"));

        document.getElementById("teacherCount").innerText = tSnap.size;
        document.getElementById("studentCount").innerText = sSnap.size;
        document.getElementById("classCount").innerText = cSnap.size;
    } catch (e) {
        console.error("Stats Error:", e);
    }
}

/* ===========================
   2. TEACHER ATTENDANCE LOGIC
=========================== */
async function openTeacherAttendance() {
    document.getElementById("teacherModal").classList.add("active");
    // Set default date to today
    document.getElementById("attDate").valueAsDate = new Date();
    loadTeacherList();
}

async function loadTeacherList() {
    const date = document.getElementById("attDate").value;
    const list = document.getElementById("teacherListContainer");
    list.innerHTML = "<p>Loading cloud data...</p>";

    if (!date) return;

    try {
        // 1. Get All Teachers
        const tSnapshot = await getDocs(collection(db, "teachers"));
        if (tSnapshot.empty) {
            list.innerHTML = "<p>No teachers found.</p>";
            return;
        }

        // 2. Get Existing Attendance for this Date
        const attRef = doc(db, "teacher_attendance", date);
        const attSnap = await getDoc(attRef);
        const existingData = attSnap.exists() ? attSnap.data() : {};

        list.innerHTML = "";

        tSnapshot.forEach(docSnap => {
            const t = docSnap.data();
            const tid = docSnap.id;

            // Default to Present if not marked
            const status = existingData[tid] || "Present";

            let color = status === "Present" ? "green" : (status === "Absent" ? "red" : "orange");

            list.innerHTML += `
            <div class="attendance-row">
                <div>
                    <strong>${t.name}</strong>
                    <div style="font-size:11px; color:#aaa;">${t.email}</div>
                </div>
                <select class="status-select" id="status_${tid}" 
                    onchange="this.style.color = this.value === 'Present' ? 'green' : (this.value === 'Absent' ? 'red' : 'orange')" 
                    style="color:${color}">
                    <option value="Present" ${status === "Present" ? "selected" : ""}>Present</option>
                    <option value="Absent" ${status === "Absent" ? "selected" : ""}>Absent</option>
                    <option value="On Duty" ${status === "On Duty" ? "selected" : ""}>On Duty</option>
                </select>
            </div>`;
        });

    } catch (e) {
        console.error(e);
        list.innerHTML = "Error loading list.";
    }
}

async function saveTeacherAttendance() {
    const date = document.getElementById("attDate").value;
    if (!date) { alert("Select date first"); return; }

    const btn = document.querySelector(".btn-primary[onclick='saveTeacherAttendance()']");
    btn.innerText = "Saving...";
    btn.disabled = true;

    try {
        const tSnapshot = await getDocs(collection(db, "teachers"));
        const attendanceRecord = {};

        tSnapshot.forEach(docSnap => {
            const tid = docSnap.id;
            const el = document.getElementById(`status_${tid}`);
            if (el) {
                attendanceRecord[tid] = el.value;
            }
        });

        // Save to Firestore: Collection 'teacher_attendance', Document ID = '2026-02-12'
        await setDoc(doc(db, "teacher_attendance", date), attendanceRecord);

        alert("Attendance Saved for " + date);
        closeModal("teacherModal");

    } catch (e) {
        console.error("Save error:", e);
        alert("Failed to save to cloud.");
    } finally {
        btn.innerText = "Save Attendance";
        btn.disabled = false;
    }
}

function closeModal(id) {
    document.getElementById(id).classList.remove("active");
}

/* ===========================
   3. REPORTS LOGIC
=========================== */
async function openReports() {
    document.getElementById("reportModal").classList.add("active");
    await loadReportDropdowns();
    switchReport('student');
}

async function loadReportDropdowns() {
    // Load Classes
    const cSnap = await getDocs(collection(db, "classes"));
    const clsSelect = document.getElementById("reportClass");
    const tClsSelect = document.getElementById("reportTeacherClass");

    let opts = "";
    cSnap.forEach(d => {
        const name = d.data().name;
        opts += `<option value="${name}">${name}</option>`;
    });

    clsSelect.innerHTML = opts;
    tClsSelect.innerHTML = `<option value="">All Teachers</option>` + opts;
}

window.switchReport = function (type) {
    if (type === 'student') {
        document.getElementById("studentReportForm").style.display = "block";
        document.getElementById("teacherReportForm").style.display = "none";
        document.getElementById("btnStudent").style.background = "#00c9a7";
        document.getElementById("btnStudent").style.color = "white";
        document.getElementById("btnTeacher").style.background = "#f1f2f6";
        document.getElementById("btnTeacher").style.color = "#333";
    } else {
        document.getElementById("studentReportForm").style.display = "none";
        document.getElementById("teacherReportForm").style.display = "block";
        document.getElementById("btnStudent").style.background = "#f1f2f6";
        document.getElementById("btnStudent").style.color = "#333";
        document.getElementById("btnTeacher").style.background = "#0984e3";
        document.getElementById("btnTeacher").style.color = "white";
    }
}

/* --- STUDENT REPORT (MOCK ATTENDANCE for now, REAL NAMES) --- */
async function downloadStudentReport() {
    const cls = document.getElementById("reportClass").value;
    const month = document.getElementById("reportMonthStudent").value; // YYYY-MM

    if (!cls || !month) { alert("Please select Class and Month"); return; }

    try {
        // Fetch Real Students
        const q = query(collection(db, "students"), where("class", "==", cls));
        const snap = await getDocs(q);

        if (snap.empty) { alert("No students found in " + cls); return; }

        const studentsList = [];
        snap.forEach(d => studentsList.push(d.data()));

        // Generate Excel Data
        const reportData = [["Date", "Roll No", "Student Name", "Class", "Status"]];
        const [year, mStr] = month.split("-");
        const daysInMonth = new Date(year, mStr, 0).getDate();

        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${month}-${String(d).padStart(2, '0')}`;
            studentsList.forEach(s => {
                // TODO: In Phase 3, we will fetch REAL student attendance here.
                // For now, we mock it so you can see the Excel file structure.
                const status = Math.random() > 0.1 ? "Present" : "Absent";
                reportData.push([dateStr, s.roll, s.name, cls, status]);
            });
        }

        const ws = XLSX.utils.aoa_to_sheet(reportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Attendance");
        XLSX.writeFile(wb, `Student_Report_${cls}_${month}.xlsx`);
        closeModal('reportModal');

    } catch (e) {
        console.error(e);
        alert("Error generating report");
    }
}

/* --- TEACHER REPORT (REAL CLOUD DATA) --- */
async function downloadTeacherReport() {
    const month = document.getElementById("reportMonthTeacher").value;
    if (!month) { alert("Select Month"); return; }

    try {
        // 1. Get All Teachers
        const tSnap = await getDocs(collection(db, "teachers"));
        const teachers = [];
        tSnap.forEach(d => teachers.push({ id: d.id, ...d.data() }));

        // 2. Get All Attendance Docs for this Month
        // (Optimized: In a huge app, we'd query by date range. Here we fetch simple logic)
        const [year, mStr] = month.split("-");
        const daysInMonth = new Date(year, mStr, 0).getDate();

        const attendanceMap = {}; // Date -> { tid: status }

        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${month}-${String(d).padStart(2, '0')}`;
            const attDoc = await getDoc(doc(db, "teacher_attendance", dateStr));
            if (attDoc.exists()) {
                attendanceMap[dateStr] = attDoc.data();
            }
        }

        // 3. Build Excel
        const headerRow = ["Name", "Email"];
        for (let d = 1; d <= daysInMonth; d++) headerRow.push(d);
        headerRow.push("Present", "Absent", "Duty");

        const reportData = [headerRow];

        teachers.forEach(t => {
            let p = 0, a = 0, od = 0;
            const row = [t.name, t.email];

            for (let d = 1; d <= daysInMonth; d++) {
                const dateStr = `${month}-${String(d).padStart(2, '0')}`;
                const dailyData = attendanceMap[dateStr] || {};
                const status = dailyData[t.id] || "-"; // Default to - if no data recorded

                let code = "-";
                if (status === "Present") { code = "P"; p++; }
                else if (status === "Absent") { code = "A"; a++; }
                else if (status === "On Duty") { code = "OD"; od++; }

                row.push(code);
            }
            row.push(p, a, od);
            reportData.push(row);
        });

        const ws = XLSX.utils.aoa_to_sheet(reportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Teacher Attendance");
        XLSX.writeFile(wb, `Teacher_Report_${month}.xlsx`);
        closeModal('reportModal');

    } catch (e) {
        console.error(e);
        alert("Error generating report");
    }
}