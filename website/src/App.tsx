import { useMemo } from "react";
import { detectOS } from "./lib/os";
import { useLatestRelease } from "./hooks/useLatestRelease";
import { Hero } from "./components/Hero";
import { StatsBar } from "./components/StatsBar";
import { Features } from "./components/Features";
import { Demo } from "./components/Demo";
import { HowItWorks } from "./components/HowItWorks";
import { DownloadSection } from "./components/DownloadSection";
import { Footer } from "./components/Footer";

export default function App() {
  const os = useMemo(() => detectOS(), []);
  const release = useLatestRelease();

  return (
    <>
      <Hero os={os} release={release} />
      <main>
        <StatsBar />
        <Features />
        <Demo />
        <HowItWorks />
        <DownloadSection os={os} release={release} />
      </main>
      <Footer />
    </>
  );
}
