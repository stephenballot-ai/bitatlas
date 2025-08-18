import { useState, useEffect, createContext, useContext } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

// Auth Context
interface AuthContextType {
  user: any;
  token: string | null;
  login: (token: string, user: any) => void;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize auth state from localStorage
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch (error) {
        // Clear invalid data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = (newToken: string, newUser: any) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontFamily: 'system-ui'
      }}>
        <div>Loading BitAtlas...</div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{
      user,
      token,
      login,
      logout,
      isAuthenticated: !!token && !!user,
      loading
    }}>
      {children}
    </AuthContext.Provider>
  );
}

function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

// Simple HomePage Component
function HomePage() {
  const [apiStatus, setApiStatus] = useState<any>(null);
  const { isAuthenticated, user, logout } = useAuth();

  useEffect(() => {
    axios.get('http://localhost:3001/api/status')
      .then(response => setApiStatus(response.data))
      .catch(console.error);
  }, []);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px', fontFamily: 'system-ui' }}>
      <header style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ color: '#1d70b8', fontSize: '3rem', marginBottom: '10px' }}>BitAtlas</h1>
        <p style={{ fontSize: '1.2rem', color: '#505a5f' }}>Secure EU Cloud Storage with AI Assistant Integration</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        <div style={{ border: '1px solid #b1b4b6', padding: '20px', borderRadius: '4px' }}>
          <h3 style={{ color: '#00703c', marginTop: 0 }}>🔐 Secure Authentication</h3>
          <p>Multi-factor authentication and session management</p>
        </div>
        <div style={{ border: '1px solid #b1b4b6', padding: '20px', borderRadius: '4px' }}>
          <h3 style={{ color: '#00703c', marginTop: 0 }}>📁 File Management</h3>
          <p>Upload, organize, and share your files securely</p>
        </div>
        <div style={{ border: '1px solid #b1b4b6', padding: '20px', borderRadius: '4px' }}>
          <h3 style={{ color: '#00703c', marginTop: 0 }}>🤖 AI Integration</h3>
          <p>Connect AI assistants with OAuth 2.0 + PKCE</p>
        </div>
        <div style={{ border: '1px solid #b1b4b6', padding: '20px', borderRadius: '4px' }}>
          <h3 style={{ color: '#00703c', marginTop: 0 }}>🛡️ GDPR Compliant</h3>
          <p>European data protection with audit trails</p>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        {isAuthenticated ? (
          <div>
            <p style={{ marginBottom: '20px', fontSize: '1.1rem' }}>
              Welcome back, <strong>{user?.email}</strong>!
            </p>
            <Link to="/dashboard" style={{ 
              background: '#00703c', 
              color: 'white', 
              padding: '12px 24px', 
              textDecoration: 'none', 
              marginRight: '15px',
              borderRadius: '4px',
              display: 'inline-block'
            }}>
              Go to Dashboard
            </Link>
            <button onClick={logout} style={{ 
              background: '#d4351c', 
              color: 'white', 
              padding: '12px 24px', 
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}>
              Sign Out
            </button>
          </div>
        ) : (
          <div>
            <Link to="/login" style={{ 
              background: '#00703c', 
              color: 'white', 
              padding: '12px 24px', 
              textDecoration: 'none', 
              marginRight: '15px',
              borderRadius: '4px',
              display: 'inline-block'
            }}>
              Sign In
            </Link>
            <Link to="/register" style={{ 
              background: '#1d70b8', 
              color: 'white', 
              padding: '12px 24px', 
              textDecoration: 'none',
              borderRadius: '4px',
              display: 'inline-block'
            }}>
              Create Account
            </Link>
          </div>
        )}
      </div>

      {apiStatus && (
        <div style={{ background: '#f3f2f1', padding: '20px', borderRadius: '4px' }}>
          <h3>🚀 API Status</h3>
          <p><strong>Version:</strong> {apiStatus.version}</p>
          <p><strong>Features:</strong> {apiStatus.features?.join(', ')}</p>
          <details>
            <summary style={{ cursor: 'pointer', color: '#1d70b8' }}>API Endpoints</summary>
            <pre style={{ background: 'white', padding: '10px', borderRadius: '4px', fontSize: '0.9rem' }}>
              {JSON.stringify(apiStatus.endpoints, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}

// Simple Login Component
function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Basic validation
    if (!email || !password) {
      setError('Please enter both email and password');
      setLoading(false);
      return;
    }
    
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }
    
    try {
      const response = await axios.post('http://localhost:3001/api/auth/login', { email, password });
      login(response.data.token, response.data.user);
      navigate('/dashboard');
    } catch (error) {
      setError('Login failed: ' + (error as any).response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '100px auto', padding: '40px 20px', fontFamily: 'system-ui' }}>
      <h1 style={{ textAlign: 'center', color: '#1d70b8' }}>Sign In to BitAtlas</h1>
      {error && (
        <div style={{ background: '#fef7f7', border: '1px solid #d4351c', padding: '15px', borderRadius: '4px', marginBottom: '20px' }}>
          <div style={{ color: '#d4351c', fontSize: '0.9rem' }}>
            {error}
          </div>
        </div>
      )}
      <form onSubmit={handleLogin} style={{ background: '#f3f2f1', padding: '30px', borderRadius: '4px' }}>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Email:</label>
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: '8px', border: '1px solid #b1b4b6', borderRadius: '4px' }}
            required 
          />
        </div>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Password:</label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: '8px', border: '1px solid #b1b4b6', borderRadius: '4px' }}
            required 
          />
        </div>
        <button 
          type="submit" 
          disabled={loading}
          style={{ 
            width: '100%', 
            background: '#00703c', 
            color: 'white', 
            padding: '12px', 
            border: 'none', 
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
      <p style={{ textAlign: 'center', marginTop: '20px' }}>
        Don't have an account? <Link to="/register" style={{ color: '#1d70b8' }}>Create one</Link>
      </p>
      <p style={{ textAlign: 'center' }}>
        <Link to="/" style={{ color: '#1d70b8' }}>← Back to Homepage</Link>
      </p>
    </div>
  );
}

// Simple Register Component  
function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const navigate = useNavigate();

  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    return errors;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors([]);
    
    // Validate passwords
    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
      setErrors(passwordErrors);
      setLoading(false);
      return;
    }
    
    if (password !== confirmPassword) {
      setErrors(['Passwords do not match']);
      setLoading(false);
      return;
    }
    
    try {
      const response = await axios.post('http://localhost:3001/api/auth/register', { email, password });
      alert('Registration successful! You can now sign in.');
      navigate('/login');
    } catch (error) {
      setErrors(['Registration failed: ' + (error as any).response?.data?.error]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '100px auto', padding: '40px 20px', fontFamily: 'system-ui' }}>
      <h1 style={{ textAlign: 'center', color: '#1d70b8' }}>Create BitAtlas Account</h1>
      {errors.length > 0 && (
        <div style={{ background: '#fef7f7', border: '1px solid #d4351c', padding: '15px', borderRadius: '4px', marginBottom: '20px' }}>
          {errors.map((error, index) => (
            <div key={index} style={{ color: '#d4351c', fontSize: '0.9rem', marginBottom: errors.length > 1 && index < errors.length - 1 ? '5px' : '0' }}>
              • {error}
            </div>
          ))}
        </div>
      )}
      
      <form onSubmit={handleRegister} style={{ background: '#f3f2f1', padding: '30px', borderRadius: '4px' }}>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Email:</label>
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: '8px', border: '1px solid #b1b4b6', borderRadius: '4px' }}
            required 
          />
        </div>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Password:</label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: '8px', border: '1px solid #b1b4b6', borderRadius: '4px' }}
            required 
          />
          <small style={{ color: '#505a5f', fontSize: '0.8rem', display: 'block', marginTop: '3px' }}>
            Must be 8+ characters with uppercase, lowercase, number, and special character
          </small>
        </div>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Confirm Password:</label>
          <input 
            type="password" 
            value={confirmPassword} 
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={{ width: '100%', padding: '8px', border: '1px solid #b1b4b6', borderRadius: '4px' }}
            required 
          />
        </div>
        <button 
          type="submit" 
          disabled={loading}
          style={{ 
            width: '100%', 
            background: '#1d70b8', 
            color: 'white', 
            padding: '12px', 
            border: 'none', 
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>
      <p style={{ textAlign: 'center', marginTop: '20px' }}>
        Already have an account? <Link to="/login" style={{ color: '#1d70b8' }}>Sign in</Link>
      </p>
      <p style={{ textAlign: 'center' }}>
        <Link to="/" style={{ color: '#1d70b8' }}>← Back to Homepage</Link>
      </p>
    </div>
  );
}

// Simple Dashboard Component
function Dashboard() {
  const [files, setFiles] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [oauthResult, setOauthResult] = useState<any>(null);
  const [tokens, setTokens] = useState<any[]>([]);
  const { user, logout } = useAuth();

  // Load tokens
  const loadTokens = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/tokens');
      setTokens(response.data.tokens);
    } catch (error) {
      console.error('Failed to load tokens:', error);
    }
  };

  // Check for OAuth callback parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const oauthSuccess = urlParams.get('oauth_success');
    const oauthError = urlParams.get('oauth_error');
    const accessToken = urlParams.get('access_token');
    const tokenType = urlParams.get('token_type');
    const expiresIn = urlParams.get('expires_in');
    const clientId = urlParams.get('client_id');
    const scope = urlParams.get('scope');
    
    if (oauthSuccess === 'true' && accessToken) {
      setOauthResult({
        success: true,
        accessToken,
        tokenType,
        expiresIn,
        clientId,
        scope,
        message: 'Access token generated successfully!',
        timestamp: new Date().toISOString()
      });
      
      // Refresh tokens list
      loadTokens();
      
      // Clean URL
      window.history.replaceState({}, document.title, '/dashboard');
    } else if (oauthError) {
      setOauthResult({
        success: false,
        error: oauthError,
        clientId,
        message: 'OAuth authorization failed',
        timestamp: new Date().toISOString()
      });
      
      // Clean URL
      window.history.replaceState({}, document.title, '/dashboard');
    }
  }, []);

  // Load tokens on component mount
  useEffect(() => {
    loadTokens();
  }, []);

  useEffect(() => {
    // Load files
    axios.get('http://localhost:3001/api/files')
      .then(response => setFiles(response.data.files))
      .catch(console.error);
  }, []);

  const handleSearch = async () => {
    if (!searchQuery) return;
    
    try {
      const response = await axios.get(`http://localhost:3001/mcp/v1/search?query=${searchQuery}`);
      setSearchResults(response.data.results);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;
    
    setUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    
    try {
      const response = await axios.post('http://localhost:3001/api/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      // Refresh files list
      const filesResponse = await axios.get('http://localhost:3001/api/files');
      setFiles(filesResponse.data.files);
      
      setSelectedFile(null);
      alert('File uploaded successfully!');
    } catch (error) {
      alert('Upload failed: ' + (error as any).response?.data?.error);
    } finally {
      setUploading(false);
    }
  };

  const testOAuth = () => {
    const params = new URLSearchParams({
      client_id: 'claude-ai-assistant',
      response_type: 'code',
      scope: 'read search files:read profile',
      redirect_uri: 'http://localhost:3002/dashboard',
      state: 'demo-' + Date.now()
    });
    
    // Navigate to OAuth page in same tab for better redirect handling
    window.location.href = `http://localhost:3001/oauth/authorize?${params.toString()}`;
  };

  const revokeToken = async (tokenId: string) => {
    try {
      await axios.delete(`http://localhost:3001/api/tokens/${tokenId}`);
      loadTokens(); // Refresh the list
      alert('Token revoked successfully');
    } catch (error) {
      alert('Failed to revoke token: ' + (error as any).response?.data?.error);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 20px', fontFamily: 'system-ui' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div>
          <h1 style={{ color: '#1d70b8', margin: 0 }}>BitAtlas Dashboard</h1>
          <p style={{ margin: '5px 0 0 0', color: '#505a5f' }}>Welcome, {user?.email}</p>
        </div>
        <div>
          <Link to="/" style={{ color: '#1d70b8', marginRight: '15px' }}>← Home</Link>
          <button onClick={logout} style={{ 
            background: '#d4351c', 
            color: 'white', 
            padding: '8px 16px', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            Sign Out
          </button>
        </div>
      </header>

      {/* OAuth Result Display */}
      {oauthResult && (
        <div style={{ 
          background: oauthResult.success ? '#f3f2f1' : '#fef7f7', 
          border: `1px solid ${oauthResult.success ? '#00703c' : '#d4351c'}`, 
          padding: '20px', 
          borderRadius: '4px', 
          marginBottom: '30px' 
        }}>
          <h3 style={{ 
            marginTop: 0, 
            color: oauthResult.success ? '#00703c' : '#d4351c' 
          }}>
            {oauthResult.success ? '✅ OAuth Authorization Successful' : '❌ OAuth Authorization Failed'}
          </h3>
          <p><strong>Message:</strong> {oauthResult.message}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: '0.9rem' }}>
            <div><strong>Client:</strong> {oauthResult.clientId}</div>
            {oauthResult.scope && <div><strong>Scope:</strong> {oauthResult.scope}</div>}
            {oauthResult.accessToken && <div><strong>Token Type:</strong> {oauthResult.tokenType}</div>}
            {oauthResult.expiresIn && <div><strong>Valid for:</strong> {Math.floor(oauthResult.expiresIn / 86400)} days</div>}
            <div><strong>Timestamp:</strong> {new Date(oauthResult.timestamp).toLocaleString()}</div>
          </div>
          {oauthResult.success && oauthResult.accessToken && (
            <div style={{ marginTop: '15px', padding: '15px', background: 'rgba(0, 112, 60, 0.1)', borderRadius: '4px' }}>
              <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem' }}>
                🎉 <strong>Access Token Generated:</strong>
              </p>
              <div style={{ 
                background: '#2b2b2b', 
                color: '#f8f8f2', 
                padding: '10px', 
                borderRadius: '4px', 
                fontFamily: 'monospace', 
                fontSize: '0.8rem',
                wordBreak: 'break-all',
                marginBottom: '10px'
              }}>
                {oauthResult.accessToken}
              </div>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>
                Copy this token and add it to your AI assistant configuration. You can revoke it at any time in the Token Management section below.
              </p>
            </div>
          )}
          <button 
            onClick={() => setOauthResult(null)} 
            style={{ 
              marginTop: '15px', 
              background: '#b1b4b6', 
              color: 'white', 
              padding: '8px 16px', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* File Upload Section */}
      <div style={{ background: '#f3f2f1', padding: '20px', borderRadius: '4px', marginBottom: '30px' }}>
        <h3 style={{ marginTop: 0 }}>📤 Upload Files</h3>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input 
            type="file"
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            style={{ padding: '8px', border: '1px solid #b1b4b6', borderRadius: '4px' }}
          />
          <button 
            onClick={handleFileUpload}
            disabled={!selectedFile || uploading}
            style={{ 
              background: selectedFile ? '#00703c' : '#b1b4b6', 
              color: 'white', 
              padding: '8px 16px', 
              border: 'none', 
              borderRadius: '4px',
              cursor: selectedFile && !uploading ? 'pointer' : 'not-allowed'
            }}
          >
            {uploading ? 'Uploading...' : 'Upload File'}
          </button>
          {selectedFile && (
            <span style={{ fontSize: '0.9rem', color: '#505a5f' }}>
              Selected: {selectedFile.name} ({Math.round(selectedFile.size / 1024)}KB)
            </span>
          )}
        </div>
      </div>

      {/* Search Section */}
      <div style={{ background: '#f3f2f1', padding: '20px', borderRadius: '4px', marginBottom: '30px' }}>
        <h3 style={{ marginTop: 0 }}>🔍 File Search (MCP)</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input 
            type="text"
            placeholder="Search your files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1, padding: '8px', border: '1px solid #b1b4b6', borderRadius: '4px' }}
          />
          <button 
            onClick={handleSearch}
            style={{ background: '#1d70b8', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '4px' }}
          >
            Search
          </button>
        </div>
        {searchResults.length > 0 && (
          <div style={{ marginTop: '15px' }}>
            <strong>Search Results:</strong>
            {searchResults.map(result => (
              <div key={result.id} style={{ background: 'white', padding: '10px', margin: '5px 0', borderRadius: '4px' }}>
                <strong>{result.name}</strong> (relevance: {result.relevance})
                <p style={{ margin: '5px 0 0 0', fontSize: '0.9rem', color: '#505a5f' }}>{result.snippet}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Files Section */}
      <div style={{ background: '#f3f2f1', padding: '20px', borderRadius: '4px', marginBottom: '30px' }}>
        <h3 style={{ marginTop: 0 }}>📁 Your Files</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
          {files.map(file => (
            <div key={file.id} style={{ background: 'white', padding: '15px', borderRadius: '4px', border: '1px solid #b1b4b6' }}>
              <strong>{file.name}</strong>
              <p style={{ margin: '5px 0', fontSize: '0.9rem', color: '#505a5f' }}>
                Size: {Math.round(file.size / 1024)}KB
              </p>
              <p style={{ margin: '5px 0', fontSize: '0.8rem', color: '#626a6e' }}>
                {new Date(file.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Token Management */}
      <div style={{ background: '#f3f2f1', padding: '20px', borderRadius: '4px', marginBottom: '30px' }}>
        <h3 style={{ marginTop: 0 }}>🔑 Active Access Tokens</h3>
        {tokens.length === 0 ? (
          <p style={{ color: '#505a5f' }}>No active tokens. Generate one using the OAuth flow below.</p>
        ) : (
          <div style={{ display: 'grid', gap: '15px' }}>
            {tokens.map(token => (
              <div key={token.access_token} style={{ 
                background: 'white', 
                padding: '15px', 
                borderRadius: '4px', 
                border: `1px solid ${token.is_expired ? '#d4351c' : '#b1b4b6'}` 
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', fontSize: '0.9rem', marginBottom: '10px' }}>
                  <div><strong>Client:</strong> {token.client_id}</div>
                  <div><strong>Scope:</strong> {token.scope}</div>
                  <div><strong>Created:</strong> {new Date(token.created_at).toLocaleDateString()}</div>
                  <div><strong>Expires:</strong> {new Date(token.expires_at).toLocaleDateString()}</div>
                  <div><strong>Status:</strong> 
                    <span style={{ color: token.is_expired ? '#d4351c' : '#00703c' }}>
                      {token.is_expired ? ' Expired' : ' Active'}
                    </span>
                  </div>
                </div>
                <div style={{ 
                  background: '#2b2b2b', 
                  color: '#f8f8f2', 
                  padding: '8px', 
                  borderRadius: '4px', 
                  fontFamily: 'monospace', 
                  fontSize: '0.75rem',
                  wordBreak: 'break-all',
                  marginBottom: '10px'
                }}>
                  {token.access_token}
                </div>
                <button 
                  onClick={() => revokeToken(token.access_token)}
                  style={{ 
                    background: '#d4351c', 
                    color: 'white', 
                    padding: '6px 12px', 
                    border: 'none', 
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  Revoke Token
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* OAuth Testing */}
      <div style={{ background: '#f3f2f1', padding: '20px', borderRadius: '4px', marginBottom: '30px' }}>
        <h3 style={{ marginTop: 0 }}>🤖 AI Assistant Integration</h3>
        <p>Generate a new access token for AI assistants:</p>
        <button 
          onClick={testOAuth}
          style={{ background: '#00703c', color: 'white', padding: '12px 20px', border: 'none', borderRadius: '4px', marginBottom: '20px' }}
        >
          Generate New Access Token
        </button>
        
        <div style={{ background: '#e8f4f8', padding: '15px', borderRadius: '4px' }}>
          <h4 style={{ marginTop: 0, color: '#1d70b8' }}>🔗 How to Connect Claude</h4>
          <ol style={{ paddingLeft: '20px', lineHeight: '1.6' }}>
            <li><strong>Generate Token:</strong> Click "Generate New Access Token" above</li>
            <li><strong>Copy Token:</strong> Copy the generated access token from the result</li>
            <li><strong>Add to Claude:</strong> Go to Claude.ai → Settings → MCP Servers</li>
            <li><strong>Configure:</strong> Add a new MCP server with these settings:
              <div style={{ background: '#2b2b2b', color: '#f8f8f2', padding: '10px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.8rem', margin: '10px 0' }}>
{`{
  "mcpServers": {
    "bitatlas": {
      "command": "node",
      "args": ["bitatlas-mcp-client.js"],
      "env": {
        "BITATLAS_TOKEN": "YOUR_TOKEN_HERE",
        "BITATLAS_API_URL": "http://localhost:3001"
      }
    }
  }
}`}
              </div>
            </li>
            <li><strong>Test:</strong> Claude can now search and access your BitAtlas files!</li>
          </ol>
          <p style={{ margin: '10px 0 0 0', fontSize: '0.9rem', color: '#505a5f' }}>
            💡 <strong>Tip:</strong> You can revoke access tokens at any time in the "Active Access Tokens" section above.
          </p>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;