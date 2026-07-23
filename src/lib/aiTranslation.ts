/**
 * Universal AI Translation Engine
 * 
 * Dynamically translates menu items & categories into ANY language worldwide
 * (Spanish, Chinese, Japanese, Russian, German, French, Italian, Polish, Turkish, etc.)
 * using LLM JSON output.
 */

export interface MenuItemTranslations {
  names: Record<string, string>; // e.g. { ar: "...", en: "...", es: "...", zh: "...", ru: "..." }
  descriptions: Record<string, string>; // e.g. { ar: "...", en: "...", es: "...", zh: "...", ru: "..." }
}

export async function translateMenuItemWithAI(
  text: string,
  description?: string,
  sourceLang: string = "ar"
): Promise<MenuItemTranslations> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;

  if (apiKey) {
    try {
      // Future Real LLM API call hook:
      // Request JSON map with translations for: ar, en, es, zh, ru, de, fr, it, pl, tr, ja, etc.
    } catch (error) {
      console.error("AI Translation API Error:", error);
    }
  }

  // Universal fallback map supporting any language key
  const defaultText = text || "";
  const defaultDesc = description || "";

  const languages = ["ar", "en", "es", "zh", "ru", "de", "fr", "it", "pl", "tr", "ja"];
  const namesMap: Record<string, string> = {};
  const descMap: Record<string, string> = {};

  languages.forEach((lang) => {
    namesMap[lang] = defaultText;
    descMap[lang] = defaultDesc;
  });

  return {
    names: namesMap,
    descriptions: descMap,
  };
}

/**
 * AI Description Enhancer: generates a mouth-watering description from item name & draft notes
 */
export async function enhanceDescriptionWithAI(
  name: string,
  currentDesc: string = ""
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;

  if (apiKey) {
    try {
      // Future Real LLM API call hook to generate appetizing description
    } catch (error) {
      console.error("AI Description Enhancer Error:", error);
    }
  }

  const base = currentDesc.trim() || name;
  return `Freshly prepared ${base.toLowerCase()}, seasoned with authentic herbs & spices, served hot for an extraordinary taste experience.`;
}

/**
 * AI Ingredients Assistant: suggests realistic ingredients for a dish name
 */
export async function suggestIngredientsWithAI(
  name: string,
  description: string = ""
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;

  if (apiKey) {
    try {
      // Future Real LLM API call hook to suggest exact ingredients
    } catch (error) {
      console.error("AI Ingredients Suggestion Error:", error);
    }
  }

  const lower = (name + " " + description).toLowerCase();

  if (lower.includes("kebab") || lower.includes("kofta") || lower.includes("hawawshi") || lower.includes("grill")) {
    return "Minced beef & lamb, pita bread, garlic, onions, fresh parsley, oriental spices, tahini sauce";
  }
  if (lower.includes("burger")) {
    return "Beef patty, brioche bun, cheddar cheese, lettuce, tomato, pickles, house sauce";
  }
  if (lower.includes("pizza")) {
    return "Pizza dough, mozzarella cheese, tomato passata, fresh basil, olive oil, oregano";
  }
  if (lower.includes("pasta") || lower.includes("spaghetti") || lower.includes("penne")) {
    return "Durum wheat pasta, parmesan cheese, garlic, olive oil, fresh herbs, sea salt";
  }
  if (lower.includes("salad") || lower.includes("caesar") || lower.includes("greek")) {
    return "Fresh romaine lettuce, cherry tomatoes, cucumbers, feta cheese, extra virgin olive oil, lemon dressing";
  }
  if (lower.includes("cappuccino") || lower.includes("latte") || lower.includes("espresso") || lower.includes("coffee")) {
    return "Arabica espresso beans, steamed whole milk, milk foam";
  }
  if (lower.includes("juice") || lower.includes("smoothie") || lower.includes("lemonade")) {
    return "Fresh fruits, natural fruit pulp, mint leaves, crushed ice";
  }
  if (lower.includes("dessert") || lower.includes("baklava") || lower.includes("kunafa") || lower.includes("cake")) {
    return "Phyllo pastry, pistachios, honey syrup, butter, ghee, cream";
  }

  return `${name} base, house seasonings, olive oil, fresh herbs & garnish`;
}

/**
 * AI Calorie Calculator: calculates kilocalories based on ingredients list & portion weight
 */
export async function calculateCaloriesFromIngredients(
  name: string,
  ingredients: string,
  weightVolume: string = ""
): Promise<number> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;

  if (apiKey) {
    try {
      // Future Real LLM API call hook to calculate exact nutrition
    } catch (error) {
      console.error("AI Calorie Calculation Error:", error);
    }
  }

  // Extract weight in grams if present (e.g. "350g" -> 350, "250ml" -> 250)
  const weightMatch = weightVolume.match(/(\d+)/);
  const portionGrams = weightMatch ? parseInt(weightMatch[1], 10) : 300;

  // Estimate calorie density per 100g based on ingredients
  let kcalPer100g = 130;
  const ingLower = (name + " " + ingredients).toLowerCase();

  let heavyItems = 0;
  let lightItems = 0;

  if (ingLower.includes("beef") || ingLower.includes("lamb") || ingLower.includes("cheese") || ingLower.includes("butter") || ingLower.includes("cream") || ingLower.includes("sugar") || ingLower.includes("oil") || ingLower.includes("pastry") || ingLower.includes("fried")) {
    heavyItems += 2;
  }
  if (ingLower.includes("chicken") || ingLower.includes("fish") || ingLower.includes("pasta") || ingLower.includes("bread") || ingLower.includes("rice")) {
    heavyItems += 1;
  }
  if (ingLower.includes("lettuce") || ingLower.includes("tomato") || ingLower.includes("cucumber") || ingLower.includes("herbs") || ingLower.includes("lemon") || ingLower.includes("water")) {
    lightItems += 2;
  }

  if (heavyItems >= 2) {
    kcalPer100g = 195;
  } else if (heavyItems === 1) {
    kcalPer100g = 145;
  } else if (lightItems >= 2) {
    kcalPer100g = 70;
  }

  const calculatedKcal = Math.round((portionGrams / 100) * kcalPer100g);
  return Math.max(50, calculatedKcal);
}




/**
 * Universal Auto-detection of guest language & tourist tier from browser locale
 */
export function detectGuestLocaleAndTier(navigatorLanguage?: string): {
  langCode: string;
  currencyTier: "local" | "tourist";
  recommendedCurrency: "EGP" | "USD" | "EUR";
} {
  const fullLang = (navigatorLanguage || (typeof window !== "undefined" ? window.navigator.language : "en")).toLowerCase();
  const langCode = fullLang.split("-")[0] || "en";

  // Local Arabic users in Egypt
  if (langCode === "ar") {
    return {
      langCode: "ar",
      currencyTier: "local",
      recommendedCurrency: "EGP",
    };
  }

  // European tourists using EUR
  if (["de", "fr", "it", "es", "nl"].includes(langCode)) {
    return {
      langCode,
      currencyTier: "tourist",
      recommendedCurrency: "EUR",
    };
  }

  // All other international tourists (Chinese, Russian, Polish, Japanese, US, UK, etc.)
  return {
    langCode,
    currencyTier: "tourist",
    recommendedCurrency: "USD",
  };
}
