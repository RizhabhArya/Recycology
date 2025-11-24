import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/ToastContext';
import Header from './components/Layout/Header';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AdminRetry from './pages/AdminRetry';
import CreatePost from './pages/CreatePost';
import ProjectDetail from './pages/ProjectDetail';
import CommunityPostDetail from './pages/CommunityPostDetail';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import './App.css';

function App() {
  return (    
    <AuthProvider>
      <ToastProvider>
      <Router>
        <div className="App">
          <Header />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/create-post"
              element={
                <ProtectedRoute>
                  <CreatePost />
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
              path="/community/:id"
              element={
                <ProtectedRoute>
                  <CommunityPostDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/retry"
              element={
                <ProtectedRoute>
                  <AdminRetry />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;

