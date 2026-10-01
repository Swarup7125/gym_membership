/*
  Prime Fitness — Gym Membership Management

  Plain HTML/CSS/JavaScript version.
  - No React.
  - Works directly from index.html.
  - Uses LocalStorage when opened directly or when no backend is available.
  - If the existing Express backend is available, it can use the backend API.
*/

const STORAGE_KEYS = {
  session: "primeFitness:session",
  members: "primeFitness:members",
  seeded: "primeFitness:seeded_v1",
};

const ADMIN_HINT = {
  username: "admin",
  password: "admin123",
};

const RUNTIME = {
  hasHttpOrigin:
    typeof location !== "undefined" &&
    /^https?:/i.test(location.protocol),

  useBackend: false,
  membersCache: null,
  isAdmin: false,
};

// ============================================================
// Utilities
// ============================================================

function todayISODate() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseISODate(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return null;
  }

  const [year, month, day] = iso.split("-").map(Number);

  const date = new Date(year, month - 1, day);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function formatISO(iso) {
  return iso || "";
}

function addMonthsClamped(date, months) {
  const result = new Date(date.getTime());
  const originalDay = result.getDate();

  result.setDate(1);
  result.setMonth(result.getMonth() + months);

  const lastDay = new Date(
    result.getFullYear(),
    result.getMonth() + 1,
    0
  ).getDate();

  result.setDate(
    Math.min(originalDay, lastDay)
  );

  return result;
}

function isoFromDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function calculateExpiryISO(joinISO, plan) {
  const joinDate = parseISODate(joinISO);

  if (!joinDate) {
    return "";
  }

  let expiryDate;

  if (plan === "Monthly") {
    expiryDate = addMonthsClamped(joinDate, 1);
  } else if (plan === "Quarterly") {
    expiryDate = addMonthsClamped(joinDate, 3);
  } else if (plan === "Yearly") {
    expiryDate = addMonthsClamped(joinDate, 12);
  } else {
    return "";
  }

  return isoFromDate(expiryDate);
}

function isExpired(member, nowISO = todayISODate()) {
  if (!member || !member.expiryDate) {
    return true;
  }

  return member.expiryDate < nowISO;
}

function uid() {
  return (
    `m_${Date.now().toString(36)}_` +
    Math.random().toString(36).slice(2, 8)
  );
}

function sanitizePhone(phone) {
  return String(phone || "")
    .replace(/[^\d+]/g, "")
    .trim();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeCsv(value) {
  const text = String(value ?? "");

  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function downloadTextFile(
  filename,
  content,
  mime = "text/plain"
) {
  const blob = new Blob(
    [content],
    {
      type: `${mime};charset=utf-8`,
    }
  );

  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;

  document.body.appendChild(anchor);

  anchor.click();

  anchor.remove();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}

// ============================================================
// Backend API
// ============================================================

async function apiFetch(path, options = {}) {
  const response = await fetch(path, {
    credentials: "include",

    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },

    ...options,
  });

  const contentType =
    response.headers.get("content-type") || "";

  const payload =
    contentType.includes("application/json")
      ? await response.json()
      : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === "object" &&
      payload?.error
        ? payload.error
        : "Request failed.";

    const error = new Error(message);

    error.status = response.status;

    throw error;
  }

  return payload;
}

// ============================================================
// LocalStorage
// ============================================================

function loadMembers() {
  const raw = localStorage.getItem(
    STORAGE_KEYS.members
  );

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
}

function saveMembers(members) {
  localStorage.setItem(
    STORAGE_KEYS.members,
    JSON.stringify(members)
  );
}

function seedSampleDataIfNeeded() {
  if (
    localStorage.getItem(
      STORAGE_KEYS.seeded
    ) === "1"
  ) {
    return;
  }

  const today = parseISODate(
    todayISODate()
  );

  const daysAgo = (days) => {
    return isoFromDate(
      new Date(
        today.getTime() -
          days * 24 * 60 * 60 * 1000
      )
    );
  };

  const samples = [
    {
      id: uid(),
      name: "Sai Kumar",
      phone: "+91 9876543210",
      email: "sai@example.com",
      plan: "Monthly",
      joinDate: daysAgo(10),
    },

    {
      id: uid(),
      name: "Ananya Sharma",
      phone: "+91 9123456780",
      email: "ananya@example.com",
      plan: "Quarterly",
      joinDate: daysAgo(40),
    },

    {
      id: uid(),
      name: "Rahul Verma",
      phone: "9988776655",
      email: "rahul@example.com",
      plan: "Yearly",
      joinDate: daysAgo(400),
    },
  ].map((member) => ({
    ...member,

    phone: sanitizePhone(
      member.phone
    ),

    expiryDate:
      calculateExpiryISO(
        member.joinDate,
        member.plan
      ),
  }));

  saveMembers(samples);

  localStorage.setItem(
    STORAGE_KEYS.seeded,
    "1"
  );
}

function isLoggedIn() {
  return (
    localStorage.getItem(
      STORAGE_KEYS.session
    ) === "1"
  );
}

function setLoggedIn(value) {
  localStorage.setItem(
    STORAGE_KEYS.session,
    value ? "1" : "0"
  );
}

// ============================================================
// Backend detection
// ============================================================

async function tryDetectBackend() {
  if (!RUNTIME.hasHttpOrigin) {
    RUNTIME.useBackend = false;

    return false;
  }

  try {
    const response =
      await apiFetch("/api/me", {
        method: "GET",
      });

    if (
      typeof response?.loggedIn ===
      "boolean"
    ) {
      RUNTIME.useBackend = true;

      return true;
    }
  } catch {
    // No backend available.
  }

  RUNTIME.useBackend = false;

  return false;
}

async function backendIsLoggedIn() {
  const response =
    await apiFetch("/api/me", {
      method: "GET",
    });

  return response?.loggedIn === true;
}

async function backendLoadMembers() {
  const response =
    await apiFetch("/api/members", {
      method: "GET",
    });

  return Array.isArray(
    response?.members
  )
    ? response.members
    : [];
}

async function backendCreateMember(
  payload
) {
  const response =
    await apiFetch("/api/members", {
      method: "POST",

      body: JSON.stringify(payload),
    });

  return response?.member;
}

async function backendUpdateMember(
  id,
  payload
) {
  const response =
    await apiFetch(
      `/api/members/${encodeURIComponent(id)}`,
      {
        method: "PUT",

        body: JSON.stringify(payload),
      }
    );

  return response?.member;
}

async function backendDeleteMember(id) {
  await apiFetch(
    `/api/members/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    }
  );
}

async function loadMembersUnified() {
  if (!RUNTIME.useBackend) {
    return loadMembers();
  }

  if (
    Array.isArray(
      RUNTIME.membersCache
    )
  ) {
    return RUNTIME.membersCache;
  }

  const members =
    await backendLoadMembers();

  RUNTIME.membersCache = members;

  return members;
}

async function refreshMembersCache() {
  if (!RUNTIME.useBackend) {
    return;
  }

  RUNTIME.membersCache =
    await backendLoadMembers();
}

// ============================================================
// DOM Elements
// ============================================================

const el = {
  loginView:
    document.getElementById(
      "loginView"
    ),

  appShell:
    document.getElementById(
      "appShell"
    ),

  loginForm:
    document.getElementById(
      "loginForm"
    ),

  loginError:
    document.getElementById(
      "loginError"
    ),

  username:
    document.getElementById(
      "username"
    ),

  password:
    document.getElementById(
      "password"
    ),

  logoutBtn:
    document.getElementById(
      "logoutBtn"
    ),

  exportCsvBtn:
    document.getElementById(
      "exportCsvBtn"
    ),

  addMemberBtn:
    document.getElementById(
      "addMemberBtn"
    ),

  main:
    document.getElementById(
      "main"
    ),

  statTotal:
    document.getElementById(
      "statTotal"
    ),

  statActive:
    document.getElementById(
      "statActive"
    ),

  statExpired:
    document.getElementById(
      "statExpired"
    ),

  searchInput:
    document.getElementById(
      "searchInput"
    ),

  statusFilter:
    document.getElementById(
      "statusFilter"
    ),

  planFilter:
    document.getElementById(
      "planFilter"
    ),

  resultCount:
    document.getElementById(
      "resultCount"
    ),

  membersTbody:
    document.getElementById(
      "membersTbody"
    ),

  modalBackdrop:
    document.getElementById(
      "modalBackdrop"
    ),

  memberModal:
    document.getElementById(
      "memberModal"
    ),

  closeModalBtn:
    document.getElementById(
      "closeModalBtn"
    ),

  cancelModalBtn:
    document.getElementById(
      "cancelModalBtn"
    ),

  memberForm:
    document.getElementById(
      "memberForm"
    ),

  formError:
    document.getElementById(
      "formError"
    ),

  memberId:
    document.getElementById(
      "memberId"
    ),

  name:
    document.getElementById(
      "name"
    ),

  phone:
    document.getElementById(
      "phone"
    ),

  email:
    document.getElementById(
      "email"
    ),

  plan:
    document.getElementById(
      "plan"
    ),

  joinDate:
    document.getElementById(
      "joinDate"
    ),

  expiryDate:
    document.getElementById(
      "expiryDate"
    ),

  modalTitle:
    document.getElementById(
      "modalTitle"
    ),
};

// ============================================================
// View Switching
// ============================================================

function setViewLoggedIn(loggedIn) {
  RUNTIME.isAdmin =
    Boolean(loggedIn);

  el.loginView.hidden =
    loggedIn;

  el.appShell.hidden =
    !loggedIn;

  if (loggedIn) {
    el.addMemberBtn.disabled =
      false;

    el.exportCsvBtn.disabled =
      false;

    if (!RUNTIME.useBackend) {
      seedSampleDataIfNeeded();
    }

    render();

    requestAnimationFrame(() => {
      el.main?.focus();
    });
  } else {
    closeModal();

    el.addMemberBtn.disabled =
      true;

    el.exportCsvBtn.disabled =
      true;

    el.loginError.textContent =
      "";

    el.password.value = "";

    requestAnimationFrame(() => {
      el.username.focus();
    });
  }
}

// ============================================================
// Modal
// ============================================================

function openModal(
  mode,
  member = null
) {
  if (!RUNTIME.isAdmin) {
    return;
  }

  el.memberForm.reset();

  el.formError.textContent =
    "";

  clearFieldErrors();

  if (
    mode === "edit" &&
    member
  ) {
    el.modalTitle.textContent =
      "Edit Member";

    el.memberId.value =
      member.id;

    el.name.value =
      member.name;

    el.phone.value =
      member.phone;

    el.email.value =
      member.email || "";

    el.plan.value =
      member.plan;

    el.joinDate.value =
      member.joinDate;

    el.expiryDate.value =
      member.expiryDate;
  } else {
    el.modalTitle.textContent =
      "Add Member";

    el.memberId.value =
      "";

    el.joinDate.value =
      todayISODate();

    el.plan.value =
      "Monthly";

    el.expiryDate.value =
      calculateExpiryISO(
        el.joinDate.value,
        el.plan.value
      );
  }

  el.modalBackdrop.hidden =
    false;

  el.memberModal.hidden =
    false;

  requestAnimationFrame(() => {
    el.name.focus();
  });
}

function closeModal() {
  el.modalBackdrop.hidden =
    true;

  el.memberModal.hidden =
    true;
}

function fieldErrorEl(
  fieldName
) {
  return el.memberForm.querySelector(
    `.fieldError[data-for="${fieldName}"]`
  );
}

function setFieldError(
  fieldName,
  message
) {
  const element =
    fieldErrorEl(fieldName);

  if (element) {
    element.textContent =
      message || "";
  }
}

function clearFieldErrors() {
  [
    "name",
    "phone",
    "email",
    "plan",
    "joinDate",
  ].forEach((field) => {
    setFieldError(field, "");
  });
}

// ============================================================
// Filtering
// ============================================================

function getFilters() {
  return {
    q: (
      el.searchInput.value ||
      ""
    )
      .trim()
      .toLowerCase(),

    status:
      el.statusFilter.value,

    plan:
      el.planFilter.value,
  };
}

function getVisibleMembers(
  members
) {
  const {
    q,
    status,
    plan,
  } = getFilters();

  const nowISO =
    todayISODate();

  return members.filter(
    (member) => {
      const matchQuery =
        !q ||
        (member.name || "")
          .toLowerCase()
          .includes(q) ||
        (member.phone || "")
          .toLowerCase()
          .includes(q);

      const expired =
        isExpired(
          member,
          nowISO
        );

      const matchStatus =
        status === "all" ||
        (
          status === "active" &&
          !expired
        ) ||
        (
          status === "expired" &&
          expired
        );

      const matchPlan =
        plan === "all" ||
        member.plan === plan;

      return (
        matchQuery &&
        matchStatus &&
        matchPlan
      );
    }
  );
}

// ============================================================
// Rendering
// ============================================================

function renderStats(
  members
) {
  const nowISO =
    todayISODate();

  const total =
    members.length;

  const expired =
    members.filter(
      (member) =>
        isExpired(
          member,
          nowISO
        )
    ).length;

  const active =
    total - expired;

  el.statTotal.textContent =
    String(total);

  el.statActive.textContent =
    String(active);

  el.statExpired.textContent =
    String(expired);
}

function statusPill(
  member
) {
  const expired =
    isExpired(
      member,
      todayISODate()
    );

  if (expired) {
    return `
      <span class="pill pill--expired">
        <span class="dot"></span>
        Expired
      </span>
    `;
  }

  return `
    <span class="pill pill--active">
      <span class="dot"></span>
      Active
    </span>
  `;
}

function renderTable(rows) {
  if (!rows.length) {
    el.membersTbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center;padding:24px;">
          <span class="muted">
            No members found.
          </span>
        </td>
      </tr>
    `;

    return;
  }

  el.membersTbody.innerHTML =
    rows
      .map(
        (member) => `
          <tr>
            <td>
              ${escapeHtml(
                member.name
              )}
            </td>

            <td>
              ${escapeHtml(
                member.phone
              )}
            </td>

            <td>
              ${escapeHtml(
                member.email || ""
              )}
            </td>

            <td>
              ${escapeHtml(
                member.plan
              )}
            </td>

            <td>
              ${escapeHtml(
                formatISO(
                  member.joinDate
                )
              )}
            </td>

            <td>
              ${escapeHtml(
                formatISO(
                  member.expiryDate
                )
              )}
            </td>

            <td>
              ${statusPill(
                member
              )}
            </td>

            <td class="thActions">
              <div class="rowActions">

                <button
                  class="btn btn--ghost"
                  type="button"
                  data-action="edit"
                  data-id="${escapeHtml(
                    member.id
                  )}"
                >
                  Edit
                </button>

                <button
                  class="btn btn--ghost"
                  type="button"
                  data-action="delete"
                  data-id="${escapeHtml(
                    member.id
                  )}"
                >
                  Delete
                </button>

              </div>
            </td>
          </tr>
        `
      )
      .join("");
}

async function render() {
  try {
    const members =
      await loadMembersUnified();

    renderStats(members);

    const sorted =
      [...members].sort(
        (a, b) =>
          (
            b.joinDate || ""
          ).localeCompare(
            a.joinDate || ""
          )
      );

    const visible =
      getVisibleMembers(
        sorted
      );

    renderTable(visible);

    el.resultCount.textContent =
      `${visible.length} result${
        visible.length === 1
          ? ""
          : "s"
      }`;
  } catch (error) {
    if (
      RUNTIME.useBackend &&
      error?.status === 401
    ) {
      RUNTIME.membersCache =
        null;

      setLoggedIn(false);
      setViewLoggedIn(false);

      return;
    }

    el.membersTbody.innerHTML = "";

    el.resultCount.textContent =
      "0 results";
  }
}

// ============================================================
// Member Storage
// ============================================================

function upsertMember(
  payload
) {
  const members =
    loadMembers();

  const index =
    members.findIndex(
      (member) =>
        member.id === payload.id
    );

  if (index >= 0) {
    members[index] =
      payload;
  } else {
    members.push(payload);
  }

  saveMembers(members);
}

function deleteMember(id) {
  const members =
    loadMembers().filter(
      (member) =>
        member.id !== id
    );

  saveMembers(members);
}

// ============================================================
// Validation
// ============================================================

function validateMemberForm(
  values
) {
  clearFieldErrors();

  el.formError.textContent =
    "";

  const errors = {};

  const name =
    (
      values.name || ""
    ).trim();

  const phone =
    sanitizePhone(
      values.phone || ""
    );

  const email =
    (
      values.email || ""
    ).trim();

  const plan =
    values.plan || "";

  const joinDate =
    values.joinDate || "";

  if (!name) {
    errors.name =
      "Name is required.";
  }

  if (!phone) {
    errors.phone =
      "Phone is required.";
  }

  if (!plan) {
    errors.plan =
      "Plan is required.";
  }

  if (!joinDate) {
    errors.joinDate =
      "Join date is required.";
  }

  if (
    email &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email
    )
  ) {
    errors.email =
      "Enter a valid email.";
  }

  return {
    errors,

    clean: {
      name,
      phone,
      email,
      plan,
      joinDate,
    },
  };
}

// ============================================================
// CSV Export
// ============================================================

async function exportCsv() {
  try {
    const members =
      await loadMembersUnified();

    const visible =
      getVisibleMembers(
        members
      );

    const nowISO =
      todayISODate();

    const header = [
      "Name",
      "Phone",
      "Email",
      "Plan",
      "JoinDate",
      "ExpiryDate",
      "Status",
    ];

    const lines = [
      header.join(","),

      ...visible.map(
        (member) => {
          const status =
            isExpired(
              member,
              nowISO
            )
              ? "Expired"
              : "Active";

          return [
            escapeCsv(
              member.name
            ),

            escapeCsv(
              member.phone
            ),

            escapeCsv(
              member.email || ""
            ),

            escapeCsv(
              member.plan
            ),

            escapeCsv(
              member.joinDate
            ),

            escapeCsv(
              member.expiryDate
            ),

            escapeCsv(
              status
            ),
          ].join(",");
        }
      ),
    ].join("\n");

    const filename =
      `prime-fitness-members_${todayISODate()}.csv`;

    downloadTextFile(
      filename,
      lines,
      "text/csv"
    );
  } catch {
    // Ignore export errors.
  }
}

// ============================================================
// Login
// ============================================================

el.loginForm.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    el.loginError.textContent =
      "";

    const username =
      (
        el.username.value ||
        ""
      ).trim();

    const password =
      el.password.value ||
      "";

    if (
      !username ||
      !password
    ) {
      el.loginError.textContent =
        "Please enter username and password.";

      return;
    }

    try {
      if (
        RUNTIME.useBackend
      ) {
        await apiFetch(
          "/api/login",
          {
            method: "POST",

            body: JSON.stringify({
              username,
              password,
            }),
          }
        );

        setLoggedIn(true);

        setViewLoggedIn(
          true
        );

        return;
      }

      // Local/demo authentication.
      if (
        username ===
          ADMIN_HINT.username &&
        password ===
          ADMIN_HINT.password
      ) {
        setLoggedIn(true);

        setViewLoggedIn(
          true
        );
      } else {
        el.loginError.textContent =
          "Invalid credentials.";
      }
    } catch (error) {
      el.loginError.textContent =
        error?.message ||
        "Login failed.";
    }
  }
);

// ============================================================
// Logout
// ============================================================

el.logoutBtn.addEventListener(
  "click",
  async () => {
    try {
      if (
        RUNTIME.useBackend
      ) {
        try {
          await apiFetch(
            "/api/logout",
            {
              method: "POST",

              body: JSON.stringify(
                {}
              ),
            }
          );
        } catch {
          // Ignore logout errors.
        }

        RUNTIME.membersCache =
          null;
      }

      setLoggedIn(false);

      setViewLoggedIn(
        false
      );
    } catch {
      setLoggedIn(false);

      setViewLoggedIn(
        false
      );
    }
  }
);

// ============================================================
// Member Buttons
// ============================================================

el.addMemberBtn.addEventListener(
  "click",
  () => {
    openModal("add");
  }
);

el.exportCsvBtn.addEventListener(
  "click",
  exportCsv
);

// ============================================================
// Modal Controls
// ============================================================

el.closeModalBtn.addEventListener(
  "click",
  closeModal
);

el.cancelModalBtn.addEventListener(
  "click",
  closeModal
);

el.modalBackdrop.addEventListener(
  "click",
  closeModal
);

// ============================================================
// Expiry Calculation
// ============================================================

function updateExpiry() {
  el.expiryDate.value =
    calculateExpiryISO(
      el.joinDate.value,
      el.plan.value
    );
}

el.plan.addEventListener(
  "change",
  updateExpiry
);

el.joinDate.addEventListener(
  "change",
  updateExpiry
);

// ============================================================
// Add / Edit Member
// ============================================================

el.memberForm.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    if (!RUNTIME.isAdmin) {
      el.formError.textContent =
        "Admin login required to save members.";

      return;
    }

    const values = {
      id:
        el.memberId.value ||
        "",

      name:
        el.name.value,

      phone:
        el.phone.value,

      email:
        el.email.value,

      plan:
        el.plan.value,

      joinDate:
        el.joinDate.value,
    };

    const {
      errors,
      clean,
    } =
      validateMemberForm(
        values
      );

    if (
      Object.keys(errors)
        .length > 0
    ) {
      Object.entries(
        errors
      ).forEach(
        ([field, message]) => {
          setFieldError(
            field,
            message
          );
        }
      );

      el.formError.textContent =
        "Please fix the highlighted fields.";

      return;
    }

    const id =
      values.id || uid();

    const expiryDate =
      calculateExpiryISO(
        clean.joinDate,
        clean.plan
      );

    if (!expiryDate) {
      el.formError.textContent =
        "Unable to calculate expiry date.";

      return;
    }

    const payload = {
      name:
        clean.name,

      phone:
        clean.phone,

      email:
        clean.email,

      plan:
        clean.plan,

      joinDate:
        clean.joinDate,

      expiryDate,
    };

    try {
      if (
        RUNTIME.useBackend
      ) {
        if (values.id) {
          await backendUpdateMember(
            values.id,
            payload
          );
        } else {
          await backendCreateMember(
            payload
          );
        }

        await refreshMembersCache();
      } else {
        upsertMember({
          id,
          ...payload,
        });
      }

      closeModal();

      await render();
    } catch (error) {
      if (
        RUNTIME.useBackend &&
        error?.status === 401
      ) {
        setLoggedIn(false);

        setViewLoggedIn(
          false
        );

        return;
      }

      el.formError.textContent =
        error?.message ||
        "Save failed.";
    }
  }
);

// ============================================================
// Edit / Delete Table Actions
// ============================================================

el.membersTbody.addEventListener(
  "click",
  async (event) => {
    const button =
      event.target.closest(
        "button[data-action][data-id]"
      );

    if (!button) {
      return;
    }

    if (!RUNTIME.isAdmin) {
      return;
    }

    const action =
      button.getAttribute(
        "data-action"
      );

    const id =
      button.getAttribute(
        "data-id"
      );

    try {
      const members =
        await loadMembersUnified();

      const member =
        members.find(
          (item) =>
            item.id === id
        );

      if (!member) {
        return;
      }

      // ------------------------
      // EDIT
      // ------------------------

      if (action === "edit") {
        openModal(
          "edit",
          member
        );

        return;
      }

      // ------------------------
      // DELETE
      // ------------------------

      if (
        action === "delete"
      ) {
        const confirmed =
          window.confirm(
            `Delete member "${member.name}"?`
          );

        if (!confirmed) {
          return;
        }

        if (
          RUNTIME.useBackend
        ) {
          await backendDeleteMember(
            id
          );

          await refreshMembersCache();
        } else {
          deleteMember(id);
        }

        await render();
      }
    } catch (error) {
      if (
        RUNTIME.useBackend &&
        error?.status === 401
      ) {
        setLoggedIn(false);

        setViewLoggedIn(
          false
        );
      }
    }
  }
);

// ============================================================
// Search / Filters
// ============================================================

el.searchInput.addEventListener(
  "input",
  render
);

el.statusFilter.addEventListener(
  "change",
  render
);

el.planFilter.addEventListener(
  "change",
  render
);

// ============================================================
// Escape Key
// ============================================================

document.addEventListener(
  "keydown",
  (event) => {
    if (
      event.key !== "Escape"
    ) {
      return;
    }

    if (
      !el.memberModal.hidden
    ) {
      closeModal();
    }
  }
);

// ============================================================
// Boot
// ============================================================

(async function boot() {
  // Default login values.
  el.username.value =
    "admin";

  // Default member values.
  el.joinDate.value =
    todayISODate();

  el.plan.value =
    "Monthly";

  el.expiryDate.value =
    calculateExpiryISO(
      el.joinDate.value,
      el.plan.value
    );

  // Dashboard actions are disabled
  // until login.
  el.addMemberBtn.disabled =
    true;

  el.exportCsvBtn.disabled =
    true;

  try {
    // Check whether an API backend
    // is available.
    await tryDetectBackend();

    if (
      RUNTIME.useBackend
    ) {
      const loggedIn =
        await backendIsLoggedIn();

      setLoggedIn(
        loggedIn
      );

      setViewLoggedIn(
        loggedIn
      );

      return;
    }

    // No backend:
    // use localStorage login.
    setViewLoggedIn(
      isLoggedIn()
    );
  } catch {
    setLoggedIn(false);

    setViewLoggedIn(
      false
    );
  }
})();