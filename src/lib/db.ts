/**
 * lib/db.ts
 * 
 * Configuração do Dexie.js (IndexedDB) para o Church App.
 * Atua como a camada de persistência local (Offline-First).
 * Centraliza a definição do schema e as instâncias das tabelas.
 */

import Dexie, { type Table } from 'dexie';
import { initialQuizQuestions } from './db-seeds';

// --- INTERFACES SINCRONIZADAS (PRISMA-LIKE) ---

/** Representa uma tarefa/escala armazenada localmente. */
export interface LocalTask {
  id: string;
  title: string;
  description?: string;
  teamId: string;
  date: string;
  status: string;
  type: string;
  recurrence: string;
  updatedAt: string;
  _status?: 'synced' | 'pending' | 'error';
}

/** Representa um item de carrinho de compras da cantina. */
export interface CartItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

/** Representa uma venda da cantina armazenada localmente. */
export interface LocalSale {
  id: string;
  total: number;
  paymentMethod: string;
  items: CartItem[];
  orderStatus?: 'preparing' | 'ready' | 'cancelled';
  memberId?: string;
  memberName?: string;
  createdBy: string;
  createdAt: string;
  _status?: 'synced' | 'pending' | 'error';
}

/** Representa um produto da cantina armazenado localmente. */
export interface LocalProduct {
  id: string;
  tenantId?: string;
  name: string;
  price: number;
  cost?: number;
  stock: number;
  minStock?: number;
  category: string;
  active?: boolean;
  availableToday?: boolean;
  imageUrl?: string | null;
  description?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  _status?: 'synced' | 'pending' | 'error';
}

/** Representa um membro da igreja armazenado localmente. */
export interface LocalMember {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  creditBalance?: number;
  role: string;
  status: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  _status?: 'synced' | 'pending' | 'error';
}

/** Representa uma equipe armazenada localmente. */
export interface LocalTeam {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  leaderIds?: string[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  _status?: 'synced' | 'pending' | 'error';
}

// --- INTERFACES DE ENGAJAMENTO (MIGRADO DO MESA APP) ---

/** Pergunta do Quiz Bíblico. */
export interface QuizQuestion {
  id?: number;
  question: string;
  options: string[];
  correctIndex: number;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
}

/** Tentativa/Resultado de um Quiz por usuário. */
export interface QuizAttempt {
  id?: number;
  userId: string;
  userName: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  completedAt: string;
}

/** Postagem no Feed da Comunidade. */
export interface FeedPost {
  id?: number;
  userId: string;
  userName: string;
  userAvatar?: string;
  senderType?: 'user' | 'group';
  senderGroupId?: string;
  type: 'verse' | 'devotional' | 'testimony' | 'prayer' | 'quiz_score' | 'event' | 'social_project' | 'announcement';
  title?: string;
  content: string;
  reference?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  visibility?: 'public' | 'group' | 'individual';
  groupId?: string;
  pinnedUntil?: string;
  targetUserIds?: string[];
  readBy?: string[];
  likes: string[];
  comments: FeedComment[];
  createdAt: string;
}

/** Comentário em postagem do feed. */
export interface FeedComment {
  id: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
}

/** Favorito vinculado a um ou mais versículos. */
export interface BibleFavorite {
  id?: number;
  userId: string;
  translation: 'AA' | 'ACF' | 'NVI';
  bookAbbrev: string;
  bookName: string;
  testament: 'AT' | 'NT';
  chapter: number;
  verseNumbers: number[];
  selectionKey: string;
  createdAt: string;
}

/** Anotação pessoal vinculada a um ou mais versículos. */
export interface BibleAnnotation extends BibleFavorite {
  note: string;
  updatedAt: string;
}

/** Livro disponível localmente para leitura offline. */
export interface OfflineBibleBook {
  translation: 'AA' | 'ACF' | 'NVI';
  abbrev: string;
  name: string;
  testament: 'AT' | 'NT';
  position: number;
  chapterNumbers?: number[];
  cachedAt: string;
  contentVersion: string;
}

/** Capítulo disponível localmente para leitura offline. */
export interface OfflineBibleChapter {
  translation: 'AA' | 'ACF' | 'NVI';
  bookAbbrev: string;
  chapter: number;
  verses: string[];
  cachedAt: string;
  contentVersion: string;
}

export interface OfflineBibleDownload {
  translation: 'AA' | 'ACF' | 'NVI';
  status: 'idle' | 'downloading' | 'paused' | 'ready' | 'error';
  downloadedChapters: number;
  totalChapters: number;
  contentVersion: string;
  updatedAt: string;
}

// --- INFRAESTRUTURA DE SINCRONIZAÇÃO ---

/** Fila de saída para sincronização com o servidor. */
export interface SyncOutbox {
  id?: number;
  module: 'sales' | 'tasks' | 'members' | 'memberCredits' | 'products' | 'feed' | 'quiz' | 'bookmarks' | 'teams';
  action: 'create' | 'update' | 'delete';
  data: unknown;
  timestamp: string;
}

// --- CLASSE PRINCIPAL DO BANCO ---

/**
 * ChurchDB
 * 
 * Classe que estende o Dexie para gerenciar o IndexedDB.
 */
class ChurchDB extends Dexie {
  tasks!: Table<LocalTask>;
  teams!: Table<LocalTeam>;
  sales!: Table<LocalSale>;
  products!: Table<LocalProduct>;
  members!: Table<LocalMember>;
  syncOutbox!: Table<SyncOutbox>;
  quizQuestions!: Table<QuizQuestion>;
  quizAttempts!: Table<QuizAttempt>;
  feedPosts!: Table<FeedPost>;
  bibleFavorites!: Table<BibleFavorite>;
  bibleAnnotations!: Table<BibleAnnotation>;
  offlineBibleBooks!: Table<OfflineBibleBook>;
  offlineBibleChapters!: Table<OfflineBibleChapter>;
  offlineBibleDownloads!: Table<OfflineBibleDownload>;

  constructor() {
    super('church-app-db-v1');
    
    // Definição do Schema e Índices
    this.version(1).stores({
      tasks: 'id, teamId, date, status, _status',
      teams: 'id, name, _status, deletedAt',
      sales: 'id, memberId, createdAt, _status',
      products: 'id, category, stock, _status, deletedAt',
      members: 'id, email, status, _status, deletedAt',
      syncOutbox: '++id, module, action, timestamp',
      quizQuestions: '++id, category, difficulty',
      quizAttempts: '++id, userId, score, completedAt',
      feedPosts: '++id, userId, type, createdAt',
      bibleFavorites: '++id, userId, &[userId+translation+bookAbbrev+chapter+selectionKey], translation, bookAbbrev, chapter, createdAt',
      bibleAnnotations: '++id, userId, translation, bookAbbrev, chapter, createdAt, updatedAt',
      offlineBibleBooks: '[translation+abbrev], translation, testament, position',
      offlineBibleChapters: '[translation+bookAbbrev+chapter], translation, bookAbbrev',
      offlineBibleDownloads: 'translation, status',
    });
  }
}

/** Instância única exportada do banco de dados local. */
export const db = new ChurchDB();

// --- FUNÇÕES DE SEED ---

/**
 * Alimenta o banco local com questões de quiz se estiver vazio.
 */
export async function seedQuizQuestions() {
  const count = await db.quizQuestions.count();
  if (count > 0) return;
  await db.quizQuestions.bulkAdd(initialQuizQuestions);
}

/**
 * Alimenta todos os dados iniciais necessários para o funcionamento offline.
 */
export async function seedOfflineData() {
  await seedQuizQuestions();
}
