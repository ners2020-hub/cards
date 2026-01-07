import { createClient } from '@base44/sdk';

export const base44 = createClient({
  appId: "695863a33c3ceb7422adcfeb",
  requiresAuth: !import.meta.env.DEV, // ✅ local dev won’t redirect to base44.app
});

