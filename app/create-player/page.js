"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { COUNTRIES } from "@/lib/countries";
import { POSITIONS, POSITION_ORDER, ATTRIBUTES, overallForPosition } from "@/lib/positions";
import { saveDraft } from "@/lib/storage";

const TOTAL_PONTOS = 320;
const MIN_ATTR = 25;
const MAX_ATTR = 90;

export default function CreatePlayer() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [nacionalidade, setNacionalidade] = useState("Brasil");
  const [posicao, setPosicao] = useState("ATA");
  const [attrs, setAttrs] = useState({
    ritmo: 50, finalizacao: 50, passe: 50, defesa: 50, fisico: 50, drible: 50,
  });

  const pontosUsados = useMemo(
    () => Object.values(attrs).reduce((a, b) => a + b, 0),
    [attrs]
  );
  const pontosRestantes = TOTAL_PONTOS - pontosUsados;
  const overall = useMemo(() => overallForPosition(attrs, posicao), [attrs, posicao]);

  function updateAttr(key, value) {
    setAttrs((prev) => {
      const novo = { ...prev, [key]: value };
      const novoTotal = Object.values(novo).reduce((a, b) => a + b, 0);
      if (novoTotal > TOTAL_PONTOS) return prev;
      return novo;
    });
  }

  function podeConfirmar() {
    return nome.trim().length >= 2;
  }

  function irPraPeneira() {
    if (!podeConfirmar()) return;
    saveDraft({ nome: nome.trim(), nacionalidade, posicao, atributos: attrs });
    router.push("/peneira");
  }

  return (
    <main className="min-h-screen max-w-md mx-auto px-6 py-10 pb-24">
      <div className="font-mono text-xs tracking-[0.3em] text-gold-400/80 mb-2">NOVA CARREIRA</div>
      <h1 className="font-display text-4xl mb-6">CRIE SEU JOGADOR</h1>

      <div className="space-y-5">
        <div>
          <label className="text-xs text-chalk/50 font-mono block mb-1">NOME</label>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Victor Souza"
            className="w-full bg-white/5 border border-chalk/15 rounded-lg px-3 py-2.5 text-chalk placeholder:text-chalk/30 focus:outline-none focus:border-gold-500"
          />
        </div>

        <div>
          <label className="text-xs text-chalk/50 font-mono block mb-1">NACIONALIDADE</label>
          <select
            value={nacionalidade}
            onChange={(e) => setNacionalidade(e.target.value)}
            className="w-full bg-white/5 border border-chalk/15 rounded-lg px-3 py-2.5 text-chalk focus:outline-none focus:border-gold-500"
          >
            {COUNTRIES.map((c) => (
              <option key={c} value={c} className="bg-navy-900">{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-chalk/50 font-mono block mb-2">POSIÇÃO</label>
          <div className="grid grid-cols-3 gap-2">
            {POSITION_ORDER.map((p) => (
              <button
                key={p}
                onClick={() => setPosicao(p)}
                className={`py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
                  posicao === p
                    ? "bg-gold-500 text-navy-950 border-gold-500"
                    : "bg-white/5 border-chalk/15 text-chalk/70 hover:bg-white/10"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="text-xs text-chalk/40 mt-1">{POSITIONS[posicao].label}</div>
        </div>

        <div className="card overflow-hidden">
          <div className="card-header flex items-center justify-between">
            <span>ATRIBUTOS</span>
            <span className={`text-xs font-mono ${pontosRestantes < 0 ? "text-ember" : "text-gold-400"}`}>
              {pontosRestantes} pontos
            </span>
          </div>
          <div className="p-4 space-y-4">
            {ATTRIBUTES.map((a) => (
              <div key={a.key}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-chalk/80">{a.label}</span>
                  <span className="font-mono text-gold-400">{attrs[a.key]}</span>
                </div>
                <input
                  type="range"
                  min={MIN_ATTR}
                  max={MAX_ATTR}
                  value={attrs[a.key]}
                  onChange={(e) => updateAttr(a.key, Number(e.target.value))}
                  className="w-full"
                />
              </div>
            ))}
            <div className="pt-3 border-t border-chalk/10 flex items-center justify-between">
              <span className="text-xs text-chalk/50">Overall na posição ({posicao})</span>
              <span className="font-display text-2xl text-gold-400">{overall}</span>
            </div>
          </div>
        </div>

        <div className="text-xs text-chalk/40 leading-relaxed px-1">
          Você ainda não tem clube — o próximo passo é a peneira: uma partida-teste onde
          olheiros avaliam seu desempenho e clubes fazem propostas.
        </div>

        <button
          onClick={irPraPeneira}
          disabled={!podeConfirmar()}
          className="btn-primary w-full py-4 rounded-lg font-display text-xl tracking-wide disabled:opacity-40"
        >
          IR PRA PENEIRA
        </button>
      </div>
    </main>
  );
}
