import { createFileRoute } from "@tanstack/react-router";
import { NotificacoesPanel } from "@/components/NotificacoesPanel";

export const Route = createFileRoute("/notificacoes")({
  component: NotificacoesPage,
  head: () => ({ meta: [{ title: "Notificações" }] }),
});

function NotificacoesPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <NotificacoesPanel />
    </div>
  );
}
