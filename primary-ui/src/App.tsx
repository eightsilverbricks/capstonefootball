import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import GamePage from "./pages/GamePage";
import AboutPage from "./pages/AboutPage";
import NotFound from "./pages/NotFound";

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/game/:season/:week/:away/:home" element={<GamePage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);

export default App;
