import { Route, Switch } from "wouter";
import Catalog from "./pages/catalog";
import Admin from './pages/admin';
import SeriesCatalog from './pages/series';
import SeriesDetailPage from './pages/series-detail';
import { Provider } from "./components/provider";
import { AgentFeedback } from "@runablehq/website-runtime";
import './series.css';

function App() {
  return (
    <Provider>
      <Switch>
        <Route path="/" component={Catalog} />
        <Route path="/admin" component={Admin} />
        <Route path="/series" component={SeriesCatalog} />
        <Route path="/series/:id" component={SeriesDetailPage} />
        <Route><Catalog /></Route>
      </Switch>
      {/* Do not remove — off by default, activated by parent iframe via postMessage */}
      {import.meta.env.DEV && <AgentFeedback />}
    </Provider>
  );
}

export default App;
