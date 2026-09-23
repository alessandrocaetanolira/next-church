/** Dados iniciais locais que não dependem do conteúdo bíblico compartilhado. */

import { QuizQuestion } from './db';

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
  { question: 'Quantos dias Jesus ficou no deserto?', options: ['7', '30', '40', '50'], correctIndex: 2, category: 'Novo Testamento', difficulty: 'easy', points: 10 },
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
