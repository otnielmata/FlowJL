import { ModulePage } from "@/components/layout/module-page";

type CatchAllPageProps = {
  params: Promise<{
    slug?: string[];
  }>;
};

export default async function CatchAllPage({ params }: CatchAllPageProps) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug ?? ["dashboard"];
  const path = `/${slug.join("/")}`;

  return <ModulePage key={path} path={path} />;
}
