import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Agent from "./pages/Agent";
import Analytics from "./pages/Analytics";
import Applications from "./pages/Applications";
import Dashboard from "./pages/Dashboard";
import Interview from "./pages/Interview";
import Jobs from "./pages/Jobs";
import Outreach from "./pages/Outreach";
import Resume from "./pages/Resume";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="jobs" element={<Jobs />} />
        <Route path="resume" element={<Resume />} />
        <Route path="agent" element={<Agent />} />
        <Route path="applications" element={<Applications />} />
        <Route path="outreach" element={<Outreach />} />
        <Route path="interview" element={<Interview />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="*" element={<Dashboard />} />
      </Route>
    </Routes>
  );
}
