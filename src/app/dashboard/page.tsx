// Dashboard — Patient Records
// Server component: fetches all consultations on load
import { requireAuth } from "@/lib/session";
import { getAllConsultations } from "@/lib/qdrant-client";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Protected route — redirects to /login if not authenticated
  const session = await requireAuth();

  const { records } = await getAllConsultations(100);

  return <DashboardClient records={records} doctorEmail={session.email} />;
}
