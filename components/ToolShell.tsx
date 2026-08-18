export default function ToolShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="animate-fade-in mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
        {description}
      </p>
      <div className="mt-6 flex flex-col gap-4">{children}</div>
    </div>
  );
}
