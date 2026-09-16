import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import MainMenu from "@/components/tcg/MainMenu";
import { createPageUrl } from "../utils";


function coerceJsonArray(value, fallback = null) {
  if (Array.isArray(value)) return value;
  if (value == null) return fallback;
  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return fallback;
    try {
      const parsed = JSON.parse(s);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

export default function TCGMainMenu() {
  const navigate = useNavigate();

  const [authUser, setAuthUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [progress, setProgress] = useState(null);

  const [selectedDeck, setSelectedDeck] = useState("fire");

  // Load auth user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setAuthUser(data?.user || null);
    });
  }, []);

  // Load userprofile + playerprogress
  useEffect(() => {
    const loadAll = async () => {
      if (!authUser?.email) return;

      const { data: profileData, error: profileError } = await supabase
        .from("userprofile")
        .select("user_email, role, admin_mode_active")
        .eq("user_email", authUser.email)
        .maybeSingle();

      if (profileError) console.error("Failed to load userprofile:", profileError);
      setProfile(profileData || null);

      const { data: progressData, error: progressError } = await supabase
        .from("playerprogress")
        .select("*")
        .eq("user_email", authUser.email)
        .maybeSingle();

      if (progressError) console.error("Failed to load playerprogress:", progressError);

      if (!progressData) {
        setProgress({
          user_email: authUser.email,
          unlocked_decks: ["fire", "water", "earth", "wind"],
          admin_mode_active: false,
        });
      } else {
        setProgress({
          ...progressData,
          unlocked_decks: coerceJsonArray(progressData?.unlocked_decks, progressData?.unlocked_decks),
        });
      }
    };

    loadAll();
  }, [authUser]);

  // What MainMenu expects: currentUser includes role
  const currentUser = useMemo(() => {
    if (!authUser) return null;
    return { ...authUser, role: profile?.role || null };
  }, [authUser, profile?.role]);

  const unlockedDecks = useMemo(() => {
    const list = coerceJsonArray(progress?.unlocked_decks, null);
    if (Array.isArray(list) && list.length) return list;
    return ["fire", "water", "earth", "wind"];
  }, [progress?.unlocked_decks]);

  // Admin mode can be stored on either userprofile or playerprogress (legacy).
  // Only admins can benefit from admin mode being active.
  const adminModeActive = useMemo(() => {
    const isAdmin = (profile?.role || currentUser?.role) === "admin";
    if (!isAdmin) return false;
    return Boolean(profile?.admin_mode_active ?? progress?.admin_mode_active ?? false);
  }, [profile?.role, profile?.admin_mode_active, progress?.admin_mode_active, currentUser?.role]);

  // ✅ Correct handlers the UI calls
  const onBattleCpu = ({ selectedDeck: sd } = {}) => {
    navigate(createPageUrl("TCG"), {
      state: { mode: "ai", deckKey: sd || selectedDeck || "fire" },
    });
  };

  const onSeekDuels = () => window.location.assign('/multiplayer');

  const onInviteDuel = () => window.location.assign('/multiplayer');

  return (
    <MainMenu
      currentUser={currentUser}
      progress={progress}
      adminModeActive={adminModeActive}
      unlockedDecks={unlockedDecks}
      selectedDeck={selectedDeck}
      setSelectedDeck={setSelectedDeck}
      onBattleCpu={onBattleCpu}
      onSeekDuels={onSeekDuels}
      onInviteDuel={onInviteDuel}
    />
  );
}
