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

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );
}

// Protected Route - user harus login, punya PIN, dan sudah unlock
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, session, loading, profileLoading, hasPin } = useAuth();

  // Tunggu auth loading selesai
  if (loading) return <LoadingScreen />;

  // Tidak ada session → belum login
  if (!session) return <Navigate to="/login" replace />;

  // Ada session tapi profile masih loading → tampilkan loading
  if (profileLoading && !user) return <LoadingScreen />;

  // Profile sudah ada, cek PIN
  if (!hasPin()) return <Navigate to="/pin-setup" replace />;
  const pinUnlocked = sessionStorage.getItem('pinUnlocked');
  if (!pinUnlocked) return <Navigate to="/pin-lock" replace />;

  return <>{children}</>;
}

// Public Route - redirect ke dalam app jika sudah login & unlock
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, session, loading, profileLoading, hasPin } = useAuth();

  if (loading) return <LoadingScreen />;

  // Ada session → sudah login, redirect ke dalam app
  if (session) {
    // Tunggu profile selesai dulu untuk tahu apakah punya PIN
    if (profileLoading && !user) return <LoadingScreen />;
    if (!hasPin()) return <Navigate to="/pin-setup" replace />;
    const pinUnlocked = sessionStorage.getItem('pinUnlocked');
    if (!pinUnlocked) return <Navigate to="/pin-lock" replace />;
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <DataProviders>
      <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
        <Route path="/pin-setup" element={<PINSetup />} />
        <Route path="/pin-lock" element={<PINLock />} />
        <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
        <Route path="/accounts" element={<ProtectedRoute><Layout><Accounts /></Layout></ProtectedRoute>} />
        <Route path="/transactions" element={<ProtectedRoute><Layout><Transactions /></Layout></ProtectedRoute>} />
        <Route path="/transactions/new" element={<ProtectedRoute><Layout><TransactionDetail /></Layout></ProtectedRoute>} />
        <Route path="/transactions/:id" element={<ProtectedRoute><Layout><TransactionDetail /></Layout></ProtectedRoute>} />
        <Route path="/tasks" element={<ProtectedRoute><Layout><Tasks /></Layout></ProtectedRoute>} />
        <Route path="/tasks/new" element={<ProtectedRoute><Layout><TaskDetail /></Layout></ProtectedRoute>} />
        <Route path="/tasks/:id" element={<ProtectedRoute><Layout><TaskDetail /></Layout></ProtectedRoute>} />
        <Route path="/notes" element={<ProtectedRoute><Layout><Notes /></Layout></ProtectedRoute>} />
        <Route path="/notes/new" element={<ProtectedRoute><Layout><NoteDetail /></Layout></ProtectedRoute>} />
        <Route path="/notes/:id" element={<ProtectedRoute><Layout><NoteDetail /></Layout></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute>} />
        <Route path="/categories" element={<ProtectedRoute><Layout><Categories /></Layout></ProtectedRoute>} />
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
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}