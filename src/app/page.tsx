import React from "react";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { HeroSection } from "@/components/landing/HeroSection";
import { VenueSolutionSection } from "@/components/landing/VenueSolutionSection";
import { DigitalMenuAiSection } from "@/components/landing/DigitalMenuAiSection";
import { WaiterSolutionSection } from "@/components/landing/WaiterSolutionSection";
import { SoloServicesSection } from "@/components/landing/SoloServicesSection";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { IncomeCalculator } from "@/components/landing/IncomeCalculator";
import { FaqSection } from "@/components/landing/FaqSection";
import { LeadFormSection } from "@/components/landing/LeadFormSection";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans selection:bg-[#00D26A]/30 selection:text-slate-950">
      <LandingHeader />
      <main className="flex-1">
        <HeroSection />
        <VenueSolutionSection />
        <div id="menu-ai">
          <DigitalMenuAiSection />
        </div>
        <WaiterSolutionSection />
        <SoloServicesSection />
        <HowItWorks />
        <IncomeCalculator />
        <FaqSection />
        <LeadFormSection />
      </main>
      <LandingFooter />
    </div>
  );
}
