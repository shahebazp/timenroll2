import { db, collection, addDoc, getDocs, deleteDoc, updateDoc, doc, query, where } from "./firebase-config.js";

let allTeachers = []; // Store locally to search/edit easily

/* ===========================
   1. MODAL LOGIC (FIXED)
=========================== */
window.openModal = async function (editMode = false, teacherId = null) {
    const modal = document.getElementById("teacherModal");
    const title = document.getElementById("modalTitle");
    const btn = document.getElementById("btnSave");

    // 1. Reset Form First
    if (!editMode) resetForm();

    // 2. Load Checkboxes (Wait for this!)
    await Promise.all([
        loadClassCheckboxes(),
        loadSubjectCheckboxes()
    ]);

    // 3. Show Modal
    modal.classList.add("active");

    if (editMode && teacherId) {
        title.innerText = "Edit Teacher Details";
        btn.innerText = "Update Teacher";
        // No need to call loadTeacherIntoForm here, we handle it in editTeacher
    } else {
        title.innerText = "Add New Teacher";
        btn.innerText = "Save Teacher";
    }
}

window.closeModal = function () {
    document.getElementById("teacherModal").classList.remove("active");
}

/* ===========================
   2. CHECKBOX LOADERS
=========================== */
async function loadClassCheckboxes() {
    const container = document.getElementById("classCheckboxList");
    container.innerHTML = "Loading...";

    try {
        const snapshot = await getDocs(collection(db, "classes"));
        container.innerHTML = "";

        if (snapshot.empty) {
            container.innerHTML = "<span style='color:#aaa;'>No classes found. Add classes first.</span>";
            return;
        }

        const classes = [];
        snapshot.forEach(doc => classes.push(doc.data().name));
        classes.sort();

        classes.forEach(clsName => {
            container.innerHTML += `
                <label class="check-item">
                    <input type="checkbox" value="${clsName}" class="class-checkbox">
                    ${clsName}
                </label>
            `;
        });
    } catch (e) {
        console.error(e);
        container.innerHTML = "<span style='color:red;'>Error loading classes</span>";
    }
}

async function loadSubjectCheckboxes() {
    const container = document.getElementById("subjectCheckboxList");
    container.innerHTML = "Loading...";

    try {
        const snapshot = await getDocs(collection(db, "subjects"));
        container.innerHTML = "";

        if (snapshot.empty) {
            container.innerHTML = "<span style='color:#aaa;'>No subjects found. Add one above.</span>";
            return;
        }

        const subjects = [];
        snapshot.forEach(doc => subjects.push(doc.data().name));
        subjects.sort();

        subjects.forEach(subName => {
            container.innerHTML += `
                <label class="check-item">
                    <input type="checkbox" value="${subName}" class="subject-checkbox">
                    ${subName}
                </label>
            `;
        });
    } catch (e) {
        console.error(e);
        container.innerHTML = "<span style='color:red;'>Error loading subjects</span>";
    }
}

// QUICK ADD SUBJECT
window.addQuickSubject = async function () {
    const input = document.getElementById("newSubjectName");
    const name = input.value.trim();
    if (!name) return;

    try {
        await addDoc(collection(db, "subjects"), { name: name });
        input.value = "";
        await loadSubjectCheckboxes(); // Refresh list immediately
    } catch (e) {
        alert("Error adding subject");
    }
}

/* ===========================
   3. SAVE TEACHER
=========================== */
window.saveTeacher = async function () {
    // A. Gather Data
    const editId = document.getElementById("editId").value;
    const fName = document.getElementById("fName").value.trim();
    const mName = document.getElementById("mName").value.trim();
    const lName = document.getElementById("lName").value.trim();

    const mobile = document.getElementById("mobile").value.trim();
    const emergency = document.getElementById("emergency").value.trim();
    const email = document.getElementById("email").value.trim();
    const address = document.getElementById("address").value.trim();
    const pincode = document.getElementById("pincode").value.trim();
    const password = document.getElementById("password").value.trim();

    // Get Selected Classes & Subjects
    const selectedClasses = [];
    document.querySelectorAll(".class-checkbox:checked").forEach(cb => selectedClasses.push(cb.value));

    const selectedSubjects = [];
    document.querySelectorAll(".subject-checkbox:checked").forEach(cb => selectedSubjects.push(cb.value));

    // B. Validation
    if (!fName || !lName) { alert("First Name and Last Name are compulsory!"); return; }
    if (mobile.length !== 10) { alert("Mobile Number must be exactly 10 digits."); return; }
    if (!emergency) { alert("Emergency Contact is compulsory."); return; }
    if (!email.includes("@") || !email.includes(".")) { alert("Enter a valid email address."); return; }
    if (!password) { alert("Login Password is required."); return; }

    // C. Save
    const fullName = `${fName} ${mName ? mName + ' ' : ''}${lName}`;
    const btn = document.getElementById("btnSave");
    const originalText = btn.innerText;
    btn.innerText = "Processing...";
    btn.disabled = true;

    const teacherData = {
        name: fullName,
        fName, mName, lName,
        mobile, emergency, email, address, pincode, password,
        subjects: selectedSubjects, // Now an Array
        assignedClasses: selectedClasses,
        updatedAt: new Date()
    };

    try {
        if (editId) {
            await updateDoc(doc(db, "teachers", editId), teacherData);
            alert("Teacher Updated!");
        } else {
            const q = query(collection(db, "teachers"), where("email", "==", email));
            const snap = await getDocs(q);
            if (!snap.empty) {
                alert("Email already registered!");
                btn.innerText = originalText;
                btn.disabled = false;
                return;
            }
            teacherData.createdAt = new Date();
            await addDoc(collection(db, "teachers"), teacherData);
            alert("Teacher Added Successfully!");
        }
        closeModal();
        loadTeachers();
    } catch (e) {
        console.error("Save Error:", e);
        alert("Error saving data.");
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

/* ===========================
   4. LOAD TEACHERS
=========================== */
async function loadTeachers() {
    const list = document.getElementById("teacherList");
    const countSpan = document.getElementById("teacherCount");
    list.innerHTML = "<p style='text-align:center; color:#aaa; margin-top:30px;'>Refreshing list...</p>";

    try {
        const q = query(collection(db, "teachers"));
        const snapshot = await getDocs(q);

        allTeachers = [];
        list.innerHTML = "";

        if (snapshot.empty) {
            list.innerHTML = "<div style='text-align:center; padding:40px; color:#aaa;'>No teachers found. Click '+ Add New' to start.</div>";
            countSpan.innerText = "0";
            return;
        }

        countSpan.innerText = snapshot.size;

        snapshot.forEach(doc => {
            const t = doc.data();
            allTeachers.push({ id: doc.id, ...t });

            // Badges
            let classBadges = t.assignedClasses && t.assignedClasses.length > 0
                ? t.assignedClasses.map(c => `<span class="t-subs">${c}</span>`).join("")
                : "<span style='font-size:12px; color:#aaa;'>None</span>";

            // Subject Badges
            let subBadges = "";
            if (Array.isArray(t.subjects) && t.subjects.length > 0) {
                subBadges = t.subjects.map(s => `<span class="t-subs" style="background:#e8f7ff; color:#00cec9">${s}</span>`).join("");
            } else if (typeof t.subjects === 'string') {
                subBadges = t.subjects; // Handle legacy string data
            }

            list.innerHTML += `
            <div class="teacher-card">
                <div class="t-info">
                    <h3>${t.name}</h3>
                    <p>📧 ${t.email}</p>
                    <p>📞 ${t.mobile}</p>
                    <div style="margin-top:5px;"><b>Classes:</b> ${classBadges}</div>
                </div>
                <div class="t-actions">
                    <button class="action-btn btn-edit" onclick="editTeacher('${doc.id}')">✏️</button>
                    <button class="action-btn btn-del" onclick="deleteTeacher('${doc.id}', '${t.name}')">🗑️</button>
                </div>
            </div>`;
        });
    } catch (e) {
        console.error(e);
        list.innerHTML = "<p style='color:red; text-align:center;'>Error loading data.</p>";
    }
}

/* ===========================
   5. EDIT (ASYNC FIX)
=========================== */
window.editTeacher = async function (id) {
    const teacher = allTeachers.find(t => t.id === id);
    if (!teacher) return;

    // 1. OPEN MODAL & WAIT for checkboxes to load
    await openModal(true, id);

    // 2. FILL TEXT FIELDS
    document.getElementById("editId").value = teacher.id;
    document.getElementById("fName").value = teacher.fName || "";
    document.getElementById("mName").value = teacher.mName || "";
    document.getElementById("lName").value = teacher.lName || "";
    document.getElementById("mobile").value = teacher.mobile || "";
    document.getElementById("emergency").value = teacher.emergency || "";
    document.getElementById("email").value = teacher.email || "";
    document.getElementById("address").value = teacher.address || "";
    document.getElementById("pincode").value = teacher.pincode || "";
    document.getElementById("password").value = teacher.password || "";

    // 3. CHECK THE BOXES (Classes)
    if (teacher.assignedClasses) {
        teacher.assignedClasses.forEach(cls => {
            const cb = document.querySelector(`.class-checkbox[value="${cls}"]`);
            if (cb) cb.checked = true;
        });
    }

    // 4. CHECK THE BOXES (Subjects)
    if (Array.isArray(teacher.subjects)) {
        teacher.subjects.forEach(sub => {
            const cb = document.querySelector(`.subject-checkbox[value="${sub}"]`);
            if (cb) cb.checked = true;
        });
    } else if (typeof teacher.subjects === 'string') {
        // Handle old string format if present
        // (Optional: split by comma if you want to support legacy data)
    }
}

window.resetForm = function () {
    document.getElementById("editId").value = "";
    document.getElementById("fName").value = "";
    document.getElementById("mName").value = "";
    document.getElementById("lName").value = "";
    document.getElementById("mobile").value = "";
    document.getElementById("emergency").value = "";
    document.getElementById("email").value = "";
    document.getElementById("address").value = "";
    document.getElementById("pincode").value = "";
    document.getElementById("password").value = "";
    document.getElementById("newSubjectName").value = "";

    document.querySelectorAll("input[type=checkbox]").forEach(cb => cb.checked = false);
}

window.deleteTeacher = async function (docId, name) {
    if (confirm(`Remove ${name}?`)) {
        await deleteDoc(doc(db, "teachers", docId));
        loadTeachers();
    }
}

document.addEventListener("DOMContentLoaded", loadTeachers);