
import React from "react";

export default function AppComponent({ onLogout }) {
  return (
    <>
      <div id="appShell" className="shell">
        <header className="topbar">
          <div className="topbar__left">
            <div className="brand brand--small">
              <div className="brand__mark" aria-hidden="true"></div>

              <div>
                <div className="brand__title">Prime Fitness</div>
                <div className="muted small">
                  Gym Membership Manager
                </div>
              </div>
            </div>
          </div>

          <div className="topbar__right">
            <button
              id="exportCsvBtn"
              className="btn btn--ghost"
              type="button"
            >
              Export CSV
            </button>

            <button
              id="logoutBtn"
              className="btn btn--ghost"
              type="button"
            >
              Logout
            </button>
          </div>
        </header>

        <main id="main" className="main" tabIndex="-1">
          <section className="grid">
            <article className="stat">
              <div className="stat__label">Total Members</div>
              <div id="statTotal" className="stat__value">0</div>
            </article>

            <article className="stat">
              <div className="stat__label">Active</div>
              <div id="statActive" className="stat__value">0</div>
            </article>

            <article className="stat">
              <div className="stat__label">Expired</div>
              <div id="statExpired" className="stat__value">0</div>
            </article>
          </section>

          <section className="panel">
            <div className="panel__head">
              <div className="panel__title">
                <h2 className="h2">Members</h2>
                <p className="muted">
                  Add, edit, search, filter and export.
                </p>
              </div>

              <div className="panel__actions">
                <button
                  id="addMemberBtn"
                  className="btn btn--primary"
                  type="button"
                >
                  Add Member
                </button>
              </div>
            </div>

            <div
              className="controls"
              role="region"
              aria-label="Search and filters"
            >
              <div className="controls__row">
                <div className="field">
                  <label className="label" htmlFor="searchInput">
                    Search
                  </label>

                  <input
                    id="searchInput"
                    className="input"
                    placeholder="Search by name or phone"
                    inputMode="search"
                    autoComplete="off"
                  />
                </div>

                <div className="field">
                  <label className="label" htmlFor="statusFilter">
                    Status
                  </label>

                  <select id="statusFilter" className="select">
                    <option value="all">All</option>
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>

                <div className="field">
                  <label className="label" htmlFor="planFilter">
                    Plan
                  </label>

                  <select id="planFilter" className="select">
                    <option value="all">All</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Yearly">Yearly</option>
                  </select>
                </div>
              </div>
            </div>

            <div
              className="tableWrap"
              role="region"
              aria-label="Members table"
            >
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>Plan</th>
                    <th>Join</th>
                    <th>Expiry</th>
                    <th>Status</th>
                    <th className="thActions">Actions</th>
                  </tr>
                </thead>

                <tbody id="membersTbody"></tbody>
              </table>
            </div>

            <div className="panel__foot">
              <div id="resultCount" className="muted small">
                0 results
              </div>

              <div className="muted small">
                Tip: Expiry is auto-calculated from join date + plan.
              </div>
            </div>
          </section>
        </main>
      </div>

      <div id="modalBackdrop" className="backdrop" hidden></div>

      <section
        id="memberModal"
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modalTitle"
        hidden
      >
        <header className="modal__head">
          <h3 id="modalTitle" className="h3">
            Add Member
          </h3>

          <button
            id="closeModalBtn"
            className="btn btn--ghost"
            type="button"
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        <form id="memberForm" className="form" noValidate>
          <input
            id="memberId"
            name="memberId"
            type="hidden"
          />

          <div className="formGrid">
            <div className="form__row">
              <label className="label" htmlFor="name">
                Name *
              </label>

              <input
                id="name"
                name="name"
                className="input"
                required
              />

              <p
                className="fieldError"
                data-for="name"
                aria-live="polite"
              ></p>
            </div>

            <div className="form__row">
              <label className="label" htmlFor="phone">
                Phone *
              </label>

              <input
                id="phone"
                name="phone"
                className="input"
                inputMode="tel"
                required
              />

              <p
                className="fieldError"
                data-for="phone"
                aria-live="polite"
              ></p>
            </div>

            <div className="form__row">
              <label className="label" htmlFor="email">
                Email
              </label>

              <input
                id="email"
                name="email"
                className="input"
                type="email"
                autoComplete="email"
              />

              <p
                className="fieldError"
                data-for="email"
                aria-live="polite"
              ></p>
            </div>

            <div className="form__row">
              <label className="label" htmlFor="plan">
                Membership Plan *
              </label>

              <select
                id="plan"
                name="plan"
                className="select"
                required
              >
                <option value="">Select plan</option>
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Yearly">Yearly</option>
              </select>

              <p
                className="fieldError"
                data-for="plan"
                aria-live="polite"
              ></p>
            </div>

            <div className="form__row">
              <label className="label" htmlFor="joinDate">
                Join Date *
              </label>

              <input
                id="joinDate"
                name="joinDate"
                className="input"
                type="date"
                required
              />

              <p
                className="fieldError"
                data-for="joinDate"
                aria-live="polite"
              ></p>
            </div>

            <div className="form__row">
              <label className="label" htmlFor="expiryDate">
                Expiry Date
              </label>

              <input
                id="expiryDate"
                name="expiryDate"
                className="input"
                type="date"
                disabled
              />

              <p className="hint">Auto-calculated</p>
            </div>
          </div>

          <div className="form__actions form__actions--end">
            <button
              id="saveMemberBtn"
              className="btn btn--primary"
              type="submit"
            >
              Save
            </button>

            <button
              id="cancelModalBtn"
              className="btn"
              type="button"
            >
              Cancel
            </button>
          </div>

          <p
            id="formError"
            className="error"
            role="alert"
            aria-live="polite"
          ></p>
        </form>
      </section>
    </>
  );
}