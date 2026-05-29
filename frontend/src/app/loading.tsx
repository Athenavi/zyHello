"use client";

export default function GlobalLoading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        {/* Animated logo spinner */}
        <div className="relative">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/60 animate-pulse" />
          <div className="absolute inset-0 w-12 h-12 rounded-xl border-2 border-primary/30 border-t-primary animate-spin" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-foreground">Loading</span>
          <span className="flex gap-0.5">
            <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
          </span>
        </div>
      </div>
    </div>
  );
}
