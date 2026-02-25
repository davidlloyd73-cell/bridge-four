import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Corkboard from './pages/Corkboard';
import Archive from './pages/Archive';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Corkboard />} />
        <Route path="/archive" element={<Archive />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
