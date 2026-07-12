"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadCareer, saveCareer } from "@/lib/storage";
import { gerarOfertasMercado, aceitarOferta, cancelarTransferenciaPendente } from "@/lib/engine";
import { DIVISOES, getClubeEmQualquerDivisao } from "@/lib/divisions";
import BottomNav from "@/components/BottomNav";

export default function MercadoPage() {
  const router = useRouter();
  const [career, setCareer] = useState(undefined);
  const [ofertas, setOfertas] = useState(null);

  useEffect(() => {
    const c = loadCareer();
    if (!c) {
      router.replace("/");
      return;
    }
    setCareer(c);
  }, [router]);

  if (career === undefined || !career) return null;

  const clube = getClubeEmQualquerDivisao(career.player.clubeId);
  const contrato = career.player.contrato;
  const temporadaAcabou = career.rodada >= 38;

  function verificarPropostas() {
    setOfertas(gerarOfertasMercado(career));
  }

  function aceitar(oferta) {
    const nova = aceitarOferta(career, oferta);
    saveCareer(nova);
    setCareer(nova);
  }

  function cancelar() {
    const nova = cancelarTransferenciaPendente(career);
    saveCareer(nova);
    setCareer(nova);
  }

  return (
    <main className="min-h-screen max-w-md mx-auto px-4 pt-6 pb-28">
      <div className="font-mono text-[10px] tracking-[0.25em] text-gold-400/80 mb-1">
        TRANSFERÊNCIAS & CONTRATO
      </div>
      <h1 className="font-display text-3xl mb-4">MERCADO</h1>

      <div className="card overflow-hidden mb-3">
        <div className="card-header">SEU CONTRATO</div>
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="font-display text-lg">{clube?.name}</div>
              <div className="text-[10px] text-chalk/40 font-mono">{DIVISOES[career.divisao]}</div>
            </div>
            <div className="text-right">
              <div className="font-display text-xl text-gold-400">
                R$ {(contrato?.salario || 0).toLocaleString("pt-BR")}
              </div>
              <div className="text-[10px] text-chalk/40 font-mono">POR MÊS</div>
            </div>
          </div>
          <div className="text-xs text-chalk/50 font-mono">
            {contrato ? `${contrato.temporadasRestantes} temporada(s) restante(s) de contrato` : "sem contrato"}
          </div>
          <div className="text-xs text-chalk/50 font-mono mt-1">
            Saldo acumulado: R$ {career.financas.saldoAcumulado.toLocaleString("pt-BR")}
          </div>
        </div>
      </div>

      {career.transferenciaPendente && (
        <div className="card overflow-hidden mb-3 border-green-action/40">
          <div className="card-header">TRANSFERÊNCIA ACERTADA</div>
          <div className="p-4">
            <div className="text-sm text-chalk/70 mb-3">
              Seu agente fechou com o <span className="text-green-action font-semibold">{career.transferenciaPendente.nomeClube}</span>{" "}
              ({DIVISOES[career.transferenciaPendente.divisao]}). A mudança vale a partir da próxima temporada.
            </div>
            <button onClick={cancelar} className="btn-ghost w-full py-2 rounded-lg text-xs font-mono">
              Cancelar acordo
            </button>
          </div>
        </div>
      )}

      <div className="card overflow-hidden mb-3">
        <div className="card-header">SEU AGENTE</div>
        <div className="p-4">
          <p className="text-sm text-chalk/60 leading-relaxed mb-4">
            {temporadaAcabou
              ? "A temporada terminou — bom momento pra avaliar propostas antes da próxima."
              : "Seu agente pode sondar o mercado a qualquer momento, mas qualquer acordo só entra em vigor na próxima temporada."}
          </p>
          <button
            onClick={verificarPropostas}
            className="btn-primary w-full py-3 rounded-lg font-display text-base tracking-wide"
          >
            PEDIR PRA VER O MERCADO
          </button>
        </div>
      </div>

      {ofertas && (
        <div className="card overflow-hidden mb-4">
          <div className="card-header">PROPOSTAS · {ofertas.length}</div>
          <div className="p-4">
            {ofertas.length === 0 ? (
              <div className="text-sm text-chalk/50">Nenhum clube te procurou dessa vez.</div>
            ) : (
              <div className="space-y-2.5">
                {ofertas.map((o) => (
                  <button
                    key={o.clubeId}
                    onClick={() => aceitar(o)}
                    className="w-full text-left border border-chalk/10 hover:border-green-action/50 hover:bg-green-action/5 rounded-lg p-3 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-display text-lg">{o.nomeClube}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-gold-400/40 text-gold-400">
                        {DIVISOES[o.divisao]}
                      </span>
                    </div>
                    <div className="text-xs text-chalk/50 font-mono">
                      R$ {o.salario.toLocaleString("pt-BR")}/mês · {o.temporadasContrato} temporada(s)
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <BottomNav />
    </main>
  );
}
