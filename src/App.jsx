import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Journal from './pages/Journal';
import MemoryBank from './pages/MemoryBank';
import Digest from './pages/Digest';
import PersonDetail from './pages/PersonDetail';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/journal" element={<Journal />} />
        <Route path="/journal/:childId" element={<Journal />} />
        <Route path="/memories" element={<MemoryBank />} />
        <Route path="/digest" element={<Digest />} />
        <Route path="/person/:personId" element={<PersonDetail />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
