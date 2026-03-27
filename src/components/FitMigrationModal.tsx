import { Session } from "@supabase/supabase-js";
import { AlertTriangle, DatabaseZap } from "lucide-react";
import { FitSyncCard } from "./FitSyncCard";

interface FitMigrationModalProps {
  session: Session;
  onSyncComplete: () => Promise<void>;
}

export function FitMigrationModal({ session, onSyncComplete }: FitMigrationModalProps) {
  return (
    <div className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-[#111113] border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-zinc-800 bg-[#161618]">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
              <DatabaseZap className="w-6 h-6" />
            </div>
            <div className="space-y-3">
              <h2 className="text-2xl font-black text-white tracking-tight">Migración obligatoria a FIT</h2>
              <p className="text-zinc-300 leading-relaxed">
                La plataforma dejó atrás el flujo CSV y ahora procesa tus actividades desde el archivo
                original <span className="text-garmin-blue font-bold">.fit</span>. Esta migración mejora
                precisión, vueltas, pasos estructurados y la calidad de tus análisis.
              </p>
              <div className="flex items-start gap-2 text-sm text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  El histórico CSV anterior fue retirado. Para desbloquear el dashboard, el coach y el planner
                  necesitas resincronizar al menos una actividad FIT.
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <FitSyncCard
            session={session}
            onSuccess={onSyncComplete}
            title="Resincroniza tu historial"
            description="Sube tu primer archivo FIT para reactivar tus métricas y el análisis fisiológico."
            buttonLabel="Activar Cuenta con FIT"
          />
        </div>
      </div>
    </div>
  );
}
