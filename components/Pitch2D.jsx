"use client";

import { useEffect, useRef, useState } from "react";
import { FORMATION_433 } from "@/lib/positions";

const PITCH_W = 700;
const PITCH_H = 440;

function toPx(xPct, yPct) {
  return { x: (xPct / 100) * PITCH_W, y: (yPct / 100) * PITCH_H };
}

// Gera as posições-base (em %) de um time em campo, atacando pra direita
// se "atacaDireita" for true, senão espelha pro outro lado.
function basePositions(atacaDireita) {
  return FORMATION_433.map((slot) => {
    const x = atacaDireita ? slot.x : 100 - slot.x;
    return { ...slot, x };
  });
}

// Desloca levemente a formação de acordo com a fase do jogo (fase vai de
// -1 = defendendo no próprio campo, a +1 = atacando no campo adversário).
function shiftForPhase(positions, atacaDireita, fase) {
  const dir = atacaDireita ? 1 : -1;
  return positions.map((p) => ({
    ...p,
    x: Math.max(4, Math.min(96, p.x + dir * fase * 14)),
  }));
}

export default function Pitch2D({ timeline, isHome, corMandante, corVisitante, onFinish, speed = 1 }) {
  const canvasRef = useRef(null);
  const [seqIdx, setSeqIdx] = useState(0);
  const [placar, setPlacar] = useState({ mandante: 0, visitante: 0 });
  const [minutoAtual, setMinutoAtual] = useState(0);
  const [log, setLog] = useState([]);
  const rafRef = useRef(null);
  const startRef = useRef(null);

  const mandantePos = basePositions(true);
  const visitantePos = basePositions(false);

  useEffect(() => {
    if (!timeline || timeline.length === 0) return;
    if (seqIdx >= timeline.length) {
      onFinish?.();
      return;
    }

    const seq = timeline[seqIdx];
    const duracao = (seq.tipo === "gol" ? 2600 : seq.tipo === "chance" ? 1900 : 1500) / speed;
    startRef.current = null;

    function frame(ts) {
      if (!startRef.current) startRef.current = ts;
      const t = Math.min(1, (ts - startRef.current) / duracao);
      draw(seq, t);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(frame);
      } else {
        setMinutoAtual(seq.minuto);
        if (seq.tipo === "gol") {
          setPlacar((p) =>
            seq.time === "mandante"
              ? { ...p, mandante: p.mandante + 1 }
              : { ...p, visitante: p.visitante + 1 }
          );
        }
        setLog((l) => [
          { minuto: seq.minuto, tipo: seq.tipo, time: seq.time },
          ...l,
        ].slice(0, 6));
        setSeqIdx((i) => i + 1);
      }
    }

    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seqIdx, timeline, speed]);

  function draw(seq, t) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, PITCH_W, PITCH_H);

    drawField(ctx);

    // fase da jogada: 0 -> 1 -> volta pra 0.5 no fim (representa o time em
    // posse avançando em direção ao gol adversário)
    const atacaDireita = seq.time === "mandante";
    const alvo = seq.tipo === "buildup" ? 0.35 : seq.tipo === "chance" ? 0.75 : 1.0;
    const fase = Math.sin(t * Math.PI * 0.5) * alvo;

    const posM = shiftForPhase(mandantePos, true, seq.time === "mandante" ? fase : -fase * 0.4);
    const posV = shiftForPhase(visitantePos, false, seq.time === "visitante" ? fase : -fase * 0.4);

    posM.forEach((p) => drawPlayer(ctx, p, corMandante, isHome));
    posV.forEach((p) => drawPlayer(ctx, p, corVisitante, !isHome));

    // bola: percorre da posição média do time com posse até a área
    // adversária, seguindo a fase calculada acima
    const atkList = seq.time === "mandante" ? posM : posV;
    const atkIdx = seq.tipo === "gol" || seq.tipo === "chance"
      ? atkList.findIndex((p) => p.pos === "ATA")
      : Math.floor(atkList.length / 2);
    const ballOwner = atkList[Math.max(0, atkIdx)] || atkList[0];
    const goalX = atacaDireita ? 97 : 3;
    const ballX = ballOwner.x + (goalX - ballOwner.x) * (seq.tipo === "buildup" ? t * 0.5 : t);
    const ballY = ballOwner.y + Math.sin(t * Math.PI * 2) * 4;
    drawBall(ctx, ballX, ballY);

    if (seq.tipo === "gol" && t > 0.75) {
      drawGoalFlash(ctx, atacaDireita);
    }
  }

  function drawField(ctx) {
    ctx.fillStyle = "#0b3d2e";
    ctx.fillRect(0, 0, PITCH_W, PITCH_H);
    // listras
    ctx.fillStyle = "rgba(255,255,255,0.025)";
    for (let i = 0; i < 10; i++) {
      if (i % 2 === 0) ctx.fillRect((i * PITCH_W) / 10, 0, PITCH_W / 10, PITCH_H);
    }
    ctx.strokeStyle = "rgba(242,246,241,0.55)";
    ctx.lineWidth = 2;
    ctx.strokeRect(6, 6, PITCH_W - 12, PITCH_H - 12);
    ctx.beginPath();
    ctx.moveTo(PITCH_W / 2, 6);
    ctx.lineTo(PITCH_W / 2, PITCH_H - 6);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(PITCH_W / 2, PITCH_H / 2, 45, 0, Math.PI * 2);
    ctx.stroke();
    // áreas
    ctx.strokeRect(6, PITCH_H / 2 - 90, 90, 180);
    ctx.strokeRect(PITCH_W - 96, PITCH_H / 2 - 90, 90, 180);
    ctx.strokeRect(6, PITCH_H / 2 - 40, 36, 80);
    ctx.strokeRect(PITCH_W - 42, PITCH_H / 2 - 40, 36, 80);
  }

  function drawPlayer(ctx, p, cor, destaque) {
    const { x, y } = toPx(p.x, p.y);
    ctx.beginPath();
    ctx.arc(x, y, destaque ? 8 : 6, 0, Math.PI * 2);
    ctx.fillStyle = destaque ? "#e8c468" : cor || "#f2f6f1";
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "rgba(4,20,15,0.6)";
    ctx.stroke();
    if (destaque) {
      ctx.beginPath();
      ctx.arc(x, y, 11, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(232,196,104,0.6)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  function drawBall(ctx, xPct, yPct) {
    const { x, y } = toPx(xPct, yPct);
    ctx.beginPath();
    ctx.arc(x, y, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = "#07231a";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function drawGoalFlash(ctx, atacaDireita) {
    ctx.fillStyle = "rgba(232,196,104,0.12)";
    if (atacaDireita) ctx.fillRect(PITCH_W - 96, 0, 96, PITCH_H);
    else ctx.fillRect(0, 0, 96, PITCH_H);
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="font-mono text-sm text-chalk/70">{minutoAtual}&apos;</span>
        <span className="font-display text-2xl tracking-wide">
          {placar.mandante} — {placar.visitante}
        </span>
        <span className="font-mono text-sm text-chalk/40">
          {Math.min(seqIdx, timeline.length)}/{timeline.length}
        </span>
      </div>
      <canvas
        ref={canvasRef}
        width={PITCH_W}
        height={PITCH_H}
        className="w-full h-auto rounded-lg border border-chalk/10"
      />
      <div className="mt-3 space-y-1 max-h-28 overflow-y-auto">
        {log.map((l, i) => (
          <div key={i} className="text-xs font-mono text-chalk/60">
            {l.tipo === "gol" ? "⚽" : l.tipo === "chance" ? "🎯" : "▸"} {l.minuto}&apos;
          </div>
        ))}
      </div>
    </div>
  );
}
