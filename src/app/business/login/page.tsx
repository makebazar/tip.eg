"use client";

import React, { useState } from "react";
import styles from "@/app/individual/login/login.module.css";
import { loginBusiness } from "@/app/actions/auth";

export default function BusinessLoginPage() {
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const res = await loginBusiness(formData);

    if (res && res.error) {
      setError(res.error);
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.loginCard}>
        <h1 className={styles.title}>Business Dashboard Portal</h1>
        <p className={styles.subTitle}>Sign in to manage staff, bills, and tipping settings</p>

        {error && <div className={styles.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Manager Email</label>
            <input
              type="email"
              name="email"
              className={styles.input}
              placeholder="manager1@kebab.com"
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
          <p>Email: <strong>manager1@kebab.com</strong></p>
          <p>Password: <strong>manager123</strong> (Hassan @ Kebab El Dahab)</p>
        </div>
      </div>
    </div>
  );
}
