import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  challenges,
  challengeParticipants,
  users,
  friendships,
  groupMembers,
  exercises,
  competitionGroups,
} from "@/db/schema";
import { eq, and, or, sql } from "drizzle-orm";
import { createNotification } from "@/lib/notifications";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "No autorizado" }, { status: 401 });

  const creatorId = Number(session.user.id);
  const body = await req.json();
  const { type, targetUserId, groupId, exerciseId, title, description, deadline, rewardCoins } = body;

  if (!type || !["FRIEND", "GROUP"].includes(type)) {
    return Response.json({ error: "Tipo inválido" }, { status: 400 });
  }
  if (!title || !title.trim()) {
    return Response.json({ error: "Título requerido" }, { status: 400 });
  }
  if (!rewardCoins || rewardCoins <= 0) {
    return Response.json({ error: "rewardCoins debe ser mayor a 0" }, { status: 400 });
  }

  let participantUserIds: number[] = [];

  if (type === "FRIEND") {
    if (!targetUserId) return Response.json({ error: "targetUserId requerido" }, { status: 400 });
    if (targetUserId === creatorId) return Response.json({ error: "No puedes retarte a ti mismo" }, { status: 400 });

    const target = await db.query.users.findFirst({ where: eq(users.id, targetUserId) });
    if (!target) return Response.json({ error: "Usuario no encontrado" }, { status: 404 });

    const friendship = await db.query.friendships.findFirst({
      where: and(
        or(
          and(eq(friendships.requesterId, creatorId), eq(friendships.addresseeId, targetUserId)),
          and(eq(friendships.requesterId, targetUserId), eq(friendships.addresseeId, creatorId))
        ),
        eq(friendships.status, "ACCEPTED")
      ),
    });
    if (!friendship) return Response.json({ error: "No son amigos" }, { status: 400 });

    participantUserIds = [targetUserId];
  } else {
    if (!groupId) return Response.json({ error: "groupId requerido" }, { status: 400 });

    const membership = await db.query.groupMembers.findFirst({
      where: and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, creatorId)),
    });
    if (!membership) return Response.json({ error: "No eres miembro del grupo" }, { status: 400 });

    const members = await db.query.groupMembers.findMany({
      where: eq(groupMembers.groupId, groupId),
    });
    participantUserIds = members.map((m) => m.userId).filter((id) => id !== creatorId);
    if (participantUserIds.length === 0) {
      return Response.json({ error: "El grupo no tiene otros miembros" }, { status: 400 });
    }
  }

  const stakeTotalCoins = rewardCoins * participantUserIds.length;

  const creator = await db.query.users.findFirst({ where: eq(users.id, creatorId) });
  if (!creator || creator.coins < stakeTotalCoins) {
    return Response.json({ error: "Monedas insuficientes" }, { status: 400 });
  }

  const result = await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ coins: sql`${users.coins} - ${stakeTotalCoins}` })
      .where(eq(users.id, creatorId));

    const [challenge] = await tx
      .insert(challenges)
      .values({
        type,
        creatorId,
        groupId: type === "GROUP" ? groupId : null,
        exerciseId: exerciseId || null,
        title: title.trim(),
        description: description || null,
        rewardCoins,
        deadline: deadline ? new Date(deadline) : null,
        status: "ACTIVE",
      })
      .returning();

    const participantRows = participantUserIds.map((userId) => ({
      challengeId: challenge.id,
      userId,
      status: "PENDING" as const,
      settled: false,
    }));

    await tx.insert(challengeParticipants).values(participantRows);

    // Notify each participant that they received a challenge
    for (const pid of participantUserIds) {
      await createNotification(tx, {
        userId: pid,
        type: "CHALLENGE_RECEIVED",
        title: `Te retaron: ${title.trim()}`,
        body: `Tienes un nuevo reto con recompensa de ${rewardCoins} monedas`,
        linkUrl: "/",
      });
    }

    return challenge;
  });

  return Response.json(result, { status: 201 });
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "No autorizado" }, { status: 401 });

  const userId = Number(session.user.id);

  const asParticipant = await db
    .select({
      participantId: challengeParticipants.id,
      participantStatus: challengeParticipants.status,
      videoUrl: challengeParticipants.videoUrl,
      challengeId: challenges.id,
      title: challenges.title,
      type: challenges.type,
      rewardCoins: challenges.rewardCoins,
      challengeStatus: challenges.status,
      creatorId: challenges.creatorId,
      exerciseId: challenges.exerciseId,
      groupId: challenges.groupId,
      deadline: challenges.deadline,
    })
    .from(challengeParticipants)
    .innerJoin(challenges, eq(challengeParticipants.challengeId, challenges.id))
    .where(eq(challengeParticipants.userId, userId));

  const creatorIds = [...new Set(asParticipant.map((r) => r.creatorId))];
  const exerciseIds = [...new Set(asParticipant.map((r) => r.exerciseId).filter(Boolean))] as number[];
  const groupIds = [...new Set(asParticipant.map((r) => r.groupId).filter(Boolean))] as number[];

  const asCreator = await db
    .select({
      challengeId: challenges.id,
      title: challenges.title,
      type: challenges.type,
      rewardCoins: challenges.rewardCoins,
      challengeStatus: challenges.status,
      exerciseId: challenges.exerciseId,
      groupId: challenges.groupId,
      deadline: challenges.deadline,
      participantId: challengeParticipants.id,
      participantUserId: challengeParticipants.userId,
      participantStatus: challengeParticipants.status,
      participantVideoUrl: challengeParticipants.videoUrl,
      participantSettled: challengeParticipants.settled,
    })
    .from(challenges)
    .innerJoin(challengeParticipants, eq(challengeParticipants.challengeId, challenges.id))
    .where(eq(challenges.creatorId, userId));

  const creatorParticipantUserIds = [...new Set(asCreator.map((r) => r.participantUserId))];
  const creatorExerciseIds = [...new Set(asCreator.map((r) => r.exerciseId).filter(Boolean))] as number[];
  const creatorGroupIds = [...new Set(asCreator.map((r) => r.groupId).filter(Boolean))] as number[];

  const allUserIds = [...new Set([...creatorIds, ...creatorParticipantUserIds])];
  const allExerciseIds = [...new Set([...exerciseIds, ...creatorExerciseIds])];
  const allGroupIds = [...new Set([...groupIds, ...creatorGroupIds])];

  const userMap = new Map<number, { id: number; username: string }>();
  if (allUserIds.length > 0) {
    for (const uid of allUserIds) {
      const u = await db
        .select({ id: users.id, username: users.username })
        .from(users)
        .where(eq(users.id, uid));
      if (u[0]) userMap.set(u[0].id, u[0]);
    }
  }

  const exerciseMap = new Map<number, string>();
  if (allExerciseIds.length > 0) {
    for (const eid of allExerciseIds) {
      const e = await db.select({ id: exercises.id, name: exercises.name }).from(exercises).where(eq(exercises.id, eid));
      if (e[0]) exerciseMap.set(e[0].id, e[0].name);
    }
  }

  const groupMap = new Map<number, string>();
  if (allGroupIds.length > 0) {
    for (const gid of allGroupIds) {
      const g = await db
        .select({ id: competitionGroups.id, name: competitionGroups.name })
        .from(competitionGroups)
        .where(eq(competitionGroups.id, gid));
      if (g[0]) groupMap.set(g[0].id, g[0].name);
    }
  }

  const participantChallenges = asParticipant.map((r) => ({
    participantId: r.participantId,
    participantStatus: r.participantStatus,
    videoUrl: r.videoUrl,
    challengeId: r.challengeId,
    title: r.title,
    type: r.type,
    rewardCoins: r.rewardCoins,
    challengeStatus: r.challengeStatus,
    deadline: r.deadline,
    creatorUsername: userMap.get(r.creatorId)?.username || "",
    exerciseName: r.exerciseId ? exerciseMap.get(r.exerciseId) || null : null,
    groupName: r.groupId ? groupMap.get(r.groupId) || null : null,
  }));

  const creatorChallengesMap = new Map<number, {
    challengeId: number;
    title: string;
    type: string;
    rewardCoins: number;
    challengeStatus: string;
    exerciseName: string | null;
    groupName: string | null;
    deadline: Date | null;
    participants: {
      participantId: number;
      userId: number;
      username: string;
      status: string;
      videoUrl: string | null;
      settled: boolean | null;
    }[];
  }>();

  for (const r of asCreator) {
    if (!creatorChallengesMap.has(r.challengeId)) {
      creatorChallengesMap.set(r.challengeId, {
        challengeId: r.challengeId,
        title: r.title,
        type: r.type,
        rewardCoins: r.rewardCoins,
        challengeStatus: r.challengeStatus,
        exerciseName: r.exerciseId ? exerciseMap.get(r.exerciseId) || null : null,
        groupName: r.groupId ? groupMap.get(r.groupId) || null : null,
        deadline: r.deadline,
        participants: [],
      });
    }
    creatorChallengesMap.get(r.challengeId)!.participants.push({
      participantId: r.participantId,
      userId: r.participantUserId,
      username: userMap.get(r.participantUserId)?.username || "",
      status: r.participantStatus,
      videoUrl: r.participantVideoUrl,
      settled: r.participantSettled,
    });
  }

  return Response.json({
    asParticipant: participantChallenges,
    asCreator: Array.from(creatorChallengesMap.values()),
  });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "No autorizado" }, { status: 401 });

  const userId = Number(session.user.id);
  const body = await req.json();
  const { challengeId, participantId, action, videoUrl } = body;

  if (action === "close") {
    const challenge = await db.query.challenges.findFirst({ where: eq(challenges.id, challengeId) });
    if (!challenge) return Response.json({ error: "Reto no encontrado" }, { status: 404 });
    if (challenge.creatorId !== userId) return Response.json({ error: "Solo el creador puede cerrar" }, { status: 403 });
    if (challenge.status === "CLOSED") return Response.json({ error: "El reto ya está cerrado" }, { status: 400 });

    await db.transaction(async (tx) => {
      const unsettled = await tx
        .select()
        .from(challengeParticipants)
        .where(and(eq(challengeParticipants.challengeId, challengeId), eq(challengeParticipants.settled, false)));

      const returnCoins = unsettled.length * challenge.rewardCoins;

      if (returnCoins > 0) {
        await tx
          .update(users)
          .set({ coins: sql`${users.coins} + ${returnCoins}` })
          .where(eq(users.id, userId));
      }

      if (unsettled.length > 0) {
        await tx
          .update(challengeParticipants)
          .set({ settled: true })
          .where(and(eq(challengeParticipants.challengeId, challengeId), eq(challengeParticipants.settled, false)));
      }

      await tx.update(challenges).set({ status: "CLOSED" }).where(eq(challenges.id, challengeId));
    });

    return Response.json({ success: true });
  }

  const participant = await db.query.challengeParticipants.findFirst({
    where: eq(challengeParticipants.id, participantId),
  });
  if (!participant) return Response.json({ error: "Participante no encontrado" }, { status: 404 });

  const challenge = await db.query.challenges.findFirst({ where: eq(challenges.id, participant.challengeId) });
  if (!challenge) return Response.json({ error: "Reto no encontrado" }, { status: 404 });

  if (challenge.status === "CLOSED") return Response.json({ error: "El reto está cerrado" }, { status: 400 });

  if (action === "accept") {
    if (participant.userId !== userId) return Response.json({ error: "No autorizado" }, { status: 403 });
    if (participant.status !== "PENDING") return Response.json({ error: "Estado inválido" }, { status: 400 });

    await db.update(challengeParticipants).set({ status: "ACCEPTED" }).where(eq(challengeParticipants.id, participantId));
    return Response.json({ success: true });
  }

  if (action === "decline") {
    if (participant.userId !== userId) return Response.json({ error: "No autorizado" }, { status: 403 });
    if (participant.status !== "PENDING") return Response.json({ error: "Estado inválido" }, { status: 400 });

    await db.transaction(async (tx) => {
      await tx
        .update(challengeParticipants)
        .set({ status: "DECLINED", settled: true })
        .where(eq(challengeParticipants.id, participantId));
      await tx
        .update(users)
        .set({ coins: sql`${users.coins} + ${challenge.rewardCoins}` })
        .where(eq(users.id, challenge.creatorId));
    });
    return Response.json({ success: true });
  }

  if (action === "submit") {
    if (participant.userId !== userId) return Response.json({ error: "No autorizado" }, { status: 403 });
    if (participant.status !== "ACCEPTED" && participant.status !== "REJECTED") {
      return Response.json({ error: "Estado inválido" }, { status: 400 });
    }
    if (!videoUrl) return Response.json({ error: "videoUrl requerido" }, { status: 400 });

    await db
      .update(challengeParticipants)
      .set({ status: "SUBMITTED", videoUrl, submittedAt: new Date() })
      .where(eq(challengeParticipants.id, participantId));
    return Response.json({ success: true });
  }

  if (action === "validate") {
    if (challenge.creatorId !== userId) return Response.json({ error: "Solo el creador puede validar" }, { status: 403 });
    if (participant.status !== "SUBMITTED") return Response.json({ error: "Estado inválido" }, { status: 400 });

    await db.transaction(async (tx) => {
      await tx
        .update(challengeParticipants)
        .set({ status: "VALIDATED", validatedAt: new Date(), settled: true })
        .where(eq(challengeParticipants.id, participantId));
      await tx
        .update(users)
        .set({ coins: sql`${users.coins} + ${challenge.rewardCoins}` })
        .where(eq(users.id, participant.userId));
      await createNotification(tx, {
        userId: participant.userId,
        type: "CHALLENGE_VALIDATED",
        title: "Tu reto fue validado",
        body: `+${challenge.rewardCoins} monedas por "${challenge.title}"`,
        linkUrl: "/",
      });
    });
    return Response.json({ success: true });
  }

  if (action === "reject") {
    if (challenge.creatorId !== userId) return Response.json({ error: "Solo el creador puede rechazar" }, { status: 403 });
    if (participant.status !== "SUBMITTED") return Response.json({ error: "Estado inválido" }, { status: 400 });

    await db.transaction(async (tx) => {
      await tx
        .update(challengeParticipants)
        .set({ status: "REJECTED" })
        .where(eq(challengeParticipants.id, participantId));
      await createNotification(tx, {
        userId: participant.userId,
        type: "CHALLENGE_REJECTED",
        title: "Tu envío fue rechazado",
        body: `El creador rechazó tu vídeo para "${challenge.title}"`,
        linkUrl: "/",
      });
    });
    return Response.json({ success: true });
  }

  return Response.json({ error: "Acción inválida" }, { status: 400 });
}
