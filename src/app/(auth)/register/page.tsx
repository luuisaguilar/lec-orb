"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { getEmailRedirectOrigin } from "@/lib/env/app-url";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";
import { UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

const registerSchema = z.object({
    fullName: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
});

type RegisterForm = z.infer<typeof registerSchema>;

function RegisterForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const next = searchParams.get("next");
    const { t } = useI18n();
    const [error, setError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<RegisterForm>({
        resolver: zodResolver(registerSchema),
    });

    async function onSubmit(data: RegisterForm) {
        setError(null);
        const supabase = createClient();

        // 1. Sign up the user via Supabase Auth
        const origin = getEmailRedirectOrigin();
        const afterConfirmPath = next
            ? `/login?next=${encodeURIComponent(next)}`
            : "/login";

        const { error: authError } = await supabase.auth.signUp({
            email: data.email,
            password: data.password,
            options: {
                data: {
                    full_name: data.fullName,
                },
                emailRedirectTo: `${origin}${afterConfirmPath}`,
            }
        });

        if (authError) {
            setError(authError.message);
            return;
        }

        // Profile + org + org_member are created automatically by the
        // handle_new_user() DB trigger on auth.users INSERT.

        const loginUrl = next ? `/login?next=${encodeURIComponent(next)}` : "/login";
        const toastMsg = next
            ? "¡Cuenta creada! Verifica tu correo e inicia sesión para aceptar la invitación."
            : "¡Cuenta creada! Por favor verifica tu correo e inicia sesión.";

        toast.success(toastMsg);
        router.push(loginUrl);
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-background via-background to-secondary/30 p-4">
            <div className="w-full max-w-md space-y-8">
                {/* Logo */}
                <div className="text-center space-y-2">
                    <h1 className="text-4xl font-bold bg-linear-to-r from-blue-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">
                        LEC
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Languages Education Consulting
                    </p>
                </div>

                {/* Register Card */}
                <Card className="border-none shadow-card bg-card/80 backdrop-blur-xl rounded-[2rem] overflow-hidden">
                    <CardHeader className="space-y-1 text-center pt-8">
                        <CardTitle className="text-3xl font-outfit font-black tracking-tight">{t("auth.registerTitle" as any) || "Crea tu cuenta"}</CardTitle>
                        <CardDescription className="text-muted-foreground font-medium">{t("auth.registerSubtitle" as any) || "Ingresa tus datos para registrarte"}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 px-8 pb-10">
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="fullName" className="text-[10px] uppercase tracking-widest font-bold opacity-70 ml-1">{t("auth.fullName" as any) || "Nombre Completo"}</Label>
                                <Input
                                    id="fullName"
                                    type="text"
                                    placeholder="Juan Pérez"
                                    {...register("fullName")}
                                    className={cn("h-12 rounded-xl bg-muted/20 border-transparent focus:bg-background transition-all", errors.fullName ? "border-destructive" : "")}
                                />
                                {errors.fullName && (
                                    <p className="text-xs text-destructive font-semibold ml-1">
                                        {errors.fullName.message}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-[10px] uppercase tracking-widest font-bold opacity-70 ml-1">{t("auth.email")}</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="tu@email.com"
                                    autoComplete="email"
                                    {...register("email")}
                                    className={cn("h-12 rounded-xl bg-muted/20 border-transparent focus:bg-background transition-all", errors.email ? "border-destructive" : "")}
                                />
                                {errors.email && (
                                    <p className="text-xs text-destructive font-semibold ml-1">
                                        {errors.email.message}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password" id="password-label" className="text-[10px] uppercase tracking-widest font-bold opacity-70 ml-1">{t("auth.password")}</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    autoComplete="new-password"
                                    {...register("password")}
                                    className={cn("h-12 rounded-xl bg-muted/20 border-transparent focus:bg-background transition-all", errors.password ? "border-destructive" : "")}
                                />
                                {errors.password && (
                                    <p className="text-xs text-destructive font-semibold ml-1">
                                        {errors.password.message}
                                    </p>
                                )}
                            </div>

                            {error && (
                                <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4">
                                    <p className="text-sm text-destructive font-bold text-center">{error}</p>
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg shadow-md transition-all hover:scale-[1.01] active:scale-[0.98] mt-4"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                                ) : (
                                    <UserPlus className="mr-2 h-6 w-6" />
                                )}
                                {t("auth.registerButton" as any) || "Registrarse"}
                            </Button>
                        </form>

                        <div className="text-center mt-4">
                            <Link href="/login" className="text-sm text-primary hover:underline">
                                {t("auth.haveAccount" as any) || "¿Ya tienes cuenta? Inicia sesión"}
                            </Link>
                        </div>
                    </CardContent>
                </Card>

                <p className="text-center text-xs text-muted-foreground">
                    © {new Date().getFullYear()} Languages Education Consulting
                </p>
            </div>
        </div>
    );
}

export default function RegisterPage() {
    return (
        <Suspense>
            <RegisterForm />
        </Suspense>
    );
}
