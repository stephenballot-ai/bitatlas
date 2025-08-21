import { useState, useEffect, createContext, useContext } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { NotificationProvider, useNotifications } from './components/common/NotificationSystem';

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
        height: '100vh'
      }}>
        <LoadingSpinner size="large" text="Loading BitAtlas..." />
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
    axios.get('http://localhost:3000/api/status')
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
      const response = await axios.post('http://localhost:3000/api/auth/login', { email, password });
      login(response.data.token, response.data.user);
      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response) {
          // Server responded with error status
          const errorMessage = error.response.data?.error || error.response.data?.message || 'Invalid credentials';
          setError('Login failed: ' + errorMessage);
        } else if (error.request) {
          // Request was made but no response received
          setError('No response from server. Please check your connection.');
        } else {
          // Something else happened
          setError('Request failed: ' + error.message);
        }
      } else {
        setError('Login failed: ' + (error as Error).message);
      }
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
      await axios.post('http://localhost:3000/api/auth/register', { email, password });
      alert('Registration successful! You can now sign in.');
      navigate('/login');
    } catch (error) {
      console.error('Registration error:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response) {
          // Server responded with error status
          const errorMessage = error.response.data?.error || error.response.data?.message || 'Registration failed';
          setErrors([errorMessage]);
        } else if (error.request) {
          // Request was made but no response received
          setErrors(['No response from server. Please check your connection.']);
        } else {
          // Something else happened
          setErrors(['Request failed: ' + error.message]);
        }
      } else {
        setErrors(['Registration failed: ' + (error as Error).message]);
      }
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

// Enhanced Dashboard Component (Phase 1: Folders, File Deletion, Enhanced Preview)
function Dashboard() {
  const [files, setFiles] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [currentFolder, setCurrentFolder] = useState<any>({ id: 'root', name: 'Home', path: '/' });
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]); // Multi-select
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [oauthResult, setOauthResult] = useState<any>(null);
  const [tokens, setTokens] = useState<any[]>([]);
  const [filesLoading, setFilesLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [deletedFiles, setDeletedFiles] = useState<any[]>([]);
  const [showTrash, setShowTrash] = useState(false);
  const { user, logout } = useAuth();
  const { showNotification } = useNotifications();

  // Load tokens
  const loadTokens = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3000/api/tokens', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setTokens(response.data.tokens);
    } catch (error) {
      console.error('Failed to load tokens:', error);
      showNotification({
        type: 'error',
        title: 'Failed to load access tokens',
        message: 'Unable to fetch your OAuth tokens'
      });
    }
  };

  // Load folders
  const loadFolders = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3000/api/folders', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setFolders(response.data.folders || []);
    } catch (error) {
      console.error('Failed to load folders:', error);
    }
  };

  // Load folder contents (files and subfolders)
  const loadFolderContents = async (folderId: string = 'root') => {
    try {
      setFilesLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:3000/api/folders/${folderId}/contents`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      setFiles(response.data.files || []);
      setCurrentFolder(response.data.folder || { id: 'root', name: 'Home', path: '/' });
      
      // Update folders list with subfolders
      const allFoldersResponse = await axios.get('http://localhost:3000/api/folders', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setFolders(allFoldersResponse.data.folders || []);
      
    } catch (error) {
      console.error('Failed to load folder contents:', error);
      showNotification({
        type: 'error',
        title: 'Failed to load folder',
        message: 'Unable to fetch folder contents'
      });
    } finally {
      setFilesLoading(false);
    }
  };

  // Legacy load files function (now uses folder contents)
  const loadFiles = () => loadFolderContents(currentFolder.id);

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
    const sessionId = urlParams.get('session');
    
    // Handle session-based OAuth flow
    if (sessionId) {
      console.log('Found OAuth session ID:', sessionId);
      
      // Fetch session data from backend
      axios.get(`http://localhost:3000/oauth/session/${sessionId}`)
        .then(response => {
          const data = response.data;
          console.log('Retrieved OAuth session data:', data);
          
          setOauthResult({
            success: true,
            accessToken: data.access_token,
            tokenType: data.token_type,
            expiresIn: data.expires_in,
            clientId: data.client_id,
            scope: data.scope,
            message: 'Access token generated successfully via session!',
            timestamp: new Date().toISOString()
          });
          
          // Refresh tokens list
          loadTokens();
          
          // Clean up URL
          window.history.replaceState({}, document.title, '/dashboard');
        })
        .catch(error => {
          console.error('Failed to retrieve OAuth session:', error);
          setOauthResult({
            success: false,
            message: 'Failed to retrieve OAuth session: ' + (error.response?.data?.error || 'Unknown error'),
            timestamp: new Date().toISOString()
          });
        });
    }
    // Handle direct parameter OAuth flow (legacy)
    else if (oauthSuccess === 'true' && accessToken) {
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
    loadFolderContents('root'); // Start with root folder
    loadFolders(); // Load folder tree
  }, []);

  // Load trash when showing trash view
  useEffect(() => {
    if (showTrash) {
      loadTrash();
    }
  }, [showTrash]);

  const handleSearch = async () => {
    if (!searchQuery) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:3000/api/files/search/query?q=${searchQuery}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setSearchResults(response.data.files || []);
      
      showNotification({
        type: 'success',
        title: 'Search completed',
        message: `Found ${response.data.files?.length || 0} files`
      });
    } catch (error) {
      console.error('Search failed:', error);
      showNotification({
        type: 'error',
        title: 'Search failed',
        message: 'Unable to search your files'
      });
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;
    
    setUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('folderId', currentFolder.id); // Upload to current folder
    
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:3000/api/files/upload', formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });
      
      showNotification({
        type: 'success',
        title: 'File uploaded successfully',
        message: `${selectedFile.name} has been uploaded to ${currentFolder.name}`
      });
      
      // Refresh current folder contents
      await loadFolderContents(currentFolder.id);
      
      setSelectedFile(null);
    } catch (error) {
      console.error('Upload failed:', error);
      showNotification({
        type: 'error',
        title: 'Upload failed',
        message: (error as any).response?.data?.error || 'Failed to upload file'
      });
    } finally {
      setUploading(false);
    }
  };

  // Create new folder
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:3000/api/folders', {
        name: newFolderName.trim(),
        parentId: currentFolder.id
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      showNotification({
        type: 'success',
        title: 'Folder created',
        message: `Folder "${newFolderName}" created successfully`
      });
      
      // Refresh current folder contents
      await loadFolderContents(currentFolder.id);
      
      setShowNewFolderDialog(false);
      setNewFolderName('');
    } catch (error) {
      console.error('Create folder failed:', error);
      showNotification({
        type: 'error',
        title: 'Create folder failed',
        message: (error as any).response?.data?.error || 'Failed to create folder'
      });
    }
  };

  // Delete file(s)
  const handleDeleteFiles = async (fileIds: string[], permanent: boolean = false) => {
    try {
      const token = localStorage.getItem('token');
      
      if (fileIds.length === 1) {
        // Single file deletion
        await axios.delete(`http://localhost:3000/api/files/${fileIds[0]}${permanent ? '?permanent=true' : ''}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } else {
        // Batch deletion
        await axios.post('http://localhost:3000/api/files/batch', {
          operation: 'delete',
          fileIds: fileIds
        }, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
      
      showNotification({
        type: 'success',
        title: permanent ? 'Files permanently deleted' : 'Files moved to trash',
        message: `${fileIds.length} file(s) ${permanent ? 'permanently deleted' : 'moved to trash'}`
      });
      
      // Refresh current view
      if (showTrash) {
        await loadTrash();
      } else {
        await loadFolderContents(currentFolder.id);
      }
      
      setSelectedFiles([]);
    } catch (error) {
      console.error('Delete failed:', error);
      showNotification({
        type: 'error',
        title: 'Delete failed',
        message: (error as any).response?.data?.error || 'Failed to delete files'
      });
    }
  };

  // Load trash
  const loadTrash = async () => {
    try {
      setFilesLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3000/api/trash', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setDeletedFiles(response.data.files || []);
    } catch (error) {
      console.error('Failed to load trash:', error);
      showNotification({
        type: 'error',
        title: 'Failed to load trash',
        message: 'Unable to fetch deleted files'
      });
    } finally {
      setFilesLoading(false);
    }
  };

  // Restore file from trash
  const handleRestoreFile = async (fileId: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:3000/api/files/${fileId}/restore`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      showNotification({
        type: 'success',
        title: 'File restored',
        message: 'File has been restored from trash'
      });
      
      await loadTrash(); // Refresh trash view
    } catch (error) {
      console.error('Restore failed:', error);
      showNotification({
        type: 'error',
        title: 'Restore failed',
        message: (error as any).response?.data?.error || 'Failed to restore file'
      });
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
    window.location.href = `http://localhost:3000/oauth/authorize?${params.toString()}`;
  };

  const revokeToken = async (tokenId: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:3000/api/tokens/${tokenId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      loadTokens(); // Refresh the list
      
      showNotification({
        type: 'success',
        title: 'Token revoked',
        message: 'Access token has been revoked successfully'
      });
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Failed to revoke token',
        message: (error as any).response?.data?.error || 'Unable to revoke token'
      });
    }
  };

  // Preview file function
  const handlePreviewFile = async (file: any) => {
    if (!file.id) return;
    
    setPreviewLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:3000/api/files/${file.id}?preview=true`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      setPreviewFile(response.data.file);
      
      showNotification({
        type: 'success',
        title: 'Preview loaded',
        message: `Preview for ${file.name} loaded successfully`
      });
    } catch (error) {
      console.error('Preview failed:', error);
      showNotification({
        type: 'error',
        title: 'Preview failed',
        message: 'Unable to load file preview'
      });
    } finally {
      setPreviewLoading(false);
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

      {/* Navigation and Controls Section */}
      <div style={{ background: '#f8f8f8', padding: '20px', borderRadius: '4px', marginBottom: '20px', border: '2px solid #1d70b8' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <div>
            <h3 style={{ margin: 0, color: '#1d70b8' }}>📁 {showTrash ? 'Trash' : currentFolder.name || 'Home'}</h3>
            <p style={{ margin: '5px 0 0 0', fontSize: '0.9rem', color: '#505a5f' }}>
              {showTrash ? 'Deleted files' : `Path: ${currentFolder.path || '/'}`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {!showTrash && (
              <>
                <button 
                  onClick={() => setShowNewFolderDialog(true)}
                  style={{ 
                    background: '#00703c', 
                    color: 'white', 
                    padding: '8px 12px', 
                    border: 'none', 
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.9rem'
                  }}
                >
                  📁 New Folder
                </button>
                <button 
                  onClick={() => loadFolderContents('root')}
                  disabled={currentFolder.id === 'root'}
                  style={{ 
                    background: currentFolder.id === 'root' ? '#b1b4b6' : '#1d70b8', 
                    color: 'white', 
                    padding: '8px 12px', 
                    border: 'none', 
                    borderRadius: '4px',
                    cursor: currentFolder.id === 'root' ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem'
                  }}
                >
                  🏠 Home
                </button>
              </>
            )}
            <button 
              onClick={() => {
                setShowTrash(!showTrash);
                if (!showTrash) {
                  loadTrash();
                } else {
                  loadFolderContents(currentFolder.id);
                }
              }}
              style={{ 
                background: showTrash ? '#d4351c' : '#626a6e', 
                color: 'white', 
                padding: '8px 12px', 
                border: 'none', 
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              {showTrash ? '📁 Back to Files' : '🗑️ Trash'}
            </button>
            {selectedFiles.length > 0 && (
              <button 
                onClick={() => handleDeleteFiles(selectedFiles, showTrash)}
                style={{ 
                  background: '#d4351c', 
                  color: 'white', 
                  padding: '8px 12px', 
                  border: 'none', 
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                {showTrash ? '🔥 Delete Forever' : '🗑️ Delete'} ({selectedFiles.length})
              </button>
            )}
          </div>
        </div>

        {!showTrash && (
          <div style={{ background: 'white', padding: '15px', borderRadius: '4px', border: '1px solid #b1b4b6' }}>
            <h4 style={{ marginTop: 0, marginBottom: '10px' }}>📤 Upload Files to {currentFolder.name || 'Home'}</h4>
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
        )}
      </div>

      {/* New Folder Dialog */}
      {showNewFolderDialog && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.5)', 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{ 
            background: 'white', 
            padding: '30px', 
            borderRadius: '8px', 
            minWidth: '400px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ marginTop: 0, color: '#1d70b8' }}>Create New Folder</h3>
            <p style={{ marginBottom: '15px', color: '#505a5f' }}>
              Create a new folder in {currentFolder.name || 'Home'}
            </p>
            <input 
              type="text"
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '10px', 
                border: '1px solid #b1b4b6', 
                borderRadius: '4px',
                marginBottom: '20px',
                fontSize: '16px'
              }}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => {
                  setShowNewFolderDialog(false);
                  setNewFolderName('');
                }}
                style={{ 
                  background: '#b1b4b6', 
                  color: 'white', 
                  padding: '10px 20px', 
                  border: 'none', 
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                style={{ 
                  background: newFolderName.trim() ? '#00703c' : '#b1b4b6', 
                  color: 'white', 
                  padding: '10px 20px', 
                  border: 'none', 
                  borderRadius: '4px',
                  cursor: newFolderName.trim() ? 'pointer' : 'not-allowed'
                }}
              >
                Create Folder
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Classic File System Tree UI */}
      <div style={{ 
        background: '#fff', 
        border: '1px solid #b1b4b6', 
        borderRadius: '4px', 
        marginBottom: '30px',
        minHeight: '600px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        
        {/* Toolbar */}
        <div style={{ 
          background: '#f8f9fa', 
          borderBottom: '1px solid #b1b4b6', 
          padding: '10px 15px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <h3 style={{ margin: 0, color: '#1d70b8' }}>
              {showTrash ? '🗑️ Trash' : '📁 File Explorer'}
            </h3>
            
            {/* Breadcrumb Navigation */}
            {!showTrash && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                background: 'white',
                padding: '5px 10px',
                borderRadius: '3px',
                border: '1px solid #d1d5db',
                fontSize: '0.9rem'
              }}>
                <span 
                  onClick={() => loadFolderContents('root')}
                  style={{ 
                    cursor: 'pointer', 
                    color: currentFolder.id === 'root' ? '#505a5f' : '#1d70b8',
                    textDecoration: currentFolder.id === 'root' ? 'none' : 'underline'
                  }}
                >
                  🏠 Home
                </span>
                {currentFolder.path && currentFolder.path !== '/' && (
                  <span style={{ color: '#505a5f' }}> {currentFolder.path}</span>
                )}
              </div>
            )}
          </div>
          
          {/* Toolbar Actions */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {!showTrash && (
              <button 
                onClick={() => setShowNewFolderDialog(true)}
                style={{ 
                  background: '#00703c', 
                  color: 'white', 
                  padding: '6px 12px', 
                  border: 'none', 
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontSize: '0.85rem'
                }}
              >
                📁 New Folder
              </button>
            )}
            
            <button 
              onClick={() => {
                setShowTrash(!showTrash);
                setSelectedFiles([]);
                if (!showTrash) {
                  loadTrash();
                } else {
                  loadFolderContents(currentFolder.id);
                }
              }}
              style={{ 
                background: showTrash ? '#6c757d' : '#6c757d', 
                color: 'white', 
                padding: '6px 12px', 
                border: 'none', 
                borderRadius: '3px',
                cursor: 'pointer',
                fontSize: '0.85rem'
              }}
            >
              {showTrash ? '📁 Files' : '🗑️ Trash'}
            </button>
            
            {selectedFiles.length > 0 && (
              <button 
                onClick={() => handleDeleteFiles(selectedFiles, showTrash)}
                style={{ 
                  background: '#d4351c', 
                  color: 'white', 
                  padding: '6px 12px', 
                  border: 'none', 
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontSize: '0.85rem'
                }}
              >
                {showTrash ? '🔥 Delete Forever' : '🗑️ Delete'} ({selectedFiles.length})
              </button>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div style={{ display: 'flex', flex: 1 }}>
          
          {/* Left Sidebar - Folder Tree */}
          {!showTrash && (
            <div style={{ 
              width: '250px', 
              borderRight: '1px solid #e5e7eb',
              background: '#f9fafb',
              padding: '10px'
            }}>
              <div style={{ marginBottom: '10px' }}>
                <strong style={{ fontSize: '0.9rem', color: '#374151' }}>Folders</strong>
              </div>
              
              <div style={{ fontSize: '0.9rem' }}>
                {/* Root Folder */}
                <div 
                  onClick={() => loadFolderContents('root')}
                  style={{ 
                    padding: '8px', 
                    cursor: 'pointer',
                    borderRadius: '3px',
                    background: currentFolder.id === 'root' ? '#e5e7eb' : 'transparent',
                    color: currentFolder.id === 'root' ? '#1d70b8' : '#374151',
                    marginBottom: '2px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <span style={{ marginRight: '6px' }}>🏠</span>
                  Home
                </div>
                
                {/* Folder Tree */}
                {folders.filter(f => f.parentId === 'root').map(folder => (
                  <div key={folder.id} style={{ marginLeft: '16px' }}>
                    <div 
                      onClick={() => loadFolderContents(folder.id)}
                      style={{ 
                        padding: '6px 8px', 
                        cursor: 'pointer',
                        borderRadius: '3px',
                        background: currentFolder.id === folder.id ? '#e5e7eb' : 'transparent',
                        color: currentFolder.id === folder.id ? '#1d70b8' : '#374151',
                        marginBottom: '2px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <span style={{ marginRight: '6px' }}>📁</span>
                      {folder.name}
                      <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#9ca3af' }}>
                        {folder.fileCount || 0}
                      </span>
                    </div>
                    
                    {/* Sub-folders */}
                    {folders.filter(sf => sf.parentId === folder.id).map(subfolder => (
                      <div 
                        key={subfolder.id}
                        onClick={() => loadFolderContents(subfolder.id)}
                        style={{ 
                          padding: '4px 8px', 
                          cursor: 'pointer',
                          borderRadius: '3px',
                          background: currentFolder.id === subfolder.id ? '#e5e7eb' : 'transparent',
                          color: currentFolder.id === subfolder.id ? '#1d70b8' : '#6b7280',
                          marginBottom: '1px',
                          marginLeft: '16px',
                          fontSize: '0.85rem',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <span style={{ marginRight: '6px' }}>📁</span>
                        {subfolder.name}
                        <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#9ca3af' }}>
                          {subfolder.fileCount || 0}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Right Panel - File List */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            
            {filesLoading ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <LoadingSpinner text={showTrash ? "Loading trash..." : "Loading files..."} />
              </div>
            ) : (
              <>
                {/* File List Header */}
                <div style={{ 
                  background: '#f3f4f6', 
                  borderBottom: '1px solid #e5e7eb',
                  padding: '8px 12px',
                  display: 'grid',
                  gridTemplateColumns: showTrash ? '30px 1fr 100px 120px' : '30px 1fr 100px 120px 80px',
                  gap: '12px',
                  alignItems: 'center',
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                  color: '#374151'
                }}>
                  <label style={{ display: 'flex', alignItems: 'center' }}>
                    <input 
                      type="checkbox" 
                      checked={!showTrash && files.length > 0 && selectedFiles.length === files.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedFiles(files.map(f => f.id));
                        } else {
                          setSelectedFiles([]);
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                    />
                  </label>
                  <div>Name</div>
                  <div>Size</div>
                  <div>{showTrash ? 'Deleted' : 'Modified'}</div>
                  {!showTrash && <div>Actions</div>}
                </div>

                {/* File List Content */}
                <div style={{ flex: 1, overflow: 'auto', maxHeight: '400px' }}>
                  {(showTrash ? deletedFiles : files).length === 0 ? (
                    <div style={{ 
                      padding: '60px 20px', 
                      textAlign: 'center', 
                      color: '#6b7280',
                      fontSize: '0.95rem'
                    }}>
                      {showTrash ? (
                        <div>
                          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗑️</div>
                          <div>Trash is empty</div>
                          <div style={{ fontSize: '0.85rem', marginTop: '8px' }}>
                            Deleted files will appear here
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📁</div>
                          <div>This folder is empty</div>
                          <div style={{ fontSize: '0.85rem', marginTop: '8px' }}>
                            Upload files or create folders to get started
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    (showTrash ? deletedFiles : files).map((file, index) => (
                      <div 
                        key={file.id}
                        style={{ 
                          padding: '8px 12px',
                          borderBottom: '1px solid #f3f4f6',
                          display: 'grid',
                          gridTemplateColumns: showTrash ? '30px 1fr 100px 120px' : '30px 1fr 100px 120px 80px',
                          gap: '12px',
                          alignItems: 'center',
                          fontSize: '0.9rem',
                          background: selectedFiles.includes(file.id) ? '#eff6ff' : 
                                      index % 2 === 0 ? '#ffffff' : '#f9fafb',
                          cursor: 'pointer',
                          borderLeft: selectedFiles.includes(file.id) ? '3px solid #1d70b8' : '3px solid transparent'
                        }}
                        onDoubleClick={() => !showTrash && handlePreviewFile(file)}
                      >
                        {/* Checkbox */}
                        <label onClick={(e) => e.stopPropagation()}>
                          <input 
                            type="checkbox"
                            checked={selectedFiles.includes(file.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedFiles([...selectedFiles, file.id]);
                              } else {
                                setSelectedFiles(selectedFiles.filter(id => id !== file.id));
                              }
                            }}
                            style={{ cursor: 'pointer' }}
                          />
                        </label>
                        
                        {/* File Name with Icon */}
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ fontSize: '16px', marginRight: '8px' }}>
                            {file.mimetype?.startsWith('image/') ? '🖼️' :
                             file.mimetype === 'text/plain' ? '📄' :
                             file.mimetype === 'application/pdf' ? '📋' :
                             '📎'}
                          </span>
                          <span style={{ 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis', 
                            whiteSpace: 'nowrap',
                            color: showTrash ? '#6b7280' : '#111827'
                          }}>
                            {file.name}
                          </span>
                        </div>
                        
                        {/* File Size */}
                        <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>
                          {(file.size / 1024).toFixed(0)} KB
                        </div>
                        
                        {/* Date */}
                        <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>
                          {showTrash ? 
                            new Date(file.deletedAt).toLocaleDateString() :
                            new Date(file.createdAt).toLocaleDateString()
                          }
                        </div>
                        
                        {/* Actions */}
                        {!showTrash && (
                          <div style={{ display: 'flex', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
                            <button 
                              onClick={() => handlePreviewFile(file)}
                              style={{ 
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '4px',
                                borderRadius: '2px',
                                fontSize: '14px'
                              }}
                              title="Preview"
                            >
                              👁️
                            </button>
                            <button 
                              onClick={() => handleDeleteFiles([file.id])}
                              style={{ 
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '4px',
                                borderRadius: '2px',
                                fontSize: '14px'
                              }}
                              title="Delete"
                            >
                              🗑️
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                  
                  {/* Trash Actions Row */}
                  {showTrash && deletedFiles.length > 0 && (
                    <div style={{ 
                      padding: '12px',
                      borderTop: '1px solid #e5e7eb',
                      background: '#f9fafb',
                      display: 'flex',
                      gap: '8px',
                      justifyContent: 'center'
                    }}>
                      {deletedFiles.map(file => selectedFiles.includes(file.id)).some(Boolean) && (
                        <>
                          <button 
                            onClick={() => {
                              const selectedFilesToRestore = deletedFiles.filter(f => selectedFiles.includes(f.id));
                              selectedFilesToRestore.forEach(f => handleRestoreFile(f.id));
                            }}
                            style={{ 
                              background: '#00703c', 
                              color: 'white', 
                              padding: '6px 12px', 
                              border: 'none', 
                              borderRadius: '3px',
                              cursor: 'pointer',
                              fontSize: '0.85rem'
                            }}
                          >
                            ♻️ Restore Selected
                          </button>
                          <button 
                            onClick={() => handleDeleteFiles(selectedFiles, true)}
                            style={{ 
                              background: '#d4351c', 
                              color: 'white', 
                              padding: '6px 12px', 
                              border: 'none', 
                              borderRadius: '3px',
                              cursor: 'pointer',
                              fontSize: '0.85rem'
                            }}
                          >
                            🔥 Delete Forever
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced File Preview (Phase 1) */}
      {previewFile && (
        <div style={{ 
          background: '#f8f8f8', 
          padding: '25px', 
          borderRadius: '8px', 
          marginBottom: '30px',
          border: '2px solid #1d70b8'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ margin: 0, color: '#1d70b8', display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: '24px', marginRight: '8px' }}>
                  {previewFile.mimetype?.startsWith('image/') ? '🖼️' :
                   previewFile.mimetype === 'text/plain' ? '📄' :
                   previewFile.mimetype === 'application/pdf' ? '📋' :
                   '📎'}
                </span>
                File Preview: {previewFile.name}
              </h3>
              <p style={{ margin: '5px 0 0 32px', fontSize: '0.9rem', color: '#505a5f' }}>
                {previewFile.path && `Path: ${previewFile.path}`}
              </p>
            </div>
            <button 
              onClick={() => setPreviewFile(null)}
              style={{ 
                background: '#d4351c', 
                color: 'white', 
                padding: '10px 16px', 
                border: 'none', 
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              ✕ Close Preview
            </button>
          </div>
          
          <div style={{ 
            background: 'white', 
            padding: '20px', 
            borderRadius: '6px', 
            border: '1px solid #b1b4b6',
            marginBottom: '15px'
          }}>
            {/* File Metadata */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
              gap: '15px', 
              fontSize: '0.9rem', 
              marginBottom: '20px',
              padding: '15px',
              background: '#f3f2f1',
              borderRadius: '4px'
            }}>
              <div><strong>📁 Name:</strong> {previewFile.name}</div>
              <div><strong>📏 Size:</strong> {(previewFile.size / 1024).toFixed(1)} KB</div>
              <div><strong>🏷️ Type:</strong> {previewFile.mimetype || 'Unknown'}</div>
              <div><strong>📅 Created:</strong> {new Date(previewFile.createdAt).toLocaleDateString()}</div>
            </div>
            
            {/* Enhanced Content Preview */}
            {previewFile.content && typeof previewFile.content === 'string' && (
              <div>
                <h4 style={{ margin: '0 0 15px 0', color: '#1d70b8', display: 'flex', alignItems: 'center' }}>
                  <span style={{ marginRight: '8px' }}>📄</span>
                  Text Content Preview:
                </h4>
                <div style={{ 
                  background: '#2b2b2b', 
                  color: '#f8f8f2', 
                  padding: '15px', 
                  borderRadius: '6px', 
                  fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                  fontSize: '0.9rem',
                  whiteSpace: 'pre-wrap',
                  maxHeight: '400px',
                  overflow: 'auto',
                  border: '1px solid #626a6e',
                  lineHeight: '1.4'
                }}>
                  {previewFile.content}
                </div>
              </div>
            )}
            
            {/* Enhanced Image Preview */}
            {previewFile.content && typeof previewFile.content === 'object' && previewFile.content.type === 'image' && (
              <div>
                <h4 style={{ margin: '0 0 15px 0', color: '#1d70b8', display: 'flex', alignItems: 'center' }}>
                  <span style={{ marginRight: '8px' }}>🖼️</span>
                  Image Preview:
                </h4>
                {previewFile.content.previewUrl ? (
                  <div style={{ textAlign: 'center' }}>
                    <img 
                      src={`http://localhost:3000${previewFile.content.previewUrl}`}
                      alt={previewFile.name}
                      style={{ 
                        maxWidth: '100%', 
                        maxHeight: '400px', 
                        borderRadius: '4px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        border: '1px solid #b1b4b6'
                      }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling.style.display = 'block';
                      }}
                    />
                    <div style={{ 
                      display: 'none', 
                      padding: '20px', 
                      color: '#d4351c', 
                      fontStyle: 'italic' 
                    }}>
                      ⚠️ Unable to load image preview
                    </div>
                    {previewFile.content.metadata && (
                      <div style={{ 
                        marginTop: '10px', 
                        fontSize: '0.8rem', 
                        color: '#505a5f',
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '15px'
                      }}>
                        <span>📏 Size: {(previewFile.content.metadata.size / 1024).toFixed(1)} KB</span>
                        <span>🏷️ Format: {previewFile.content.metadata.format}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ 
                    padding: '40px', 
                    textAlign: 'center', 
                    color: '#505a5f', 
                    fontStyle: 'italic',
                    border: '2px dashed #b1b4b6',
                    borderRadius: '4px'
                  }}>
                    🖼️ Image preview not available
                  </div>
                )}
              </div>
            )}
            
            {/* Fallback for unsupported files */}
            {(!previewFile.content || 
              (typeof previewFile.content === 'object' && previewFile.content.error)) && (
              <div>
                <h4 style={{ margin: '0 0 15px 0', color: '#626a6e', display: 'flex', alignItems: 'center' }}>
                  <span style={{ marginRight: '8px' }}>📎</span>
                  Content Preview:
                </h4>
                <div style={{ 
                  padding: '40px', 
                  textAlign: 'center', 
                  color: '#505a5f', 
                  fontStyle: 'italic',
                  border: '2px dashed #b1b4b6',
                  borderRadius: '4px'
                }}>
                  {typeof previewFile.content === 'object' && previewFile.content.error 
                    ? `⚠️ ${previewFile.content.error}`
                    : '📎 Preview not available for this file type'
                  }
                </div>
              </div>
            )}
            
            {/* Action Buttons */}
            <div style={{ 
              marginTop: '20px', 
              paddingTop: '15px', 
              borderTop: '1px solid #b1b4b6',
              display: 'flex',
              gap: '10px',
              justifyContent: 'center'
            }}>
              <a 
                href={`http://localhost:3000/api/files/${previewFile.id}/raw`}
                download={previewFile.name}
                style={{ 
                  background: '#00703c', 
                  color: 'white', 
                  padding: '8px 16px', 
                  borderRadius: '4px',
                  textDecoration: 'none',
                  fontSize: '0.9rem'
                }}
              >
                ⬇️ Download
              </a>
              {!showTrash && (
                <button 
                  onClick={() => {
                    handleDeleteFiles([previewFile.id]);
                    setPreviewFile(null);
                  }}
                  style={{ 
                    background: '#d4351c', 
                    color: 'white', 
                    padding: '8px 16px', 
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.9rem'
                  }}
                >
                  🗑️ Delete File
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Token Management */}
      <div style={{ background: '#f3f2f1', padding: '20px', borderRadius: '4px', marginBottom: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            🔑 Active Access Tokens
            {tokens.length > 0 && (
              <span style={{ 
                background: tokens.filter(t => !t.is_expired).length > 1 ? '#d4351c' : '#1d70b8', 
                color: 'white', 
                padding: '2px 8px', 
                borderRadius: '12px', 
                fontSize: '0.75rem',
                fontWeight: 'normal'
              }}>
                {tokens.filter(t => !t.is_expired).length} active
              </span>
            )}
          </h3>
          {tokens.filter(t => !t.is_expired).length > 1 && (
            <div style={{ 
              background: '#fef7f7', 
              border: '1px solid #d4351c', 
              color: '#d4351c', 
              padding: '4px 8px', 
              borderRadius: '4px', 
              fontSize: '0.7rem',
              fontWeight: 'bold'
            }}>
              💰 PAID PLAN REQUIRED
            </div>
          )}
        </div>

        {/* Pricing Warning */}
        {tokens.filter(t => !t.is_expired).length === 0 && (
          <div style={{ 
            background: '#e8f4f8', 
            border: '1px solid #1d70b8', 
            padding: '12px', 
            borderRadius: '4px', 
            marginBottom: '15px',
            fontSize: '0.85rem'
          }}>
            <div style={{ fontWeight: 'bold', color: '#1d70b8', marginBottom: '4px' }}>💡 Token Pricing</div>
            <div style={{ color: '#0b0c0c' }}>
              • <strong>First token:</strong> FREE (included in your plan)<br/>
              • <strong>Additional tokens:</strong> $5/month per token<br/>
              • <strong>Enterprise plans:</strong> Unlimited tokens available
            </div>
          </div>
        )}
        
        {tokens.filter(t => !t.is_expired).length === 1 && (
          <div style={{ 
            background: '#fff3cd', 
            border: '1px solid #ffc107', 
            padding: '12px', 
            borderRadius: '4px', 
            marginBottom: '15px',
            fontSize: '0.85rem'
          }}>
            <div style={{ fontWeight: 'bold', color: '#856404', marginBottom: '4px' }}>⚠️ Multiple Token Pricing</div>
            <div style={{ color: '#856404' }}>
              You're using your <strong>1 free token</strong>. Additional tokens cost <strong>$5/month each</strong>. 
              <a href="#upgrade" style={{ color: '#1d70b8', textDecoration: 'underline' }}>Upgrade to Pro</a> for more tokens.
            </div>
          </div>
        )}

        {tokens.filter(t => !t.is_expired).length > 1 && (
          <div style={{ 
            background: '#fef7f7', 
            border: '1px solid #d4351c', 
            padding: '12px', 
            borderRadius: '4px', 
            marginBottom: '15px',
            fontSize: '0.85rem'
          }}>
            <div style={{ fontWeight: 'bold', color: '#d4351c', marginBottom: '4px' }}>💳 Paid Plan Active</div>
            <div style={{ color: '#d4351c' }}>
              You have <strong>{tokens.filter(t => !t.is_expired).length} active tokens</strong>. 
              Cost: <strong>$5/month × {tokens.filter(t => !t.is_expired).length - 1} = ${(tokens.filter(t => !t.is_expired).length - 1) * 5}/month</strong> 
              (plus 1 free token). <a href="#billing" style={{ color: '#1d70b8', textDecoration: 'underline' }}>View billing</a>
            </div>
          </div>
        )}
        
        {tokens.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#505a5f' }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🚫</div>
            <p style={{ margin: '0 0 10px 0', fontSize: '1.1rem', fontWeight: 'bold' }}>No Active Tokens</p>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>Generate your first access token using the OAuth authorization flow below.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {tokens.map((token, index) => (
              <div key={token.access_token} style={{ 
                background: 'white', 
                padding: '16px', 
                borderRadius: '4px', 
                border: `2px solid ${token.is_expired ? '#d4351c' : '#00703c'}`,
                position: 'relative'
              }}>
                <div style={{ 
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: token.is_expired ? '#d4351c' : '#00703c',
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '0.7rem',
                  fontWeight: 'bold'
                }}>
                  {token.is_expired ? 'EXPIRED' : 'ACTIVE'}
                </div>
                
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
                  gap: '12px', 
                  fontSize: '0.85rem', 
                  marginBottom: '12px',
                  paddingRight: '60px'
                }}>
                  <div>
                    <div style={{ color: '#505a5f', fontSize: '0.75rem', marginBottom: '2px' }}>CLIENT ID</div>
                    <div style={{ fontWeight: 'bold', color: '#0b0c0c' }}>{token.client_id}</div>
                  </div>
                  <div>
                    <div style={{ color: '#505a5f', fontSize: '0.75rem', marginBottom: '2px' }}>SCOPE</div>
                    <div style={{ fontWeight: 'bold', color: '#0b0c0c' }}>{token.scope}</div>
                  </div>
                  <div>
                    <div style={{ color: '#505a5f', fontSize: '0.75rem', marginBottom: '2px' }}>CREATED</div>
                    <div style={{ fontWeight: 'bold', color: '#0b0c0c' }}>{new Date(token.created_at).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <div style={{ color: '#505a5f', fontSize: '0.75rem', marginBottom: '2px' }}>EXPIRES</div>
                    <div style={{ fontWeight: 'bold', color: token.is_expired ? '#d4351c' : '#0b0c0c' }}>
                      {new Date(token.expires_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ color: '#505a5f', fontSize: '0.75rem', marginBottom: '4px' }}>ACCESS TOKEN</div>
                  <div style={{ 
                    background: '#f8f8f8', 
                    border: '1px solid #b1b4b6',
                    padding: '8px 10px', 
                    borderRadius: '4px', 
                    fontFamily: 'ui-monospace, "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace', 
                    fontSize: '0.7rem',
                    wordBreak: 'break-all',
                    color: '#0b0c0c',
                    lineHeight: '1.2'
                  }}>
                    {token.access_token}
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button 
                    onClick={() => revokeToken(token.access_token)}
                    style={{ 
                      background: '#d4351c', 
                      color: 'white', 
                      padding: '8px 16px', 
                      border: 'none', 
                      borderRadius: '4px',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    🗑️ Revoke Token
                  </button>
                  <button 
                    onClick={() => navigator.clipboard.writeText(token.access_token)}
                    style={{ 
                      background: '#1d70b8', 
                      color: 'white', 
                      padding: '8px 16px', 
                      border: 'none', 
                      borderRadius: '4px',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    📋 Copy Token
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* OAuth Testing */}
      <div style={{ background: '#f3f2f1', padding: '20px', borderRadius: '4px', marginBottom: '30px' }}>
        <h3 style={{ marginTop: 0 }}>🤖 AI Assistant Integration</h3>
        <p>Generate a new access token for AI assistants:</p>
        
        {/* Pricing warning for additional tokens */}
        {tokens.filter(t => !t.is_expired).length >= 1 && (
          <div style={{ 
            background: '#fff3cd', 
            border: '2px solid #ffc107', 
            padding: '15px', 
            borderRadius: '4px', 
            marginBottom: '15px',
            fontSize: '0.9rem'
          }}>
            <div style={{ fontWeight: 'bold', color: '#856404', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⚠️ Additional Token Pricing
            </div>
            <div style={{ color: '#856404', marginBottom: '10px' }}>
              You already have <strong>{tokens.filter(t => !t.is_expired).length} active token(s)</strong>. 
              Creating another token will cost <strong>$5/month</strong>.
            </div>
            <div style={{ 
              background: '#fef7f7', 
              border: '1px solid #d4351c', 
              padding: '8px', 
              borderRadius: '4px',
              fontSize: '0.85rem',
              color: '#d4351c'
            }}>
              💳 <strong>Monthly cost for {tokens.filter(t => !t.is_expired).length + 1} tokens:</strong> 
              ${tokens.filter(t => !t.is_expired).length * 5}/month (plus 1 free)
            </div>
          </div>
        )}
        
        <button 
          onClick={testOAuth}
          style={{ 
            background: tokens.filter(t => !t.is_expired).length >= 1 ? '#ffc107' : '#00703c', 
            color: tokens.filter(t => !t.is_expired).length >= 1 ? '#856404' : 'white', 
            padding: '12px 20px', 
            border: 'none', 
            borderRadius: '4px', 
            marginBottom: '20px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          {tokens.filter(t => !t.is_expired).length >= 1 ? '💰 Generate Paid Token ($5/month)' : '🆓 Generate Free Token'}
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
        "BITATLAS_API_URL": "http://localhost:3000"
      }
    }
  }
}`}
              </div>
            </li>
            <li><strong>Test:</strong> Claude can now search and access your BitAtlas files!</li>
          </ol>
          <p style={{ margin: '10px 0 0 0', fontSize: '0.9rem', color: '#505a5f' }}>
            💡 <strong>Tip:</strong> You can revoke access tokens at any time in the "Active Access Tokens" section above. Remember: additional tokens beyond your first free token cost <strong>$5/month each</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <NotificationProvider>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </AuthProvider>
      </NotificationProvider>
    </ErrorBoundary>
  );
}

export default App;