"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ImagePlus, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/toast";
import { DIFFICULTY_STYLES } from "../../_components/catalog-visuals";

const CATEGORIES = [
  "бумажная модель",
  "деревянная заготовка",
  "3D-открытка",
  "игрушка",
  "макет",
  "декор",
] as const;
const DIFFICULTIES = ["легко", "средне", "сложно"] as const;
const ALLOWED_DOMAINS = ["only-paper.ru", "1001zagotovka.ru"];
const MAX_THUMB_BYTES = 5 * 1024 * 1024;

const THUMB_EXT: Record<string, string> = {
  "image/jpeg": "JPG",
  "image/png": "PNG",
  "image/webp": "WebP",
};

/* Дублирует sourceNameFromUrl на сервере: подпись под полем, что подставится автоматически. */
function sourceNameHint(url: string): string | null {
  const lower = url.toLowerCase();
  if (lower.includes("only-paper.ru")) return "Only Paper";
  if (lower.includes("1001zagotovka.ru")) return "1001 Заготовка";
  return null;
}

const inputClass =
  "w-full rounded-xl border border-ink/10 bg-paper px-3 py-2 text-sm outline-none placeholder:text-ink-soft focus:border-clay";

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-xs font-semibold uppercase tracking-wide text-ink-soft"
    >
      {children}
    </label>
  );
}

export function NewPodelkaClient() {
  const router = useRouter();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("");
  const [difficulty, setDifficulty] = useState<string>("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [description, setDescription] = useState("");
  const [materials, setMaterials] = useState("");
  const [instructions, setInstructions] = useState("");
  const [assemblyTime, setAssemblyTime] = useState("");
  const [templateUrl, setTemplateUrl] = useState("");
  const [tags, setTags] = useState("");
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const applyThumbFile = (file: File) => {
    if (!THUMB_EXT[file.type]) {
      setError("Превью: поддерживаются только JPG, PNG и WebP");
      return;
    }
    if (file.size > MAX_THUMB_BYTES) {
      setError("Превью не должно превышать 5 МБ");
      return;
    }
    setError(null);
    setThumbFile(file);
    setThumbPreview((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return URL.createObjectURL(file);
    });
  };

  const clearThumb = () => {
    setThumbFile(null);
    setThumbPreview((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return null;
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim() || !category || !difficulty) {
      setError("Заполните название, категорию и сложность");
      return;
    }
    const lowerSource = sourceUrl.trim().toLowerCase();
    if (
      !/^https?:\/\//i.test(sourceUrl.trim()) ||
      !ALLOWED_DOMAINS.some((domain) => lowerSource.includes(domain))
    ) {
      setError("Ссылка на источник должна начинаться с http(s):// и вести на only-paper.ru или 1001zagotovka.ru");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("title", title);
      form.set("category", category);
      form.set("difficulty", difficulty);
      form.set("sourceUrl", sourceUrl.trim());
      form.set("description", description);
      form.set("materials", materials);
      form.set("instructions", instructions);
      form.set("assemblyTime", assemblyTime);
      form.set("templateUrl", templateUrl.trim());
      form.set("tags", tags);
      if (thumbFile) form.set("thumbnail", thumbFile);

      const response = await fetch("/api/catalog", { method: "POST", body: form });
      const payload = (await response.json().catch(() => null)) as
        | { item?: { id: string }; error?: string }
        | null;

      if (!response.ok || !payload?.item) {
        setError(payload?.error ?? "Не удалось сохранить поделку");
        setSubmitting(false);
        return;
      }
      toast("Поделка добавлена", title);
      router.push(`/podelki/${payload.item.id}`);
    } catch {
      setError("Сеть недоступна — проверьте соединение и попробуйте ещё раз");
      setSubmitting(false);
    }
  };

  const hint = sourceNameHint(sourceUrl);

  return (
    <div className="space-y-5">
      <Link
        href="/podelki"
        className="inline-flex items-center gap-1.5 text-sm text-ink-soft transition-colors hover:text-ink"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        Каталог поделок
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Добавить поделку
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Вставьте ссылку на модель с Only Paper или 1001 Заготовки — источник подставится сам
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-2xl bg-clay-soft px-4 py-3 text-sm font-medium text-ink ring-1 ring-clay/30"
        >
          {error}
        </p>
      )}

      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-5">
            <div className="space-y-1.5">
              <FieldLabel htmlFor="p-title">Название *</FieldLabel>
              <input
                id="p-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Истребитель Spitfire, масштаб 1:33"
                className={inputClass}
              />
            </div>

            <div className="space-y-1.5">
              <FieldLabel htmlFor="p-category">Категория *</FieldLabel>
              <select
                id="p-category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className={inputClass}
              >
                <option value="">Выберите категорию</option>
                {CATEGORIES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <FieldLabel>Сложность *</FieldLabel>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Сложность">
                {DIFFICULTIES.map((option) => (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={difficulty === option}
                    onClick={() => setDifficulty(option)}
                    className={cn(
                      "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                      difficulty === option
                        ? cn(DIFFICULTY_STYLES[option], "ring-2 ring-clay")
                        : "bg-paper-deep text-ink hover:bg-clay-soft"
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <FieldLabel htmlFor="p-source">Ссылка на источник *</FieldLabel>
              <input
                id="p-source"
                type="url"
                value={sourceUrl}
                onChange={(event) => setSourceUrl(event.target.value)}
                placeholder="https://only-paper.ru/models/…"
                className={inputClass}
              />
              {hint ? (
                <p className="text-xs text-ink-soft">
                  Источник: <span className="font-semibold text-ink">{hint}</span> — подставится автоматически
                </p>
              ) : (
                <p className="text-xs text-ink-soft">
                  Поддерживаются only-paper.ru и 1001zagotovka.ru
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <FieldLabel htmlFor="p-description">Описание</FieldLabel>
              <textarea
                id="p-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                placeholder="2–3 предложения: что за модель, из чего собирается, в чём особенность"
                className={cn(inputClass, "resize-y")}
              />
            </div>
          </div>

          <div className="space-y-5">
            <div className="space-y-1.5">
              <FieldLabel>Превью</FieldLabel>
              {thumbPreview ? (
                <div className="relative overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-ink/5">
                  <img
                    src={thumbPreview}
                    alt="Предпросмотр превью"
                    className="aspect-[4/3] w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={clearThumb}
                    aria-label="Убрать превью"
                    className="absolute right-2 top-2 rounded-full bg-ink/80 p-1.5 text-paper transition-colors hover:bg-ink"
                  >
                    <X aria-hidden className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setDragActive(false);
                    const file = event.dataTransfer.files?.[0];
                    if (file) applyThumbFile(file);
                  }}
                  className={cn(
                    "flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed text-ink-soft transition-colors",
                    dragActive
                      ? "border-clay bg-clay-soft text-ink"
                      : "border-ink/20 bg-white hover:border-clay hover:text-ink"
                  )}
                >
                  <ImagePlus aria-hidden className="h-8 w-8" />
                  <span className="text-sm font-medium">Перетащите фото или нажмите</span>
                  <span className="text-xs">JPG, PNG или WebP, до 5 МБ</span>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) applyThumbFile(file);
                }}
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <FieldLabel htmlFor="p-time">Время сборки</FieldLabel>
                <input
                  id="p-time"
                  value={assemblyTime}
                  onChange={(event) => setAssemblyTime(event.target.value)}
                  placeholder="2 часа"
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <FieldLabel htmlFor="p-template">Ссылка на шаблон (PDF)</FieldLabel>
                <input
                  id="p-template"
                  type="url"
                  value={templateUrl}
                  onChange={(event) => setTemplateUrl(event.target.value)}
                  placeholder="https://…/deploy.pdf"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <FieldLabel htmlFor="p-materials">Материалы</FieldLabel>
              <input
                id="p-materials"
                value={materials}
                onChange={(event) => setMaterials(event.target.value)}
                placeholder="через запятую: бумага 200 г/м², клей ПВА, нож"
                className={inputClass}
              />
            </div>

            <div className="space-y-1.5">
              <FieldLabel htmlFor="p-instructions">Инструкция (шаги)</FieldLabel>
              <textarea
                id="p-instructions"
                value={instructions}
                onChange={(event) => setInstructions(event.target.value)}
                rows={4}
                placeholder={"По одному шагу на строку:\nВырежьте детали по контуру\nСклейте основу и дайте высохнуть"}
                className={cn(inputClass, "resize-y")}
              />
              <p className="text-xs text-ink-soft">
                Шаги нужны для режима мастера — если их нет, он не запустится
              </p>
            </div>

            <div className="space-y-1.5">
              <FieldLabel htmlFor="p-tags">Теги</FieldLabel>
              <input
                id="p-tags"
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                placeholder="через запятую: авиация, картон, подарок"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-1.5 rounded-full bg-clay px-5 py-2.5 text-sm font-semibold text-white shadow-card transition-colors hover:bg-clay/90 disabled:opacity-60"
          >
            {submitting && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
            {submitting ? "Сохраняем…" : "Сохранить поделку"}
          </button>
          <Link
            href="/podelki"
            className="text-sm font-medium text-ink-soft transition-colors hover:text-ink"
          >
            Отмена
          </Link>
        </div>
      </form>
    </div>
  );
}
