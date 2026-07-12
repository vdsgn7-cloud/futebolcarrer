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
    if (hopIdx >= totalHops) {
      draw(seq, hopIdx, 1, startRef.current + totalHops * (HOP_MS / speed));
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
      draw(seq, hopIdx, t, ts);
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

  // Calcula a posição dinâmica do jogador baseada em respiração, sway e tática
  function getDynamicPlayerPos(p, i, isMandante, seq, hop, t, ts, deBase, paraBase) {
    const base = toPx(p.x, p.y);
    
    // 1. Idle Sway / Respiração
    const time = ts || 0;
    const swayX = Math.sin((time + i * 400) / 280) * 1.6;
    const swayY = Math.cos((time + i * 400) / 280) * 1.6;

    // 2. Compactação tática na direção da bola
    const estBallX = deBase.x + (paraBase.x - deBase.x) * t;
    const estBallY = deBase.y + (paraBase.y - deBase.y) * t;

    const dx = estBallX - base.x;
    const dy = estBallY - base.y;

    let shiftFactor = 0.06;
    if (p.pos === "GOL") shiftFactor = 0.02;
    else if (p.pos === "ZAG") shiftFactor = 0.05;
    else if (p.pos === "LAT") shiftFactor = 0.09;
    else if (p.pos === "VOL") shiftFactor = 0.11;
    else if (p.pos === "MEI") shiftFactor = 0.15;
    else if (p.pos === "ATA") shiftFactor = 0.18;

    let shiftX = dx * shiftFactor;
    let shiftY = dy * shiftFactor;

    // Limites de deslocamento
    const maxShift = p.pos === "GOL" ? 12 : p.pos === "ZAG" ? 25 : 45;
    const shiftDist = Math.sqrt(shiftX * shiftX + shiftY * shiftY);
    if (shiftDist > maxShift) {
      shiftX = (shiftX / shiftDist) * maxShift;
      shiftY = (shiftY / shiftDist) * maxShift;
    }

    let finalX = base.x + swayX + shiftX;
    let finalY = base.y + swayY + shiftY;

    // 3. Corridas ativas de passe e recepção
    const éTimeAtacando = (isMandante && seq.time === "mandante") || (!isMandante && seq.time === "visitante");
    const slotDe = seq.passes[hop];
    const slotPara = seq.passes[hop + 1] ?? slotDe;

    if (éTimeAtacando) {
      if (i === slotDe) {
        // Passer corre na direção do passe
        const runX = (paraBase.x - deBase.x) * t * 0.18;
        const runY = (paraBase.y - deBase.y) * t * 0.18;
        finalX += runX;
        finalY += runY;
      } else if (i === slotPara) {
        // Receiver corre de encontro com a bola
        const meetX = (deBase.x - paraBase.x) * (1 - t) * 0.18;
        const meetY = (deBase.y - paraBase.y) * (1 - t) * 0.18;
        finalX += meetX;
        finalY += meetY;
      }
    }

    return { x: finalX, y: finalY };
  }

  function draw(seq, hop, t, ts) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, PITCH_W, PITCH_H);
    drawField(ctx);

    const slotDe = seq.passes[hop];
    const slotPara = seq.passes[hop + 1] ?? slotDe;

    // Bases para cálculo de corrida
    const mandanteBaseArray = seq.time === "mandante" ? mandantePos : visitantePos;
    const deBase = toPx(mandanteBaseArray[slotDe].x, mandanteBaseArray[slotDe].y);
    const paraBase = toPx(mandanteBaseArray[slotPara].x, mandanteBaseArray[slotPara].y);

    // Calcular posições dinâmicas de todos os jogadores
    const dynMandante = mandantePos.map((p, i) =>
      getDynamicPlayerPos(p, i, true, seq, hop, t, ts, deBase, paraBase)
    );
    const dynVisitante = visitantePos.map((p, i) =>
      getDynamicPlayerPos(p, i, false, seq, hop, t, ts, deBase, paraBase)
    );

    // Renderizar os jogadores nas coordenadas dinâmicas
    dynMandante.forEach((p, i) => {
      const isMe = "mandante" === meuLado && i === meuSlot;
      const playerCustom = isMe ? customizacaoJogador : titularesMandante?.[i]?.customizacao;
      const numero = isMe ? (customizacaoJogador?.numero || i + 1) : (titularesMandante?.[i]?.numero || i + 1);
      const isWithBall = seq.time === "mandante" && (t < 0.5 ? i === slotDe : i === slotPara);
      drawPlayer(ctx, p, corMandante, isMe, numero, playerCustom, true, isWithBall);
    });

    dynVisitante.forEach((p, i) => {
      const isMe = "visitante" === meuLado && i === meuSlot;
      const playerCustom = isMe ? customizacaoJogador : titularesVisitante?.[i]?.customizacao;
      const numero = isMe ? (customizacaoJogador?.numero || i + 1) : (titularesVisitante?.[i]?.numero || i + 1);
      const isWithBall = seq.time === "visitante" && (t < 0.5 ? i === slotDe : i === slotPara);
      drawPlayer(ctx, p, corVisitante, isMe, numero, playerCustom, false, isWithBall);
    });

    // Posições da bola baseadas nas posições dinâmicas dos jogadores
    const posDynArray = seq.time === "mandante" ? dynMandante : dynVisitante;
    const de = posDynArray[slotDe];
    const para = posDynArray[slotPara] ?? de;

    const groundX = de.x + (para.x - de.x) * t;
    const groundY = de.y + (para.y - de.y) * t;
    const arco = Math.sin(Math.min(t, 1) * Math.PI) * 14;
    const ballX = groundX;
    const ballY = groundY - arco;

    drawPassLine(ctx, de, para);
    drawBallShadow(ctx, groundX, groundY, arco);
    drawBall(ctx, ballX, ballY, t);

    // rótulo de quem está com a bola
    const slotRotulo = t < 0.5 ? slotDe : slotPara;
    const nomeRotulo = nomeDoSlot(seq.time, slotRotulo);
    drawRotulo(ctx, ballX, ballY, nomeRotulo, slotRotulo === meuSlot && seq.time === meuLado);

    if (hop >= seq.passes.length - 1 && seq.tipo !== "buildup") {
      drawGoalFlash(ctx, seq.time === "mandante");
    }
  }

  function drawField(ctx) {
    // Gramado escuro premium
    ctx.fillStyle = "#0c2014";
    ctx.fillRect(0, 0, PITCH_W, PITCH_H);

    // Listras verticais verdes (mockup)
    ctx.fillStyle = "#0e2618";
    const stripesCount = 14;
    const stripeW = PITCH_W / stripesCount;
    for (let i = 0; i < stripesCount; i++) {
      if (i % 2 === 0) {
        ctx.fillRect(i * stripeW, 0, stripeW, PITCH_H);
      }
    }

    // Linhas do campo brancas discretas
    ctx.strokeStyle = "rgba(242, 246, 241, 0.25)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(6, 6, PITCH_W - 12, PITCH_H - 12);
    
    // Linha de meio campo
    ctx.beginPath();
    ctx.moveTo(PITCH_W / 2, 6);
    ctx.lineTo(PITCH_W / 2, PITCH_H - 6);
    ctx.stroke();

    // Círculo central
    ctx.beginPath();
    ctx.arc(PITCH_W / 2, PITCH_H / 2, 45, 0, Math.PI * 2);
    ctx.stroke();

    // Grandes áreas
    ctx.strokeRect(6, PITCH_H / 2 - 90, 90, 180);
    ctx.strokeRect(PITCH_W - 96, PITCH_H / 2 - 90, 90, 180);

    // Pequenas áreas
    ctx.strokeRect(6, PITCH_H / 2 - 40, 36, 80);
    ctx.strokeRect(PITCH_W - 42, PITCH_H / 2 - 40, 36, 80);
  }

  // Desenha o bonequinho do jogador
  function drawPlayer(ctx, p, cor, destaque, numero, playerCustom, facingRight, isWithBall) {
    const x = p.x;
    const y = p.y;

    const skinColor = playerCustom?.pele || "#E0A96D";
    const hairColor = playerCustom?.cabeloCor || "#4A3B32";
    const hairStyle = playerCustom?.cabeloEstilo || "curto";
    const bootColor = playerCustom?.chuteira || "#FFFFFF";

    // 1. Destaque / Brilho Neon verde embaixo de quem está com a bola
    if (isWithBall) {
      ctx.beginPath();
      ctx.ellipse(x, y + 9, 14, 6, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0, 255, 135, 0.18)";
      ctx.fill();
      ctx.strokeStyle = "rgba(0, 255, 135, 0.75)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else {
      // Sombra padrão sob o jogador
      ctx.beginPath();
      ctx.ellipse(x, y + 9, destaque ? 11 : 9, 3.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
      ctx.fill();
    }

    // 2. Chuteiras
    const shoeOffset = facingRight ? 5.5 : -5.5;
    ctx.beginPath();
    ctx.arc(x + shoeOffset, y - 5, 2, 0, Math.PI * 2);
    ctx.arc(x + shoeOffset, y + 5, 2, 0, Math.PI * 2);
    ctx.fillStyle = bootColor;
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // 3. Tronco (Jersey)
    ctx.beginPath();
    ctx.ellipse(x, y, 6.5, 9, 0, 0, Math.PI * 2);
    ctx.fillStyle = cor || "#f2f6f1";
    ctx.fill();
    ctx.lineWidth = destaque ? 2.5 : 1.2;
    ctx.strokeStyle = destaque ? "#F4C430" : "rgba(4,20,15,0.45)";
    ctx.stroke();

    // 4. Shorts (calção)
    ctx.beginPath();
    ctx.ellipse(x - (facingRight ? 2 : -2), y, 5, 7.5, 0, Math.PI * 0.5, Math.PI * 1.5);
    ctx.fillStyle = corContrastante(cor) === "#ffffff" ? "#0f2244" : "#ffffff";
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
    }

    // 7. Número da camisa
    ctx.fillStyle = corContrastante(cor);
    ctx.font = `bold ${destaque ? 7.5 : 6.5}px var(--font-mono)`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(numero), facingRight ? x - 2.5 : x + 2.5, y + 0.5);

    // 8. Aura dourada ao redor do nosso jogador
    if (destaque) {
      ctx.beginPath();
      ctx.arc(x, y, 14, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(244,196,48,0.7)";
      ctx.lineWidth = 1.2;
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
    ctx.strokeStyle = "rgba(0, 255, 135, 0.25)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawBallShadow(ctx, x, y, arco) {
    const scale = Math.max(0.4, 1 - arco / 25);
    ctx.beginPath();
    ctx.ellipse(x, y, 5.5 * scale, 2.5 * scale, 0, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0, 0, 0, ${0.4 * scale})`;
    ctx.fill();
  }

  function drawBall(ctx, x, y, t) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t * Math.PI * 6);

    ctx.beginPath();
    ctx.arc(0, 0, 4.8, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = "#04140f";
    ctx.lineWidth = 0.8;
    ctx.stroke();

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
    ctx.fillStyle = souEu ? "rgba(244,196,48,0.95)" : "rgba(6,12,26,0.85)";
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
    ctx.fillStyle = "rgba(0, 255, 135, 0.08)";
    if (atacaDireita) ctx.fillRect(PITCH_W - 96, 0, 96, PITCH_H);
    else ctx.fillRect(0, 0, 96, PITCH_H);
  }

  return (
    <div className="w-full">
      <canvas
        ref={canvasRef}
        width={PITCH_W}
        height={PITCH_H}
        className="w-full h-auto rounded-xl border border-chalk/10 shadow-2xl"
      />
    </div>
  );
}
