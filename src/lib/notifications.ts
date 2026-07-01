import { db } from "@/db";
import { notifications } from "@/db/schema";

/**
 * Tipo compatible con `db` y con el parámetro `tx` del callback de
 * `db.transaction(async (tx) => { ... })`. Ambos exponen `.insert()`,
 * así que modelamos solo lo que necesitamos: la firma de insert de Drizzle.
 */
type DbOrTx = Pick<typeof db, "insert">;

/**
 * Inserta una notificación en la tabla `notifications`.
 *
 * Acepta tanto la instancia global `db` como el objeto `tx` recibido dentro
 * de `db.transaction(...)`, por lo que la operación puede participar en la
 * misma transacción que el evento que la dispara, garantizando atomicidad.
 */
export async function createNotification(
  tx: DbOrTx,
  input: {
    userId: number;
    type: string;
    title: string;
    body?: string;
    linkUrl?: string;
  },
) {
  await tx.insert(notifications).values({
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    linkUrl: input.linkUrl ?? null,
  });
}
