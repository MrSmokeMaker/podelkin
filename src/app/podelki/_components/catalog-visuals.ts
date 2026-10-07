import {
  Cat,
  Flower2,
  Mail,
  Plane,
  TreePine,
  Wind,
  type LucideIcon,
} from "lucide-react";

/* Иконки категорий и цвета бейджей сложности — общие для списка и страницы поделки. */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "бумажная модель": Plane,
  "деревянная заготовка": TreePine,
  "3D-открытка": Mail,
  игрушка: Cat,
  макет: Wind,
  декор: Flower2,
};

export function categoryIcon(category: string): LucideIcon {
  return CATEGORY_ICONS[category] ?? Flower2;
}

export const DIFFICULTY_STYLES: Record<string, string> = {
  легко: "bg-sage-soft",
  средне: "bg-sand-soft",
  сложно: "bg-clay-soft",
};
