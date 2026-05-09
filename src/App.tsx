import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationsProvider } from "@/contexts/NotificationsContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import CreateEvent from "./pages/CreateEvent";
import MyEvents from "./pages/MyEvents";
import BrowseEvents from "./pages/BrowseEvents";
import BrowseSponsors from "./pages/BrowseSponsors";
import ConnectionRequests from "./pages/ConnectionRequests";
import EditSponsorProfile from "./pages/EditSponsorProfile";
import Matches from "./pages/Matches";
import Messages from "./pages/Messages";
import OrganizerProfile from "./pages/OrganizerProfile";
import CreatorDashboard from "./pages/CreatorDashboard";
import ProviderDashboard from "./pages/ProviderDashboard";
import EditCreatorProfile from "./pages/EditCreatorProfile";
import BrowseCreators from "./pages/BrowseCreators";
import BrowsePerformers from "./pages/BrowsePerformers";
import BrowseVendors from "./pages/BrowseVendors";
import BrowseGigs from "./pages/BrowseGigs";
import AdminDashboard from "./pages/AdminDashboard";
import Seed from "./pages/Seed";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import EventDashboard from "./pages/EventDashboard";
import PublicEvents from "./pages/PublicEvents";
import PublicProfile from "./pages/PublicProfile";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <NotificationsProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/seed" element={<Seed />} />
            <Route path="/" element={<Index />} />
            <Route path="/explore-events" element={<PublicEvents />} />
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/create-event" element={<CreateEvent />} />
              <Route path="/event/:id/edit" element={<CreateEvent />} />
              <Route path="/event/:id/dashboard" element={<EventDashboard />} />
              <Route path="/my-events" element={<MyEvents />} />
              <Route path="/browse-events" element={<BrowseEvents />} />
              <Route path="/browse-sponsors" element={<BrowseSponsors />} />
              <Route path="/browse-creators" element={<BrowseCreators />} />
              <Route path="/browse-performers" element={<BrowsePerformers />} />
              <Route path="/browse-vendors" element={<BrowseVendors />} />
              <Route path="/requests" element={<ConnectionRequests />} />
              <Route path="/edit-profile" element={<EditSponsorProfile />} />
              <Route path="/matches" element={<Matches />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/organizer/:id" element={<OrganizerProfile />} />
              <Route path="/profile/:id" element={<PublicProfile />} />
              <Route path="/creator-dashboard" element={<CreatorDashboard />} />
              <Route path="/provider-dashboard" element={<ProviderDashboard />} />
              <Route path="/edit-creator-profile" element={<EditCreatorProfile />} />
              <Route path="/browse-gigs" element={<BrowseGigs />} />
              <Route path="/admin" element={<AdminDashboard />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
          </NotificationsProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
