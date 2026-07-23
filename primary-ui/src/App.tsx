import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import Index from "./pages/Index";
import GamesPage from "./pages/GamesPage";
import GamePage from "./pages/GamePage";
import MySeasonPage from "./pages/MySeasonPage";
import AboutPage from "./pages/AboutPage";
import NotFound from "./pages/NotFound";

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/games" element={<GamesPage />} />
      <Route path="/game/:season/:week/:away/:home" element={<GamePage />} />
      <Route path="/my-season" element={<MySeasonPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
    <Analytics />
  </BrowserRouter>
);

export default App;
