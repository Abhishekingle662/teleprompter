import { useMemo } from "react";
import { detectOS } from "./lib/os";
import { useLatestRelease } from "./hooks/useLatestRelease";
import { Hero } from "./components/Hero";
import { Demo } from "./components/Demo";
import { Features } from "./components/Features";
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
        <Demo />
        <Features />
        <HowItWorks />
        <DownloadSection os={os} release={release} />
      </main>
      <Footer />
    </>
  );
}
