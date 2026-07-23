export interface MenuItem {
  id: string;
  name: string;
  name_ar?: string;
  description: string;
  description_ar?: string;
  price: number;
  category: "mains" | "appetizers" | "drinks" | "desserts";
  image: string;
}

/** Processing fee rate applied to bill + tips (5%) */
export const FEE_RATE = 0.05;

export const menuDb: Record<string, MenuItem[]> = {
  "rest-kebab": [
    {
      id: "kebab-1",
      name: "Mixed Grill (Kebab & Kofta)",
      name_ar: "مشاوي مختلطة (كباب وكفتة)",
      description: "Juicy lamb chops, beef kofta, grilled veggies, flatbread",
      description_ar: "ضلوع خروف طازجة وكفتة لحم بقري مع خضار مشوية وخبز بلدي",
      price: 450,
      category: "mains",
      image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=150&auto=format&fit=crop&q=80"
    },
    {
      id: "kebab-2",
      name: "Kofta Platter",
      name_ar: "صينية كفتة",
      description: "Skewered minced beef grilled over charcoal, served with tahini",
      description_ar: "كفتة لحم بقري مشوية على الفحم، مقدمة مع طحينة",
      price: 320,
      category: "mains",
      image: "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=150&auto=format&fit=crop&q=80"
    },
    {
      id: "kebab-3",
      name: "Fattah with Lamb",
      name_ar: "فتة بالخروف",
      description: "Traditional rice, toasted bread, garlic-vinegar sauce, tender lamb",
      description_ar: "أرز وخبز محمص مع صلصة ثوم وخل ولحم خروف طري",
      price: 380,
      category: "mains",
      image: "https://images.unsplash.com/photo-1608897013039-887f21d8c804?w=150&auto=format&fit=crop&q=80"
    },
    {
      id: "kebab-4",
      name: "Hummus with Meat",
      name_ar: "حمص باللحم",
      description: "Creamy hummus topped with spiced warm minced beef and olive oil",
      description_ar: "حمص كريمي مع لحم مفروم دافئ وزيت زيتون",
      price: 150,
      category: "appetizers",
      image: "https://images.unsplash.com/photo-1577906096429-f73cc1c3f270?w=150&auto=format&fit=crop&q=80"
    },
    {
      id: "kebab-5",
      name: "Fresh Mango Juice",
      name_ar: "عصير مانجو طازج",
      description: "Thick, sweet Egyptian mango pulp juice",
      description_ar: "عصير مانجو مصري كثيف وحلو",
      price: 75,
      category: "drinks",
      image: "https://images.unsplash.com/photo-1546173152-3160becbd14a?w=150&auto=format&fit=crop&q=80"
    },
    {
      id: "kebab-6",
      name: "Om Ali",
      name_ar: "أم علي",
      description: "Classic Egyptian bread pudding with nuts and raisins",
      description_ar: "حلوى خبز مصرية كلاسيكية بالمكسرات والزبيب",
      price: 120,
      category: "desserts",
      image: "https://images.unsplash.com/photo-1587314168485-3236d6710814?w=150&auto=format&fit=crop&q=80"
    }
  ],
  "rest-pyramids": [
    {
      id: "pyramids-1",
      name: "Egyptian Breakfast Combo",
      description: "Foul mudammas, falafel, boiled eggs, cheese with tomatoes",
      price: 200,
      category: "mains",
      image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=150&auto=format&fit=crop&q=80"
    },
    {
      id: "pyramids-2",
      name: "Hawawshi",
      description: "Spiced minced meat baked in crispy pita bread",
      price: 220,
      category: "mains",
      image: "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=150&auto=format&fit=crop&q=80"
    },
    {
      id: "pyramids-3",
      name: "Koshary",
      description: "Rice, macaroni, lentils, spicy tomato sauce, garlic vinegar, crispy onions",
      price: 130,
      category: "mains",
      image: "https://images.unsplash.com/photo-1626132647523-66f5bf380027?w=150&auto=format&fit=crop&q=80"
    },
    {
      id: "pyramids-4",
      name: "Mint Tea Pot",
      description: "Traditional black tea with fresh mint leaves",
      price: 90,
      category: "drinks",
      image: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=150&auto=format&fit=crop&q=80"
    },
    {
      id: "pyramids-5",
      name: "Shisha Double Apple",
      description: "Premium molasses with double apple flavor",
      price: 180,
      category: "drinks",
      image: "https://images.unsplash.com/photo-1527156278759-ece3962ccf84?w=150&auto=format&fit=crop&q=80"
    },
    {
      id: "pyramids-6",
      name: "Baklava Plate",
      description: "Layers of phyllo pastry filled with nuts and sweetened with syrup",
      price: 140,
      category: "desserts",
      image: "https://images.unsplash.com/photo-1519676867240-f03562e64548?w=150&auto=format&fit=crop&q=80"
    }
  ]
};

export const defaultMenuItems: MenuItem[] = [
  {
    id: "default-1",
    name: "Chef's Special Grill",
    name_ar: "شواء خاص الشيف",
    description: "Our unique daily selection grilled over premium coal",
    description_ar: "تشكيلة يومية مميزة مشوية على فحم فاخر",
    price: 300,
    category: "mains",
    image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=150&auto=format&fit=crop&q=80"
  },
  {
    id: "default-2",
    name: "Traditional Green Salad",
    name_ar: "سلطة خضراء تقليدية",
    description: "Fresh local herbs, tomatoes, cucumbers, olive oil and lemon",
    description_ar: "أعشاب طازجة وطماطم وخيار بزيت زيتون وليمون",
    price: 110,
    category: "appetizers",
    image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=150&auto=format&fit=crop&q=80"
  },
  {
    id: "default-3",
    name: "Cold Beverage",
    name_ar: "مشروب بارد",
    description: "Assorted sodas or mineral water",
    description_ar: "مياه غازية أو مياه معدنية",
    price: 60,
    category: "drinks",
    image: "https://images.unsplash.com/photo-1497534446932-c925b458314e?w=150&auto=format&fit=crop&q=80"
  }
];

export const EXCHANGE_RATE = 48.5;
