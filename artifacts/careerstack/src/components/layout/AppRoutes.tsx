import { AppLayout } from "@/components/layout/AppLayout";
import { Switch, Route } from "wouter";
import Dashboard from "@/pages/dashboard";
import Portfolio from "@/pages/portfolio/index";
import PortfolioDetail from "@/pages/portfolio/[id]";
import StudentPortfolios from "@/pages/student-portfolios";
import Scores from "@/pages/scores";
import Roadmaps from "@/pages/roadmaps/index";
import RoadmapDetail from "@/pages/roadmaps/[id]";
import Jobs from "@/pages/jobs";
import Profile from "@/pages/profile";
import AdminDomains from "@/pages/admin/domains";
import AdminScraping from "@/pages/admin/scraping";
import StackDetail from "@/pages/stacks/[id]";
import JobsPage from "@/pages/jobs/index";
import JobDetailPage from "@/pages/jobs/[id]";
import MarketIntelligence from "@/pages/market-intelligence";
import NotFound from "@/pages/not-found";

export function AppRoutes() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/portfolio" component={Portfolio} />
        <Route path="/portfolio/:id" component={PortfolioDetail} />
        <Route path="/student-portfolios" component={StudentPortfolios} />
        <Route path="/scores" component={Scores} />
        <Route path="/roadmaps" component={Roadmaps} />
        <Route path="/roadmaps/:id" component={RoadmapDetail} />
        <Route path="/jobs" component={Jobs} />
        <Route path="/admin/domains" component={AdminDomains} />
        <Route path="/admin/scraping" component={AdminScraping} />
        <Route path="/stacks/:id" component={StackDetail} />
        <Route path="/profile" component={Profile} />
        <Route path="/jobs" component={JobsPage} />
        <Route path="/jobs/:id" component={JobDetailPage} />
        <Route path="/market-intelligence" component={MarketIntelligence} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}
