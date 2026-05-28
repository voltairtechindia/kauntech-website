import Hero from "@/components/sections/Hero";
import Features from "@/components/sections/Features";
import Workflow from "@/components/sections/Workflow";
import Compliance from "@/components/sections/Compliance";
import Compare from "@/components/sections/Compare";
import Pricing from "@/components/sections/Pricing";
import Contact from "@/components/sections/Contact";
import ChatWidget from "@/components/ChatWidget";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Features />
      <Workflow />
      <Compliance />
      <Compare />
      <Pricing />
      <Contact />
      <ChatWidget />
    </>
  );
}
