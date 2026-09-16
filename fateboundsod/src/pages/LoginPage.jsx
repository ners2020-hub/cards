// src/pages/LoginPage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { userService } from "@/services/userService";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LogIn, Chrome, UserPlus, ShieldQuestion } from "lucide-react";
import { motion } from "framer-motion";

export default function LoginPage() {
  const navigate = useNavigate();

  const {
    signInWithEmailAndPassword,
    signUpWithEmailAndPassword,
    signInWithGoogle,
    sendPasswordResetEmail,
    isAuthed,
    user,
    loading: authLoading,
  } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(false);

  const [isSignUp, setIsSignUp] = useState(false);

  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [resetError, setResetError] = useState("");

  // Decide where to go after auth based on whether userprofile exists
  const routeAfterAuth = async (maybeEmail) => {
    const resolvedEmail = maybeEmail || user?.email || email;
    if (!resolvedEmail) {
      navigate("/", { replace: true });
      return;
    }

    try {
      const profile = await userService.getUserProfileByEmail(resolvedEmail);
      if (!profile) {
        navigate("/Profile", { replace: true });
        return;
      }
      navigate("/", { replace: true }); // "/" is your MainMenu
    } catch (e) {
      // If profile lookup fails (RLS/network), still send them to Profile to create it
      navigate("/Profile", { replace: true });
    }
  };

  // If already authenticated, route immediately (and respect profile gate)
  useEffect(() => {
    if (!authLoading && isAuthed) {
      routeAfterAuth();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthed]);

  const handleEmailPasswordSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLoginError("");
    setResetMessage("");
    setResetError("");

    try {
      const res = await signInWithEmailAndPassword(email, password);
      const signedInEmail = res?.user?.email || email;
      await routeAfterAuth(signedInEmail);
    } catch (err) {
      console.error("Email/Password Sign-in Error:", err);
      setLoginError(err?.message || "Invalid credentials or an unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailPasswordSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLoginError("");
    setResetMessage("");
    setResetError("");

    if (password !== confirmPassword) {
      setLoginError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      const res = await signUpWithEmailAndPassword(email, password);

      // Supabase may require email confirmation depending on your auth settings
      const createdEmail = res?.user?.email || email;

      setLoginError("Account created! If email confirmation is enabled, check your inbox to confirm.");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setIsSignUp(false);

      // If signup also logs them in immediately (depending on settings), route them
      if (res?.session || res?.user) {
        await routeAfterAuth(createdEmail);
      }
    } catch (err) {
      console.error("Email/Password Sign-up Error:", err);
      setLoginError(err?.message || "An unexpected error occurred during sign-up.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setLoginError("");
    setResetMessage("");
    setResetError("");

    try {
      await signInWithGoogle();
      // OAuth redirect will come back through AuthContext; useEffect will route
    } catch (err) {
      console.error("Google Sign-in Error:", err);
      setLoginError(err?.message || "An unexpected error occurred during Google sign-in.");
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResetError("");
    setResetMessage("");
    setLoginError("");

    try {
      await sendPasswordResetEmail(resetEmail);
      setResetMessage("Password reset email sent! Check your inbox.");
      setResetEmail("");
      setShowPasswordReset(false);
    } catch (err) {
      console.error("Password Reset Error:", err);
      setResetError(err?.message || "Failed to send reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // While AuthContext checks session, avoid flashing the form
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white text-xl">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full">
        <Card className="bg-slate-900/80 border-2 border-purple-500/50 shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
              FATEBOUND
            </CardTitle>
            <p className="text-slate-400 text-sm">
              {isSignUp ? "Create your account" : "Sign in to continue your journey"}
            </p>
          </CardHeader>

          <CardContent>
            {loginError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-900/20 text-red-400 p-3 rounded-lg text-sm mb-4 border border-red-500/50"
              >
                {loginError}
              </motion.div>
            )}

            {resetMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-green-900/20 text-green-400 p-3 rounded-lg text-sm mb-4 border border-green-500/50"
              >
                {resetMessage}
              </motion.div>
            )}

            {resetError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-900/20 text-red-400 p-3 rounded-lg text-sm mb-4 border border-red-500/50"
              >
                {resetError}
              </motion.div>
            )}

            {!showPasswordReset ? (
              <>
                <form onSubmit={isSignUp ? handleEmailPasswordSignUp : handleEmailPasswordSignIn} className="space-y-4">
                  <div>
                    <Label htmlFor="email" className="text-slate-300">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white"
                      required
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <Label htmlFor="password" className="text-slate-300">
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="********"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white"
                      required
                      disabled={loading}
                    />
                  </div>

                  {isSignUp && (
                    <div>
                      <Label htmlFor="confirmPassword" className="text-slate-300">
                        Confirm Password
                      </Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="********"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="bg-slate-800 border-slate-700 text-white"
                        required
                        disabled={loading}
                      />
                    </div>
                  )}

                  <Button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-pink-600" disabled={loading}>
                    {loading ? (
                      isSignUp ? (
                        "Creating Account..."
                      ) : (
                        "Signing In..."
                      )
                    ) : isSignUp ? (
                      <>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Create Account
                      </>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4 mr-2" />
                        Sign In
                      </>
                    )}
                  </Button>
                </form>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-700" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-slate-900/80 px-2 text-slate-500">Or</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full border-blue-500 text-blue-300 hover:bg-blue-900/20 mb-3"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                >
                  <Chrome className="w-4 h-4 mr-2" />
                  Google
                </Button>

                <div className="flex justify-between items-center text-sm mt-4">
                  <Button
                    variant="link"
                    className="text-slate-400 p-0 h-auto"
                    onClick={() => setIsSignUp(!isSignUp)}
                    disabled={loading}
                  >
                    {isSignUp ? "Already have an account? Sign In" : "Need an account? Sign Up"}
                  </Button>

                  {!isSignUp && (
                    <Button
                      variant="link"
                      className="text-slate-400 p-0 h-auto"
                      onClick={() => setShowPasswordReset(true)}
                      disabled={loading}
                    >
                      Forgot Password?
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <CardDescription className="text-slate-400 text-center mb-4">
                  Enter your email to receive a password reset link.
                </CardDescription>

                <form onSubmit={handlePasswordReset} className="space-y-4">
                  <div>
                    <Label htmlFor="resetEmail" className="text-slate-300">
                      Email
                    </Label>
                    <Input
                      id="resetEmail"
                      type="email"
                      placeholder="your@email.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white"
                      required
                      disabled={loading}
                    />
                  </div>

                  <Button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-pink-600" disabled={loading}>
                    <ShieldQuestion className="w-4 h-4 mr-2" />
                    {loading ? "Sending..." : "Send Reset Link"}
                  </Button>

                  <Button variant="outline" className="w-full" onClick={() => setShowPasswordReset(false)} disabled={loading}>
                    Cancel
                  </Button>
                </form>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
