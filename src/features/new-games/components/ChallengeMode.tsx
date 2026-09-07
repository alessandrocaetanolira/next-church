import { useState } from "react";
import { Users, User } from "lucide-react";

interface ChallengeModeProps {
  onStart: (mode: "solo" | "versus", players?: [string, string]) => void;
  currentPlayer: string;
}

const ChallengeMode = ({ onStart, currentPlayer }: ChallengeModeProps) => {
  const [mode, setMode] = useState<null | "solo" | "versus">(null);
  const [player2, setPlayer2] = useState("");

  if (mode === "versus") {
    return (
      <div className="bg-card rounded-xl p-6 border border-border mb-4 animate-fade-in">
        <h3 className="font-display text-lg font-bold text-foreground mb-3">Desafio 2 Jogadores</h3>
        <p className="text-sm text-muted-foreground mb-2">Jogador 1: <strong>{currentPlayer}</strong></p>
        <input
          type="text"
          value={player2}
          onChange={e => setPlayer2(e.target.value)}
          placeholder="Nome do Jogador 2..."
          maxLength={20}
          className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground text-center font-semibold focus:outline-none focus:ring-2 focus:ring-primary mb-3"
          autoFocus
        />
        <div className="flex gap-2">
          <button onClick={() => setMode(null)} className="flex-1 py-2 rounded-lg border border-border text-sm font-semibold hover:bg-secondary transition-colors">Voltar</button>
          <button
            onClick={() => player2.trim().length >= 2 && onStart("versus", [currentPlayer, player2.trim()])}
            disabled={player2.trim().length < 2}
            className="flex-1 btn-game text-sm disabled:opacity-40"
          >
            Iniciar!
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2 mb-4">
      <button
        onClick={() => onStart("solo")}
        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-card border border-border font-semibold text-sm hover:bg-secondary transition-colors"
      >
        <User className="w-4 h-4" /> Solo
      </button>
      <button
        onClick={() => setMode("versus")}
        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-colors"
      >
        <Users className="w-4 h-4" /> Desafio
      </button>
    </div>
  );
};

export default ChallengeMode;
