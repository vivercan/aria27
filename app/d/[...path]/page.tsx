import { redirect } from "next/navigation";

export default async function RedirectPage({ params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const fullPath = path.join("/");
  redirect(`/autorizar/${fullPath}`);
}