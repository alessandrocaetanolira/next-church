// Daily devotional data with Bible verses and challenges

export interface Devotional {
  id: number;
  verse: string;
  reference: string;
  reflection: string;
  challenge: string;
  challengePoints?: number; // For future gamification
}

const devotionals: Devotional[] = [
  {
    id: 1,
    verse: "Porque Deus tanto amou o mundo que deu o seu Filho Unigênito, para que todo o que nele crer não pereça, mas tenha a vida eterna.",
    reference: "João 3:16",
    reflection: "O amor de Deus é incondicional e eterno. Ele nos amou primeiro, antes mesmo de merecermos.",
    challenge: "Demonstre amor a alguém que você normalmente não demonstraria hoje.",
    challengePoints: 10,
  },
  {
    id: 2,
    verse: "Tudo posso naquele que me fortalece.",
    reference: "Filipenses 4:13",
    reflection: "Nossa força não vem de nós mesmos, mas de Cristo que habita em nós.",
    challenge: "Enfrente um desafio que você vem adiando, confiando em Deus.",
    challengePoints: 15,
  },
  {
    id: 3,
    verse: "O Senhor é o meu pastor; nada me faltará.",
    reference: "Salmos 23:1",
    reflection: "Quando confiamos no Senhor como nosso pastor, encontramos provisão e paz.",
    challenge: "Liste 5 coisas pelas quais você é grato hoje e compartilhe com alguém.",
    challengePoints: 10,
  },
  {
    id: 4,
    verse: "Confie no Senhor de todo o seu coração e não se apoie em seu próprio entendimento.",
    reference: "Provérbios 3:5",
    reflection: "Deus vê o quadro completo. Confiar Nele é a decisão mais sábia que podemos tomar.",
    challenge: "Entregue uma preocupação a Deus em oração e não a retome hoje.",
    challengePoints: 20,
  },
  {
    id: 5,
    verse: "Alegrem-se sempre no Senhor. Novamente direi: alegrem-se!",
    reference: "Filipenses 4:4",
    reflection: "A alegria no Senhor não depende das circunstâncias, mas da nossa fé.",
    challenge: "Espalhe alegria: sorria para 10 pessoas hoje e diga algo encorajador.",
    challengePoints: 10,
  },
  {
    id: 6,
    verse: "Sejam fortes e corajosos. Não tenham medo nem fiquem apavorados, pois o Senhor, o seu Deus, vai com vocês; nunca os deixará, nunca os abandonará.",
    reference: "Deuteronômio 31:6",
    reflection: "Coragem não é ausência de medo, mas a certeza de que Deus está conosco.",
    challenge: "Converse com alguém que está passando por dificuldades e ofereça seu apoio.",
    challengePoints: 15,
  },
  {
    id: 7,
    verse: "E sabemos que todas as coisas cooperam para o bem daqueles que amam a Deus.",
    reference: "Romanos 8:28",
    reflection: "Mesmo nos momentos difíceis, Deus está trabalhando a nosso favor.",
    challenge: "Relembre uma dificuldade passada e identifique como Deus agiu nela.",
    challengePoints: 10,
  },
  {
    id: 8,
    verse: "Mas os que esperam no Senhor renovarão as suas forças; subirão com asas como águias.",
    reference: "Isaías 40:31",
    reflection: "Esperar em Deus não é inatividade — é uma postura de fé ativa.",
    challenge: "Dedique 15 minutos hoje apenas para orar e ouvir a voz de Deus.",
    challengePoints: 20,
  },
  {
    id: 9,
    verse: "Lâmpada para os meus pés é a tua palavra, e luz para o meu caminho.",
    reference: "Salmos 119:105",
    reflection: "A Palavra de Deus ilumina cada passo, mesmo quando o caminho parece escuro.",
    challenge: "Leia um capítulo da Bíblia que você nunca leu antes.",
    challengePoints: 15,
  },
  {
    id: 10,
    verse: "Portanto, não se preocupem com o amanhã, pois o amanhã trará suas próprias preocupações.",
    reference: "Mateus 6:34",
    reflection: "Viver o presente com fé é a melhor forma de honrar a Deus.",
    challenge: "Pratique a presença de Deus: a cada hora, pause e agradeça.",
    challengePoints: 10,
  },
  {
    id: 11,
    verse: "Bem-aventurados os pacificadores, pois serão chamados filhos de Deus.",
    reference: "Mateus 5:9",
    reflection: "Ser pacificador é uma marca dos filhos de Deus no mundo.",
    challenge: "Resolva ou ajude a resolver um conflito hoje com amor e sabedoria.",
    challengePoints: 20,
  },
  {
    id: 12,
    verse: "Deem graças em todas as circunstâncias, pois esta é a vontade de Deus para vocês.",
    reference: "1 Tessalonicenses 5:18",
    reflection: "Gratidão transforma nossa perspectiva e nos aproxima de Deus.",
    challenge: "Escreva uma carta de agradecimento para alguém que impactou sua vida.",
    challengePoints: 15,
  },
  {
    id: 13,
    verse: "Antes de tudo, porém, tenham amor intenso uns pelos outros, porque o amor cobre uma multidão de pecados.",
    reference: "1 Pedro 4:8",
    reflection: "O amor é a marca mais forte do cristão e cobre falhas.",
    challenge: "Perdoe alguém que te magoou e ore por essa pessoa.",
    challengePoints: 25,
  },
  {
    id: 14,
    verse: "Não fui eu que ordenei a você? Seja forte e corajoso! Não se apavore, nem se desanime.",
    reference: "Josué 1:9",
    reflection: "Deus nos ordena coragem porque Ele já garantiu a vitória.",
    challenge: "Comece algo novo que você vem querendo fazer há tempo.",
    challengePoints: 15,
  },
];

export function getChallengePointsForIds(ids: number[]): number {
  return ids.reduce((total, id) => {
    const devotional = devotionals.find((item) => item.id === id);
    return total + (devotional?.challengePoints || 0);
  }, 0);
}

export function getDailyDevotional(): Devotional {
  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
  );
  const index = dayOfYear % devotionals.length;
  return devotionals[index];
}

export function getDevotionalStreak(): number {
  if (typeof window === 'undefined') return 0;
  
  const key = 'devotional-streak';
  const data = JSON.parse(localStorage.getItem(key) || '{"streak":0,"lastDate":""}');
  const today = new Date().toDateString();
  
  if (data.lastDate === today) return data.streak;
  
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  if (data.lastDate === yesterday) return data.streak; // still valid
  
  return 0; // streak broken
}

export function markDevotionalRead(): number {
  if (typeof window === 'undefined') return 0;

  const key = 'devotional-streak';
  const data = JSON.parse(localStorage.getItem(key) || '{"streak":0,"lastDate":""}');
  const today = new Date().toDateString();
  
  if (data.lastDate === today) return data.streak;
  
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const newStreak = data.lastDate === yesterday ? data.streak + 1 : 1;
  
  localStorage.setItem(key, JSON.stringify({ streak: newStreak, lastDate: today }));
  return newStreak;
}

export function hasReadDevotionalToday(): boolean {
  if (typeof window === 'undefined') return false;

  const key = 'devotional-streak';
  const data = JSON.parse(localStorage.getItem(key) || '{"streak":0,"lastDate":""}');
  return data.lastDate === new Date().toDateString();
}

export function markChallengeCompleted(devotionalId: number): void {
  if (typeof window === 'undefined') return;

  const key = 'completed-challenges';
  const completed: number[] = JSON.parse(localStorage.getItem(key) || '[]');
  if (!completed.includes(devotionalId)) {
    completed.push(devotionalId);
    localStorage.setItem(key, JSON.stringify(completed));
  }
}

export function isChallengeCompleted(devotionalId: number): boolean {
  if (typeof window === 'undefined') return false;

  const key = 'completed-challenges';
  const completed: number[] = JSON.parse(localStorage.getItem(key) || '[]');
  return completed.includes(devotionalId);
}

export function getTotalPoints(): number {
  if (typeof window === 'undefined') return 0;

  const key = 'completed-challenges';
  const completed: number[] = JSON.parse(localStorage.getItem(key) || '[]');
  return getChallengePointsForIds(completed);
}
