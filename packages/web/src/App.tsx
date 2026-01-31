import { Route, Routes } from 'react-router-dom';

import { AuthLayout, MainLayout } from '@/layout';
import {
  ForgotPassword,
  JobDetails,
  Jobs,
  Landing,
  Login,
  Register,
  ResetPassword,
  VerifyEmail,
} from '@/pages/general';

function App() {
  return (
    <Routes>
      {/* Public routes with main layout*/}
      <Route element={<MainLayout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/jobs/:id" element={<JobDetails />} />
      </Route>

      {/* Auth routes with auth layout*/}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
      </Route>
    </Routes>
  );
}

export default App;
