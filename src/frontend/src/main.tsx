import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { SessionPage } from './pages/SessionPage';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename="/personal/screenshare">
      <Routes>
        <Route path="/" element={<Navigate to="/session/demo" replace />} />
        <Route path="/session/:sessionId" element={<SessionPage />} />
        <Route path="*" element={<Navigate to="/session/demo" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
