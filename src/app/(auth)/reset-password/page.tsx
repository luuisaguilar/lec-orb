"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GlobeBackground } from "@/components/auth/globe-background";
import { Loader2, Lock } from "lucide-react";

const schema = z
    .object({
        password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
        confirmPassword: z.string().min(6, "Confirma la contraseña"),
    })
    .refine((v) => v.password === v.confirmPassword, {
        message: "Las contraseñas no coinciden",
        path: ["confirmPassword"],
    });

type FormValues = z.infer<typeof schema>;

function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const next = searchParams.get("next");
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<FormValues>({
        resolver: zodResolver(schema),
    });

    async function onSubmit(values: FormValues) {
        setError(null);
        const supabase = createClient();
        const { error: updateError } = await supabase.auth.updateUser({
            password: values.password,
        });

        if (updateError) {
            setError("No se pudo actualizar la contraseña. Abre de nuevo el enlace del correo.");
            return;
        }

        setDone(true);

        window.setTimeout(() => {
            const target = next ? `/login?next=${encodeURIComponent(next)}` : "/login";
            router.push(target);
        }, 1200);
    }

    return (
        <div suppressHydrationWarning className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
            <GlobeBackground />
            <Card className="w-full max-w-md bg-slate-950/40 border-white/10 backdrop-blur-3xl ring-1 ring-white/20 rounded-[2rem]">
                <CardHeader className="text-center pt-10">
                    <CardTitle className="text-3xl font-outfit font-black text-white tracking-tight">
                        Nueva contraseña
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                        Escribe tu nueva contraseña para continuar.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5 pb-10 px-8">
                    {done ? (
                        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
                            Contraseña actualizada. Redirigiendo a inicio de sesión...
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-slate-300">Nueva contraseña</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
                                    <Input
                                        id="password"
                                        type="password"
                                        className="pl-9 bg-white/5 border-white/10 text-white h-11 rounded-xl"
                                        {...register("password")}
                                    />
                                </div>
                                {errors.password && (
                                    <p className="text-xs text-red-400">{errors.password.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword" className="text-slate-300">Confirmar contraseña</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        className="pl-9 bg-white/5 border-white/10 text-white h-11 rounded-xl"
                                        {...register("confirmPassword")}
                                    />
                                </div>
                                {errors.confirmPassword && (
                                    <p className="text-xs text-red-400">{errors.confirmPassword.message}</p>
                                )}
                            </div>

                            {error && (
                                <p className="text-sm text-red-400">{error}</p>
                            )}

                            <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Guardar contraseña
                            </Button>
                        </form>
                    )}

                    <div className="text-center">
                        <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="text-xs text-slate-400 hover:text-primary">
                            Volver a iniciar sesión
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense>
            <ResetPasswordForm />
        </Suspense>
    );
}

