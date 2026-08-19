import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  useEffect(() => { checkAppState(); }, []);

  // Fetch the signed-in user. supabase.auth.me() THROWS without a session, so this must only be
  // called once isAuthenticated() is known true (checkAppState gates it). Exposed on the context
  // because the newer stock scaffold's components call it directly after a login.
  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      const currentUser = await supabase.auth.me();
      setUser(currentUser.user_metadata);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsAuthenticated(false);
      if (error?.status === 401 || error?.status === 403) {
        setAuthError({ type: 'auth_required', message: 'Authentication required' });
      }
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  };

  const checkAppState = async () => {
    // Base44's hosted public-settings gate has no shim equivalent — auth flows through the
    // shim-backed supabase.auth.* instead.
    try {
      setAuthError(null);
      // supabase.auth.me() THROWS when there is no session; gate it behind the non-throwing
      // isAuthenticated() so an anonymous visitor is treated as logged-out, not an error.
      if (await supabase.auth.isAuthenticated()) {
        await checkUserAuth();
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
        setAuthChecked(true);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsAuthenticated(false);
      setIsLoadingAuth(false);
      setAuthChecked(true);
      if (error?.status === 401 || error?.status === 403) {
        setAuthError({ type: 'auth_required', message: 'Authentication required' });
      }
    }
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    if (shouldRedirect) { supabase.auth.logout(window.location.href); } else { supabase.auth.logout(); }
  };

  const navigateToLogin = () => { supabase.auth.redirectToLogin(window.location.href); };

  return (
    <AuthContext.Provider value={{
      user, isAuthenticated, isLoadingAuth, isLoadingPublicSettings,
      authError, authChecked, appPublicSettings, logout, navigateToLogin,
      checkUserAuth, checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) { throw new Error('useAuth must be used within an AuthProvider'); }
  return context;
};
