import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/auth/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        
        {/* Protected routes */}
        <Route path="/app" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      </Routes>
    </AuthProvider>
  );
}

export default App;