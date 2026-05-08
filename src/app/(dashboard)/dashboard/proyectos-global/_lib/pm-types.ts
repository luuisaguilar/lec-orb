export type PmProject = {
    id: string;
    key: string | null;
    name: string;
    description: string | null;
    status: "active" | "archived";
};

export type PmTask = {
    id: string;
    project_id: string;
    board_id: string;
    column_id: string;
    ref: string | null;
    title: string;
    description: string | null;
    scope: "team" | "role" | "personal";
    role_target: "admin" | "supervisor" | "operador" | "applicator" | null;
    is_private: boolean;
    assignee_user_id: string | null;
    due_date: string | null;
    priority: "low" | "normal" | "high" | "urgent";
    completed_at?: string | null;
};

export const pmFetcher = (url: string) => fetch(url).then((r) => r.json());
