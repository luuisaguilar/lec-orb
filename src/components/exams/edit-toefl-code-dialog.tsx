"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Edit } from "lucide-react";
import { toast } from "sonner";

const editSchema = z.object({
    voucher_code: z.string().optional(),
    status: z.enum(["AVAILABLE", "ASSIGNED", "USED", "EXPIRED"]),
    family_name: z.string().optional(),
    given_name: z.string().optional(),
    name_loc_lang: z.string().optional(),
    res_country: z.string().optional(),
    dob_date: z.string().optional(),
    gender: z.string().optional(),
    native_country: z.string().optional(),
    native_lang: z.string().optional(),
});

type EditFormValues = z.infer<typeof editSchema>;

interface EditToeflCodeDialogProps {
    code: any; // We receive the raw code from the table
    onSuccess?: () => void;
    children?: React.ReactNode;
}

export function EditToeflCodeDialog({ code, onSuccess, children }: EditToeflCodeDialogProps) {
    const [open, setOpen] = useState(false);

    const candidateDetails = code.candidate_details || {};

    const form = useForm<EditFormValues>({
        resolver: zodResolver(editSchema),
        defaultValues: {
            voucher_code: code.voucher_code || "",
            status: code.status,
            family_name: candidateDetails["FAMILY NAME"] || "",
            given_name: candidateDetails["GIVEN NAME"] || "",
            name_loc_lang: candidateDetails["NAME LOC. LANG."] || "",
            res_country: candidateDetails["RES. COUNTRY"] || "",
            dob_date: candidateDetails["DOB DATE (M-D-Y)"] || "",
            gender: candidateDetails["GENDER"] || "",
            native_country: candidateDetails["NATIVE CONTRY"] || "",
            native_lang: candidateDetails["NATIVE LANG."] || "",
        },
    });

    const isSubmitting = form.formState.isSubmitting;

    const onSubmit = async (values: EditFormValues) => {
        try {
            // Reconstruct candidate_details
            const mergedCandidateDetails = {
                ...candidateDetails,
                "FAMILY NAME": values.family_name,
                "GIVEN NAME": values.given_name,
                "NAME LOC. LANG.": values.name_loc_lang,
                "RES. COUNTRY": values.res_country,
                "DOB DATE (M-D-Y)": values.dob_date,
                "GENDER": values.gender,
                "NATIVE CONTRY": values.native_country,
                "NATIVE LANG.": values.native_lang,
            };

            const payload = {
                voucher_code: values.voucher_code || null,
                status: values.status,
                candidate_details: mergedCandidateDetails,
            };

            const res = await fetch(`/api/v1/toefl/codes/${code.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Error al actualizar");
            }

            toast.success("Código actualizado correctamente");
            setOpen(false);
            onSuccess?.();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children || (
                    <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-2" /> Editar
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Editar Código TOEFL</DialogTitle>
                    <DialogDescription>
                        Folio Interno: {code.folio} ({code.system_uniq_id || 'Sin UNIQ-ID'})
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                        <FormField
                            control={form.control}
                            name="voucher_code"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Voucher / PIN</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ej. T001239" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Estatus</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecciona un estatus" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="AVAILABLE">Disponible</SelectItem>
                                            <SelectItem value="ASSIGNED">Asignado</SelectItem>
                                            <SelectItem value="USED">Usado</SelectItem>
                                            <SelectItem value="EXPIRED">Vencido</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="family_name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Family Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Pérez" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="given_name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Given Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Juan" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="name_loc_lang"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Name Loc. Lang.</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Nombre Local" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="res_country"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Res. Country</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Mexico" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="dob_date"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>DOB Date (M-D-Y)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="01-31-1990" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="gender"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Gender</FormLabel>
                                        <FormControl>
                                            <Input placeholder="M / F" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="native_country"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Native Country</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Mexico" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="native_lang"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Native Lang.</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Spanish" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 font-semibold">
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Guardar Cambios
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
