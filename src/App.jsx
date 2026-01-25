// src/App.jsx
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import TreePage from './pages/TreePage';
import WritePage from './pages/WritePage';
import ExplorePage from './pages/ExplorePage';
import ReportPage from './pages/ReportPage';
import LoginPage from './pages/LoginPage';
import './App.css'; // 여기엔 전체 레이아웃이나 Figma 공통 스타일만 남깁니다.
import ProtectedRoute from './components/ProtectedRoute'; // 위에서 만든 컴포넌트

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/tree" element={
        <ProtectedRoute>
          <TreePage />
        </ProtectedRoute>
      } />
      <Route path="/write" element={
        <ProtectedRoute>
          <WritePage />
        </ProtectedRoute>
      } />
      <Route path="/explore" element={
        <ProtectedRoute>
          <ExplorePage />
        </ProtectedRoute>
      } />
      <Route path="/report" element={
        <ProtectedRoute>
          <ReportPage />
        </ProtectedRoute>
      } />
    </Routes>
  );
}

export default App;