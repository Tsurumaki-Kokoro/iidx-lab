import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { labels, Picker, type Catalog, type Item } from "./Theme";

const order = [
  "frame",
  "turntable",
  "note_burst",
  "lane_cover",
  "lift_cover",
  "note_skin",
  "cn_color",
  "full_combo_splash",
  "note_beam",
  "judge_font",
  "pacemaker_cover",
  "breaking_news",
  "premium_skin",
  "premium_bg",
  "premium_bg_concent",
  "entry_bg",
  "first_note_preview",
  "disable_hcn_color",
  "effect",
];
const sizes = new Set(["note_skin", "cn_color", "note_beam"]);
const independent = new Set([
  "full_combo_splash",
  "pacemaker_cover",
  "premium_skin",
  "premium_bg",
  "premium_bg_concent",
  "entry_bg",
]);
const demoLanes = [0, 2, 4];
const dropMs = 1000;
const loopMs = 2000;
const x = [4, 98, 152, 194, 248, 290, 344, 386];
const widths = [92, 54, 42, 54, 42, 54, 42, 54];

function Lane({
  chosen,
  base,
  root,
  sudden,
  lift,
  animate,
  burstSize,
}: {
  chosen: Record<string, Item | undefined>;
  base?: Item;
  root: URL;
  sudden: number;
  lift: number;
  animate: boolean;
  burstSize: number;
}) {
  const [tick, setTick] = useState(0);
  const elapsed = useRef(0);
  useEffect(() => {
    if (!animate) return;
    const start = performance.now() - elapsed.current;
    let frame: number;
    let last = -Infinity;
    const step = (now: number) => {
      if (now - last >= 12) {
        elapsed.current = now - start;
        setTick(elapsed.current);
        last = now;
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [animate]);
  const texture = (item?: Item, name?: string) => {
    const t = name
      ? item?.textures.find((t) => t.name === name)
      : item?.textures[0];
    return t ? new URL(t.file, root).href : undefined;
  };
  const lane = texture(chosen.frame, "lane_1p") || texture(base, "lane_1p");
  const frame =
    texture(chosen.frame, "center_frame_sp") ||
    texture(base, "center_frame_sp");
  const frameSize = (
    chosen.frame?.textures.find((t) => t.name === "center_frame_sp") ||
    base?.textures.find((t) => t.name === "center_frame_sp")
  )?.size || [1922, 1082];
  const line = 730 - lift;
  const phase = tick % loopMs;
  const hitAge = phase - dropMs;
  const dropping = hitAge < 0;
  const noteY = (line * phase) / dropMs;
  const beamProgress = Math.min(1, Math.max(0, hitAge / 100));
  const beamWidth = 1 - 0.7 * beamProgress ** 3;
  const judgeFrame = Math.floor((hitAge * 60) / 1000);
  const judgeColor = ((judgeFrame % 3) + 3) % 3;
  const isLightning = chosen.note_beam?.textures.some(
    (t) => t.name === "lightning_00",
  );
  const beamScale =
    ({ short: 0.8, veryshort: 0.35, long: 1.84 } as Record<string, number>)[
      chosen.note_beam?.variant || ""
    ] || 1;
  const charge =
    chosen.disable_hcn_color?.id === 1
      ? chosen.cn_color
      : chosen.hcn || chosen.cn_color;
  const holdLength = 125;
  const capHalf = 13;
  const holdTail = noteY;
  const holdHead = Math.min(line, holdTail + holdLength);
  const burst = chosen.note_burst?.textures;
  const burstFrame =
    burst?.[
      Math.floor((hitAge * (chosen.note_burst?.id === 15 ? 30 : 60)) / 1000)
    ];
  const scale = burstSize / 100;
  return (
    <svg
      data-testid="theme-lane"
      role="img"
      aria-label="IIDX 1P 谱道组合预览"
      viewBox="0 0 442 955"
      className="block w-full bg-neutral-950"
    >
      <defs>
        <clipPath id="theme-visible-lane">
          <rect x="2" y={sudden} width="438" height={line - sudden} />
        </clipPath>
      </defs>
      <rect width="442" height="730" fill="#111" />
      {lane && (
        <image
          href={lane}
          width="442"
          height="730"
          preserveAspectRatio="none"
        />
      )}
      <g clipPath="url(#theme-visible-lane)">
        {hitAge >= 0 &&
          (isLightning ? judgeFrame < 13 : hitAge < 100) &&
          demoLanes.map((hit) => {
            const name = isLightning
              ? `lightning_0${judgeFrame % 4}`
              : hit === 0
                ? "playm_bar_turn"
                : hit % 2
                  ? "playm_bar_white"
                  : "playm_bar_black";
            const sprite = chosen.note_beam?.textures.find(
              (t) => t.name === name,
            );
            if (!sprite) return null;
            const height = sprite.size[1] * beamScale;
            const width = isLightning
              ? sprite.size[0]
              : widths[hit] * beamWidth;
            return (
              <image
                key={hit}
                data-theme-effect="beam"
                href={new URL(sprite.file, root).href}
                x={x[hit] + (widths[hit] - width) / 2}
                y={line - height}
                width={width}
                height={height}
                preserveAspectRatio="none"
                opacity=".8"
              />
            );
          })}
        {dropping &&
          demoLanes.map((col) => {
            const name =
              col === 0
                ? "notes_turn"
                : col % 2
                  ? "notes_white"
                  : "notes_black";
            const t = chosen.note_skin?.textures.find((t) => t.name === name);
            if (chosen.first_note_preview?.id === 2 && phase === 0) return null;
            return t ? (
              <image
                key={col}
                href={texture(chosen.note_skin, name)}
                x={x[col]}
                y={noteY - t.size[1]}
                width={widths[col]}
                height={t.size[1]}
              />
            ) : null;
          })}
        {dropping && (
          <>
            <image
              href={texture(charge, "notes_cn_white_beam0")}
              x={x[5]}
              y={holdTail}
              width={widths[5]}
              height={holdHead - holdTail}
              preserveAspectRatio="none"
            />
            <image
              data-testid="theme-hold-head"
              href={texture(charge, "notes_cn_white_start")}
              x={x[5]}
              y={holdHead - capHalf}
              width={widths[5]}
              height="26"
            />
            <image
              data-testid="theme-hold-tail"
              href={texture(charge, "notes_cn_white_end")}
              x={x[5]}
              y={holdTail - capHalf}
              width={widths[5]}
              height="26"
            />
          </>
        )}
      </g>
      {sudden > 0 && (
        <svg
          x="3"
          width="436"
          height={sudden}
          viewBox={`0 ${726 - sudden} 434 ${sudden}`}
          preserveAspectRatio="none"
        >
          <image
            href={texture(chosen.lane_cover)}
            width="434"
            height="726"
            preserveAspectRatio="none"
          />
        </svg>
      )}
      {lift > 0 && (
        <svg
          x="3"
          y={line}
          width="436"
          height={lift}
          viewBox={`0 0 434 ${lift}`}
          preserveAspectRatio="none"
        >
          <image
            href={texture(chosen.lift_cover)}
            width="434"
            height="726"
            preserveAspectRatio="none"
          />
        </svg>
      )}
      <rect x="3" y={line - 3} width="436" height="4" fill="#f04b59" />
      {burstFrame &&
        demoLanes.map((hit) => (
          <image
            key={hit}
            href={new URL(burstFrame.file, root).href}
            x={x[hit] + widths[hit] / 2 - (burstFrame.size[0] * scale) / 2}
            y={line - (burstFrame.size[1] * scale) / 2}
            width={burstFrame.size[0] * scale}
            height={burstFrame.size[1] * scale}
            style={{ mixBlendMode: "screen" }}
          />
        ))}
      {judgeFrame >= 0 && judgeFrame < 24 && (
        <>
          <image
            href={
              texture(
                chosen.judge_font,
                [
                  "judge_p_great_blue",
                  "judge_p_great_pink",
                  "judge_p_great_white",
                ][judgeColor],
              ) || texture(chosen.judge_font, "judge_great_yellow")
            }
            x="125"
            y={line - 234}
            width="192"
            height="78"
          />
          <image
            href={texture(
              chosen.judge_font,
              ["judge_combo_3b", "judge_combo_3r", "judge_combo_3g"][
                judgeColor
              ],
            )}
            x="307"
            y={line - 234}
            width="55"
            height="78"
          />
        </>
      )}
      {frame && (
        <svg
          y="798"
          width="442"
          height="157"
          viewBox={`${frameSize[0] * 0.385} ${frameSize[1] * 0.86} ${frameSize[0] * 0.23} ${frameSize[1] * 0.14}`}
          preserveAspectRatio="none"
        >
          <image href={frame} width={frameSize[0]} height={frameSize[1]} />
        </svg>
      )}
      <circle
        cx="47"
        cy="765"
        r="32"
        fill="#17171b"
        stroke="#858590"
        strokeWidth="3"
      />
      <image
        href={texture(chosen.turntable)}
        x="25"
        y="743"
        width="44"
        height="44"
        transform={`rotate(${(tick * 0.36) % 360} 47 765)`}
      />
      {widths.slice(1).map((w, n) => (
        <rect
          key={n}
          x={x[n + 1] + 3}
          y="741"
          width={w - 6}
          height={n % 2 ? 30 : 47}
          rx="3"
          fill={
            hitAge >= 0 && hitAge < 100 && demoLanes.includes(n + 1)
              ? "#9f85ef"
              : n % 2
                ? "#37373e"
                : "#cbccd2"
          }
          stroke="#676771"
        />
      ))}
    </svg>
  );
}

export default function ThemeComposer({
  active,
  catalog,
  root,
  version,
  setVersion,
  inspect,
}: {
  active: boolean;
  catalog: Catalog;
  root: URL;
  version: string;
  setVersion: (v: string) => void;
  inspect: (group: string, key: string) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [variants, setVariants] = useState<Record<string, string>>({});
  const [burst, setBurst] = useState("100");
  const [sudden, setSudden] = useState(52);
  const [lift, setLift] = useState(44);
  const [animate, setAnimate] = useState(
    () => !matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [preview, setPreview] = useState("");
  const groups = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(catalog.groups).map(([g, items]) => [
          g,
          items.filter((i) => String(i.version) === version),
        ]),
      ),
    [catalog, version],
  );
  const base = groups.frame?.find((i) => i.source === `gmframe${version}.ifs`);
  const chosen: Record<string, Item | undefined> = {};
  const options: Record<string, Item[]> = {};
  for (const group of order) {
    const all = groups[group] || [];
    const seen = new Set<number>();
    const list = (
      group === "frame" && base ? [base, ...all.filter((i) => i !== base)] : all
    ).filter((i) => {
      if (sizes.has(group) && i.variant) return false;
      if (i.id === null)
        return (
          group === "frame" &&
          i.textures.some((t) => t.name === "center_frame_sp")
        );
      if (seen.has(i.id)) return false;
      seen.add(i.id);
      return true;
    });
    options[group] = list;
    const item = list.find((i) => i.key === values[group]) || list[0];
    chosen[group] =
      sizes.has(group) && variants[group]
        ? all.find((i) => i.id === item?.id && i.variant === variants[group]) ||
          item
        : item;
  }
  chosen.hcn = groups.hcn?.find(
    (i) =>
      i.id === chosen.cn_color?.id && i.variant === chosen.cn_color?.variant,
  );
  const still = chosen[preview];
  const stillTexture = still?.textures.reduce<
    Item["textures"][number] | undefined
  >(
    (best, t) =>
      !best || t.size[0] * t.size[1] > best.size[0] * best.size[1] ? t : best,
    undefined,
  );
  return (
    <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>Theme 设置</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Picker
            label="资源版本"
            value={version}
            items={[
              { value: "33", label: "33 · Sparkle Shower" },
              { value: "34", label: "34 · ZINRAI" },
            ]}
            onChange={(v) => {
              setVersion(v);
              setValues({});
              setVariants({});
              setPreview("");
            }}
          />
          {order.map((group) => {
            const item = chosen[group];
            const list = options[group];
            const selected =
              list.find((i) => i.key === values[group]) || list[0];
            const sizeItems = (groups[group] || []).filter(
              (i) => i.id === item?.id,
            );
            return (
              <div
                key={group}
                className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-end gap-2"
              >
                <div className="min-w-0">
                  {list.length ? (
                    <Picker
                      label={labels[group]}
                      value={selected.key}
                      items={list.map((i) => ({
                        value: i.key,
                        label: `${i.id === null ? "" : i.id + " · "}${i.name}`,
                      }))}
                      onChange={(v) => {
                        setValues((p) => ({ ...p, [group]: v }));
                        setVariants((p) => ({ ...p, [group]: "" }));
                        if (!independent.has(group)) setPreview("");
                      }}
                    />
                  ) : (
                    <Field>
                      <FieldLabel>{labels[group]}</FieldLabel>
                      <Button variant="outline" disabled>
                        无已核实的独立设置
                      </Button>
                    </Field>
                  )}
                </div>
                <div className="flex items-end gap-1">
                  {group === "note_burst" && (
                    <Picker
                      label="Burst Size"
                      value={burst}
                      items={["70", "80", "90", "100", "110", "120", "130"].map(
                        (value) => ({
                          value,
                          label: value + "%",
                        }),
                      )}
                      onChange={setBurst}
                    />
                  )}
                  {sizes.has(group) && sizeItems.length > 1 && (
                    <Picker
                      label={labels[group] + " Size"}
                      value={item?.variant || "default"}
                      items={sizeItems.map((i) => ({
                        value: i.variant || "default",
                        label:
                          (
                            {
                              long: "Large",
                              short: "Small",
                              veryshort: "Tiny",
                            } as Record<string, string>
                          )[i.variant] || "Default",
                      }))}
                      onChange={(v) =>
                        setVariants((p) => ({
                          ...p,
                          [group]: v === "default" ? "" : v,
                        }))
                      }
                    />
                  )}
                  {independent.has(group) && item?.textures.length ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPreview(group)}
                    >
                      预览
                    </Button>
                  ) : null}
                  {item && (
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={labels[group] + " 素材和设置 ID"}
                      onClick={() => inspect(group, item.key)}
                    >
                      素材
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
      <Card className="order-first min-w-0 lg:order-none lg:sticky lg:top-20">
        <CardHeader>
          <CardTitle>{still ? labels[preview] : "1P 实时预览"}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {still ? (
            <>
              {stillTexture && (
                <img
                  src={new URL(stillTexture.file, root).href}
                  alt={still.name}
                  className="max-h-80 w-full object-contain"
                />
              )}
              <Button variant="outline" onClick={() => setPreview("")}>
                返回谱道预览
              </Button>
            </>
          ) : (
            <>
              <div className="mx-auto w-full max-w-[min(100%,28vh)] overflow-hidden rounded-md border">
                <Lane
                  chosen={chosen}
                  base={base}
                  root={root}
                  sudden={sudden}
                  lift={lift}
                  animate={active && animate}
                  burstSize={Number(burst)}
                />
              </div>
              <label className="grid gap-1 text-sm">
                SUDDEN+ 高度（仅预览）
                <input
                  type="range"
                  min="0"
                  max="270"
                  value={sudden}
                  onChange={(e) => setSudden(+e.target.value)}
                />
              </label>
              <label className="grid gap-1 text-sm">
                LIFT 高度（仅预览）
                <input
                  type="range"
                  min="0"
                  max="270"
                  value={lift}
                  onChange={(e) => setLift(+e.target.value)}
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={animate}
                  onChange={(e) => setAnimate(e.target.checked)}
                />
                播放谱道动画
              </label>
            </>
          )}
          <p className="text-xs text-muted-foreground">
            使用本地素材模拟显示。尺寸与动效仅供预览。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
