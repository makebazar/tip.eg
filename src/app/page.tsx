import React from "react";
import { ArrowRight, Smartphone, Wallet, Building, Shield, Sparkles } from "lucide-react";
import styles from "./page.module.css";

export default function HomePage() {
  return (
    <div className={styles.wrapper}>
      {/* Hero section */}
      <header className={styles.hero}>
        <h1 className={styles.title}>Baksheesh Pay</h1>
        <p className={styles.desc}>
          Premium digital tipping and bill payment platform for Egypt. Designed for international tourists, local service workers, and restaurants.
        </p>
      </header>

      {/* Main Portals Grid */}
      <div className={styles.grid}>
        {/* Specialist Portal */}
        <div className={styles.portalCard}>
          <div>
            <div className={styles.cardIcon}>
              <Smartphone size={32} />
            </div>
            <h2 className={styles.cardTitle}>Specialist Portal</h2>
            <p className={styles.cardDesc}>
              Log in to view tips, feedback, and request instant automated withdrawals to Vodafone Cash or InstaPay.
            </p>
          </div>
          <a href="/individual/login" className={styles.link}>
            Enter Specialist Portal <ArrowRight size={16} />
          </a>
        </div>

        {/* Business Portal */}
        <div className={styles.portalCard}>
          <div>
            <div className={styles.cardIcon}>
              <Building size={32} />
            </div>
            <h2 className={styles.cardTitle}>Business B2B</h2>
            <p className={styles.cardDesc}>
              For managers. Set up tipping split rules, manage staff lists, view customer feedback, and generate bills.
            </p>
          </div>
          <a href="/business/login" className={styles.link}>
            Enter Manager Portal <ArrowRight size={16} />
          </a>
        </div>

        {/* Super Admin */}
        <div className={styles.portalCard}>
          <div>
            <div className={styles.cardIcon}>
              <Shield size={32} />
            </div>
            <h2 className={styles.cardTitle}>Super Admin</h2>
            <p className={styles.cardDesc}>
              For platform owners. Monitor global financial volume, review commission earnings, check payout logs, and adjust settings.
            </p>
          </div>
          <a href="/admin/login" className={styles.link}>
            Enter Admin Portal <ArrowRight size={16} />
          </a>
        </div>

        {/* Guest Demo */}
        <div className={styles.portalCard}>
          <div>
            <div className={styles.cardIcon}>
              <Sparkles size={32} style={{ color: "var(--accent)" }} />
            </div>
            <h2 className={styles.cardTitle}>Guest Checkout</h2>
            <p className={styles.cardDesc}>
              Simulate the customer tipping and bill payment flow by scanning a waiter badge or table QR code.
            </p>
          </div>
          <span style={{ color: "var(--accent)", fontSize: "0.85rem", fontWeight: 700 }}>
            Use the seeded demo links below
          </span>
        </div>
      </div>

      {/* Seeded Demo Links */}
      <div className={styles.demoLinks}>
        <h3 className={styles.demoTitle}>
          <Sparkles size={16} style={{ color: "var(--primary)" }} /> Active Demo Checkout Links
        </h3>
        <div className={styles.demoGrid}>
          <div className={styles.demoRow}>
            <div>
              <strong>Kebab El Dahab — Table 4</strong>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 2 }}>
                Waiter: Amr Waiter • Mode: Individual Tips • Bill Amount: 1,350 EGP
              </p>
            </div>
            <a href="/t/kb4" className={styles.demoBtn}>
              Scan Table QR
            </a>
          </div>

          <div className={styles.demoRow}>
            <div>
              <strong>Pyramids View Cafe — Table 12</strong>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 2 }}>
                Waiter: Sherif Waiter • Mode: Equal Split Pot • Bill Amount: 1,050 EGP
              </p>
            </div>
            <a href="/t/py12" className={styles.demoBtn}>
              Scan Table QR
            </a>
          </div>

          <div className={styles.demoRow}>
            <div>
              <strong>Tarek Driver (Solo B2C)</strong>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 2 }}>
                Direct Tipping Profile (No active bill)
              </p>
            </div>
            <a href="/p/tar5" className={styles.demoBtn}>
              Scan Driver QR
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
