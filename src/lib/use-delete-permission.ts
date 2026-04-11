import { useState, useEffect } from "react";

export function useDeletePermission() {
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("");
  const [canDelete, setCanDelete] = useState(false);

  useEffect(() => {
    // Fase piloto: todos los usuarios logueados tienen acceso total (crear/borrar en cualquier modulo).
    // La restriccion por rol/modulo vendra despues via /dashboard/admin/roles.
    const email = typeof window !== "undefined" ? localStorage.getItem("userEmail") || "" : "";
    const role = typeof window !== "undefined" ? localStorage.getItem("userRole") || "user" : "user";
    setUserEmail(email);
    setUserRole(role);
    setCanDelete(!!email);
  }, []);

  return { userEmail, userRole, canDelete };
}
