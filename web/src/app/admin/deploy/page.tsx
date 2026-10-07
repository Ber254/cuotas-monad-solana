import { notFound } from "next/navigation";
import { DeployTools } from "@/components/DeployTools";

export const dynamic = "force-dynamic";

/** Despliegue del contrato firmando con la wallet (sin exportar claves). Solo con NEXT_PUBLIC_ENABLE_OWNER_TOOLS=1. */
export default function DeployPage() {
  if (process.env.NEXT_PUBLIC_ENABLE_OWNER_TOOLS !== "1") notFound();
  return <DeployTools />;
}
