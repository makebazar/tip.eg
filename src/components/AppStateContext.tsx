"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { processMockPayment } from "@/app/actions/payments";
import { addItemToSpotCart, updateDraftQuantity, removeDraftItem, confirmGuestDrafts } from "@/app/actions/business";
import { TRANSLATIONS, type Language, type Translations } from "@/lib/translations";
import { menuDb, defaultMenuItems, EXCHANGE_RATE, FEE_RATE, type MenuItem } from "@/lib/menuData";

// Re-export shared types & data for backward compatibility
export type { Language, Translations, MenuItem };
export { TRANSLATIONS, menuDb, defaultMenuItems, EXCHANGE_RATE, FEE_RATE };

export interface StaffProfile {
  id: string;
  name: string;
  name_ar: string | null;
  avatar_url: string | null;
  rating: number;
  saving_goal: string | null;
  saving_goal_ar: string | null;
}

export interface BillItem {
  id?: string;
  name: string;
  price: number;
  originalPrice?: number;
  quantity: number;
  deviceId?: string;
  isDraft?: boolean;
  status?: "DRAFT" | "PENDING" | "CONFIRMED";
}

export interface ReceiptData {
  txId: string;
  totalPaid: number;
  tipPaid: number;
  billPaid: number;
  currencyPaid: "EGP" | "USD";
}

export interface IndividualData {
  id: string;
  name: string;
  name_ar: string | null;
  avatar_url: string | null;
  rating: number;
  restaurant_name: string | null; // Kept for schema backwards compatibility
  restaurant_logo: string | null; // Kept for schema backwards compatibility
  currency: string;
  saving_goal: string | null;
  saving_goal_ar: string | null;
  restaurant_id: string | null; // Kept for schema backwards compatibility
  business_type?: string | null;
  role?: string | null;
}

export interface BillData {
  id: string;
  table_number: string;
  amount: number;
  status: string;
  items: string; // JSON array string
}

export function getRoleLabel(role: string | null | undefined, lang: string): string {
  const isAr = lang === "ar";
  switch (role?.toUpperCase()) {
    case "POOL":
      return isAr ? "الفريق" : "THE TEAM";
    case "WAITER":
      return isAr ? "نادلك" : "YOUR SERVER";
    case "BARBER":
      return isAr ? "مصفف الشعر الخاص بك" : "YOUR STYLIST";
    case "COURIER":
      return isAr ? "المرسل الخاص بك" : "YOUR COURIER";
    case "HOUSEKEEPER":
      return isAr ? "عامل الخدمة الخاص بك" : "YOUR ATTENDANT";
    case "VALET":
      return isAr ? "عامل ركن السيارات الخاص بك" : "YOUR VALET";
    case "DRIVER":
      return isAr ? "سائقك" : "YOUR DRIVER";
    default:
      return isAr ? "مقدم الخدمة الخاص بك" : "YOUR ATTENDANT";
  }
}

export function getSpotLabel(bizType: string | null | undefined, lang: string): string {
  const isAr = lang === "ar";
  switch (bizType?.toUpperCase()) {
    case "RESTAURANT":
      return isAr ? "طاولة" : "Table";
    case "SALON":
      return isAr ? "كرسي" : "Chair";
    case "HOTEL":
      return isAr ? "غرفة" : "Room";
    case "DELIVERY":
      return isAr ? "طلب" : "Order";
    case "CAR_WASH":
      return isAr ? "مسار" : "Lane";
    default:
      return isAr ? "طاولة" : "Table";
  }
}

export function getRoleNoun(role: string | null | undefined, lang: string): string {
  const isAr = lang === "ar";
  switch (role?.toUpperCase()) {
    case "POOL":
      return isAr ? "الفريق" : "TEAM";
    case "WAITER":
      return isAr ? "النادل" : "SERVER";
    case "BARBER":
      return isAr ? "المصفف" : "STYLIST";
    case "COURIER":
      return isAr ? "المرسل" : "COURIER";
    case "HOUSEKEEPER":
      return isAr ? "العامل" : "ATTENDANT";
    case "VALET":
      return isAr ? "الحارس" : "VALET";
    case "DRIVER":
      return isAr ? "السائق" : "DRIVER";
    default:
      return isAr ? "الموظف" : "STAFF";
  }
}

interface AppStateContextType {
  waiter: IndividualData; // Alias to prevent breaking old code
  displayCurrency: "EGP" | "USD";
  toggleCurrency: () => void;
  language: Language;
  toggleLanguage: () => void;
  t: Translations;
  payBill: boolean;
  setPayBill: (val: boolean) => void;
  rating: number;
  setRating: (val: number) => void;
  selectedTags: string[];
  toggleTag: (tag: string) => void;
  comments: string;
  setComments: (val: string) => void;
  orderingSuccess: boolean;
  setOrderingSuccess: (val: boolean) => void;
  isOrdering: boolean;
  currentBill: BillData | null;
  currentBillItems: BillItem[];
  currentBillAmount: number;
  cartItems: Array<{ item: any; quantity: number; billItemId?: string }>;
  deviceId: string;
  addToCart: (item: MenuItem) => void;
  removeFromCart: (itemId: string) => void;
  placeOrder: () => void;
  isBillPaid: boolean;
  bartender: StaffProfile | null;
  kitchen: StaffProfile | null;
  selectedPreset: number | "custom" | null;
  setSelectedPreset: (val: number | "custom" | null) => void;
  tipAmountInput: string;
  setTipAmountInput: (val: string) => void;
  coverFee: boolean;
  setCoverFee: (val: boolean) => void;
  checkoutState: "idle" | "processing" | "success" | "error";
  setCheckoutState: (val: "idle" | "processing" | "success" | "error") => void;
  receipt: ReceiptData | null;
  setReceipt: (val: ReceiptData | null) => void;
  errorMessage: string;
  setErrorMessage: (val: string) => void;
  triggerPayment: () => Promise<void>;
  tableLabel: string | null;
  waiterConfirmPending: boolean;
  setWaiterConfirmPending: (val: boolean) => void;
  confirmOrder: () => Promise<void>;
  pendingCartItems: Array<{ item: any; quantity: number; billItemId?: string }>;
  draftItems: BillItem[];
  othersDraftItems: BillItem[];
  waiterDraftItems: BillItem[];
  pendingItems: BillItem[];
  confirmedItems: BillItem[];
  resolvedRoleLabel: string;
  resolvedSpotLabel: string;
  resolvedRoleNoun: string;
  activeTab: "menu" | "cart" | "bill";
  setActiveTab: (val: "menu" | "cart" | "bill") => void;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export function AppStateProvider({
  waiter,
  initialBill,
  initialBillPaid = false,
  initialBartender = null,
  initialKitchen = null,
  tableLabel = null,
  spotId = null,
  children
}: {
  waiter: IndividualData;
  initialBill: BillData | null;
  initialBillPaid?: boolean;
  initialBartender?: StaffProfile | null;
  initialKitchen?: StaffProfile | null;
  tableLabel?: string | null;
  spotId?: string | null;
  children: React.ReactNode;
}) {
  const [isBillPaid] = useState<boolean>(initialBillPaid);
  const [bartender] = useState<StaffProfile | null>(initialBartender);
  const [kitchen] = useState<StaffProfile | null>(initialKitchen);
  const [displayCurrency, setDisplayCurrency] = useState<"EGP" | "USD">("EGP");
  const [language, setLanguage] = useState<Language>("en");
  const t = TRANSLATIONS[language];
  const [payBill, setPayBill] = useState<boolean>(!!initialBill);
  const [rating, setRating] = useState<number>(5);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comments, setComments] = useState<string>("");

  // Simplified single tip state
  const [selectedPreset, setSelectedPreset] = useState<number | "custom" | null>(initialBill ? 10 : "custom");
  const [tipAmountInput, setTipAmountInput] = useState<string>(initialBill ? "0" : "");

  const [coverFee, setCoverFee] = useState<boolean>(true);
  const [checkoutState, setCheckoutState] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  // Device ID for multiplayer cart identity
  const [deviceId, setDeviceId] = useState<string>("");

  useEffect(() => {
    let id = localStorage.getItem("guestDeviceId");
    if (!id) {
      id = "device_" + Math.random().toString(36).substring(2, 15);
      localStorage.setItem("guestDeviceId", id);
    }
    setDeviceId(id);
  }, []);

  // Cart and Order states
  const [isOrdering, setIsOrdering] = useState<boolean>(false);
  const [orderingSuccess, setOrderingSuccess] = useState<boolean>(false);
  const [waiterConfirmPending, setWaiterConfirmPending] = useState<boolean>(false);

  // Local Bill states
  const [currentBill, setCurrentBill] = useState<BillData | null>(initialBill);
  const [currentBillItems, setCurrentBillItems] = useState<BillItem[]>(initialBill ? JSON.parse(initialBill.items) : []);
  const [currentBillAmount, setCurrentBillAmount] = useState<number>(initialBill ? initialBill.amount : 0);

  // Active Tab state for SPA Guest Dashboard
  const [activeTab, setActiveTab] = useState<"menu" | "cart" | "bill">("menu");

  // Derived draft cart
  const draftItems = currentBillItems.filter(i => (i.isDraft || i.status === 'DRAFT') && i.deviceId === deviceId);
  const othersDraftItems = currentBillItems.filter(i => (i.isDraft || i.status === 'DRAFT') && i.deviceId !== deviceId && i.deviceId !== 'waiter');
  const waiterDraftItems = currentBillItems.filter(i => (i.isDraft || i.status === 'DRAFT') && i.deviceId === 'waiter');
  const pendingItems = currentBillItems.filter(i => i.status === 'PENDING');
  const confirmedItems = currentBillItems.filter(i => (!i.isDraft && i.status !== 'DRAFT' && i.status !== 'PENDING'));

  // Map drafts back to cartItems format for compatibility while preserving promotional di.price
  const cartItems = draftItems.map(di => {
    const found = Object.values(menuDb).flat().find(m => m.name === di.name) || defaultMenuItems.find(m => m.name === di.name);
    const itemObj = found
      ? { ...found, price: di.price, original_price: di.originalPrice }
      : { id: di.id || di.name, name: di.name, name_ar: null, price: di.price, original_price: di.originalPrice, category_id: "", business_id: "", image_url: null, created_at: "", description: null, description_ar: null };

    return {
      item: itemObj as MenuItem,
      quantity: di.quantity,
      billItemId: di.id
    };
  });
  
  const pendingCartItems = cartItems; // alias for backwards compatibility

  // Real-time SSE Connection
  useEffect(() => {
    if (!spotId) return;

    const eventSource = new EventSource(`/api/t/stream?spotId=${spotId}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.bill) {
          setCurrentBill(data.bill);
          setCurrentBillAmount(data.bill.amount);
          setCurrentBillItems(JSON.parse(data.bill.items || "[]"));
          setPayBill(true);
        } else {
          setCurrentBill(null);
          setCurrentBillAmount(0);
          setCurrentBillItems([]);
        }
      } catch (e) {
        console.error("Failed to parse guest SSE data", e);
      }
    };

    eventSource.onerror = (error) => {
      console.error("Guest SSE error:", error);
    };

    return () => {
      eventSource.close();
    };
  }, [spotId]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const tab = searchParams.get("tab") as "menu" | "cart" | "bill";
      if (tab && ["menu", "cart", "bill"].includes(tab)) {
        setActiveTab(tab);
      } else {
        setActiveTab(initialBill ? "bill" : "menu");
      }
    }
  }, [initialBill]);

  const changeTab = (tab: "menu" | "cart" | "bill") => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.replaceState(null, "", url.toString());
    }
  };

  // Dynamic context labels
  const resolvedRoleLabel = getRoleLabel(waiter.role, language);
  const resolvedSpotLabel = getSpotLabel(waiter.business_type || "RESTAURANT", language);
  const resolvedRoleNoun = getRoleNoun(waiter.role, language);

  // Recalculate tip amount whenever preset, currency, or bill details change
  useEffect(() => {
    if (selectedPreset === null) {
      setTipAmountInput("0");
      return;
    }
    if (selectedPreset === "custom") return;

    if (currentBill) {
      const baseBill = displayCurrency === "USD" ? (currentBillAmount / EXCHANGE_RATE) : currentBillAmount;
      const calculated = baseBill * (selectedPreset / 100);
      setTipAmountInput(displayCurrency === "USD" ? calculated.toFixed(2) : Math.round(calculated).toString());
    } else {
      if (displayCurrency === "USD") {
        const soloDefaultsUsd: Record<number, number> = { 10: 2, 15: 5, 20: 10 };
        setTipAmountInput(soloDefaultsUsd[selectedPreset as number]?.toString() || "2");
      } else {
        const soloDefaultsEgp: Record<number, number> = { 10: 50, 15: 100, 20: 150 };
        setTipAmountInput(soloDefaultsEgp[selectedPreset as number]?.toString() || "50");
      }
    }
  }, [selectedPreset, currentBill, currentBillAmount, displayCurrency]);

  const toggleCurrency = () => {
    setDisplayCurrency((prev) => (prev === "EGP" ? "USD" : "EGP"));
  };

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === "en" ? "ar" : "en"));
  };

  const addToCart = async (item: MenuItem) => {
    const existingDraft = draftItems.find(i => i.name === item.name);
    if (existingDraft && spotId) {
      setCurrentBillItems(prev => prev.map(i => i.id === existingDraft.id ? { ...i, quantity: i.quantity + 1 } : i));
      await updateDraftQuantity({ spotId, itemId: existingDraft.id!, deviceId, delta: 1 });
    } else {
      const newId = `draft_${Math.random().toString(36).substr(2, 9)}`;
      const newDraft = { id: newId, name: item.name, price: item.price, originalPrice: (item as any).original_price, quantity: 1, deviceId, isDraft: true, status: "DRAFT" as const };
      setCurrentBillItems(prev => [...prev, newDraft]);
      if (spotId && waiter.restaurant_id) {
        await addItemToSpotCart({
          businessId: waiter.restaurant_id,
          spotId,
          spotLabel: tableLabel || "Guest Table",
          item: newDraft
        });
      }
    }
  };

  const removeFromCart = async (itemIdOrName: string) => {
    const existingDraft = draftItems.find(i => i.id === itemIdOrName) || draftItems.find(i => i.name === itemIdOrName);
    if (existingDraft && spotId) {
      if (existingDraft.quantity > 1) {
        setCurrentBillItems(prev => prev.map(i => i.id === existingDraft.id ? { ...i, quantity: i.quantity - 1 } : i));
        await updateDraftQuantity({ spotId, itemId: existingDraft.id!, deviceId, delta: -1 });
      } else {
        setCurrentBillItems(prev => prev.filter(i => i.id !== existingDraft.id));
        await removeDraftItem({ spotId, itemId: existingDraft.id!, deviceId });
      }
    }
  };

  const placeOrder = async () => {
    if (cartItems.length === 0) return;
    setIsOrdering(true);
    // Simulate calling the waiter (e.g. sending a push notification)
    await new Promise(r => setTimeout(r, 600));
    setIsOrdering(false);
    setOrderingSuccess(true);
    setTimeout(() => {
      setOrderingSuccess(false);
    }, 5000);
  };

  const confirmOrder = async () => {
    if (spotId) {
      await confirmGuestDrafts({ spotId, deviceId });
    }
    setWaiterConfirmPending(false);
    setOrderingSuccess(true);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const triggerPayment = async () => {
    const enteredTipAmount = parseFloat(tipAmountInput) || 0;
    const activeBillAmount = displayCurrency === "USD" ? (currentBillAmount / EXCHANGE_RATE) : currentBillAmount;
    const activeBillToPay = payBill ? activeBillAmount : 0;
    
    const subtotal = activeBillToPay + enteredTipAmount;
    const feeAmount = coverFee ? subtotal * 0.05 : 0;
    const totalAmount = subtotal + feeAmount;

    if (enteredTipAmount <= 0 && activeBillToPay <= 0) {
      setErrorMessage(t.pleaseSelectAmount);
      setCheckoutState("error");
      return;
    }

    setCheckoutState("processing");

    const amountBillEgp = payBill && currentBill ? currentBillAmount : 0;
    const tipEgp = displayCurrency === "USD" ? Math.round(enteredTipAmount * EXCHANGE_RATE) : enteredTipAmount;

    const res = await processMockPayment({
      waiterId: waiter.id,
      businessId: waiter.restaurant_id || undefined,
      billId: payBill && currentBill ? currentBill.id : null,
      amountBill: amountBillEgp,
      amountTip: tipEgp,
      amountTipWaiter: tipEgp,
      amountTipBartender: 0,
      amountTipKitchen: 0,
      ratingStars: 5,
      comments,
      tags: [],
    });

    if (res.success && res.transactionId) {
      setReceipt({
        txId: res.transactionId,
        totalPaid: totalAmount,
        tipPaid: enteredTipAmount,
        billPaid: activeBillToPay,
        currencyPaid: displayCurrency,
      });
      setCheckoutState("success");
    } else {
      setErrorMessage(res.error || "Payment failed");
      setCheckoutState("error");
    }
  };

  return (
    <AppStateContext.Provider
      value={{
        waiter,
        displayCurrency,
        toggleCurrency,
        language,
        toggleLanguage,
        t,
        payBill,
        setPayBill,
        rating,
        setRating,
        selectedTags,
        toggleTag,
        comments,
        setComments,
        orderingSuccess,
        setOrderingSuccess,
        isOrdering,
        currentBill,
        currentBillItems,
        currentBillAmount,
        cartItems,
        addToCart,
        removeFromCart,
        placeOrder,
        isBillPaid,
        bartender,
        kitchen,
        selectedPreset,
        setSelectedPreset,
        tipAmountInput,
        setTipAmountInput,
        coverFee,
        setCoverFee,
        checkoutState,
        setCheckoutState,
        receipt,
        setReceipt,
        errorMessage,
        setErrorMessage,
        triggerPayment,
        tableLabel,
        waiterConfirmPending,
        setWaiterConfirmPending,
        confirmOrder,
        pendingCartItems,
        deviceId,
        draftItems,
        othersDraftItems,
        waiterDraftItems,
        pendingItems,
        confirmedItems,
        resolvedRoleLabel,
        resolvedSpotLabel,
        resolvedRoleNoun,
        activeTab,
        setActiveTab: changeTab,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error("useAppState must be used within an AppStateProvider");
  }
  return context;
}

// Aliases for backwards compatibility with legacy routes
export { AppStateProvider as TableStateProvider, useAppState as useTableState };
