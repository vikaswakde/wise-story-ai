import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function StoriesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();

  if (!user) {
    redirect("/");
  }

  return <>{children}</>;
}
