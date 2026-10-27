import { useEffect, useMemo, useRef, useState } from "react";
import {
  DownloadIcon,
  ShuffleIcon,
  UploadIcon,
  Music2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyMedia,
} from "@/components/ui/empty";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import {
  createDataset,
  browseSongs,
  getOmniInfo,
  difficultyPresentation,
  transform,
  analyze,
  renderChartSVG,
  svgToPNG,
  measureLayout,
} from "./index.mjs";

import {radarValues} from "./radar.mjs";

type Data = Record<string, any>;
const radarColors:Record<string,string>={NOTES:"var(--radar-notes)",PEAK:"var(--radar-peak)",SCRATCH:"var(--radar-scratch)","SOF-LAN":"var(--radar-soflan)",CHARGE:"var(--radar-charge)",CHORD:"var(--radar-chord)"};
const dataset = createDataset(
  new URL(`${import.meta.env.BASE_URL}data/`, document.baseURI),
);
const freshSeed = () => crypto.getRandomValues(new Uint32Array(2)).join("-");
function Choice({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <Select
        items={options}
        value={value}
        onValueChange={(v) => v !== null && onChange(v)}
      >
        <SelectTrigger aria-label={label} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          <SelectGroup>
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}
function Segments({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <ToggleGroup
      className="max-w-full flex-wrap"
      aria-label={label}
      variant="outline"
      value={[value]}
      onValueChange={(v) => v[0] && onChange(v[0])}
    >
      {options.map((v) => (
        <ToggleGroupItem key={v} value={v} aria-label={v}>
          {v}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
function Difficulty({ chart, level }: { chart: Data; level?: number }) {
  const p = difficultyPresentation(chart);
  return (
    <Badge variant="difficulty" data-tone={p.tone} title={p.name}>
      {p.label}
      {level !== undefined && (
        <span className="difficulty-stars">☆{level}</span>
      )}
    </Badge>
  );
}
function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Plot({
  title,
  data,
  area = false,
}: {
  title: string;
  data: Data[];
  area?: boolean;
}) {
  const axes = (
    <>
      <CartesianGrid vertical={false} />
      <XAxis
        dataKey="label"
        tickLine={false}
        axisLine={false}
        minTickGap={24}
      />
      <YAxis tickLine={false} axisLine={false} width={36} />
      <ChartTooltip content={<ChartTooltipContent />} />
    </>
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{ value: { label: title, color: "var(--chart-2)" } }}
          className="h-52 w-full"
        >
          {area ? (
            <AreaChart data={data}>
              {axes}
              <Area
                type="step"
                dataKey="value"
                stroke="var(--color-value)"
                fill="var(--color-value)"
                fillOpacity={0.2}
              />
            </AreaChart>
          ) : (
            <BarChart data={data}>
              {axes}
              <Bar dataKey="value" fill="var(--color-value)" radius={3} />
            </BarChart>
          )}
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
function LaneMapping({map,side}:{map:number[];side:number}) {
  const [active,setActive]=useState<number|null>(null)
  return <div className="flex min-w-0 flex-col gap-3">
    <div className="flex items-center gap-2"><Badge variant="secondary">{side+1}P</Badge><Badge variant="outline">Scratch fixed</Badge></div>
    <svg viewBox="0 0 640 196" className="w-full" role="img" aria-label={`${side+1}P Lane mapping: ${map.map((d,i)=>`${i+1} → ${d}`).join(', ')}`} data-mapping={map.join('')}>
      <text x="20" y="16" className="fill-muted-foreground text-xs">Original</text>
      <text x="20" y="190" className="fill-muted-foreground text-xs">Target</text>
      {map.map((dest,i)=>{
        const x=68+i*84,xx=68+(dest-1)*84
        return <path key={i} data-from={i+1} data-to={dest} d={`M${x} 60 C${x} 91 ${xx} 99 ${xx} 130`} fill="none" stroke={`hsl(${i*44} 65% 55%)`} strokeWidth={active===i?4:2} opacity={active===null?.7:active===i?1:.15} onMouseEnter={()=>setActive(i)} onMouseLeave={()=>setActive(null)}><title>{i+1} → {dest}</title></path>
      })}
      {[38,152].map((y,row)=>Array.from({length:7},(_,i)=><g key={`${row}-${i}`}><rect x={48+i*84} y={y-18} width="40" height="36" rx="10" className="fill-muted stroke-border"/><text x={68+i*84} y={y+5} textAnchor="middle" className="fill-foreground text-sm font-medium">{i+1}</text></g>))}
    </svg>
  </div>
}
function Study({
  bundle,
  choices,
  onDifficulty,
  playSide,
  setPlaySide,
}: {
  bundle: Data;
  choices: Data[];
  onDifficulty: (v: string) => void;
  playSide: string;
  setPlaySide: (v: string) => void;
}) {
  const [mode, setMode] = useState("normal"),
    [seed, setSeed] = useState("0"),
    [custom, setCustom] = useState("1234567"),
    [bars, setBars] = useState("8"),
    [hiSpeed, setHiSpeed] = useState(String(bundle.chart.display?.hiSpeed ?? bundle.display?.hiSpeed ?? 1)),
    [bin, setBin] = useState("1000"),
    [exporting, setExporting] = useState(false),
    [error, setError] = useState("");
  const result = useMemo(() => {
    try {
      const chart = transform(bundle.chart, mode, seed, custom),
        stats = analyze(chart, Number(bin));
      return { chart, stats, error: "" };
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [bundle, mode, seed, custom, bin]);
  function randomize() {
    let next;
    do {
      next = freshSeed();
    } while (
      JSON.stringify(
        transform(bundle.chart, "random", next).randomization.maps,
      ) === JSON.stringify(result.chart?.randomization.maps)
    );
    setSeed(next);
    setMode("random");
  }
  const title = `${bundle.metadata.title} · ${bundle.chart.difficulty}`;
  const svg = useMemo(
      () =>
        result.chart
          ? renderChartSVG(result.chart, title, Number(bars), { playSide, hiSpeed: Number(hiSpeed) || 1 })
          : "",
      [result.chart, title, bars, playSide, hiSpeed],
    ),
    stats = result.stats;
  const perMeasure = useMemo(() => {
    if (!result.chart) return [];
    const layout = measureLayout(result.chart),
      counts = Array(layout.bars.length).fill(0);
    for (const e of result.chart.events) {
      if (e[1] !== 0 && e[1] !== 1) continue;
      const index = Math.floor(layout.position(e[0]));
      if (index >= 0 && index < counts.length) counts[index]++;
    }
    return counts.map((value, i) => ({ label: String(i + 1), value }));
  }, [result.chart]);
  async function download(kind: string) {
    setError("");
    setExporting(true);
    try {
      const filename = title.replace(/[<>:"/\\|?*]/g, "_");
      if (kind === "PNG") save(await svgToPNG(svg), filename + ".png");
      if (kind === "SVG")
        save(new Blob([svg], { type: "image/svg+xml" }), filename + ".svg");
      if (kind === "JSON")
        save(
          new Blob(
            [
              JSON.stringify(
                {
                  ...bundle,
                  chart: { ...result.chart, display: { playSide, hiSpeed: Number(hiSpeed) || 1 } },
                  analysis: stats,
                  display: { playSide, hiSpeed: Number(hiSpeed) || 1 },
                },
                null,
                2,
              ),
            ],
            { type: "application/json" },
          ),
          filename + ".json",
        );
      if (kind === "HTML") {
        // Report scripts embed function sources; preserve their original names.
        const sdkURL = new URL(`${import.meta.env.BASE_URL}index.mjs`, document.baseURI).href;
        const {createReportHTML} = await import(/* @vite-ignore */ sdkURL);
        save(
          new Blob(
            [
              createReportHTML(
                { ...bundle, chart: {...result.chart, display:{playSide,hiSpeed:Number(hiSpeed)||1}} },
                Number(bin),
                { playSide },
              ),
            ],
            { type: "text/html;charset=utf-8" },
          ),
          filename + ".html",
        );
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setExporting(false);
    }
  }
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            {bundle.metadata.title}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {bundle.metadata.artist} · {bundle.metadata.genre}
        </p>
      </div>
      {choices.length > 0 && (
        <ToggleGroup aria-label="谱面难度" variant="difficulty" className="max-w-full flex-wrap" value={[bundle.chart.difficulty]} onValueChange={v=>v[0]&&onDifficulty(v[0])}>
          {[...choices].sort((a,b)=>{
            const rank:Record<string,number>={beginner:0,normal:1,hyper:2,another:3,black:4,leggendaria:5};
            return Number(a.difficulty.startsWith("DP"))-Number(b.difficulty.startsWith("DP"))||(rank[difficultyPresentation(a).tone]??9)-(rank[difficultyPresentation(b).tone]??9);
          }).map(chart=>{const p=difficultyPresentation(chart),level=bundle.metadata.levels?.[chart.difficulty];return <ToggleGroupItem key={chart.difficulty} value={chart.difficulty} aria-label={chart.difficulty} title={p.name} data-tone={p.tone} style={{"--difficulty-color":`var(--difficulty-${p.tone})`} as React.CSSProperties}><span>{p.label}</span><span className="difficulty-stars">☆{level||"?"}</span></ToggleGroupItem>})}
        </ToggleGroup>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Choice
              label="排列"
              value={mode}
              options={["normal", "mirror", "random", "custom"].map(
                (value) => ({ value, label: value.toUpperCase() }),
              )}
              onChange={(v) => {
                if (v === "random") randomize();
                else setMode(v);
              }}
            />
            <Field>
              <FieldLabel htmlFor="seed">Seed</FieldLabel>
              <div className="flex gap-2">
                <Input
                  id="seed"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                />
                <Button
                  variant="outline"
                  aria-label="重新随机"
                  onClick={randomize}
                >
                  <ShuffleIcon data-icon="inline-start" />
                </Button>
              </div>
            </Field>
            <Choice
              label="每列小节"
              value={bars}
              options={["4", "8", "12", "16"].map((value) => ({
                value,
                label: value,
              }))}
              onChange={setBars}
            />
            <Field>
              <FieldLabel htmlFor="hi-speed">Hi-Speed</FieldLabel>
              <Input id="hi-speed" type="number" min="0.25" max="4" step="0.25" value={hiSpeed}
                onChange={e=>setHiSpeed(e.target.value)}
                onBlur={()=>setHiSpeed(String(Math.max(.25,Math.min(4,Number(hiSpeed)||1))))}/>
            </Field>
            <Field>
              <FieldLabel>Play side</FieldLabel>
              <Segments
                label="Play side"
                value={playSide}
                options={["1p", "2p"]}
                onChange={setPlaySide}
              />
            </Field>
            {mode === "custom" && (
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="mapping">Lane mapping</FieldLabel>
                <Input
                  id="mapping"
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  placeholder="7654321 / 1234567"
                />
              </Field>
            )}
          </FieldGroup>
        </CardContent>
      </Card>
      {(result.error || error) && (
        <Alert variant="destructive">
          <AlertTitle>无法完成操作</AlertTitle>
          <AlertDescription>{result.error || error}</AlertDescription>
        </Alert>
      )}
      {stats && (
        <>
          <Card data-testid="chart-card">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle>小节谱面</CardTitle>
                <div className="flex flex-wrap gap-2">
                  {["PNG", "SVG", "JSON", "HTML"].map((kind) => (
                    <Button
                      key={kind}
                      variant="outline"
                      size="sm"
                      disabled={exporting}
                      onClick={() => download(kind)}
                    >
                      <DownloadIcon data-icon="inline-start" />
                      {kind}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div
                className="chart-scroll"
                data-testid="chart-svg"
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            </CardContent>
          </Card>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {[
              ["Notes", stats.note_heads.toLocaleString()],
              ["Peak NPS", stats.peak_rolling_1s_heads],
              ["Scratch", stats.scratch_heads],
              ["Long Notes", stats.long_note_heads],
              ["Average NPS", stats.average_heads_per_second.toFixed(2)],
              ["Jack ≤250ms", stats.jack_intervals_le_250ms],
              ["Max Chord span", stats.max_chord_span],
              ["Duration", `${stats.active_duration_seconds.toFixed(1)}s`],
            ].map(([label, value]) => (
              <Card key={label}>
                <CardHeader>
                  <CardTitle>{label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold tabular-nums">{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2" data-testid="mapping-radar-row">
          <Card>
            <CardHeader>
              <CardTitle>Lane mapping</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-6" data-testid="lane-maps">
                {result.chart.randomization.maps.slice(0,bundle.chart.difficulty.startsWith("DP")?2:1).map((map:number[],side:number)=><LaneMapping key={side} map={map} side={side}/>)}
              </div>
            </CardContent>
          </Card>
          <Card data-testid="radar-card">
            <CardHeader><div className="flex items-center justify-between gap-2"><CardTitle>谱面雷达</CardTitle><Badge variant="secondary" title="IIDXLab 自定义 0–100 指标，非游戏官方数值">IIDXLab · 0–100</Badge></div></CardHeader>
            <CardContent>
              <ChartContainer config={{value:{label:"IIDXLab",color:"var(--radar-notes)"}}} className="mx-auto h-72 w-full max-w-md">
                <RadarChart data={radarValues(result.chart,stats)} outerRadius="65%" accessibilityLayer>
                  <PolarGrid/><PolarAngleAxis dataKey="axis" tick={({x,y,payload,textAnchor}:Data)=><text x={x} y={y} dy={4} textAnchor={textAnchor} fill={radarColors[payload.value]} fontSize={11} fontWeight={600}>{payload.value}</text>}/><PolarRadiusAxis domain={[0,100]} tick={false} axisLine={false} tickCount={5}/>
                  <ChartTooltip content={<ChartTooltipContent hideLabel formatter={(value,_name,item)=><span data-testid="radar-tooltip" className="font-medium tabular-nums" style={{color:radarColors[item.payload.axis]}}>{item.payload.axis}：{Number(value).toFixed(1)}</span>}/>}/>
                  <Radar dataKey="value" stroke="var(--color-value)" fill="var(--color-value)" fillOpacity={.22} strokeWidth={2} dot={({cx,cy,payload}:Data)=><circle key={payload.axis} cx={cx} cy={cy} r={3.5} fill={radarColors[payload.axis]} stroke="var(--card)" strokeWidth={1.5}/>} isAnimationActive={false}/>
                </RadarChart>
              </ChartContainer>
              <div className="grid grid-cols-3 gap-3">{radarValues(result.chart,stats).map(d=><div key={d.axis} title={d.definition} className="flex flex-col gap-1"><span className="text-xs font-medium" style={{color:radarColors[d.axis]}}>{d.axis}</span><span className="text-sm font-medium tabular-nums">{d.value}</span></div>)}</div>
            </CardContent>
          </Card>
          </div>
          <FieldGroup className="max-w-48">
            <Choice
              label="NPS interval"
              value={bin}
              options={[
                { value: "250", label: "250 ms" },
                { value: "500", label: "500 ms" },
                { value: "1000", label: "1 s" },
                { value: "2000", label: "2 s" },
              ]}
              onChange={setBin}
            />
          </FieldGroup>
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <Plot
              title="NPS"
              area
              data={stats.density.map((d: Data) => ({
                label: (d.start_ms / 1000).toFixed(1) + "s",
                value: d.nps,
              }))}
            />
            <Plot title="Notes / 小节" data={perMeasure} />
            <Plot
              title="Notes / Lane"
              data={stats.lane_heads
                .map((value: number, i: number) => ({
                  label: `${Math.floor(i / 8) + 1}P ${i % 8 === 7 ? "S" : (i % 8) + 1}`,
                  value,
                }))
                .filter(
                  (_: unknown, i: number) =>
                    bundle.chart.difficulty.startsWith("DP") || i < 8,
                )}
            />
            <Plot
              title="Chord size"
              data={Object.entries(stats.chord_size_histogram).map(
                ([label, value]) => ({ label, value }),
              )}
            />
            <Plot
              title="Chord span"
              data={Object.entries(stats.chord_span_histogram).map(
                ([label, value]) => ({ label, value }),
              )}
            />
            <Plot
              title="Notes composition"
              data={[
                {
                  label: "Keys",
                  value: stats.note_heads - stats.scratch_heads,
                },
                { label: "Scratch", value: stats.scratch_heads },
                { label: "Long Notes", value: stats.long_note_heads },
              ]}
            />
          </div>
          {stats.warnings.map((warning: string) => (
            <Alert key={warning}>
              <AlertTitle>谱面数据</AlertTitle>
              <AlertDescription>{warning}</AlertDescription>
            </Alert>
          ))}
        </>
      )}
    </div>
  );
}
export default function App() {
  const [songs, setSongs] = useState<Data[] | null>(null),
    [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [groupBy, setGroupBy] = useState("version"),
    [category, setCategory] = useState("all"),
    [playMode, setPlayMode] = useState("SP"),
    [difficulty, setDifficulty] = useState("all"),
    [visible, setVisible] = useState(80),
    [selected, setSelected] = useState<Data | null>(null),
    [bundle, setBundle] = useState<Data | null>(null),
    [loading, setLoading] = useState(false),
    [playSide, setPlaySide] = useState("1p");
  const request = useRef(0),
    importRef = useRef<HTMLInputElement>(null);
  async function show(key: string, chartDifficulty?: string) {
    const token = ++request.current;
    setLoading(true);
    setError("");
    try {
      const song = await dataset.loadSong(key);
      if (token !== request.current) return;
      const chart =
        song.data.charts.find((c: Data) => c.difficulty === chartDifficulty) ||
        song.data.charts.find((c: Data) => c.difficulty === "SPA") ||
        song.data.charts[0];
      setSelected(song);
      setBundle({
        schema: 1,
        time_unit: "millisecond",
        song: song.song,
        metadata: song.metadata,
        chart,
      });
      history.replaceState(
        null,
        "",
        "#" + new URLSearchParams({ key, difficulty: chart.difficulty }),
      );
    } catch (e) {
      if (token === request.current) setError((e as Error).message);
    } finally {
      if (token === request.current) setLoading(false);
    }
  }
  useEffect(() => {
    let active = true;
    dataset
      .catalog()
      .then((data) => {
        if (active) setSongs(data);
      })
      .catch((e) => active && setError(e.message));
    const params = new URLSearchParams(location.hash.slice(1));
    if (params.has("key"))
      void show(params.get("key")!, params.get("difficulty") || undefined);
    return () => {
      active = false;
    };
  }, []);
  const browsed = useMemo(
    () =>
      songs
        ? browseSongs(songs, { groupBy, category, playMode, difficulty, query })
        : null,
    [songs, groupBy, category, playMode, difficulty, query],
  );
  useEffect(
    () => setVisible(80),
    [groupBy, category, playMode, difficulty, query],
  );
  const groups = useMemo(() => {
    const result: { label: string; entries: Data[] }[] = [];
    for (const entry of browsed?.entries.slice(0, visible) || []) {
      if (result.at(-1)?.label !== entry.folderLabel)
        result.push({ label: entry.folderLabel, entries: [] });
      result.at(-1)!.entries.push(entry);
    }
    return result;
  }, [browsed, visible]);
  return (
    <SidebarProvider
      style={{ "--sidebar-width": "23rem" } as React.CSSProperties}
    >
      <Sidebar collapsible="offcanvas">
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2 py-3">
            <Music2Icon />
            <span className="text-lg font-semibold tracking-tight">
              IIDXLab
            </span>
            <Badge variant="secondary">33 + 34</Badge>
          </div>
          <FieldGroup className="gap-3">
            <Field>
              <FieldLabel htmlFor="search">搜索曲目</FieldLabel>
              <Input
                id="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Title / Artist / ID"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Choice
                label="分类"
                value={groupBy}
                options={[
                  { value: "version", label: "VERSION" },
                  { value: "level", label: "LEVEL" },
                  { value: "title", label: "TITLE" },
                ]}
                onChange={(v) => {
                  setGroupBy(v);
                  setCategory("all");
                }}
              />
              <Choice
                label="Folder"
                value={category}
                options={[
                  { value: "all", label: "ALL" },
                  ...(browsed?.folders || []).map((f: Data) => ({
                    value: f.value,
                    label: `${f.label} (${f.count})`,
                  })),
                ]}
                onChange={setCategory}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Play mode</FieldLabel>
                <Segments
                  label="Play mode"
                  value={playMode}
                  options={["SP", "DP"]}
                  onChange={setPlayMode}
                />
              </Field>
              <Choice
                label="Difficulty"
                value={difficulty}
                options={["all", "B", "N", "H", "A", "L"].map((value) => ({
                  value,
                  label:
                    value === "all"
                      ? "ALL"
                      : value === "B"
                        ? "BEGINNER"
                        : value,
                }))}
                onChange={setDifficulty}
              />
            </div>
          </FieldGroup>
          <Separator />
          <p className="px-2 text-xs text-muted-foreground" aria-live="polite">
            {browsed
              ? `${browsed.totalSongs} 首曲目 · ${browsed.totalCharts} 张谱面`
              : "加载曲库…"}
          </p>
        </SidebarHeader>
        <SidebarContent>
          {!songs && (
            <div className="flex flex-col gap-3 p-4">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          )}
          {groups.map((group) => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarMenu>
                {group.entries.map((entry) => {
                  const song = entry.song,
                    omni = getOmniInfo(song),
                    marked =
                      groupBy === "level"
                        ? omni.difficulties.includes(entry.difficulty)
                        : omni.isOmni;
                  return (
                    <SidebarMenuItem key={song.key + ":" + entry.difficulty}>
                      <SidebarMenuButton
                        size="song"
                        data-key={song.key}
                        data-difficulty={entry.difficulty}
                        data-omni={marked}
                        isActive={
                          bundle?.song?.key === song.key &&
                          (groupBy !== "level" ||
                            bundle?.chart.difficulty === entry.difficulty)
                        }
                        onClick={() => show(song.key, entry.difficulty)}
                      >
                        <div className="flex w-full min-w-0 flex-col gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <strong className="truncate">
                              {song.metadata.title || song.id}
                            </strong>
                            {marked && (
                              <Badge
                                variant="omni"
                                title={omni.difficulties.join(" / ")}
                              >
                                {groupBy !== "level" && omni.partial
                                  ? "OMNI+"
                                  : "OMNI"}
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {(groupBy === "level"
                              ? [entry.chart]
                              : entry.charts
                            ).map((c: Data) => (
                              <Difficulty
                                key={c.difficulty}
                                chart={c}
                                level={song.metadata.levels?.[c.difficulty]}
                              />
                            ))}
                          </div>
                          <span className="truncate text-xs text-muted-foreground">
                            {song.metadata.artist || song.id}
                          </span>
                        </div>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>
          ))}
          {browsed && !browsed.entries.length && (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>没有匹配的谱面</EmptyTitle>
              </EmptyHeader>
            </Empty>
          )}
          {browsed && visible < browsed.entries.length && (
            <Button
              variant="ghost"
              className="mx-3 mb-3"
              onClick={() => setVisible((v) => v + 80)}
            >
              显示更多（{browsed.entries.length - visible}）
            </Button>
          )}
        </SidebarContent>
        <SidebarFooter>
          <Button variant="outline" onClick={() => importRef.current?.click()}>
            <UploadIcon data-icon="inline-start" />
            打开 JSON
          </Button>
          <input
            ref={importRef}
            type="file"
            accept=".json,application/json"
            className="sr-only"
            aria-label="导入报告"
            onChange={async (e) => {
              try {
                const file = e.target.files?.[0];
                if (!file) return;
                const data = JSON.parse(await file.text());
                if (!data.chart?.events || !data.metadata)
                  throw Error("请选择完整的谱面报告 JSON");
                ++request.current;
                setLoading(false);
                setSelected(null);
                setBundle(data);
                setError("");
                if (["1p", "2p"].includes(data.display?.playSide))
                  setPlaySide(data.display.playSide);
                history.replaceState(null, "", location.pathname);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                if (importRef.current) importRef.current.value = "";
              }
            }}
          />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="min-w-0">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
          <SidebarTrigger aria-label="切换侧栏" />
          <Separator orientation="vertical" className="h-4" />
          <span className="text-sm text-muted-foreground">Chart Research</span>
        </header>
        <section className="flex min-w-0 flex-1 flex-col gap-5 p-4 lg:p-7">
          {error && (
            <Alert variant="destructive">
              <AlertTitle>读取失败</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {loading ? (
            <div className="flex flex-col gap-4">
              <Skeleton className="h-12 w-2/3" />
              <Skeleton className="h-44 w-full" />
              <Skeleton className="h-96 w-full" />
            </div>
          ) : bundle ? (
            <Study
              bundle={bundle}
              choices={selected?.data.charts || []}
              onDifficulty={(v) => show(selected!.song.key, v)}
              playSide={playSide}
              setPlaySide={setPlaySide}
            />
          ) : (
            <Empty className="min-h-[70vh]">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Music2Icon />
                </EmptyMedia>
                <EmptyTitle>选择一张谱面</EmptyTitle>
              </EmptyHeader>
            </Empty>
          )}
        </section>
      </SidebarInset>
    </SidebarProvider>
  );
}
