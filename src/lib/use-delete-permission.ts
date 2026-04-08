import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export function useDeletePermission() {
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("");
  const [canDelete, setCanDelete] = useState(false);

  useEffect(() => {
    const email = typeof window !== "undefined" ? localStorage.getItem("userEmail") || "" : "";
    setUserEmail(email);
    if (!email) return;

    const ADMIN_EMAILS = ["juanviverosv@gmail.com"];
    if (ADMIN_EMAILS.includes(email.toLowerCase())) {
      setUserRole("admin");
      setCanDelete(true);
      return;
    }

    (async () => {
      let role = "user";
      const r1 = await supabase.from("users").select("role").eq("email", email).maybeSingle();
      if (r1.data?.role) role = r1.data.role;
      else {
        const r2 = await supabase.from("Users").select("role").eq("email", email).maybeSingle();
        if (r2.data?.role) role = r2.data.role;
      }
      setUserRole(role);
      setCanDelete(["rh", "admin", "superadmin", "rrhh"].includes(role.toLowerCase()));
    })();
  }, []);

  return { userEmail, userRole, canDelete };
}
