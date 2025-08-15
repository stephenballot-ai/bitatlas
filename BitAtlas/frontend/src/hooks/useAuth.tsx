import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { User, LoginRequest, RegisterRequest } from '../types';
import { apiService } from '../services/api';

// Auth state
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Auth actions
type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: User }
  | { type: 'AUTH_ERROR'; payload: string }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'CLEAR_ERROR' };

// Initial state
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

// Auth reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'AUTH_ERROR':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    case 'AUTH_LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
}

// Auth context
interface AuthContextType {
  state: AuthState;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check authentication status on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (data: LoginRequest) => {
    dispatch({ type: 'AUTH_START' });
    try {
      await apiService.login(data);
      
      // Get user profile
      const { user } = await apiService.getProfile();
      
      dispatch({ type: 'AUTH_SUCCESS', payload: user });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      dispatch({ type: 'AUTH_ERROR', payload: message });
      throw error;
    }
  };

  const register = async (data: RegisterRequest) => {
    dispatch({ type: 'AUTH_START' });
    try {
      await apiService.register(data);
      
      // Auto-login after registration
      await login({ email: data.email, password: data.password });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      dispatch({ type: 'AUTH_ERROR', payload: message });
      throw error;
    }
  };

  const logout = async () => {
    try {
      await apiService.logout();
    } catch (error) {
      console.warn('Logout API call failed:', error);
    }
    dispatch({ type: 'AUTH_LOGOUT' });
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const checkAuth = async () => {
    if (!apiService.hasValidToken()) {
      return;
    }

    dispatch({ type: 'AUTH_START' });
    try {
      const { user } = await apiService.getProfile();
      dispatch({ type: 'AUTH_SUCCESS', payload: user });
    } catch (error) {
      // Token might be expired, try to refresh
      try {
        await apiService.refreshToken();
        const { user } = await apiService.getProfile();
        dispatch({ type: 'AUTH_SUCCESS', payload: user });
      } catch (refreshError) {
        // Refresh failed, clear tokens and logout
        apiService.clearTokens();
        dispatch({ type: 'AUTH_LOGOUT' });
      }
    }
  };

  const value: AuthContextType = {
    state,
    login,
    register,
    logout,
    clearError,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Auth hook
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}