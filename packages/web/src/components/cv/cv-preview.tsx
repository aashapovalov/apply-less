export function CVPreview({ markdown }: { markdown: string }) {
  return (
    <div className="flex flex-col overflow-hidden">
      <h3 className="text-primary mb-3 font-medium">CV Preview</h3>
      <div className="bg-background flex-1 overflow-y-auto rounded-xl p-4">
        <pre className="font-sans text-sm whitespace-pre-wrap">{markdown}</pre>
      </div>
    </div>
  );
}
