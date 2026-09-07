export { hasPermission } from './access-control';

// Funções de compatibilidade para o sistema de notificações (Dexie-backed)
import { db } from './db';

let cachedSales: any[] = [];
let cachedTasks: any[] = [];

// Nota: Estas funções são síncronas no projeto original, mas Dexie é assíncrono.
// Para compatibilidade imediata sem mudar toda a lógica de notificações, 
// usaremos um cache que é atualizado em background ou retornado vazio se não carregado.

export function getSales(): any[] {
  db.sales.toArray().then(sales => { cachedSales = sales; });
  return cachedSales;
}

export function getTasks(): any[] {
  db.tasks.toArray().then(tasks => { cachedTasks = tasks; });
  return cachedTasks;
}
