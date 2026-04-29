"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { 
  Target, 
  Eye, 
  ShieldCheck, 
  Heart,
  Star,
  Award,
  Users
} from "lucide-react";

export default function HROnboarding() {
  const values = [
    { title: "Excelencia", desc: "Buscamos la máxima calidad en cada programa educativo.", icon: Star, color: "text-yellow-400" },
    { title: "Integridad", desc: "Actuamos con honestidad y transparencia en todo momento.", icon: ShieldCheck, color: "text-blue-400" },
    { title: "Compromiso", desc: "Dedicación total al éxito de nuestros estudiantes.", icon: Heart, color: "text-red-400" },
    { title: "Innovación", desc: "Adoptamos nuevas tecnologías para mejorar el aprendizaje.", icon: Award, color: "text-purple-400" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="md:col-span-2 lg:col-span-1 bg-slate-900/40 border-slate-800 backdrop-blur-sm shadow-xl">
        <CardHeader className="flex flex-row items-center gap-4 pb-2">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
            <Target className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-xl font-outfit text-white">Misión</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-300 leading-relaxed">
            &quot;Proveer soluciones lingüísticas y educativas de excelencia, integrando tecnología de vanguardia y metodologías internacionales para empoderar a nuestros estudiantes y clientes en un entorno global competitivo.&quot;
          </p>
        </CardContent>
      </Card>

      <Card className="md:col-span-2 lg:col-span-1 bg-slate-900/40 border-slate-800 backdrop-blur-sm shadow-xl">
        <CardHeader className="flex flex-row items-center gap-4 pb-2">
          <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <Eye className="w-6 h-6 text-blue-400" />
          </div>
          <CardTitle className="text-xl font-outfit text-white">Visión</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-300 leading-relaxed">
            &quot;Ser la consultoría educativa líder en México, reconocida por nuestra innovación tecnológica y por ser el referente nacional en certificaciones internacionales de idiomas bajo el estándar de calidad ISO 9001/21001.&quot;
          </p>
        </CardContent>
      </Card>

      <Card className="md:col-span-2 lg:col-span-1 bg-slate-900/40 border-slate-800 backdrop-blur-sm shadow-xl">
        <CardHeader className="flex flex-row items-center gap-4 pb-2">
          <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
            <Users className="w-6 h-6 text-green-400" />
          </div>
          <CardTitle className="text-xl font-outfit text-white">Política de Calidad</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-300 leading-relaxed text-sm">
            En LEC estamos comprometidos con la satisfacción de nuestras partes interesadas a través de la mejora continua de nuestros procesos, cumpliendo con los requisitos legales y reglamentarios aplicables al servicio educativo.
          </p>
        </CardContent>
      </Card>

      <div className="md:col-span-2 lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
        {values.map((v, i) => (
          <div 
            key={i} 
            className="p-4 rounded-xl bg-slate-900/30 border border-slate-800/50 hover:border-primary/30 transition-all group"
          >
            <v.icon className={cn("w-8 h-8 mb-3 transition-transform group-hover:scale-110", v.color)} />
            <h3 className="font-bold text-white mb-1">{v.title}</h3>
            <p className="text-xs text-slate-400">{v.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
