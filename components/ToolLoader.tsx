"use client";

import dynamic from "next/dynamic";
import { tools } from "@/lib/tools";
import { notFound } from "next/navigation";
import ToolSkeleton from "@/components/ToolSkeleton";

const components = Object.fromEntries(
  tools.map((tool) => [tool.slug, dynamic(tool.load, { ssr: false, loading: ToolSkeleton })])
);

export default function ToolLoader({ slug }: { slug: string }) {
  const ToolComponent = components[slug];
  if (!ToolComponent) notFound();
  return <ToolComponent />;
}
