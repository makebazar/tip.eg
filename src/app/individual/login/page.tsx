"use client";

import React, { useState } from "react";
import styles from "./login.module.css";
import { loginIndividual } from "@/app/actions/auth";

export default function IndividualLoginPage() {
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const res = await loginIndividual(formData);

    if (res && res.error) {
      setError(res.error);
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.loginCard}>
        <h1 className={styles.title}>Individual Specialist Portal</h1>
        <p className={styles.subTitle}>Sign in to view tips, reviews, and withdraw balance</p>

        {error && <div className={styles.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Email Address</label>
            <input
              type="email"
              name="email"
              className={styles.input}
              placeholder="waiter1@kebab.com"
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Password</label>
            <input
              type="password"
              name="password"
              className={styles.input}
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" className={styles.loginBtn} disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className={styles.demoCreds}>
          <p style={{ fontWeight: 700, color: "#fff" }}>Demo Credentials:</p>
          <p>Email: <strong>waiter1@kebab.com</strong></p>
          <p>Password: <strong>waiter123</strong> (Amr Waiter)</p>
          <p style={{ marginTop: "8px" }}>Email: <strong>solo@baksheesh.com</strong></p>
          <p>Password: <strong>waiter123</strong> (Tarek B2C Driver)</p>
        </div>
      </div>
    </div>
  );
}
