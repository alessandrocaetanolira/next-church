/**
 * Public, stable identifiers for the visual pairs used by the memory game.
 *
 * A multiplayer match persists only these IDs and their order. The image path
 * is resolved by the client, so both players render the exact same board while
 * the database remains independent from the frontend asset implementation.
 */
export const MEMORY_CARD_CATALOG = [
  { id: 'adam-eve', label: 'Adão e Eva', image: '/jogos-novos/memory/adam-eve.png' },
  { id: 'moses-sea', label: 'Moisés e o mar', image: '/jogos-novos/memory/moses-sea.png' },
  { id: 'david-goliath', label: 'Davi e Golias', image: '/jogos-novos/memory/david-goliath.png' },
  { id: 'noah-ark', label: 'Arca de Noé', image: '/jogos-novos/memory/noah-ark.png' },
  { id: 'jonah-fish', label: 'Jonas e o peixe', image: '/jogos-novos/memory/jonah-fish.png' },
  { id: 'daniel-lions', label: 'Daniel e os leões', image: '/jogos-novos/memory/daniel-lions.png' },
] as const;

export type MemoryCardId = (typeof MEMORY_CARD_CATALOG)[number]['id'];

const cardsById = new Map<string, (typeof MEMORY_CARD_CATALOG)[number]>(MEMORY_CARD_CATALOG.map((card) => [card.id, card]));

export function getMemoryCard(id: string) {
  return cardsById.get(id) ?? null;
}

export function createMemoryChallengeBoard(random = Math.random): MemoryCardId[] {
  const board = MEMORY_CARD_CATALOG.flatMap(({ id }) => [id, id]);

  for (let index = board.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(random() * (index + 1));
    [board[index], board[randomIndex]] = [board[randomIndex], board[index]];
  }

  return board;
}
