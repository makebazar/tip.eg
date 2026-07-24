"use server";

import db from "@/lib/db";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SystemRole } from "@/lib/roles";

export async function loginIndividual(formData: FormData) {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = (formData.get("password") as string)?.trim();

  if (!email || !password) {
    return { error: "Please enter both email and password" };
  }

  const user = await db.get<any>("SELECT * FROM users WHERE email = ? AND role_id = ?", [email, SystemRole.STAFF]);

  if (!user || user.password_hash !== password) {
    return { error: "Invalid email or password" };
  }

  const profile = await db.get<any>("SELECT id FROM individual_profiles WHERE user_id = ?", [user.id]);

  if (!profile) {
    return { error: "Individual profile not set up" };
  }

  const cookieStore = await cookies();
  cookieStore.set("individual_id", profile.id, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7,
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
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = (formData.get("password") as string)?.trim();

  if (!email || !password) {
    return { error: "Please enter both email and password" };
  }

  const user = await db.get<any>("SELECT * FROM users WHERE email = ? AND role_id = ?", [email, SystemRole.BUSINESS_MANAGER]);

  if (!user || user.password_hash !== password) {
    return { error: "Invalid email or password" };
  }

  const cookieStore = await cookies();
  cookieStore.set("business_user_id", user.id, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7,
    path: "/"
  });

  let userBizRows = await db.all<{ business_id: string }>(`
    SELECT business_id FROM user_businesses WHERE user_id = ?
  `, [user.id]);

  if (userBizRows.length === 0 && user.business_id) {
    await db.run(`
      INSERT INTO user_businesses (id, user_id, business_id, role)
      VALUES (?, ?, ?, 'OWNER') ON CONFLICT DO NOTHING
    `, [`ub-${user.id}-${user.business_id}`, user.id, user.business_id]);

    userBizRows = [{ business_id: user.business_id }];
  }

  if (userBizRows.length === 1) {
    cookieStore.set("business_id", userBizRows[0].business_id, {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 7,
      path: "/"
    });
    redirect("/business/dashboard");
  } else {
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
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = (formData.get("password") as string)?.trim();

  if (!email || !password) {
    return { error: "Please enter both email and password" };
  }

  const user = await db.get<any>("SELECT * FROM users WHERE email = ? AND role_id = ?", [email, SystemRole.SUPER_ADMIN]);

  if (!user || user.password_hash !== password) {
    return { error: "Invalid email or password" };
  }

  const cookieStore = await cookies();
  cookieStore.set("admin_session", "super-admin", {
    httpOnly: true,
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
