import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';

const Practice = lazy(() => import('./practice/Practice.jsx'));
const Multiplayer = lazy(() => import('./multiplayer/Multiplayer.jsx'));

function Redirect({ to }) {
  const { search, hash } = useLocation();
  return <Navigate to={{ pathname: to, search, hash }} replace />;
}

export default function App() {
  return <BrowserRouter>
    <Suspense fallback={<div style={{ padding: 40, color: 'white', background: '#10121b' }}>Opening Fatebound…</div>}>
      <Routes>
        <Route path="/" element={<Practice />} />
        <Route path="/practice" element={<Practice />} />
        <Route path="/multiplayer" element={<Multiplayer />} />
        <Route path="/login" element={<Redirect to="/multiplayer" />} />
        <Route path="/LoginPage" element={<Redirect to="/multiplayer" />} />
        <Route path="/Profile" element={<Redirect to="/multiplayer" />} />
        <Route path="/TCG" element={<Redirect to="/" />} />
        <Route path="/TCGMainMenu" element={<Redirect to="/" />} />
        <Route path="*" element={<Redirect to="/" />} />
      </Routes>
    </Suspense>
  </BrowserRouter>;
}
