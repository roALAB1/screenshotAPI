import { useMemo } from "react";

/**
 * Simplified useAuth hook - no authentication required
 * Returns a mock authenticated state for internal use
 */
export function useAuth() {
  const state = useMemo(() => {
    return {
      user: { name: "Internal User", email: "internal@example.com" },
      loading: false,
      error: null,
      isAuthenticated: true,
    };
  }, []);

  return {
    ...state,
    refresh: () => {},
    logout: () => {},
  };
}
