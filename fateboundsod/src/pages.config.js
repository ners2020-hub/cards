// pages.config.js - Page routing configuration
//
// This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
// Pages are auto-registered when you create files in the ./pages/ folder.
//
// THE ONLY EDITABLE VALUE: mainPage
// This controls which page is the landing page (shown when users visit the app).
//
import AdminCardCreator from './pages/AdminCardCreator';
import AdminPrebuiltDecks from './pages/AdminPrebuiltDecks';
import AdminPromoCodes from './pages/AdminPromoCodes';
import CardTrades from './pages/CardTrades';
import DeckBuilder from './pages/DeckBuilder';
import Leaderboard from './pages/Leaderboard';
import Profile from './pages/Profile';
import Progression from './pages/Progression';
import Shop from './pages/Shop';
import Tutorial from './pages/Tutorial';
import TCGMainMenu from './pages/TCGMainMenu';
import TCG from './pages/TCG';
import LoginPage from './pages/LoginPage';

export const PAGES = {
  AdminCardCreator,
  AdminPrebuiltDecks,
  AdminPromoCodes,
  CardTrades,
  DeckBuilder,
  Leaderboard,
  Profile,
  Progression,
  Shop,
  Tutorial,
  TCGMainMenu,
  TCG,
  LoginPage,
};

export const pagesConfig = {
  // ✅ IMPORTANT: authenticated "/" should land on the Main Menu, not LoginPage
  mainPage: "TCGMainMenu",
  Pages: PAGES,
};
