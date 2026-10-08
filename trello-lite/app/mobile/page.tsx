"use client";

import { useState, useEffect, useCallback } from "react";
import {
  mobileStorage,
  PrioritizedCard,
  OfflineMutation,
} from "@/lib/mobile-storage";
import {
  CheckCircle2,
  Clock,
  LogOut,
  RefreshCw,
  Wifi,
  WifiOff,
  Calendar,
  Layers,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";

export default function MobileApp() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<{ id: string; email: string; name?: string } | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // App data state
  const [cards, setCards] = useState<PrioritizedCard[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [filterList, setFilterList] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCardId, setActiveCardId] = useState<string | null>(null);

  // Register service worker for offline shell caching
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  // Sync online status
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => {
      setIsOnline(true);
      replayQueueAndRefresh();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Initialize auth & cached state
  useEffect(() => {
    const savedToken = mobileStorage.getToken();
    const savedUser = mobileStorage.getUser();
    if (savedToken) {
      setToken(savedToken);
      setUser(savedUser);
      // Load offline cache first for instant rendering
      const cached = mobileStorage.getCachedCards();
      if (cached.length > 0) {
        setCards(cached);
      }
      setPendingSyncCount(mobileStorage.getMutationQueue().length);
      // Attempt remote fetch
      fetchCards(savedToken);
    }
  }, []);

  // Fetch prioritized cards from API
  const fetchCards = async (authToken: string) => {
    if (!navigator.onLine) return;
    try {
      setIsSyncing(true);
      const res = await fetch("/api/mobile/cards", {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (res.status === 401) {
        handleLogout();
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setCards(data.cards);
        mobileStorage.setCachedCards(data.cards);
        mobileStorage.setLastSync(data.syncedAt);
      }
    } catch (e) {
      console.error("Failed to fetch fresh cards:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  // Replay pending offline mutation queue
  const replayQueueAndRefresh = useCallback(async () => {
    const currentToken = mobileStorage.getToken();
    if (!currentToken || !navigator.onLine) return;

    const queue = mobileStorage.getMutationQueue();
    if (queue.length === 0) {
      fetchCards(currentToken);
      return;
    }

    setIsSyncing(true);
    try {
      const res = await fetch("/api/mobile/cards/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify({
          mutations: queue.map((m) => ({
            cardId: m.cardId,
            listId: m.listId,
            timestamp: m.timestamp,
          })),
        }),
      });

      if (res.ok) {
        mobileStorage.clearQueue();
        setPendingSyncCount(0);
        await fetchCards(currentToken);
      }
    } catch (e) {
      console.error("Queue replay failed:", e);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setIsLoggingIn(true);

    try {
      const res = await fetch("/api/mobile/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailInput, password: passwordInput }),
      });

      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || "Login failed");
        return;
      }

      mobileStorage.setToken(data.token);
      mobileStorage.setUser(data.user);
      setToken(data.token);
      setUser(data.user);
      fetchCards(data.token);
    } catch (err: any) {
      setAuthError("Network error. Check connection.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Logout
  const handleLogout = () => {
    mobileStorage.clearAuth();
    setToken(null);
    setUser(null);
    setCards([]);
    setEmailInput("");
    setPasswordInput("");
  };

  // Quick Status Toggle (One-tap next status)
  const handleToggleNextStatus = async (card: PrioritizedCard) => {
    if (card.availableLists.length <= 1) return;

    const currentIndex = card.availableLists.findIndex(
      (l) => l.id === card.listId
    );
    const nextIndex = (currentIndex + 1) % card.availableLists.length;
    const targetList = card.availableLists[nextIndex];

    // 1. Optimistic local state update
    const updatedCards = cards.map((c) => {
      if (c.id === card.id) {
        return {
          ...c,
          listId: targetList.id,
          listTitle: targetList.title,
          statusOrder: targetList.order,
          updatedAt: new Date().toISOString(),
        };
      }
      return c;
    });

    setCards(updatedCards);
    mobileStorage.setCachedCards(updatedCards);

    // 2. Offline / online queueing
    if (!navigator.onLine) {
      mobileStorage.enqueueMutation({
        cardId: card.id,
        listId: targetList.id,
        timestamp: Date.now(),
      });
      setPendingSyncCount(mobileStorage.getMutationQueue().length);
      return;
    }

    // 3. Online direct patch with queue fallback
    try {
      const res = await fetch(`/api/mobile/cards/${card.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ listId: targetList.id }),
      });

      if (!res.ok) {
        throw new Error("Server update failed");
      }
    } catch {
      mobileStorage.enqueueMutation({
        cardId: card.id,
        listId: targetList.id,
        timestamp: Date.now(),
      });
      setPendingSyncCount(mobileStorage.getMutationQueue().length);
    }
  };

  // Explicitly select status
  const handleSelectStatus = async (card: PrioritizedCard, targetListId: string) => {
    const targetList = card.availableLists.find((l) => l.id === targetListId);
    if (!targetList || targetList.id === card.listId) {
      setActiveCardId(null);
      return;
    }

    const updatedCards = cards.map((c) => {
      if (c.id === card.id) {
        return {
          ...c,
          listId: targetList.id,
          listTitle: targetList.title,
          statusOrder: targetList.order,
          updatedAt: new Date().toISOString(),
        };
      }
      return c;
    });

    setCards(updatedCards);
    mobileStorage.setCachedCards(updatedCards);
    setActiveCardId(null);

    if (!navigator.onLine) {
      mobileStorage.enqueueMutation({
        cardId: card.id,
        listId: targetList.id,
        timestamp: Date.now(),
      });
      setPendingSyncCount(mobileStorage.getMutationQueue().length);
      return;
    }

    try {
      await fetch(`/api/mobile/cards/${card.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ listId: targetList.id }),
      });
    } catch {
      mobileStorage.enqueueMutation({
        cardId: card.id,
        listId: targetList.id,
        timestamp: Date.now(),
      });
      setPendingSyncCount(mobileStorage.getMutationQueue().length);
    }
  };

  // Filtered Cards
  const filteredCards = cards.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.boardTitle.toLowerCase().includes(searchQuery.toLowerCase());
    if (filterList === "ALL") return matchesSearch;
    return matchesSearch && c.listTitle.toLowerCase() === filterList.toLowerCase();
  });

  // Unique list titles across boards for simple filtering
  const distinctStatuses = Array.from(
    new Set(cards.map((c) => c.listTitle))
  );

  // Status badge styling helper
  const getStatusBadgeStyle = (title: string) => {
    const lower = title.toLowerCase();
    if (lower.includes("done") || lower.includes("complete")) {
      return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
    }
    if (lower.includes("progress") || lower.includes("doing")) {
      return "bg-amber-500/20 text-amber-300 border-amber-500/30";
    }
    return "bg-sky-500/20 text-sky-300 border-sky-500/30";
  };

  // LOGIN SCREEN
  if (!token) {
    return (
      <main className="flex-1 flex flex-col justify-center px-6 py-12 max-w-sm mx-auto w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 mx-auto flex items-center justify-center text-blue-400 mb-4 shadow-lg shadow-blue-500/10">
            <Layers className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">TaskBoard Lite</h1>
          <p className="text-xs text-slate-400 mt-1">
            Mobile companion for rapid status toggles
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {authError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-xs text-red-400">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              required
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="user@example.com"
              className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-medium rounded-xl text-sm transition-all shadow-lg shadow-blue-600/25 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoggingIn ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <span>Sign In to Mobile App</span>
            )}
          </button>
        </form>

        <p className="text-[11px] text-center text-slate-600 mt-8">
          Member credentials provided by workspace admin
        </p>
      </main>
    );
  }

  // MAIN PRIORITY LIST SCREEN
  return (
    <div className="flex-1 flex flex-col max-w-md mx-auto w-full pb-8">
      {/* Top Header */}
      <header className="sticky top-0 z-20 bg-slate-950/90 backdrop-blur-md border-b border-slate-900 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white leading-tight">
              TaskBoard Lite
            </h1>
            <p className="text-[10px] text-slate-400 truncate max-w-[130px]">
              {user?.email}
            </p>
          </div>
        </div>

        {/* Sync Status Badge & Actions */}
        <div className="flex items-center gap-2">
          <div
            className={`px-2 py-1 rounded-full text-[10px] font-medium flex items-center gap-1.5 border ${
              isOnline
                ? pendingSyncCount > 0
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                  : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-rose-500/10 border-rose-500/30 text-rose-400"
            }`}
          >
            {isOnline ? (
              <>
                <Wifi className="w-3 h-3" />
                {pendingSyncCount > 0 ? (
                  <span>{pendingSyncCount} sync pending</span>
                ) : (
                  <span>Live</span>
                )}
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3" />
                <span>Offline ({pendingSyncCount})</span>
              </>
            )}
          </div>

          <button
            onClick={() => (token ? fetchCards(token) : null)}
            disabled={isSyncing || !isOnline}
            aria-label="Refresh"
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-blue-400" : ""}`} />
          </button>

          <button
            onClick={handleLogout}
            aria-label="Sign Out"
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Search & Quick Filter Pills */}
      <section className="px-4 pt-3 pb-2 space-y-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter prioritized tasks..."
          className="w-full px-3.5 py-2 bg-slate-900/80 border border-slate-800/80 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500/40"
        />

        {distinctStatuses.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            <button
              onClick={() => setFilterList("ALL")}
              className={`px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors ${
                filterList === "ALL"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-900 text-slate-400 border border-slate-800"
              }`}
            >
              All ({cards.length})
            </button>
            {distinctStatuses.map((st) => (
              <button
                key={st}
                onClick={() => setFilterList(st)}
                className={`px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors ${
                  filterList === st
                    ? "bg-blue-600 text-white"
                    : "bg-slate-900 text-slate-400 border border-slate-800"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Cards List */}
      <section className="px-4 py-2 flex-1 space-y-2.5">
        {filteredCards.length === 0 ? (
          <div className="py-16 text-center text-slate-600 text-xs flex flex-col items-center gap-2">
            <CheckCircle2 className="w-8 h-8 opacity-40 text-slate-500" />
            <p>No cards found in current view</p>
          </div>
        ) : (
          filteredCards.map((card) => {
            const isSelectorOpen = activeCardId === card.id;

            return (
              <div
                key={card.id}
                className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-3.5 shadow-sm transition-all relative overflow-hidden"
              >
                {/* Board Color Accent Bar */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-1"
                  style={{ backgroundColor: card.boardColor || "#2563eb" }}
                />

                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider block mb-1">
                      {card.boardTitle}
                    </span>
                    <h2 className="text-sm font-semibold text-slate-100 leading-snug">
                      {card.title}
                    </h2>
                    {card.description && (
                      <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                        {card.description}
                      </p>
                    )}
                  </div>

                  {/* Quick Toggle Status Pill */}
                  <button
                    onClick={() => handleToggleNextStatus(card)}
                    className={`shrink-0 px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold flex items-center gap-1.5 transition-transform active:scale-95 ${getStatusBadgeStyle(
                      card.listTitle
                    )}`}
                    title="Tap to advance status"
                  >
                    <span>{card.listTitle}</span>
                    <ArrowRight className="w-3 h-3 opacity-60" />
                  </button>
                </div>

                {/* Subtasks / Due Date / Details Bar */}
                <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-3">
                    {card.dueDate && (
                      <div className="flex items-center gap-1 text-slate-400">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        <span>{new Date(card.dueDate).toLocaleDateString()}</span>
                      </div>
                    )}

                    {card.totalSubtasks > 0 && (
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-blue-400" />
                        <span>
                          {card.completedSubtasks}/{card.totalSubtasks}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Open custom list selector */}
                  <button
                    onClick={() =>
                      setActiveCardId(isSelectorOpen ? null : card.id)
                    }
                    className="text-[11px] text-blue-400 hover:text-blue-300 font-medium"
                  >
                    {isSelectorOpen ? "Cancel" : "Change List"}
                  </button>
                </div>

                {/* Inline Status Selection Drawer */}
                {isSelectorOpen && (
                  <div className="mt-3 pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-1.5">
                    {card.availableLists.map((list) => {
                      const isSelected = list.id === card.listId;
                      return (
                        <button
                          key={list.id}
                          onClick={() => handleSelectStatus(card, list.id)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium text-left border transition-all ${
                            isSelected
                              ? "bg-blue-600/20 border-blue-500/50 text-blue-300 font-semibold"
                              : "bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800/50"
                          }`}
                        >
                          {list.title}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
