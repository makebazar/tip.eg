"use client";

import React from "react";

export function SoloServicesSection() {
  const examples = [
    {
      category: "Food & Dining",
      title: "Restaurants, Cafes & Bars",
      desc: "Table QR stands and receipt codes for waiters, bartenders, and kitchen teams. Guests tip in seconds via Apple Pay or card.",
      points: [
        "Individual waiter QR badges or table stands",
        "Automated tip pooling split between floor & kitchen",
      ],
    },
    {
      category: "Beauty & Grooming",
      title: "Beauty Salons & Barbers",
      desc: "Compact desk QR cards for hair stylists, nail technicians, barbers, and spa specialists. Clients tip right after their appointment.",
      points: [
        "Individual QR cards per workstation desk",
        "Instant notification on tip received",
      ],
    },
    {
      category: "Transportation",
      title: "Taxi & Chauffeur Drivers",
      desc: "QR stickers placed on car headrests, dashboards, or backseat windows for quick passenger tipping.",
      points: [
        "Durable headrest & dashboard stickers",
        "Instant 2-second withdrawal to mobile wallets",
      ],
    },
    {
      category: "Delivery Services",
      title: "Food Delivery & Couriers",
      desc: "QR badges printed on delivery bags or driver cards for instant doorstep tipping on food & parcel deliveries.",
      points: [
        "Contactless doorstep tipping via smartphone",
        "Works for freelance and fleet couriers",
      ],
    },
    {
      category: "Hospitality",
      title: "Hotels & Housekeeping",
      desc: "In-room QR cards for housekeeping, bellboys, luggage porters, and hotel concierge staff.",
      points: [
        "Room QR stands for hotel maids & room service",
        "No foreign currency conversion fees for tourists",
      ],
    },
    {
      category: "Tourism & Leisure",
      title: "Tour Guides & Excursions",
      desc: "Personal QR badges for excursion leaders, desert safari guides, diving instructors, and boat captains.",
      points: [
        "Wearable QR badges for outdoor tours",
        "Supports USD, EUR & EGP payments from tourists",
      ],
    },
  ];

  return (
    <section id="services" className="py-16 md:py-24 bg-white border-b border-slate-200">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-[#00D26A]">
            Use Cases & Venues
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900">
            Cashless Tipping for Every Business & Specialist
          </h2>
          <p className="text-slate-600 text-base font-medium">
            From restaurants and cafes to salons, drivers, and hotels — tip.eg works anywhere.
          </p>
        </div>

        {/* 6 Example Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {examples.map((item, idx) => (
            <div
              key={idx}
              className="rounded-3xl bg-[#FAF9F5] border border-slate-200/90 p-7 space-y-4 flex flex-col justify-between hover:border-slate-300 transition-colors shadow-sm"
            >
              <div className="space-y-3">
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  {item.category}
                </div>
                <h3 className="text-xl font-black text-slate-900">
                  {item.title}
                </h3>
                <p className="text-slate-600 text-xs font-medium leading-relaxed">
                  {item.desc}
                </p>
              </div>

              <div className="space-y-1.5 text-xs text-slate-700 font-semibold pt-3 border-t border-slate-200/80">
                {item.points.map((p, pIdx) => (
                  <div key={pIdx} className="border-l-2 border-[#00D26A] pl-2.5">
                    {p}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
