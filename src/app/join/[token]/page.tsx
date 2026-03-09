import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CheckCircle2, XCircle, UserPlus } from "lucide-react";

export default async function JoinPage({ params }: { params: { token: string } }) {
    const supabase = await createClient();

    // 1. Validate Token
    const { data: invitation, error: invError } = await supabase
        .from('org_invitations')
        .select('*, organizations(name)')
        .eq('token', params.token)
        .eq('status', 'pending')
        .single();

    if (invError || !invitation) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
                <Card className="max-w-md w-full text-center p-6 border-t-4 border-t-red-500">
                    <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <CardTitle className="text-2xl mb-2">Invitación Inválida</CardTitle>
                    <CardDescription>
                        Esta invitación ha expirado, fue revocada o el enlace es incorrecto.
                    </CardDescription>
                    <Button asChild className="mt-6 bg-[#002e5d]">
                        <Link href="/login">Ir al Inicio</Link>
                    </Button>
                </Card>
            </div>
        );
    }

    // 2. Check if user is logged in
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        // Redirect to register with the token so they come back after creating account
        // Or simple message
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
                <Card className="max-w-md w-full text-center p-6 border-t-4 border-t-[#002e5d]">
                    <UserPlus className="h-12 w-12 text-[#002e5d] mx-auto mb-4" />
                    <CardHeader>
                        <CardTitle className="text-2xl uppercase tracking-tighter">Únete a {(invitation.organizations as any)?.name}</CardTitle>
                        <CardDescription>
                            Has sido invitado con el rol de <strong>{invitation.role}</strong>.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Para aceptar esta invitación, primero debes iniciar sesión o crear una cuenta.
                        </p>
                        <div className="flex flex-col gap-2">
                            <Button asChild className="bg-[#002e5d]">
                                <Link href={`/register?next=/join/${params.token}`}>Crear Cuenta</Link>
                            </Button>
                            <Button asChild variant="outline">
                                <Link href={`/login?next=/join/${params.token}`}>Ya tengo cuenta</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // 3. Process Join (Server Action simulation)
    // In a real app, this would be a Form with a Server Action. 
    // For simplicity here, we'll provide a button that triggers the join.

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
            <Card className="max-w-md w-full text-center p-6 border-t-4 border-t-green-500 shadow-xl">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <CardHeader>
                    <CardTitle className="text-2xl">Confirmar Invitación</CardTitle>
                    <CardDescription>
                        Estás a punto de unirte a <strong>{(invitation.organizations as any)?.name}</strong> como <strong>{invitation.role}</strong>.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-left border rounded-lg p-4 bg-green-50/50">
                    <div className="text-sm">
                        <p className="font-bold text-green-800">Tu cuenta actual:</p>
                        <p className="text-green-700">{user.email}</p>
                    </div>
                </CardContent>
                <form action={async () => {
                    'use server';
                    const supabase = await createClient();

                    // Add to org_members
                    const { error: memberError } = await supabase
                        .from('org_members')
                        .insert({
                            org_id: invitation.org_id,
                            user_id: user.id,
                            role: invitation.role
                        });

                    if (memberError) {
                        // If already a member, we might just want to update status
                        if (memberError.code !== '23505') { // Unique violation
                            console.error(memberError);
                        }
                    }

                    // Update invitation status
                    await supabase
                        .from('org_invitations')
                        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
                        .eq('id', invitation.id);

                    redirect('/dashboard');
                }}>
                    <Button type="submit" className="w-full mt-6 bg-[#002e5d] text-white hover:bg-[#001f3f]">
                        Aceptar y Continuar
                    </Button>
                </form>
            </Card>
        </div>
    );
}
