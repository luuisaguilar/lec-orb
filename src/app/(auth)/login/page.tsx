"use client";

import { useState, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
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
import { LogIn, Loader2 } from "lucide-react";

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});

type LoginForm = z.infer<typeof loginSchema>;

import { GlobeBackground } from "@/components/auth/globe-background";

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const next = searchParams.get("next");
    const isPortalJoinFlow = (next ?? "").startsWith("/join-portal/");
    const registerHref = next
        ? `/register?next=${encodeURIComponent(next)}`
        : "/register";
    const forgotHref = next
        ? `/forgot-password?next=${encodeURIComponent(next)}`
        : "/forgot-password";
    const { t } = useI18n();
    const [error, setError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<LoginForm>({
        resolver: zodResolver(loginSchema),
    });

    async function onSubmit(data: LoginForm) {
        setError(null);
        const supabase = createClient();
        const { error: authError } = await supabase.auth.signInWithPassword({
            email: data.email,
            password: data.password,
        });

        if (authError) {
            setError(t("auth.loginError"));
            return;
        }

        let destination = next;
        if (!destination) {
            try {
                const res = await fetch("/api/v1/auth/post-login-redirect", {
                    method: "GET",
                    cache: "no-store",
                });
                const data = await res.json().catch(() => ({}));
                if (res.ok && typeof data?.redirectTo === "string") {
                    destination = data.redirectTo;
                }
            } catch {
                // Keep default fallback below when resolver fails.
            }
        }

        router.push(destination ?? "/dashboard");
        router.refresh();
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
                        <h2 className="text-white font-outfit text-2xl font-black tracking-tight drop-shadow-lg">LEC PLATFORM</h2>
                        <p className="text-xs text-blue-400 font-bold tracking-[0.3em] uppercase">
                            Languages Education Consulting
                        </p>
                    </div>
                </div>

                {/* Login Card */}
                <Card className="bg-slate-950/40 border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-3xl ring-1 ring-white/20 rounded-[2rem] overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-transparent via-primary to-transparent opacity-50" />
                    <CardHeader className="space-y-1 text-center pb-8 pt-10">
                        <CardTitle className="text-3xl font-outfit font-black text-white tracking-tight">{t("auth.loginTitle")}</CardTitle>
                        <CardDescription className="text-slate-400 font-medium text-base">{t("auth.loginSubtitle")}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pb-12 px-8">
                        {isPortalJoinFlow && (
                            <div className="rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3">
                                <p className="text-xs text-blue-100 leading-relaxed">
                                    Estás entrando para vincular tu acceso al portal de aplicadores. Inicia sesión
                                    con el <strong>mismo correo invitado</strong>.
                                </p>
                            </div>
                        )}

                        {/* Login Form */}
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] ml-1">{t("auth.email")}</Label>
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
                                <Label htmlFor="password" id="password-label" className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] ml-1">{t("auth.password")}</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    autoComplete="current-password"
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
                                    <LogIn className="mr-2 h-6 w-6 group-hover:translate-x-1 transition-transform" />
                                )}
                                {t("auth.loginButton")}
                            </Button>
                        </form>

                        <div className="text-center">
                            <Link
                                href={forgotHref}
                                className="text-xs text-slate-400 hover:text-primary font-semibold transition-colors"
                            >
                                ¿Olvidaste tu contraseña?
                            </Link>
                        </div>

                        <div className="text-center pt-4">
                            <Link href={registerHref} className="text-sm text-slate-400 hover:text-primary font-bold transition-all hover:tracking-widest duration-300">
                                {t("auth.noAccount" as any) || "¿No tienes cuenta? Regístrate"}
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

export default function LoginPage() {
    return (
        <Suspense>
            <LoginForm />
        </Suspense>
    );
}
