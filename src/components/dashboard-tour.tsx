"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

const STORAGE_KEY = "lec_dashboard_tour_v1";

export function DashboardTour() {
    const pathname = usePathname();
    const startedRef = useRef(false);

    useEffect(() => {
        if (pathname !== "/dashboard") return;
        if (typeof window === "undefined") return;
        if (localStorage.getItem(STORAGE_KEY) === "1") return;
        if (startedRef.current) return;

        const timer = window.setTimeout(() => {
            const sidebar = document.querySelector('[data-tour="dashboard-sidebar"]');
            const main = document.querySelector('[data-tour="dashboard-main"]');
            const headerActions = document.querySelector('[data-tour="dashboard-header-actions"]');
            if (!sidebar || !main || !headerActions) return;

            startedRef.current = true;
            const driverObj = driver({
                showProgress: true,
                animate: true,
                nextBtnText: "Siguiente",
                prevBtnText: "Atras",
                doneBtnText: "Entendido",
                steps: [
                    {
                        element: '[data-tour="dashboard-sidebar"]',
                        popover: {
                            title: "Menu principal",
                            description:
                                "Accede a los modulos de LEC: finanzas, eventos, usuarios y mas.",
                            side: "right",
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
