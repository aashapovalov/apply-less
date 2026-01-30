import { Route, Routes } from 'react-router-dom';

import { AuthLayout, MainLayout } from '@/layout';
import { Landing, Login, Register } from '@/pages';

function App() {
  return (
    <Routes>
      {/* Public routes with main layout*/}
      <Route element={<MainLayout />}>
        <Route path="/" element={<Landing />} />
      </Route>

      {/* Auth routes with auth layout*/}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>
    </Routes>
  );
}

export default App;
