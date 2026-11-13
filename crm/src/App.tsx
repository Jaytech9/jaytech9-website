import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/auth';
import Layout from './components/Layout';
import Login from './pages/Login';
import { Skeleton } from './components/ui';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Bookings = lazy(() => import('./pages/Bookings'));
const Enquiries = lazy(() => import('./pages/Enquiries'));
const Clients = lazy(() => import('./pages/Clients'));
const Pipeline = lazy(() => import('./pages/Pipeline'));
const Projects = lazy(() => import('./pages/Projects'));
const Messages = lazy(() => import('./pages/Messages'));
const Website = lazy(() => import('./pages/Website'));
const Reviews = lazy(() => import('./pages/Reviews'));
const Settings = lazy(() => import('./pages/Settings'));

export default function App() {
  const { user, ready } = useAuth();
  if (!ready) return <div style={{ padding: 40 }}><Skeleton rows={3} /></div>;
  if (!user) return <Routes><Route path="*" element={<Login />} /></Routes>;
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Lazy><Dashboard /></Lazy>} />
        <Route path="bookings" element={<Lazy><Bookings /></Lazy>} />
        <Route path="enquiries" element={<Lazy><Enquiries /></Lazy>} />
        <Route path="clients" element={<Lazy><Clients /></Lazy>} />
        <Route path="pipeline" element={<Lazy><Pipeline /></Lazy>} />
        <Route path="projects" element={<Lazy><Projects /></Lazy>} />
        <Route path="messages" element={<Lazy><Messages /></Lazy>} />
        <Route path="website" element={<Lazy><Website /></Lazy>} />
        <Route path="reviews" element={<Lazy><Reviews /></Lazy>} />
        <Route path="settings" element={<Lazy><Settings /></Lazy>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

const Lazy = ({ children }: { children: React.ReactNode }) => <Suspense fallback={<div className="card"><Skeleton rows={6} /></div>}>{children}</Suspense>;
