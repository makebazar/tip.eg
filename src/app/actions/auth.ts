"use server";

import db from "@/lib/db";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SystemRole } from "@/lib/roles";

export async function loginIndividual(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Please enter both email and password" };
  }

  // Find user with STAFF role
  const user = db.prepare("SELECT * FROM users WHERE email = ? AND role_id = ?").get(email, SystemRole.STAFF) as any;

  if (!user || user.password_hash !== password) {
    return { error: "Invalid email or password" };
  }

  // Get their individual profile id
  const profile = db.prepare("SELECT id FROM individual_profiles WHERE user_id = ?").get(user.id) as any;

  if (!profile) {
    return { error: "Individual profile not set up" };
  }

  // Set cookie
  const cookieStore = await cookies();
  cookieStore.set("individual_id", profile.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7, // 1 week
    path: "/"
  });

  redirect("/individual/hub");
}

export async function logoutIndividual() {
  const cookieStore = await cookies();
  cookieStore.delete("individual_id");
  redirect("/individual/login");
}

export async function loginBusiness(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Please enter both email and password" };
  }

  // Find user with BUSINESS_MANAGER role
  const user = db.prepare("SELECT * FROM users WHERE email = ? AND role_id = ?").get(email, SystemRole.BUSINESS_MANAGER) as any;

  if (!user || user.password_hash !== password) {
    return { error: "Invalid email or password" };
  }

  // Set business_user_id cookie for manager session
  const cookieStore = await cookies();
  cookieStore.set("business_user_id", user.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
    path: "/"
  });

  // Find accessible businesses from user_businesses table or legacy user.business_id
  let userBizRows = db.prepare(`
    SELECT business_id FROM user_businesses WHERE user_id = ?
  `).all(user.id) as { business_id: string }[];

  if (userBizRows.length === 0 && user.business_id) {
    // Insert legacy link into user_businesses if missing
    db.prepare(`
      INSERT OR IGNORE INTO user_businesses (id, user_id, business_id, role)
      VALUES (?, ?, ?, 'OWNER')
    `).run(`ub-${user.id}-${user.business_id}`, user.id, user.business_id);

    userBizRows = [{ business_id: user.business_id }];
  }

  if (userBizRows.length === 1) {
    // Exactly 1 location -> set active business_id and go straight to dashboard
    cookieStore.set("business_id", userBizRows[0].business_id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
      path: "/"
    });
    redirect("/business/dashboard");
  } else {
    // 0 or >1 locations -> go to locations hub
    redirect("/business/locations");
  }
}

export async function logoutBusiness() {
  const cookieStore = await cookies();
  cookieStore.delete("business_id");
  cookieStore.delete("business_user_id");
  redirect("/business/login");
}

export async function loginAdmin(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Please enter both email and password" };
  }

  // Find user with SUPER_ADMIN role
  const user = db.prepare("SELECT * FROM users WHERE email = ? AND role_id = ?").get(email, SystemRole.SUPER_ADMIN) as any;

  if (!user || user.password_hash !== password) {
    return { error: "Invalid email or password" };
  }

  // Set cookie
  const cookieStore = await cookies();
  cookieStore.set("admin_session", "super-admin", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
    path: "/"
  });

  redirect("/admin/dashboard");
}

export async function logoutAdmin() {
  const cookieStore = await cookies();
  cookieStore.delete("admin_session");
  redirect("/admin/login");
}
