"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { UserRole } from "@/lib/roles";

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: UserRole;
  title: string | null;
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  employee: Employee | null;
  role: UserRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  employee: null,
  role: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchEmployee = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("employees")
      .select("id, first_name, last_name, email, role, title, is_active")
      .eq("auth_user_id", userId)
      .single();

    if (data) {
      setEmployee(data as Employee);
    }
  }, [supabase]);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        await fetchEmployee(user.id);
      }
      setLoading(false);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchEmployee(session.user.id);
        } else {
          setEmployee(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase, fetchEmployee]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setEmployee(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        employee,
        role: employee?.role ?? null,
        loading,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
