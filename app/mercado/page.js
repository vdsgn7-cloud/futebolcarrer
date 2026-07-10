"use client";

import BottomNav from "@/components/BottomNav";

export default function MercadoPage() {
  return (
    <main className="min-h-screen max-w-md mx-auto px-4 pt-6 pb-28">
      <div className="font-mono text-[10px] tracking-[0.25em] text-gold-400/80 mb-1">
        TRANSFERÊNCIAS & CONTRATO
      </div>
      <h1 className="font-display text-3xl mb-4">MERCADO</h1>

      <div className="card overflow-hidden">
        <div className="card-header">EM BREVE</div>
        <div className="p-5 text-sm text-chalk/60 leading-relaxed space-y-3">
          <p>
            Aqui é onde vai entrar a próxima grande fase da carreira: salário, agente,
            propostas de outros clubes e negociação de contrato.
          </p>
          <p className="text-chalk/40 text-xs">
            Planejado: peneira inicial com olheiros observando sua partida-teste, propostas
            de clubes menores, um agente que negocia por você, e reajustes de salário
            conforme seu desempenho em campo.
          </p>
        </div>
      </div>

      <BottomNav />
    </main>
  );
}
