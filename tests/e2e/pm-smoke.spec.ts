import { expect, test } from "@playwright/test";
import { installDemoApiMocks } from "./support/demo-api";

test.describe("PM module smoke", () => {
    test.beforeEach(async ({ page }) => {
        await installDemoApiMocks(page);
        await page.goto("/dashboard/proyectos");
        await expect(page.getByRole("heading", { name: "Proyectos" })).toBeVisible();
    });

    test("creates and filters project from dashboard UI", async ({ page }) => {
        await page.getByRole("button", { name: /Nuevo proyecto/i }).click();
        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible();

        await dialog.getByPlaceholder("OPS").fill("pmqa");
        await dialog.getByPlaceholder("Operación UNOi").fill("PM Smoke QA");
        await dialog.getByPlaceholder("Notas del proyecto…").fill("Validación API/UI PM");
        await dialog.getByRole("button", { name: /^Crear/ }).click();

        await expect(page.getByText("Proyecto creado.")).toBeVisible();
        await expect(page.getByText("PM Smoke QA")).toBeVisible();

        await page.getByPlaceholder("Buscar…").fill("Smoke QA");
        await expect(page.getByText("PM Smoke QA")).toBeVisible();
    });

    test("validates PM API flow (projects + tasks + move)", async ({ page }) => {
        const created = await page.evaluate(async () => {
            const projectRes = await fetch("/api/v1/pm/projects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    key: "PMAPI",
                    name: "PM API Smoke",
                    description: "API end-to-end smoke",
                }),
            });
            const projectPayload = await projectRes.json();
            if (!projectRes.ok) throw new Error(projectPayload.error || "Project create failed");

            const boardId: string = projectPayload.board.id;
            const projectId: string = projectPayload.project.id;
            const todoColumnId = `${boardId}-todo`;
            const doneColumnId = `${boardId}-done`;

            const taskRes = await fetch("/api/v1/pm/tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    project_id: projectId,
                    board_id: boardId,
                    column_id: todoColumnId,
                    title: "Task smoke",
                    description: "Task created via smoke test",
                    priority: "normal",
                }),
            });
            const taskPayload = await taskRes.json();
            if (!taskRes.ok) throw new Error(taskPayload.error || "Task create failed");

            const moveRes = await fetch(`/api/v1/pm/tasks/${taskPayload.task.id}/move`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    column_id: doneColumnId,
                    sort_order: 2000,
                }),
            });
            const movePayload = await moveRes.json();
            if (!moveRes.ok) throw new Error(movePayload.error || "Task move failed");

            const listRes = await fetch(`/api/v1/pm/tasks?project_id=${projectId}`);
            const listPayload = await listRes.json();
            if (!listRes.ok) throw new Error(listPayload.error || "Task list failed");

            return {
                projectId,
                boardId,
                taskId: taskPayload.task.id as string,
                movedColumnId: movePayload.task.column_id as string,
                completedAt: movePayload.task.completed_at as string | null,
                totalTasks: listPayload.total as number,
            };
        });

        expect(created.projectId).toBeTruthy();
        expect(created.taskId).toBeTruthy();
        expect(created.movedColumnId).toBe(`${created.boardId}-done`);
        expect(created.completedAt).toBeTruthy();
        expect(created.totalTasks).toBeGreaterThan(0);
    });
});

