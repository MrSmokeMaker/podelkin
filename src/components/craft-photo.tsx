import Image from "next/image";
import { CraftCover } from "@/components/craft-cover";
import type { Craft } from "@/lib/crafts";

interface CraftPhotoProps {
  craft: Craft;
  className?: string;
  rounded?: string;
}

/* Фото итоговой поделки; при отсутствии или сбое загрузки остаётся SVG-обложка */
export function CraftPhoto({
  craft,
  className = "aspect-[4/3] w-full",
  rounded = "rounded-2xl",
}: CraftPhotoProps) {
  return (
    <div className={`relative overflow-hidden ${rounded} ${className}`}>
      <CraftCover
        slug={craft.slug}
        category={craft.category}
        className="absolute inset-0 h-full w-full"
        rounded=""
      />
      {craft.image && (
        <Image
          src={craft.image}
          alt={`Итог мастер-класса: ${craft.title}`}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
          className="object-cover"
        />
      )}
    </div>
  );
}
