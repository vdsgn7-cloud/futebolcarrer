"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadCareer, clearCareer } from "@/lib/storage";
import { getTeam } from "@/lib/teams";

export default function Home() {
  const [career, setCareer] = useState(undefined);

  useEffect(() => {
    setCareer(loadCareer());
  }, []);

  return (
    <main className="min-h-screen flex flex-col">
      <section className="relative overflow-hidden border-b border-chalk/10 bg-stripes">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-pitch-950" />
        <div className="relative max-w-md mx-auto px-6 pt-16 pb-12 text-center">
          <div className="font-mono text-xs tracking-[0.3em] text-gold-400/80 mb-3">
            TEMPORADA 2026 · SÉRIE A
          </div>
          <h1 className="font-display text-6xl leading-[0.95] mb-3">
            MODO<br />CARREIRA
          </h1>
          <p className="text-chalk/60 text-sm leading-relaxed max-w-xs mx-auto">
            Crie seu jogador, escolha seu clube e viva o Brasileirão rodada a rodada — em campo 2D.
          </p>
        </div>
      </section>

      <section className="flex-1 max-w-md w-full mx-auto px-6 py-8 flex flex-col gap-4">
        {career === undefined ? null : career ? (
          <>
            <div className="card p-5">
              <div className="font-mono text-xs text-chalk/50 mb-1">CONTINUAR COMO</div>
              <div className="font-display text-2xl">{career.player.nome}</div>
              <div className="text-sm text-chalk/60">
                {getTeam(career.player.clubeId)?.name} · {career.player.posicao} · {career.player.idade} anos
              </div>
              <div className="text-xs text-chalk/40 mt-1">
                Temporada {career.temporada} · Rodada {Math.min(career.rodada + 1, 38)}/38
              </div>
              <Link
                href="/career"
                className="btn-primary block text-center mt-4 py-3 rounded-lg font-display text-lg tracking-wide"
              >
                CONTINUAR CARREIRA
              </Link>
            </div>
            <button
              onClick={() => {
                clearCareer();
                setCareer(null);
              }}
              className="text-xs text-chalk/40 hover:text-ember transition-colors"
            >
              Apagar save e começar do zero
            </button>
          </>
        ) : (
          <Link
            href="/create-player"
            className="btn-primary block text-center py-4 rounded-lg font-display text-xl tracking-wide"
          >
            NOVA CARREIRA
          </Link>
        )}

        <div className="card p-5 mt-2">
          <div className="font-display text-lg mb-2 tracking-wide text-gold-400">COMO FUNCIONA</div>
          <ul className="text-sm text-chalk/60 space-y-2 leading-relaxed">
            <li>1. Crie seu jogador: nome, nacionalidade, posição e atributos.</li>
            <li>2. Escolha um clube da Série A pra defender.</li>
            <li>3. Simule cada rodada e acompanhe seu jogador em campo 2D.</li>
            <li>4. Suba na tabela, evolua e escreva sua própria história.</li>
          </ul>
        </div>
      </section>

      <footer className="text-center text-xs text-chalk/25 pb-6">
        feito por Victor · Next.js + Canvas
      </footer>
    </main>
  );
}
