import { useEffect, useRef, useState } from "react";
import { CopyIcon, DownloadIcon, PlayIcon, PauseIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
} from "@/components/ui/select";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import ThemeComposer from "./ThemeComposer";

type Texture = { name: string; file: string; size: number[] };
export type Item = {
  key: string;
  version: number;
  id: number | null;
  idVerified: boolean;
  name: string;
  nameVerified: boolean;
  field: string;
  source: string;
  variant: string;
  idEvidence: string;
  pluginName: string | null;
  pluginConflict: boolean;
  textures: Texture[];
};
export type Catalog = {
  groups: Record<string, Item[]>;
  summary: { packages: number; rawTextures: number; uniqueTextures: number };
};
export const labels: Record<string, string> = {
  frame: "Frame",
  turntable: "Turntable Decal",
  note_burst: "Note Burst",
  lane_cover: "SUDDEN+ Cover",
  lift_cover: "Lift Cover",
  note_skin: "Note Skin",
  cn_color: "Charge Note Skin",
  hcn: "HCN Skin",
  full_combo_splash: "Full Combo Effect",
  note_beam: "Note Beam",
  judge_font: "Judge Font",
  pacemaker_cover: "Pacemaker Skin",
  premium_skin: "Premium Area Skin",
  premium_bg: "Premium Area Background",
  premium_bg_concent: "Concentration Mode Background",
  entry_bg: "Entry Card Background",
  breaking_news: "Breaking News",
  first_note_preview: "First Note Preview",
  disable_hcn_color: "Disable HCN Colors",
  effect: "Effector Preset",
};
const root = new URL(`${import.meta.env.BASE_URL}theme/`, document.baseURI);
export function Picker({
  label,
  value,
  items,
  onChange,
}: {
  label: string;
  value: string;
  items: { value: string; label: string }[];
  onChange: (s: string) => void;
}) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <Select
        items={items}
        value={value}
        onValueChange={(v) => v !== null && onChange(v)}
      >
        <SelectTrigger aria-label={label} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          <SelectGroup>
            {items.map((i) => (
              <SelectItem key={i.value} value={i.value}>
                {i.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}
function download(value: unknown, name: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function Theme() {
  const [mode, setMode] = useState<"compose" | "assets">("compose");
  const [catalog, setCatalog] = useState<Catalog | null>(null),
    [error, setError] = useState(""),
    [group, setGroup] = useState("turntable"),
    [version, setVersion] = useState("33"),
    [query, setQuery] = useState(""),
    [selection, setSelection] = useState(""),
    [textureIndex, setTextureIndex] = useState(0),
    [page, setPage] = useState(0),
    [rotating, setRotating] = useState(false),
    [copied, setCopied] = useState(false),
    [imageError, setImageError] = useState(false);
  const image = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch(new URL("catalog.json", root), { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`Theme catalog: ${r.status}`);
        return r.json();
      })
      .then(setCatalog)
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => controller.abort();
  }, []);
  const items = (catalog?.groups[group] || []).filter(
    (i) =>
      i.version === Number(version) &&
      `${i.id ?? ""} ${i.name} ${i.source}`
        .toLocaleLowerCase()
        .includes(query.toLocaleLowerCase()),
  );
  const item = items.find((i) => i.key === selection) || items[0],
    texture = item?.textures[textureIndex] || item?.textures[0];
  useEffect(() => {
    setTextureIndex(0);
    setPage(0);
    setCopied(false);
  }, [item?.key]);
  useEffect(() => setImageError(false), [texture?.file]);
  useEffect(() => {
    let frame: number,
      last = 0,
      angle = 0;
    if (!rotating || group !== "turntable") {
      if (image.current) image.current.style.transform = "";
      return;
    }
    function tick(t: number) {
      if (last) angle = (angle + Math.min(100, t - last) * 0.18) % 360;
      last = t;
      if (image.current) image.current.style.transform = `rotate(${angle}deg)`;
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [rotating, group, texture?.file]);
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 p-4 lg:p-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">Theme</h1>
        {catalog && (
          <>
            <Button
              variant={mode === "compose" ? "secondary" : "outline"}
              aria-pressed={mode === "compose"}
              size="sm"
              onClick={() => setMode("compose")}
            >
              组合预览
            </Button>
            <Button
              variant={mode === "assets" ? "secondary" : "outline"}
              aria-pressed={mode === "assets"}
              size="sm"
              onClick={() => setMode("assets")}
            >
              素材浏览
            </Button>
            <Badge variant="secondary">
              {catalog.summary.packages.toLocaleString()} packages ·{" "}
              {catalog.summary.rawTextures.toLocaleString()} textures
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => download(catalog, "theme-catalog.json")}
            >
              <DownloadIcon data-icon="inline-start" />
              完整索引
            </Button>
          </>
        )}
      </div>
      {error ? (
        <Alert>
          <AlertTitle>素材不可用</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : !catalog ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <>
          <div hidden={mode !== "compose"}>
            <ThemeComposer
              active={mode === "compose"}
              catalog={catalog}
              root={root}
              version={version}
              setVersion={setVersion}
              inspect={(category, key) => {
                setGroup(category);
                setSelection(key);
                setQuery("");
                setMode("assets");
              }}
            />
          </div>
          {mode === "assets" && (
            <div className="grid items-start gap-5 lg:grid-cols-[22rem_minmax(0,1fr)]">
              <Card>
                <CardHeader>
                  <CardTitle>Theme</CardTitle>
                </CardHeader>
                <CardContent>
                  <FieldGroup>
                    <Picker
                      label="资源版本"
                      value={version}
                      items={[
                        { value: "33", label: "33 · Sparkle Shower" },
                        { value: "34", label: "34 · ZINRAI" },
                      ]}
                      onChange={(v) => {
                        setVersion(v);
                        setSelection("");
                      }}
                    />
                    <Picker
                      label="Theme 类别"
                      value={group}
                      items={Object.keys(labels).map((k) => ({
                        value: k,
                        label: labels[k],
                      }))}
                      onChange={(v) => {
                        setGroup(v);
                        setSelection("");
                        setQuery("");
                      }}
                    />
                    <Field>
                      <FieldLabel htmlFor="theme-search">
                        搜索名称 / ID / 资源
                      </FieldLabel>
                      <Input
                        id="theme-search"
                        value={query}
                        onChange={(e) => {
                          setQuery(e.target.value);
                          setSelection("");
                        }}
                      />
                    </Field>
                    <Picker
                      label="Theme 样式"
                      value={item?.key || ""}
                      items={items.map((i) => ({
                        value: i.key,
                        label: `${i.id === null ? "ID ?" : i.id} · ${i.name}${i.variant ? ` · ${i.variant}` : ""}`,
                      }))}
                      onChange={setSelection}
                    />
                  </FieldGroup>
                </CardContent>
                <CardFooter>
                  <span className="text-sm text-muted-foreground">
                    {
                      new Set(
                        items.filter((i) => i.id !== null).map((i) => i.id),
                      ).size
                    }{" "}
                    IDs · {items.length} 资源 / 变体
                  </span>
                </CardFooter>
              </Card>
              <div className="flex min-w-0 flex-col gap-5">
                <Card data-testid="theme-detail">
                  <CardHeader>
                    <CardTitle>{item?.name || "没有匹配项"}</CardTitle>
                    <CardDescription className="break-all">
                      {item?.source}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    {item && (
                      <>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge data-testid="theme-setting-id">
                            {item.id === null
                              ? "设置 ID 待核实"
                              : `${item.idVerified ? "" : "候选 · "}${item.field} = ${item.id}`}
                          </Badge>
                          <Badge variant="outline">
                            {item.nameVerified ? "名称已收录" : "名称待核实"}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!item.idVerified}
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(
                                  String(item.id),
                                );
                                setCopied(true);
                              } catch {
                                setError(
                                  "无法访问剪贴板，请手动复制显示的设置值",
                                );
                              }
                            }}
                          >
                            <CopyIcon data-icon="inline-start" />
                            {copied ? "已复制" : "复制设置 ID"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!item.idVerified}
                            onClick={() =>
                              download(
                                {
                                  version: item.version,
                                  field: item.field,
                                  value: item.id,
                                  name: item.name,
                                  source: item.source,
                                  evidence: item.idEvidence,
                                },
                                `theme-${group}-${item.id}.json`,
                              )
                            }
                          >
                            <DownloadIcon data-icon="inline-start" />
                            JSON
                          </Button>
                        </div>
                        {item.pluginConflict && (
                          <Alert>
                            <AlertTitle>本地插件名称表存在冲突</AlertTitle>
                            <AlertDescription>
                              该编号在你的插件中标为「{item.pluginName}
                              」。插件直接发送数值，需以这里核对的资源对应关系为准。
                            </AlertDescription>
                          </Alert>
                        )}
                        {!item.idVerified && (
                          <Alert>
                            <AlertTitle>
                              该资源尚无已核实的独立设置编号
                            </AlertTitle>
                            <AlertDescription>
                              它可能是共享 UI、旧代资源或 Frame
                              的组成部分。不会用文件名尾号代替设置 ID。
                            </AlertDescription>
                          </Alert>
                        )}
                        {group === "hcn" && (
                          <Alert>
                            <AlertTitle>HCN 跟随 Charge Note Skin</AlertTitle>
                            <AlertDescription>
                              HCN 纹理编号用于检查资源；实际样式设置使用
                              cn_color，颜色开关为 disable_hcn_color。
                            </AlertDescription>
                          </Alert>
                        )}
                        {texture && !imageError ? (
                          <>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="break-all text-sm text-muted-foreground">
                                {texture.name} · {texture.size.join(" × ")} px
                              </span>
                              {group === "turntable" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setRotating((v) => !v)}
                                >
                                  {rotating ? (
                                    <PauseIcon data-icon="inline-start" />
                                  ) : (
                                    <PlayIcon data-icon="inline-start" />
                                  )}
                                  {rotating ? "暂停" : "旋转"}
                                </Button>
                              )}
                            </div>
                            <div
                              className="asset-stage"
                              data-testid="asset-preview"
                            >
                              <img
                                ref={image}
                                className={
                                  group === "turntable" ? "decal-image" : ""
                                }
                                src={new URL(texture.file, root).href}
                                alt={`${item.name} ${texture.name}`}
                                onError={() => setImageError(true)}
                              />
                            </div>
                          </>
                        ) : (
                          <Empty>
                            <EmptyHeader>
                              <EmptyTitle>
                                {imageError
                                  ? "纹理加载失败"
                                  : item.source
                                    ? "没有独立纹理"
                                    : "参数设置，无独立图像"}
                              </EmptyTitle>
                            </EmptyHeader>
                          </Empty>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {item.idEvidence}
                          {item.textures.length > 0
                            ? " · 原始纹理独立预览"
                            : ""}
                        </p>
                      </>
                    )}
                  </CardContent>
                </Card>
                {item && item.textures.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>全部纹理 · {item.textures.length}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                        {item.textures
                          .slice(page * 30, page * 30 + 30)
                          .map((t, n) => (
                            <Button
                              key={`${t.file}:${n}`}
                              variant={
                                textureIndex === page * 30 + n
                                  ? "secondary"
                                  : "outline"
                              }
                              className="h-auto min-w-0 flex-col gap-2 p-2"
                              onClick={() => setTextureIndex(page * 30 + n)}
                              aria-label={`纹理 ${t.name}`}
                            >
                              <img
                                loading="lazy"
                                className="h-16 w-full object-contain"
                                src={new URL(t.file, root).href}
                                alt=""
                              />
                              <span className="w-full truncate text-xs">
                                {t.name}
                              </span>
                            </Button>
                          ))}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={page === 0}
                          onClick={() => setPage((p) => p - 1)}
                        >
                          上一页
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          {page + 1} / {Math.ceil(item.textures.length / 30)}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={(page + 1) * 30 >= item.textures.length}
                          onClick={() => setPage((p) => p + 1)}
                        >
                          下一页
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}
