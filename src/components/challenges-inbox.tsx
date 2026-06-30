"use client";

import { useState, useEffect, useRef } from "react";
import { Swords, Check, X, Upload, Trophy, Ban } from "lucide-react";

interface ParticipantChallenge {
  participantId: number;
  participantStatus: string;
  videoUrl: string | null;
  challengeId: number;
  title: string;
  type: string;
  rewardCoins: number;
  challengeStatus: string;
  creatorUsername: string;
  exerciseName: string | null;
  groupName: string | null;
}

interface CreatorParticipant {
  participantId: number;
  userId: number;
  username: string;
  status: string;
  videoUrl: string | null;
  settled: boolean | null;
}

interface CreatorChallenge {
  challengeId: number;
  title: string;
  type: string;
  rewardCoins: number;
  challengeStatus: string;
  exerciseName: string | null;
  groupName: string | null;
  participants: CreatorParticipant[];
}

export function ChallengesInbox({ userId }: { userId: number }) {
  const [participantChallenges, setParticipantChallenges] = useState<ParticipantChallenge[]>([]);
  const [creatorChallenges, setCreatorChallenges] = useState<CreatorChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadId, setActiveUploadId] = useState<number | null>(null);

  const loadChallenges = async () => {
    const res = await fetch("/api/challenges");
    if (res.ok) {
      const data = await res.json();
      setParticipantChallenges(data.asParticipant || []);
      setCreatorChallenges(data.asCreator || []);
    }
    setLoading(false);
  };

  useEffect(() => { loadChallenges(); }, []);

  const doAction = async (body: Record<string, unknown>) => {
    await fetch("/api/challenges", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    loadChallenges();
  };

  const handleVideoUpload = async (participantId: number, file: File) => {
    setUploading(participantId);
    const formData = new FormData();
    formData.append("video", file);
    const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
    const uploadData = await uploadRes.json();
    if (uploadData.url) {
      await doAction({ participantId, action: "submit", videoUrl: uploadData.url });
    }
    setUploading(null);
  };

  const triggerUpload = (participantId: number) => {
    setActiveUploadId(participantId);
    fileInputRef.current?.click();
  };

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeUploadId) {
      handleVideoUpload(activeUploadId, file);
    }
    e.target.value = "";
  };

  if (loading) return null;

  const hasContent = participantChallenges.length > 0 || creatorChallenges.length > 0;
  if (!hasContent) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-2xl tracking-wide">Retos</h2>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={onFileSelected}
      />

      {participantChallenges.map((c) => (
        <div key={c.participantId} className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Swords className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">{c.title}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                De {c.creatorUsername} · {c.type === "GROUP" && c.groupName ? c.groupName : "1v1"}
                {c.exerciseName && ` · ${c.exerciseName}`}
              </p>
            </div>
            <span className="text-xs font-bold text-primary">{c.rewardCoins} monedas</span>
          </div>

          {c.challengeStatus === "CLOSED" || c.participantStatus === "VALIDATED" || c.participantStatus === "DECLINED" ? (
            <div className="flex items-center gap-2">
              {c.participantStatus === "VALIDATED" ? (
                <span className="flex items-center gap-1 rounded-full bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-500">
                  <Trophy className="h-3.5 w-3.5" /> Completado · +{c.rewardCoins} monedas
                </span>
              ) : c.participantStatus === "DECLINED" ? (
                <span className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                  <Ban className="h-3.5 w-3.5" /> Rechazado
                </span>
              ) : (
                <span className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                  Cerrado
                </span>
              )}
            </div>
          ) : c.participantStatus === "PENDING" ? (
            <div className="flex gap-2">
              <button
                onClick={() => doAction({ participantId: c.participantId, action: "accept" })}
                className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Check className="h-3.5 w-3.5" /> Aceptar
              </button>
              <button
                onClick={() => doAction({ participantId: c.participantId, action: "decline" })}
                className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/20 transition-colors"
              >
                <X className="h-3.5 w-3.5" /> Rechazar
              </button>
            </div>
          ) : c.participantStatus === "ACCEPTED" || c.participantStatus === "REJECTED" ? (
            <button
              onClick={() => triggerUpload(c.participantId)}
              disabled={uploading === c.participantId}
              className="w-full flex items-center justify-center gap-1 rounded-lg bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
            >
              <Upload className="h-3.5 w-3.5" />
              {uploading === c.participantId ? "Subiendo..." : c.participantStatus === "REJECTED" ? "Resubir evidencia" : "Subir evidencia"}
            </button>
          ) : c.participantStatus === "SUBMITTED" ? (
            <div className="space-y-2">
              {c.videoUrl && (
                <video
                  src={c.videoUrl.startsWith("/uploads/") ? c.videoUrl.replace("/uploads/", "/api/uploads/") : c.videoUrl}
                  controls
                  className="w-full rounded-lg"
                />
              )}
              <span className="text-xs text-muted-foreground">Esperando validación del creador...</span>
            </div>
          ) : null}
        </div>
      ))}

      {creatorChallenges.map((c) => (
        <div key={c.challengeId} className="rounded-xl border border-primary/20 bg-card p-4 shadow-sm space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Swords className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">{c.title}</span>
                <span className="text-[10px] rounded-full bg-primary/10 px-2 py-0.5 text-primary font-medium">Creador</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {c.type === "GROUP" && c.groupName ? c.groupName : "1v1"}
                {c.exerciseName && ` · ${c.exerciseName}`}
                {" · "}{c.rewardCoins} monedas/persona
              </p>
            </div>
            {c.challengeStatus === "CLOSED" ? (
              <span className="text-[10px] rounded-full bg-muted px-2 py-0.5 text-muted-foreground font-medium">Cerrado</span>
            ) : (
              <button
                onClick={() => doAction({ challengeId: c.challengeId, action: "close" })}
                className="text-[10px] rounded-full bg-destructive/10 px-2 py-0.5 text-destructive font-medium hover:bg-destructive/20 transition-colors"
              >
                Cerrar reto
              </button>
            )}
          </div>

          <div className="space-y-2">
            {c.participants.map((p) => (
              <div key={p.participantId} className="flex flex-col gap-2 rounded-lg bg-background p-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {p.username[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-semibold">{p.username}</p>
                    <p className="text-[10px] text-muted-foreground">{p.status}</p>
                  </div>
                </div>

                {p.status === "SUBMITTED" && c.challengeStatus !== "CLOSED" ? (
                  <div className="w-full space-y-2">
                    {p.videoUrl && (
                      <video
                        src={p.videoUrl.startsWith("/uploads/") ? p.videoUrl.replace("/uploads/", "/api/uploads/") : p.videoUrl}
                        controls
                        className="w-full rounded-lg mt-2"
                      />
                    )}
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => doAction({ participantId: p.participantId, action: "validate" })}
                        className="rounded-lg bg-green-500/10 p-1.5 text-green-500 hover:bg-green-500/20 transition-colors"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => doAction({ participantId: p.participantId, action: "reject" })}
                        className="rounded-lg bg-destructive/10 p-1.5 text-destructive hover:bg-destructive/20 transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ) : p.status === "VALIDATED" ? (
                  <span className="flex items-center gap-1 text-[10px] text-green-500 font-medium">
                    <Trophy className="h-3 w-3" /> Validado
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
