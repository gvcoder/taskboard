export interface PrioritizedCard {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  boardId: string;
  boardTitle: string;
  boardColor: string;
  listId: string;
  listTitle: string;
  statusOrder: number;
  availableLists: Array<{ id: string; title: string; order: number }>;
  labels: Array<{ id: string; name: string; color: string }>;
  totalSubtasks: number;
  completedSubtasks: number;
  updatedAt: string;
}

export interface OfflineMutation {
  id: string;
  cardId: string;
  listId: string;
  timestamp: number;
}

const STORAGE_KEYS = {
  TOKEN: "tb_mobile_token",
  USER: "tb_mobile_user",
  CARDS: "tb_mobile_cached_cards",
  QUEUE: "tb_mobile_mutation_queue",
  LAST_SYNC: "tb_mobile_last_sync",
};

export const mobileStorage = {
  getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(STORAGE_KEYS.TOKEN);
  },

  setToken(token: string) {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.TOKEN, token);
  },

  clearAuth() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
  },

  getUser(): { id: string; email: string; name?: string } | null {
    if (typeof window === "undefined") return null;
    const str = localStorage.getItem(STORAGE_KEYS.USER);
    if (!str) return null;
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  },

  setUser(user: { id: string; email: string; name?: string }) {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  },

  getCachedCards(): PrioritizedCard[] {
    if (typeof window === "undefined") return [];
    const str = localStorage.getItem(STORAGE_KEYS.CARDS);
    if (!str) return [];
    try {
      return JSON.parse(str);
    } catch {
      return [];
    }
  },

  setCachedCards(cards: PrioritizedCard[]) {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(cards));
  },

  getMutationQueue(): OfflineMutation[] {
    if (typeof window === "undefined") return [];
    const str = localStorage.getItem(STORAGE_KEYS.QUEUE);
    if (!str) return [];
    try {
      return JSON.parse(str);
    } catch {
      return [];
    }
  },

  enqueueMutation(mutation: Omit<OfflineMutation, "id">) {
    if (typeof window === "undefined") return;
    const queue = this.getMutationQueue();
    // Filter out previous pending mutation for the same card to coalesce updates
    const filtered = queue.filter((m) => m.cardId !== mutation.cardId);
    filtered.push({
      ...mutation,
      id: Math.random().toString(36).substring(2, 9),
    });
    localStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(filtered));
  },

  clearQueue() {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify([]));
  },

  getLastSync(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
  },

  setLastSync(timestamp: string) {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, timestamp);
  },
};
