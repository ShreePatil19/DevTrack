"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, clearToken, getToken, type User } from "./api";

export function useAuth(redirectIfUnauthed = true) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      if (redirectIfUnauthed) router.replace("/login");
      return;
    }

    auth
      .me()
      .then(({ user }) => setUser(user))
      .catch(() => {
        clearToken();
        if (redirectIfUnauthed) router.replace("/login");
      })
      .finally(() => setLoading(false));
  }, [redirectIfUnauthed, router]);

  const logout = () => {
    clearToken();
    setUser(null);
    router.replace("/login");
  };

  return { user, loading, logout };
}
