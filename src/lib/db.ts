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

  async transaction<T>(callback: (tx: postgres.TransactionSql) => Promise<T>): Promise<T> {
    await initDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await sql.begin(callback as any) as T;
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

    // Menu Categories (upsert so existing DBs get updated names/order)
    const categoriesData: [string, string, string, string, number][] = [
      ["cat-grills",          rest1Id, "Grills & Kebab",               "مشويات وكباب",               1],
      ["cat-starters",        rest1Id, "Starters & Mezza",             "المقبلات والميزة",            2],
      ["cat-salads",          rest1Id, "Fresh Salads",                  "سلطات طازجة",                 3],
      ["cat-soups",           rest1Id, "Soups",                         "شوربات",                      4],
      ["cat-drinks",          rest1Id, "Cold & Hot Drinks",             "مشروبات باردة وساخنة",        5],
      ["cat-desserts",        rest1Id, "Desserts",                      "حلويات",                      6],
      ["cat-pyra-coffee",     rest2Id, "Coffee & Teas",                 "قهوة وشاي",                   1],
      ["cat-pyra-breakfast",  rest2Id, "Egyptian Breakfast",            "إفطار مصري",                  2],
      ["cat-pyra-juices",     rest2Id, "Fresh Juices & Smoothies",      "عصائر طازجة وسموذي",          3],
      ["cat-pyra-pastries",   rest2Id, "Pastries & Sweets",             "مخبوزات وحلويات",             4],
    ];
    for (const [cId, bId, cName, cNameAr, sOrder] of categoriesData) {
      await sql`
        INSERT INTO menu_categories (id, business_id, name, name_ar, sort_order)
        VALUES (${cId}, ${bId}, ${cName}, ${cNameAr}, ${sOrder})
        ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, name_ar=EXCLUDED.name_ar, sort_order=EXCLUDED.sort_order;
      `;
    }

    // Menu Items — full data with calories & tags stored in translations_json
    // Format: [id, biz, cat, name, name_ar, desc, desc_ar, price, img, avail, translations_json]
    type MenuItem = [string,string,string,string,string,string,string,number,string,number,string];
    const menuItemsData: MenuItem[] = [
      // ── KEBAB EL DAHAB ─ Grills & Kebab ────────────────────────────────
      [
        "item-kebab-mix", rest1Id, "cat-grills",
        "Mix Grill Platter (500g)", "مشويات مشكلة 500 جرام",
        "A lavish sharing platter of juicy lamb kofta, marinated shish tawook, and authentic charcoal-grilled kebab, served with saffron rice, warm baladi bread, grilled tomatoes & tahina dip.",
        "طبق مشويات مشترك فاخر يضم كفتة ضأن عصيرية وشيش طاووق متبل وكباب مشوي على الفحم الأصيل، يُقدَّم مع أرز بالزعفران وخبز بلدي دافئ وطماطم مشوية وطحينة.",
        450.0,
        "https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=90",
        1,
        `{"calories":860,"tags":["halal","grilled","lamb","chicken","sharing","popular"]}`
      ],
      [
        "item-kofta", rest1Id, "cat-grills",
        "Egyptian Lamb Kofta (6 pcs)", "كفتة ضأن مصرية 6 قطع",
        "Hand-shaped minced lamb kofta seasoned with cumin, coriander, parsley and a secret blend of oriental spices, char-grilled to perfection. Served with pita bread and tahina.",
        "كفتة ضأن مفرومة يدوياً متبلة بالكمون والكزبرة والبقدونس وخليط من البهارات الشرقية السرية، مشوية على الفحم بإتقان، تُقدَّم مع خبز بيتا وطحينة.",
        280.0,
        "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=800&auto=format&fit=crop&q=90",
        1,
        `{"calories":520,"tags":["halal","grilled","lamb","spicy","popular"]}`
      ],
      [
        "item-shish", rest1Id, "cat-grills",
        "Shish Tawook Skewers (4 pcs)", "شيش طاووق 4 أسياخ",
        "Tender chicken breast cubes marinated overnight in garlic, lemon juice, yogurt and aromatic spices, then grilled over glowing charcoal until golden. Served with garlic sauce and fries.",
        "قطع صدر دجاج طرية متبلة طوال الليل في الثوم وعصير الليمون والزبادي والبهارات العطرية، مشوية على الفحم المتقد حتى تصبح ذهبية. تُقدَّم مع صلصة ثوم وبطاطس.",
        240.0,
        "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=800&auto=format&fit=crop&q=90",
        1,
        `{"calories":420,"tags":["halal","grilled","chicken","marinated","light"]}`
      ],
      [
        "item-lamb-chops", rest1Id, "cat-grills",
        "Grilled Lamb Chops (4 pcs)", "ضلوع خروف مشوية 4 قطع",
        "Premium New Zealand lamb chops rubbed with rosemary, garlic and Egyptian spice blend, charcoal-grilled to a beautiful pink medium. Served with roasted vegetables and mint yogurt sauce.",
        "ضلوع خروف نيوزيلندي ممتازة مدهونة بالروزماري والثوم وخليط البهارات المصرية، مشوية على الفحم لدرجة متوسطة ورديّة جميلة. تُقدَّم مع خضار مشوية وصلصة زبادي بالنعناع.",
        380.0,
        "https://images.unsplash.com/photo-1544365558-35aa4afcf11f?w=800&auto=format&fit=crop&q=90",
        1,
        `{"calories":680,"tags":["halal","grilled","lamb","premium","gluten-free"]}`
      ],
      [
        "item-whole-chicken", rest1Id, "cat-grills",
        "Charcoal Whole Chicken", "دجاجة كاملة على الفحم",
        "A whole free-range chicken marinated for 24 hours in a vibrant blend of lemon, garlic, cumin and Egyptian herbs, slow-grilled over charcoal until deeply smoky and fall-off-the-bone tender. Served with two sides of your choice.",
        "دجاجة كاملة من الدواجن الحرة متبلة لمدة 24 ساعة في خليط حيوي من الليمون والثوم والكمون والأعشاب المصرية، مشوية ببطء على الفحم حتى تصبح مدخنة العطر وطرية جداً. تُقدَّم مع طبقين جانبيين من اختيارك.",
        320.0,
        "https://images.unsplash.com/photo-1598103442097-8b74394b95c1?w=800&auto=format&fit=crop&q=90",
        1,
        `{"calories":1150,"tags":["halal","grilled","chicken","sharing","classic"]}`
      ],
      [
        "item-beef-liver", rest1Id, "cat-grills",
        "Spiced Grilled Beef Liver", "كبدة بتلو مشوية بالبهارات",
        "Thinly sliced fresh beef liver flash-grilled with chili, cumin, garlic and green peppers in the authentic Alexandrian style. Served with tomato, onion and baladi bread.",
        "شرائح كبدة بتلو طازجة مشوية سريعاً مع الفلفل الحار والكمون والثوم والفلفل الأخضر على الطريقة الإسكندرانية الأصيلة. تُقدَّم مع طماطم وبصل وخبز بلدي.",
        180.0,
        "https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=800&auto=format&fit=crop&q=90",
        1,
        `{"calories":340,"tags":["halal","grilled","offal","spicy","alexandrian"]}`
      ],

      // ── KEBAB EL DAHAB ─ Starters & Mezza ─────────────────────────────
      [
        "item-tahina", rest1Id, "cat-starters",
        "Creamy Sesame Tahina", "طحينة سمسم ناعمة",
        "House-made pure sesame tahina blended with roasted garlic, fresh lemon juice, cumin, and a drizzle of cold-pressed extra-virgin olive oil. Sprinkled with paprika and parsley. Served with warm baladi bread.",
        "طحينة سمسم نقية من صنع المطبخ ممزوجة بالثوم المحمص وعصير الليمون الطازج والكمون وقليل من زيت الزيتون البكر. مرشوشة بالفليفلة الحمراء والبقدونس. تُقدَّم مع خبز بلدي دافئ.",
        40.0,
        "https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=800&auto=format&fit=crop&q=90",
        1,
        `{"calories":185,"tags":["vegetarian","vegan","gluten-free","sesame","dip"]}`
      ],
      [
        "item-baba", rest1Id, "cat-starters",
        "Smoked Baba Ghanoush", "بابا غنوج مشوي",
        "Whole eggplants charred directly over an open flame until deeply smoky, then hand-mashed with tahina, roasted garlic, lemon juice and olive oil. Finished with pomegranate seeds and fresh mint.",
        "باذنجان كامل محروق مباشرة على لهب مفتوح حتى يصبح مدخناً عميقاً، ثم يُهرس يدوياً مع الطحينة والثوم المشوي وعصير الليمون وزيت الزيتون. يُزين ببذور الرمان والنعناع الطازج.",
        50.0,
        "https://images.unsplash.com/photo-1572449043416-55f4685c9bb7?w=800&auto=format&fit=crop&q=90",
        1,
        `{"calories":150,"tags":["vegetarian","vegan","gluten-free","smoky","eggplant"]}`
      ],
      [
        "item-hummus", rest1Id, "cat-starters",
        "Silky Lebanese Hummus", "حمص لبناني ناعم",
        "Slow-cooked chickpeas blended into a silky-smooth hummus with generous tahina, cold-pressed lemon juice, garlic and ice water, topped with warm chickpeas and a river of olive oil.",
        "حمص مطبوخ ببطء ومُمزوج في حمص ناعم كالحرير مع طحينة سخية وعصير ليمون بارد وثوم وماء مثلج، مُزيَّن بحمص دافئ ونهر من زيت الزيتون.",
        55.0,
        "https://images.unsplash.com/photo-1612177726700-bd1739cdb77b?w=800&auto=format&fit=crop&q=90",
        1,
        `{"calories":210,"tags":["vegetarian","vegan","gluten-free","chickpeas","protein"]}`
      ],
      [
        "item-vine-leaves", rest1Id, "cat-starters",
        "Stuffed Vine Leaves (8 pcs)", "ورق عنب محشي 8 قطع",
        "Tender vine leaves hand-rolled with a fragrant filling of Egyptian short-grain rice, diced tomatoes, parsley, mint, lemon zest and a touch of olive oil. Served chilled with a wedge of lemon.",
        "ورق عنب طري مدلفن يدوياً بحشوة عطرية من الأرز المصري قصير الحبة والطماطم المفرومة والبقدونس والنعناع وقشر الليمون ولمسة من زيت الزيتون. يُقدَّم بارداً مع شريحة ليمون.",
        70.0,
        "https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=800&auto=format&fit=crop&q=90",
        1,
        `{"calories":280,"tags":["vegetarian","vegan","rice","herbed","cold"]}`
      ],
      [
        "item-mixed-mezza", rest1Id, "cat-starters",
        "Grand Mixed Mezza Platter", "طبق ميزة مشكل كبير",
        "A feast for sharing — includes tahina, baba ghanoush, hummus, vine leaves, olives, feta cheese, pickled turnip and radish, served with a basket of warm baladi bread. Perfect for 3–4 people.",
        "وليمة للمشاركة — تشمل طحينة وبابا غنوج وحمص وورق عنب وزيتون وجبن فيتا ولفت مخلل وفجل، تُقدَّم مع سلة من الخبز البلدي الدافئ. مثالية لـ 3-4 أشخاص.",
        120.0,
        "https://images.unsplash.com/photo-1515516008080-2c55302901b7?w=800&auto=format&fit=crop&q=90",
        1,
        `{"calories":480,"tags":["vegetarian","sharing","assorted","popular"]}`
      ],

      // ── KEBAB EL DAHAB ─ Fresh Salads ──────────────────────────────────
      [
        "item-fattoush", rest1Id, "cat-salads",
        "Classic Fattoush Salad", "سلطة فتوش كلاسيكية",
        "A rainbow of crispy romaine, cucumber, tomato, radish, spring onion and fresh mint tossed with sumac-lemon dressing and topped with golden crispy pita chips.",
        "قوس قزح من الخس الروماني المقرمش والخيار والطماطم والفجل والبصل الأخضر والنعناع الطازج مقلوبة بتتبيلة السماق والليمون ومُزيَّنة برقائق بيتا مقرمشة ذهبية.",
        65.0,
        "https://images.unsplash.com/photo-1540189549336-e6e99eb4b51b?w=800&auto=format&fit=crop&q=90",
        1,
        `{"calories":130,"tags":["vegetarian","vegan","sumac","crispy","light","gluten-free-option"]}`
      ],
      [
        "item-tabboule", rest1Id, "cat-salads",
        "Lebanese Tabbouleh", "تبولة لبنانية",
        "An authentic herb-forward salad bursting with finely chopped flat-leaf parsley, fresh mint, ripe tomatoes and a touch of fine bulgur wheat, dressed in extra-virgin olive oil and lemon juice.",
        "سلطة أعشاب أصيلة مفعمة ببقدونس ناعم مفروم ونعناع طازج وطماطم ناضجة ولمسة من البرغل الناعم، متبلة بزيت الزيتون البكر وعصير الليمون.",
        60.0,
        "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&auto=format&fit=crop&q=90",
        1,
        `{"calories":120,"tags":["vegetarian","vegan","herbs","parsley","light","gluten"]}`
      ],
      [
        "item-caesar", rest1Id, "cat-salads",
        "Grilled Chicken Caesar", "سيزر بالدجاج المشوي",
        "Crisp romaine hearts tossed in house-made Caesar dressing — anchovy-free — with shaved Parmesan, house-baked croutons and sliced grilled chicken breast. Rich, tangy and deeply satisfying.",
        "قلوب خس روماني مقرمشة مقلوبة بصلصة سيزر منزلية الصنع — خالية من الأنشوجة — مع شرائح بارميزان ومقرمشات مخبوزة يدوياً وشرائح صدر دجاج مشوي. غنية وحامضة ومُشبِعة.",
        90.0,
        "https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=800&auto=format&fit=crop&q=90",
        1,
        `{"calories":320,"tags":["chicken","crispy","creamy","parmesan","gluten"]}`
      ],

      // ── KEBAB EL DAHAB ─ Soups ──────────────────────────────────────────
      [
        "item-lentil-soup", rest1Id, "cat-soups",
        "Egyptian Red Lentil Soup", "شوربة عدس مصرية",
        "A velvety, golden soup of slow-simmered red lentils with caramelized onions, cumin, coriander and turmeric, finished with a swirl of lemon juice and topped with fried crispy onion rings. Served with bread.",
        "شوربة مخملية ذهبية من العدس الأحمر المطبوخ ببطء مع البصل المكرمل والكمون والكزبرة والكركم، مُنهاة بدوامة عصير ليمون ومُزيَّنة بحلقات بصل مقلية مقرمشة. تُقدَّم مع الخبز.",
        55.0,
        "https://images.unsplash.com/photo-1547592180-85f173990554?w=800&auto=format&fit=crop&q=90",
        1,
        `{"calories":210,"tags":["vegetarian","vegan","gluten-free","lentils","warm","iron"]}`
      ],
      [
        "item-tomato-soup", rest1Id, "cat-soups",
        "Roasted Tomato & Basil Soup", "شوربة طماطم مشوية بالريحان",
        "Slow-roasted vine tomatoes blended with caramelized garlic, fresh basil and a touch of cream into a deeply flavourful, velvety soup. Finished with a drizzle of basil oil and toasted bread.",
        "طماطم كرمة مشوية ببطء ممزوجة بالثوم المكرمل والريحان الطازج ولمسة كريمة في شوربة مخملية عميقة النكهة. مُنهاة بزيت ريحان وخبز محمص.",
        50.0,
        "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&auto=format&fit=crop&q=90",
        1,
        `{"calories":180,"tags":["vegetarian","tomato","basil","creamy","warm"]}`
      ],

      // ── KEBAB EL DAHAB ─ Drinks ─────────────────────────────────────────
      [
        "item-mint-lemon", rest1Id, "cat-drinks",
        "Fresh Mint Lemonade", "ليمون بالنعناع طازج",
        "Freshly squeezed Egyptian lemons muddled with garden-fresh mint leaves, a touch of sugar and crushed ice — the perfect antidote to a hot Cairo day.",
        "ليمون مصري مضغوط طازجاً مع أوراق نعناع طازجة من الحديقة ولمسة سكر وثلج مجروش — الترياق المثالي ليوم قاهري حار.",
        45.0,
        "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&auto=format&fit=crop&q=90",
        1,
        `{"calories":95,"tags":["cold","fresh","mint","lemon","vegan","vitamin-c"]}`
      ],
      [
        "item-hibiscus", rest1Id, "cat-drinks",
        "Iced Karkadeh (Hibiscus)", "كركديه مثلج",
        "Premium dried hibiscus flowers steeped overnight in cold-filtered water with a hint of rose water and a sprinkle of sugar, served over crushed ice. Naturally rich in antioxidants and Vitamin C.",
        "أزهار كركديه مجففة ممتازة منقوعة طوال الليل في ماء مفلتر بارد مع لمسة ماء ورد وقليل من السكر، تُقدَّم على ثلج مجروش. غنية بشكل طبيعي بمضادات الأكسدة وفيتامين ج.",
        35.0,
        "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=800&auto=format&fit=crop&q=90",
        1,
        `{"calories":60,"tags":["cold","antioxidant","herbal","vegan","vitamin-c","gluten-free"]}`
      ],
      [
        "item-mango-juice", rest1Id, "cat-drinks",
        "Fresh Egyptian Mango Juice", "عصير مانجو مصري طازج",
        "Nothing beats Egyptian Alphonso mangoes at peak season — blended fresh with a splash of milk and a drizzle of honey into an impossibly thick, golden juice. Seasonal summer special.",
        "لا شيء يضاهي مانجو الفونسو المصرية في موسمها — مُمزوجة طازجة مع قليل من الحليب وقطرة عسل في عصير ذهبي كثيف بشكل لا يُصدَّق. خاص موسمي صيفي.",
        60.0,
        "https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=800&auto=format&fit=crop&q=90",
        1,
        `{"calories":190,"tags":["cold","fresh","mango","seasonal","tropical","vitamin-a"]}`
      ],
      [
        "item-ayran", rest1Id, "cat-drinks",
        "Chilled Ayran Yogurt Drink", "عيران زبادي بارد",
        "A refreshingly tangy Turkish-style yogurt drink whisked with cold water and a pinch of salt until perfectly frothy. One of the best companions for spiced grilled meats.",
        "مشروب زبادي منعش على الطريقة التركية مخفوقاً مع ماء بارد وقرصة ملح حتى يصبح رغوياً تماماً. أحد أفضل مشروبات اللحوم المشوية المتبلة.",
        30.0,
        "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=800&auto=format&fit=crop&q=90",
        1,
        `{"calories":110,"tags":["cold","probiotic","yogurt","salty","gluten-free"]}`
      ],
      [
        "item-black-tea", rest1Id, "cat-drinks",
        "Egyptian Black Tea (Koshary style)", "شاي مصري أسود كوشري",
        "Strong Ceylon tea leaves brewed the Egyptian way — dark, bold and richly aromatic — served in a traditional glass with mint sprigs and a side of sugar cubes. Hot or iced on request.",
        "أوراق شاي سيلاني قوية مُعَدَّة على الطريقة المصرية — داكنة وجريئة وعطرية للغاية — تُقدَّم في كوب تقليدي مع غصون نعناع وقطع سكر على الجانب. ساخنة أو مثلجة عند الطلب.",
        15.0,
        "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=800&auto=format&fit=crop&q=90",
        1,
        `{"calories":10,"tags":["hot","tea","tradition","caffeine","vegan","gluten-free"]}`
      ],

      // ── KEBAB EL DAHAB ─ Desserts ───────────────────────────────────────
      [
        "item-om-ali", rest1Id, "cat-desserts",
        "Hot Om Ali Dessert", "أم علي بالفرن",
        "Egypt's beloved national dessert — layers of crispy puff pastry soaked in warm sweetened milk, baked with a generous scatter of pistachio, almond, coconut flakes and raisins, crowned with whipped cream and caramelized on top.",
        "الحلوى الوطنية المصرية المحبوبة — طبقات من معجنات الفطير المقرمشة المنقوعة في حليب دافئ محلى، مخبوزة مع حفنة سخية من الفستق واللوز وجوز الهند والزبيب، متوجة بقشطة مخفوقة ومكرملة من الأعلى.",
        75.0,
        "https://images.unsplash.com/photo-1587314168485-3236d6710814?w=800&auto=format&fit=crop&q=90",
        1,
        `{"calories":450,"tags":["sweet","nuts","milk","warm","traditional","vegetarian","wheat"]}`
      ],
      [
        "item-kunafa", rest1Id, "cat-desserts",
        "Kunafa with Cream Cheese", "كنافة بالقشطة والجبن",
        "Golden crispy kataifi pastry filled with a cloud of fresh cream cheese and ashta, baked until amber-golden then drenched in orange-blossom sugar syrup. Topped with crushed pistachios and rose petals.",
        "كنافة قطايف ذهبية مقرمشة محشوة بسحابة من الجبن القريش الطازج والقشطة، مخبوزة حتى تصبح ذهبية كرتب العنبر ثم مُغمَّرة في قطر بماء الزهر. مُزيَّنة بفستق مطحون وبتلات ورد.",
        85.0,
        "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&auto=format&fit=crop&q=90",
        1,
        `{"calories":520,"tags":["sweet","cheese","syrup","pistachio","traditional","vegetarian","wheat"]}`
      ],
      [
        "item-basbousa", rest1Id, "cat-desserts",
        "Basbousa (Semolina Cake)", "بسبوسة بالسميد",
        "A classic moist Egyptian semolina cake soaked in simple syrup infused with vanilla and rose water, topped with a whole blanched almond. Baked in our clay oven for that authentic texture.",
        "كيكة سميد مصرية كلاسيكية رطبة منقوعة في قطر بسيط منكَّه بالفانيليا وماء الورد، متوجة بلوزة مقشرة كاملة. مخبوزة في فرننا الطيني لذلك القوام الأصيل.",
        50.0,
        "https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=800&auto=format&fit=crop&q=90",
        1,
        `{"calories":380,"tags":["sweet","semolina","syrup","rose-water","traditional","vegetarian","wheat"]}`
      ],
      [
        "item-rice-pudding", rest1Id, "cat-desserts",
        "Roz Bel Laban (Rice Pudding)", "رز بلبن كريمي",
        "Slow-cooked Egyptian short-grain rice simmered in full-fat milk with sugar and a perfume of rose water and mastic, chilled and served cold with a dusting of cinnamon and crushed pistachio.",
        "أرز مصري قصير الحبة مطبوخ ببطء في حليب كامل الدسم مع السكر وعطر ماء الورد والمستكة، مُبرَّد ويُقدَّم بارداً مع رشة قرفة وفستق مطحون.",
        45.0,
        "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&auto=format&fit=crop&q=90",
        1,
        `{"calories":290,"tags":["sweet","milk","cold","cinnamon","gluten-free","vegetarian"]}`
      ],

      // ── PYRAMIDS VIEW CAFE ─ Coffee & Teas ─────────────────────────────
      [
        "item-turkish-coffee", rest2Id, "cat-pyra-coffee",
        "Egyptian Double Turkish Coffee", "قهوة تركي مضاعفة",
        "Dark-roasted Arabica beans finely ground and slow-brewed in a traditional copper cezve with a generous hit of whole green cardamom pods until a thick, velvety crema forms. Served in an ornate demitasse.",
        "حبوب أرابيكا محمصة داكنة مطحونة ناعماً ومُعدَّة ببطء في جزوة نحاسية تقليدية مع جرعة سخية من حبوب هيل أخضر كاملة حتى تتكون كريمة كثيفة مخملية. تُقدَّم في فنجان ديمي تاس منقوش.",
        40.0,
        "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=90",
        1,
        `{"calories":10,"tags":["hot","coffee","strong","cardamom","traditional","gluten-free","vegan"]}`
      ],
      [
        "item-cappuccino", rest2Id, "cat-pyra-coffee",
        "Creamy Cappuccino", "كابتشينو كريمي",
        "A classic Italian-style cappuccino made with a double shot of freshly pulled espresso, silky micro-foamed whole milk and a generous dome of velvet milk foam. Dusted with finest Belgian cocoa powder.",
        "كابتشينو كلاسيكي على الطريقة الإيطالية من جرعة مزدوجة من الإسبريسو الطازج وحليب كامل الدسم مُرغِّد بإتقان وقبة سخية من رغوة الحليب المخملية. مُغبَّرة بمسحوق كاكاو بلجيكي فاخر.",
        65.0,
        "https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=800&auto=format&fit=crop&q=90",
        1,
        `{"calories":120,"tags":["hot","coffee","milk","foam","espresso","italian-style"]}`
      ],
      [
        "item-espresso", rest2Id, "cat-pyra-coffee",
        "Double Espresso Shot", "دبل إسبريسو",
        "Two ristretto shots of our signature single-origin Ethiopian Yirgacheffe beans, pulled at 9 bars of pressure for a complex, fruity and darkly sweet cup. Pure coffee for true espresso lovers.",
        "جرعتا ريستريتو من حبوب إثيوبية يرجاتشيفي أصل واحد المميزة، مُسحوبة بضغط 9 بار لكوب معقد وفاكهي وحلو داكن. قهوة نقية لعشاق الإسبريسو الحقيقيين.",
        50.0,
        "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=800&auto=format&fit=crop&q=90",
        1,
        `{"calories":5,"tags":["hot","coffee","strong","bold","gluten-free","vegan","pure"]}`
      ],
      [
        "item-mint-tea", rest2Id, "cat-pyra-coffee",
        "Moroccan Fresh Mint Tea", "شاي نعناع مغربي طازج",
        "A tall glass teapot of premium Moroccan gunpowder green tea steeped with a generous bouquet of fresh spearmint leaves and sweetened with authentic amber cane sugar. Poured high for maximum aroma.",
        "إبريق شاي زجاجي طويل من شاي البارود الأخضر المغربي الممتاز منقوع مع باقة سخية من أوراق النعناع السيسان الطازجة ومُحلَّى بسكر القصب الأصفر الأصيل. يُصب من علو لأقصى عطر.",
        30.0,
        "https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=800&auto=format&fit=crop&q=90",
        1,
        `{"calories":40,"tags":["hot","tea","mint","herbal","vegan","gluten-free","digestive"]}`
      ],
      [
        "item-nescafe", rest2Id, "cat-pyra-coffee",
        "Nescafe Gold with Cream", "نسكافيه جولد مع كريمة",
        "A rich mug of Nescafé Gold instant coffee dissolved in hot water, finished with warmed full-cream milk and a swirl of whipped cream. Simple, comforting and perfect for any time of day.",
        "كوب غني من قهوة نسكافيه جولد الفورية مذابة في ماء ساخن، مُنهاة بحليب كامل الدسم دافئ ودوامة كريمة مخفوقة. بسيطة ومريحة ومثالية لأي وقت من اليوم.",
        40.0,
        "https://images.unsplash.com/photo-1507941097613-9f2157b69235?w=800&auto=format&fit=crop&q=90",
        1,
        `{"calories":80,"tags":["hot","coffee","instant","milk","creamy","classic"]}`
      ],
      [
        "item-green-tea", rest2Id, "cat-pyra-coffee",
        "Green Tea with Fresh Ginger", "شاي أخضر مع زنجبيل طازج",
        "Premium Japanese Sencha green tea steeped at the perfect 75°C, served with fresh slices of peeled ginger root and a honeycomb wedge on the side. Calming, immune-boosting and naturally caffeine-light.",
        "شاي سنشا ياباني ممتاز منقوع عند 75 درجة مئوية المثالية، يُقدَّم مع شرائح طازجة من جذر الزنجبيل المقشر وقرص عسل على الجانب. مهدئ ومعزز للمناعة وخفيف الكافيين بشكل طبيعي.",
        35.0,
        "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&auto=format&fit=crop&q=90",
        1,
        `{"calories":20,"tags":["hot","tea","antioxidant","ginger","immune","gluten-free","vegan"]}`
      ],

      // ── PYRAMIDS VIEW CAFE ─ Egyptian Breakfast ─────────────────────────
      [
        "item-ful-taameya", rest2Id, "cat-pyra-breakfast",
        "Ful & Taameya Breakfast Basket", "سلة إفطار فول وطعمية",
        "The quintessential Egyptian breakfast — creamy slow-cooked fava beans seasoned with cumin, tomato and olive oil, alongside 4 crispy green falafel (taameya) packed with fresh herbs, served with baladi bread, sliced tomato, rocket, pickled mango achaar and pickled cucumber.",
        "الإفطار المصري بامتياز — فول مدمس كريمي بطيء الطهي متبل بالكمون والطماطم وزيت الزيتون، إلى جانب 4 قطع طعمية خضراء مقرمشة مليئة بالأعشاب الطازجة، تُقدَّم مع خبز بلدي وطماطم وجرجير ومخلل مانجو وخيار مخلل.",
        90.0,
        "https://images.unsplash.com/photo-1590412200988-a436970781fa?w=800&auto=format&fit=crop&q=90",
        1,
        `{"calories":480,"tags":["vegetarian","vegan","traditional","fava-beans","falafel","high-protein","gluten"]}`
      ],
      [
        "item-feteer", rest2Id, "cat-pyra-breakfast",
        "Feteer Meshaltet (Layered Pastry)", "فطير مشلتت",
        "Egypt's legendary multi-layered pastry — hand-stretched paper-thin dough folded over and over with clarified butter (samn) until impossibly flaky and airy. Served fresh from the clay oven with clotted cream, honey and black seed jam. A true Giza morning ritual.",
        "المعجنات الطبقية الأسطورية المصرية — عجينة رقيقة كالورق ممدودة يدوياً ومطوية مراراً مع السمن البلدي حتى تصبح هشة وخفيفة بشكل لا يُصدَّق. تُقدَّم طازجة من الفرن الطيني مع قشطة وعسل ومربى حبة البركة. طقس صباح جيزاوي حقيقي.",
        110.0,
        "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&auto=format&fit=crop&q=90",
        1,
        `{"calories":650,"tags":["vegetarian","buttery","flaky","traditional","wheat","honey"]}`
      ],
      [
        "item-shakshuka", rest2Id, "cat-pyra-breakfast",
        "Classic Egyptian Shakshuka", "شكشوكة مصرية كلاسيكية",
        "Three farm-fresh eggs poached directly in a bubbling cast-iron skillet of slow-cooked tomatoes, sweet peppers, garlic and aromatic Egyptian spices, garnished with crumbled feta, parsley and chili flakes. Served with Baladi bread.",
        "ثلاث بيضات طازجة من المزرعة مسلوقة مباشرة في مقلاة حديدية تفور بطماطم مطبوخة ببطء وفلفل حلو وثوم وبهارات مصرية عطرية، مُزيَّنة بجبن فيتا مفتت وبقدونس ورقائق شيلي. تُقدَّم مع خبز بلدي.",
        95.0,
        "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=800&auto=format&fit=crop&q=90",
        1,
        `{"calories":380,"tags":["vegetarian","eggs","tomato","spicy","gluten-option","iron","protein"]}`
      ],
      [
        "item-liver", rest2Id, "cat-pyra-breakfast",
        "Alexandrian Spiced Liver Sandwich", "ساندوتش كبدة إسكندرانية",
        "Thinly sliced beef liver flash-fried with chili, cumin, garlic, green pepper and a drizzle of lemon in the famous Alexandrian style, served in a fresh-baked Baladi roll with tahina and sliced tomato. Cairo's most beloved street-food breakfast.",
        "شرائح رفيعة من كبدة البتلو مقلية سريعاً مع الشيلي والكمون والثوم والفلفل الأخضر وقطرة ليمون على الطريقة الإسكندرانية الشهيرة، تُقدَّم في خبزة بلدي طازجة مع طحينة وطماطم مشرحة. أشهر إفطار شارع في القاهرة.",
        70.0,
        "https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=800&auto=format&fit=crop&q=90",
        1,
        `{"calories":420,"tags":["halal","spicy","hot","liver","alexandrian","street-food","iron"]}`
      ],
      [
        "item-cheese-plate", rest2Id, "cat-pyra-breakfast",
        "Egyptian Baladi Cheese Platter", "طبق جبن بلدي مصري",
        "A rustic wooden board of sliced white Egyptian Baladi cheese, creamy labneh rolled in za'atar, brined olives, sliced cucumber, ripe tomatoes, green onion and a wedge of fresh lemon. Served with warm baladi bread. Simple, satisfying, timeless.",
        "لوح خشبي ريفي من جبن بلدي مصري أبيض مشرح وجبنة لبنة كريمية بالزعتر وزيتون محلول وخيار مشرح وطماطم ناضجة وبصل أخضر وشريحة ليمون طازج. يُقدَّم مع خبز بلدي دافئ. بسيط ومُشبع وخالد.",
        80.0,
        "https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?w=800&auto=format&fit=crop&q=90",
        1,
        `{"calories":350,"tags":["vegetarian","cheese","olives","tomato","gluten-option","calcium"]}`
      ],

      // ── PYRAMIDS VIEW CAFE ─ Fresh Juices & Smoothies ──────────────────
      [
        "item-orange-juice", rest2Id, "cat-pyra-juices",
        "Fresh Squeezed Orange Juice", "عصير برتقال معصور طازج",
        "Seven freshly hand-squeezed Egyptian Balady oranges, served immediately in a tall chilled glass — no sugar added, no water, no concentrates. Pure liquid sunshine, bursting with Vitamin C.",
        "سبع برتقالات بلدي مصرية معصورة يدوياً طازجة، تُقدَّم فوراً في كوب طويل مُبرَّد — بدون سكر مضاف ولا ماء ولا مركزات. شمس سائلة نقية مفعمة بفيتامين ج.",
        55.0,
        "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=800&auto=format&fit=crop&q=90",
        1,
        `{"calories":110,"tags":["cold","fresh","vitamin-c","no-sugar","gluten-free","vegan","citrus"]}`
      ],
      [
        "item-guava-juice", rest2Id, "cat-pyra-juices",
        "Egyptian Guava Nectar", "عصير جوافة مصرية",
        "Thick, fragrant Egyptian guavas blended until creamy with a touch of cold milk and honey, strained to a velvet-smooth nectar. One of Egypt's most beloved summer flavours — unmistakably Cairo.",
        "جوافة مصرية سميكة وعطرية ممزوجة حتى تصبح كريمية مع قليل من الحليب البارد والعسل، مصفاة إلى رحيق ناعم كالمخمل. أحد نكهات الصيف المصرية الأكثر شعبية — لا تُخطئها القاهرة.",
        60.0,
        "https://images.unsplash.com/photo-1553562912-7b6d2c5a96e0?w=800&auto=format&fit=crop&q=90",
        1,
        `{"calories":150,"tags":["cold","fresh","tropical","vitamin-c","guava","creamy"]}`
      ],
      [
        "item-watermelon", rest2Id, "cat-pyra-juices",
        "Iced Watermelon Juice", "عصير بطيخ مثلج",
        "Seedless watermelon chunks blended fresh with a squeeze of lime and a sprig of mint, served over crushed ice in a salt-rimmed glass. Outrageously hydrating and refreshing on a scorching Giza afternoon.",
        "قطع بطيخ بدون بذور ممزوجة طازجة مع عصرة ليم وغصن نعناع، تُقدَّم على ثلج مجروش في كوب حافته ملح. مرطبة ومنعشة بشكل مذهل في ظهيرة جيزاوية محرقة.",
        50.0,
        "https://images.unsplash.com/photo-1563248369-a5e5d76e81af?w=800&auto=format&fit=crop&q=90",
        1,
        `{"calories":90,"tags":["cold","fresh","hydrating","vegan","gluten-free","no-sugar"]}`
      ],
      [
        "item-mango-smoothie", rest2Id, "cat-pyra-juices",
        "Mango & Banana Power Smoothie", "سموذي مانجو وموز",
        "A thick, tropically indulgent smoothie blending Alphonso mango, ripe banana, Greek yogurt and a spoonful of honey. Packed with natural energy, potassium and vitamins — an ideal post-workout or breakfast-on-the-go.",
        "سموذي كثيف استوائي مُدلِّل يجمع مانجو الفونسو وموز ناضج وزبادي يوناني وملعقة عسل. مليء بالطاقة الطبيعية والبوتاسيوم والفيتامينات — مثالي بعد التمرين أو كوجبة إفطار أثناء التنقل.",
        75.0,
        "https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=800&auto=format&fit=crop&q=90",
        1,
        `{"calories":230,"tags":["cold","thick","tropical","energy","protein","potassium","vegetarian"]}`
      ],

      // ── PYRAMIDS VIEW CAFE ─ Pastries & Sweets ─────────────────────────
      [
        "item-konafa-pyra", rest2Id, "cat-pyra-pastries",
        "Konafa bil Ashta (Cream Kunafa)", "كنافة بالقشطة والكريمة",
        "Pyramids Cafe's signature kunafa — a nest of golden shredded kataifi pastry hugging a luscious heart of house-made ashta (clotted cream) and rose-scented mozzarella, baked in a copper tray and served table-side, still sizzling, soaked in sugar-rose syrup.",
        "كنافة مميزة لمقهى الأهرام — عش من قطايف مبشورة ذهبية تحتضن قلباً شهياً من القشطة الطازجة منزلية الصنع وموزاريلا معطرة بالورد، مخبوزة في صينية نحاسية وتُقدَّم على الطاولة مباشرة وهي لا تزال تطقطق، منقوعة في قطر الورد.",
        80.0,
        "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&auto=format&fit=crop&q=90",
        1,
        `{"calories":490,"tags":["sweet","cream","syrup","pistachio","traditional","wheat","vegetarian"]}`
      ],
      [
        "item-croissant", rest2Id, "cat-pyra-pastries",
        "Butter Croissant (Freshly Baked)", "كرواسان زبدة طازج",
        "A classically laminated all-butter croissant baked in-house every morning until gloriously golden and shatteringly flaky, with a soft pillowy interior. Served warm with apricot jam, Président butter and a dusting of powdered sugar.",
        "كرواسان زبدة كلاسيكي مُرقَّق مخبوز في المقهى كل صباح حتى يصبح ذهبياً رائعاً وهشاً بشكل رائع، مع داخل طري وإسفنجي. يُقدَّم دافئاً مع مربى المشمش وزبدة بريزيدانت ورشة سكر ناعم.",
        45.0,
        "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&auto=format&fit=crop&q=90",
        1,
        `{"calories":340,"tags":["pastry","buttery","flaky","breakfast","wheat","vegetarian"]}`
      ],
      [
        "item-cake-slice", rest2Id, "cat-pyra-pastries",
        "Chef's Daily Cake Slice", "شريحة كيكة الشيف اليومية",
        "Our pastry chef bakes a different celebration cake every morning — from moist carrot & walnut to dark Belgian chocolate ganache, lemon drizzle or strawberry chantilly. Ask your server for today's flavour. Always fresh, always a surprise.",
        "يخبز معلم المعجنات لدينا كيكة احتفالية مختلفة كل صباح — من الجزر والجوز الرطب إلى غاناش الشوكولاتة البلجيكية الداكنة أو عصير الليمون أو شانتيي الفراولة. اسأل خادمك عن نكهة اليوم. دائماً طازجة، دائماً مفاجأة.",
        60.0,
        "https://images.unsplash.com/photo-1519915028121-7d3463d20b13?w=800&auto=format&fit=crop&q=90",
        1,
        `{"calories":380,"tags":["sweet","cake","fresh","daily","seasonal","vegetarian","wheat"]}`
      ],
    ];

    for (const [iId, bId, cId, iName, iNameAr, desc, descAr, price, img, avail, tjson] of menuItemsData) {
      await sql`
        INSERT INTO menu_items (id, business_id, category_id, name, name_ar, description, description_ar, price, image_url, is_available, translations_json)
        VALUES (${iId}, ${bId}, ${cId}, ${iName}, ${iNameAr}, ${desc}, ${descAr}, ${price}, ${img}, ${avail}, ${tjson})
        ON CONFLICT (id) DO UPDATE SET
          name             = EXCLUDED.name,
          name_ar          = EXCLUDED.name_ar,
          description      = EXCLUDED.description,
          description_ar   = EXCLUDED.description_ar,
          price            = EXCLUDED.price,
          image_url        = EXCLUDED.image_url,
          is_available     = EXCLUDED.is_available,
          translations_json = EXCLUDED.translations_json;
      `;
    }

    // Promotions
    await sql`
      INSERT INTO promotions (id, business_id, type, title, title_ar, description, description_ar, item_id, discount_price, status)
      VALUES ('promo-kebab-mix', ${rest1Id}, 'SPECIAL_OFFER', 'Mix Grill Family Special', 'عرض المشويات العائلي',
              'Get 20% off the legendary Mix Grill Platter — perfect for the whole table. Tonight only!',
              'خصم 20% على طبق المشويات المشكلة الأسطوري — مثالي لكامل الطاولة. الليلة فقط!',
              'item-kebab-mix', 360.0, 'ACTIVE')
      ON CONFLICT (id) DO UPDATE SET
        description    = EXCLUDED.description,
        description_ar = EXCLUDED.description_ar,
        discount_price = EXCLUDED.discount_price,
        status         = EXCLUDED.status;
    `;
    await sql`
      INSERT INTO promotions (id, business_id, type, title, title_ar, description, description_ar, item_id, discount_price, status)
      VALUES ('promo-konafa-pyra', ${rest2Id}, 'SPECIAL_OFFER', 'Sunset Kunafa Deal', 'عرض كنافة الغروب',
              'Order Konafa bil Ashta between 5 PM – 7 PM and get it for a special sunset price!',
              'اطلب كنافة بالقشطة بين الساعة 5 و7 مساءً واحصل عليها بسعر خاص لوقت الغروب!',
              'item-konafa-pyra', 60.0, 'ACTIVE')
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
