// src/lib/AuthContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // 1) Initial session load (single source of truth on boot)
    (async () => {
      const { data, error } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error) {
        console.error("Error getting Supabase session on initial load:", error);
        setUser(null);
      } else {
        setUser(data?.session?.user ?? null);
      }

      setLoading(false);
    })();

    // 2) Listen for auth changes (login/logout/refresh)
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      // do NOT setLoading(false) here; loading is only for initial boot
    });

    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe?.();
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthed: Boolean(user),

      // Email/password sign-in
      async signInWithEmailAndPassword(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          console.error("Error signing in with email/password:", error);
          throw error;
        }
        return data;
      },

      // Email/password sign-up
      async signUpWithEmailAndPassword(email, password) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {},
        });

        if (error) {
          console.error("Error signing up with email/password:", error);
          throw error;
        }
        return data;
      },

      // Google OAuth
      async signInWithGoogle() {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: `${window.location.origin}/multiplayer` },
        });

        if (error) {
          console.error("Error signing in with Google:", error);
          throw error;
        }
        return data;
      },

      // Password reset
      async sendPasswordResetEmail(email) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/update-password`,
        });

        if (error) {
          console.error("Error sending password reset email:", error);
          throw error;
        }
        return { message: "Password reset email sent!" };
      },

      // Sign out
      async signOut() {
        const { error } = await supabase.auth.signOut();
        if (error) {
          console.error("Error signing out:", error);
          throw error;
        }
        setUser(null);
      },

      setUser,
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
