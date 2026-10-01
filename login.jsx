
import React, { useState } from "react";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!username || !password) {
      setError("Please enter username and password.");
      return;
    }

    if (username === "admin" && password === "admin123") {
      localStorage.setItem("primeFitness:session", "1");
      onLogin();
      return;
    }

    setError("Invalid credentials.");
  }

  return (
    <section
      id="loginView"
      className="view view--center"
      aria-labelledby="loginTitle"
    >
      <div className="card card--login">
        <header className="card__header">
          <div className="brand">
            <div
              className="brand__mark"
              aria-hidden="true"
            ></div>

            <div>
              <h1 id="loginTitle" className="brand__title">
                Prime Fitness
              </h1>

              <p className="muted">Admin login</p>
            </div>
          </div>
        </header>

        <form
          id="loginForm"
          className="form"
          noValidate
          onSubmit={handleSubmit}
        >
          <div className="form__row">
            <label className="label" htmlFor="username">
              Username
            </label>

            <input
              id="username"
              name="username"
              className="input"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />

            <p className="hint">
              Default: <span className="kbd">admin</span>
            </p>
          </div>

          <div className="form__row">
            <label className="label" htmlFor="password">
              Password
            </label>

            <input
              id="password"
              name="password"
              className="input"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <p className="hint">
              Default: <span className="kbd">admin123</span>
            </p>
          </div>

          <div className="form__actions">
            <button
              className="btn btn--primary"
              type="submit"
            >
              Login
            </button>
          </div>

          <p
            id="loginError"
            className="error"
            role="alert"
            aria-live="polite"
          >
            {error}
          </p>
        </form>
      </div>
    </section>
  );
}
