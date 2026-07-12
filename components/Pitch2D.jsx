"use client";

import { useEffect, useRef, useState } from "react";
import { FORMATION_433 } from "@/lib/positions";

const PITCH_W = 700;
const PITCH_H = 440;
const HOP_MS = 480; // duração de cada passe (antes de aplicar o multiplicador de velocidade)
const PAUSA_DESFECHO_MS = 900;

function toPx(xPct, yPct) {
  return { x: (xPct / 100) * PITCH_W, y: (yPct / 100) * PITCH_H };
}

// Posições-base (em %) de um time em campo, atacando pra direita se
// "atacaDireita", senão espelhado — os índices batem 1:1 com os slots
// da FORMATION_433 (e por isso também com os titulares gerados).
function basePositions(atacaDireita) {
  return FORMATION_433.map((slot) => ({
    ...slot,
    x: atacaDireita ? slot.x : 100 - slot.x,
  }));
}

function sobrenome(nomeCompleto) {
  if (!nomeCompleto) return "";
  const partes = nomeCompleto.split(" ");
  return partes[partes.length - 1];
}

export default function Pitch2D({
  timeline,
  isHome,
  corMandante,
  corVisitante,
  titularesMandante,
  titularesVisitante,
  meuSlot,
  meuNome,
  customizacaoJogador, // customização do jogador principal
  onFinish,
  speed = 1,
}) {
  const canvasRef = useRef(null);
  const [seqIdx, setSeqIdx] = useState(0);
  const [hopIdx, setHopIdx] = useState(0);
  const [placar, setPlacar] = useState({ mandante: 0, visitante: 0 });
  const [minutoAtual, setMinutoAtual] = useState(0);
  const [log, setLog] = useState([]);
  const rafRef = useRef(null);
  const timeoutRef = useRef(null);
  const startRef = useRef(null);

  const meuLado = isHome ? "mandante" : "visitante";
  const mandantePos = basePositions(true);
  const visitantePos = basePositions(false);

  function nomeDoSlot(lado, slot) {
    if (lado === meuLado && slot === meuSlot) return meuNome || "Você";
    const titulares = lado === "mandante" ? titularesMandante : titularesVisitante;
    return titulares?.[slot]?.nome || "Jogador";
  }

  useEffect(() => {
    if (!timeline || timeline.length === 0) return;
    if (seqIdx >= timeline.length) {
      onFinish?.();
      return;
    }
    const seq = timeline[seqIdx];
    const totalHops = seq.passes.length - 1;

    // todos os passes da sequência já rolaram -> resolve o desfecho
    // (gol / chute pra fora / posse perdida) com uma pequena pausa.
    if (hopIdx >= totalHops) {
      draw(seq, hopIdx, 1);
      timeoutRef.current = setTimeout(() => {
        setMinutoAtual(seq.minuto);
        if (seq.tipo === "gol") {
          setPlacar((p) =>
            seq.time === "mandante" ? { ...p, mandante: p.mandante + 1 } : { ...p, visitante: p.visitante + 1 }
          );
        }
        const slotFinal = seq.passes[seq.passes.length - 1];
        const nomeFinalizador = nomeDoSlot(seq.time, slotFinal);
        const rotulo = seq.tipo === "gol" ? "⚽ GOL" : seq.tipo === "chance" ? "🎯 Chute" : "▸ Posse perdida";
        setLog((l) => [{ minuto: seq.minuto, texto: `${rotulo} — ${nomeFinalizador}`, tipo: seq.tipo }, ...l].slice(0, 6));
        setSeqIdx((i) => i + 1);
        setHopIdx(0);
      }, PAUSA_DESFECHO_MS / speed);
      return () => clearTimeout(timeoutRef.current);
    }

    // anima o passe do slot atual pro próximo
    const duracao = HOP_MS / speed;
    startRef.current = null;

    function frame(ts) {
      if (!startRef.current) startRef.current = ts;
      const t = Math.min(1, (ts - startRef.current) / duracao);
      draw(seq, hopIdx, t);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(frame);
      } else {
        setHopIdx((h) => h + 1);
      }
    }
    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seqIdx, hopIdx, timeline, speed]);

  function draw(seq, hop, t) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, PITCH_W, PITCH_H);
    drawField(ctx);

    // Renderiza os jogadores mandantes e visitantes com aparência procedimental
    mandantePos.forEach((p, i) => {
      const isMe = "mandante" === meuLado && i === meuSlot;
      const playerCustom = isMe ? customizacaoJogador : titularesMandante?.[i]?.customizacao;
      const numero = isMe ? (customizacaoJogador?.numero || i + 1) : (titularesMandante?.[i]?.numero || i + 1);
      drawPlayer(ctx, p, corMandante, isMe, numero, playerCustom, true);
    });

    visitantePos.forEach((p, i) => {
      const isMe = "visitante" === meuLado && i === meuSlot;
      const playerCustom = isMe ? customizacaoJogador : titularesVisitante?.[i]?.customizacao;
      const numero = isMe ? (customizacaoJogador?.numero || i + 1) : (titularesVisitante?.[i]?.numero || i + 1);
      drawPlayer(ctx, p, corVisitante, isMe, numero, playerCustom, false);
    });

    const posArray = seq.time === "mandante" ? mandantePos : visitantePos;
    const slotDe = seq.passes[hop];
    const slotPara = seq.passes[hop + 1] ?? slotDe;
    const de = toPx(posArray[slotDe].x, posArray[slotDe].y);
    const para = toPx(posArray[slotPara].x, posArray[slotPara].y);

    // Trajetória no chão (sombra) e bola no ar (arco 3D)
    const groundX = de.x + (para.x - de.x) * t;
    const groundY = de.y + (para.y - de.y) * t;
    const arco = Math.sin(Math.min(t, 1) * Math.PI) * 12; // Altura do chute
    const ballX = groundX;
    const ballY = groundY - arco;

    drawPassLine(ctx, de, para);
    
    // Desenha a sombra da bola no chão
    drawBallShadow(ctx, groundX, groundY, arco);
    
    // Desenha a bola de futebol girando
    drawBall(ctx, ballX, ballY, t);

    // rótulo com o nome de quem está com a bola
    const slotRotulo = t < 0.5 ? slotDe : slotPara;
    const nomeRotulo = nomeDoSlot(seq.time, slotRotulo);
    drawRotulo(ctx, ballX, ballY, nomeRotulo, slotRotulo === meuSlot && seq.time === meuLado);

    // desfecho: gol / chute / posse perdida, exibido no último "frame"
    if (hop >= seq.passes.length - 1 && seq.tipo !== "buildup") {
      drawGoalFlash(ctx, seq.time === "mandante");
    }
  }

  function drawField(ctx) {
    ctx.fillStyle = "#0b3d2e";
    ctx.fillRect(0, 0, PITCH_W, PITCH_H);
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
    ctx.strokeRect(6, PITCH_H / 2 - 90, 90, 180);
    ctx.strokeRect(PITCH_W - 96, PITCH_H / 2 - 90, 90, 180);
    ctx.strokeRect(6, PITCH_H / 2 - 40, 36, 80);
    ctx.strokeRect(PITCH_W - 42, PITCH_H / 2 - 40, 36, 80);
  }

  // Desenha o bonequinho do jogador
  function drawPlayer(ctx, p, cor, destaque, numero, playerCustom, facingRight) {
    const { x, y } = toPx(p.x, p.y);

    const skinColor = playerCustom?.pele || "#E0A96D";
    const hairColor = playerCustom?.cabeloCor || "#4A3B32";
    const hairStyle = playerCustom?.cabeloEstilo || "curto";
    const bootColor = playerCustom?.chuteira || "#FFFFFF";

    // 1. Sombra sob o jogador
    ctx.beginPath();
    ctx.ellipse(x, y + 9, destaque ? 12 : 9, 3.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
    ctx.fill();

    // 2. Chuteiras (pezinhos saindo)
    const shoeOffset = facingRight ? 6 : -6;
    ctx.beginPath();
    ctx.arc(x + shoeOffset, y - 5, 2, 0, Math.PI * 2);
    ctx.arc(x + shoeOffset, y + 5, 2, 0, Math.PI * 2);
    ctx.fillStyle = bootColor;
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // 3. Tronco / Ombros / Camiseta (Jersey)
    ctx.beginPath();
    ctx.ellipse(x, y, 6.5, 9, 0, 0, Math.PI * 2);
    ctx.fillStyle = cor || "#f2f6f1";
    ctx.fill();
    ctx.lineWidth = destaque ? 2.2 : 1.2;
    ctx.strokeStyle = destaque ? "#F4C430" : "rgba(4,20,15,0.4)";
    ctx.stroke();

    // 4. Shorts (calção) - metade traseira/esquerda se facingRight
    ctx.beginPath();
    ctx.ellipse(x - (facingRight ? 2 : -2), y, 5, 8, 0, Math.PI * 0.5, Math.PI * 1.5);
    ctx.fillStyle = corContrastante(cor) === "#ffffff" ? "#102A45" : "#ffffff";
    ctx.fill();

    // 5. Cabeça
    const headX = facingRight ? x + 1.5 : x - 1.5;
    ctx.beginPath();
    ctx.arc(headX, y, 5, 0, Math.PI * 2);
    ctx.fillStyle = skinColor;
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.15)";
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // 6. Cabelo
    ctx.fillStyle = hairColor;
    if (hairStyle === "curto") {
      ctx.beginPath();
      ctx.arc(headX - (facingRight ? 1.2 : -1.2), y, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (hairStyle === "longo") {
      ctx.beginPath();
      ctx.arc(headX - (facingRight ? 1.5 : -1.5), y, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(headX - (facingRight ? 4 : 0), y - 2, 4, 4);
    } else if (hairStyle === "black") {
      ctx.beginPath();
      ctx.arc(headX - (facingRight ? 0.8 : -0.8), y, 5.6, 0, Math.PI * 2);
      ctx.fill();
    } // careca não faz nada

    // 7. Número da camisa nas costas
    ctx.fillStyle = corContrastante(cor);
    ctx.font = `bold ${destaque ? 7.5 : 6.5}px var(--font-mono)`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(numero), facingRight ? x - 2.5 : x + 2.5, y + 0.5);

    // 8. Aura dourada ao redor do jogador
    if (destaque) {
      ctx.beginPath();
      ctx.arc(x, y, 14, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(244,196,48,0.55)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  function corContrastante(hex) {
    if (!hex) return "#0a1428";
    const h = hex.replace("#", "");
    if (h.length !== 6) return "#0a1428";
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const luminancia = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminancia > 0.6 ? "#0a1428" : "#ffffff";
  }

  function drawPassLine(ctx, de, para) {
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.moveTo(de.x, de.y);
    ctx.lineTo(para.x, para.y);
    ctx.strokeStyle = "rgba(244,196,48,0.35)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawBallShadow(ctx, x, y, arco) {
    // Sombra encolhe e fica mais transparente conforme a bola sobe
    const scale = Math.max(0.4, 1 - arco / 25);
    ctx.beginPath();
    ctx.ellipse(x, y, 5 * scale, 2.5 * scale, 0, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0, 0, 0, ${0.35 * scale})`;
    ctx.fill();
  }

  function drawBall(ctx, x, y, t) {
    ctx.save();
    ctx.translate(x, y);
    // Rotaciona a bola conforme ela corre
    ctx.rotate(t * Math.PI * 5);

    // Corpo da bola
    ctx.beginPath();
    ctx.arc(0, 0, 4.8, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = "#04140f";
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Costuras e gomos pretos (desenho clássico de bola de futebol)
    ctx.fillStyle = "#04140f";
    ctx.beginPath();
    ctx.arc(0, 0, 1.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#04140f";
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(0, -1.3); ctx.lineTo(0, -4.2);
    ctx.moveTo(-1.1, 0.7); ctx.lineTo(-3.3, 2.3);
    ctx.moveTo(1.1, 0.7); ctx.lineTo(3.3, 2.3);
    ctx.stroke();

    ctx.restore();
  }

  function drawRotulo(ctx, x, y, nome, souEu) {
    const texto = souEu ? `★ ${sobrenome(nome)}` : sobrenome(nome);
    ctx.font = `700 10px var(--font-mono)`;
    const largura = ctx.measureText(texto).width + 10;
    const rotY = y - 18;
    ctx.fillStyle = souEu ? "rgba(244,196,48,0.92)" : "rgba(6,12,26,0.78)";
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x - largura / 2, rotY - 8, largura, 16, 8);
    } else {
      ctx.rect(x - largura / 2, rotY - 8, largura, 16);
    }
    ctx.fill();
    ctx.fillStyle = souEu ? "#0a1428" : "#f2f6f1";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(texto, x, rotY);
  }

  function drawGoalFlash(ctx, atacaDireita) {
    ctx.fillStyle = "rgba(244,196,48,0.10)";
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
            {l.minuto}&apos; · {l.texto}
          </div>
        ))}
      </div>
    </div>
  );
}
