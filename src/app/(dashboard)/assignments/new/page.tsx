import { getGroups } from "@/services/groups";
import { AssignmentBuilder } from "@/features/assignments/assignment-builder";

export const metadata = {
  title: "Yangi topshiriq yaratish — Maktabcha CRM",
};

export default async function NewAssignmentPage() {
  const groups = await getGroups();
  const activeGroups = groups.filter((g) => g.status === "Faol");

  return <AssignmentBuilder groups={activeGroups.length > 0 ? activeGroups : groups} />;
}
