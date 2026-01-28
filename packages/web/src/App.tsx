import { Route, Routes } from 'react-router-dom';

import { MainLayout } from '@/layout/main-layout.tsx';
import { Landing } from '@/pages/landing.tsx';

function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Landing />} />
      </Route>
    </Routes>
  );
}

export default App;
