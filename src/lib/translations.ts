export type Language = "en" | "ar";

export interface Translations {
  rateService: string;
  whatDidYouLike: string;
  leaveMessage: string;
  subtotal: string;
  coverFeeLabel: string;
  totalToPay: string;
  payNow: string;
  processing: string;
  contactingBank: string;
  shukran: string;
  paymentSuccess: string;
  recipient: string;
  foodBill: string;
  tip: string;
  totalPaid: string;
  done: string;
  paymentFailed: string;
  tryAgain: string;
  waiter: string;
  bartender: string;
  kitchen: string;
  menu: string;
  cart: string;
  bill: string;
  wifi: string;
  selectTipAmount: string;
  poor: string;
  fair: string;
  good: string;
  veryGood: string;
  amazing: string;
  tags: Record<string, string>;
  customTip: string;
  orSummon: string;
  callWaiter: string;
  calling: string;
  waiterCalled: string;
  guestWifi: string;
  network: string;
  password: string;
  copy: string;
  close: string;
  server: string;
  date: string;
  includeFoodBill: string;
  billSubtotal: string;
  yourServer: string;
  table: string;
  billAlreadyPaid: string;
  stillLeaveTip: string;
  processingFeeInfo: string;
  pleaseSelectAmount: string;
}

export const TRANSLATIONS: Record<Language, Translations> = {
  en: {
    rateService: "Rate the Service",
    whatDidYouLike: "What did you like?",
    leaveMessage: "Leave a message... (Optional)",
    subtotal: "Subtotal",
    coverFeeLabel: "Cover transaction processing fee (5%)",
    totalToPay: "Total to Pay",
    payNow: "Pay Now",
    processing: "Processing Payment",
    contactingBank: "Contacting your bank...",
    shukran: "Shukran!",
    paymentSuccess: "Your payment has been successfully completed.",
    recipient: "Recipient",
    foodBill: "Food Bill",
    tip: "Tip",
    totalPaid: "Total Paid",
    done: "Done",
    paymentFailed: "Payment Failed",
    tryAgain: "Try Again",
    waiter: "Waiter",
    bartender: "Bartender",
    kitchen: "Kitchen",
    menu: "Menu",
    cart: "Cart",
    bill: "Bill",
    wifi: "Wi-Fi",
    selectTipAmount: "Select Tip Amount",
    poor: "Poor 😞",
    fair: "Fair 😐",
    good: "Good 🙂",
    veryGood: "Very Good 😊",
    amazing: "Amazing! 🌟",
    tags: {
      "😊 Friendly": "😊 Friendly",
      "⚡ Fast Service": "⚡ Fast Service",
      "🍽️ Tasty Food": "🍽️ Tasty Food",
      "✨ Neat & Clean": "✨ Neat & Clean",
      "🎙️ Good Chat": "🎙️ Good Chat"
    },
    customTip: "Custom",
    orSummon: "Or summon staff",
    callWaiter: "Call",
    calling: "Calling...",
    waiterCalled: "On the way!",
    guestWifi: "Free Guest Wi-Fi",
    network: "Network (SSID)",
    password: "Password",
    copy: "Copy",
    close: "Close",
    server: "SERVER",
    date: "DATE",
    includeFoodBill: "INCLUDE FOOD BILL",
    billSubtotal: "BILL SUBTOTAL",
    yourServer: "YOUR SERVER",
    table: "Table",
    billAlreadyPaid: "Food bill has already been paid. Thank you!",
    stillLeaveTip: "You can still leave a personal tip below.",
    processingFeeInfo: "Processing fee information",
    pleaseSelectAmount: "Please select a tip amount or pay the bill.",
  },
  ar: {
    rateService: "قيّم الخدمة",
    whatDidYouLike: "ما الذي أعجبك؟",
    leaveMessage: "اترك رسالة... (اختياري)",
    subtotal: "المجموع الجزئي",
    coverFeeLabel: "تغطية رسوم المعالجة (٥٪)",
    totalToPay: "إجمالي المبلغ",
    payNow: "ادفع الآن",
    processing: "جارٍ معالجة الدفع",
    contactingBank: "جارٍ الاتصال بالبنك...",
    shukran: "شكراً!",
    paymentSuccess: "تمت عملية الدفع بنجاح.",
    recipient: "المستلم",
    foodBill: "فاتورة الطعام",
    tip: "إكرامية",
    totalPaid: "إجمالي المدفوع",
    done: "تم",
    paymentFailed: "فشل الدفع",
    tryAgain: "حاول مجدداً",
    waiter: "الويتر",
    bartender: "البارمان",
    kitchen: "المطبخ",
    menu: "القائمة",
    cart: "السلة",
    bill: "الفاتورة",
    wifi: "واي فاي",
    selectTipAmount: "اختر مبلغ الإكرامية",
    poor: "سيء 😞",
    fair: "مقبول 😐",
    good: "جيد 🙂",
    veryGood: "جيد جداً 😊",
    amazing: "ممتاز! 🌟",
    tags: {
      "😊 Friendly": "😊 ودود",
      "⚡ Fast Service": "⚡ خدمة سريعة",
      "🍽️ Tasty Food": "🍽️ طعام لذيذ",
      "✨ Neat & Clean": "✨ نظيف ومرتب",
      "🎙️ Good Chat": "🎙️ محادثة ممتعة"
    },
    customTip: "مبلغ آخر",
    orSummon: "أو استدعِ الطاقم",
    callWaiter: "استدعِ",
    calling: "جارٍ الاستدعاء...",
    waiterCalled: "في الطريق!",
    guestWifi: "واي فاي مجاني للضيوف",
    network: "اسم الشبكة",
    password: "كلمة المرور",
    copy: "نسخ",
    close: "إغلاق",
    server: "النادل",
    date: "التاريخ",
    includeFoodBill: "دفع فاتورة الطعام",
    billSubtotal: "مجموع الفاتورة",
    yourServer: "نادلك",
    table: "طاولة",
    billAlreadyPaid: "تم دفع فاتورة الطعام بالفعل. شكراً!",
    stillLeaveTip: "لا يزال بإمكانك ترك إكرامية شخصية أدناه.",
    processingFeeInfo: "معلومات رسوم المعالجة",
    pleaseSelectAmount: "الرجاء اختيار مبلغ الإكرامية أو دفع الفاتورة.",
  }
};
