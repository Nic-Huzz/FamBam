import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

// Loading spinner component
function PageLoader() {
  return (
    <div className="loading-container" style={{ minHeight: '100vh' }}>
      <div className="spinner"></div>
    </div>
  )
}

// Lazy load pages - these will be split into separate chunks
const Landing = lazy(() => import('./pages/Landing'))
const Login = lazy(() => import('./pages/Login'))
const Signup = lazy(() => import('./pages/Signup'))
const Feed = lazy(() => import('./pages/Feed'))
const NewPost = lazy(() => import('./pages/NewPost'))
const PostDetail = lazy(() => import('./pages/PostDetail'))
const Challenges = lazy(() => import('./pages/Challenges'))
const History = lazy(() => import('./pages/History'))
const WeeklyRecap = lazy(() => import('./pages/WeeklyRecap'))
const Leaderboard = lazy(() => import('./pages/Leaderboard'))
const Profile = lazy(() => import('./pages/Profile'))
const Debug = lazy(() => import('./pages/Debug'))
const Terms = lazy(() => import('./pages/Terms'))
const Privacy = lazy(() => import('./pages/Privacy'))

// Protected route wrapper
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <PageLoader />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}

// Public route wrapper (redirects logged-in users)
function PublicRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <PageLoader />
  }

  if (user) {
    return <Navigate to="/feed" replace />
  }

  return children
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={
          <PublicRoute>
            <Landing />
          </PublicRoute>
        } />
        <Route path="/login" element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } />
        <Route path="/signup" element={
          <PublicRoute>
            <Signup />
          </PublicRoute>
        } />

        {/* Protected routes */}
        <Route path="/feed" element={
          <ProtectedRoute>
            <Feed />
          </ProtectedRoute>
        } />
        <Route path="/post/new" element={
          <ProtectedRoute>
            <NewPost />
          </ProtectedRoute>
        } />
        <Route path="/post/:id" element={
          <ProtectedRoute>
            <PostDetail />
          </ProtectedRoute>
        } />
        <Route path="/challenges" element={
          <ProtectedRoute>
            <Challenges />
          </ProtectedRoute>
        } />
        <Route path="/history" element={
          <ProtectedRoute>
            <History />
          </ProtectedRoute>
        } />
        <Route path="/recap" element={
          <ProtectedRoute>
            <WeeklyRecap />
          </ProtectedRoute>
        } />
        <Route path="/leaderboard" element={
          <ProtectedRoute>
            <Leaderboard />
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } />

        {/* Debug route */}
        <Route path="/debug" element={<Debug />} />

        {/* Legal pages (public) */}
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />

        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
