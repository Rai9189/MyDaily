// src/app/App.tsx
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AccountProvider } from './context/AccountContext';
import { CategoryProvider } from './context/CategoryContext';
import { TransactionProvider } from './context/TransactionContext';
import { TaskProvider } from './context/TaskContext';
import { NoteProvider } from './context/NoteContext';
import { AttachmentProvider } from './context/AttachmentContext';
import { TrashProvider } from './context/TrashContext';
import { Layout } from './components/Layout';
import { Loader2 } from 'lucide-react';
import { Toaster } from './components/ui/sonner';

// Lazy-loaded per route so the initial bundle doesn't pull in every page's dependencies.
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Register = lazy(() => import('./pages/Register').then(m => ({ default: m.Register })));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword').then(m => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => import('./pages/ResetPassword').then(m => ({ default: m.ResetPassword })));
const PINSetup = lazy(() => import('./pages/PINSetup').then(m => ({ default: m.PINSetup })));
const PINLock = lazy(() => import('./pages/PINLock').then(m => ({ default: m.PINLock })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Accounts = lazy(() => import('./pages/Accounts').then(m => ({ default: m.Accounts })));
const Transactions = lazy(() => import('./pages/Transactions').then(m => ({ default: m.Transactions })));
const TransactionDetail = lazy(() => import('./pages/TransactionDetail').then(m => ({ default: m.TransactionDetail })));
const Tasks = lazy(() => import('./pages/Tasks').then(m => ({ default: m.Tasks })));
const TaskDetail = lazy(() => import('./pages/TaskDetail').then(m => ({ default: m.TaskDetail })));
const Notes = lazy(() => import('./pages/Notes').then(m => ({ default: m.Notes })));
const NoteDetail = lazy(() => import('./pages/NoteDetail').then(m => ({ default: m.NoteDetail })));
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Categories = lazy(() => import('./pages/Categories').then(m => ({ default: m.Categories })));
const Trash = lazy(() => import('./pages/Trash').then(m => ({ default: m.Trash })));

function DataProviders({ children }: { children: React.ReactNode }) {
  return (
    <CategoryProvider>
      <AccountProvider>
        <TransactionProvider>
          <TaskProvider>
            <NoteProvider>
              <AttachmentProvider>
                <TrashProvider>
                  {children}
                </TrashProvider>
              </AttachmentProvider>
            </NoteProvider>
          </TaskProvider>
        </TransactionProvider>
      </AccountProvider>
    </CategoryProvider>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, session, loading, profileLoading, hasPin } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" replace />;
  if (profileLoading || !user) return <LoadingScreen />;
  if (!hasPin()) return <Navigate to="/pin-setup" replace />;

  const pinUnlocked = sessionStorage.getItem('pinUnlocked');
  if (!pinUnlocked) return <Navigate to="/pin-lock" replace />;

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, session, loading, profileLoading, hasPin } = useAuth();

  if (loading) return <LoadingScreen />;

  if (session) {
    if (profileLoading || !user) return <LoadingScreen />;
    if (!hasPin()) return <Navigate to="/pin-setup" replace />;

    const pinUnlocked = sessionStorage.getItem('pinUnlocked');
    if (!pinUnlocked) return <Navigate to="/pin-lock" replace />;

    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function PINRoute({ children, requireNotUnlocked = false }: {
  children: React.ReactNode;
  requireNotUnlocked?: boolean;
}) {
  const { session, loading, profileLoading, user, hasPin } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" replace />;
  if (profileLoading || !user) return <LoadingScreen />;

  if (requireNotUnlocked) {
    const pinUnlocked = sessionStorage.getItem('pinUnlocked');
    if (pinUnlocked && hasPin()) return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <DataProviders>
      <Suspense fallback={<LoadingScreen />}>
      <Routes>
        {/* Public routes */}
        <Route path="/login"           element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register"        element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />

        {/* Reset password — tidak pakai PublicRoute agar bisa diakses via link email */}
        <Route path="/reset-password"  element={<ResetPassword />} />

        {/* PIN routes */}
        <Route path="/pin-setup" element={<PINRoute><PINSetup /></PINRoute>} />
        <Route path="/pin-lock"  element={<PINRoute requireNotUnlocked><PINLock /></PINRoute>} />

        {/* Protected routes */}
        <Route path="/"                  element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
        <Route path="/accounts"          element={<ProtectedRoute><Layout><Accounts /></Layout></ProtectedRoute>} />
        <Route path="/transactions"      element={<ProtectedRoute><Layout><Transactions /></Layout></ProtectedRoute>} />
        <Route path="/transactions/new"  element={<ProtectedRoute><Layout><TransactionDetail /></Layout></ProtectedRoute>} />
        <Route path="/transactions/:id"  element={<ProtectedRoute><Layout><TransactionDetail /></Layout></ProtectedRoute>} />
        <Route path="/tasks"             element={<ProtectedRoute><Layout><Tasks /></Layout></ProtectedRoute>} />
        <Route path="/tasks/new"         element={<ProtectedRoute><Layout><TaskDetail /></Layout></ProtectedRoute>} />
        <Route path="/tasks/:id"         element={<ProtectedRoute><Layout><TaskDetail /></Layout></ProtectedRoute>} />
        <Route path="/notes"             element={<ProtectedRoute><Layout><Notes /></Layout></ProtectedRoute>} />
        <Route path="/notes/new"         element={<ProtectedRoute><Layout><NoteDetail /></Layout></ProtectedRoute>} />
        <Route path="/notes/:id"         element={<ProtectedRoute><Layout><NoteDetail /></Layout></ProtectedRoute>} />
        <Route path="/profile"           element={<ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute>} />
        <Route path="/settings"          element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />
        <Route path="/categories"        element={<ProtectedRoute><Layout><Categories /></Layout></ProtectedRoute>} />
        <Route path="/trash"             element={<ProtectedRoute><Layout><Trash /></Layout></ProtectedRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </DataProviders>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Toaster
            position="top-center"
            richColors
            closeButton
            duration={3000}
            toastOptions={{
              style: { fontSize: '14px' },
            }}
          />
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}