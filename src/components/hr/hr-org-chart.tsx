"use client";

import { useState, useMemo } from "react";
import { HR_PROFILES, JobProfile } from "@/lib/data/hr";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ChevronRight, ChevronDown, User, Users, Briefcase } from "lucide-react";

interface TreeNodeProps {
  profile: JobProfile;
  allProfiles: JobProfile[];
  level: number;
}

function TreeNode({ profile, allProfiles, level }: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const children = useMemo(() => {
    return allProfiles.filter(p => p.reportsTo.includes(profile.id));
  }, [profile.id, allProfiles]);

  const hasChildren = children.length > 0;

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex flex-col items-center">
        {/* Connection Line Above (except for root) */}
        {level > 0 && (
          <div className="w-px h-8 bg-slate-700"></div>
        )}
        
        <Card 
          className={cn(
            "relative z-10 p-4 min-w-[200px] bg-slate-900/60 backdrop-blur-md border-slate-700 shadow-2xl hover:border-primary/50 transition-all cursor-pointer group",
            level === 0 ? "border-primary/60 ring-2 ring-primary/20" : ""
          )}
          onClick={() => hasChildren && setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-full",
              level === 0 ? "bg-primary/20 text-primary" : "bg-slate-800 text-slate-400"
            )}>
              {hasChildren ? <Users className="w-4 h-4" /> : <User className="w-4 h-4" />}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-primary uppercase tracking-wider">
                {level === 0 ? "Dirección" : "Puesto"}
              </span>
              <span className="text-sm font-medium text-white group-hover:text-primary transition-colors">
                {profile.title}
              </span>
            </div>
            {hasChildren && (
              <div className="ml-auto text-slate-500">
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </div>
            )}
          </div>
        </Card>

        {/* Connection Line Below */}
        {hasChildren && isExpanded && (
          <div className="w-px h-8 bg-slate-700"></div>
        )}
      </div>

      {hasChildren && isExpanded && (
        <div className="relative flex gap-8 px-4">
          {/* Horizontal Connection Line */}
          {children.length > 1 && (
            <div className="absolute top-0 left-0 right-0 h-px bg-slate-700 transform translate-x-[50%] w-[calc(100%-200px)] mx-auto"></div>
          )}
          
          <div className="flex gap-8">
            {children.map((child) => (
              <TreeNode 
                key={child.id} 
                profile={child} 
                allProfiles={allProfiles} 
                level={level + 1} 
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function HROrgChart() {
  const rootProfiles = useMemo(() => {
    return HR_PROFILES.filter(p => p.reportsTo.length === 0);
  }, []);

  return (
    <div className="w-full overflow-x-auto p-8 bg-slate-950/20 rounded-3xl border border-slate-800/50 backdrop-blur-sm min-h-[600px] flex justify-center">
      <div className="inline-flex flex-col items-center">
        {rootProfiles.map(root => (
          <TreeNode 
            key={root.id} 
            profile={root} 
            allProfiles={HR_PROFILES} 
            level={0} 
          />
        ))}
        
        {HR_PROFILES.length === 0 && (
          <div className="flex flex-col items-center justify-center text-slate-500 mt-20">
            <Briefcase className="w-16 h-16 mb-4 opacity-20" />
            <p>No se encontraron perfiles para generar el organigrama.</p>
          </div>
        )}
      </div>
    </div>
  );
}
