import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import Index from "./pages/Index";
import LandingPage from "./pages/LandingPage";
import GamesPage from "./pages/GamesPage";
import GamePage from "./pages/GamePage";
import MySeasonPage, { SettingsRedirect } from "./pages/MySeasonPage";
import AboutPage from "./pages/AboutPage";
import AdminPage from "./pages/AdminPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import TeamsPage from "./pages/TeamsPage";
import TeamPage from "./pages/TeamPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import MockupsRedirect from "./pages/MockupsRedirect";
import NotFound from "./pages/NotFound";
import AuthDialogHost from "./components/auth/AuthDialogHost";
import { SeasonModeProvider } from "./context/SeasonModeContext";
import { LiveGamesProvider } from "./context/LiveGamesContext";
import DemoModeBanner from "./components/DemoModeBanner";

const App = () => (
  <SeasonModeProvider>
  <LiveGamesProvider>
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
      {/* Live hub arrives with the live system; until then Live opens the week's games */}
      <Route path="/live" element={<Navigate to="/games" replace />} />
      <Route path="/teams" element={<TeamsPage />} />
      <Route path="/team/:abbr" element={<TeamPage />} />
      <Route path="/leaderboard" element={<LeaderboardPage />} />
      <Route path="/my-season" element={<MySeasonPage />} />
      <Route path="/about" element={<AboutPage />} />
      {/* Settings now live in the My season Settings tab */}
      <Route path="/settings" element={<SettingsRedirect />} />
      {/* Landing page for the password-reset email link */}
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      {/* Developer-only account admin — not linked from any nav, see AdminPage.tsx */}
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/mockups/*" element={<MockupsRedirect />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
    {/* One account dialog for the whole app — opened via openAuthDialog() */}
    <AuthDialogHost />
    <Analytics />
  </BrowserRouter>
  </LiveGamesProvider>
  </SeasonModeProvider>
);

export default App;
