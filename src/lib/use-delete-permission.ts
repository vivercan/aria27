import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export function useDeletePermission() {
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("");
  const [canDelete, setCanDelete] = useState(false);

  useEffect(() => {
    const email = typeof window !== "undefined" ? localStorage.getItem("userEmail") || "" : "";
    setUserEmail(email);
    if (email) {
      supabase.from("Users").select("role").eq("email", email).single().then(({ data }) => {
        const role = data?.role || "user";
        setUserRole(role);
        setCanDelete(role === "rh" || role === "admin");
      });
    }
  }, []);

  return { userEmail, userRole, canDelete };
}
