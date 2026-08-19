import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import Index from "./pages/Index";
import LandingPage from "./pages/LandingPage";
import GamesPage from "./pages/GamesPage";
import GamePage from "./pages/GamePage";
import MySeasonPage from "./pages/MySeasonPage";
import AboutPage from "./pages/AboutPage";
import AdminPage from "./pages/AdminPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";
import AuthDialogHost from "./components/auth/AuthDialogHost";
import { SeasonModeProvider } from "./context/SeasonModeContext";
import DemoModeBanner from "./components/DemoModeBanner";

const App = () => (
  <SeasonModeProvider>
  <BrowserRouter>
    {/* Always visible while demo mode is on — see DemoModeBanner.tsx */}
    <DemoModeBanner />
    <Routes>
      {/* Landing when signed out, dashboard when signed in */}
      <Route path="/" element={<Index />} />
      {/* The pitch, always linkable — even for signed-in members */}
      <Route path="/welcome" element={<LandingPage />} />
      <Route path="/games" element={<GamesPage />} />
      <Route path="/game/:season/:week/:away/:home" element={<GamePage />} />
      <Route path="/my-season" element={<MySeasonPage />} />
      <Route path="/about" element={<AboutPage />} />
      {/* Where demo mode is switched on — see SettingsPage.tsx */}
      <Route path="/settings" element={<SettingsPage />} />
      {/* Developer-only account admin — not linked from any nav, see AdminPage.tsx */}
      <Route path="/admin" element={<AdminPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
    {/* One account dialog for the whole app — opened via openAuthDialog() */}
    <AuthDialogHost />
    <Analytics />
  </BrowserRouter>
  </SeasonModeProvider>
);

export default App;
