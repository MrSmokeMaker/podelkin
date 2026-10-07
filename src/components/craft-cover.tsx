import { categoryColors, type Category } from "@/lib/crafts";

function hashSlug(slug: string): number {
  let h = 2166136261;
  for (let i = 0; i < slug.length; i++) {
    h ^= slug.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function makeRandom(seed: number) {
  let s = seed;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

interface CoverProps {
  slug: string;
  category: Category;
  className?: string;
  rounded?: string;
}

/* Детерминированная обложка: композиция фигур из хеша slug + цвет категории */
export function CraftCover({
  slug,
  category,
  className = "aspect-[4/3] w-full",
  rounded = "rounded-2xl",
}: CoverProps) {
  const base = categoryColors[category];
  const rand = makeRandom(hashSlug(slug));

  const shapes = Array.from({ length: 7 }, () => {
    const kind = rand();
    const x = 40 + rand() * 320;
    const y = 30 + rand() * 200;
    const r = 14 + rand() * 46;
    const opacity = 0.16 + rand() * 0.3;
    const rotate = Math.round(rand() * 90 - 45);
    const tone = rand() < 0.55 ? base : "#FFFFFF";
    if (kind < 0.4) {
      return (
        <circle
          key={x + "-" + y}
          cx={x}
          cy={y}
          r={r}
          fill={tone}
          opacity={opacity}
        />
      );
    }
    if (kind < 0.75) {
      const w = r * (1 + rand());
      return (
        <rect
          key={x + "-" + y}
          x={x - w / 2}
          y={y - r / 2}
          width={w}
          height={r}
          rx={r / 4}
          fill={tone}
          opacity={opacity}
          transform={`rotate(${rotate} ${x} ${y})`}
        />
      );
    }
    const size = r * 1.2;
    return (
      <path
        key={x + "-" + y}
        d={`M ${x} ${y - size / 2} L ${x + size / 2} ${y + size / 2} L ${
          x - size / 2
        } ${y + size / 2} Z`}
        fill={tone}
        opacity={opacity}
        transform={`rotate(${rotate} ${x} ${y})`}
      />
    );
  });

  return (
    <svg
      viewBox="0 0 400 260"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={`Обложка: ${category}`}
      className={className}
    >
      <rect width="400" height="260" fill={base} opacity="0.18" />
      <circle
        cx={100 + (hashSlug(slug) % 200)}
        cy={130}
        r={95}
        fill={base}
        opacity="0.22"
      />
      {shapes}
      <rect
        width="400"
        height="260"
        fill="none"
        stroke={base}
        strokeOpacity="0.35"
        strokeWidth="2"
        rx="18"
      />
    </svg>
  );
}
