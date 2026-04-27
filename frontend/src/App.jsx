import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import ProjectDetail from './pages/ProjectDetail';
import StoryDetail from './pages/StoryDetail';
import TaskDetail from './pages/TaskDetail';

export default function App() {
  return (
    <div className="app">
      <Navbar />
      <main className="container">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:id"
            element={
              <ProtectedRoute>
                <ProjectDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:id/stories/:storyID"
            element={
              <ProtectedRoute>
                <StoryDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tasks/:taskID"
            element={
              <ProtectedRoute>
                <TaskDetail />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
