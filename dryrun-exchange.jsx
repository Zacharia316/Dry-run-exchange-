import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Newspaper,
  Bot,
  RotateCcw,
  Radio,
  Wallet,
  History,
  LineChart as LineChartIcon,
  LayoutList,
} from "lucide-react";

// ---------- constants (hardcoded, no env vars) ----------
const STARTING_CASH = 100000;
const TICK_MS = 2500;
const HISTORY_LEN = 90;
const STORAGE_KEY = "dryrun-exchange-v2";

const SEED_STOCKS = [
  { ticker: "AAPL", name: "Apple Inc.", price: 310.66, vol: 0.0032 },
  { ticker: "TSLA", name: "Tesla, Inc.", price: 409.4, vol: 0.009 },
  { ticker: "GOOGL", name: "Alphabet Inc.", price: 367.03, vol: 0.0045 },
  { ticker: "AMZN", name: "Amazon.com, Inc.", price: 245.98, vol: 0.005 },
  { ticker: "MSFT", name: "Microsoft Corp.", price: 388.84, vol: 0.003 },
  { ticker: "NVDA", name: "NVIDIA Corp.", price: 196.93, vol: 0.0075 },
  { ticker: "META", name: "Meta Platforms, Inc.", price: 615.58, vol: 0.006 },
  { ticker: "NFLX", name: "Netflix, Inc.", price: 1240.5, vol: 0.0055 },
];

function gaussian() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function fmtMoney(n) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}
function fmtNum(n, d = 2) {
  return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}
function backfillHistory(startPrice, vol) {
  const arr = [];
  let p = startPrice * (1 - vol * 6);
  for (let i = 0; i < HISTORY_LEN; i++) {
    p = p * (1 + vol * 0.4 * gaussian() + 0.0004);
    arr.push({ t: i, price: Math.max(p, 0.5) });
  }
  arr[arr.length - 1].price = startPrice;
  return arr;
}
async function callClaude(systemPrompt, userPrompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });
  const data = await res.json();
  return (data.content || []).map((b) => (b.type === "text" ? b.text : "")).join("\n");
}

const TABS = [
  { id: "market", label: "Market", icon: LayoutList },
  { id: "trade", label: "Trade", icon: LineChartIcon },
  { id: "coach", label: "Coach", icon: Bot },
  { id: "portfolio", label: "Folio", icon: Wallet },
];

export default function App() {
  const [tab, setTab] = useState("market");
  const [stocks, setStocks] = useState(() =>
    SEED_STOCKS.map((s) => ({ ...s, history: backfillHistory(s.price, s.vol) }))
  );
  const [selected, setSelected] = useState("AAPL");
  const [cash, setCash] = useState(STARTING_CASH);
  const [holdings, setHoldings] = useState({});
  const [trades, setTrades] = useState([]);
  const [news, setNews] = useState([
    { id: 0, text: "Market open. DryRun Exchange live — nothing here is real money." },
  ]);
  const [qty, setQty] = useState(1);
  const [side, setSide] = useState("buy");
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachMsg, setCoachMsg] = useState(
    "Ask me for feedback anytime — I'll look at your trades and balance and tell you how you're actually doing."
  );
  const [eventLoading, setEventLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const tickRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(STORAGE_KEY);
        if (res && res.value) {
          const saved = JSON.parse(res.value);
          if (typeof saved.cash === "number") setCash(saved.cash);
          if (saved.holdings) setHoldings(saved.holdings);
          if (saved.trades) setTrades(saved.trades);
          if (saved.lastPrices) {
            setStocks((prev) =>
              prev.map((s) =>
                saved.lastPrices[s.ticker]
                  ? { ...s, price: saved.lastPrices[s.ticker], history: backfillHistory(saved.lastPrices[s.ticker], s.vol) }
                  : s
              )
            );
          }
        }
      } catch (e) {}
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const lastPrices = {};
    stocks.forEach((s) => (lastPrices[s.ticker] = s.price));
    window.storage
      .set(STORAGE_KEY, JSON.stringify({ cash, holdings, trades: trades.slice(0, 50), lastPrices }))
      .catch(() => {});
  }, [cash, holdings, trades, loaded]);

  useEffect(() => {
    tickRef.current = setInterval(() => {
      setStocks((prev) =>
        prev.map((s) => {
          const change = 0.00006 + gaussian() * s.vol;
          const newPrice = Math.max(s.price * (1 + change), 0.5);
          const hist = [...s.history.slice(-(HISTORY_LEN - 1)), { t: s.history[s.history.length - 1].t + 1, price: newPrice }];
          return { ...s, price: newPrice, history: hist };
        })
      );
    }, TICK_MS);
    return () => clearInterval(tickRef.current);
  }, []);

  const current = stocks.find((s) => s.ticker === selected);
  const portfolioValue = cash + stocks.reduce((sum, s) => sum + (holdings[s.ticker] ? holdings[s.ticker].shares * s.price : 0), 0);
  const totalPL = portfolioValue - STARTING_CASH;

  const addNews = (text) => setNews((prev) => [{ id: Date.now(), text }, ...prev].slice(0, 20));

  const handleTrade = () => {
    if (!current || qty <= 0) return;
    const cost = qty * current.price;
    if (side === "buy") {
      if (cost > cash) return;
      setCash((c) => c - cost);
      setHoldings((h) => {
        const existing = h[current.ticker];
        const newShares = (existing?.shares || 0) + qty;
        const newAvg = existing ? (existing.avgCost * existing.shares + cost) / newShares : current.price;
        return { ...h, [current.ticker]: { shares: newShares, avgCost: newAvg } };
      });
    } else {
      const existing = holdings[current.ticker];
      if (!existing || existing.shares < qty) return;
      setCash((c) => c + cost);
      setHoldings((h) => {
        const remaining = existing.shares - qty;
        const copy = { ...h };
        if (remaining <= 0) delete copy[current.ticker];
        else copy[current.ticker] = { ...existing, shares: remaining };
        return copy;
      });
    }
    setTrades((t) =>
      [{ id: Date.now(), ticker: current.ticker, side, qty, price: current.price, time: new Date().toLocaleTimeString() }, ...t].slice(0, 50)
    );
  };

  const triggerMarketEvent = useCallback(async () => {
    setEventLoading(true);
    try {
      const tickerList = stocks.map((s) => s.ticker).join(", ");
      const text = await callClaude(
        'You invent short, punchy, fictional stock-market news headlines for a training simulator. Respond ONLY with strict JSON, no markdown, no preamble, in this exact shape: {"headline": string, "affected": [{"ticker": string, "impactPercent": number}]}. impactPercent is the percent price shock to apply (can be negative), between -8 and 8, for 1 to 3 tickers.',
        `Tickers in play: ${tickerList}. Invent one fictional market-moving headline and its price impact.`
      );
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      addNews(parsed.headline);
      setStocks((prev) =>
        prev.map((s) => {
          const hit = parsed.affected?.find((a) => a.ticker === s.ticker);
          if (!hit) return s;
          const newPrice = Math.max(s.price * (1 + hit.impactPercent / 100), 0.5);
          const hist = [...s.history.slice(-(HISTORY_LEN - 1)), { t: s.history[s.history.length - 1].t + 1, price: newPrice }];
          return { ...s, price: newPrice, history: hist };
        })
      );
    } catch (e) {
      addNews("Newsroom's quiet — no headline this round.");
    }
    setEventLoading(false);
  }, [stocks]);

  const askCoach = async () => {
    setCoachLoading(true);
    try {
      const holdingsSummary =
        Object.entries(holdings).map(([t, h]) => `${t}: ${h.shares} sh @ avg ${fmtNum(h.avgCost)}`).join("; ") || "none";
      const recentTrades =
        trades.slice(0, 8).map((t) => `${t.side.toUpperCase()} ${t.qty} ${t.ticker} @ ${fmtNum(t.price)}`).join("; ") || "none yet";
      const text = await callClaude(
        "You are a blunt but encouraging trading coach for a paper-trading training app. Give feedback in 3-5 short sentences, plain language, no headers, no bullet lists. Point out one concrete pattern (good or risky) and one suggestion.",
        `Starting cash: ${STARTING_CASH}. Current cash: ${Math.round(cash)}. Portfolio value: ${Math.round(portfolioValue)}. Total P/L: ${Math.round(totalPL)}. Current holdings: ${holdingsSummary}. Recent trades: ${recentTrades}.`
      );
      setCoachMsg(text || "Couldn't get a read this time — try again.");
    } catch (e) {
      setCoachMsg("Coach is offline for a moment — try again shortly.");
    }
    setCoachLoading(false);
  };

  const resetAll = () => {
    setCash(STARTING_CASH);
    setHoldings({});
    setTrades([]);
    setNews([{ id: Date.now(), text: "Fresh start. Balance reset to " + fmtMoney(STARTING_CASH) + "." }]);
    setStocks(SEED_STOCKS.map((s) => ({ ...s, history: backfillHistory(s.price, s.vol) })));
    window.storage.delete(STORAGE_KEY).catch(() => {});
  };

  return (
    <div style={styles.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=IBM+Plex+Sans:wght@400;500&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        html, body { margin: 0; overflow: hidden; }
        .tape-track { display: inline-block; animation: scroll-left 32s linear infinite; }
        @keyframes scroll-left { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .row-btn:active { background: #181D24 !important; }
        .blink { animation: blink 1.6s ease-in-out infinite; }
        @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0.25; } }
        .scroller::-webkit-scrollbar { width: 0px; }
        .navbtn:active { opacity: 0.6; }
      `}</style>

      <div style={styles.tape}>
        <Radio size={12} color="#FF4D6D" className="blink" style={{ marginRight: 8, flexShrink: 0 }} />
        <div style={{ overflow: "hidden", whiteSpace: "nowrap", flex: 1 }}>
          <div className="tape-track">
            {[...news, ...news].map((n, i) => (
              <span key={i} style={{ marginRight: 40, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, color: "#9AA5B1" }}>
                {n.text}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div style={styles.header}>
        <div>
          <div style={styles.title}>DRYRUN EXCHANGE</div>
          <div style={styles.subtitle}>Zero real money.</div>
        </div>
        <div style={styles.headerRight}>
          <div style={{ textAlign: "right" }}>
            <div style={styles.statLabel}>PORTFOLIO</div>
            <div style={styles.statValue}>{fmtMoney(portfolioValue)}</div>
            <div style={{ fontSize: 11, color: totalPL >= 0 ? "#17E88F" : "#FF4D6D", fontFamily: "IBM Plex Mono" }}>
              {totalPL >= 0 ? "+" : ""}{fmtMoney(totalPL)}
            </div>
          </div>
          <button onClick={resetAll} style={styles.resetBtn}><RotateCcw size={14} /></button>
        </div>
      </div>

      <div className="scroller" style={styles.content}>
        {tab === "market" && (
          <div style={styles.panel}>
            <div style={styles.panelTitle}>WATCHLIST</div>
            {stocks.map((s) => {
              const prevPrice = s.history[s.history.length - 2]?.price ?? s.price;
              const chg = ((s.price - prevPrice) / prevPrice) * 100;
              const up = chg >= 0;
              return (
                <div
                  key={s.ticker}
                  className="row-btn"
                  onClick={() => { setSelected(s.ticker); setTab("trade"); }}
                  style={{ ...styles.watchRow, background: selected === s.ticker ? "#181D24" : "transparent" }}
                >
                  <div>
                    <div style={styles.tickerText}>{s.ticker}</div>
                    <div style={styles.tickerName}>{s.name}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={styles.priceText}>${fmtNum(s.price)}</div>
                    <div style={{ fontSize: 12, color: up ? "#17E88F" : "#FF4D6D", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 3 }}>
                      {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {fmtNum(Math.abs(chg))}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "trade" && current && (
          <div style={styles.panel}>
            <div style={styles.panelTitle}>
              {current.ticker} <span style={{ color: "#7C8792", fontWeight: 400 }}>· {current.name}</span>
            </div>
            <div style={styles.bigPrice}>${fmtNum(current.price)}</div>
            <div style={{ height: 190 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={current.history}>
                  <CartesianGrid stroke="#1B2027" vertical={false} />
                  <XAxis dataKey="t" hide />
                  <YAxis domain={["auto", "auto"]} tick={{ fill: "#7C8792", fontSize: 10, fontFamily: "IBM Plex Mono" }} width={48} tickFormatter={(v) => `$${Math.round(v)}`} />
                  <Tooltip contentStyle={{ background: "#12151B", border: "1px solid #232830", fontFamily: "IBM Plex Mono", fontSize: 12 }} labelStyle={{ display: "none" }} formatter={(v) => [`$${fmtNum(v)}`, "Price"]} />
                  <Line type="monotone" dataKey="price" stroke="#4FA8FF" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div style={styles.stockPicker}>
              {stocks.map((s) => (
                <button key={s.ticker} onClick={() => setSelected(s.ticker)} style={{ ...styles.chip, background: selected === s.ticker ? "#4FA8FF" : "#181D24", color: selected === s.ticker ? "#0A0C10" : "#9AA5B1" }}>
                  {s.ticker}
                </button>
              ))}
            </div>

            <div style={styles.tradeBox}>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <button onClick={() => setSide("buy")} style={{ ...styles.sideBtn, background: side === "buy" ? "#17E88F" : "transparent", color: side === "buy" ? "#0A0C10" : "#17E88F", borderColor: "#17E88F" }}>BUY</button>
                <button onClick={() => setSide("sell")} style={{ ...styles.sideBtn, background: side === "sell" ? "#FF4D6D" : "transparent", color: side === "sell" ? "#0A0C10" : "#FF4D6D", borderColor: "#FF4D6D" }}>SELL</button>
                <input type="number" min="1" value={qty} onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))} style={styles.qtyInput} />
              </div>
              <button onClick={handleTrade} style={styles.executeBtn}>Execute · {fmtMoney(current.price * qty)}</button>
              <div style={{ fontSize: 12, color: "#7C8792", fontFamily: "IBM Plex Mono", marginTop: 10 }}>
                {holdings[selected] ? `You hold ${holdings[selected].shares} sh, avg cost $${fmtNum(holdings[selected].avgCost)}` : "No position in " + selected}
              </div>
            </div>

            <button onClick={triggerMarketEvent} disabled={eventLoading} style={styles.eventBtn}>
              <Newspaper size={14} /> {eventLoading ? "Drafting headline..." : "Trigger AI market event"}
            </button>
          </div>
        )}

        {tab === "coach" && (
          <div style={styles.panel}>
            <div style={styles.panelTitle}><Bot size={14} style={{ marginRight: 6 }} />AI COACH</div>
            <div style={styles.coachMsg}>{coachMsg}</div>
            <button onClick={askCoach} disabled={coachLoading} style={styles.coachBtn}>{coachLoading ? "Thinking..." : "Get feedback"}</button>
          </div>
        )}

        {tab === "portfolio" && (
          <>
            <div style={{ ...styles.panel, marginBottom: 14 }}>
              <div style={styles.panelTitle}><Wallet size={14} style={{ marginRight: 6 }} />HOLDINGS</div>
              {Object.keys(holdings).length === 0 && <div style={{ color: "#7C8792", fontSize: 13 }}>Nothing in the portfolio yet.</div>}
              {Object.entries(holdings).map(([t, h]) => {
                const s = stocks.find((x) => x.ticker === t);
                const value = s ? h.shares * s.price : 0;
                const pl = s ? (s.price - h.avgCost) * h.shares : 0;
                return (
                  <div key={t} style={styles.holdRow}>
                    <span style={{ fontFamily: "IBM Plex Mono", fontWeight: 600 }}>{t}</span>
                    <span style={{ color: "#7C8792" }}>{h.shares} sh</span>
                    <span>{fmtMoney(value)}</span>
                    <span style={{ color: pl >= 0 ? "#17E88F" : "#FF4D6D" }}>{pl >= 0 ? "+" : ""}{fmtMoney(pl)}</span>
                  </div>
                );
              })}
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #1E232A", display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "#7C8792" }}>Cash</span>
                <span style={{ fontFamily: "IBM Plex Mono" }}>{fmtMoney(cash)}</span>
              </div>
            </div>
            <div style={styles.panel}>
              <div style={styles.panelTitle}><History size={14} style={{ marginRight: 6 }} />TRADE LOG</div>
              {trades.length === 0 && <div style={{ color: "#7C8792", fontSize: 13 }}>No trades yet.</div>}
              {trades.map((t) => (
                <div key={t.id} style={styles.tradeRow}>
                  <span style={{ color: t.side === "buy" ? "#17E88F" : "#FF4D6D", fontWeight: 600 }}>{t.side.toUpperCase()}</span>
                  <span>{t.qty} {t.ticker}</span>
                  <span style={{ color: "#7C8792" }}>${fmtNum(t.price)}</span>
                  <span style={{ color: "#565F69", fontSize: 10.5 }}>{t.time}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div style={styles.nav}>
        {TABS.map((tItem) => {
          const Icon = tItem.icon;
          const active = tab === tItem.id;
          return (
            <button key={tItem.id} className="navbtn" onClick={() => setTab(tItem.id)} style={styles.navBtn}>
              <Icon size={20} color={active ? "#4FA8FF" : "#565F69"} />
              <span style={{ fontSize: 10.5, color: active ? "#4FA8FF" : "#565F69", marginTop: 3, fontFamily: "'Space Grotesk', sans-serif" }}>{tItem.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  app: {
    height: "100vh",
    width: "100vw",
    background: "#0A0C10",
    color: "#E7ECEF",
    fontFamily: "'IBM Plex Sans', sans-serif",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  tape: { display: "flex", alignItems: "center", background: "#0E1116", borderBottom: "1px solid #1B2027", padding: "6px 12px", flexShrink: 0 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "12px 16px", flexShrink: 0, borderBottom: "1px solid #14181E" },
  title: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 17, letterSpacing: 0.4 },
  subtitle: { color: "#565F69", fontSize: 11.5, marginTop: 2 },
  headerRight: { display: "flex", gap: 10, alignItems: "center" },
  statLabel: { fontSize: 9.5, color: "#565F69", letterSpacing: 1 },
  statValue: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, fontWeight: 600 },
  resetBtn: { background: "#12151B", border: "1px solid #232830", color: "#7C8792", borderRadius: 6, padding: "7px 9px" },
  content: { flex: 1, overflowY: "auto", padding: "14px 14px 20px" },
  panel: { background: "#12151B", border: "1px solid #1E232A", borderRadius: 10, padding: 14 },
  panelTitle: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 600, color: "#9AA5B1", letterSpacing: 0.5, marginBottom: 10, display: "flex", alignItems: "center" },
  watchRow: { display: "flex", justifyContent: "space-between", padding: "12px 8px", borderRadius: 8 },
  tickerText: { fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, fontSize: 14.5 },
  tickerName: { fontSize: 11, color: "#565F69", marginTop: 1 },
  priceText: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 14.5 },
  bigPrice: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 28, fontWeight: 600, margin: "4px 0 10px" },
  stockPicker: { display: "flex", gap: 6, overflowX: "auto", padding: "12px 0 4px" },
  chip: { flexShrink: 0, border: "none", borderRadius: 999, padding: "6px 12px", fontSize: 12, fontFamily: "IBM Plex Mono", fontWeight: 600 },
  tradeBox: { marginTop: 10, paddingTop: 14, borderTop: "1px solid #1E232A" },
  sideBtn: { flex: 1, border: "1px solid", borderRadius: 8, padding: "12px 0", fontWeight: 700, fontSize: 13 },
  qtyInput: { width: 70, background: "#0E1116", border: "1px solid #232830", borderRadius: 8, color: "#E7ECEF", padding: "0 8px", fontFamily: "IBM Plex Mono", fontSize: 14, textAlign: "center" },
  executeBtn: { width: "100%", background: "#4FA8FF", color: "#0A0C10", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 14, padding: "13px 0" },
  eventBtn: { marginTop: 14, width: "100%", background: "transparent", border: "1px dashed #3A4048", color: "#F5A623", borderRadius: 8, padding: "11px 0", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 },
  coachMsg: { fontSize: 14, lineHeight: 1.55, color: "#C7CED5", minHeight: 80 },
  coachBtn: { marginTop: 14, width: "100%", background: "#181D24", border: "1px solid #232830", color: "#E7ECEF", borderRadius: 8, padding: "12px 0", fontSize: 13.5 },
  tradeRow: { display: "grid", gridTemplateColumns: "48px 1fr 64px 64px", gap: 6, fontSize: 12.5, fontFamily: "IBM Plex Mono", padding: "8px 0", borderBottom: "1px solid #171B21" },
  holdRow: { display: "grid", gridTemplateColumns: "52px 60px 1fr 90px", gap: 6, fontSize: 12.5, fontFamily: "IBM Plex Mono", padding: "8px 0" },
  nav: { display: "flex", background: "#0E1116", borderTop: "1px solid #1B2027", flexShrink: 0, paddingBottom: "env(safe-area-inset-bottom, 0px)" },
  navBtn: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "transparent", border: "none", padding: "10px 0" },
};
