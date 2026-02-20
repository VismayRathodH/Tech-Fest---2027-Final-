import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ScrollToTop } from './components/ScrollToTop';
import { ProtectedRoute } from './components/ProtectedRoute';
import { HomePage } from './pages/HomePage';
import { DepartmentEventsPage } from './pages/DepartmentEventsPage';
import { RegisterPage } from './pages/RegisterPage';
import { TrackStatusPage } from './pages/TrackStatusPage';
import { LoginPage } from './pages/LoginPage';
import { CoordinatorDashboardPage } from './pages/CoordinatorDashboardPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { HelpPage } from './pages/HelpPage';

function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/department/:code" element={<DepartmentEventsPage />} />
          <Route path="/register/:eventId" element={<RegisterPage />} />
          <Route path="/track" element={<TrackStatusPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/coordinator"
            element={
              <ProtectedRoute roles={['coordinator', 'admin']}>
                <CoordinatorDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
    </>
  );
}

export default App;
