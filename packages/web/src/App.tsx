import { Route, Routes } from 'react-router-dom';

import { ErrorBoundary } from '@/components/error';
import { AuthLayout, MainLayout } from '@/layout';
import { ForgotPassword, Login, Register, ResetPassword, VerifyEmail } from '@/pages/auth';
import { Landing, NotFound } from '@/pages/general';
import { JobDetails, Jobs } from '@/pages/jobs';
import { Profile } from '@/pages/profile';

import { ProtectedRoute } from './components/auth';

function App() {
  return (
    <ErrorBoundary>
      <Routes>
        {/* Public routes with main layout*/}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/jobs/:id" element={<JobDetails />} />

          {/* Protected routes */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          {/* 404 - catch all */}
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* Auth routes with auth layout*/}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}

export default App;
