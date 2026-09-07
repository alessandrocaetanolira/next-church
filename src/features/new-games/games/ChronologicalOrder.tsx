import { useState } from "react";
import GameLayout from "@/features/new-games/components/GameLayout";

const EVENTS = [
  { id: 1, text: "Criação do mundo", order: 1 },
  { id: 2, text: "Adão e Eva no Éden", order: 2 },
  { id: 3, text: "O dilúvio de Noé", order: 3 },
  { id: 4, text: "Torre de Babel", order: 4 },
  { id: 5, text: "Abraão sai de Ur", order: 5 },
  { id: 6, text: "Êxodo do Egito", order: 6 },
  { id: 7, text: "Davi se torna rei", order: 7 },
  { id: 8, text: "Nascimento de Jesus", order: 8 },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const ChronologicalOrderGame = () => {
  const [items, setItems] = useState(() => shuffle(EVENTS));
  const [checked, setChecked] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const isCorrect = items.every((item, i) => i === 0 || items[i - 1].order <= item.order);

  const moveItem = (from: number, to: number) => {
    const newItems = [...items];
    const [moved] = newItems.splice(from, 1);
    newItems.splice(to, 0, moved);
    setItems(newItems);
    setChecked(false);
  };

  const handleDragStart = (i: number) => setDragIdx(i);
  const handleDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    if (dragIdx !== null && dragIdx !== i) {
      moveItem(dragIdx, i);
      setDragIdx(i);
    }
  };

  const restart = () => {
    setItems(shuffle(EVENTS));
    setChecked(false);
  };

  return (
    <GameLayout title="Ordem Cronológica" emoji="⏳">
      <p className="text-sm text-muted-foreground text-center mb-4">Arraste para ordenar os eventos bíblicos</p>

      <div className="space-y-2 mb-4">
        {items.map((item, i) => (
          <div
            key={item.id}
            draggable
            onDragStart={() => handleDragStart(i)}
            onDragOver={(e) => handleDragOver(e, i)}
            className={`flex items-center gap-3 p-3 rounded-lg border-2 bg-card cursor-grab active:cursor-grabbing transition-all ${
              checked
                ? item.order === items.indexOf(items.sort((a, b) => a.order - b.order).find(x => x.id === item.id)!) 
                  ? ""
                  : ""
                : "border-border"
            } ${checked && isCorrect ? "border-game-success" : checked ? "border-game-error" : "border-border"}`}
          >
            <span className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-sm font-bold">{i + 1}</span>
            <span className="font-body font-semibold">{item.text}</span>
            <div className="ml-auto flex flex-col gap-0.5">
              {i > 0 && <button onClick={() => moveItem(i, i - 1)} className="text-xs text-muted-foreground hover:text-foreground">▲</button>}
              {i < items.length - 1 && <button onClick={() => moveItem(i, i + 1)} className="text-xs text-muted-foreground hover:text-foreground">▼</button>}
            </div>
          </div>
        ))}
      </div>

      {checked && isCorrect ? (
        <div className="text-center animate-bounce-in">
          <p className="text-xl font-display font-bold text-game-success">🎉 Ordem perfeita!</p>
          <button onClick={restart} className="btn-game mt-3">Jogar Novamente</button>
        </div>
      ) : (
        <button onClick={() => setChecked(true)} className="btn-game w-full">
          {checked ? "Tente novamente - Verifique" : "Verificar Ordem"}
        </button>
      )}
    </GameLayout>
  );
};

export default ChronologicalOrderGame;
