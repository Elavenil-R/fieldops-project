// ===== FieldOps Commander — Job Form + Dashboard + Edit Script =====

// Backend base URL
const BASE_URL = "http://192.168.1.107:8080";

// API endpoints
const CREATE_JOB_URL = `${BASE_URL}/jobs/`;
const GET_JOBS_URL = `${BASE_URL}/jobs/`;

// ===== Create Job Elements =====
const form = document.getElementById("jobForm");
const submitBtn = document.getElementById("submitBtn");
const successMsg = document.getElementById("successMsg");
const errorMsg = document.getElementById("errorMsg");

// ===== Dashboard Elements =====
const jobsContainer = document.getElementById("jobsContainer");
const loadingText = document.getElementById("loadingText");
const noJobsMsg = document.getElementById("noJobsMsg");
const refreshJobsBtn = document.getElementById("refreshJobsBtn");

// ===== Edit Modal Elements =====
const editModal = document.getElementById("editModal");
const closeEditModal = document.getElementById("closeEditModal");
const editJobForm = document.getElementById("editJobForm");
const editMessage = document.getElementById("editMessage");
const updateJobBtn = document.getElementById("updateJobBtn");


// ===============================
// CREATE JOB FORM VALIDATION
// ===============================

function validateForm() {
  let isValid = true;

  const fields = ["customer_name", "location", "issue", "priority"];

  fields.forEach((fieldId) => {
    const field = document.getElementById(fieldId);
    const errSpan = document.getElementById(`err-${fieldId}`);

    const value = field.value.trim();

    field.classList.remove("invalid");
    errSpan.textContent = "";

    if (!value) {
      field.classList.add("invalid");
      errSpan.textContent = "⚠️ This field is required.";
      isValid = false;
    }
  });

  return isValid;
}


// ===============================
// CLEAR CREATE FORM MESSAGES
// ===============================

function clearMessages() {
  successMsg.style.display = "none";
  errorMsg.style.display = "none";
  successMsg.textContent = "";
  errorMsg.textContent = "";
}


// ===============================
// GET JOB ID SAFELY
// ===============================

function getJobId(result) {
  return (
    result.id ||
    result.job_id ||
    result.jobId ||
    result.data?.id ||
    result.data?.job_id ||
    result.job?.id ||
    result.job?.job_id ||
    null
  );
}


// ===============================
// CREATE JOB - POST /jobs/
// ===============================

form.addEventListener("submit", async function (e) {
  e.preventDefault();
  clearMessages();

  if (!validateForm()) {
    return;
  }

  const jobData = {
    customer_name: document.getElementById("customer_name").value.trim(),
    location: document.getElementById("location").value.trim(),
    issue: document.getElementById("issue").value.trim(),
    priority: document.getElementById("priority").value,
  };

  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting...";

  try {
    const response = await fetch(CREATE_JOB_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(jobData),
    });

    let result = {};

    try {
      result = await response.json();
    } catch (jsonError) {
      console.warn("Backend did not return JSON response.");
    }

    console.log("Create job response:", result);

    if (response.ok) {
      const jobId = getJobId(result);

      successMsg.style.display = "block";

      if (jobId) {
        successMsg.textContent = `✅ Job created successfully! Job ID: ${jobId}`;
      } else {
        successMsg.textContent = "✅ Job created successfully!";
      }

      form.reset();

      // Reload dashboard after creating new job
      fetchJobs();
    } else {
      errorMsg.style.display = "block";

      if (result.detail) {
        errorMsg.textContent = `❌ Error: ${formatErrorMessage(result.detail)}`;
      } else if (result.message) {
        errorMsg.textContent = `❌ Error: ${result.message}`;
      } else {
        errorMsg.textContent = "❌ Something went wrong while creating the job.";
      }
    }
  } catch (networkError) {
    errorMsg.style.display = "block";
    errorMsg.textContent =
      "🔌 Network Error: Cannot connect to backend. Please check backend server and IP address.";

    console.error("Create job network error:", networkError);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit Job";
  }
});


// ===============================
// LIVE VALIDATION RESET
// ===============================

["customer_name", "location", "issue", "priority"].forEach((fieldId) => {
  const field = document.getElementById(fieldId);
  const errSpan = document.getElementById(`err-${fieldId}`);

  field.addEventListener("input", function () {
    field.classList.remove("invalid");
    errSpan.textContent = "";
  });

  field.addEventListener("change", function () {
    field.classList.remove("invalid");
    errSpan.textContent = "";
  });
});


// ===============================
// FETCH JOBS - GET /jobs/
// ===============================

async function fetchJobs() {
  jobsContainer.innerHTML = "";
  noJobsMsg.style.display = "none";
  loadingText.style.display = "block";

  try {
    const response = await fetch(GET_JOBS_URL, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    let jobs = [];

    try {
      jobs = await response.json();
    } catch (jsonError) {
      console.warn("Backend did not return JSON for jobs list.");
    }

    console.log("Jobs list response:", jobs);

    if (!response.ok) {
      throw new Error("Failed to fetch jobs");
    }

    // Some backends return direct array, some return {data: []}
    const jobsList = Array.isArray(jobs) ? jobs : jobs.data || jobs.jobs || [];

    displayJobs(jobsList);
  } catch (error) {
    console.error("Fetch jobs error:", error);

    jobsContainer.innerHTML = `
      <div class="alert alert-error">
        ❌ Unable to load jobs. Please check backend server.
      </div>
    `;
  } finally {
    loadingText.style.display = "none";
  }
}


// ===============================
// DISPLAY JOBS IN DASHBOARD
// ===============================

function displayJobs(jobs) {
  jobsContainer.innerHTML = "";

  if (!jobs || jobs.length === 0) {
    noJobsMsg.style.display = "block";
    return;
  }

  noJobsMsg.style.display = "none";

  jobs.forEach((job) => {
    const jobCard = document.createElement("div");
    jobCard.className = "job-card";

    const jobId = job.id || job.job_id || job.jobId;
    const customerName = job.customer_name || "Unknown Customer";
    const location = job.location || "Not provided";
    const issue = job.issue || "No issue provided";
    const priority = job.priority || "Low";
    const status = job.status || "Pending";

    jobCard.innerHTML = `
      <div class="job-card-header">
        <div>
          <div class="job-title">${escapeHTML(customerName)}</div>
          <div class="job-id">Job ID: ${jobId || "N/A"}</div>
        </div>

        <span class="badge ${getPriorityClass(priority)}">
          ${escapeHTML(priority)}
        </span>
      </div>

      <div class="job-info">
        <p><strong>📍 Location:</strong> ${escapeHTML(location)}</p>
        <p>
          <strong>📌 Status:</strong>
          <span class="badge status-badge">${escapeHTML(status)}</span>
        </p>
        <p class="job-issue"><strong>📝 Issue:</strong> ${escapeHTML(issue)}</p>
      </div>

      <div class="job-actions">
        <button type="button" class="edit-btn">Edit</button>
      </div>
    `;

    const editBtn = jobCard.querySelector(".edit-btn");

    editBtn.addEventListener("click", function () {
      openEditModal({
        id: jobId,
        customer_name: customerName,
        location: location,
        issue: issue,
        priority: priority,
        status: status,
      });
    });

    jobsContainer.appendChild(jobCard);
  });
}


// ===============================
// PRIORITY BADGE CLASS
// ===============================

function getPriorityClass(priority) {
  if (priority === "High") {
    return "badge-high";
  }

  if (priority === "Medium") {
    return "badge-medium";
  }

  return "badge-low";
}


// ===============================
// OPEN EDIT MODAL
// ===============================

function openEditModal(job) {
  document.getElementById("edit_job_id").value = job.id;
  document.getElementById("edit_customer_name").value = job.customer_name || "";
  document.getElementById("edit_location").value = job.location || "";
  document.getElementById("edit_issue").value = job.issue || "";
  document.getElementById("edit_priority").value = job.priority || "";
  document.getElementById("edit_status").value = job.status || "Pending";

  editMessage.textContent = "";
  editMessage.style.color = "";

  editModal.style.display = "flex";
}


// ===============================
// CLOSE EDIT MODAL
// ===============================

closeEditModal.addEventListener("click", function () {
  editModal.style.display = "none";
});

editModal.addEventListener("click", function (event) {
  if (event.target === editModal) {
    editModal.style.display = "none";
  }
});


// ===============================
// VALIDATE EDIT FORM
// ===============================

function validateEditForm(updatedJobData) {
  if (
    !updatedJobData.customer_name ||
    !updatedJobData.location ||
    !updatedJobData.issue ||
    !updatedJobData.priority ||
    !updatedJobData.status
  ) {
    editMessage.textContent = "⚠️ Please fill all fields.";
    editMessage.style.color = "red";
    return false;
  }

  return true;
}


// ===============================
// UPDATE JOB - PUT /jobs/{job_id}
// ===============================

editJobForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const jobId = document.getElementById("edit_job_id").value;

  const updatedJobData = {
    customer_name: document.getElementById("edit_customer_name").value.trim(),
    location: document.getElementById("edit_location").value.trim(),
    issue: document.getElementById("edit_issue").value.trim(),
    priority: document.getElementById("edit_priority").value,
    status: document.getElementById("edit_status").value,
  };

  if (!validateEditForm(updatedJobData)) {
    return;
  }

  updateJobBtn.disabled = true;
  updateJobBtn.textContent = "Updating...";
  editMessage.textContent = "";

  try {
    const response = await fetch(`${BASE_URL}/jobs/${jobId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(updatedJobData),
    });

    let result = {};

    try {
      result = await response.json();
    } catch (jsonError) {
      console.warn("Backend did not return JSON response for update.");
    }

    console.log("Update job response:", result);

    if (response.ok) {
      editMessage.textContent = "✅ Job updated successfully!";
      editMessage.style.color = "green";

      setTimeout(function () {
        editModal.style.display = "none";
        fetchJobs();
      }, 800);
    } else {
      if (result.detail) {
        editMessage.textContent = `❌ ${formatErrorMessage(result.detail)}`;
      } else if (result.message) {
        editMessage.textContent = `❌ ${result.message}`;
      } else {
        editMessage.textContent = "❌ Failed to update job.";
      }

      editMessage.style.color = "red";
    }
  } catch (error) {
    console.error("Update job error:", error);

    editMessage.textContent =
      "🔌 Network Error: Cannot connect to backend. Please check backend server.";
    editMessage.style.color = "red";
  } finally {
    updateJobBtn.disabled = false;
    updateJobBtn.textContent = "Update Job";
  }
});


// ===============================
// REFRESH JOBS BUTTON
// ===============================

refreshJobsBtn.addEventListener("click", function () {
  fetchJobs();
});


// ===============================
// FORMAT ERROR MESSAGE
// ===============================

function formatErrorMessage(errorDetail) {
  if (typeof errorDetail === "string") {
    return errorDetail;
  }

  if (Array.isArray(errorDetail)) {
    return errorDetail
      .map((err) => err.msg || JSON.stringify(err))
      .join(", ");
  }

  if (typeof errorDetail === "object") {
    return JSON.stringify(errorDetail);
  }

  return "Something went wrong.";
}


// ===============================
// ESCAPE HTML FOR SAFE DISPLAY
// ===============================

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


// ===============================
// LOAD JOBS WHEN PAGE OPENS
// ===============================

document.addEventListener("DOMContentLoaded", function () {
  fetchJobs();
});