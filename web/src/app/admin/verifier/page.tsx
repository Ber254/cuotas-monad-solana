import { notFound } from "next/navigation";
import { OwnerTools } from "@/components/OwnerTools";

export const dynamic = "force-dynamic";

/**
 * Herramienta local para que el OWNER del contrato cambie el `verifier` firmando con su wallet (sin exportar
 * claves). Solo existe si se arranca con NEXT_PUBLIC_ENABLE_OWNER_TOOLS=1 (desarrollo/ops); en producción da 404.
 */
export default function VerifierAdminPage() {
  if (process.env.NEXT_PUBLIC_ENABLE_OWNER_TOOLS !== "1") notFound();
  return <OwnerTools />;
}
