import { db, collection, addDoc, getDocs, deleteDoc, updateDoc, doc, query, where, writeBatch } from "./firebase-config.js";

let allStudents = [];

/* ===========================
   1. INIT & DROPDOWNS
=========================== */
document.addEventListener("DOMContentLoaded", () => {
  loadClassDropdowns();
  // Listen for Excel Import
  document.getElementById("excelInput").addEventListener("change", handleExcelUpload);
});

async function loadClassDropdowns() {
  const filterSel = document.getElementById("filterClass");
  const modalSel = document.getElementById("sClass");

  try {
    const snap = await getDocs(collection(db, "classes"));
    let opts = "";

    // Sort
    const classes = [];
    snap.forEach(d => classes.push(d.data().name));
    classes.sort();

    classes.forEach(c => {
      opts += `<option value="${c}">${c}</option>`;
    });

    filterSel.innerHTML = `<option value="">Select Class...</option>` + opts;
    modalSel.innerHTML = opts;
  } catch (e) {
    console.error(e);
  }
}

/* ===========================
   2. LOAD STUDENTS (FILTERED)
=========================== */
window.loadStudents = async function () {
  const year = document.getElementById("filterYear").value;
  const cls = document.getElementById("filterClass").value;
  const sem = document.getElementById("filterSem").value;
  const tbody = document.getElementById("studentTableBody");
  const countDiv = document.getElementById("resultCount");

  if (!cls) { alert("Please select a Class first."); return; }

  tbody.innerHTML = "<tr><td colspan='6' style='text-align:center; padding:20px;'>Loading...</td></tr>";

  try {
    const q = query(
      collection(db, "students"),
      where("academicYear", "==", year),
      where("class", "==", cls),
      where("semester", "==", sem)
    );

    const snapshot = await getDocs(q);
    allStudents = [];
    tbody.innerHTML = "";

    if (snapshot.empty) {
      tbody.innerHTML = "<tr><td colspan='6' style='text-align:center; color:#aaa; padding:30px;'>No students found for this selection.</td></tr>";
      countDiv.innerText = "0 Students found";
      return;
    }

    snapshot.forEach(doc => allStudents.push({ id: doc.id, ...doc.data() }));

    allStudents.sort((a, b) => parseInt(a.roll) - parseInt(b.roll));
    countDiv.innerText = `${allStudents.length} Students found`;

    allStudents.forEach(s => {
      tbody.innerHTML += `
            <tr>
                <td><b>${s.roll}</b></td>
                <td>
                    <div style="font-weight:600; color:#2d3436;">${s.fName} ${s.lName}</div>
                    <div style="font-size:12px; color:#aaa;">${s.email || ""}</div>
                </td>
                <td>${s.mobile || "-"}</td>
                <td>
                    <div style="font-size:13px;">F: ${s.fatherName || "-"}</div>
                    <div style="font-size:11px; color:#aaa;">${s.fatherMobile || ""}</div>
                </td>
                <td><span class="badge-sem">${s.semester}</span></td>
                <td>
                    <button class="action-btn" onclick="editStudent('${s.id}')" style="color:#0984e3; cursor:pointer; background:none; border:none;">✏️ Edit</button>
                    <button class="action-btn" onclick="deleteStudent('${s.id}')" style="color:#ff7675; cursor:pointer; background:none; border:none; margin-left:10px;">🗑️</button>
                </td>
            </tr>`;
    });

  } catch (e) {
    console.error("Load Error:", e);
    tbody.innerHTML = "<tr><td colspan='6' style='color:red; text-align:center;'>Error loading data. Check console.</td></tr>";
  }
}

/* ===========================
   3. MODAL & FORM LOGIC
=========================== */
window.openModal = function (editMode = false, id = null) {
  const modal = document.getElementById("studentModal");
  modal.classList.add("active");

  if (!editMode) {
    resetForm();
    document.getElementById("sYear").value = document.getElementById("filterYear").value;
    document.getElementById("sClass").value = document.getElementById("filterClass").value || document.getElementById("sClass").options[0].value;
    document.getElementById("sSem").value = document.getElementById("filterSem").value;
  } else {
    document.getElementById("modalTitle").innerText = "Edit Student";
    document.getElementById("btnSave").innerText = "Update Student";
  }
}

window.closeModal = function () {
  document.getElementById("studentModal").classList.remove("active");
}

window.toggleGuardian = function () {
  const section = document.getElementById("guardianSection");
  section.style.display = document.getElementById("guardianCheck").checked ? "block" : "none";
}

/* ===========================
   4. IMPORT EXCEL LOGIC
=========================== */
window.openImportModal = function () {
  document.getElementById("importModal").classList.add("active");
}

window.closeImportModal = function () {
  document.getElementById("importModal").classList.remove("active");
}

// A. DOWNLOAD TEMPLATE
window.downloadTemplate = function () {
  // 1. Define Headers
  const headers = [
    ["Roll No", "First Name", "Middle Name", "Last Name", "Mobile", "Email", "Address", "Father Name", "Father Mobile", "Mother Name"]
  ];

  // 2. Create Sheet
  const ws = XLSX.utils.aoa_to_sheet(headers);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template");

  // 3. Download
  XLSX.writeFile(wb, "Student_Import_Template.xlsx");
}

// B. HANDLE UPLOAD
async function handleExcelUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const year = document.getElementById("filterYear").value;
  const cls = document.getElementById("filterClass").value;
  const sem = document.getElementById("filterSem").value;

  if (!cls) { alert("Please select Class in the filter bar first (Import goes to that class)."); return; }

  const reader = new FileReader();
  reader.onload = async function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet);

    if (json.length === 0) { alert("Empty Excel"); return; }

    let count = 0;
    const batch = writeBatch(db);

    // Loop Rows
    json.forEach((row) => {
      const roll = row["Roll No"];
      const fName = row["First Name"];

      if (roll && fName) {
        const docRef = doc(collection(db, "students"));
        batch.set(docRef, {
          academicYear: year,
          class: cls,
          semester: sem,
          roll: String(roll),
          fName: String(fName),
          mName: row["Middle Name"] || "",
          lName: row["Last Name"] || "",
          name: `${fName} ${row["Last Name"] || ""}`,

          mobile: row["Mobile"] || "",
          email: row["Email"] || "",
          address: row["Address"] || "",

          fatherName: row["Father Name"] || "",
          fatherMobile: row["Father Mobile"] || "",
          motherName: row["Mother Name"] || "",

          createdAt: new Date()
        });
        count++;
      }
    });

    try {
      await batch.commit();
      alert(`Successfully Imported ${count} Students to ${cls} (${year})`);
      closeImportModal();
      loadStudents();
    } catch (err) {
      console.error(err);
      alert("Error importing. Check console.");
    }
    document.getElementById("excelInput").value = "";
  };
  reader.readAsArrayBuffer(file);
}


/* ===========================
   5. SAVE SINGLE STUDENT
=========================== */
window.saveStudent = async function () {
  const editId = document.getElementById("editId").value;
  const academicYear = document.getElementById("sYear").value;
  const cls = document.getElementById("sClass").value;
  const semester = document.getElementById("sSem").value;
  const roll = document.getElementById("sRoll").value.trim();

  const fName = document.getElementById("fName").value.trim();
  const mName = document.getElementById("mName").value.trim();
  const lName = document.getElementById("lName").value.trim();
  const mobile = document.getElementById("mobile").value.trim();
  const email = document.getElementById("email").value.trim();
  const address = document.getElementById("address").value.trim();

  const fatherName = document.getElementById("fatherName").value.trim();
  const fatherMobile = document.getElementById("fatherMobile").value.trim();
  const motherName = document.getElementById("motherName").value.trim();
  const motherMobile = document.getElementById("motherMobile").value.trim();

  const hasGuardian = document.getElementById("guardianCheck").checked;
  const gName = document.getElementById("gName").value.trim();
  const gMobile = document.getElementById("gMobile").value.trim();
  const gAddress = document.getElementById("gAddress").value.trim();

  if (!roll || !fName || !lName) { alert("Roll No, First Name, Last Name are compulsory."); return; }

  const btn = document.getElementById("btnSave");
  const originalText = btn.innerText;
  btn.innerText = "Processing...";
  btn.disabled = true;

  const studentData = {
    academicYear, class: cls, semester, roll,
    fName, mName, lName, name: `${fName} ${lName}`,
    mobile, email, address,
    fatherName, fatherMobile, motherName, motherMobile,
    hasGuardian, gName, gMobile, gAddress,
    updatedAt: new Date()
  };

  try {
    if (editId) {
      await updateDoc(doc(db, "students", editId), studentData);
      alert("Updated Successfully");
    } else {
      studentData.createdAt = new Date();
      await addDoc(collection(db, "students"), studentData);
      alert("Student Added");
    }
    closeModal();
    loadStudents();
  } catch (e) {
    console.error(e);
    alert("Error saving data");
  } finally {
    btn.innerText = originalText;
    btn.disabled = false;
  }
}

window.editStudent = function (id) {
  const s = allStudents.find(stu => stu.id === id);
  if (!s) return;

  openModal(true);
  document.getElementById("editId").value = s.id;

  document.getElementById("sYear").value = s.academicYear || "2025-2026";
  document.getElementById("sClass").value = s.class;
  document.getElementById("sSem").value = s.semester || "Sem 1";
  document.getElementById("sRoll").value = s.roll;

  document.getElementById("fName").value = s.fName || "";
  document.getElementById("mName").value = s.mName || "";
  document.getElementById("lName").value = s.lName || "";
  document.getElementById("mobile").value = s.mobile || "";
  document.getElementById("email").value = s.email || "";
  document.getElementById("address").value = s.address || "";

  document.getElementById("fatherName").value = s.fatherName || "";
  document.getElementById("fatherMobile").value = s.fatherMobile || "";
  document.getElementById("motherName").value = s.motherName || "";
  document.getElementById("motherMobile").value = s.motherMobile || "";

  if (s.hasGuardian) {
    document.getElementById("guardianCheck").checked = true;
    toggleGuardian();
    document.getElementById("gName").value = s.gName || "";
    document.getElementById("gMobile").value = s.gMobile || "";
    document.getElementById("gAddress").value = s.gAddress || "";
  }
}

window.deleteStudent = async function (id) {
  if (confirm("Permanently delete this student?")) {
    await deleteDoc(doc(db, "students", id));
    loadStudents();
  }
}

window.resetForm = function () {
  document.getElementById("editId").value = "";
  document.getElementById("modalTitle").innerText = "Add New Student";
  document.getElementById("btnSave").innerText = "Save Student";

  const inputs = document.querySelectorAll("#studentModal input, #studentModal textarea");
  inputs.forEach(i => i.value = "");
  document.getElementById("guardianCheck").checked = false;
  toggleGuardian();
}