import { notFound } from "next/navigation";
import { tools, getTool } from "@/lib/tools";
import ToolLoader from "@/components/ToolLoader";

export function generateStaticParams() {
  return tools.map((tool) => ({ slug: tool.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tool = getTool(slug);
  return { title: tool ? `${tool.name} · Quick Tools` : "Quick Tools" };
}

export default async function ToolPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!getTool(slug)) notFound();

  return <ToolLoader slug={slug} />;
}
