import { Router, Route } from "@solidjs/router";
import Layout from "./pages/layout";
import SessionPage from "./pages/SessionPage";
import ProjectsPage from "./pages/projects";

import "./App.css";

function App() {
  return (
    <Router root={Layout}>
      <Route path="/" component={ProjectsPage} />
      <Route path="/session" component={SessionPage} />
    </Router>
  );
}

export default App;
