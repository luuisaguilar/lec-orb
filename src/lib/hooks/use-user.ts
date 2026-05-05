"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export interface UserMe {
    user: {
        id: string;
        email: string;
        full_name?: string;
    };
    organization: { id: string };
    role: "admin" | "supervisor" | "operador" | "applicator";
    permissions: Array<{
        module: string;
        can_view: boolean;
        can_edit: boolean;
        can_delete: boolean;
    }>;
}

export function useUser() {
    const { data, error, isLoading, mutate } = useSWR<UserMe>("/api/v1/users/me", fetcher);

    const hasPermission = (module: string, action: "view" | "edit" | "delete") => {
        if (!data) return false;
        if (data.role === "admin") return true;
        
        const perm = data.permissions.find((p) => p.module === module);
        if (!perm) return false;

        if (action === "view") return perm.can_view;
        if (action === "edit") return perm.can_edit;
        if (action === "delete") return perm.can_delete;
        return false;
    };

    const isAdmin = data?.role === "admin";
    const isSupervisor = data?.role === "supervisor";
    const isAtLeastSupervisor = isAdmin || isSupervisor;

    return {
        user: data?.user,
        organization: data?.organization,
        role: data?.role,
        permissions: data?.permissions,
        isLoading,
        error,
        mutate,
        hasPermission,
        isAdmin,
        isSupervisor,
        isAtLeastSupervisor,
    };
}
