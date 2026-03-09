"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
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
import { useI18n } from "@/lib/i18n";
import { UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

const registerSchema = z.object({
    fullName: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
    const router = useRouter();
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
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: data.email,
            password: data.password,
            options: {
                data: {
                    full_name: data.fullName,
                }
            }
        });

        if (authError) {
            setError(authError.message);
            return;
        }

        if (authData.user) {
            // 2. Create a profile record for the user
            const { error: profileError } = await supabase
                .from('profiles')
                .insert({
                    id: authData.user.id,
                    full_name: data.fullName,
                });

            if (profileError) {
                console.error("Profile creation failed: ", profileError);
            }

            // 3. Auto-create an Organization for this user
            // (The first user to register becomes the admin of their own org)
            const orgName = `${data.fullName.split(' ')[0]}'s Organization`;
            const { data: newOrg, error: orgError } = await supabase
                .from('organizations')
                .insert({ name: orgName })
                .select()
                .single();

            if (orgError) {
                console.error("Organization creation failed: ", orgError);
            } else if (newOrg) {
                // 4. Link the user to the org as an admin
                const { error: memberError } = await supabase
                    .from('org_members')
                    .insert({
                        user_id: authData.user.id,
                        org_id: newOrg.id,
                        role: 'admin',
                    });

                if (memberError) {
                    console.error("Org member link failed: ", memberError);
                }
            }
        }

        toast.success("¡Cuenta creada! Por favor verifica tu correo e inicia sesión.");
        router.push("/login");
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary/30 p-4">
            <div className="w-full max-w-md space-y-8">
                {/* Logo */}
                <div className="text-center space-y-2">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">
                        LEC
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Language Evaluation Center
                    </p>
                </div>

                {/* Register Card */}
                <Card className="border shadow-lg backdrop-blur">
                    <CardHeader className="space-y-1 text-center">
                        <CardTitle className="text-2xl">{t("auth.registerTitle" as any) || "Crea tu cuenta"}</CardTitle>
                        <CardDescription>{t("auth.registerSubtitle" as any) || "Ingresa tus datos para registrarte"}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="fullName">{t("auth.fullName" as any) || "Nombre Completo"}</Label>
                                <Input
                                    id="fullName"
                                    type="text"
                                    placeholder="Juan Pérez"
                                    {...register("fullName")}
                                    className={errors.fullName ? "border-destructive" : ""}
                                />
                                {errors.fullName && (
                                    <p className="text-xs text-destructive">
                                        {errors.fullName.message}
                                    </p>
                                )}
                            </div>

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
                                    autoComplete="new-password"
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
                                    <UserPlus className="mr-2 h-4 w-4" />
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
                    © {new Date().getFullYear()} Language Evaluation Center
                </p>
            </div>
        </div>
    );
}
