import { Link } from "react-router-dom";
import { Button } from "./ui/button";

export function NotFoundPage({ what = "page" }: { what?: string }) {
  return (
    <div className="p-4 md:p-8 flex flex-col items-center justify-center gap-4 text-center min-h-[60vh]">
      <h1 className="text-3xl font-bold text-slate-900">404</h1>
      <p className="text-slate-600">That {what} doesn't exist, or you don't have access to it.</p>
      <Button asChild>
        <Link to="/">Back to dashboard</Link>
      </Button>
    </div>
  );
}
