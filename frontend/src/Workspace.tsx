import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  HomeIcon,
  Music2Icon,
  UserRoundIcon,
  PaintbrushIcon,
} from "lucide-react";
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Skeleton } from "@/components/ui/skeleton";

const Charts = lazy(() => import("./App.tsx"));
const Qpro = lazy(() => import("./Qpro.tsx"));
const Theme = lazy(() => import("./Theme.tsx"));
type Module = "home" | "charts" | "qpro" | "theme";
type Asset = { id: string; file: string; size: number[] };
type Catalog = Record<string, Asset[]>;
const modules = [
  {
    id: "charts" as const,
    title: "谱面预览",
    icon: Music2Icon,
    description: "曲库、排列模拟、小节谱面与六维雷达",
  },
  {
    id: "qpro" as const,
    title: "Qpro",
    icon: UserRoundIcon,
    description: "角色换装、随机搭配与组合预览",
  },
  {
    id: "theme" as const,
    title: "Theme",
    icon: PaintbrushIcon,
    description: "Frame、Turntable、Notes 与其他自定义素材",
  },
];
function currentModule(): Module {
  const m = new URL(location.href).searchParams.get("module");
  return ["home", "charts", "qpro", "theme"].includes(m || "")
    ? (m as Module)
    : location.hash.includes("key=")
      ? "charts"
      : "home";
}
export default function Workspace() {
  const [module, setModule] = useState<Module>(currentModule);
  const nav = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!nav.current) return;
    const element = nav.current;
    const observer = new ResizeObserver(() =>
      document.documentElement.style.setProperty(
        "--workspace-nav-height",
        element.getBoundingClientRect().height + "px",
      ),
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty("--workspace-nav-height");
    };
  }, []);
  useEffect(() => {
    const sync = () => setModule(currentModule());
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  function navigate(next: Module) {
    const url = new URL(location.href);
    url.searchParams.set("module", next);
    history.pushState(null, "", url);
    setModule(next);
    window.scrollTo(0, 0);
  }
  return (
    <div className="flex min-h-svh flex-col">
      <header
        ref={nav}
        className="workspace-nav flex flex-wrap items-center gap-3 border-b bg-background px-4 py-3"
      >
        <Button variant="ghost" onClick={() => navigate("home")}>
          <HomeIcon data-icon="inline-start" />
          IIDXLab
        </Button>
        <ToggleGroup
          variant="outline"
          className="max-w-full flex-wrap"
          aria-label="模块导航"
          value={module === "home" ? [] : [module]}
          onValueChange={(v) => v[0] && navigate(v[0] as Module)}
        >
          {modules.map((m) => (
            <ToggleGroupItem key={m.id} value={m.id}>
              <m.icon />
              {m.id === "theme" ? "Theme (Experiamental)" : m.title}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </header>
      <div className="min-w-0 flex-1">
        {module === "home" ? (
          <main className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-12 lg:py-20">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-semibold tracking-tight">IIDXLab</h1>
              <p className="text-muted-foreground">选择一个模块</p>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {modules.map((m) => (
                <Card key={m.id}>
                  <CardHeader>
                    <m.icon className="mb-4 size-8" />
                    <CardTitle>{m.title}</CardTitle>
                    <CardDescription>{m.description}</CardDescription>
                  </CardHeader>
                  <CardFooter>
                    <Button className="w-full" onClick={() => navigate(m.id)}>
                      打开{m.title}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </main>
        ) : module === "charts" ? (
          <Suspense
            fallback={
              <div className="p-8">
                <Skeleton className="h-96 w-full" />
              </div>
            }
          >
            <Charts />
          </Suspense>
        ) : module === "qpro" ? (
          <Suspense
            fallback={
              <div className="p-8">
                <Skeleton className="h-96 w-full" />
              </div>
            }
          >
            <Qpro />
          </Suspense>
        ) : (
          <Suspense fallback={<Skeleton className="m-8 h-96" />}>
            <Theme />
          </Suspense>
        )}
      </div>
    </div>
  );
}
