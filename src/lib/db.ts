import postgres from "postgres";

// Read connection string from DATABASE_URL or environment
const connectionString = process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/tip";

// Initialize Postgres client
export const sql = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

// Helper function to convert SQLite style ? placeholders to PostgreSQL $1, $2...
function transformQuery(query: string): string {
  let paramIndex = 1;
  // Replace ? with $1, $2, etc., ignoring any inside strings if simple, or simple replacement
  return query.replace(/\?/g, () => `$${paramIndex++}`);
}

// Global db helper mimicking familiar get, all, run interface for compatibility
export const db = {
  async get<T = any>(query: string, params: any[] = []): Promise<T | undefined> {
    const pgQuery = transformQuery(query);
    const result = await sql.unsafe(pgQuery, params);
    return (result[0] as T) || undefined;
  },

  async all<T = any>(query: string, params: any[] = []): Promise<T[]> {
    const pgQuery = transformQuery(query);
    const result = await sql.unsafe(pgQuery, params);
    return Array.from(result) as T[];
  },

  async run(query: string, params: any[] = []): Promise<void> {
    const pgQuery = transformQuery(query);
    await sql.unsafe(pgQuery, params);
  },

  async transaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
    return (await sql.begin(fn as any)) as T;
  }
};

// Database Initialization & Migrations
let isInitialized = false;

export async function initDb() {
  if (isInitialized) return;
  try {
    // 1. Create Tables
    await sql`
      CREATE TABLE IF NOT EXISTS businesses (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        name_ar TEXT,
        logo_url TEXT,
        cover_url TEXT,
        currency TEXT DEFAULT 'EGP',
        tip_distribution_mode TEXT DEFAULT 'INDIVIDUAL',
        individual_percentage DOUBLE PRECISION DEFAULT 100.0,
        balance DOUBLE PRECISION DEFAULT 0.0,
        address TEXT,
        city TEXT,
        business_type TEXT DEFAULT 'RESTAURANT',
        usd_rate DOUBLE PRECISION DEFAULT 50.0,
        eur_rate DOUBLE PRECISION DEFAULT 55.0,
        payout_method TEXT,
        payout_detail TEXT,
        owner_id TEXT,
        qr_scans_count INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        platform_commission_rate DOUBLE PRECISION DEFAULT 5.0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        name_ar TEXT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role_id INTEGER NOT NULL,
        business_id TEXT REFERENCES businesses(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS individual_profiles (
        id TEXT PRIMARY KEY,
        user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        business_id TEXT REFERENCES businesses(id) ON DELETE SET NULL,
        role TEXT DEFAULT 'WAITER',
        avatar_url TEXT,
        qr_code_url TEXT,
        payout_method TEXT,
        payout_detail TEXT,
        balance DOUBLE PRECISION DEFAULT 0.0,
        rating DOUBLE PRECISION DEFAULT 5.0,
        saving_goal TEXT,
        saving_goal_ar TEXT,
        short_code TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS spots (
        id TEXT PRIMARY KEY,
        business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        number INTEGER NOT NULL,
        label TEXT NOT NULL,
        short_code TEXT UNIQUE NOT NULL,
        assigned_individual_id TEXT REFERENCES individual_profiles(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(business_id, number)
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS bills (
        id TEXT PRIMARY KEY,
        table_number TEXT NOT NULL,
        spot_id TEXT REFERENCES spots(id) ON DELETE SET NULL,
        business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        individual_id TEXT REFERENCES individual_profiles(id) ON DELETE SET NULL,
        amount DOUBLE PRECISION NOT NULL,
        status TEXT DEFAULT 'UNPAID',
        items TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        bill_id TEXT UNIQUE REFERENCES bills(id) ON DELETE SET NULL,
        individual_id TEXT REFERENCES individual_profiles(id) ON DELETE SET NULL,
        amount_bill DOUBLE PRECISION DEFAULT 0.0,
        amount_tip DOUBLE PRECISION DEFAULT 0.0,
        currency TEXT DEFAULT 'EGP',
        payment_status TEXT DEFAULT 'PENDING',
        payment_intent_id TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS tip_splits (
        id TEXT PRIMARY KEY,
        transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
        individual_id TEXT REFERENCES individual_profiles(id) ON DELETE SET NULL,
        amount DOUBLE PRECISION NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS feedback (
        id TEXT PRIMARY KEY,
        transaction_id TEXT UNIQUE NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
        rating_stars INTEGER NOT NULL,
        comments TEXT,
        tags TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS menu_categories (
        id TEXT PRIMARY KEY,
        business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        name_ar TEXT,
        translations_json TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS menu_items (
        id TEXT PRIMARY KEY,
        business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        category_id TEXT REFERENCES menu_categories(id) ON DELETE SET NULL,
        name TEXT NOT NULL,
        name_ar TEXT,
        description TEXT,
        price DOUBLE PRECISION NOT NULL,
        price_tourist DOUBLE PRECISION,
        image_url TEXT,
        is_available INTEGER DEFAULT 1,
        weight_volume TEXT,
        ingredients TEXT,
        spiciness INTEGER DEFAULT 0,
        dietary_tags TEXT,
        calories INTEGER,
        translations_json TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS promotions (
        id TEXT PRIMARY KEY,
        business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        title_ar TEXT,
        description TEXT,
        description_ar TEXT,
        image_url TEXT,
        item_id TEXT REFERENCES menu_items(id) ON DELETE SET NULL,
        discount_price DOUBLE PRECISION,
        active_from TEXT,
        active_to TEXT,
        status TEXT DEFAULT 'ACTIVE',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS payout_requests (
        id TEXT PRIMARY KEY,
        individual_id TEXT REFERENCES individual_profiles(id) ON DELETE SET NULL,
        business_id TEXT REFERENCES businesses(id) ON DELETE SET NULL,
        amount DOUBLE PRECISION NOT NULL,
        fee_amount DOUBLE PRECISION DEFAULT 0.0,
        net_amount DOUBLE PRECISION DEFAULT 0.0,
        payout_method TEXT NOT NULL,
        destination_detail TEXT NOT NULL,
        status TEXT DEFAULT 'PENDING',
        error_message TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS business_members (
        id TEXT PRIMARY KEY,
        business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        individual_id TEXT NOT NULL REFERENCES individual_profiles(id) ON DELETE CASCADE,
        role TEXT NOT NULL DEFAULT 'WAITER',
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(business_id, individual_id)
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS user_businesses (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        role TEXT NOT NULL DEFAULT 'OWNER',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, business_id)
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS business_invites (
        id TEXT PRIMARY KEY,
        business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        role TEXT NOT NULL DEFAULT 'MANAGER',
        token TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS platform_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Platform default settings
    await sql`INSERT INTO platform_settings (key, value) VALUES ('transaction_fee_percent', '5.0') ON CONFLICT (key) DO NOTHING;`;
    await sql`INSERT INTO platform_settings (key, value) VALUES ('tip_payout_fee_percent', '2.0') ON CONFLICT (key) DO NOTHING;`;
    await sql`INSERT INTO platform_settings (key, value) VALUES ('business_payout_fee_percent', '2.5') ON CONFLICT (key) DO NOTHING;`;
    await sql`INSERT INTO platform_settings (key, value) VALUES ('commission_rate', '5.0') ON CONFLICT (key) DO NOTHING;`;
    await sql`INSERT INTO platform_settings (key, value) VALUES ('usd_rate', '50.0') ON CONFLICT (key) DO NOTHING;`;
    await sql`INSERT INTO platform_settings (key, value) VALUES ('eur_rate', '55.0') ON CONFLICT (key) DO NOTHING;`;

    // Check if seeding is needed
    const usersCount = await db.get<{ count: string }>("SELECT COUNT(*) as count FROM users");
    if (!usersCount || parseInt(usersCount.count, 10) === 0) {
      console.log("PostgreSQL database empty. Seeding mock data...");

      // 1. Businesses
      const rest1Id = "rest-kebab";
      const rest2Id = "rest-pyramids";

      await db.run(
        `INSERT INTO businesses (id, name, logo_url, address, currency, tip_distribution_mode, individual_percentage, balance, business_type)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (id) DO NOTHING`,
        [rest1Id, "Kebab El Dahab", "https://images.unsplash.com/photo-1544025162-d76694265947?w=120&auto=format&fit=crop&q=60", "Khan El Khalili, Cairo", "EGP", "INDIVIDUAL", 100.0, 15400.0, "RESTAURANT"]
      );

      await db.run(
        `INSERT INTO businesses (id, name, logo_url, address, currency, tip_distribution_mode, individual_percentage, balance, business_type)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (id) DO NOTHING`,
        [rest2Id, "Pyramids View Cafe", "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=120&auto=format&fit=crop&q=60", "Giza Plateau, Giza", "EGP", "EQUAL_SPLIT", 100.0, 8900.0, "RESTAURANT"]
      );

      // Spots
      const seedSpot = async (id: string, bizId: string, num: number, label: string, code: string) => {
        await db.run(
          `INSERT INTO spots (id, business_id, number, label, short_code) VALUES (?, ?, ?, ?, ?) ON CONFLICT (id) DO NOTHING`,
          [id, bizId, num, label, code]
        );
      };
      await seedSpot("table-kebab-1", rest1Id, 1, "Table 1", "kb1");
      await seedSpot("table-kebab-2", rest1Id, 2, "Table 2", "kb2");
      await seedSpot("table-kebab-3", rest1Id, 3, "Table 3", "kb3");
      await seedSpot("table-kebab-4", rest1Id, 4, "Table 4", "kb4");
      await seedSpot("table-kebab-5", rest1Id, 5, "Table 5", "kb5");
      await seedSpot("table-pyramids-11", rest2Id, 11, "Table 11", "py11");
      await seedSpot("table-pyramids-12", rest2Id, 12, "Table 12", "py12");

      // Users & Individual Profiles
      const seedUser = async (id: string, name: string, nameAr: string | null, email: string, pass: string, role_id: number, bizId: string | null) => {
        await db.run(
          `INSERT INTO users (id, name, name_ar, email, password_hash, role_id, business_id) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT (id) DO NOTHING`,
          [id, name, nameAr, email, pass, role_id, bizId]
        );
      };

      const seedIndividualProfile = async (
        id: string, userId: string, bizId: string | null, role: string, avatar: string, payoutMethod: string, payoutDetail: string, balance: number, rating: number, savingGoal: string | null, savingGoalAr: string | null, code: string
      ) => {
        await db.run(
          `INSERT INTO individual_profiles (id, user_id, business_id, role, avatar_url, qr_code_url, payout_method, payout_detail, balance, rating, saving_goal, saving_goal_ar, short_code)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (id) DO NOTHING`,
          [id, userId, bizId, role, avatar, `/qrs/${id}.png`, payoutMethod, payoutDetail, balance, rating, savingGoal, savingGoalAr, code]
        );
      };

      await seedUser("user-admin", "Super Admin", "مدير النظام", "admin@baksheesh.com", "admin123", 1, null);
      await seedUser("user-manager-kebab", "Hassan Manager", "حسن المدير", "manager1@kebab.com", "manager123", 2, rest1Id);

      await seedUser("user-waiter-amr", "Amr Waiter", "عمرو نادل", "waiter1@kebab.com", "waiter123", 3, rest1Id);
      await seedIndividualProfile("waiter-amr", "user-waiter-amr", rest1Id, "WAITER", "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80", "VODAFONE_CASH", "+201012345678", 120.0, 4.8, "new laptop for university studies", "كمبيوتر محمول جديد للدراسة الجامعية", "amr1");

      await seedUser("user-waiter-mostafa", "Mostafa Waiter", "مصطفى نادل", "waiter2@kebab.com", "waiter123", 3, rest1Id);
      await seedIndividualProfile("waiter-mostafa", "user-waiter-mostafa", rest1Id, "WAITER", "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80", "INSTAPAY", "mostafa@instapay", 45.0, 4.5, "medical treatment for my mother", "علاج طبي لوالدتي", "mos2");

      await seedUser("user-waiter-sherif", "Sherif Waiter", "شريف نادل", "waiter3@pyramids.com", "waiter123", 3, rest2Id);
      await seedIndividualProfile("waiter-sherif", "user-waiter-sherif", rest2Id, "WAITER", "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80", "VODAFONE_CASH", "+201287654321", 0.0, 5.0, "funding my wedding in Giza", "تمويل زفافي في الجيزة", "she3");

      await seedUser("user-waiter-tarek", "Tarek Driver", "طارق سائق", "solo@baksheesh.com", "waiter123", 3, null);
      await seedIndividualProfile("waiter-tarek", "user-waiter-tarek", null, "DRIVER", "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80", "VODAFONE_CASH", "+201509988776", 250.0, 4.9, "fixing my taxi engine and tires", "إصلاح محرك وإطارات تاكسي الخاص بي", "tar5");

      console.log("PostgreSQL database seeded successfully.");
    }

    isInitialized = true;
  } catch (err) {
    console.error("Failed to initialize PostgreSQL tables/seed data:", err);
  }
}

// Trigger DB init automatically on first module load
initDb();

export default db;
