"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

interface UserContextType {
  nickname: string | null;
  setNickname: (name: string) => void;
  clearUser: () => void;
}

const UserContext = createContext<UserContextType>({
  nickname: null,
  setNickname: () => {},
  clearUser: () => {},
});

export const useUser = () => useContext(UserContext);

export const UserProvider = ({
  children,
  initialNickname,
}: {
  children: ReactNode;
  initialNickname?: string | null;
}) => {
  const [nickname, setNicknameState] = useState<string | null>(() => {
    if (typeof window === "undefined") return initialNickname ?? null;
    return localStorage.getItem("bible_games_nickname") || initialNickname || null;
  });

  const setNickname = useCallback((name: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("bible_games_nickname", name);
    }
    setNicknameState(name);
  }, []);

  const clearUser = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("bible_games_nickname");
    }
    setNicknameState(initialNickname ?? null);
  }, [initialNickname]);

  const value = useMemo(() => ({ nickname, setNickname, clearUser }), [clearUser, nickname, setNickname]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
