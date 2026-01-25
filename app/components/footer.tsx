import Link from "next/link";
import { Github, Twitter } from "lucide-react";

export default function Footer() {
  return (
     <footer className="border-t border-white/5">
      <div className="mx-auto max-w-6xl px-4 py-10 grid gap-6 sm:grid-cols-3">       
         <div>
          © {new Date().getFullYear()} <a
                  href="https://3ef.studio"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  Three Eagles Forge Studio
                </a> - Story Forge
        </div>
                {/* Social */}
        <div className="flex items-center gap-4 sm:justify-end">
          <Link
            href="https://github.com/3ef-studio"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-white"
          >
            <Github className="h-4 w-4" /> GitHub
          </Link>

          <Link
            href="https://twitter.com/3ef_studio"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-white"
          >
            <Twitter className="h-4 w-4" /> X / Twitter
          </Link>
        </div>

        <div className="flex items-center sm:text-left justify-end">
          <a
            href="https://donate.stripe.com/aFa28s9PvepKelJ4Ok8ww01"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-neutral-200 transition-colors"
          >
            ☕ Buy the dev team a Coffee
          </a>
        </div>
      </div>
    </footer>
  );
}
