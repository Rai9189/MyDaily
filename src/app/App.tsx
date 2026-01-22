import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { AccountProvider } from './context/AccountContext';
import { CategoryProvider } from './context/CategoryContext';
import { TransactionProvider } from './context/TransactionContext';
import { TaskProvider } from './context/TaskContext';
import { NoteProvider } from './context/NoteContext';
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

// Auth Guard Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isLoggedIn = localStorage.getItem('isLoggedIn');
  const pinSetup = localStorage.getItem('pinSetup');
  const pinUnlocked = localStorage.getItem('pinUnlocked');

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  if (!pinSetup) {
    return <Navigate to="/pin-setup" replace />;
  }

  if (!pinUnlocked) {
    return <Navigate to="/pin-lock" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CategoryProvider>
          <AccountProvider>
            <TransactionProvider>
              <TaskProvider>
                <NoteProvider>
                  <BrowserRouter>
                    <Routes>
                      {/* Public Routes */}
                      <Route path="/login" element={<Login />} />
                      <Route path="/register" element={<Register />} />
                      <Route path="/forgot-password" element={<ForgotPassword />} />
                      
                      {/* Auth Setup Routes */}
                      <Route path="/pin-setup" element={<PINSetup />} />
                      <Route path="/pin-lock" element={<PINLock />} />

                      {/* Protected Routes */}
                      <Route
                        path="/"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Dashboard />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/accounts"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Accounts />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/transactions"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Transactions />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/transactions/:id"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <TransactionDetail />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/transactions/new"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <TransactionDetail />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/tasks"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Tasks />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/tasks/:id"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <TaskDetail />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/tasks/new"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <TaskDetail />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/notes"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Notes />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/notes/:id"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <NoteDetail />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/notes/new"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <NoteDetail />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/profile"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Profile />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/categories"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Categories />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                    </Routes>
                  </BrowserRouter>
                </NoteProvider>
              </TaskProvider>
            </TransactionProvider>
          </AccountProvider>
        </CategoryProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}