"use client";

import { useState, Suspense } from "react";
import Image from "next/image";
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
import { GlobeBackground } from "@/components/auth/globe-background";

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
    const loginHref = next
        ? `/login?next=${encodeURIComponent(next)}`
        : "/login";
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
        <div suppressHydrationWarning className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
            <GlobeBackground />
            <div className="w-full max-w-md space-y-8 relative z-10 animate-in fade-in zoom-in duration-1000">
                {/* Logo */}
                <div className="text-center space-y-4 flex flex-col items-center">
                    <div className="p-6 rounded-[2.5rem] bg-white/5 backdrop-blur-2xl border border-white/20 shadow-[0_0_40px_rgba(59,130,246,0.2)] mb-2 group transition-all hover:scale-110 duration-500">
                        <Image
                            src="/lec_logo_pack/lec_logo_full.png"
                            alt="LEC Logo"
                            width={240}
                            height={65}
                            priority
                            className="h-16 w-auto object-contain"
                        />
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-white font-outfit text-2xl font-black tracking-tight drop-shadow-lg">
                            LEC PLATFORM
                        </h2>
                        <p className="text-xs text-blue-400 font-bold tracking-[0.3em] uppercase">
                            Languages Education Consulting
                        </p>
                    </div>
                </div>

                {/* Register Card */}
                <Card className="bg-slate-950/40 border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-3xl ring-1 ring-white/20 rounded-[2rem] overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-transparent via-primary to-transparent opacity-50" />
                    <CardHeader className="space-y-1 text-center pb-8 pt-10">
                        <CardTitle className="text-3xl font-outfit font-black text-white tracking-tight">
                            {t("auth.registerTitle" as any) || "Crea tu cuenta"}
                        </CardTitle>
                        <CardDescription className="text-slate-400 font-medium text-base">
                            {t("auth.registerSubtitle" as any) || "Ingresa tus datos para registrarte"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pb-12 px-8">
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="fullName" className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] ml-1">
                                    {t("auth.fullName" as any) || "Nombre completo"}
                                </Label>
                                <Input
                                    id="fullName"
                                    type="text"
                                    placeholder="Juan Pérez"
                                    autoComplete="name"
                                    {...register("fullName")}
                                    className={cn(
                                        "bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-14 rounded-2xl focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300",
                                        errors.fullName ? "border-destructive focus:ring-destructive/50" : ""
                                    )}
                                />
                                {errors.fullName && (
                                    <p className="text-xs text-destructive font-bold mt-1 ml-1 animate-pulse">
                                        {errors.fullName.message}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] ml-1">
                                    {t("auth.email")}
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="tu@email.com"
                                    autoComplete="email"
                                    {...register("email")}
                                    className={cn(
                                        "bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-14 rounded-2xl focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300",
                                        errors.email ? "border-destructive focus:ring-destructive/50" : ""
                                    )}
                                />
                                {errors.email && (
                                    <p className="text-xs text-destructive font-bold mt-1 ml-1 animate-pulse">
                                        {errors.email.message}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password" id="password-label" className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] ml-1">
                                    {t("auth.password")}
                                </Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    autoComplete="new-password"
                                    {...register("password")}
                                    className={cn(
                                        "bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-14 rounded-2xl focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300",
                                        errors.password ? "border-destructive focus:ring-destructive/50" : ""
                                    )}
                                />
                                {errors.password && (
                                    <p className="text-xs text-destructive font-bold mt-1 ml-1 animate-pulse">
                                        {errors.password.message}
                                    </p>
                                )}
                            </div>

                            {error && (
                                <div className="rounded-2xl bg-destructive/10 border border-destructive/20 p-4 animate-in shake-1 duration-500">
                                    <p className="text-sm text-destructive font-bold text-center">{error}</p>
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg shadow-md transition-all hover:scale-[1.01] active:scale-[0.98] mt-4 group border-none"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                                ) : (
                                    <UserPlus className="mr-2 h-6 w-6 group-hover:translate-x-1 transition-transform" />
                                )}
                                {t("auth.registerButton" as any) || "Registrarse"}
                            </Button>
                        </form>

                        <div className="text-center pt-4">
                            <Link href={loginHref} className="text-sm text-slate-400 hover:text-primary font-bold transition-all hover:tracking-widest duration-300">
                                {t("auth.haveAccount" as any) || "¿Ya tienes cuenta? Inicia sesión"}
                            </Link>
                        </div>
                    </CardContent>
                </Card>

                <p suppressHydrationWarning className="text-center text-[10px] text-slate-500 font-bold tracking-[0.2em] uppercase opacity-50">
                    © {new Date().getFullYear()} LEC • Languages Education Consulting
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
