"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { DEMO_MODE } from "@/lib/demo/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/lib/i18n";
import { LogIn, Loader2, Play } from "lucide-react";

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
    const router = useRouter();
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

        router.push("/dashboard");
        router.refresh();
    }

    function handleDemoLogin() {
        // Obsolete: We are using real Supabase auth now
        router.push("/dashboard");
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary/30 p-4">
            <div className="w-full max-w-md space-y-8">
                {/* Logo */}
                <div className="text-center space-y-2 flex flex-col items-center">
                    <Image
                        src="/lec_logo_pack/lec_logo_full.png"
                        alt="LEC Logo"
                        width={200}
                        height={56}
                        className="h-14 w-auto object-contain"
                    />
                    <p className="text-sm text-muted-foreground mt-2">
                        Language Evaluation Center
                    </p>
                </div>

                {/* Login Card */}
                <Card className="border shadow-lg backdrop-blur">
                    <CardHeader className="space-y-1 text-center">
                        <CardTitle className="text-2xl">{t("auth.loginTitle")}</CardTitle>
                        <CardDescription>{t("auth.loginSubtitle")}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Demo Mode Button (Hidden for Production) */}
                        {DEMO_MODE && process.env.NODE_ENV !== "production" && (
                            <>
                                <Button
                                    onClick={handleDemoLogin}
                                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold h-12 text-base"
                                >
                                    <Play className="mr-2 h-5 w-5" />
                                    Entrar en Modo Demo
                                </Button>
                                <div className="relative">
                                    <Separator />
                                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                                        o
                                    </span>
                                </div>
                            </>
                        )}

                        {/* Regular Login Form */}
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">{t("auth.email")}</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="tu@email.com"
                                    autoComplete="email"
                                    {...register("email")}
                                    className={errors.email ? "border-destructive" : ""}
                                />
                                {errors.email && (
                                    <p className="text-xs text-destructive">
                                        {errors.email.message}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">{t("auth.password")}</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    {...register("password")}
                                    className={errors.password ? "border-destructive" : ""}
                                />
                                {errors.password && (
                                    <p className="text-xs text-destructive">
                                        {errors.password.message}
                                    </p>
                                )}
                            </div>

                            {error && (
                                <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
                                    <p className="text-sm text-destructive">{error}</p>
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="w-full"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <LogIn className="mr-2 h-4 w-4" />
                                )}
                                {t("auth.loginButton")}
                            </Button>
                        </form>

                        <div className="text-center mt-4">
                            <a href="/register" className="text-sm text-primary hover:underline">
                                {t("auth.noAccount" as any) || "¿No tienes cuenta? Regístrate"}
                            </a>
                        </div>
                    </CardContent>
                </Card>

                <p className="text-center text-xs text-muted-foreground">
                    © {new Date().getFullYear()} Language Evaluation Center
                </p>
            </div>
        </div>
    );
}
