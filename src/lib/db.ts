import postgres from "postgres";

const connectionString = process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/tip";

const sql = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = {
  async get<T = any>(query: string, params: any[] = []): Promise<T | undefined> {
    await initDb();
    const { pgQuery, pgParams } = transformQuery(query, params);
    const result = await sql.unsafe(pgQuery, pgParams);
    return (result[0] as T) || undefined;
  },

  async all<T = any>(query: string, params: any[] = []): Promise<T[]> {
    await initDb();
    const { pgQuery, pgParams } = transformQuery(query, params);
    const result = await sql.unsafe(pgQuery, pgParams);
    return Array.from(result) as T[];
  },

  async run(query: string, params: any[] = []): Promise<{ changes: number }> {
    await initDb();
    const { pgQuery, pgParams } = transformQuery(query, params);
    const result = await sql.unsafe(pgQuery, pgParams);
    return { changes: result.count };
  },

  async transaction<T>(callback: (tx: postgres.Sql) => Promise<T>): Promise<T> {
    await initDb();
    return await sql.begin(callback);
  }
};

function transformQuery(query: string, params: any[] = []): { pgQuery: string; pgParams: any[] } {
  let paramIndex = 1;
  const pgQuery = query.replace(/\?/g, () => `$${paramIndex++}`);
  return { pgQuery, pgParams: params };
}

let isInitialized = false;

async function initDb() {
  if (isInitialized) return;

  try {
    // 1. Core Tables
    await sql`
      CREATE TABLE IF NOT EXISTS businesses (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        name_ar TEXT,
        logo_url TEXT,
        address TEXT,
        currency TEXT DEFAULT 'EGP',
        tip_distribution_mode TEXT DEFAULT 'INDIVIDUAL',
        individual_percentage DOUBLE PRECISION DEFAULT 100.0,
        balance DOUBLE PRECISION DEFAULT 0.0,
        city TEXT,
        business_type TEXT DEFAULT 'RESTAURANT',
        payout_method TEXT,
        payout_detail TEXT,
        owner_id TEXT,
        qr_scans_count INTEGER DEFAULT 0,
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
        role_id INTEGER NOT NULL DEFAULT 3,
        business_id TEXT REFERENCES businesses(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS individual_profiles (
        id TEXT PRIMARY KEY,
        user_id TEXT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        business_id TEXT REFERENCES businesses(id) ON DELETE SET NULL,
        role TEXT NOT NULL DEFAULT 'WAITER',
        avatar_url TEXT,
        qr_code_url TEXT,
        payout_method TEXT,
        payout_detail TEXT,
        balance DOUBLE PRECISION DEFAULT 0.0,
        rating DOUBLE PRECISION DEFAULT 5.0,
        saving_goal TEXT,
        saving_goal_ar TEXT,
        short_code TEXT UNIQUE,
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
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS bills (
        id TEXT PRIMARY KEY,
        spot_id TEXT NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
        business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        individual_id TEXT REFERENCES individual_profiles(id) ON DELETE SET NULL,
        amount DOUBLE PRECISION NOT NULL,
        currency TEXT DEFAULT 'EGP',
        status TEXT DEFAULT 'UNPAID',
        items_json TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        bill_id TEXT REFERENCES bills(id) ON DELETE SET NULL,
        individual_id TEXT REFERENCES individual_profiles(id) ON DELETE SET NULL,
        amount_bill DOUBLE PRECISION DEFAULT 0.0,
        amount_tip DOUBLE PRECISION DEFAULT 0.0,
        currency TEXT DEFAULT 'EGP',
        payment_status TEXT DEFAULT 'COMPLETED',
        payment_method TEXT DEFAULT 'CARD',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS tip_splits (
        id TEXT PRIMARY KEY,
        transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
        individual_id TEXT NOT NULL REFERENCES individual_profiles(id) ON DELETE CASCADE,
        amount DOUBLE PRECISION NOT NULL,
        role TEXT NOT NULL,
        percentage DOUBLE PRECISION DEFAULT 0.0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS feedback (
        id TEXT PRIMARY KEY,
        transaction_id TEXT REFERENCES transactions(id) ON DELETE CASCADE,
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
        description_ar TEXT,
        price DOUBLE PRECISION NOT NULL,
        image_url TEXT,
        is_available INTEGER DEFAULT 1,
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

    // Always seed missing demo businesses, spots, staff users & business_members links
    const rest1Id = "rest-kebab";
    const rest2Id = "rest-pyramids";

    await sql`
      INSERT INTO businesses (id, name, logo_url, address, currency, tip_distribution_mode, individual_percentage, balance, business_type)
      VALUES (${rest1Id}, 'Kebab El Dahab', 'https://images.unsplash.com/photo-1544025162-d76694265947?w=120&auto=format&fit=crop&q=60', 'Khan El Khalili, Cairo', 'EGP', 'INDIVIDUAL', 100.0, 15400.0, 'RESTAURANT')
      ON CONFLICT (id) DO NOTHING;
    `;

    await sql`
      INSERT INTO businesses (id, name, logo_url, address, currency, tip_distribution_mode, individual_percentage, balance, business_type)
      VALUES (${rest2Id}, 'Pyramids View Cafe', 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=120&auto=format&fit=crop&q=60', 'Giza Plateau, Giza', 'EGP', 'EQUAL_SPLIT', 100.0, 8900.0, 'RESTAURANT')
      ON CONFLICT (id) DO NOTHING;
    `;

    // Spots
    const spotsData = [
      ["table-kebab-1", rest1Id, 1, "Table 1", "kb1"],
      ["table-kebab-2", rest1Id, 2, "Table 2", "kb2"],
      ["table-kebab-3", rest1Id, 3, "Table 3", "kb3"],
      ["table-kebab-4", rest1Id, 4, "Table 4", "kb4"],
      ["table-kebab-5", rest1Id, 5, "Table 5", "kb5"],
      ["table-pyramids-11", rest2Id, 11, "Table 11", "py11"],
      ["table-pyramids-12", rest2Id, 12, "Table 12", "py12"],
    ];
    for (const [sId, bId, num, label, code] of spotsData) {
      await sql`
        INSERT INTO spots (id, business_id, number, label, short_code)
        VALUES (${sId as string}, ${bId as string}, ${num as number}, ${label as string}, ${code as string})
        ON CONFLICT (id) DO NOTHING;
      `;
    }

    // Users
    const usersData = [
      ["user-admin", "Super Admin", "مدير النظام", "admin@baksheesh.com", "admin123", 1, null],
      ["user-manager-kebab", "Hassan Manager", "حسن المدير", "manager1@kebab.com", "manager123", 2, rest1Id],
      ["user-waiter-amr", "Amr Waiter", "عمرو نادل", "waiter1@kebab.com", "waiter123", 3, rest1Id],
      ["user-waiter-mostafa", "Mostafa Waiter", "مصطفى نادل", "waiter2@kebab.com", "waiter123", 3, rest1Id],
      ["user-bartender-kebab", "Bar Team", "فريق البار", "bartender@kebab.com", "waiter123", 3, rest1Id],
      ["user-kitchen-kebab", "Kitchen Team", "فريق المطبخ", "kitchen@kebab.com", "waiter123", 3, rest1Id],
      ["user-waiter-sherif", "Sherif Waiter", "شريف نادل", "waiter3@pyramids.com", "waiter123", 3, rest2Id],
      ["user-waiter-youssef", "Youssef Waiter", "يوسف نادل", "waiter4@pyramids.com", "waiter123", 3, rest2Id],
      ["user-waiter-tarek", "Tarek Driver", "طارق سائق", "solo@baksheesh.com", "waiter123", 3, null],
    ];

    for (const [uId, uName, uNameAr, uEmail, uPass, uRole, uBizId] of usersData) {
      await sql`
        INSERT INTO users (id, name, name_ar, email, password_hash, role_id, business_id)
        VALUES (${uId as string}, ${uName as string}, ${uNameAr as string | null}, ${uEmail as string}, ${uPass as string}, ${uRole as number}, ${uBizId as string | null})
        ON CONFLICT (id) DO NOTHING;
      `;
    }

    // Individual Profiles
    const profilesData = [
      ["waiter-amr", "user-waiter-amr", rest1Id, "WAITER", "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80", "VODAFONE_CASH", "+201012345678", 120.0, 4.8, "new laptop for university studies", "كمبيوتر محمول جديد للدراسة الجامعية", "amr1"],
      ["waiter-mostafa", "user-waiter-mostafa", rest1Id, "WAITER", "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80", "INSTAPAY", "mostafa@instapay", 45.0, 4.5, "medical treatment for my mother", "علاج طبي لوالدتي", "mos2"],
      ["bartender-rest-kebab", "user-bartender-kebab", rest1Id, "OTHER", "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=150&auto=format&fit=crop&q=80", "INSTAPAY", "bar@instapay", 0.0, 4.9, "New premium cocktail blender", "خلاط كوكتيل بريميوم جديد", "bar1"],
      ["kitchen-rest-kebab", "user-kitchen-kebab", rest1Id, "OTHER", "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=150&auto=format&fit=crop&q=80", "BANK_TRANSFER", "EG9876543210987654321098765", 0.0, 5.0, "Professional Japanese chef knives", "سكاكين شيف يابانية احترافية", "kit1"],
      ["waiter-sherif", "user-waiter-sherif", rest2Id, "WAITER", "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80", "VODAFONE_CASH", "+201287654321", 0.0, 5.0, "funding my wedding in Giza", "تمويل زفافي في الجيزة", "she3"],
      ["waiter-youssef", "user-waiter-youssef", rest2Id, "WAITER", "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80", "BANK_TRANSFER", "EG1234567890123456789012345", 0.0, 5.0, "helping my younger brother with school", "مساعدة أخي الأصغر في الدراسة", "you4"],
      ["waiter-tarek", "user-waiter-tarek", null, "DRIVER", "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80", "VODAFONE_CASH", "+201509988776", 250.0, 4.9, "fixing my taxi engine and tires", "إصلاح محرك وإطارات تاكسي الخاص بي", "tar5"],
    ];

    for (const [pId, uId, bId, r, avatar, pMethod, pDetail, bal, rat, goal, goalAr, code] of profilesData) {
      await sql`
        INSERT INTO individual_profiles (id, user_id, business_id, role, avatar_url, qr_code_url, payout_method, payout_detail, balance, rating, saving_goal, saving_goal_ar, short_code)
        VALUES (${pId as string}, ${uId as string}, ${bId as string | null}, ${r as string}, ${avatar as string}, ${`/qrs/${pId}.png`}, ${pMethod as string}, ${pDetail as string}, ${bal as number}, ${rat as number}, ${goal as string | null}, ${goalAr as string | null}, ${code as string})
        ON CONFLICT (id) DO NOTHING;
      `;
    }

    // Business Members
    const membersData = [
      ["bm-kebab-amr", rest1Id, "waiter-amr", "WAITER", "ACTIVE"],
      ["bm-kebab-mostafa", rest1Id, "waiter-mostafa", "WAITER", "ACTIVE"],
      ["bm-kebab-bar", rest1Id, "bartender-rest-kebab", "OTHER", "ACTIVE"],
      ["bm-kebab-kitchen", rest1Id, "kitchen-rest-kebab", "OTHER", "ACTIVE"],
      ["bm-pyra-sherif", rest2Id, "waiter-sherif", "WAITER", "ACTIVE"],
      ["bm-pyra-youssef", rest2Id, "waiter-youssef", "WAITER", "ACTIVE"],
    ];

    for (const [mId, bId, indId, mRole, mStatus] of membersData) {
      await sql`
        INSERT INTO business_members (id, business_id, individual_id, role, status)
        VALUES (${mId as string}, ${bId as string}, ${indId as string}, ${mRole as string}, ${mStatus as string})
        ON CONFLICT (id) DO NOTHING;
      `;
    }

    // User Businesses (Manager link)
    await sql`
      INSERT INTO user_businesses (id, user_id, business_id, role)
      VALUES ('ub-user-manager-kebab-rest-kebab', 'user-manager-kebab', ${rest1Id}, 'OWNER')
      ON CONFLICT (id) DO NOTHING;
    `;

    console.log("PostgreSQL schema & default seed initialized.");
    isInitialized = true;
  } catch (err) {
    console.error("Failed to initialize PostgreSQL tables/seed data:", err);
  }
}

// Trigger DB init automatically on first module load
initDb();

export default db;
