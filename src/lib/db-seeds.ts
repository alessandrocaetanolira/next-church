/**
 * lib/db-seeds.ts
 * 
 * Dados iniciais (Seed) para o banco local Dexie.js.
 * Utilizado para garantir funcionalidade offline imediata e dados de teste.
 */

import { QuizQuestion, BibleChapter } from './db';

/**
 * Questões iniciais para o Quiz Bíblico.
 */
export const initialQuizQuestions: QuizQuestion[] = [
  { question: 'Quem construiu a arca?', options: ['Moisés', 'Noé', 'Abraão', 'Davi'], correctIndex: 1, category: 'Antigo Testamento', difficulty: 'easy', points: 10 },
  { question: 'Quantos discípulos Jesus teve?', options: ['10', '11', '12', '13'], correctIndex: 2, category: 'Novo Testamento', difficulty: 'easy', points: 10 },
  { question: 'Qual o menor livro da Bíblia?', options: ['Judas', '3 João', '2 João', 'Filemom'], correctIndex: 2, category: 'Geral', difficulty: 'medium', points: 15 },
  { question: 'Quem matou Golias?', options: ['Saul', 'Davi', 'Josué', 'Sansão'], correctIndex: 1, category: 'Antigo Testamento', difficulty: 'easy', points: 10 },
  { question: 'Quantos livros tem a Bíblia?', options: ['64', '66', '72', '73'], correctIndex: 1, category: 'Geral', difficulty: 'easy', points: 10 },
  { question: 'Quem foi jogado na cova dos leões?', options: ['Jonas', 'Daniel', 'Elias', 'Jeremias'], correctIndex: 1, category: 'Antigo Testamento', difficulty: 'easy', points: 10 },
  { question: 'Em que cidade Jesus nasceu?', options: ['Nazaré', 'Jerusalém', 'Belém', 'Cafarnaum'], correctIndex: 2, category: 'Novo Testamento', difficulty: 'easy', points: 10 },
  { question: 'Quem batizou Jesus?', options: ['Pedro', 'João Batista', 'Paulo', 'Tiago'], correctIndex: 1, category: 'Novo Testamento', difficulty: 'easy', points: 10 },
  { question: 'Qual era a profissão de Paulo antes de ser apóstolo?', options: ['Pescador', 'Carpinteiro', 'Fabricante de tendas', 'Cobrador de impostos'], correctIndex: 2, category: 'Novo Testamento', difficulty: 'medium', points: 15 },
  { question: 'Quantos dias Jesus ficou no deserto?', options: ['7', '30', '40', '50'], correctIndex: 2, category: 'Novo Testamento', difficulty: 'medium', points: 15 },
  { question: 'Qual o primeiro livro da Bíblia?', options: ['Êxodo', 'Gênesis', 'Salmos', 'Mateus'], correctIndex: 1, category: 'Geral', difficulty: 'easy', points: 10 },
  { question: 'Quem foi o primeiro rei de Israel?', options: ['Davi', 'Salomão', 'Saul', 'Samuel'], correctIndex: 2, category: 'Antigo Testamento', difficulty: 'medium', points: 15 },
  { question: 'Qual apóstolo negou Jesus três vezes?', options: ['João', 'Judas', 'Pedro', 'Tomé'], correctIndex: 2, category: 'Novo Testamento', difficulty: 'easy', points: 10 },
  { question: 'Quantas pragas Deus enviou ao Egito?', options: ['5', '7', '10', '12'], correctIndex: 2, category: 'Antigo Testamento', difficulty: 'medium', points: 15 },
  { question: 'Quem escreveu a maioria dos Salmos?', options: ['Moisés', 'Salomão', 'Davi', 'Asafe'], correctIndex: 2, category: 'Antigo Testamento', difficulty: 'medium', points: 15 },
  { question: 'Qual o último livro da Bíblia?', options: ['Judas', 'Apocalipse', 'Malaquias', '3 João'], correctIndex: 1, category: 'Geral', difficulty: 'easy', points: 10 },
  { question: 'Quem traiu Jesus por 30 moedas de prata?', options: ['Pedro', 'Tomé', 'Judas Iscariotes', 'Bartolomeu'], correctIndex: 2, category: 'Novo Testamento', difficulty: 'easy', points: 10 },
  { question: 'Qual o fruto proibido no Jardim do Éden, segundo a tradição?', options: ['Uva', 'Maçã', 'Figo', 'A Bíblia não especifica'], correctIndex: 3, category: 'Antigo Testamento', difficulty: 'hard', points: 20 },
  { question: 'Quem foi levado ao céu em um carro de fogo?', options: ['Moisés', 'Enoque', 'Elias', 'Eliseu'], correctIndex: 2, category: 'Antigo Testamento', difficulty: 'hard', points: 20 },
  { question: 'Quantos anos os israelitas vagaram no deserto?', options: ['20', '30', '40', '50'], correctIndex: 2, category: 'Antigo Testamento', difficulty: 'medium', points: 15 },
  { question: 'Qual instrumento Davi tocava?', options: ['Flauta', 'Harpa', 'Trombeta', 'Tambor'], correctIndex: 1, category: 'Músicas', difficulty: 'easy', points: 10 },
  { question: 'Quem cantou após cruzar o Mar Vermelho?', options: ['Moisés', 'Miriã', 'Arão', 'Josué'], correctIndex: 1, category: 'Músicas', difficulty: 'medium', points: 15 },
  { question: 'Paulo e Silas cantaram na prisão. Onde estavam presos?', options: ['Roma', 'Jerusalém', 'Filipos', 'Corinto'], correctIndex: 2, category: 'Músicas', difficulty: 'hard', points: 20 },
];

/**
 * Capítulos iniciais da Bíblia para leitura offline imediata.
 */
export const initialBibleChapters: BibleChapter[] = [
  {
    book: 'Gênesis', chapter: 1, testament: 'AT',
    verses: [
      'No princípio, Deus criou os céus e a terra.',
      'A terra era sem forma e vazia; havia trevas sobre a face do abismo, e o Espírito de Deus pairava sobre as águas.',
      'Disse Deus: "Haja luz", e houve luz.',
      'Deus viu que a luz era boa, e separou a luz das trevas.',
      'Deus chamou à luz Dia, e às trevas chamou Noite. Passaram-se a tarde e a manhã; esse foi o primeiro dia.',
      'Disse Deus: "Haja entre as águas um firmamento que separe águas de águas."',
      'Deus fez o firmamento e separou as águas que ficaram abaixo do firmamento das que ficaram por cima. E assim foi.',
      'Ao firmamento Deus chamou Céu. Passaram-se a tarde e a manhã; esse foi o segundo dia.',
      'E disse Deus: "Ajuntem-se num só lugar as águas que estão debaixo do céu, e apareça a parte seca." E assim foi.',
      'À parte seca Deus chamou Terra, e às águas reunidas chamou Mares. E Deus viu que ficou bom.',
    ],
  },
  {
    book: 'Gênesis', chapter: 2, testament: 'AT',
    verses: [
      'Assim foram concluídos os céus e a terra, e tudo o que neles há.',
      'No sétimo dia Deus já havia concluído a obra que realizara, e nesse dia descansou de toda a sua obra.',
      'Deus abençoou o sétimo dia e o santificou, porque nele descansou de toda a obra que realizara na criação.',
    ],
  },
  {
    book: 'Salmos', chapter: 23, testament: 'AT',
    verses: [
      'O Senhor é o meu pastor; nada me faltará.',
      'Em verdes pastagens me faz repousar e me conduz a águas tranquilas;',
      'restaura-me o vigor. Guia-me pelos caminhos justos, por amor do seu nome.',
      'Mesmo quando eu andar por um vale de trevas e morte, não temerei perigo algum, pois tu estás comigo; a tua vara e o teu cajado me protegem.',
      'Preparas um banquete para mim à vista dos meus inimigos. Tu me unges a cabeça com óleo; o meu cálice transborda.',
      'Sei que a bondade e a fidelidade me acompanharão todos os dias da minha vida, e voltarei à casa do Senhor enquanto eu viver.',
    ],
  },
  {
    book: 'Salmos', chapter: 91, testament: 'AT',
    verses: [
      'Aquele que habita no abrigo do Altíssimo e descansa à sombra do Todo-poderoso',
      'pode dizer ao Senhor: "Tu és o meu refúgio e a minha fortaleza, o meu Deus, em quem confio."',
      'Ele o livrará do laço do caçador e da peste mortífera.',
      'Ele o cobrirá com as suas penas, e sob as suas asas você encontrará refúgio; a fidelidade dele será o seu escudo protetor.',
      'Você não temerá o pavor da noite, nem a flecha que voa de dia,',
      'nem a peste que se move sorrateira nas trevas, nem a praga que devasta ao meio-dia.',
    ],
  },
  {
    book: 'João', chapter: 3, testament: 'NT',
    verses: [
      'Havia entre os fariseus um homem chamado Nicodemos, uma autoridade entre os judeus.',
      'Ele veio a Jesus, à noite, e disse: "Mestre, sabemos que ensinas da parte de Deus, pois ninguém pode realizar os sinais que fazes, se Deus não estiver com ele."',
      'Em resposta, Jesus declarou: "Digo a verdade: Ninguém pode ver o Reino de Deus, se não nascer de novo."',
      '"Como alguém pode nascer, sendo velho?", perguntou Nicodemos.',
      'Respondeu Jesus: "Digo a verdade: Ninguém pode entrar no Reino de Deus, se não nascer da água e do Espírito."',
      '"O que nasce da carne é carne, mas o que nasce do Espírito é espírito."',
      '"Não se surpreenda pelo fato de eu ter dito: É necessário que vocês nasçam de novo."',
    ],
  },
  {
    book: 'Romanos', chapter: 8, testament: 'NT',
    verses: [
      'Portanto, agora já não há condenação para os que estão em Cristo Jesus.',
      'Pois por meio de Cristo Jesus a lei do Espírito de vida me libertou da lei do pecado e da morte.',
      'Porque aquilo que a Lei foi incapaz de fazer, Deus fez, enviando seu próprio Filho.',
      'E se o Espírito daquele que ressuscitou Jesus dentre os mortos habita em vocês, aquele que ressuscitou a Cristo dentre os mortos também dará vida a seus corpos mortais.',
    ],
  },
  {
    book: 'Mateus', chapter: 5, testament: 'NT',
    verses: [
      'Vendo as multidões, Jesus subiu ao monte e se assentou. Seus discípulos vieram a ele,',
      'e ele começou a ensiná-los, dizendo:',
      '"Bem-aventurados os pobres em espírito, pois deles é o Reino dos céus."',
      '"Bem-aventurados os que choram, pois serão consolados."',
      '"Bem-aventurados os mansos, pois herdarão a terra."',
      '"Bem-aventurados os que têm fome e sede de justiça, pois serão satisfeitos."',
      '"Bem-aventurados os misericordiosos, pois obterão misericórdia."',
      '"Bem-aventurados os puros de coração, pois verão a Deus."',
      '"Bem-aventurados os pacificadores, pois serão chamados filhos de Deus."',
    ],
  },
  {
    book: 'Provérbios', chapter: 3, testament: 'AT',
    verses: [
      'Meu filho, não se esqueça da minha instrução, e o seu coração guarde os meus mandamentos;',
      'porque eles aumentarão os seus dias e lhe acrescentarão anos de vida e paz.',
      'Que o amor e a fidelidade jamais o abandonem; prenda-os ao redor do seu pescoço, escreva-os na tábua do seu coração.',
      'Então você terá o favor de Deus e dos homens, e boa reputação.',
      'Confie no Senhor de todo o seu coração e não se apoie em seu próprio entendimento;',
      'reconheça o Senhor em todos os seus caminhos, e ele endireitará as suas veredas.',
    ],
  },
  {
    book: '1 Coríntios', chapter: 13, testament: 'NT',
    verses: [
      'Ainda que eu fale as línguas dos homens e dos anjos, se não tiver amor, serei como o sino que ressoa ou como o prato que retine.',
      'Ainda que eu tenha o dom de profecia e saiba todos os mystérios e todo o conhecimento, e tenha uma fé capaz de mover montanhas, se não tiver amor, nada serei.',
      'O amor é paciente, o amor é bondoso. Não inveja, não se vangloria, não se orgulha.',
      'Não maltrata, não procura seus interesses, não se ira facilmente, não guarda rancor.',
      'Agora, pois, permanecem a fé, a esperança e o amor, estes três; porém o maior destes é o amor.',
    ],
  },
];
