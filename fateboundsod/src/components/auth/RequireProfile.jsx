import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { userService } from "@/services/userService";

export default function RequireProfile({ children }) {
  const location = useLocation();

  // 1) Get current Supabase auth user
  const {
    data: user,
    isLoading: userLoading,
  } = useQuery({
    queryKey: ["authUser"],
    queryFn: userService.getCurrentUser,
    staleTime: 1000 * 30,
    retry: false,
  });

  const email = user?.email;

  // 2) Check that a userprofile row exists for this email
  const {
    data: profile,
    isLoading: profileLoading,
  } = useQuery({
    queryKey: ["userprofile", email],
    queryFn: () => userService.getUserProfileByEmail(email),
    enabled: !!email,
    retry: false,
  });

  // Loading while auth/profile resolves
  if (userLoading || (email && profileLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-200">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-4 border-slate-300 border-t-indigo-500 rounded-full animate-spin mx-auto"></div>
          <p className="text-sm opacity-70">Entering Fatebound...</p>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Logged in but missing profile row
  if (!profile) {
    return <Navigate to="/Profile" replace state={{ from: location }} />;
  }

  return children;
}
