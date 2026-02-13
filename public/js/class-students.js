let cls = localStorage.getItem("currentClass");
let students = JSON.parse(localStorage.getItem("students")) || {};
students[cls] = students[cls] || [];
let editIndex = null;

document.getElementById("title").innerText = "Students – " + cls;

/* ===========================
   STRICT VALIDATION HELPERS
=========================== */
function onlyLetters(input) {
    input.value = input.value.replace(/[^a-zA-Z]/g, "");
}
function onlyNumbers(input) {
    input.value = input.value.replace(/[^0-9]/g, "");
}

/* ===========================
   UI TOGGLES
=========================== */
function toggleForm() {
    const form = document.getElementById("studentForm");
    const importBox = document.getElementById("importBox");

    form.style.display = (form.style.display === "none") ? "block" : "none";
    importBox.style.display = "none"; // Hide import if opening manual

    if (form.style.display === "block") {
        clearForm();
        editIndex = null;
    }
}

function toggleImport() {
    const form = document.getElementById("studentForm");
    const importBox = document.getElementById("importBox");

    importBox.style.display = (importBox.style.display === "none") ? "block" : "none";
    form.style.display = "none"; // Hide manual if opening import
}

/* ===========================
   MANUAL ADD / SAVE
=========================== */
function saveStudent() {
    const r = document.getElementById("roll").value.trim();
    const f = document.getElementById("fname").value.trim();
    const m = document.getElementById("mname").value.trim();
    const l = document.getElementById("lname").value.trim();
    const em = document.getElementById("email").value.trim();
    const mob = document.getElementById("mobile").value.trim();

    // COMPULSORY FIELDS CHECK
    if (!r || !f || !m || !l) {
        alert("Roll No, First Name, Middle Name, and Last Name are COMPULSORY.");
        return;
    }

    // Optional Mobile Validation
    if (mob && mob.length !== 10) {
        alert("Mobile number must be 10 digits.");
        return;
    }

    const cap = (str) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    const fullName = `${cap(f)} ${cap(m)} ${cap(l)}`;

    const newStudent = {
        roll: r,
        name: fullName,
        email: em || "-",
        mobile: mob || "-"
    };

    if (editIndex === null) {
        if (checkDuplicate(r)) return;
        students[cls].push(newStudent);
    } else {
        // Allow edit only if roll no isn't taken by someone else
        const conflict = students[cls].some((s, i) => s.roll === r && i !== editIndex);
        if (conflict) {
            alert("Roll Number " + r + " is already taken.");
            return;
        }
        students[cls][editIndex] = newStudent;
        editIndex = null;
    }

    saveAndRender();
    toggleForm();
}

/* ===========================
   EXCEL IMPORT LOGIC
=========================== */
function downloadTemplate() {
    // Defines the headers for the CSV
    const csvContent = "data:text/csv;charset=utf-8,"
        + "Roll No,First Name,Middle Name,Last Name,Email,Mobile\n"
        + "101,John,William,Doe,john@example.com,9876543210";

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "student_template.csv");
    document.body.appendChild(link);
    link.click();
}

function processImport() {
    const fileInput = document.getElementById("excelFile");

    if (!fileInput.files.length) {
        alert("Please select a file first.");
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = function (e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        // Get first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert to JSON
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Remove Header Row
        json.shift();

        let addedCount = 0;
        let skippedCount = 0;

        json.forEach(row => {
            // Mapping columns based on template order
            // 0: Roll, 1: Fname, 2: Mname, 3: Lname, 4: Email, 5: Mobile
            const r = row[0];
            const f = row[1];
            const m = row[2];
            const l = row[3];
            const em = row[4];
            const mob = row[5];

            // Basic Validation: Must have Roll and Name parts
            if (r && f && m && l) {
                // Check duplicate before adding
                if (!students[cls].some(s => s.roll == r)) {
                    students[cls].push({
                        roll: r.toString(),
                        name: `${f} ${m} ${l}`,
                        email: em || "-",
                        mobile: mob || "-"
                    });
                    addedCount++;
                } else {
                    skippedCount++;
                }
            }
        });

        alert(`Import Complete!\nAdded: ${addedCount}\nSkipped (Duplicates): ${skippedCount}`);
        saveAndRender();
        toggleImport();
        fileInput.value = ""; // Reset input
    };

    reader.readAsArrayBuffer(file);
}

/* ===========================
   UTILITIES
=========================== */
function checkDuplicate(roll) {
    if (students[cls].some(s => s.roll === roll)) {
        alert("Roll Number " + roll + " already exists!");
        return true;
    }
    return false;
}

function saveAndRender() {
    // Sort by Roll No
    students[cls].sort((a, b) => parseInt(a.roll) - parseInt(b.roll));
    localStorage.setItem("students", JSON.stringify(students));
    render();
}

function editStudent(i) {
    editIndex = i;
    let s = students[cls][i];

    toggleForm(); // Open form
    document.getElementById("roll").value = s.roll;
    document.getElementById("email").value = (s.email === "-") ? "" : s.email;
    document.getElementById("mobile").value = (s.mobile === "-") ? "" : s.mobile;

    // Split Name
    let parts = s.name.split(" ");
    document.getElementById("fname").value = parts[0] || "";
    document.getElementById("mname").value = parts[1] || "";
    document.getElementById("lname").value = parts.slice(2).join(" ") || "";
}

function deleteStudent(i) {
    if (confirm("Delete this student?")) {
        students[cls].splice(i, 1);
        saveAndRender();
    }
}

function clearForm() {
    document.getElementById("roll").value = "";
    document.getElementById("fname").value = "";
    document.getElementById("mname").value = "";
    document.getElementById("lname").value = "";
    document.getElementById("email").value = "";
    document.getElementById("mobile").value = "";
}

function render() {
    const list = document.getElementById("list");
    list.innerHTML = "";

    if (students[cls].length === 0) {
        list.innerHTML = "<p style='color:#888; text-align:center;'>No students added yet.</p>";
        return;
    }

    students[cls].forEach((s, i) => {
        list.innerHTML += `
        <div class="list-item">
            <div style="display:flex; align-items:center; gap:15px;">
                <div style="background:#00c9a7; color:white; width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold;">
                    ${s.roll}
                </div>
                <div>
                    <b style="font-size:16px; color:#2d3436;">${s.name}</b>
                    <div style="font-size:13px; color:#888; margin-top:2px;">
                        ${s.email} | ${s.mobile}
                    </div>
                </div>
            </div>
            <div>
                <button class="action-btn btn-edit" onclick="editStudent(${i})">Edit</button>
                <button class="action-btn btn-del" onclick="deleteStudent(${i})">Delete</button>
            </div>
        </div>`;
    });
}

render();