import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import HomeSection from "./HomeSection";
import PlaygroundPanel from "./PlaygroundPanel";
import RepoVision from "./repo-vision/RepoVisionPage";
import Display from "./Display";
import MermaidDiagramRepository from "./components/MermaidDiagramRepository";
import CodeWiki from "./codewiki/CodeWiki";
import { useNavigationShortcuts } from "./utils/useNavigationShortcuts";

function MermaidDiagramRouteWrapper() {
  const location = useLocation();
  const { diagram, title } = location.state || { diagram: "", title: "" };
  return <MermaidDiagramRepository diagram={diagram} title={title} />;
}

function AppRoutes() {
  // Enable keyboard shortcuts for navigation
  useNavigationShortcuts();

  return (
    <Routes>
      <Route path="/" element={<HomeSection />} />
      <Route path="/playground" element={<PlaygroundPanel />} />
      <Route path="/playground/repovision" element={<RepoVision />} />
      <Route path="/playground/codeanalysis" element={<Display />} />
      <Route path="/playground/codewiki" element={<CodeWiki />} />
      <Route
        path="/playground/repovision/mermaidDiagramRepository"
        element={<MermaidDiagramRouteWrapper />}
      />
    </Routes>
  );
}

export default function App() {
  return (
    <Router basename="/">
      <AppRoutes />
    </Router>
  );
}
