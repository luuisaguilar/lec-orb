import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CheckCircle2, XCircle, UserPlus, AlertTriangle, Clock } from "lucide-react";
import { getApplicatorPortalInviteResult } from "./queries";
import { acceptApplicatorPortalInvitation } from "./actions";

export default async function JoinPortalPage({
    params,
    searchParams,
}: {
    params: Promise<{ token: string }>;
    searchParams?: Promise<{ error?: string; expired?: string }>;
}) {
    const { token } = await params;
    const sp = await searchParams;
    const acceptError = sp?.error ? decodeURIComponent(sp.error) : null;

    const result = await getApplicatorPortalInviteResult(token);

    const isExpiredParam = sp?.expired === "1";

    if (!result.ok || isExpiredParam) {
        const failReason = result.ok ? undefined : result.reason;
        const isAlreadyProcessed = failReason === "already_processed";
        const isServerError = failReason === "server_error" && !isExpiredParam;
        const isExpired =
            isExpiredParam || failReason === "expired" || failReason === "not_found";

        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
                <Card className="max-w-md w-full text-center p-6 border-t-4 border-t-red-500 shadow-xl">
                    {isAlreadyProcessed ? (
                        <Clock className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                    ) : (
                        <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    )}
                    <CardTitle className="text-2xl mb-2">
                        {isAlreadyProcessed
                            ? "Enlace ya utilizado"
                            : isExpired
                              ? "Enlace expirado o inválido"
                              : "No se pudo validar el enlace"}
                    </CardTitle>
                    <CardDescription className="mb-6">
                        {isAlreadyProcessed
                            ? "Este enlace ya fue usado. Pide a coordinación uno nuevo si necesitas acceso."
                            : isServerError
                              ? "Hubo un error al verificar la invitación. Intenta de nuevo o contacta al administrador."
                              : "El enlace expiró, fue cancelado o no existe."}
                    </CardDescription>

                    <div className="flex flex-col gap-3 mt-6">
                        <Button asChild variant="outline" className="w-full">
                            <Link href="/login">Ir al inicio de sesión</Link>
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    const preview = result.preview;

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
                <Card className="max-w-md w-full text-center p-6 border-t-4 border-t-[#002e5d] shadow-xl">
                    <UserPlus className="h-12 w-12 text-[#002e5d] mx-auto mb-4" />
                    <CardHeader>
                        <CardTitle className="text-2xl tracking-tight">
                            Portal de aplicadores — {preview.organizationName}
                        </CardTitle>
                        <CardDescription>
                            Invitación para <strong>{preview.applicatorName}</strong> (
                            {preview.invitedEmailMasked}
                            ).
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Para vincular tu cuenta, inicia sesión o regístrate con el mismo correo al que
                            llegó esta invitación.
                        </p>
                        <div className="flex flex-col gap-2">
                            <Button asChild className="bg-[#002e5d]">
                                <Link href={`/register?next=/join-portal/${token}`}>Crear cuenta</Link>
                            </Button>
                            <Button asChild variant="outline">
                                <Link href={`/login?next=/join-portal/${token}`}>Ya tengo cuenta</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
            <Card className="max-w-md w-full text-center p-6 border-t-4 border-t-green-500 shadow-xl">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <CardHeader>
                    <CardTitle className="text-2xl">Vincular portal</CardTitle>
                    <CardDescription>
                        Vas a vincular tu cuenta con el perfil de aplicador{" "}
                        <strong>{preview.applicatorName}</strong> en{" "}
                        <strong>{preview.organizationName}</strong>.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-left border rounded-lg p-4 bg-green-50/50">
                    <div className="text-sm">
                        <p className="font-bold text-green-800">Cuenta actual:</p>
                        <p className="text-green-700">{user.email}</p>
                    </div>
                </CardContent>

                {acceptError && (
                    <div className="mt-4 rounded-md bg-red-50 border border-red-200 p-3 flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                        <p className="text-sm text-red-700">{acceptError}</p>
                    </div>
                )}

                <form action={acceptApplicatorPortalInvitation}>
                    <input type="hidden" name="token" value={token} />
                    <Button type="submit" className="w-full mt-6 bg-[#002e5d] text-white hover:bg-[#001f3f]">
                        Confirmar y entrar al portal
                    </Button>
                </form>
            </Card>
        </div>
    );
}
