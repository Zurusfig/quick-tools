export default function ToolSkeleton() {
  return (
    <div className="animate-fade-in-fast mx-auto max-w-3xl px-4 py-8">
      <div className="h-6 w-48 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
      <div className="mt-2 h-4 w-72 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
      <div className="mt-6 flex flex-col gap-4">
        <div className="h-24 animate-pulse rounded-md bg-neutral-200 dark:bg-neutral-800" />
        <div className="h-9 w-32 animate-pulse rounded-md bg-neutral-200 dark:bg-neutral-800" />
      </div>
    </div>
  );
}
