import { useState, useEffect, useRef, useCallback } from "react";
import GameLayout from "@/features/new-games/components/GameLayout";
import ChallengeMode from "@/features/new-games/components/ChallengeMode";
import { useUser } from "@/features/new-games/contexts/UserContext";

const QUESTIONS = [
  { q: "Quem construiu a arca?", options: ["Noé", "Moisés", "Abraão", "Davi"], answer: 0 },
  { q: "Quantos dias Deus levou para criar o mundo?", options: ["5", "6", "7", "10"], answer: 1 },
  { q: "Quem matou Golias?", options: ["Saul", "Davi", "Sansão", "Josué"], answer: 1 },
  { q: "Qual foi o primeiro milagre de Jesus?", options: ["Andar sobre as águas", "Ressuscitar Lázaro", "Transformar água em vinho", "Multiplicar pães"], answer: 2 },
  { q: "Quantos apóstolos Jesus teve?", options: ["7", "10", "12", "15"], answer: 2 },
  { q: "Quem traiu Jesus?", options: ["Pedro", "Judas", "Tomé", "João"], answer: 1 },
  { q: "Em qual monte Moisés recebeu os 10 mandamentos?", options: ["Carmelo", "Sinai", "Sião", "Oliveiras"], answer: 1 },
  { q: "Quem foi jogado na cova dos leões?", options: ["Jonas", "Daniel", "Elias", "Jeremias"], answer: 1 },
  { q: "Quantos livros tem a Bíblia?", options: ["55", "66", "72", "39"], answer: 1 },
  { q: "Quem foi o primeiro rei de Israel?", options: ["Davi", "Salomão", "Saul", "Josué"], answer: 2 },
  { q: "Qual era a profissão de Jesus?", options: ["Pescador", "Carpinteiro", "Pastor", "Agricultor"], answer: 1 },
  { q: "Quem escreveu a maioria das cartas do Novo Testamento?", options: ["Pedro", "João", "Paulo", "Tiago"], answer: 2 },
  { q: "Quem foi engolido por um grande peixe?", options: ["Jonas", "Elias", "Noé", "Moisés"], answer: 0 },
  { q: "Qual fruto era proibido no Éden?", options: ["Maçã", "Uva", "Figo", "Fruto da árvore do conhecimento"], answer: 3 },
  { q: "Quem interpretou os sonhos do Faraó?", options: ["Moisés", "José", "Daniel", "Abraão"], answer: 1 },
];

const TIMER = 10;
const ROUNDS = 10;

function shuffleQuestions() {
  const arr = [...QUESTIONS];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, ROUNDS);
}

type GamePhase = "menu" | "playing" | "result";

const SpeedTrivia = () => {
  const { nickname } = useUser();
  const [phase, setPhase] = useState<GamePhase>("menu");
  const [mode, setMode] = useState<"solo" | "versus">("solo");
  const [players, setPlayers] = useState<[string, string]>(["", ""]);
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [scores, setScores] = useState([0, 0]);

  const [questions, setQuestions] = useState(shuffleQuestions);
  const [qIndex, setQIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIMER);
  const [selected, setSelected] = useState<number | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const currentQ = questions[qIndex];

  const startGame = (m: "solo" | "versus", p?: [string, string]) => {
    setMode(m);
    setPlayers(p || [nickname || "Jogador", ""]);
    setScores([0, 0]);
    setCurrentPlayerIdx(0);
    setQuestions(shuffleQuestions());
    setQIndex(0);
    setTimeLeft(TIMER);
    setSelected(null);
    setShowAnswer(false);
    setPhase("playing");
  };

  const handleAnswer = useCallback((idx: number) => {
    if (showAnswer) return;
    setSelected(idx);
    setShowAnswer(true);
    clearInterval(timerRef.current);
    if (idx === currentQ.answer) {
      setScores(prev => {
        const n = [...prev];
        n[currentPlayerIdx]++;
        return n;
      });
    }
  }, [showAnswer, currentQ, currentPlayerIdx]);

  const nextQuestion = () => {
    if (qIndex + 1 >= ROUNDS) {
      if (mode === "versus" && currentPlayerIdx === 0) {
        setCurrentPlayerIdx(1);
        setQuestions(shuffleQuestions());
        setQIndex(0);
        setTimeLeft(TIMER);
        setSelected(null);
        setShowAnswer(false);
      } else {
        setPhase("result");
      }
    } else {
      setQIndex(i => i + 1);
      setTimeLeft(TIMER);
      setSelected(null);
      setShowAnswer(false);
    }
  };

  useEffect(() => {
    if (phase !== "playing" || showAnswer) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          setShowAnswer(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase, qIndex, showAnswer, currentPlayerIdx]);

  return (
    <GameLayout title="Trivia Rápida" emoji="⚡">
      {phase === "menu" && (
        <ChallengeMode onStart={startGame} currentPlayer={nickname || "Jogador"} />
      )}

      {phase === "playing" && currentQ && (
        <div className="animate-fade-in">
          {mode === "versus" && (
            <div className="text-center mb-2">
              <span className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                Vez de: {players[currentPlayerIdx]}
              </span>
            </div>
          )}

          <div className="flex justify-between items-center mb-3">
            <span className="text-sm text-muted-foreground">{qIndex + 1}/{ROUNDS}</span>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold border-4 ${
              timeLeft <= 3 ? "border-destructive text-destructive animate-pulse" : "border-primary text-primary"
            }`}>
              {timeLeft}
            </div>
          </div>

          <div className="bg-card rounded-xl p-5 border border-border mb-4">
            <p className="font-display text-lg font-bold text-foreground text-center">{currentQ.q}</p>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {currentQ.options.map((opt, i) => {
              let classes = "w-full py-3 px-4 rounded-lg border-2 text-left font-semibold text-sm transition-all ";
              if (showAnswer) {
                if (i === currentQ.answer) classes += "border-game-success bg-game-success/10 text-foreground";
                else if (i === selected) classes += "border-destructive bg-destructive/10 text-foreground";
                else classes += "border-border bg-card text-muted-foreground";
              } else {
                classes += "border-border bg-card hover:bg-secondary text-foreground";
              }
              return (
                <button key={i} onClick={() => handleAnswer(i)} disabled={showAnswer} className={classes}>
                  {opt}
                </button>
              );
            })}
          </div>

          {showAnswer && (
            <div className="text-center mt-4">
              <button onClick={nextQuestion} className="btn-game">
                {qIndex + 1 >= ROUNDS && (mode === "solo" || currentPlayerIdx === 1) ? "Ver Resultado" : "Próxima →"}
              </button>
            </div>
          )}
        </div>
      )}

      {phase === "result" && (
        <div className="text-center animate-fade-in">
          <p className="text-4xl mb-4">🏆</p>
          {mode === "versus" ? (
            <>
              <p className="font-display text-xl font-bold text-foreground mb-2">
                {scores[0] > scores[1] ? `${players[0]} venceu!` : scores[1] > scores[0] ? `${players[1]} venceu!` : "Empate!"}
              </p>
              <div className="flex justify-center gap-6 mb-4">
                <div className="text-center">
                  <p className="font-semibold">{players[0]}</p>
                  <p className="text-2xl font-bold text-primary">{scores[0]}/{ROUNDS}</p>
                </div>
                <div className="text-center">
                  <p className="font-semibold">{players[1]}</p>
                  <p className="text-2xl font-bold text-primary">{scores[1]}/{ROUNDS}</p>
                </div>
              </div>
            </>
          ) : (
            <p className="font-display text-xl font-bold text-foreground mb-4">
              Você acertou {scores[0]} de {ROUNDS}!
            </p>
          )}
          <div className="flex gap-2 justify-center">
            <button onClick={() => startGame(mode, mode === "versus" ? players : undefined)} className="btn-game text-sm">Jogar Novamente</button>
            <button onClick={() => setPhase("menu")} className="px-4 py-2 rounded-lg border border-border text-sm font-semibold hover:bg-secondary transition-colors">Menu</button>
          </div>
        </div>
      )}
    </GameLayout>
  );
};

export default SpeedTrivia;
