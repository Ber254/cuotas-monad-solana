# docs/progress — continuidad entre agentes

Esta carpeta es la **fuente de verdad** del estado del proyecto. Devin y Claude Code trabajan alternadamente: nadie debe depender de conocimiento que solo esté en una conversación.

## Orden de lectura

1. [STATUS.md](STATUS.md) — qué funciona, qué falta, cómo correr y probar.
2. [NEXT_TASK.md](NEXT_TASK.md) — la próxima tarea concreta. Empezá por acá si vas a programar.
3. [ARCHITECTURE.md](ARCHITECTURE.md) — componentes, modelo de datos, qué hace Monad y qué hace Solana.
4. [DECISIONS.md](DECISIONS.md) — decisiones técnicas y por qué. No cambiarlas sin registrar el motivo.
5. [ROADMAP.md](ROADMAP.md) — etapas del MVP y su estado.

## Reglas al terminar una tarea

- Actualizar **siempre** `STATUS.md` (sección "Última tarea realizada" incluida) y reescribir `NEXT_TASK.md` con UNA tarea concreta.
- Si tomaste una decisión arquitectónica, agregarla a `DECISIONS.md` (numerada, con fecha y motivo).
- Marcar la etapa en `ROADMAP.md` como ✅ solo si fue **probada** (tests o verificación manual documentada).
- Si algo quedó incompleto o roto, escribirlo explícitamente en `STATUS.md`.
- Si cambiás el contrato: correr `forge test` y `./scripts/export-abi.sh` (regenera el ABI que usa la web).
