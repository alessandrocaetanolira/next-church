import { useState, useEffect } from "react";
import GameLayout from "@/features/new-games/components/GameLayout";

interface Character {
  name: string;
  emoji: string;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  special: string;
  specialDmg: number;
}

const HEROES: Character[] = [
  { name: "Davi", emoji: "👦", hp: 100, maxHp: 100, attack: 25, defense: 10, special: "Funda de Pedra", specialDmg: 45 },
  { name: "Sansão", emoji: "💪", hp: 130, maxHp: 130, attack: 30, defense: 8, special: "Força Divina", specialDmg: 50 },
  { name: "Moisés", emoji: "🧔", hp: 90, maxHp: 90, attack: 20, defense: 15, special: "Vara de Deus", specialDmg: 55 },
  { name: "Josué", emoji: "⚔️", hp: 110, maxHp: 110, attack: 28, defense: 12, special: "Grito de Guerra", specialDmg: 40 },
  { name: "Elias", emoji: "🔥", hp: 85, maxHp: 85, attack: 22, defense: 10, special: "Fogo do Céu", specialDmg: 60 },
];

const ENEMIES: Character[] = [
  { name: "Golias", emoji: "👹", hp: 120, maxHp: 120, attack: 20, defense: 12, special: "Lança Gigante", specialDmg: 35 },
  { name: "Faraó", emoji: "🐍", hp: 100, maxHp: 100, attack: 18, defense: 15, special: "Pragas", specialDmg: 40 },
  { name: "Nabucodonosor", emoji: "👑", hp: 110, maxHp: 110, attack: 22, defense: 14, special: "Fornalha", specialDmg: 45 },
  { name: "Herodes", emoji: "🗡️", hp: 90, maxHp: 90, attack: 25, defense: 10, special: "Decreto Real", specialDmg: 38 },
  { name: "Leviatã", emoji: "🐉", hp: 150, maxHp: 150, attack: 28, defense: 18, special: "Abismo", specialDmg: 50 },
];

const BibleBattle = () => {
  const [hero, setHero] = useState<Character | null>(null);
  const [enemy, setEnemy] = useState<Character | null>(null);
  const [heroHp, setHeroHp] = useState(0);
  const [enemyHp, setEnemyHp] = useState(0);
  const [specialReady, setSpecialReady] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [turn, setTurn] = useState<"player" | "enemy" | "choosing">("choosing");
  const [round, setRound] = useState(0);
  const [wins, setWins] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [shakeHero, setShakeHero] = useState(false);
  const [shakeEnemy, setShakeEnemy] = useState(false);

  const pickHero = (h: Character) => {
    setHero(h);
    setHeroHp(h.hp);
    nextEnemy();
    setTurn("player");
    setLog(["⚔️ A batalha começou!"]);
    setSpecialReady(0);
  };

  const nextEnemy = () => {
    const e = ENEMIES[Math.floor(Math.random() * ENEMIES.length)];
    setEnemy({ ...e });
    setEnemyHp(e.hp);
    setRound(r => r + 1);
  };

  const addLog = (msg: string) => setLog(prev => [msg, ...prev].slice(0, 6));

  const doAttack = (isSpecial: boolean) => {
    if (turn !== "player" || !hero || !enemy) return;

    const dmg = isSpecial
      ? Math.max(hero.specialDmg - enemy.defense, 5)
      : Math.max(hero.attack - enemy.defense + Math.floor(Math.random() * 10), 3);

    if (isSpecial) setSpecialReady(0);

    const newEhp = Math.max(enemyHp - dmg, 0);
    setEnemyHp(newEhp);
    setShakeEnemy(true);
    setTimeout(() => setShakeEnemy(false), 300);
    addLog(`${hero.emoji} ${isSpecial ? hero.special : "Ataque"} → -${dmg} HP`);

    if (newEhp <= 0) {
      addLog(`🏆 ${enemy.name} derrotado!`);
      setWins(w => w + 1);
      setTimeout(() => {
        nextEnemy();
        setHeroHp(h => Math.min(h + 20, hero.maxHp));
        addLog("❤️ +20 HP recuperado! Novo inimigo!");
        setTurn("player");
      }, 1200);
      return;
    }

    setTurn("enemy");
    setTimeout(() => enemyTurn(newEhp), 800);
  };

  const enemyTurn = (_: number) => {
    if (!enemy || !hero) return;
    const useSpecial = Math.random() > 0.7;
    const dmg = useSpecial
      ? Math.max(enemy.specialDmg - hero.defense, 5)
      : Math.max(enemy.attack - hero.defense + Math.floor(Math.random() * 8), 3);

    const newHhp = Math.max(heroHp - dmg, 0);
    setHeroHp(newHhp);
    setShakeHero(true);
    setTimeout(() => setShakeHero(false), 300);
    addLog(`${enemy.emoji} ${useSpecial ? enemy.special : "Ataque"} → -${dmg} HP`);
    setSpecialReady(s => Math.min(s + 1, 3));

    if (newHhp <= 0) {
      addLog(`💀 ${hero.name} foi derrotado!`);
      setGameOver(true);
      return;
    }
    setTurn("player");
  };

  const restart = () => {
    setHero(null);
    setEnemy(null);
    setTurn("choosing");
    setWins(0);
    setRound(0);
    setGameOver(false);
    setLog([]);
    setSpecialReady(0);
  };

  if (turn === "choosing") {
    return (
      <GameLayout title="Batalha Bíblica" emoji="⚔️">
        <p className="text-center font-display text-lg font-bold mb-4">Escolha seu herói</p>
        <div className="grid grid-cols-2 gap-3">
          {HEROES.map(h => (
            <button key={h.name} onClick={() => pickHero(h)}
              className="bg-card border-2 border-border rounded-xl p-4 text-center hover:border-primary transition-all hover:scale-105">
              <div className="text-4xl mb-2">{h.emoji}</div>
              <p className="font-display font-bold text-sm">{h.name}</p>
              <p className="text-xs text-muted-foreground">❤️{h.hp} ⚔️{h.attack} 🛡️{h.defense}</p>
              <p className="text-xs text-primary mt-1">💥 {h.special}</p>
            </button>
          ))}
        </div>
      </GameLayout>
    );
  }

  if (gameOver) {
    return (
      <GameLayout title="Batalha Bíblica" emoji="⚔️">
        <div className="text-center mt-10 animate-fade-in">
          <div className="text-6xl mb-4">💀</div>
          <p className="font-display text-2xl font-bold">Derrota!</p>
          <p className="text-muted-foreground mt-2">Você venceu {wins} batalha{wins !== 1 ? "s" : ""}</p>
          <button onClick={restart} className="btn-game mt-6">Tentar Novamente</button>
        </div>
      </GameLayout>
    );
  }

  return (
    <GameLayout title="Batalha Bíblica" emoji="⚔️">
      <div className="text-center text-xs text-muted-foreground mb-2">Rodada {round} • Vitórias: {wins}</div>

      {/* Enemy */}
      <div className={`bg-card border border-border rounded-xl p-4 mb-3 text-center transition-transform ${shakeEnemy ? "animate-[shake_0.3s]" : ""}`}>
        <div className="text-4xl mb-1">{enemy?.emoji}</div>
        <p className="font-display font-bold">{enemy?.name}</p>
        <div className="w-full bg-muted rounded-full h-3 mt-2 overflow-hidden">
          <div className="bg-destructive h-full rounded-full transition-all duration-300"
            style={{ width: `${(enemyHp / (enemy?.maxHp || 1)) * 100}%` }} />
        </div>
        <p className="text-xs text-muted-foreground mt-1">{enemyHp}/{enemy?.maxHp} HP</p>
      </div>

      <div className="text-center text-2xl my-2">⚡</div>

      {/* Hero */}
      <div className={`bg-card border-2 border-primary/30 rounded-xl p-4 mb-3 text-center transition-transform ${shakeHero ? "animate-[shake_0.3s]" : ""}`}>
        <div className="text-4xl mb-1">{hero?.emoji}</div>
        <p className="font-display font-bold">{hero?.name}</p>
        <div className="w-full bg-muted rounded-full h-3 mt-2 overflow-hidden">
          <div className="bg-primary h-full rounded-full transition-all duration-300"
            style={{ width: `${(heroHp / (hero?.maxHp || 1)) * 100}%` }} />
        </div>
        <p className="text-xs text-muted-foreground mt-1">{heroHp}/{hero?.maxHp} HP</p>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <button onClick={() => doAttack(false)} disabled={turn !== "player"}
          className="btn-game disabled:opacity-50">⚔️ Atacar</button>
        <button onClick={() => doAttack(true)} disabled={turn !== "player" || specialReady < 3}
          className="btn-game bg-gradient-to-r from-amber-500 to-red-500 disabled:opacity-50">
          💥 {hero?.special} {specialReady < 3 ? `(${specialReady}/3)` : "✓"}
        </button>
      </div>

      {/* Log */}
      <div className="bg-muted/50 rounded-lg p-3 space-y-1 max-h-32 overflow-y-auto">
        {log.map((l, i) => (
          <p key={i} className={`text-xs ${i === 0 ? "font-bold text-foreground" : "text-muted-foreground"}`}>{l}</p>
        ))}
      </div>
    </GameLayout>
  );
};

export default BibleBattle;
