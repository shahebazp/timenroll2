import { db, collection, addDoc, getDocs, deleteDoc, doc, query, where } from "./firebase-config.js";

/* ===========================
   1. INIT: Load Data
=========================== */
document.addEventListener("DOMContentLoaded", () => {
    loadSubjects();
    loadClasses();
});

/* ===========================
   2. SUBJECT MANAGEMENT
=========================== */
// Load all subjects from the global "subjects" collection
async function loadSubjects() {
    const container = document.getElementById("subjectList");
    container.innerHTML = "Loading...";

    try {
        const q = query(collection(db, "subjects"));
        const snapshot = await getDocs(q);

        container.innerHTML = ""; // Clear loader

        if (snapshot.empty) {
            container.innerHTML = "<div style='grid-column: 1/-1; color:#aaa; font-size:12px; text-align:center;'>No subjects in database. Add one above!</div>";
            return;
        }

        // Sort alphabetically
        const subjects = [];
        snapshot.forEach(doc => subjects.push(doc.data().name));
        subjects.sort();

        subjects.forEach(sub => {
            container.innerHTML += `
            <label class="check-item">
                <input type="checkbox" value="${sub}" class="sub-checkbox">
                ${sub}
            </label>`;
        });

    } catch (e) {
        console.error(e);
        container.innerHTML = "Error loading subjects.";
    }
}

// Add a new subject to the global database
window.addNewSubject = async function () {
    const input = document.getElementById("newSubjectInput");
    const name = input.value.trim();

    if (!name) return;

    const btn = document.querySelector(".btn-small");
    btn.innerText = "...";
    btn.disabled = true;

    try {
        // Check duplicate
        const q = query(collection(db, "subjects"), where("name", "==", name));
        const snap = await getDocs(q);

        if (!snap.empty) {
            alert("Subject already exists!");
        } else {
            await addDoc(collection(db, "subjects"), { name: name });
            input.value = "";
            await loadSubjects(); // Refresh list to show the new one
        }
    } catch (e) {
        console.error(e);
        alert("Error adding subject");
    } finally {
        btn.innerText = "+ Add DB";
        btn.disabled = false;
    }
}

/* ===========================
   3. CLASS MANAGEMENT
=========================== */
window.saveClass = async function () {
    const stream = document.getElementById("cStream").value.trim();
    const year = document.getElementById("cYear").value;
    const sem = document.getElementById("cSem").value;

    // Get Selected Subjects
    const selectedSubjects = [];
    document.querySelectorAll(".sub-checkbox:checked").forEach(cb => {
        selectedSubjects.push(cb.value);
    });

    if (!stream) {
        alert("Please enter a Stream (e.g., BCA)");
        return;
    }

    // Auto-generate Class Name: "BCA FY (Sem 1)"
    const className = `${stream} ${year} (${sem})`;

    const btn = document.querySelector(".btn-primary");
    btn.innerText = "Saving...";
    btn.disabled = true;

    try {
        // Check if class exists
        const q = query(collection(db, "classes"), where("name", "==", className));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            alert("This Class already exists!");
            btn.innerText = "+ Create Class";
            btn.disabled = false;
            return;
        }

        // Save
        await addDoc(collection(db, "classes"), {
            name: className,        // Display Name
            stream: stream,
            year: year,
            semester: sem,
            subjects: selectedSubjects, // Array of strings
            createdAt: new Date()
        });

        alert("Class Created Successfully!");

        // Reset Form
        document.getElementById("cStream").value = "";
        document.querySelectorAll(".sub-checkbox").forEach(cb => cb.checked = false);

        loadClasses();

    } catch (e) {
        console.error("Error adding class: ", e);
        alert("Error saving class.");
    } finally {
        btn.innerText = "+ Create Class";
        btn.disabled = false;
    }
}

async function loadClasses() {
    const list = document.getElementById("classListContainer");
    list.innerHTML = "<p style='text-align:center; color:#aaa;'>Loading...</p>";

    try {
        const querySnapshot = await getDocs(collection(db, "classes"));

        if (querySnapshot.empty) {
            list.innerHTML = "<p style='text-align:center; color:#aaa;'>No classes added yet.</p>";
            return;
        }

        list.innerHTML = "";

        // Convert to array to sort
        const classesData = [];
        querySnapshot.forEach(doc => classesData.push({ id: doc.id, ...doc.data() }));

        // Sort by Stream then Year
        classesData.sort((a, b) => a.name.localeCompare(b.name));

        classesData.forEach((c) => {
            // Create Badges for Subjects
            let subHtml = "";
            if (c.subjects && c.subjects.length > 0) {
                subHtml = c.subjects.map(s => `<span class="sub-tag">${s}</span>`).join("");
            } else {
                subHtml = "<span style='color:#aaa; font-size:11px;'>No subjects assigned</span>";
            }

            list.innerHTML += `
            <div class="class-item">
                <div class="class-info">
                    <h4>${c.name}</h4>
                    <p>${subHtml}</p>
                </div>
                <button class="btn-del" style="background:none; border:none; cursor:pointer;" onclick="deleteClass('${c.id}', '${c.name}')">❌</button>
            </div>`;
        });

    } catch (e) {
        console.error("Error loading classes: ", e);
        list.innerHTML = "<p style='color:red; text-align:center;'>Error loading list.</p>";
    }
}

window.deleteClass = async function (docId, name) {
    if (confirm(`Delete class "${name}"? This will affect Students and Timetables attached to it.`)) {
        try {
            await deleteDoc(doc(db, "classes", docId));
            loadClasses();
        } catch (e) {
            console.error(e);
            alert("Could not delete class.");
        }
    }
}