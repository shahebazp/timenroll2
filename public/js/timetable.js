import { db, collection, doc, getDoc, setDoc, getDocs, onSnapshot } from "./firebase-config.js";

/* ===========================
   GLOBAL STATE
=========================== */
let classes = [];
let teachers = [];
let timetableData = {};

const timeSlots = [
    { label: "10:15 - 11:00", type: "slot" },
    { label: "11:00 - 11:45", type: "slot" },
    { label: "SHORT BREAK", type: "break" },
    { label: "11:55 - 12:40", type: "slot" },
    { label: "12:40 - 01:25", type: "slot" },
    { label: "LUNCH BREAK", type: "break" },
    { label: "01:55 - 02:40", type: "slot" },
    { label: "02:40 - 03:25", type: "slot" },
    { label: "03:25 - 04:10", type: "slot" }
];
const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
let selectedClass = "";
let currentDay = "";
let currentSlotIndex = -1;

/* ===========================
   1. INIT & LOAD DROPDOWNS
=========================== */
document.addEventListener("DOMContentLoaded", async () => {
    console.log("Timetable Page Loaded"); // Debug
    await loadDropdowns();
});

async function loadDropdowns() {
    const sel = document.getElementById("classSelect");

    try {
        // 1. Load Classes
        console.log("Fetching classes...");
        const classSnapshot = await getDocs(collection(db, "classes"));

        sel.innerHTML = `<option value="">Select Class...</option>`;

        if (classSnapshot.empty) {
            console.warn("No classes found in DB");
        }

        classes = [];
        classSnapshot.forEach(doc => {
            const name = doc.data().name;
            classes.push(name);
            sel.innerHTML += `<option value="${name}">${name}</option>`;
        });

        // 2. Load Teachers
        console.log("Fetching teachers...");
        const teacherSnapshot = await getDocs(collection(db, "teachers"));
        teachers = [];
        let teacherOptions = `<option value="">Select Teacher...</option>`;

        teacherSnapshot.forEach(doc => {
            const t = doc.data();
            teachers.push(t);
            teacherOptions += `<option value="${t.name}">${t.name}</option>`;
        });

        // Update Modal Dropdowns
        document.querySelectorAll(".teacher-list").forEach(s => s.innerHTML = teacherOptions);

    } catch (error) {
        console.error("Error loading data:", error);
        sel.innerHTML = `<option>Error loading data</option>`;
    }
}

/* ===========================
   2. LOAD TIMETABLE (Real-time)
=========================== */
// Attach to window so HTML onchange can see it
window.loadTimetable = function () {
    selectedClass = document.getElementById("classSelect").value;
    const tbody = document.getElementById("tableBody");
    tbody.innerHTML = "";

    if (!selectedClass) {
        tbody.innerHTML = "<tr><td colspan='7' style='padding:30px; color:#aaa;'>Select a class to view timetable.</td></tr>";
        return;
    }

    tbody.innerHTML = "<tr><td colspan='7' style='padding:30px;'>Loading Cloud Data...</td></tr>";

    const docRef = doc(db, "timetable", selectedClass);

    // Real-time listener
    onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            timetableData = docSnap.data();
        } else {
            timetableData = {};
        }
        renderTable();
    }, (error) => {
        console.error("Snapshot error:", error);
        tbody.innerHTML = "<tr><td colspan='7' style='color:red;'>Error loading timetable.</td></tr>";
    });
}

function renderTable() {
    const tbody = document.getElementById("tableBody");
    tbody.innerHTML = "";

    timeSlots.forEach((slot, index) => {
        if (slot.type === "break") {
            tbody.innerHTML += `<tr class="break-row"><td colspan="7">${slot.label}</td></tr>`;
        } else {
            let rowHtml = `<tr><td class="time-col">${slot.label}</td>`;

            days.forEach(day => {
                const key = `${day}-${index}`;
                const session = timetableData[key];

                // Practical Merge Logic
                const prevKey = `${day}-${index - 1}`;
                const prevSession = timetableData[prevKey];

                if (prevSession && prevSession.type === "Practical" && timeSlots[index - 1].type === "slot") {
                    rowHtml += `<td style="background:#f3e5f5; color:#9c27b0; font-size:11px; vertical-align:middle; text-align:center;"><i>(Cont.)</i></td>`;
                }
                else if (session) {
                    let cardContent = "";
                    if (session.type === "Theory") {
                        cardContent = `
                        <div class="session-card" onclick="editSession('${day}', ${index})">
                            <b>${session.subject}</b><br>
                            <span style="font-size:11px; color:#666;">${session.teacher}</span>
                        </div>`;
                    } else {
                        cardContent = `
                        <div class="session-card session-practical" onclick="editSession('${day}', ${index})">
                            <b>${session.subject} (Prac)</b><br>
                            <div style="font-size:10px; margin-top:2px;">
                                <span class="batch-badge">A</span> ${session.teacherA}<br>
                                <span class="batch-badge">B</span> ${session.teacherB}
                            </div>
                        </div>`;
                    }
                    rowHtml += `<td>${cardContent}</td>`;
                } else {
                    rowHtml += `<td><button class="add-slot-btn" onclick="openAddModal('${day}', ${index})">+</button></td>`;
                }
            });
            tbody.innerHTML += rowHtml + `</tr>`;
        }
    });
}

/* ===========================
   3. MODAL LOGIC
=========================== */
window.toggleBatches = function () {
    const type = document.getElementById("sType").value;
    document.getElementById("theoryInputs").style.display = type === "Theory" ? "block" : "none";
    document.getElementById("batchInputs").style.display = type === "Practical" ? "block" : "none";
}

window.openAddModal = function (day, index) {
    currentDay = day;
    currentSlotIndex = index;
    document.getElementById("modalTitle").innerText = `Add Session (${day})`;

    document.getElementById("sType").value = "Theory";
    document.getElementById("sSubject").value = "";
    document.getElementById("sTeacher").value = "";
    document.getElementById("sTeacherA").value = "";
    document.getElementById("sTeacherB").value = "";

    toggleBatches();
    document.getElementById("btnDelete").style.display = "none";
    document.getElementById("sessionModal").classList.add("active");
}

window.editSession = function (day, index) {
    currentDay = day;
    currentSlotIndex = index;
    const key = `${day}-${index}`;
    const data = timetableData[key];

    document.getElementById("modalTitle").innerText = `Edit Session (${day})`;
    document.getElementById("sType").value = data.type;
    document.getElementById("sSubject").value = data.subject;

    if (data.type === "Theory") {
        document.getElementById("sTeacher").value = data.teacher;
    } else {
        document.getElementById("sTeacherA").value = data.teacherA;
        document.getElementById("sTeacherB").value = data.teacherB;
    }

    toggleBatches();
    document.getElementById("btnDelete").style.display = "inline-block";
    document.getElementById("sessionModal").classList.add("active");
}

window.closeModal = function (id) {
    document.getElementById(id).classList.remove("active");
}

/* ===========================
   4. SAVE TO FIREBASE
=========================== */
window.saveSession = async function () {
    const type = document.getElementById("sType").value;
    const subject = document.getElementById("sSubject").value;

    if (!subject) { alert("Subject Name is required"); return; }

    const sessionObj = { type, subject };

    if (type === "Theory") {
        sessionObj.teacher = document.getElementById("sTeacher").value;
        if (!sessionObj.teacher) { alert("Select a teacher"); return; }
    } else {
        sessionObj.teacherA = document.getElementById("sTeacherA").value;
        sessionObj.teacherB = document.getElementById("sTeacherB").value;
        if (!sessionObj.teacherA || !sessionObj.teacherB) { alert("Select teachers for both batches"); return; }
    }

    const key = `${currentDay}-${currentSlotIndex}`;
    timetableData[key] = sessionObj;

    try {
        await setDoc(doc(db, "timetable", selectedClass), timetableData);
        closeModal("sessionModal");
    } catch (e) {
        console.error("Error saving timetable:", e);
        alert("Failed to save to cloud.");
    }
}

window.deleteSession = async function () {
    if (confirm("Delete this session?")) {
        const key = `${currentDay}-${currentSlotIndex}`;
        delete timetableData[key];

        try {
            await setDoc(doc(db, "timetable", selectedClass), timetableData);
            closeModal("sessionModal");
        } catch (e) {
            console.error(e);
            alert("Failed to delete.");
        }
    }
}