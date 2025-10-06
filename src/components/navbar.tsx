
import { createMemo } from "solid-js";
import { useLocation } from "@solidjs/router";
import { Link } from "@/ui"

export function Navbar() {
  const location = useLocation();
  const isActive = (path: string) => path === location.pathname
  const navLinkVariant = createMemo(() => (path: string) => isActive(path) ? "primary" : "ghost")

  return (
      <nav class="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-900/70 backdrop-blur supports-[backdrop-filter]:bg-slate-900/60">
        <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <ul class="flex items-center gap-2">
            <li>
              <Link href="/" variant={navLinkVariant()("/")}>
                Projects
              </Link>
            </li>
          </ul>
        </div>
      </nav>
  )
}