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
    { 
      title: "Excelencia", 
      desc: "Buscamos la máxima calidad en cada programa educativo.", 
      icon: Star, 
      color: "text-amber-500 dark:text-amber-400 group-hover:text-amber-600 dark:group-hover:text-amber-300",
      bg: "bg-amber-500/10 border-amber-500/20 group-hover:bg-amber-500/20"
    },
    { 
      title: "Integridad", 
      desc: "Actuamos con honestidad y transparencia en todo momento.", 
      icon: ShieldCheck, 
      color: "text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300",
      bg: "bg-blue-500/10 border-blue-500/20 group-hover:bg-blue-500/20"
    },
    { 
      title: "Compromiso", 
      desc: "Dedicación total al éxito de nuestros estudiantes.", 
      icon: Heart, 
      color: "text-rose-600 dark:text-rose-400 group-hover:text-rose-700 dark:group-hover:text-rose-300",
      bg: "bg-rose-500/10 border-rose-500/20 group-hover:bg-rose-500/20"
    },
    { 
      title: "Innovación", 
      desc: "Adoptamos nuevas tecnologías para mejorar el aprendizaje.", 
      icon: Award, 
      color: "text-violet-600 dark:text-violet-400 group-hover:text-violet-700 dark:group-hover:text-violet-300",
      bg: "bg-violet-500/10 border-violet-500/20 group-hover:bg-violet-500/20"
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Política de Calidad - Full Width Protagonist */}
      <Card className="md:col-span-2 relative overflow-hidden group bg-gradient-to-br from-indigo-600 to-indigo-900 border-indigo-800 shadow-2xl transition-all hover:shadow-indigo-500/20 hover:-translate-y-1 duration-300">
        <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-20 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
        <CardHeader className="relative flex flex-row items-center gap-4 pb-2 z-10">
          <div className="p-3 rounded-xl bg-white/10 border border-white/20 shadow-inner backdrop-blur-sm transition-transform group-hover:scale-110 duration-300">
            <Users className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl md:text-3xl font-outfit font-bold text-white tracking-tight">Política de Calidad</CardTitle>
        </CardHeader>
        <CardContent className="relative z-10">
          <p className="text-indigo-100/90 leading-relaxed text-lg md:text-xl font-medium max-w-4xl">
            En LEC estamos comprometidos con la satisfacción de nuestras partes interesadas a través de la mejora continua de nuestros procesos, cumpliendo con los requisitos legales y reglamentarios aplicables al servicio educativo.
          </p>
        </CardContent>
      </Card>

      {/* Misión */}
      <Card className="group bg-white/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 backdrop-blur-md shadow-xl transition-all hover:shadow-2xl hover:border-indigo-500/30 hover:-translate-y-1 duration-300">
        <CardHeader className="flex flex-row items-center gap-4 pb-2">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 shadow-inner transition-transform group-hover:scale-110 duration-300 group-hover:bg-indigo-500/20">
            <Target className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <CardTitle className="text-xl font-outfit font-bold text-slate-900 dark:text-white">Misión</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
            &quot;Proveer soluciones lingüísticas y educativas de excelencia, integrando tecnología de vanguardia y metodologías internacionales para empoderar a nuestros estudiantes y clientes en un entorno global competitivo.&quot;
          </p>
        </CardContent>
      </Card>

      {/* Visión */}
      <Card className="group bg-white/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 backdrop-blur-md shadow-xl transition-all hover:shadow-2xl hover:border-blue-500/30 hover:-translate-y-1 duration-300">
        <CardHeader className="flex flex-row items-center gap-4 pb-2">
          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 shadow-inner transition-transform group-hover:scale-110 duration-300 group-hover:bg-blue-500/20">
            <Eye className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-xl font-outfit font-bold text-slate-900 dark:text-white">Visión</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
            &quot;Ser la consultoría educativa líder en México, reconocida por nuestra innovación tecnológica y por ser el referente nacional en certificaciones internacionales de idiomas bajo el estándar de calidad ISO 9001/21001.&quot;
          </p>
        </CardContent>
      </Card>

      {/* Valores */}
      <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
        {values.map((v, i) => (
          <div 
            key={i} 
            className="p-5 rounded-2xl bg-white/50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800/50 hover:border-indigo-500/30 hover:bg-white/80 dark:hover:bg-slate-900/50 transition-all group shadow-sm hover:shadow-xl hover:-translate-y-1 duration-300 cursor-default"
          >
            <div className={cn("p-2 rounded-lg w-fit mb-4 transition-all duration-300 group-hover:scale-110 shadow-sm", v.bg)}>
              <v.icon className={cn("w-6 h-6 transition-colors duration-300", v.color)} />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white mb-2 font-outfit transition-colors group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{v.title}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{v.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
