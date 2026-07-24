"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import styles from "@/app/business/dashboard/business.module.css";
import { Button } from "@/components/ui/button";
import PromotionsManagerClient from "@/app/business/promotions/PromotionsManagerClient";
import {
  updateTipSettings,
  updateBusinessType,
  withdrawBusinessBalance,
  createSpot,
  deleteSpot,
  addIndividualToBusiness,
  findIndividualByEmail,
  linkIndividualToBusiness,
  unlinkIndividualFromBusiness,
  updateMemberRole,
  createCategory,
  deleteCategory,
  createMenuItem,
  updateMenuItem,
  toggleStopList,
  deleteMenuItem,
  enhanceItemDescription,
  updateExchangeRates,
  uploadMenuImage,
  updateBusinessDetails,
  updateAccountPassword,
  suggestItemIngredients,
  calculateItemCalories
} from "@/app/actions/business";
import { getOrCreateInviteLink, regenerateInviteLink } from "@/app/actions/invites";
import { SystemRole } from "@/lib/roles";

interface BusinessData {
  id: string;
  name: string;
  logo_url: string | null;
  currency: string;
  tip_distribution_mode: string;
  individual_percentage: number;
  balance: number;
  address: string | null;
  city?: string | null;
  business_type: string;
  usd_rate?: number;
  eur_rate?: number;
}

interface WaiterData {
  id: string;
  name: string;
  email: string;
  balance: number;
  role: string;
  avatar_url: string | null;
}

interface SpotData {
  id: string;
  number: number;
  label: string;
  short_code: string;
  assigned_individual_id: string | null;
}

interface CategoryData {
  id: string;
  name: string;
  sort_order: number;
}

interface MenuItemData {
  id: string;
  category_id: string | null;
  category_name?: string | null;
  name: string;
  price: number;
  description: string | null;
  image_url?: string | null;
  weight_volume?: string | null;
  ingredients?: string | null;
  spiciness?: number;
  dietary_tags?: string | null;
  calories?: number | null;
  is_available: number;
}

interface Props {
  restaurant: BusinessData;
  waiters: WaiterData[];
  spots: SpotData[];
  categories: CategoryData[];
  menuItems: MenuItemData[];
  managerUser?: { id: string; name: string; email: string; role_id: number } | null;
  promotions?: any[];
}

export default function BusinessSettingsClient({ restaurant, waiters, spots, categories, menuItems, managerUser, promotions = [] }: Props) {
  const [activeSubTab, setActiveSubTab] = useState<"general" | "menu" | "spots" | "team" | "account" | "promotions">("general");

  // General & Tipping state
  const [businessName, setBusinessName] = useState(restaurant.name || "");
  const [businessCity, setBusinessCity] = useState(restaurant.city || "");
  const [businessAddress, setBusinessAddress] = useState(restaurant.address || "");
  const [businessType, setBusinessType] = useState(restaurant.business_type || "RESTAURANT");
  const [tipMode, setTipMode] = useState(restaurant.tip_distribution_mode || "INDIVIDUAL");
  const [waiterPct, setWaiterPct] = useState(restaurant.individual_percentage.toString());
  const [usdRate, setUsdRate] = useState((restaurant.usd_rate || 50.0).toString());
  const [eurRate, setEurRate] = useState((restaurant.eur_rate || 55.0).toString());
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Spot creation state
  const [spotLabel, setSpotLabel] = useState("");
  const [spotLoading, setSpotLoading] = useState(false);

  // Staff management state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [staffInviteToken, setStaffInviteToken] = useState<string | null>(null);
  const [staffCopied, setStaffCopied] = useState(false);
  const [staffInviteLoading, setStaffInviteLoading] = useState(false);
  const [editingRoles, setEditingRoles] = useState<Record<string, string>>({});

  useEffect(() => {
    if (addModalOpen && restaurant.id) {
      setStaffInviteLoading(true);
      getOrCreateInviteLink(restaurant.id, "STAFF").then((res) => {
        setStaffInviteLoading(false);
        if (res.success && res.token) {
          setStaffInviteToken(res.token);
        }
      });
    }
  }, [addModalOpen, restaurant.id]);

  // Menu & Services local reactive state
  const [localCategories, setLocalCategories] = useState<CategoryData[]>(categories);
  const [localMenuItems, setLocalMenuItems] = useState<MenuItemData[]>(menuItems);
  const [newCatName, setNewCatName] = useState("");
  const [catLoading, setCatLoading] = useState(false);
  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemCatId, setItemCatId] = useState("");
  const [itemDesc, setItemDesc] = useState("");
  const [itemWeightVal, setItemWeightVal] = useState("");
  const [itemWeightUnit, setItemWeightUnit] = useState("g");
  const [itemIngredients, setItemIngredients] = useState("");
  const [itemSpiciness, setItemSpiciness] = useState<number>(0);
  const [itemCalories, setItemCalories] = useState("");
  const [itemDietaryTags, setItemDietaryTags] = useState<string[]>([]);
  const [itemImageBase64, setItemImageBase64] = useState<string | null>(null);
  const [itemImagePreview, setItemImagePreview] = useState<string | null>(null);
  const [itemLoading, setItemLoading] = useState(false);
  const [enhancingDesc, setEnhancingDesc] = useState(false);
  const [suggestingIngredients, setSuggestingIngredients] = useState(false);
  const [calculatingCalories, setCalculatingCalories] = useState(false);

  // Search and Edit Modal states
  const [catalogSearch, setCatalogSearch] = useState("");
  const [editingItem, setEditingItem] = useState<MenuItemData | null>(null);
  const [editItemName, setEditItemName] = useState("");
  const [editItemPrice, setEditItemPrice] = useState("");
  const [editItemCatId, setEditItemCatId] = useState("");
  const [editItemDesc, setEditItemDesc] = useState("");
  const [editItemWeightVal, setEditItemWeightVal] = useState("");
  const [editItemWeightUnit, setEditItemWeightUnit] = useState("g");
  const [editItemIngredients, setEditItemIngredients] = useState("");
  const [editItemSpiciness, setEditItemSpiciness] = useState<number>(0);
  const [editItemCalories, setEditItemCalories] = useState("");
  const [editItemDietaryTags, setEditItemDietaryTags] = useState<string[]>([]);
  const [editItemImageBase64, setEditItemImageBase64] = useState<string | null>(null);
  const [editItemImagePreview, setEditItemImagePreview] = useState<string | null>(null);
  const [editItemLoading, setEditItemLoading] = useState(false);
  const [editEnhancingDesc, setEditEnhancingDesc] = useState(false);
  const [editSuggestingIngredients, setEditSuggestingIngredients] = useState(false);
  const [editCalculatingCalories, setEditCalculatingCalories] = useState(false);


  // Account & Security state
  const [currPass, setCurrPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [passLoading, setPassLoading] = useState(false);
  const [passSuccess, setPassSuccess] = useState("");
  const [passError, setPassError] = useState("");

  // General settings handler
  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateBusinessDetails({
      businessId: restaurant.id,
      name: businessName.trim() || restaurant.name,
      city: businessCity.trim() || undefined,
      address: businessAddress.trim() || undefined,
    });
    await updateTipSettings({
      businessId: restaurant.id,
      mode: tipMode,
      individualPercentage: parseFloat(waiterPct) || 100.0,
    });
    await updateBusinessType({
      businessId: restaurant.id,
      type: businessType,
    });
    await updateExchangeRates({
      businessId: restaurant.id,
      usdRate: parseFloat(usdRate) || 50.0,
      eurRate: parseFloat(eurRate) || 55.0,
    });
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 3000);
  };

  // Spot creation handler
  const handleCreateSpot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spotLabel.trim()) return;
    setSpotLoading(true);
    await createSpot({ businessId: restaurant.id, label: spotLabel.trim() });
    setSpotLabel("");
    setSpotLoading(false);
    window.location.reload();
  };



  // Create category handler
  const handleCreateCat = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCatName.trim();
    if (!name) return;
    setCatLoading(true);
    const res = await createCategory({ businessId: restaurant.id, name });
    setCatLoading(false);
    if (res.success) {
      setNewCatName("");
      setLocalCategories((prev) => [...prev, { id: `cat-${Date.now()}`, name, sort_order: prev.length + 1 }]);
    }
  };

  // Quick-add preset category handler
  const handleAddPresetCat = async (catName: string) => {
    setCatLoading(true);
    const res = await createCategory({ businessId: restaurant.id, name: catName });
    setCatLoading(false);
    if (res.success) {
      setLocalCategories((prev) => [...prev, { id: `cat-${Date.now()}`, name: catName, sort_order: prev.length + 1 }]);
    }
  };

  // Delete category handler
  const handleDeleteCat = async (catId: string, catName: string) => {
    if (!confirm(`Delete category "${catName}"?`)) return;
    setLocalCategories((prev) => prev.filter((c) => c.id !== catId));
    await deleteCategory({ categoryId: catId });
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setItemImageBase64(base64);
      setItemImagePreview(base64);
    };
    reader.readAsDataURL(file);
  };

  // Create menu item handler
  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(itemPrice);
    if (!itemName.trim() || isNaN(priceNum)) return;
    setItemLoading(true);

    let uploadedUrl: string | undefined = undefined;
    if (itemImageBase64) {
      const uploadRes = await uploadMenuImage(itemImageBase64);
      if (uploadRes.success && uploadRes.url) {
        uploadedUrl = uploadRes.url;
      }
    }

    const combinedWeight = itemWeightVal.trim() ? `${itemWeightVal.trim()}${itemWeightUnit}` : undefined;
    const res = await createMenuItem({
      businessId: restaurant.id,
      name: itemName.trim(),
      price: priceNum,
      categoryId: itemCatId || undefined,
      description: itemDesc.trim() || undefined,
      imageUrl: uploadedUrl,
      weightVolume: combinedWeight,
      ingredients: itemIngredients.trim() || undefined,
      spiciness: itemSpiciness,
      dietaryTags: itemDietaryTags,
      calories: itemCalories ? parseInt(itemCalories, 10) : undefined,
    });
    setItemLoading(false);
    if (res.success) {
      const selectedCat = localCategories.find((c) => c.id === itemCatId);
      const newItem: MenuItemData = {
        id: res.id || `item-${Date.now()}`,
        category_id: itemCatId || null,
        category_name: selectedCat ? selectedCat.name : "General",
        name: itemName.trim(),
        price: priceNum,
        description: itemDesc.trim() || null,
        image_url: uploadedUrl || null,
        weight_volume: combinedWeight || null,
        ingredients: itemIngredients.trim() || null,
        spiciness: itemSpiciness,
        dietary_tags: itemDietaryTags.length > 0 ? JSON.stringify(itemDietaryTags) : null,
        calories: itemCalories ? parseInt(itemCalories, 10) : null,
        is_available: 1,
      };
      setLocalMenuItems((prev) => [newItem, ...prev]);
      setItemName("");
      setItemPrice("");
      setItemDesc("");
      setItemWeightVal("");
      setItemIngredients("");
      setItemSpiciness(0);
      setItemCalories("");
      setItemDietaryTags([]);
      setItemImageBase64(null);
      setItemImagePreview(null);
    }
  };

  // Toggle Stop List handler
  const handleToggleStopList = async (itemId: string, currentAvailable: number) => {
    const nextAvailable = currentAvailable === 1 ? 0 : 1;
    setLocalMenuItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, is_available: nextAvailable } : item))
    );
    await toggleStopList({ itemId, isAvailable: nextAvailable });
  };

  // Delete menu item handler
  const handleDeleteMenuItem = async (itemId: string, name: string) => {
    if (!confirm(`Delete ${name}?`)) return;
    setLocalMenuItems((prev) => prev.filter((item) => item.id !== itemId));
    await deleteMenuItem({ itemId });
  };

  // Open Edit Modal
  const handleOpenEdit = (item: MenuItemData) => {
    setEditingItem(item);
    setEditItemName(item.name);
    setEditItemPrice(item.price.toString());
    setEditItemCatId(item.category_id || "");
    setEditItemDesc(item.description || "");

    // Parse weight/unit
    if (item.weight_volume) {
      const match = item.weight_volume.match(/^(\d+)(.*)$/);
      if (match) {
        setEditItemWeightVal(match[1]);
        setEditItemWeightUnit(match[2] || "g");
      } else {
        setEditItemWeightVal(item.weight_volume);
        setEditItemWeightUnit("g");
      }
    } else {
      setEditItemWeightVal("");
      setEditItemWeightUnit("g");
    }

    setEditItemIngredients(item.ingredients || "");
    setEditItemSpiciness(item.spiciness || 0);
    setEditItemCalories(item.calories ? item.calories.toString() : "");

    // Parse dietary tags
    if (item.dietary_tags) {
      try {
        setEditItemDietaryTags(JSON.parse(item.dietary_tags));
      } catch {
        setEditItemDietaryTags([]);
      }
    } else {
      setEditItemDietaryTags([]);
    }

    setEditItemImagePreview(item.image_url || null);
    setEditItemImageBase64(null);
  };

  // Save Edit Item
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const priceNum = parseFloat(editItemPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      alert("Please enter a valid price");
      return;
    }

    setEditItemLoading(true);

    let uploadedUrl = editItemImagePreview;
    if (editItemImageBase64) {
      const uploadRes = await uploadMenuImage(editItemImageBase64);
      if (uploadRes.success && uploadRes.url) {
        uploadedUrl = uploadRes.url;
      }
    }

    const combinedWeight = editItemWeightVal.trim() ? `${editItemWeightVal.trim()}${editItemWeightUnit}` : undefined;

    const res = await updateMenuItem({
      itemId: editingItem.id,
      name: editItemName.trim(),
      price: priceNum,
      categoryId: editItemCatId || undefined,
      description: editItemDesc.trim() || undefined,
      imageUrl: uploadedUrl || undefined,
      weightVolume: combinedWeight,
      ingredients: editItemIngredients.trim() || undefined,
      spiciness: editItemSpiciness,
      dietaryTags: editItemDietaryTags,
      calories: editItemCalories ? parseInt(editItemCalories, 10) : undefined,
    });

    setEditItemLoading(false);

    if (res.success) {
      const selectedCat = localCategories.find((c) => c.id === editItemCatId);
      setLocalMenuItems((prev) =>
        prev.map((item) =>
          item.id === editingItem.id
            ? {
                ...item,
                name: editItemName.trim(),
                price: priceNum,
                category_id: editItemCatId || null,
                category_name: selectedCat ? selectedCat.name : "General",
                description: editItemDesc.trim() || null,
                image_url: uploadedUrl || null,
                weight_volume: combinedWeight || null,
                ingredients: editItemIngredients.trim() || null,
                spiciness: editItemSpiciness,
                dietary_tags: editItemDietaryTags.length > 0 ? JSON.stringify(editItemDietaryTags) : null,
                calories: editItemCalories ? parseInt(editItemCalories, 10) : null,
              }
            : item
        )
      );
      setEditingItem(null);
    } else {
      alert(res.error || "Failed to update item");
    }
  };

  // Delete from Edit Modal
  const handleDeleteFromEdit = async () => {
    if (!editingItem) return;
    if (!confirm(`Delete ${editingItem.name}?`)) return;
    setLocalMenuItems((prev) => prev.filter((item) => item.id !== editingItem.id));
    setEditingItem(null);
    await deleteMenuItem({ itemId: editingItem.id });
  };



  // AI Suggest Ingredients handler
  const handleSuggestIngredients = async () => {
    if (!itemName.trim()) return;
    setSuggestingIngredients(true);
    const res = await suggestItemIngredients({ name: itemName.trim(), description: itemDesc.trim() });
    setSuggestingIngredients(false);
    if (res.success && res.ingredients) {
      setItemIngredients(res.ingredients);
    }
  };

  // AI Calculate Calories handler
  const handleCalculateCalories = async () => {
    if (!itemName.trim()) return;
    setCalculatingCalories(true);
    const combinedWeight = itemWeightVal.trim() ? `${itemWeightVal.trim()}${itemWeightUnit}` : "";
    const res = await calculateItemCalories({
      name: itemName.trim(),
      ingredients: itemIngredients.trim(),
      weightVolume: combinedWeight,
    });
    setCalculatingCalories(false);
    if (res.success && res.calories) {
      setItemCalories(res.calories.toString());
    }
  };

  // AI Enhance Description handler
  const handleEnhanceDesc = async () => {
    if (!itemName.trim()) return;
    setEnhancingDesc(true);
    const res = await enhanceItemDescription({ name: itemName.trim(), currentDesc: itemDesc.trim() });
    setEnhancingDesc(false);
    if (res.success && res.enhanced) {
      setItemDesc(res.enhanced);
    }
  };

  // Account Password Update Handler
  const handleUpdatePass = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError("");
    setPassSuccess("");

    if (!newPass || newPass.length < 6) {
      setPassError("New password must be at least 6 characters long");
      return;
    }

    if (newPass !== confirmPass) {
      setPassError("Passwords do not match");
      return;
    }

    if (!managerUser?.id) {
      setPassError("Manager account not found");
      return;
    }

    setPassLoading(true);
    const res = await updateAccountPassword({
      userId: managerUser.id,
      currentPassword: currPass,
      newPassword: newPass,
    });
    setPassLoading(false);

    if (res.success) {
      setPassSuccess("Password updated successfully!");
      setCurrPass("");
      setNewPass("");
      setConfirmPass("");
    } else {
      setPassError(res.error || "Failed to update password");
    }
  };


  return (
    <div className={styles.container}>
      {/* Top Header */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: "24px" }}>
        <div className="flex items-center gap-3">
          <Link href="/business/dashboard" title="Back">
            <Button variant="ghost" size="icon-sm">
              <ArrowLeft className="w-4 h-4" />
              <span className="sr-only">Back</span>
            </Button>
          </Link>
          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--foreground)", margin: 0 }}>Settings</h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: "4px 0 0" }}>{restaurant.name}</p>
          </div>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className={styles.tabs} style={{ marginBottom: "24px" }}>
        <button
          className={`${styles.tab} ${activeSubTab === "general" ? styles.activeTab : ""}`}
          onClick={() => setActiveSubTab("general")}
        >
          General & Tipping
        </button>
        <button
          className={`${styles.tab} ${activeSubTab === "menu" ? styles.activeTab : ""}`}
          onClick={() => setActiveSubTab("menu")}
        >
          Menu & Services
        </button>
        <button
          className={`${styles.tab} ${activeSubTab === "promotions" ? styles.activeTab : ""}`}
          onClick={() => setActiveSubTab("promotions")}
        >
          Promotions
        </button>
        <button
          className={`${styles.tab} ${activeSubTab === "spots" ? styles.activeTab : ""}`}
          onClick={() => setActiveSubTab("spots")}
        >
          Tables & Spots
        </button>
        <button
          className={`${styles.tab} ${activeSubTab === "team" ? styles.activeTab : ""}`}
          onClick={() => setActiveSubTab("team")}
        >
          Team & Staff
        </button>
        <button
          className={`${styles.tab} ${activeSubTab === "account" ? styles.activeTab : ""}`}
          onClick={() => setActiveSubTab("account")}
        >
          Account & Security
        </button>
      </div>

      {/* TAB 1: General & Tipping */}
      {activeSubTab === "general" && (
        <form onSubmit={handleSaveGeneral} className={styles.settingsCard}>
          {settingsSaved && (
            <div style={{ background: "rgba(34,197,94,0.1)", border: "1px solid #22c55e", color: "#22c55e", padding: "10px", borderRadius: "8px", fontSize: "0.85rem", marginBottom: "16px", textAlign: "center" }}>
              Configuration settings saved successfully!
            </div>
          )}

          {/* Business Profile Details */}
          <div className={styles.settingsRow}>
            <label className={styles.settingsLabel}>Business Name</label>
            <p className={styles.settingsDesc}>The public name of your restaurant, hotel, salon, or venue displayed on receipts & QR menus.</p>
            <input
              type="text"
              className={styles.input}
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Pyramids View Lounge"
              required
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "12px", marginBottom: "16px" }}>
            <div>
              <label className={styles.settingsLabel}>City / Region</label>
              <p className={styles.settingsDesc}>City location.</p>
              <input
                type="text"
                className={styles.input}
                value={businessCity}
                onChange={(e) => setBusinessCity(e.target.value)}
                placeholder="e.g. Sharm El Sheikh"
              />
            </div>
            <div>
              <label className={styles.settingsLabel}>Street Address / Location</label>
              <p className={styles.settingsDesc}>Full street address or area.</p>
              <input
                type="text"
                className={styles.input}
                value={businessAddress}
                onChange={(e) => setBusinessAddress(e.target.value)}
                placeholder="e.g. Peace Road, Naama Bay"
              />
            </div>
          </div>

          <div className={styles.settingsRow}>
            <label className={styles.settingsLabel}>Business Category / Type</label>
            <p className={styles.settingsDesc}>Select the vertical that matches your business model to tailor labels.</p>
            <select className={styles.select} value={businessType} onChange={(e) => setBusinessType(e.target.value)}>
              <option value="RESTAURANT">Restaurant / Cafe / Bar</option>
              <option value="HOTEL">Hotel / Resort / Hospitality</option>
              <option value="SALON">Barbershop / Beauty Salon / Spa</option>
              <option value="DELIVERY">Delivery / Courier Fleet</option>
              <option value="CAR_WASH">Car Wash / Valet Service</option>
              <option value="OTHER">Other Service Business</option>
            </select>
          </div>

          <div className={styles.settingsRow}>
            <label className={styles.settingsLabel}>Tip Distribution Mode</label>
            <p className={styles.settingsDesc}>Choose how tips left by guests are shared among your staff members.</p>
            <select className={styles.select} value={tipMode} onChange={(e) => setTipMode(e.target.value)}>
              <option value="INDIVIDUAL">Direct to Server (100% to assigned staff member)</option>
              <option value="EQUAL_SPLIT">Pool & Split Equally (shared among team)</option>
            </select>
          </div>

          {tipMode === "INDIVIDUAL" && (
            <div className={styles.settingsRow}>
              <label className={styles.settingsLabel}>Staff Percentage (%)</label>
              <p className={styles.settingsDesc}>Percentage that goes directly to the serving staff. The rest goes to the company pool.</p>
              <input type="number" min="0" max="100" className={styles.input} value={waiterPct} onChange={(e) => setWaiterPct(e.target.value)} />
            </div>
          )}

          <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px dashed var(--card-border)" }}>
            <h4 style={{ color: "var(--foreground)", margin: "0 0 4px", fontSize: "0.95rem" }}>Custom Tourist Exchange Rates</h4>
            <p className={styles.settingsDesc}>Set your internal exchange rate for tourist bill conversion and international guest payments.</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "10px" }}>
              <div>
                <label className={styles.settingsLabel}>1 USD = (in {restaurant.currency})</label>
                <input
                  type="number"
                  step="0.5"
                  className={styles.input}
                  value={usdRate}
                  onChange={(e) => setUsdRate(e.target.value)}
                  placeholder="50.0"
                />
              </div>
              <div>
                <label className={styles.settingsLabel}>1 EUR = (in {restaurant.currency})</label>
                <input
                  type="number"
                  step="0.5"
                  className={styles.input}
                  value={eurRate}
                  onChange={(e) => setEurRate(e.target.value)}
                  placeholder="55.0"
                />
              </div>
            </div>
          </div>

          <button type="submit" className={styles.primaryBtn} style={{ marginTop: "20px" }}>
            Save Configuration
          </button>
        </form>
      )}

      {/* TAB 2: Menu & Services */}
      {activeSubTab === "menu" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Category Setup Card */}
          <div className={styles.settingsCard}>
            <h3 style={{ color: "var(--foreground)", margin: "0 0 6px" }}>Menu Categories</h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "16px" }}>
              Organize your dishes or services into categories. Click a preset to add it instantly or type a custom category.
            </p>

            {/* Presets Row */}
            <div style={{ marginBottom: "14px" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "6px" }}>Quick Add Presets</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {(businessType === "SALON"
                  ? ["Haircut & Styling", "Coloring", "Nails & Manicure", "Beard & Shave", "Spa & Facial"]
                  : businessType === "HOTEL"
                  ? ["Room Service", "Breakfast", "Laundry", "Amenities", "Spa"]
                  : ["Mains", "Appetizers", "Drinks", "Desserts", "Salads", "Specials"]
                ).map((preset) => {
                  const alreadyAdded = localCategories.some((c) => c.name.toLowerCase() === preset.toLowerCase());
                  if (alreadyAdded) return null;
                  return (
                    <button
                      key={preset}
                      type="button"
                      disabled={catLoading}
                      onClick={() => handleAddPresetCat(preset)}
                      style={{ fontSize: "0.78rem", fontWeight: 700, padding: "4px 10px", borderRadius: 6, border: "1px dashed var(--primary)", background: "rgba(var(--primary-rgb),0.05)", color: "var(--primary)", cursor: "pointer" }}
                    >
                      + {preset}
                    </button>
                  );
                })}
              </div>
            </div>

            <form onSubmit={handleCreateCat} style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
              <input
                type="text"
                className={styles.input}
                placeholder="Custom Category Name (e.g. Signature Cocktails)"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                style={{ flex: 1 }}
              />
              <button type="submit" className={styles.primaryBtn} disabled={catLoading || !newCatName.trim()}>
                Add Category
              </button>
            </form>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {localCategories.length === 0 ? (
                <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>No categories added yet. Click a preset above or type one.</span>
              ) : (
                localCategories.map((c) => (
                  <div
                    key={c.id}
                    style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "6px 12px", borderRadius: 20, background: "var(--input-bg)", border: "1px solid var(--card-border)", fontSize: "0.83rem", fontWeight: 600 }}
                  >
                    <span>{c.name}</span>
                    <button
                      type="button"
                      style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontWeight: 800, padding: 0 }}
                      onClick={() => handleDeleteCat(c.id, c.name)}
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Add Item Card */}
          <form onSubmit={handleCreateItem} className={styles.settingsCard}>
            <h3 style={{ color: "var(--foreground)", margin: "0 0 6px" }}>
              {businessType === "SALON"
                ? "Add Salon Service / Treatment"
                : businessType === "HOTEL"
                ? "Add Hotel Service / Room Service Item"
                : businessType === "CAR_WASH"
                ? "Add Car Wash / Valet Option"
                : businessType === "DELIVERY"
                ? "Add Courier / Delivery Option"
                : "Add Menu Dish / Drink"}
            </h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "16px" }}>
              Add items that will appear on your customer QR menu and in staff bill creation.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* Row 1: Basic Info */}
              <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", gap: "8px" }}>
                <input
                  type="text"
                  className={styles.input}
                  placeholder={
                    businessType === "SALON"
                      ? "Service Name (e.g. Haircut & Styling)"
                      : businessType === "HOTEL"
                      ? "Item / Service (e.g. Club Sandwich)"
                      : "Dish / Drink Name (e.g. Cappuccino)"
                  }
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  required
                />
                <input
                  type="number"
                  step="0.5"
                  className={styles.input}
                  placeholder={`Price (${restaurant.currency})`}
                  value={itemPrice}
                  onChange={(e) => setItemPrice(e.target.value)}
                  required
                />
                <select
                  className={styles.select}
                  value={itemCatId}
                  onChange={(e) => setItemCatId(e.target.value)}
                >
                  <option value="">No Category</option>
                  {localCategories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              {/* Row 2: Multiline Auto-Expanding Description & Embedded AI Enhance */}
              <div style={{ position: "relative", width: "100%", minHeight: 42 }}>
                <textarea
                  className={styles.input}
                  placeholder="Description / details (e.g. Double shot espresso with steamed milk foam)"
                  value={itemDesc}
                  onInput={(e: React.FormEvent<HTMLTextAreaElement>) => {
                    const target = e.currentTarget;
                    target.style.height = "auto";
                    target.style.height = `${Math.max(42, target.scrollHeight)}px`;
                  }}
                  onChange={(e) => setItemDesc(e.target.value)}
                  rows={1}
                  style={{
                    paddingRight: "125px",
                    minHeight: 42,
                    height: "42px",
                    paddingTop: "10px",
                    paddingBottom: "10px",
                    resize: "none",
                    overflow: "hidden",
                    lineHeight: "1.4",
                    fontFamily: "inherit",
                    transition: "height 0.15s ease",
                  }}
                />
                <button
                  type="button"
                  disabled={enhancingDesc || !itemName.trim()}
                  onClick={handleEnhanceDesc}
                  style={{
                    position: "absolute",
                    right: 6,
                    top: 6,
                    height: 30,
                    padding: "0 10px",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    borderRadius: 7,
                    border: "none",
                    background: "rgba(var(--primary-rgb),0.12)",
                    color: "var(--primary)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    whiteSpace: "nowrap",
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"/>
                  </svg>
                  <span>{enhancingDesc ? "Enhancing…" : "AI Enhance"}</span>
                </button>
              </div>

              {/* Row 3: Vertical-Specific Attributes */}
              {businessType === "RESTAURANT" || !businessType ? (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.2fr", gap: "8px" }}>
                    {/* Merged Number + Unit selector container */}
                    <div style={{ display: "flex", alignItems: "center", background: "var(--input-bg)", border: "1px solid var(--card-border)", borderRadius: 10, overflow: "hidden", height: 42 }}>
                      <input
                        type="number"
                        placeholder="Portion Size"
                        value={itemWeightVal}
                        onChange={(e) => setItemWeightVal(e.target.value)}
                        style={{ flex: 1, border: "none", background: "transparent", outline: "none", padding: "0 12px", fontSize: "0.88rem", color: "var(--foreground)", height: "100%" }}
                      />
                      <select
                        value={itemWeightUnit}
                        onChange={(e) => setItemWeightUnit(e.target.value)}
                        style={{
                          appearance: "none",
                          WebkitAppearance: "none",
                          border: "none",
                          background: "rgba(var(--primary-rgb),0.06) url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23b58a1c' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\") no-repeat right 10px center / 10px 10px",
                          borderLeft: "1px solid var(--card-border)",
                          outline: "none",
                          fontSize: "0.82rem",
                          fontWeight: 700,
                          color: "var(--primary)",
                          cursor: "pointer",
                          padding: "0 26px 0 10px",
                          height: "100%",
                        }}
                      >
                        <option value="g">g</option>
                        <option value="kg">kg</option>
                        <option value="ml">ml</option>
                        <option value="L">L</option>
                        <option value="min">min</option>
                        <option value="pcs">pcs</option>
                      </select>
                    </div>

                    <select
                      className={styles.select}
                      value={itemSpiciness}
                      onChange={(e) => setItemSpiciness(parseInt(e.target.value, 10))}
                      style={{ height: 42 }}
                    >
                      <option value={0}>Not Spicy</option>
                      <option value={1}>Mild</option>
                      <option value={2}>Medium</option>
                      <option value={3}>Hot</option>
                    </select>

                    {/* Embedded Calories AI Calculate */}
                    <div style={{ position: "relative", width: "100%", height: 42 }}>
                      <input
                        type="number"
                        className={styles.input}
                        placeholder="Calories (kcal)"
                        value={itemCalories}
                        onChange={(e) => setItemCalories(e.target.value)}
                        style={{ paddingRight: "115px", height: 42 }}
                      />
                      <button
                        type="button"
                        disabled={calculatingCalories || !itemName.trim()}
                        onClick={handleCalculateCalories}
                        style={{
                          position: "absolute",
                          right: 5,
                          top: 5,
                          height: 32,
                          padding: "0 8px",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          borderRadius: 7,
                          border: "none",
                          background: "rgba(var(--primary-rgb),0.12)",
                          color: "var(--primary)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"/>
                        </svg>
                        <span>{calculatingCalories ? "Calculating…" : "AI Calculate"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Embedded Ingredients AI Suggest */}
                  <div style={{ position: "relative", width: "100%", height: 42 }}>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="Ingredients / Composition (e.g. Veal beef, garlic, oriental spices, tahini, pita)"
                      value={itemIngredients}
                      onChange={(e) => setItemIngredients(e.target.value)}
                      style={{ paddingRight: "115px", height: 42 }}
                    />
                    <button
                      type="button"
                      disabled={suggestingIngredients || !itemName.trim()}
                      onClick={handleSuggestIngredients}
                      style={{
                        position: "absolute",
                        right: 5,
                        top: 5,
                        height: 32,
                        padding: "0 8px",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        borderRadius: 7,
                        border: "none",
                        background: "rgba(var(--primary-rgb),0.12)",
                        color: "var(--primary)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"/>
                      </svg>
                      <span>{suggestingIngredients ? "Suggesting…" : "AI Suggest"}</span>
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "8px" }}>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder={businessType === "SALON" ? "Service Duration (e.g. 45 min)" : "Duration / Spec (e.g. 30 min)"}
                    value={itemWeightVal}
                    onChange={(e) => setItemWeightVal(e.target.value)}
                  />
                  <input
                    type="text"
                    className={styles.input}
                    placeholder={businessType === "SALON" ? "Products / Technique (e.g. Organic L'Oréal Keratin)" : "Service Notes / Inclusions"}
                    value={itemIngredients}
                    onChange={(e) => setItemIngredients(e.target.value)}
                  />
                </div>
              )}

              {/* Row 4: Contextual Highlights & Badges */}
              <div>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "6px" }}>
                  Highlights & Badges
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {(businessType === "SALON"
                    ? ["Master Special", "Express Service", "Organic Care", "Includes Wash", "Premium Care"]
                    : businessType === "HOTEL"
                    ? ["In-Room Delivery", "Complimentary", "Express Service", "Chef Special", "Halal"]
                    : businessType === "CAR_WASH" || businessType === "DELIVERY"
                    ? ["Express Service", "Premium Package", "Eco-friendly", "Guarantee Included"]
                    : ["Halal", "Chef Special", "Vegetarian", "Vegan", "Gluten-Free", "Contains Nuts"]
                  ).map((badge) => {
                    const isSelected = itemDietaryTags.includes(badge);
                    return (
                      <button
                        key={badge}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setItemDietaryTags((prev) => prev.filter((t) => t !== badge));
                          } else {
                            setItemDietaryTags((prev) => [...prev, badge]);
                          }
                        }}
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          padding: "5px 12px",
                          borderRadius: 6,
                          border: `1px solid ${isSelected ? "var(--primary)" : "var(--card-border)"}`,
                          background: isSelected ? "rgba(var(--primary-rgb),0.12)" : "var(--input-bg)",
                          color: isSelected ? "var(--primary)" : "var(--text-muted)",
                          cursor: "pointer",
                        }}
                      >
                        {isSelected ? `✓ ${badge}` : `+ ${badge}`}
                      </button>
                    );
                  })}
                </div>
              </div>


              {/* Photo Upload Area */}

              <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "var(--input-bg)", border: "1.5px dashed var(--card-border)", borderRadius: 10, padding: "10px 14px" }}>
                {itemImagePreview ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", width: "100%" }}>
                    <img
                      src={itemImagePreview}
                      alt="Preview"
                      style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", border: "1px solid var(--card-border)" }}
                    />
                    <div style={{ flex: 1, fontSize: "0.82rem", color: "#22c55e", fontWeight: 600 }}>Photo attached & ready to save</div>
                    <button
                      type="button"
                      style={{ fontSize: "0.78rem", fontWeight: 700, padding: "4px 10px", borderRadius: 6, border: "1px solid #ef4444", background: "rgba(239,68,68,0.06)", color: "#ef4444", cursor: "pointer" }}
                      onClick={() => {
                        setItemImageBase64(null);
                        setItemImagePreview(null);
                      }}
                    >
                      Remove Photo
                    </button>
                  </div>
                ) : (
                  <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", width: "100%" }}>
                    <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />
                    <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--primary)", background: "rgba(var(--primary-rgb),0.08)", padding: "6px 14px", borderRadius: 6 }}>
                      Upload Dish Photo
                    </span>
                    <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Select image file (JPG, PNG, WEBP) from your device</span>
                  </label>
                )}
              </div>

              <button type="submit" className={styles.primaryBtn} disabled={itemLoading} style={{ marginTop: "4px", justifyContent: "center" }}>
                Add Item / Service
              </button>
            </div>
          </form>

          {/* Menu Items List & Stop List Toggle */}
          <div className={styles.settingsCard}>
            <h3 style={{ color: "var(--foreground)", margin: "0 0 6px" }}>Catalog & Stop List</h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "16px" }}>
              Toggle positions in/out of Stop List (Out of Stock). Stop-listed items are blocked in bill creation and marked as Sold Out for guests.
            </p>

            {/* Search Input */}
            <div style={{ marginBottom: "16px" }}>
              <input
                type="text"
                className={styles.input}
                placeholder="Search catalog by name, category, ingredients..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                style={{ height: 42 }}
              />
            </div>

            {localMenuItems.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-muted)", fontSize: "0.9rem" }}>
                No items added to catalog yet. Add your first item above.
              </div>
            ) : (() => {
              const filteredItems = localMenuItems.filter((item) => {
                if (!catalogSearch.trim()) return true;
                const q = catalogSearch.toLowerCase();
                return (
                  item.name.toLowerCase().includes(q) ||
                  (item.category_name || "").toLowerCase().includes(q) ||
                  (item.ingredients || "").toLowerCase().includes(q) ||
                  (item.description || "").toLowerCase().includes(q)
                );
              });

              if (filteredItems.length === 0) {
                return (
                  <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-muted)", fontSize: "0.9rem" }}>
                    No matching items found for "{catalogSearch}"
                  </div>
                );
              }

              return (
                <table className={styles.staffTable}>
                  <thead>
                    <tr>
                      <th>Item Name</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>Availability</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => {
                      const isAvailable = item.is_available === 1;
                      return (
                        <tr key={item.id} style={{ opacity: isAvailable ? 1 : 0.6 }}>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              {item.image_url && (
                                <img
                                  src={item.image_url}
                                  alt={item.name}
                                  style={{ width: 42, height: 42, borderRadius: 6, objectFit: "cover", border: "1px solid var(--card-border)", flexShrink: 0 }}
                                />
                              )}
                              <div>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <span style={{ fontWeight: 600 }}>{item.name}</span>
                                  {item.weight_volume && (
                                    <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "1px 6px", borderRadius: 4, background: "var(--input-bg)", color: "var(--text-muted)" }}>
                                      {item.weight_volume}
                                    </span>
                                  )}
                                  {item.calories && (
                                    <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                                      • {item.calories} kcal
                                    </span>
                                  )}
                                </div>

                                {item.description && (
                                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{item.description}</div>
                                )}

                                {item.ingredients && (
                                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontStyle: "italic", marginTop: "2px" }}>
                                    Ingredients: {item.ingredients}
                                  </div>
                                )}

                                {/* Dietary Badges */}
                                {item.dietary_tags && (
                                  <div style={{ display: "flex", gap: "4px", marginTop: "4px", flexWrap: "wrap" }}>
                                    {JSON.parse(item.dietary_tags).map((tag: string) => (
                                      <span key={tag} style={{ fontSize: "0.68rem", fontWeight: 700, padding: "1px 5px", borderRadius: 4, background: "rgba(var(--primary-rgb),0.08)", color: "var(--primary)" }}>
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>
                            <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                              {item.category_name || "General"}
                            </span>
                          </td>
                          <td>{item.price.toFixed(2)} {restaurant.currency}</td>
                          <td>
                            <button
                              type="button"
                              style={{
                                fontSize: "0.72rem",
                                fontWeight: 700,
                                padding: "4px 10px",
                                borderRadius: 20,
                                border: `1px solid ${isAvailable ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
                                background: isAvailable ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
                                color: isAvailable ? "#16a34a" : "#dc2626",
                                cursor: "pointer",
                                whiteSpace: "nowrap"
                              }}
                              onClick={() => handleToggleStopList(item.id, item.is_available)}
                            >
                              {isAvailable ? "Available" : "STOP LIST"}
                            </button>
                          </td>
                          <td>
                            <button
                              type="button"
                              style={{
                                fontSize: "0.78rem",
                                fontWeight: 600,
                                padding: "4px 10px",
                                borderRadius: 6,
                                border: "none",
                                background: "transparent",
                                color: "var(--primary)",
                                cursor: "pointer",
                                transition: "opacity 0.15s",
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.75")}
                              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                              onClick={() => handleOpenEdit(item)}
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              );
            })()}
          </div>
        </div>
      )}


      {/* TAB 3: Tables & Spots */}
      {activeSubTab === "spots" && (
        <div className={styles.settingsCard}>
          <h3 style={{ color: "var(--foreground)", marginBottom: "6px" }}>Tables & Spots Setup</h3>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "20px" }}>
            Add or remove physical spots. Each spot generates a unique QR code for bills and tipping.
          </p>

          <form onSubmit={handleCreateSpot} style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
            <input
              type="text"
              className={styles.input}
              placeholder="Spot name (e.g. Table 6, VIP 1, Terrace 3)"
              value={spotLabel}
              onChange={(e) => setSpotLabel(e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="submit" className={styles.primaryBtn} disabled={spotLoading || !spotLabel.trim()}>
              {spotLoading ? "Adding…" : "Add Spot"}
            </button>
          </form>

          {spots.length === 0 ? (
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>No spots added yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {spots.map((spot) => (
                <div
                  key={spot.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    background: "var(--input-bg)",
                    border: "1px solid var(--card-border)",
                    borderRadius: 10,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--foreground)" }}>{spot.label}</div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{spot.short_code}</div>
                  </div>
                  <button
                    type="button"
                    style={{ fontSize: "0.78rem", fontWeight: 700, padding: "4px 10px", borderRadius: 6, border: "1px solid #ef4444", background: "rgba(239,68,68,0.06)", color: "#ef4444", cursor: "pointer" }}
                    onClick={async () => {
                      if (!confirm(`Delete ${spot.label}?`)) return;
                      await deleteSpot({ spotId: spot.id });
                      window.location.reload();
                    }}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Team & Staff */}
      {activeSubTab === "team" && (
        <div className={styles.settingsCard}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
            <h3 style={{ color: "var(--foreground)", margin: 0 }}>Team & Staff Management</h3>
            <button className={styles.primaryBtn} style={{ padding: "7px 14px", fontSize: "0.82rem" }} onClick={() => setAddModalOpen(true)}>
              Add Staff
            </button>
          </div>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "20px" }}>
            Manage team members linked to this business.
          </p>

          <table className={styles.staffTable}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Tips Balance</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {waiters.map((w) => {
                const currentRole = editingRoles[w.id] ?? w.role;
                const isDirty = currentRole !== w.role;
                return (
                  <tr key={w.id}>
                    <td>
                      <div className={styles.staffInfo}>
                        <img src={w.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"} alt={w.name} className={styles.staffAvatar} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{w.name}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{w.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <select
                        value={currentRole}
                        onChange={(e) => setEditingRoles((prev) => ({ ...prev, [w.id]: e.target.value }))}
                        style={{ fontSize: "0.82rem", padding: "4px 8px", borderRadius: 6, border: "1px solid var(--card-border)", background: "var(--input-bg)", color: "var(--foreground)", cursor: "pointer" }}
                      >
                        <option value="WAITER">Waiter / Server</option>
                        <option value="BARBER">Barber / Stylist</option>
                        <option value="HOUSEKEEPER">Housekeeper</option>
                        <option value="VALET">Valet Specialist</option>
                        <option value="DRIVER">Courier / Driver</option>
                        <option value="OTHER">Other Specialist</option>
                      </select>
                    </td>
                    <td>{w.balance.toFixed(2)} {restaurant.currency}</td>
                    <td>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        {isDirty && (
                          <button
                            type="button"
                            style={{ fontSize: "0.78rem", fontWeight: 700, padding: "4px 10px", borderRadius: 6, border: "1px solid var(--primary)", background: "rgba(var(--primary-rgb),0.08)", color: "var(--primary)", cursor: "pointer" }}
                            onClick={async () => {
                              await updateMemberRole({ businessId: restaurant.id, individualId: w.id, role: currentRole });
                              setEditingRoles((prev) => { const n = { ...prev }; delete n[w.id]; return n; });
                              window.location.reload();
                            }}
                          >
                            Save
                          </button>
                        )}
                        <button
                          type="button"
                          style={{ fontSize: "0.78rem", fontWeight: 700, padding: "4px 10px", borderRadius: 6, border: "1px solid #ef4444", background: "rgba(239,68,68,0.06)", color: "#ef4444", cursor: "pointer" }}
                          onClick={async () => {
                            if (!confirm(`Remove ${w.name} from your team?`)) return;
                            await unlinkIndividualFromBusiness({ businessId: restaurant.id, individualId: w.id });
                            window.location.reload();
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 5: Account & Security */}
      {activeSubTab === "account" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Account Details Card */}
          <div className={styles.settingsCard}>
            <h3 style={{ color: "var(--foreground)", margin: "0 0 6px" }}>Account Profile</h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "16px" }}>
              Manager credentials and security settings for accessing this portal.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
              <div>
                <label className={styles.settingsLabel}>Manager Name</label>
                <input
                  type="text"
                  className={styles.input}
                  value={managerUser?.name || "Manager"}
                  disabled
                  style={{ opacity: 0.8 }}
                />
              </div>
              <div>
                <label className={styles.settingsLabel}>Email Address</label>
                <input
                  type="email"
                  className={styles.input}
                  value={managerUser?.email || "—"}
                  disabled
                  style={{ opacity: 0.8 }}
                />
              </div>
            </div>

            <div className={styles.settingsRow}>
              <label className={styles.settingsLabel}>Role</label>
              <input
                type="text"
                className={styles.input}
                value={managerUser?.role_id === SystemRole.SUPER_ADMIN ? "Super Admin" : "Business Manager"}
                disabled
                style={{ opacity: 0.8 }}
              />
            </div>
          </div>

          {/* Change Password Card */}
          <form onSubmit={handleUpdatePass} className={styles.settingsCard}>
            <h3 style={{ color: "var(--foreground)", margin: "0 0 6px" }}>Security & Password</h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "16px" }}>
              Update your account password. Use a strong password with letters, numbers, and symbols.
            </p>

            {passSuccess && (
              <div style={{ background: "rgba(34,197,94,0.1)", border: "1px solid #22c55e", color: "#22c55e", padding: "10px", borderRadius: "8px", fontSize: "0.85rem", marginBottom: "16px", textAlign: "center" }}>
                {passSuccess}
              </div>
            )}

            {passError && (
              <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid #ef4444", color: "#ef4444", padding: "10px", borderRadius: "8px", fontSize: "0.85rem", marginBottom: "16px", textAlign: "center" }}>
                {passError}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label className={styles.settingsLabel}>Current Password</label>
                <input
                  type="password"
                  className={styles.input}
                  placeholder="Enter current password"
                  value={currPass}
                  onChange={(e) => setCurrPass(e.target.value)}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label className={styles.settingsLabel}>New Password</label>
                  <input
                    type="password"
                    className={styles.input}
                    placeholder="At least 6 characters"
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className={styles.settingsLabel}>Confirm New Password</label>
                  <input
                    type="password"
                    className={styles.input}
                    placeholder="Repeat new password"
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className={styles.primaryBtn}
                disabled={passLoading || !newPass}
                style={{ marginTop: "8px", alignSelf: "flex-start" }}
              >
                {passLoading ? "Updating…" : "Update Password"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Add Staff */}

      {/* Modal: Add Staff Member via Invitation Link */}
      {addModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ maxWidth: 460 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid var(--card-border)", paddingBottom: "12px" }}>
              <h3 className={styles.modalTitle} style={{ margin: 0 }}>Invite Staff Member</h3>
              <button onClick={() => setAddModalOpen(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "1.2rem" }}>✕</button>
            </div>

            <p className={styles.modalSub} style={{ marginBottom: "20px" }}>
              Share this invitation link with your waiters, bartenders, or team members so they can join your venue.
            </p>

            <div style={{ background: "rgba(181, 138, 28, 0.08)", border: "1px solid rgba(181, 138, 28, 0.25)", borderRadius: "12px", padding: "16px", marginBottom: "20px" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", marginBottom: "8px" }}>
                Staff Invitation Link
              </div>
              
              <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                <input
                  readOnly
                  value={staffInviteToken && typeof window !== "undefined" ? `${window.location.origin}/business/invite/${staffInviteToken}` : "Generating link..."}
                  className={styles.input}
                  style={{ flex: 1, margin: 0, fontSize: "0.8rem", fontFamily: "monospace" }}
                />
                <button
                  type="button"
                  className={styles.primaryBtn}
                  style={{ flexShrink: 0, fontSize: "0.85rem", padding: "8px 14px" }}
                  onClick={() => {
                    if (!staffInviteToken) return;
                    const url = `${window.location.origin}/business/invite/${staffInviteToken}`;
                    navigator.clipboard.writeText(url);
                    setStaffCopied(true);
                    setTimeout(() => setStaffCopied(false), 2500);
                  }}
                >
                  {staffCopied ? "Copied!" : "Copy Link"}
                </button>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "0.75rem", cursor: "pointer", textDecoration: "underline" }}
                  onClick={async () => {
                    if (!restaurant.id) return;
                    setStaffInviteLoading(true);
                    const res = await regenerateInviteLink(restaurant.id, "STAFF");
                    setStaffInviteLoading(false);
                    if (res.success && res.token) {
                      setStaffInviteToken(res.token);
                    }
                  }}
                >
                  {staffInviteLoading ? "Resetting..." : "Reset Invite Link"}
                </button>
              </div>
            </div>

            <button type="button" className={styles.cancelBtn} style={{ width: "100%" }} onClick={() => setAddModalOpen(false)}>
              Done
            </button>
          </div>
        </div>
      )}



      {/* Modal: Edit Menu Item / Service */}
      {editingItem && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ maxWidth: 640, width: "95%", maxHeight: "90vh", overflowY: "auto", padding: "24px" }}>
            <h3 className={styles.modalTitle} style={{ marginBottom: "16px" }}>Edit {businessType === "SALON" ? "Service" : "Menu Item"}</h3>

            <form onSubmit={handleSaveEdit}>
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                
                {/* Row 1: Name & Price */}
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "16px" }}>
                  <div>
                    <label className={styles.settingsLabel}>{businessType === "SALON" ? "Service Name" : "Item Name"}</label>
                    <input
                      type="text"
                      className={styles.input}
                      required
                      value={editItemName}
                      onChange={(e) => setEditItemName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={styles.settingsLabel}>Price ({restaurant.currency})</label>
                    <input
                      type="number"
                      step="0.01"
                      className={styles.input}
                      required
                      value={editItemPrice}
                      onChange={(e) => setEditItemPrice(e.target.value)}
                    />
                  </div>
                </div>

                {/* Row 2: Category & Spiciness Level */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div>
                    <label className={styles.settingsLabel}>Category</label>
                    <select
                      className={styles.select}
                      value={editItemCatId}
                      onChange={(e) => setEditItemCatId(e.target.value)}
                    >
                      <option value="">No Category</option>
                      {localCategories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Spiciness Level (Only for Restaurants / Delivery) */}
                  {(businessType === "RESTAURANT" || businessType === "DELIVERY" || !businessType) ? (
                    <div>
                      <label className={styles.settingsLabel}>Spiciness Level</label>
                      <select
                        className={styles.select}
                        value={editItemSpiciness}
                        onChange={(e) => setEditItemSpiciness(parseInt(e.target.value, 10))}
                      >
                        <option value="0">Not Spicy</option>
                        <option value="1">Mild</option>
                        <option value="2">Medium</option>
                        <option value="3">Hot</option>
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className={styles.settingsLabel}>Service Duration</label>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder={businessType === "SALON" ? "e.g. 45 min" : "e.g. 30 min"}
                        value={editItemWeightVal}
                        onChange={(e) => setEditItemWeightVal(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                {/* Row 3: Description Textarea */}
                <div>
                  <label className={styles.settingsLabel}>Description</label>
                  <div style={{ position: "relative", width: "100%" }}>
                    <textarea
                      className={styles.input}
                      value={editItemDesc}
                      onChange={(e) => setEditItemDesc(e.target.value)}
                      placeholder={`Describe this ${businessType === "SALON" ? "service" : "dish"}...`}
                      style={{
                        paddingRight: "115px",
                        resize: "none",
                        overflow: "hidden",
                        minHeight: "42px",
                        lineHeight: "1.4",
                        paddingTop: "10px",
                        paddingBottom: "10px"
                      }}
                      onInput={(e) => {
                        e.currentTarget.style.height = "auto";
                        e.currentTarget.style.height = `${Math.max(42, e.currentTarget.scrollHeight)}px`;
                      }}
                    />
                    <button
                      type="button"
                      disabled={editEnhancingDesc || !editItemName.trim()}
                      onClick={async () => {
                        if (!editItemName.trim()) return;
                        setEditEnhancingDesc(true);
                        const res = await enhanceItemDescription({ name: editItemName.trim(), currentDesc: editItemDesc.trim() });
                        setEditEnhancingDesc(false);
                        if (res.success && res.enhanced) {
                          setEditItemDesc(res.enhanced);
                        }
                      }}
                      style={{
                        position: "absolute",
                        right: 5,
                        top: 5,
                        height: 32,
                        padding: "0 8px",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        borderRadius: 7,
                        border: "none",
                        background: "rgba(var(--primary-rgb),0.12)",
                        color: "var(--primary)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px"
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"/>
                      </svg>
                      <span>{editEnhancingDesc ? "Enhancing…" : "AI Enhance"}</span>
                    </button>
                  </div>
                </div>

                {/* Row 4: Portion Size & Calories (Only for Restaurant/Delivery) */}
                {(businessType === "RESTAURANT" || businessType === "DELIVERY" || !businessType) ? (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                      
                      {/* Portion Size */}
                      <div>
                        <label className={styles.settingsLabel}>Portion Size</label>
                        <div style={{ display: "flex", border: "1px solid var(--card-border)", borderRadius: "var(--radius-md)", overflow: "hidden", height: 42, background: "var(--input-bg)" }}>
                          <input
                            type="number"
                            placeholder="e.g. 350"
                            value={editItemWeightVal}
                            onChange={(e) => setEditItemWeightVal(e.target.value)}
                            style={{ flex: 1, border: "none", background: "transparent", outline: "none", padding: "0 12px", fontSize: "0.88rem", color: "var(--foreground)", height: "100%" }}
                          />
                          <select
                            value={editItemWeightUnit}
                            onChange={(e) => setEditItemWeightUnit(e.target.value)}
                            style={{
                              appearance: "none",
                              WebkitAppearance: "none",
                              border: "none",
                              background: "rgba(var(--primary-rgb),0.06) url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23b58a1c' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\") no-repeat right 10px center / 10px 10px",
                              borderLeft: "1px solid var(--card-border)",
                              outline: "none",
                              fontSize: "0.82rem",
                              fontWeight: 700,
                              color: "var(--primary)",
                              cursor: "pointer",
                              padding: "0 26px 0 10px",
                              height: "100%",
                            }}
                          >
                            <option value="g">g</option>
                            <option value="kg">kg</option>
                            <option value="ml">ml</option>
                            <option value="L">L</option>
                            <option value="min">min</option>
                            <option value="pcs">pcs</option>
                          </select>
                        </div>
                      </div>

                      {/* Calories */}
                      <div>
                        <label className={styles.settingsLabel}>Calories (kcal)</label>
                        <div style={{ position: "relative", width: "100%", height: 42 }}>
                          <input
                            type="number"
                            className={styles.input}
                            placeholder="e.g. 450"
                            value={editItemCalories}
                            onChange={(e) => setEditItemCalories(e.target.value)}
                            style={{ paddingRight: "115px", height: 42 }}
                          />
                          <button
                            type="button"
                            disabled={editCalculatingCalories || !editItemIngredients.trim()}
                            onClick={async () => {
                              if (!editItemIngredients.trim()) return;
                              setEditCalculatingCalories(true);
                              const res = await calculateItemCalories({
                                name: editItemName,
                                ingredients: editItemIngredients,
                                weightVolume: editItemWeightVal ? `${editItemWeightVal}${editItemWeightUnit}` : undefined
                              });
                              setEditCalculatingCalories(false);
                              if (res.success && res.calories) {
                                setEditItemCalories(res.calories.toString());
                              }
                            }}
                            style={{
                              position: "absolute",
                              right: 5,
                              top: 5,
                              height: 32,
                              padding: "0 8px",
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              borderRadius: 7,
                              border: "none",
                              background: "rgba(var(--primary-rgb),0.12)",
                              color: "var(--primary)",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"/>
                            </svg>
                            <span>{editCalculatingCalories ? "Calc..." : "AI Calc"}</span>
                          </button>
                        </div>
                      </div>

                    </div>

                    {/* Row 5: Ingredients */}
                    <div>
                      <label className={styles.settingsLabel}>Ingredients</label>
                      <div style={{ position: "relative", width: "100%", height: 42 }}>
                        <input
                          type="text"
                          className={styles.input}
                          placeholder="e.g. Grilled beef, onions, tahini sauce, pita bread"
                          value={editItemIngredients}
                          onChange={(e) => setEditItemIngredients(e.target.value)}
                          style={{ paddingRight: "115px", height: 42 }}
                        />
                        <button
                          type="button"
                          disabled={editSuggestingIngredients || !editItemName.trim()}
                          onClick={async () => {
                            if (!editItemName.trim()) return;
                            setEditSuggestingIngredients(true);
                            const res = await suggestItemIngredients({ name: editItemName.trim(), description: editItemDesc.trim() });
                            setEditSuggestingIngredients(false);
                            if (res.success && res.ingredients) {
                              setEditItemIngredients(res.ingredients);
                            }
                          }}
                          style={{
                            position: "absolute",
                            right: 5,
                            top: 5,
                            height: 32,
                            padding: "0 8px",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            borderRadius: 7,
                            border: "none",
                            background: "rgba(var(--primary-rgb),0.12)",
                            color: "var(--primary)",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"/>
                          </svg>
                          <span>{editSuggestingIngredients ? "Suggest..." : "AI Suggest"}</span>
                        </button>
                      </div>
                    </div>

                    {/* Row 6: Dietary Highlights & Badges (Spans full width, no fixed height!) */}
                    <div>
                      <label className={styles.settingsLabel} style={{ marginBottom: "6px", display: "block" }}>Dietary Tags / Badges</label>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", rowGap: "8px", width: "100%" }}>
                        {["Halal", "Vegetarian", "Vegan", "Gluten-Free", "Contains Nuts", "Chef Special"].map((tag) => {
                          const active = editItemDietaryTags.includes(tag);
                          return (
                            <button
                              key={tag}
                              type="button"
                              style={{
                                fontSize: "0.72rem",
                                fontWeight: 700,
                                padding: "6px 12px",
                                borderRadius: 8,
                                border: `1.5px solid ${active ? "var(--primary)" : "var(--card-border)"}`,
                                background: active ? "rgba(var(--primary-rgb),0.1)" : "transparent",
                                color: active ? "var(--primary)" : "var(--text-muted)",
                                cursor: "pointer",
                                transition: "all 0.15s"
                              }}
                              onClick={() => {
                                if (active) {
                                  setEditItemDietaryTags(editItemDietaryTags.filter((t) => t !== tag));
                                } else {
                                  setEditItemDietaryTags([...editItemDietaryTags, tag]);
                                }
                              }}
                            >
                              {tag}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                ) : (
                  <div>
                    <label className={styles.settingsLabel}>Service Notes / Inclusions</label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder={businessType === "SALON" ? "Products / Technique (e.g. Organic L'Oréal Keratin)" : "Service Notes / Inclusions"}
                      value={editItemIngredients}
                      onChange={(e) => setEditItemIngredients(e.target.value)}
                    />
                  </div>
                )}

                {/* Photo Upload Area */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "var(--input-bg)", border: "1.5px dashed var(--card-border)", borderRadius: 10, padding: "10px 14px" }}>
                  {editItemImagePreview ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", width: "100%" }}>
                      <img
                        src={editItemImagePreview}
                        alt="Preview"
                        style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", border: "1px solid var(--card-border)" }}
                      />
                      <div style={{ flex: 1, fontSize: "0.82rem", color: "#22c55e", fontWeight: 600 }}>Photo attached</div>
                      <button
                        type="button"
                        style={{ fontSize: "0.78rem", fontWeight: 700, padding: "4px 10px", borderRadius: 6, border: "1px solid #ef4444", background: "rgba(239,68,68,0.06)", color: "#ef4444", cursor: "pointer" }}
                        onClick={() => {
                          setEditItemImageBase64(null);
                          setEditItemImagePreview(null);
                        }}
                      >
                        Remove Photo
                      </button>
                    </div>
                  ) : (
                    <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", width: "100%" }}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              const base64 = reader.result as string;
                              setEditItemImageBase64(base64);
                              setEditItemImagePreview(base64);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        style={{ display: "none" }}
                      />
                      <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--primary)", background: "rgba(var(--primary-rgb),0.08)", padding: "6px 14px", borderRadius: 6 }}>
                        Upload Photo
                      </span>
                      <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Select image file (JPG, PNG, WEBP)</span>
                    </label>
                  )}
                </div>

              </div>

              {/* Footer Actions */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "24px", paddingTop: "16px", borderTop: "1px solid var(--card-border)" }}>
                <button
                  type="button"
                  onClick={handleDeleteFromEdit}
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    padding: "10px 16px",
                    borderRadius: 8,
                    border: "1px solid #ef4444",
                    background: "rgba(239,68,68,0.04)",
                    color: "#ef4444",
                    cursor: "pointer",
                  }}
                >
                  Delete Item
                </button>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    onClick={() => setEditingItem(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={styles.primaryBtn}
                    disabled={editItemLoading}
                  >
                    {editItemLoading ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* TAB 6: Promotions */}
      {activeSubTab === "promotions" && (
        <div style={{ marginTop: "20px" }}>
          <PromotionsManagerClient 
            initialPromotions={promotions} 
            menuItems={menuItems} 
            businessId={restaurant.id} 
          />
        </div>
      )}
    </div>
  );
}

