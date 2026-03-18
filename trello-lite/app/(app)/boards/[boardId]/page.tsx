import { redirect, notFound } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { getBoardWithLists } from "@/actions/board-data";
import { BoardClient } from "@/components/BoardClient";

interface Props {
  params: Promise<{ boardId: string }>;
}

export default async function BoardPage({ params }: Props) {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const { boardId } = await params;
  const result = await getBoardWithLists(boardId);

  if (!result.success) {
    if (result.error === "Board not found") notFound();
    redirect("/boards");
  }

  return <BoardClient boardId={boardId} initialBoard={result.data} />;
}
