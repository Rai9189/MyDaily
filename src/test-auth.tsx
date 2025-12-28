import { useAuth } from './context/AuthContext';

export function TestAuth() {
  const { user, profile, loading, signIn } = useAuth();

  const handleTestLogin = async () => {
    try {
      await signIn('test@example.com', 'password123');
      console.log('Login success!');
    } catch (error: any) {
      console.error('Login error:', error.message);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Auth Test</h1>
      <p>User: {user ? user.email : 'Not logged in'}</p>
      <p>Profile: {profile ? profile.name : 'No profile'}</p>
      <button onClick={handleTestLogin}>Test Login</button>
    </div>
  );
}