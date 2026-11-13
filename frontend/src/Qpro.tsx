import { useEffect, useRef, useState } from "react";
import { ShuffleIcon, ShirtIcon, SaveIcon, DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
} from "@/components/ui/select";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

const categories = ["head", "hair", "hand", "body", "face", "back"] as const;
type Category = (typeof categories)[number];
type Selection = Record<Category, number>;
type Part = {
  id: number;
  ifs: string;
  stem: string;
  family: string;
  ready: boolean;
  renderMode?: string;
  empty?: boolean;
  layers: { suffix: string; file: string }[];
};
type Catalog = {
  canvas: [number, number];
  categories: Record<Category, Part[]>;
};
const root = new URL(`${import.meta.env.BASE_URL}qpro/`, document.baseURI);
const reference: Selection = {
  head: 373,
  hair: 306,
  hand: 45,
  body: 416,
  face: 210,
  back: 13,
};
const imageCache = new Map<string, Promise<HTMLImageElement>>();
function load(file: string) {
  let pending = imageCache.get(file);
  if (!pending) {
    pending = new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(Error("无法读取 Qpro 图层：" + file));
      image.src = new URL(file, root).href;
    });
    imageCache.set(file, pending);
    pending.catch(() => imageCache.delete(file));
    if (imageCache.size > 90)
      imageCache.delete(imageCache.keys().next().value!);
  }
  return pending;
}
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function Qpro() {
  const [catalog, setCatalog] = useState<Catalog | null>(null),
    [selection, setSelection] = useState<Selection>(reference),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(true),
    [saved, setSaved] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch(new URL("catalog.json", root), { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw Error("Qpro 全量素材尚未导入");
        return r.json();
      })
      .then((data: Catalog) => {
        let initial = reference;
        try {
          const stored = JSON.parse(
            localStorage.getItem("iidxlab-qpro") || "null",
          );
          if (stored?.schema === 1 && stored.parts) initial = stored.parts;
        } catch {}
        const checked = { ...reference };
        for (const c of categories)
          checked[c] = data.categories[c].some((p) => p.id === initial[c])
            ? initial[c]
            : data.categories[c][0].id;
        setSelection(checked);
        setCatalog(data);
      })
      .catch((e) => {
        if (e.name !== "AbortError") {
          setError(e.message);
          setBusy(false);
        }
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!catalog) return;
    let active = true;
    setBusy(true);
    setError("");
    const parts = Object.fromEntries(
      categories.map((c) => [
        c,
        catalog.categories[c].find((p) => p.id === selection[c])!,
      ]),
    ) as Record<Category, Part>;
    const unavailable = categories.filter((c) => !parts[c]?.ready);
    if (unavailable.length) {
      setError("尚未生成所选部件的组合图层：" + unavailable.join(" / "));
      setBusy(false);
      return;
    }
    const layer = (c: Category, suffix = "") =>
      parts[c].layers.find((l) => l.suffix === suffix)?.file;
    const files = [
      layer("back"),
      layer("head", "_b"),
      layer("hair", "_b"),
      layer("body"),
      layer("hand", "_r"),
      layer("face"),
      layer("hair", "_f"),
      layer("head", "_f"),
      layer("hand", "_l"),
    ].filter((f): f is string => !!f);
    Promise.all(files.map(load))
      .then((images) => {
        if (!active || !canvas.current) return;
        const context = canvas.current.getContext("2d")!;
        context.clearRect(0, 0, 520, 704);
        for (const image of images) context.drawImage(image, 0, 0, 520, 704);
        setBusy(false);
      })
      .catch((e) => {
        if (active) {
          setError(e.message);
          setBusy(false);
        }
      });
    return () => {
      active = false;
    };
  }, [catalog, selection]);
  function change(c: Category, id: number) {
    setSelection((s) => ({ ...s, [c]: id }));
    setSaved(false);
    setNotice("");
  }
  function randomize() {
    if (!catalog) return;
    const next = { ...selection };
    for (const c of categories) {
      const options = catalog.categories[c].filter((p) => p.ready);
      next[c] =
        options[
          crypto.getRandomValues(new Uint32Array(1))[0] % options.length
        ].id;
    }
    setSelection(next);
    setSaved(false);
    setNotice("");
  }
  function suit() {
    if (!catalog) return;
    const body = catalog.categories.body.find((p) => p.id === selection.body)!;
    const next = { ...selection },
      missing: string[] = [];
    for (const c of categories) {
      if (c === "body") continue;
      const found = catalog.categories[c].find((p) => p.family === body.family);
      if (found) next[c] = found.id;
      else if (c !== "back") missing.push(c);
    }
    setSelection(next);
    setSaved(false);
    setNotice(
      missing.length
        ? "没有同名配套的 " + missing.join(" / ") + "，已保留当前选择"
        : "已按 body 选择配套部件",
    );
  }
  function save() {
    try {
      localStorage.setItem(
        "iidxlab-qpro",
        JSON.stringify({ schema: 1, parts: selection }),
      );
      setSaved(true);
      setNotice("搭配已保存在当前浏览器");
    } catch {
      setNotice("浏览器无法保存，请使用 JSON 导出");
    }
  }
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 lg:p-8">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">Qpro</h1>
        <Badge variant="secondary">组合预览 · Neutral</Badge>
        {catalog && (
          <Badge variant="outline">
            {categories
              .reduce((n, c) => n + catalog.categories[c].length, 0)
              .toLocaleString()}{" "}
            部件
          </Badge>
        )}
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertTitle>预览提示</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {!catalog && !error ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        catalog && (
          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(20rem,1fr)_minmax(0,1fr)]">
            <Card>
              <CardHeader>
                <CardTitle>部件选择</CardTitle>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  {categories.map((c) => {
                    const parts = catalog.categories[c],
                      items = parts.map((p) => ({
                        value: String(p.id),
                        label: `${p.id} · ${p.empty ? "无背景" : p.stem}`,
                      }));
                    return (
                      <Field key={c}>
                        <FieldLabel htmlFor={"qpro-" + c}>
                          {c === "back" ? "qproback" : c}
                        </FieldLabel>
                        <div className="flex min-w-0 gap-2">
                          <Input
                            id={"qpro-" + c}
                            aria-label={c + " ID"}
                            className="w-20 shrink-0"
                            type="number"
                            min={0}
                            max={parts.length - 1}
                            value={selection[c]}
                            onChange={(e) => {
                              const id = Number(e.target.value);
                              if (parts.some((p) => p.id === id)) change(c, id);
                            }}
                          />
                          <Select
                            items={items}
                            value={String(selection[c])}
                            onValueChange={(v) =>
                              v !== null && change(c, Number(v))
                            }
                          >
                            <SelectTrigger
                              aria-label={c + " 部件"}
                              className="w-full min-w-0"
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent alignItemWithTrigger={false}>
                              <SelectGroup>
                                {items.map((item) => (
                                  <SelectItem
                                    key={item.value}
                                    value={item.value}
                                  >
                                    {item.label}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        </div>
                      </Field>
                    );
                  })}
                </FieldGroup>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button variant="outline" onClick={randomize}>
                    <ShuffleIcon data-icon="inline-start" />
                    Randomize
                  </Button>
                  <Button variant="outline" onClick={suit}>
                    <ShirtIcon data-icon="inline-start" />
                    Suit (Based on body)
                  </Button>
                  <Button onClick={save}>
                    <SaveIcon data-icon="inline-start" />
                    {saved ? "已保存" : "保存搭配"}
                  </Button>
                </div>
                <p className="mt-3 text-xs text-muted-foreground" role="status">
                  {notice}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle>组合预览</CardTitle>
                  {categories.some(
                    (c) =>
                      catalog.categories[c].find((p) => p.id === selection[c])
                        ?.renderMode === "atlas-static-compat",
                  ) && (
                    <Badge
                      variant="secondary"
                      title="34 代新增部件采用静态贴图兼容处理，部分动画、变形与特效尚未还原"
                    >
                      静态兼容
                    </Badge>
                  )}
                  <Badge variant="outline">
                    {busy ? "加载中…" : "520 × 704"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="qpro-stage asset-stage">
                  <canvas
                    ref={canvas}
                    width={520}
                    height={704}
                    role="img"
                    aria-label="Qpro 组合角色"
                    data-testid="qpro-composite"
                  />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    disabled={busy || !!error}
                    onClick={() =>
                      canvas.current?.toBlob(
                        (blob) => blob && download(blob, "qpro.png"),
                        "image/png",
                      )
                    }
                  >
                    <DownloadIcon data-icon="inline-start" />
                    PNG
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      download(
                        new Blob(
                          [
                            JSON.stringify(
                              { schema: 1, parts: selection },
                              null,
                              2,
                            ),
                          ],
                          { type: "application/json" },
                        ),
                        "qpro.json",
                      )
                    }
                  >
                    JSON
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )
      )}
    </main>
  );
}
