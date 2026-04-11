// src/app/App.tsx
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
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { PINSetup } from './pages/PINSetup';
import { PINLock } from './pages/PINLock';
import { Dashboard } from './pages/Dashboard';
import { Accounts } from './pages/Accounts';
import { Transactions } from './pages/Transactions';
import { TransactionDetail } from './pages/TransactionDetail';
import { Tasks } from './pages/Tasks';
import { TaskDetail } from './pages/TaskDetail';
import { Notes } from './pages/Notes';
import { NoteDetail } from './pages/NoteDetail';
import { Profile } from './pages/Profile';
import { Settings } from './pages/Settings';
import { Categories } from './pages/Categories';
import { Trash } from './pages/Trash';
import { Loader2 } from 'lucide-react';
import { Toaster } from 'sonner';

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