"use client";

import useSWR from "swr";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Phone, Mail, Calendar, CheckSquare, FileText, Clock } from "lucide-react";
import AddActivityDialog from "./add-activity-dialog";

type CrmActivity = {
  id: string;
  type: string;
  subject: string;
  description: string | null;
  due_date: string | null;
  status: string;
  created_at: string;
  crm_contacts?: { name: string, type: string } | null;
  crm_opportunities?: { title: string } | null;
};

const ACTIVITY_ICONS: Record<string, any> = {
  call: { icon: Phone, color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
  email: { icon: Mail, color: "text-orange-500 bg-orange-500/10 border-orange-500/20" },
  meeting: { icon: Calendar, color: "text-purple-500 bg-purple-500/10 border-purple-500/20" },
  task: { icon: CheckSquare, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
  whatsapp: { icon: MessageCircle, color: "text-green-500 bg-green-500/10 border-green-500/20" },
  note: { icon: FileText, color: "text-gray-500 bg-gray-500/10 border-gray-500/20" },
};

export default function CrmActivities() {
  const { data, error, isLoading } = useSWR<{ activities: CrmActivity[] }>("/api/v1/crm/activities");
  const activities = data?.activities || [];

  return (
    <Card className="border-indigo-500/20 shadow-lg shadow-indigo-500/5 bg-background/60 backdrop-blur-sm border-0">
      <CardHeader className="pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-2xl font-outfit text-indigo-400">Actividades</CardTitle>
            <CardDescription>
              Seguimiento de llamadas, correos, reuniones y tareas.
            </CardDescription>
          </div>
          <AddActivityDialog />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl bg-muted/40" />)}
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500 bg-red-500/5 rounded-xl border border-red-500/10">
            Error al cargar las actividades.
          </div>
        ) : activities.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground bg-muted/5 rounded-xl border border-dashed border-indigo-500/20 flex flex-col items-center gap-3">
            <Clock className="h-10 w-10 text-indigo-500/40" />
            <p>No hay actividades registradas.</p>
          </div>
        ) : (
          <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-indigo-500/20 before:to-transparent">
            {activities.map((activity) => {
              const conf = ACTIVITY_ICONS[activity.type] || ACTIVITY_ICONS.note;
              const Icon = conf.icon;
              return (
                <div key={activity.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border bg-background shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
                    <div className={`p-2 rounded-full ${conf.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-indigo-500/10 bg-card/50 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-foreground">{activity.subject}</span>
                      <Badge variant="outline" className={`text-[10px] ${conf.color} border`}>
                        {activity.type}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mb-2">
                      {activity.crm_contacts?.name} {activity.crm_opportunities ? ` • ${activity.crm_opportunities.title}` : ""}
                    </div>
                    {activity.description && (
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{activity.description}</p>
                    )}
                    <div className="flex items-center text-[10px] text-muted-foreground mt-2 pt-2 border-t border-indigo-500/10">
                      <Clock className="w-3 h-3 mr-1" />
                      {activity.due_date ? format(new Date(activity.due_date), "PP p", { locale: es }) : format(new Date(activity.created_at), "PP p", { locale: es })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
