import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { getBoards } from "@/actions/board";
import { BoardsClient } from "@/components/BoardsClient";

export default async function BoardsPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const result = await getBoards();
  const boards = result.success ? result.data : [];

  return <BoardsClient initialBoards={boards} />;
}
