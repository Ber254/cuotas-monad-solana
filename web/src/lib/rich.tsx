import type { ReactNode } from "react";

/** Convierte "texto <b>negrita</b> y <code>código</code>" en nodos React (solo esas dos etiquetas). */
export function rich(text: string): ReactNode[] {
  return text.split(/(<b>.*?<\/b>|<code>.*?<\/code>)/g).filter(Boolean).map((part, i) => {
    if (part.startsWith("<b>")) return <b key={i}>{part.slice(3, -4)}</b>;
    if (part.startsWith("<code>")) return <code key={i}>{part.slice(6, -7)}</code>;
    return part;
  });
}
