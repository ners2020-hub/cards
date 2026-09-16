// src/lib/app-params.js

// This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
// Pages are auto-registered when you create files in the ./pages/ folder.
//
// THE ONLY EDITABLE VALUE: mainPage
// This controls which page is the landing page (shown when users visit the app).
//
// Example file structure:
//
//   import HomePage from './pages/HomePage';
//   import Dashboard from './pages/Dashboard';
//   import Settings from './pages/Settings';
//
//   export const PAGES = {
//       "HomePage": HomePage,
//       "Dashboard": Dashboard,
//       "Settings": Settings,
//   }
//
//   export const pagesConfig = {
//       mainPage: "HomePage",
//       Pages: PAGES,
//   };
//
// Example with Layout (wraps all pages):
//
//   import Home from './pages/Home';
//   import Settings from './pages/Settings';
//   import __Layout from './Layout.jsx';
//
//   export const PAGES = {
//       "Home": Home,
//       "Settings": Settings,
//   }
//
//   export const pagesConfig = {
//       mainPage: "Home",
//       Pages: PAGES,
//       Layout: __Layout,
//   };
//
// To change the main page from HomePage to Dashboard, use find_replace:
//   Old: mainPage: "HomePage",
//   New: mainPage: "Dashboard",
//
// The mainPage value must match a key in the PAGES object exactly.
//
const isNode = typeof window === 'undefined';
const windowObj = isNode ? new Map() : window; // Use Map for Node.js environment
const storage = windowObj.localStorage;

const toSnakeCase = (str) => {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
};

const getAppParamValue = (paramName, { defaultValue = undefined, removeFromUrl = false } = {}) => {
  if (isNode) {
    return defaultValue;
  }

  const storageKey = `supabase_${toSnakeCase(paramName)}`; // Changed prefix to 'supabase_'
  const urlParams = new URLSearchParams(window.location.search);
  const searchParam = urlParams.get(paramName);

  if (removeFromUrl) {
    urlParams.delete(paramName);
    const newUrl = `${window.location.pathname}${urlParams.toString() ? `?${urlParams.toString()}` : ''}${window.location.hash}`;
    window.history.replaceState({}, document.title, newUrl);
  }

  if (searchParam) {
    storage.setItem(storageKey, searchParam);
    return searchParam;
  }

  if (defaultValue) {
    // Only set default if not already in storage to avoid overwriting user preferences
    if (!storage.getItem(storageKey)) {
      storage.setItem(storageKey, defaultValue);
    }
    return defaultValue;
  }

  const storedValue = storage.getItem(storageKey);
  if (storedValue) {
    return storedValue;
  }

  return null;
};

export const getAppParams = () => {
  // Clear old Base44 tokens if they exist in local storage
  // These are explicit removals and should only run once after migration
  if (storage.getItem('base44_access_token')) {
    storage.removeItem('base44_access_token');
  }
  if (storage.getItem('token')) { // Check if 'token' was a Base44 token
    storage.removeItem('token');
  }

  // Supabase does not typically use app_id, access_token from URL params in the same way.
  // The Supabase client is initialized with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
  // The access token is managed by the Supabase Auth client internally.
  // You might still need 'from_url' for redirects or similar custom logic.

  return {
    fromUrl: getAppParamValue("from_url", { defaultValue: window.location.href }),
    // Removed Base44 specific parameters like app_id, token, functionsVersion, appBaseUrl
    // Add any other application-specific parameters you need here that are NOT handled by Supabase directly
  };
};

