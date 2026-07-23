import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// Ensure the db file is stored in a persistent place in the workspace
const dbPath = path.resolve(process.cwd(), "local.db");

const db = new Database(dbPath);

// Enable foreign keys
db.pragma("foreign_keys = ON");

// Run Migrations if old schema exists
const oldTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='restaurants'").get();
if (oldTableExists) {
  console.log("Migration needed: renaming restaurants and waiter tables to generic business/individual structures...");
  try {
    db.transaction(() => {
      // 1. Rename and modify restaurants -> businesses
      db.exec("ALTER TABLE restaurants RENAME TO businesses;");
      db.exec("ALTER TABLE businesses RENAME COLUMN waiter_percentage TO individual_percentage;");
      db.exec("ALTER TABLE businesses ADD COLUMN business_type TEXT DEFAULT 'RESTAURANT';");

      // 2. Rename and modify waiter_profiles -> individual_profiles
      db.exec("ALTER TABLE waiter_profiles RENAME TO individual_profiles;");
      db.exec("ALTER TABLE individual_profiles RENAME COLUMN restaurant_id TO business_id;");
      db.exec("ALTER TABLE individual_profiles ADD COLUMN role TEXT DEFAULT 'WAITER';");
      db.exec("UPDATE individual_profiles SET role = 'DRIVER' WHERE id = 'waiter-tarek';");

      // 3. Rename and modify tables -> spots
      db.exec("ALTER TABLE tables RENAME TO spots;");
      db.exec("ALTER TABLE spots RENAME COLUMN restaurant_id TO business_id;");

      // 4. Update bills columns
      db.exec("ALTER TABLE bills RENAME COLUMN table_id TO spot_id;");
      db.exec("ALTER TABLE bills RENAME COLUMN restaurant_id TO business_id;");
      db.exec("ALTER TABLE bills RENAME COLUMN waiter_id TO individual_id;");

      // 5. Update transactions columns
      db.exec("ALTER TABLE transactions RENAME COLUMN waiter_id TO individual_id;");

      // 6. Update tip_splits columns
      db.exec("ALTER TABLE tip_splits RENAME COLUMN waiter_id TO individual_id;");

      // 7. Update payout_requests columns
      db.exec("ALTER TABLE payout_requests RENAME COLUMN waiter_id TO individual_id;");
      db.exec("ALTER TABLE payout_requests RENAME COLUMN restaurant_id TO business_id;");

      // 8. Update users columns
      db.exec("ALTER TABLE users RENAME COLUMN restaurant_id TO business_id;");
    })();
    console.log("Migration completed successfully.");
  } catch (e) {
    console.error("Migration failed or was already partially applied:", e);
  }
}

// Ensure assigned_individual_id column exists in spots table
try {
  const spotsInfo = db.pragma("table_info(spots)") as any[];
  if (spotsInfo && spotsInfo.length > 0) {
    const columnExists = spotsInfo.some(col => col.name === 'assigned_individual_id');
    if (!columnExists) {
      db.exec("ALTER TABLE spots ADD COLUMN assigned_individual_id TEXT;");
      console.log("Database update: added assigned_individual_id column to spots table.");
    }
  }
} catch (err) {
  console.error("Failed to run spots table info pragma / column check:", err);
}

// Create business_members table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS business_members (
    id              TEXT PRIMARY KEY,
    business_id     TEXT NOT NULL,
    individual_id   TEXT NOT NULL,
    role            TEXT NOT NULL DEFAULT 'WAITER',
    status          TEXT NOT NULL DEFAULT 'ACTIVE',
    joined_at       TEXT DEFAULT (datetime('now')),
    UNIQUE(business_id, individual_id),
    FOREIGN KEY(business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    FOREIGN KEY(individual_id) REFERENCES individual_profiles(id) ON DELETE CASCADE
  );
`);

// Migrate existing individual_profiles.business_id into business_members
try {
  const membersCount = db.prepare("SELECT COUNT(*) as c FROM business_members").get() as { c: number };
  if (membersCount.c === 0) {
    const linked = db.prepare(`
      SELECT id, business_id, role FROM individual_profiles
      WHERE business_id IS NOT NULL
    `).all() as { id: string; business_id: string; role: string }[];

    if (linked.length > 0) {
      const insert = db.prepare(`
        INSERT OR IGNORE INTO business_members (id, business_id, individual_id, role, status)
        VALUES (?, ?, ?, ?, 'ACTIVE')
      `);
      db.transaction(() => {
        for (const row of linked) {
          insert.run(`bm-${row.business_id}-${row.id}`, row.business_id, row.id, row.role);
        }
      })();
      console.log(`Migrated ${linked.length} existing staff members into business_members.`);
    }
  }
} catch (err) {
  console.error("business_members migration error:", err);
}

// Create user_businesses junction table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS user_businesses (
    id            TEXT PRIMARY KEY,
    user_id       TEXT NOT NULL,
    business_id   TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'OWNER',
    created_at    TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, business_id),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(business_id) REFERENCES businesses(id) ON DELETE CASCADE
  );
`);

// Create business_invites table for manager and staff invitation links
db.exec(`
  CREATE TABLE IF NOT EXISTS business_invites (
    id           TEXT PRIMARY KEY,
    business_id  TEXT NOT NULL,
    role         TEXT NOT NULL DEFAULT 'MANAGER',
    token        TEXT UNIQUE NOT NULL,
    created_at   TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(business_id) REFERENCES businesses(id) ON DELETE CASCADE
  );
`);

// Ensure payout_method, payout_detail, and owner_id columns exist in businesses table
try {
  const bizInfo = db.pragma("table_info(businesses)") as any[];
  if (bizInfo && bizInfo.length > 0) {
    const hasPayoutMethod = bizInfo.some(col => col.name === 'payout_method');
    if (!hasPayoutMethod) {
      db.exec("ALTER TABLE businesses ADD COLUMN payout_method TEXT;");
    }
    const hasPayoutDetail = bizInfo.some(col => col.name === 'payout_detail');
    if (!hasPayoutDetail) {
      db.exec("ALTER TABLE businesses ADD COLUMN payout_detail TEXT;");
    }
    const hasOwnerId = bizInfo.some(col => col.name === 'owner_id');
    if (!hasOwnerId) {
      db.exec("ALTER TABLE businesses ADD COLUMN owner_id TEXT;");
    }
    const hasQrScans = bizInfo.some(col => col.name === 'qr_scans_count');
    if (!hasQrScans) {
      db.exec("ALTER TABLE businesses ADD COLUMN qr_scans_count INTEGER DEFAULT 0;");
    }
  }
} catch (err) {
  console.error("Failed to check or alter businesses table columns:", err);
}

// Migrate existing users.business_id into user_businesses
try {
  const usersWithBiz = db.prepare(`
    SELECT id, business_id FROM users
    WHERE business_id IS NOT NULL AND role_id = 2
  `).all() as { id: string; business_id: string }[];

  if (usersWithBiz.length > 0) {
    const insertUb = db.prepare(`
      INSERT OR IGNORE INTO user_businesses (id, user_id, business_id, role)
      VALUES (?, ?, ?, 'OWNER')
    `);
    const updateBizOwner = db.prepare(`
      UPDATE businesses SET owner_id = ? WHERE id = ? AND owner_id IS NULL
    `);
    db.transaction(() => {
      for (const u of usersWithBiz) {
        insertUb.run(`ub-${u.id}-${u.business_id}`, u.id, u.business_id);
        updateBizOwner.run(u.id, u.business_id);
      }
    })();
  }
} catch (err) {
  console.error("user_businesses migration error:", err);
}

// Initialize New Generalized Schema if tables don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS businesses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_ar TEXT,
    logo_url TEXT,
    cover_url TEXT,
    currency TEXT DEFAULT 'EGP',
    tip_distribution_mode TEXT DEFAULT 'INDIVIDUAL', -- 'INDIVIDUAL', 'EQUAL_SPLIT'
    individual_percentage REAL DEFAULT 100.0,
    balance REAL DEFAULT 0.0,
    address TEXT,
    city TEXT,
    business_type TEXT DEFAULT 'RESTAURANT', -- 'RESTAURANT', 'HOTEL', 'SALON', 'DELIVERY', 'CAR_WASH', 'OTHER'
    usd_rate REAL DEFAULT 50.0,
    eur_rate REAL DEFAULT 55.0,
    payout_method TEXT,
    payout_detail TEXT,
    owner_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );


  CREATE TABLE IF NOT EXISTS users (

    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_ar TEXT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role_id INTEGER NOT NULL, -- 1: SUPER_ADMIN, 2: BUSINESS_MANAGER, 3: STAFF
    business_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(business_id) REFERENCES businesses(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS individual_profiles (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL,
    business_id TEXT,
    role TEXT DEFAULT 'WAITER', -- 'WAITER', 'BARBER', 'COURIER', 'HOUSEKEEPER', 'VALET', 'DRIVER', 'OTHER'
    avatar_url TEXT,
    qr_code_url TEXT,
    payout_method TEXT, -- 'VODAFONE_CASH', 'INSTAPAY', 'BANK_TRANSFER'
    payout_detail TEXT,
    balance REAL DEFAULT 0.0,
    rating REAL DEFAULT 5.0,
    saving_goal TEXT,
    saving_goal_ar TEXT,
    short_code TEXT UNIQUE NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(business_id) REFERENCES businesses(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS spots (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    number INTEGER NOT NULL,
    label TEXT NOT NULL,
    short_code TEXT UNIQUE NOT NULL,
    assigned_individual_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(business_id, number),
    FOREIGN KEY(business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    FOREIGN KEY(assigned_individual_id) REFERENCES individual_profiles(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS bills (
    id TEXT PRIMARY KEY,
    table_number TEXT NOT NULL, -- table number label
    spot_id TEXT,
    business_id TEXT NOT NULL,
    individual_id TEXT,
    amount REAL NOT NULL,
    status TEXT DEFAULT 'UNPAID',
    items TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(spot_id) REFERENCES spots(id) ON DELETE SET NULL,
    FOREIGN KEY(business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    FOREIGN KEY(individual_id) REFERENCES individual_profiles(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    bill_id TEXT UNIQUE,
    individual_id TEXT,
    amount_bill REAL DEFAULT 0.0,
    amount_tip REAL DEFAULT 0.0,
    currency TEXT DEFAULT 'EGP',
    payment_status TEXT DEFAULT 'PENDING',
    payment_intent_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(bill_id) REFERENCES bills(id) ON DELETE SET NULL,
    FOREIGN KEY(individual_id) REFERENCES individual_profiles(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS tip_splits (
    id TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL,
    individual_id TEXT,
    amount REAL NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    FOREIGN KEY(individual_id) REFERENCES individual_profiles(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS feedback (
    id TEXT PRIMARY KEY,
    transaction_id TEXT UNIQUE NOT NULL,
    rating_stars INTEGER NOT NULL,
    comments TEXT,
    tags TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS menu_categories (
    id           TEXT PRIMARY KEY,
    business_id  TEXT NOT NULL,
    name         TEXT NOT NULL,
    name_ar      TEXT,
    translations_json TEXT,
    sort_order   INTEGER DEFAULT 0,
    created_at   TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(business_id) REFERENCES businesses(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS menu_items (
    id           TEXT PRIMARY KEY,
    business_id  TEXT NOT NULL,
    category_id  TEXT,
    name         TEXT NOT NULL,
    name_ar      TEXT,
    description  TEXT,
    price        REAL NOT NULL,
    price_tourist REAL,
    image_url    TEXT,
    is_available INTEGER DEFAULT 1,
    weight_volume TEXT,
    ingredients TEXT,
    spiciness INTEGER DEFAULT 0,
    dietary_tags TEXT,
    calories INTEGER,
    translations_json TEXT,
    created_at   TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    FOREIGN KEY(category_id) REFERENCES menu_categories(id) ON DELETE SET NULL
  );
  CREATE TABLE IF NOT EXISTS promotions (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    type TEXT NOT NULL, -- 'BANNER', 'ITEM_DISCOUNT', 'COMBO'
    title TEXT NOT NULL,
    title_ar TEXT,
    description TEXT,
    description_ar TEXT,
    image_url TEXT,
    item_id TEXT, 
    discount_price REAL,
    active_from TEXT,
    active_to TEXT,
    status TEXT DEFAULT 'ACTIVE', -- 'ACTIVE', 'INACTIVE'
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    FOREIGN KEY(item_id) REFERENCES menu_items(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS payout_requests (
    id TEXT PRIMARY KEY,
    individual_id TEXT,
    business_id TEXT,
    amount REAL NOT NULL,
    payout_method TEXT NOT NULL,
    destination_detail TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING',
    error_message TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(individual_id) REFERENCES individual_profiles(id) ON DELETE SET NULL,
    FOREIGN KEY(business_id) REFERENCES businesses(id) ON DELETE SET NULL
  );
`);

try {
  db.exec("ALTER TABLE businesses ADD COLUMN city TEXT");
} catch {}
try {
  db.exec("ALTER TABLE businesses ADD COLUMN usd_rate REAL DEFAULT 50.0");
} catch {}
try {
  db.exec("ALTER TABLE businesses ADD COLUMN eur_rate REAL DEFAULT 55.0");
} catch {}

try { db.exec("ALTER TABLE menu_items ADD COLUMN weight_volume TEXT"); } catch {}
try { db.exec("ALTER TABLE menu_items ADD COLUMN ingredients TEXT"); } catch {}
try { db.exec("ALTER TABLE menu_items ADD COLUMN spiciness INTEGER DEFAULT 0"); } catch {}
try { db.exec("ALTER TABLE menu_items ADD COLUMN dietary_tags TEXT"); } catch {}
try { db.exec("ALTER TABLE menu_items ADD COLUMN calories INTEGER"); } catch {}

try { db.exec("ALTER TABLE promotions ADD COLUMN active_from TEXT"); } catch {}
try { db.exec("ALTER TABLE promotions ADD COLUMN active_to TEXT"); } catch {}
try { db.exec("ALTER TABLE promotions ADD COLUMN title_ar TEXT"); } catch {}
try { db.exec("ALTER TABLE promotions ADD COLUMN description_ar TEXT"); } catch {}



// Self-Seeding

const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };

if (userCount.count === 0) {
  console.log("Database empty. Seeding mock data...");

  // 1. Seed Businesses
  const rest1Id = "rest-kebab";
  const rest2Id = "rest-pyramids";

  db.prepare(`
    INSERT INTO businesses (id, name, logo_url, address, currency, tip_distribution_mode, individual_percentage, balance, business_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(rest1Id, "Kebab El Dahab", "https://images.unsplash.com/photo-1544025162-d76694265947?w=120&auto=format&fit=crop&q=60", "Khan El Khalili, Cairo", "EGP", "INDIVIDUAL", 100.0, 15400.0, "RESTAURANT");

  db.prepare(`
    INSERT INTO businesses (id, name, logo_url, address, currency, tip_distribution_mode, individual_percentage, balance, business_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(rest2Id, "Pyramids View Cafe", "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=120&auto=format&fit=crop&q=60", "Giza Plateau, Giza", "EGP", "EQUAL_SPLIT", 100.0, 8900.0, "RESTAURANT");

  // Seed Spots
  const seedSpot = (id: string, bizId: string, num: number, label: string, code: string) => {
    db.prepare(`
      INSERT INTO spots (id, business_id, number, label, short_code)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, bizId, num, label, code);
  };

  // Kebab tables
  seedSpot("table-kebab-1", rest1Id, 1, "Table 1", "kb1");
  seedSpot("table-kebab-2", rest1Id, 2, "Table 2", "kb2");
  seedSpot("table-kebab-3", rest1Id, 3, "Table 3", "kb3");
  seedSpot("table-kebab-4", rest1Id, 4, "Table 4", "kb4");
  seedSpot("table-kebab-5", rest1Id, 5, "Table 5", "kb5");

  // Pyramids tables
  seedSpot("table-pyramids-11", rest2Id, 11, "Table 11", "py11");
  seedSpot("table-pyramids-12", rest2Id, 12, "Table 12", "py12");

  // 2. Seed Users & Individual Profiles
  const seedUser = (id: string, name: string, nameAr: string | null, email: string, pass: string, role_id: number, bizId: string | null) => {
    db.prepare(`
      INSERT INTO users (id, name, name_ar, email, password_hash, role_id, business_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, nameAr, email, pass, role_id, bizId);
  };

  const seedIndividualProfile = (
    id: string,
    userId: string,
    bizId: string | null,
    role: string,
    avatar: string,
    payoutMethod: string,
    payoutDetail: string,
    balance: number,
    rating: number,
    savingGoal: string | null,
    savingGoalAr: string | null,
    code: string
  ) => {
    db.prepare(`
      INSERT INTO individual_profiles (id, user_id, business_id, role, avatar_url, qr_code_url, payout_method, payout_detail, balance, rating, saving_goal, saving_goal_ar, short_code)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, bizId, role, avatar, `/qrs/${id}.png`, payoutMethod, payoutDetail, balance, rating, savingGoal, savingGoalAr, code);
  };

  // Super Admin
  seedUser("user-admin", "Super Admin", "مدير النظام", "admin@baksheesh.com", "admin123", 1, null);

  // Business Manager (Kebab)
  seedUser("user-manager-kebab", "Hassan Manager", "حسن المدير", "manager1@kebab.com", "manager123", 2, rest1Id);

  // Staff for Kebab El Dahab
  seedUser("user-waiter-amr", "Amr Waiter", "عمرو نادل", "waiter1@kebab.com", "waiter123", 3, rest1Id);
  seedIndividualProfile(
    "waiter-amr",
    "user-waiter-amr",
    rest1Id,
    "WAITER",
    "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80",
    "VODAFONE_CASH",
    "+201012345678",
    120.0,
    4.8,
    "new laptop for university studies",
    "كمبيوتر محمول جديد للدراسة الجامعية",
    "amr1"
  );

  seedUser("user-waiter-mostafa", "Mostafa Waiter", "مصطفى نادل", "waiter2@kebab.com", "waiter123", 3, rest1Id);
  seedIndividualProfile(
    "waiter-mostafa",
    "user-waiter-mostafa",
    rest1Id,
    "WAITER",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    "INSTAPAY",
    "mostafa@instapay",
    45.0,
    4.5,
    "medical treatment for my mother",
    "علاج طبي لوالدتي",
    "mos2"
  );

  // Bartender & Kitchen profiles for Kebab El Dahab
  seedUser("user-bartender-kebab", "Bar Team", "فريق البار", "bartender@kebab.com", "waiter123", 3, rest1Id);
  seedIndividualProfile(
    "bartender-rest-kebab",
    "user-bartender-kebab",
    rest1Id,
    "OTHER",
    "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=150&auto=format&fit=crop&q=80",
    "INSTAPAY",
    "bar@instapay",
    0.0,
    4.9,
    "New premium cocktail blender",
    "خلاط كوكتيل بريميوم جديد",
    "bar1"
  );

  seedUser("user-kitchen-kebab", "Kitchen Team", "فريق المطبخ", "kitchen@kebab.com", "waiter123", 3, rest1Id);
  seedIndividualProfile(
    "kitchen-rest-kebab",
    "user-kitchen-kebab",
    rest1Id,
    "OTHER",
    "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=150&auto=format&fit=crop&q=80",
    "BANK_TRANSFER",
    "EG9876543210987654321098765",
    0.0,
    5.0,
    "Professional Japanese chef knives",
    "سكاكين شيف يابانية احترافية",
    "kit1"
  );

  // Waiters for Pyramids View Cafe
  seedUser("user-waiter-sherif", "Sherif Waiter", "شريف نادل", "waiter3@pyramids.com", "waiter123", 3, rest2Id);
  seedIndividualProfile(
    "waiter-sherif",
    "user-waiter-sherif",
    rest2Id,
    "WAITER",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    "VODAFONE_CASH",
    "+201287654321",
    0.0,
    5.0,
    "funding my wedding in Giza",
    "تمويل زفافي في الجيزة",
    "she3"
  );

  seedUser("user-waiter-youssef", "Youssef Waiter", "يوسف نادل", "waiter4@pyramids.com", "waiter123", 3, rest2Id);
  seedIndividualProfile(
    "waiter-youssef",
    "user-waiter-youssef",
    rest2Id,
    "WAITER",
    "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80",
    "BANK_TRANSFER",
    "EG1234567890123456789012345",
    0.0,
    5.0,
    "helping my younger brother with school",
    "مساعدة أخي الأصغر في الدراسة",
    "you4"
  );

  // Solo Driver (Independent Specialist)
  seedUser("user-waiter-tarek", "Tarek Driver", "طارق سائق", "solo@baksheesh.com", "waiter123", 3, null);
  seedIndividualProfile(
    "waiter-tarek",
    "user-waiter-tarek",
    null,
    "DRIVER",
    "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80",
    "VODAFONE_CASH",
    "+201509988776",
    250.0,
    4.9,
    "fixing my taxi engine and tires",
    "إصلاح محرك وإطارات تاكسي الخاص بي",
    "tar5"
  );

  // 3. Seed active tables bills (Unpaid)
  // 2b. Seed business_members (link existing profiles to businesses)
  const insertMember = db.prepare(`
    INSERT OR IGNORE INTO business_members (id, business_id, individual_id, role, status)
    VALUES (?, ?, ?, ?, 'ACTIVE')
  `);
  db.transaction(() => {
    insertMember.run("bm-kebab-amr",     rest1Id, "waiter-amr",          "WAITER");
    insertMember.run("bm-kebab-mostafa", rest1Id, "waiter-mostafa",      "WAITER");
    insertMember.run("bm-kebab-bar",     rest1Id, "bartender-rest-kebab","OTHER");
    insertMember.run("bm-kebab-kitchen", rest1Id, "kitchen-rest-kebab",  "OTHER");
    insertMember.run("bm-pyra-sherif",   rest2Id, "waiter-sherif",       "WAITER");
    insertMember.run("bm-pyra-youssef",  rest2Id, "waiter-youssef",      "WAITER");
  })();

  const kebabBillItems = JSON.stringify([
    { name: "Mixed Grill (Kebab & Kofta)", price: 450, quantity: 2 },
    { name: "Hummus with Meat", price: 150, quantity: 1 },
    { name: "Fresh Mango Juice", price: 75, quantity: 4 }
  ]);
  db.prepare(`
    INSERT INTO bills (id, table_number, spot_id, business_id, individual_id, amount, status, items)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run("bill-kebab-1", "Table 4", "table-kebab-4", rest1Id, "waiter-amr", 1350.0, "UNPAID", kebabBillItems);

  const pyramidsBillItems = JSON.stringify([
    { name: "Egyptian Breakfast Combo", price: 200, quantity: 3 },
    { name: "Mint Tea Pot", price: 90, quantity: 1 },
    { name: "Shisha Double Apple", price: 180, quantity: 2 }
  ]);
  db.prepare(`
    INSERT INTO bills (id, table_number, spot_id, business_id, individual_id, amount, status, items)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run("bill-pyramids-1", "Table 12", "table-pyramids-12", rest2Id, "waiter-sherif", 1050.0, "UNPAID", pyramidsBillItems);

  // 4. Seed Menu Categories & Menu Items
  const seedCat = (id: string, bizId: string, name: string, nameAr: string, order: number) => {
    db.prepare(`
      INSERT OR IGNORE INTO menu_categories (id, business_id, name, name_ar, sort_order)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, bizId, name, nameAr, order);
  };

  const seedItem = (
    id: string,
    bizId: string,
    catId: string,
    name: string,
    price: number,
    avail = 1,
    weight?: string,
    ingredients?: string,
    spiciness = 0,
    dietaryTags?: string[],
    calories?: number,
    imageUrl?: string,
    description?: string
  ) => {
    const dietaryJson = dietaryTags && dietaryTags.length > 0 ? JSON.stringify(dietaryTags) : null;
    db.prepare(`
      INSERT OR REPLACE INTO menu_items (
        id, business_id, category_id, name, price, is_available,
        weight_volume, ingredients, spiciness, dietary_tags, calories, image_url, description
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, bizId, catId, name, price, avail,
      weight || null, ingredients || null, spiciness, dietaryJson, calories || null, imageUrl || null, description || null
    );
  };

  // Categories for Kebab
  seedCat("cat-kebab-mains", rest1Id, "Mains", "الرئيسية", 1);
  seedCat("cat-kebab-apps",  rest1Id, "Appetizers", "المقبلات", 2);
  seedCat("cat-kebab-drinks",rest1Id, "Drinks", "المشروبات", 3);
  seedCat("cat-kebab-desserts", rest1Id, "Desserts", "الحلويات", 4);

  // Rich Menu Items for Kebab El Dahab
  seedItem(
    "item-kebab-1", rest1Id, "cat-kebab-mains", "Kebab & Kofta Platter", 450, 1,
    "450g", "Grilled veal kebab, lamb kofta skewers, charcoal grilled tomatoes, pita, tahini", 1, ["Halal", "Chef Special"], 620,
    "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&auto=format&fit=crop&q=80",
    "A premium selection of grilled veal kebab pieces and seasoned ground lamb kofta skewers, served hot over flatbread."
  );
  seedItem(
    "item-kebab-2", rest1Id, "cat-kebab-apps", "Hummus with Sautéed Lamb", 160, 1,
    "250g", "Chickpea puree, tahini, virgin olive oil, pine nuts, seasoned sautéed lamb", 0, ["Halal", "Gluten-Free", "Contains Nuts"], 340,
    "https://images.unsplash.com/photo-1577968897966-3d4325b36b61?w=400&auto=format&fit=crop&q=80",
    "Velvety smooth chickpea puree blended with tahini and oil, topped with tender pieces of pan-fried marinated lamb."
  );
  seedItem(
    "item-kebab-3", rest1Id, "cat-kebab-drinks", "Fresh Mango Juice", 75, 1,
    "350ml", "Pure mango pulp, natural honey, crushed ice", 0, ["Vegan", "Gluten-Free"], 140,
    "https://images.unsplash.com/photo-1546173159-315724a31696?w=400&auto=format&fit=crop&q=80",
    "Freshly blended sweet local Egyptian mangoes, served chilled as a thick, refreshing beverage."
  );
  seedItem(
    "item-kebab-4", rest1Id, "cat-kebab-mains", "Royal Lamb Chops", 540, 0,
    "500g", "Charcoal grilled lamb chops, rosemary, garlic butter, grilled vegetables", 0, ["Halal", "Chef Special"], 580,
    "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&auto=format&fit=crop&q=80",
    "Three juicy pieces of premium local lamb chops marinated in herbs and garlic, flame-grilled to order."
  );
  seedItem(
    "item-kebab-5", rest1Id, "cat-kebab-mains", "Egyptian Hawawshi", 180, 1,
    "300g", "Minced spiced beef, crispy pita bread, onions, garlic, oriental spices, tahini dip", 1, ["Halal", "Chef Special"], 480,
    "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&auto=format&fit=crop&q=80",
    "Traditional Egyptian pita bread stuffed with seasoned minced beef, baked until golden brown and crispy."
  );
  seedItem(
    "item-kebab-6", rest1Id, "cat-kebab-drinks", "Fresh Mint Lemonade", 65, 1,
    "350ml", "Freshly squeezed lemons, garden mint leaves, crushed ice, sugar syrup", 0, ["Vegan", "Gluten-Free"], 120,
    "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400&auto=format&fit=crop&q=80",
    "Classic zesty lemonade mixed with fresh mint leaves and crushed ice for the perfect hot-day refresher."
  );
  seedItem(
    "item-kebab-7", rest1Id, "cat-kebab-desserts", "Pistachio Baklava Platter", 140, 1,
    "200g", "Crispy phyllo pastry, roasted pistachios, pure honey syrup, ghee", 0, ["Vegetarian", "Contains Nuts"], 420,
    "https://images.unsplash.com/photo-1519676867240-f03562e64548?w=400&auto=format&fit=crop&q=80",
    "Rich, sweet dessert pastry composed of layers of crispy phyllo dough filled with chopped pistachios and sweetened with syrup."
  );

  const seedPromotion = (
    id: string, businessId: string, type: string, title: string, titleAr: string,
    desc: string, descAr: string, imageUrl: string, itemId: string | null, discountPrice: number | null
  ) => {
    db.prepare(`
      INSERT OR IGNORE INTO promotions 
      (id, business_id, type, title, title_ar, description, description_ar, image_url, item_id, discount_price) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, businessId, type, title, titleAr, desc, descAr, imageUrl, itemId, discountPrice);
  };

  seedPromotion(
    "promo-kebab-1", rest1Id, "BANNER", 
    "Happy Hour: -20% Cocktails!", "ساعة سعيدة: -20% على الكوكتيلات",
    "Join us every day from 5 PM to 7 PM for amazing discounts.", "انضم إلينا كل يوم من 5 مساءً حتى 7 مساءً.",
    "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&auto=format&fit=crop&q=80",
    null, null
  );

  seedPromotion(
    "promo-kebab-2", rest1Id, "ITEM_DISCOUNT", 
    "Special: Hawawshi 150 EGP", "عرض خاص: حواوشي ١٥٠ جنيه",
    "Get our famous Egyptian Hawawshi at a discounted price today only!", "احصل على الحواوشي المصري الشهير بسعر مخفض اليوم فقط!",
    "https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80",
    "item-rest-kebab-5", 150
  );

  console.log("Database seeded successfully.");
}

// Auto-populate/update Kebab El Dahab menu items if missing or needs update
try {
  const kebabBiz = db.prepare("SELECT id FROM businesses WHERE name LIKE '%Kebab%' OR id LIKE '%kebab%' LIMIT 1").get() as { id: string } | undefined;
  if (kebabBiz) {
    const bizId = kebabBiz.id;

    // Ensure categories exist
    db.prepare("INSERT OR IGNORE INTO menu_categories (id, business_id, name, name_ar, sort_order) VALUES (?, ?, 'Mains', 'الرئيسية', 1)").run(`cat-${bizId}-mains`, bizId);
    db.prepare("INSERT OR IGNORE INTO menu_categories (id, business_id, name, name_ar, sort_order) VALUES (?, ?, 'Appetizers', 'المقبلات', 2)").run(`cat-${bizId}-apps`, bizId);
    db.prepare("INSERT OR IGNORE INTO menu_categories (id, business_id, name, name_ar, sort_order) VALUES (?, ?, 'Drinks', 'المشروبات', 3)").run(`cat-${bizId}-drinks`, bizId);
    db.prepare("INSERT OR IGNORE INTO menu_categories (id, business_id, name, name_ar, sort_order) VALUES (?, ?, 'Desserts', 'الحلويات', 4)").run(`cat-${bizId}-desserts`, bizId);

    const seedItemDirect = (
      id: string, catId: string, name: string, price: number, avail = 1,
      weight?: string, ingredients?: string, spiciness = 0, dietaryTags?: string[], calories?: number, imageUrl?: string,
      description?: string
    ) => {
      const dietaryJson = dietaryTags && dietaryTags.length > 0 ? JSON.stringify(dietaryTags) : null;
      db.prepare(`
        INSERT OR REPLACE INTO menu_items (
          id, business_id, category_id, name, price, is_available,
          weight_volume, ingredients, spiciness, dietary_tags, calories, image_url, description
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, bizId, catId, name, price, avail,
        weight || null, ingredients || null, spiciness, dietaryJson, calories || null, imageUrl || null, description || null
      );
    };

    seedItemDirect(
      `item-${bizId}-1`, `cat-${bizId}-mains`, "Kebab & Kofta Platter", 450, 1,
      "450g", "Grilled veal kebab, lamb kofta skewers, charcoal grilled tomatoes, pita, tahini", 1, ["Halal", "Chef Special"], 620,
      "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&auto=format&fit=crop&q=80",
      "A premium selection of grilled veal kebab pieces and seasoned ground lamb kofta skewers, served hot over flatbread."
    );
    seedItemDirect(
      `item-${bizId}-2`, `cat-${bizId}-apps`, "Hummus with Sautéed Lamb", 160, 1,
      "250g", "Chickpea puree, tahini, virgin olive oil, pine nuts, seasoned sautéed lamb", 0, ["Halal", "Gluten-Free", "Contains Nuts"], 340,
      "https://images.unsplash.com/photo-1577968897966-3d4325b36b61?w=400&auto=format&fit=crop&q=80",
      "Velvety smooth chickpea puree blended with tahini and oil, topped with tender pieces of pan-fried marinated lamb."
    );
    seedItemDirect(
      `item-${bizId}-3`, `cat-${bizId}-drinks`, "Fresh Mango Juice", 75, 1,
      "350ml", "Pure mango pulp, natural honey, crushed ice", 0, ["Vegan", "Gluten-Free"], 140,
      "https://images.unsplash.com/photo-1546173159-315724a31696?w=400&auto=format&fit=crop&q=80",
      "Freshly blended sweet local Egyptian mangoes, served chilled as a thick, refreshing beverage."
    );
    seedItemDirect(
      `item-${bizId}-4`, `cat-${bizId}-mains`, "Royal Lamb Chops", 540, 0,
      "500g", "Charcoal grilled lamb chops, rosemary, garlic butter, grilled vegetables", 0, ["Halal", "Chef Special"], 580,
      "https://images.unsplash.com/photo-1544025162-d76694265947.jpg?w=400&auto=format&fit=crop&q=80",
      "Three juicy pieces of premium local lamb chops marinated in herbs and garlic, flame-grilled to order."
    );
    seedItemDirect(
      `item-${bizId}-5`, `cat-${bizId}-mains`, "Egyptian Hawawshi", 180, 1,
      "300g", "Minced spiced beef, crispy pita bread, onions, garlic, oriental spices, tahini dip", 1, ["Halal", "Chef Special"], 480,
      "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&auto=format&fit=crop&q=80",
      "Traditional Egyptian pita bread stuffed with seasoned minced beef, baked until golden brown and crispy."
    );
    seedItemDirect(
      `item-${bizId}-6`, `cat-${bizId}-drinks`, "Fresh Mint Lemonade", 65, 1,
      "350ml", "Freshly squeezed lemons, garden mint leaves, crushed ice, sugar syrup", 0, ["Vegan", "Gluten-Free"], 120,
      "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400&auto=format&fit=crop&q=80",
      "Classic zesty lemonade mixed with fresh mint leaves and crushed ice for the perfect hot-day refresher."
    );
    seedItemDirect(
      `item-${bizId}-7`, `cat-${bizId}-desserts`, "Pistachio Baklava Platter", 140, 1,
      "200g", "Crispy phyllo pastry, roasted pistachios, pure honey syrup, ghee", 0, ["Vegetarian", "Contains Nuts"], 420,
      "https://images.unsplash.com/photo-1519676867240-f03562e64548?w=400&auto=format&fit=crop&q=80",
      "Rich, sweet dessert pastry composed of layers of crispy phyllo dough filled with chopped pistachios and sweetened with syrup."
    );
    seedItemDirect(
      `item-${bizId}-8`, `cat-${bizId}-apps`, "Cold Mezze Platter", 190, 1,
      "250g", "Hummus, Baba Ghanoush, Garlic Tom, Labneh, olives, pita bread", 0, ["Vegetarian", "Halal"], 280,
      "https://images.unsplash.com/photo-1577968897966-3d4325b36b61?w=400&auto=format&fit=crop&q=80",
      "A selection of classic dips: Hummus, Baba Ghanoush, Garlic Tom, and Labneh, served with warm house-made pita bread."
    );
    seedItemDirect(
      `item-${bizId}-9`, `cat-${bizId}-apps`, "Crispy Fried Falafel", 90, 1,
      "200g", "Fava beans, herbs, coriander, sesame, tahini dip", 0, ["Vegan", "Gluten-Free"], 190,
      "https://images.unsplash.com/photo-1577968897966-3d4325b36b61?w=400&auto=format&fit=crop&q=80",
      "Four pieces of traditional Egyptian fava bean falafel, spiced with coriander, served with sesame tahini sauce."
    );
    seedItemDirect(
      `item-${bizId}-10`, `cat-${bizId}-mains`, "Charcoal Grilled Shish Tawook", 340, 1,
      "400g", "Marinated chicken breast, yogurt, garlic, lemon, house spices, garlic dip", 0, ["Halal"], 490,
      "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&auto=format&fit=crop&q=80",
      "Tender chicken breast skewers marinated in yogurt, garlic, lemon juice, and warm Lebanese spices, served with garlic dip."
    );
    seedItemDirect(
      `item-${bizId}-11`, `cat-${bizId}-mains`, "Stuffed Vine Leaves (Mahshi)", 150, 1,
      "300g", "Grape leaves, spiced herb rice, lemon broth, yogurt sauce", 0, ["Vegetarian", "Halal"], 310,
      "https://images.unsplash.com/photo-1608897013039-887f21d8c804?w=400&auto=format&fit=crop&q=80",
      "Grape leaves stuffed with seasoned herb rice, slow-cooked in a tangy lemon and broth, served hot."
    );
    seedItemDirect(
      `item-${bizId}-12`, `cat-${bizId}-desserts`, "Traditional Um Ali", 130, 1,
      "250g", "Puff pastry, sweet milk, cream, coconut flakes, raisins, almonds", 0, ["Vegetarian", "Contains Nuts"], 380,
      "https://images.unsplash.com/photo-1587314168485-3236d6710814?w=400&auto=format&fit=crop&q=80",
      "Warm puff pastry pudding soaked in sweet milk and fresh cream, loaded with coconut flakes, raisins, and roasted almonds."
    );
    seedItemDirect(
      `item-${bizId}-13`, `cat-${bizId}-drinks`, "Egyptian Hibiscus Tea (Karkadeh)", 60, 1,
      "350ml", "Hibiscus flowers, natural sugar, ice water", 0, ["Vegan", "Gluten-Free"], 90,
      "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400&auto=format&fit=crop&q=80",
      "A sweet, ruby-red infusion of dried organic hibiscus flowers, served iced and refreshing."
    );
  }
} catch (e) {
  console.error("Auto-population of Kebab items notice:", e);
}


export default db;
