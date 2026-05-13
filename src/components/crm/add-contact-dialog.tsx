"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { UserPlus, Building2, User, Loader2 } from "lucide-react";
import { mutate } from "swr";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const contactSchema = z.object({
  type: z.enum(["school", "company", "individual"]),
  name: z.string().min(1, "El nombre es requerido").max(300),
  email: z.string().email("Correo inválido").optional().or(z.literal("")),
  phone: z.string().max(30).optional().or(z.literal("")),
  city: z.string().max(100).optional().or(z.literal("")),
  source: z.enum(["whatsapp", "referral", "web", "fair", "call", "outbound", "existing"]),
  notes: z.string().max(5000).optional(),
});

type ContactFormValues = z.infer<typeof contactSchema>;

export default function AddContactDialog({ children }: { children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      type: "school",
      name: "",
      email: "",
      phone: "",
      city: "",
      source: "existing",
      notes: "",
    },
  });

  const onSubmit = async (data: ContactFormValues) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/v1/crm/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          email: data.email || null,
          phone: data.phone || null,
          city: data.city || null,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al crear el contacto.");
      }

      toast.success("Contacto creado exitosamente.");
      mutate(
        (key) => typeof key === "string" && key.startsWith("/api/v1/crm/contacts"),
        undefined,
        { revalidate: true }
      );
      setOpen(false);
      form.reset();
    } catch (e: any) {
      toast.error(e.message || "Error inesperado.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20">
            <UserPlus className="h-4 w-4 mr-2" />
            Nuevo Contacto
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] border-indigo-500/20 shadow-xl shadow-indigo-500/10">
        <DialogHeader>
          <DialogTitle className="text-xl font-outfit text-indigo-400">Crear Nuevo Contacto</DialogTitle>
          <DialogDescription>
            Agrega un nuevo cliente, escuela o prospecto al directorio.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Contacto</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="border-indigo-500/20 focus:ring-indigo-500/30">
                          <SelectValue placeholder="Selecciona un tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="school">
                          <div className="flex items-center"><Building2 className="w-4 h-4 mr-2 text-blue-500" /> Escuela</div>
                        </SelectItem>
                        <SelectItem value="company">
                          <div className="flex items-center"><Building2 className="w-4 h-4 mr-2 text-purple-500" /> Empresa</div>
                        </SelectItem>
                        <SelectItem value="individual">
                          <div className="flex items-center"><User className="w-4 h-4 mr-2 text-emerald-500" /> Individuo</div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Origen (Lead Source)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="border-indigo-500/20 focus:ring-indigo-500/30">
                          <SelectValue placeholder="Selecciona el origen" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="existing">Base de Datos / Existente</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="web">Sitio Web</SelectItem>
                        <SelectItem value="referral">Referido</SelectItem>
                        <SelectItem value="fair">Feria Escolar</SelectItem>
                        <SelectItem value="call">Llamada Entrante</SelectItem>
                        <SelectItem value="outbound">Outbound (En frío)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre Completo / Razón Social <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="Ej. Colegio Bilingüe San Juan" {...field} className="border-indigo-500/20 focus-visible:ring-indigo-500/30" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo Electrónico</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="contacto@ejemplo.com" {...field} className="border-indigo-500/20 focus-visible:ring-indigo-500/30" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono / WhatsApp</FormLabel>
                    <FormControl>
                      <Input placeholder="55 1234 5678" {...field} className="border-indigo-500/20 focus-visible:ring-indigo-500/30" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ciudad</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej. Ciudad de México" {...field} className="border-indigo-500/20 focus-visible:ring-indigo-500/30" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas Adicionales</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Agrega contexto, detalles de contacto, etc." 
                      className="resize-none min-h-[80px] border-indigo-500/20 focus-visible:ring-indigo-500/30" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4 border-t border-indigo-500/10">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
                Guardar Contacto
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
