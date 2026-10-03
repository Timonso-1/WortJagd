import { RoomClient } from "@/components/room/RoomClient";

export default async function RoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ watch?: string }>;
}) {
  const { code } = await params;
  const { watch } = await searchParams;
  return <RoomClient code={code.toUpperCase()} watch={watch === "1"} />;
}
