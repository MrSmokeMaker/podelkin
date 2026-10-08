import Link from "next/link";
import { Clock, Wallet } from "lucide-react";
import { CraftPhoto } from "@/components/craft-photo";
import {
  craftCost,
  craftMinutes,
  difficultyTone,
  formatMinutes,
  formatRub,
  type Craft,
} from "@/lib/crafts";

export function CraftCard({ craft, index }: { craft: Craft; index?: number }) {
  return (
    <Link
      href={`/craft/${craft.slug}`}
      style={index !== undefined ? { animationDelay: `${Math.min(index, 8) * 45}ms` } : undefined}
      className="animate-card-in group flex flex-col overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-ink/5 transition-all duration-200 hover:-translate-y-1 hover:shadow-soft focus-visible:outline-2 focus-visible:outline-clay active:translate-y-0"
    >
      <div className="relative">
        <CraftPhoto craft={craft} />
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-ink">
          {craft.category}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-bold leading-snug group-hover:text-[#8A4A2C]">
            {craft.title}
          </h3>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${difficultyTone[craft.difficulty]}`}
          >
            {craft.difficulty}
          </span>
        </div>
        <p className="line-clamp-2 text-sm text-ink-soft">{craft.description}</p>
        <div className="mt-auto flex items-center gap-4 pt-2 text-xs font-medium text-ink-soft">
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-clay" />
            {formatMinutes(craftMinutes(craft))}
          </span>
          <span className="flex items-center gap-1.5">
            <Wallet className="h-4 w-4 text-clay" />
            {formatRub(craftCost(craft))}
          </span>
          <span className="ml-auto text-clay opacity-0 transition-opacity group-hover:opacity-100">
            {craft.steps.length} шагов →
          </span>
        </div>
      </div>
    </Link>
  );
}
