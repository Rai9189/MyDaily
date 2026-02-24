import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AccountProvider } from './context/AccountContext';
import { CategoryProvider } from './context/CategoryContext';
import { TransactionProvider } from './context/TransactionContext';
import { TaskProvider } from './context/TaskContext';
import { NoteProvider } from './context/NoteContext';
import { AttachmentProvider } from './context/AttachmentContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
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
import { Categories } from './pages/Categories';
import { Loader2 } from 'lucide-react';

// Wrapper semua data provider — hanya dirender setelah user terautentikasi
function DataProviders({ children }: { children: React.ReactNode }) {
  return (
    <CategoryProvider>
      <AccountProvider>
        <TransactionProvider>
          <TaskProvider>
            <NoteProvider>
              <AttachmentProvider>
                {children}
              </AttachmentProvider>
            </NoteProvider>
          </TaskProvider>
        </TransactionProvider>
      </AccountProvider>
    </CategoryProvider>
  );
}

// Auth Guard Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const pinSetup = localStorage.getItem('pinSetup');
  if (!pinSetup) {
    return <Navigate to="/pin-setup" replace />;
  }

  // ✅ FIX: Gunakan sessionStorage agar otomatis terhapus saat browser/tab ditutup
  const pinUnlocked = sessionStorage.getItem('pinUnlocked');
  if (!pinUnlocked) {
    return <Navigate to="/pin-lock" replace />;
  }

  return <>{children}</>;
}

// Public Route - redirect ke dashboard jika sudah login
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (user) {
    const pinSetup = localStorage.getItem('pinSetup');
    // ✅ FIX: Gunakan sessionStorage agar otomatis terhapus saat browser/tab ditutup
    const pinUnlocked = sessionStorage.getItem('pinUnlocked');

    if (!pinSetup) return <Navigate to="/pin-setup" replace />;
    if (!pinUnlocked) return <Navigate to="/pin-lock" replace />;
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
            <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />

            {/* Auth Setup Routes */}
            <Route path="/pin-setup" element={<PINSetup />} />
            <Route path="/pin-lock" element={<PINLock />} />

            {/* Protected Routes — DataProviders hanya mount setelah auth OK */}
            <Route path="/" element={
              <ProtectedRoute>
                <DataProviders>
                  <Layout><Dashboard /></Layout>
                </DataProviders>
              </ProtectedRoute>
            } />
            <Route path="/accounts" element={
              <ProtectedRoute>
                <DataProviders>
                  <Layout><Accounts /></Layout>
                </DataProviders>
              </ProtectedRoute>
            } />
            <Route path="/transactions" element={
              <ProtectedRoute>
                <DataProviders>
                  <Layout><Transactions /></Layout>
                </DataProviders>
              </ProtectedRoute>
            } />
            <Route path="/transactions/new" element={
              <ProtectedRoute>
                <DataProviders>
                  <Layout><TransactionDetail /></Layout>
                </DataProviders>
              </ProtectedRoute>
            } />
            <Route path="/transactions/:id" element={
              <ProtectedRoute>
                <DataProviders>
                  <Layout><TransactionDetail /></Layout>
                </DataProviders>
              </ProtectedRoute>
            } />
            <Route path="/tasks" element={
              <ProtectedRoute>
                <DataProviders>
                  <Layout><Tasks /></Layout>
                </DataProviders>
              </ProtectedRoute>
            } />
            <Route path="/tasks/new" element={
              <ProtectedRoute>
                <DataProviders>
                  <Layout><TaskDetail /></Layout>
                </DataProviders>
              </ProtectedRoute>
            } />
            <Route path="/tasks/:id" element={
              <ProtectedRoute>
                <DataProviders>
                  <Layout><TaskDetail /></Layout>
                </DataProviders>
              </ProtectedRoute>
            } />
            <Route path="/notes" element={
              <ProtectedRoute>
                <DataProviders>
                  <Layout><Notes /></Layout>
                </DataProviders>
              </ProtectedRoute>
            } />
            <Route path="/notes/new" element={
              <ProtectedRoute>
                <DataProviders>
                  <Layout><NoteDetail /></Layout>
                </DataProviders>
              </ProtectedRoute>
            } />
            <Route path="/notes/:id" element={
              <ProtectedRoute>
                <DataProviders>
                  <Layout><NoteDetail /></Layout>
                </DataProviders>
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <DataProviders>
                  <Layout><Profile /></Layout>
                </DataProviders>
              </ProtectedRoute>
            } />
            <Route path="/categories" element={
              <ProtectedRoute>
                <DataProviders>
                  <Layout><Categories /></Layout>
                </DataProviders>
              </ProtectedRoute>
            } />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}