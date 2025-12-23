"use client";

import { useAuthStore } from "@/lib/stores/auth-store";
import { useGroupStore } from "@/lib/stores/group-store";
import { useEffect, useRef } from "react";

export default function AppInitializer() {
  const fetchUser = useAuthStore((state) => state.fetchUser);

  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      fetchUser();
      initialized.current = true;
    }
  }, [fetchUser]);

  return null;
}
