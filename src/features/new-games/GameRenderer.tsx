"use client";

import type { ComponentType } from "react";
import { useSession } from "next-auth/react";
import { UserProvider } from "@/features/new-games/contexts/UserContext";
import type { NewGameId } from "@/features/new-games/catalog";
import WordSearch from "@/features/new-games/games/WordSearch";
import Hangman from "@/features/new-games/games/Hangman";
import WhoAmI from "@/features/new-games/games/WhoAmI";
import BibleQuiz from "@/features/new-games/games/BibleQuiz";
import MemoryMatch from "@/features/new-games/games/MemoryMatch";
import CompleteVerse from "@/features/new-games/games/CompleteVerse";
import ChronologicalOrder from "@/features/new-games/games/ChronologicalOrder";
import TrueOrFalse from "@/features/new-games/games/TrueOrFalse";
import Crossword from "@/features/new-games/games/Crossword";
import GuessTheBook from "@/features/new-games/games/GuessTheBook";
import SpeedTrivia from "@/features/new-games/games/SpeedTrivia";
import EmojiBible from "@/features/new-games/games/EmojiBible";
import ScrambledVerse from "@/features/new-games/games/ScrambledVerse";
import ConnectPairs from "@/features/new-games/games/ConnectPairs";
import Parables from "@/features/new-games/games/Parables";
import KingsOrProphets from "@/features/new-games/games/KingsOrProphets";
import BibleMath from "@/features/new-games/games/BibleMath";
import BibleBattle from "@/features/new-games/games/BibleBattle";
import ExodusRunner from "@/features/new-games/games/ExodusRunner";
import ArkSurvival from "@/features/new-games/games/ArkSurvival";
import BombQuiz from "@/features/new-games/games/BombQuiz";
import DavidSling from "@/features/new-games/games/DavidSling";
import RedSeaCrossing from "@/features/new-games/games/RedSeaCrossing";
import JerichoWalls from "@/features/new-games/games/JerichoWalls";
import PlaguesOfEgypt from "@/features/new-games/games/PlaguesOfEgypt";
import BibleSnake from "@/features/new-games/games/BibleSnake";
import BibleBomberman from "@/features/new-games/games/BibleBomberman";

const gameComponents: Record<NewGameId, ComponentType> = {
  "caca-palavras": WordSearch,
  "forca": Hangman,
  "quem-sou-eu": WhoAmI,
  "quiz": BibleQuiz,
  "memoria": MemoryMatch,
  "complete-versiculo": CompleteVerse,
  "ordem-cronologica": ChronologicalOrder,
  "verdadeiro-falso": TrueOrFalse,
  "palavras-cruzadas": Crossword,
  "adivinhe-livro": GuessTheBook,
  "trivia-rapida": SpeedTrivia,
  "emoji-biblico": EmojiBible,
  "versiculo-embaralhado": ScrambledVerse,
  "conecte-pares": ConnectPairs,
  "parabolas": Parables,
  "reis-profetas": KingsOrProphets,
  "numeros-biblia": BibleMath,
  "batalha-biblica": BibleBattle,
  "fuga-egito": ExodusRunner,
  "arca-noe": ArkSurvival,
  "quiz-bomba": BombQuiz,
  "funda-davi": DavidSling,
  "travessia-mar": RedSeaCrossing,
  "muralhas-jerico": JerichoWalls,
  "pragas-egito": PlaguesOfEgypt,
  "snake-biblica": BibleSnake,
  "bomberman-biblico": BibleBomberman,
};

export function GameRenderer({ gameId }: { gameId: NewGameId }) {
  const { data: session } = useSession();
  const GameComponent = gameComponents[gameId];

  return (
    <UserProvider initialNickname={session?.user?.name ?? "Jogador"}>
      <GameComponent />
    </UserProvider>
  );
}
