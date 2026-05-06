import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Users, Boxes, Shield } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: AdminHome,
});

function AdminHome() {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [u, m, a] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("modulos").select("id", { count: "exact", head: true }),
        supabase.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "admin"),
      ]);
      return { users: u.count ?? 0, modules: m.count ?? 0, admins: a.count ?? 0 };
    },
  });

  const cards = [
    { label: "Usuários", value: stats?.users ?? "—", icon: Users },
    { label: "Administradores", value: stats?.admins ?? "—", icon: Shield },
    { label: "Módulos", value: stats?.modules ?? "—", icon: Boxes },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {cards.map((c) => (
        <Card key={c.label} className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">{c.label}</div>
              <div className="text-3xl font-semibold mt-1">{c.value}</div>
            </div>
            <c.icon className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>
      ))}
    </div>
  );
}
