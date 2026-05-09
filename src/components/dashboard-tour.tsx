"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

const STORAGE_KEY = "lec_dashboard_tour_v1";

function getDashboardSidebarTourTarget(): HTMLElement | null {
    const desktop = document.querySelector('[data-tour="dashboard-sidebar-desktop"]');
    const mobile = document.querySelector('[data-tour="dashboard-sidebar-mobile"]');
    const isUsable = (el: Element | null): el is HTMLElement => {
        if (!el || !(el instanceof HTMLElement)) return false;
        const { display, visibility } = window.getComputedStyle(el);
        return display !== "none" && visibility !== "hidden";
    };
    if (isUsable(desktop)) return desktop;
    if (isUsable(mobile)) return mobile;
    return null;
}

export function DashboardTour() {
    const pathname = usePathname();
    const startedRef = useRef(false);

    useEffect(() => {
        if (pathname !== "/dashboard") return;
        if (typeof window === "undefined") return;
        if (localStorage.getItem(STORAGE_KEY) === "1") return;
        if (startedRef.current) return;

        const timer = window.setTimeout(() => {
            const sidebar = getDashboardSidebarTourTarget();
            const main = document.querySelector('[data-tour="dashboard-main"]');
            const headerActions = document.querySelector('[data-tour="dashboard-header-actions"]');
            if (!sidebar || !main || !headerActions) return;

            const sidebarIsMobileTrigger =
                sidebar.getAttribute("data-tour") === "dashboard-sidebar-mobile";

            startedRef.current = true;
            const driverObj = driver({
                showProgress: true,
                animate: true,
                nextBtnText: "Siguiente",
                prevBtnText: "Atras",
                doneBtnText: "Entendido",
                steps: [
                    {
                        element: sidebar,
                        popover: {
                            title: "Menu principal",
                            description: sidebarIsMobileTrigger
                                ? "Abre el menu para ver los modulos de LEC: finanzas, eventos, usuarios y mas."
                                : "Accede a los modulos de LEC: finanzas, eventos, usuarios y mas.",
                            side: sidebarIsMobileTrigger ? "bottom" : "right",
                            align: "start",
                        },
                    },
                    {
                        element: '[data-tour="dashboard-main"]',
                        popover: {
                            title: "Tu espacio de trabajo",
                            description: "Aqui veras el contenido del modulo que elijas.",
                            side: "top",
                            align: "start",
                        },
                    },
                    {
                        element: '[data-tour="dashboard-header-actions"]',
                        popover: {
                            title: "Avisos y cuenta",
                            description: "Notificaciones, ajustes y cierre de sesion.",
                            side: "bottom",
                            align: "end",
                        },
                    },
                ],
                onDestroyed: () => {
                    localStorage.setItem(STORAGE_KEY, "1");
                },
            });
            driverObj.drive();
        }, 600);

        return () => window.clearTimeout(timer);
    }, [pathname]);

    return null;
}
