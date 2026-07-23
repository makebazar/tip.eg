"use client";

import React, { useState } from "react";
import styles from "@/app/individual/login/login.module.css";
import { loginAdmin } from "@/app/actions/auth";

export default function AdminLoginPage() {
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const res = await loginAdmin(formData);

    if (res && res.error) {
      setError(res.error);
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.loginCard}>
        <h1 className={styles.title}>Super Admin Portal</h1>
        <p className={styles.subTitle}>Sign in to access platform finances and settings</p>

        {error && <div className={styles.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Admin Email</label>
            <input
              type="email"
              name="email"
              className={styles.input}
              placeholder="admin@baksheesh.com"
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
          <p>Email: <strong>admin@baksheesh.com</strong></p>
          <p>Password: <strong>admin123</strong> (Super Admin)</p>
        </div>
      </div>
    </div>
  );
}
