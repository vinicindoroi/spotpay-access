import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin Console | Spotify Rewards" },
      { name: "description", content: "Internal console to manage users, support tickets, refunds and withdrawals." },
      { name: "robots", content: "noindex,nofollow" },
      { property: "og:title", content: "Admin Console | Spotify Rewards" },
      { property: "og:description", content: "Internal console to manage users, support tickets, refunds and withdrawals." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  document: string | null;
  address: string | null;
  birth_date: string | null;
  created_at: string;
};

type Ticket = {
  id: string; user_id: string; code: string; name: string | null; email: string | null;
  subject: string | null; message: string | null; kind: string; status: string;
  details: Record<string, unknown>; created_at: string;
};

type Refund = {
  id: string; user_id: string; code: string; amount: number | null; reason: string | null;
  status: string; stage: string; created_at: string;
};

type Withdrawal = {
  id: string; user_id: string; code: string; amount: number | null; account_email: string | null;
  account_holder: string | null; full_name: string | null; document: string | null;
  address: string | null; status: string; stage: string; created_at: string;
};

type ChatMessage = {
  id: string; user_id: string; sender: "user" | "admin"; body: string; created_at: string;
};

type UserState = { user_id: string; data: { balance?: number; totalDone?: number } };

const money = (v: number | null | undefined) => `$${Number(v ?? 0).toFixed(2)}`;
const when = (v: string) => new Date(v).toLocaleString();

function StatusPill({ value }: { value: string }) {
  const tone =
    value === "done" || value === "approved" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
    : value === "rejected" ? "bg-red-500/15 text-red-400 border-red-500/30"
    : value === "in_review" ? "bg-sky-500/15 text-sky-400 border-sky-500/30"
    : "bg-amber-500/15 text-amber-400 border-amber-500/30";
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${tone}`}>{value.replace("_", " ")}</span>;
}

function AdminPage() {
  const [session, setSession] = useState<{ userId: string; email: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [authMsg, setAuthMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const [tab, setTab] = useState<"overview" | "users" | "tickets" | "refunds" | "withdrawals">("overview");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [states, setStates] = useState<UserState[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [search, setSearch] = useState("");
  const [chatUser, setChatUser] = useState<{ id: string; label: string } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      if (u) setSession({ userId: u.id, email: u.email ?? "" });
      else setIsAdmin(false);
    });
  }, []);

  useEffect(() => {
    if (!session) return;
    supabase.rpc("has_role", { _user_id: session.userId, _role: "admin" }).then(({ data }) => setIsAdmin(!!data));
  }, [session]);

  const load = useCallback(async () => {
    const [p, s, t, r, w] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_state").select("user_id, data"),
      supabase.from("support_tickets").select("*").order("created_at", { ascending: false }),
      supabase.from("refund_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("withdrawal_requests").select("*").order("created_at", { ascending: false }),
    ]);
    setProfiles((p.data as Profile[]) ?? []);
    setStates((s.data as UserState[]) ?? []);
    setTickets((t.data as Ticket[]) ?? []);
    setRefunds((r.data as Refund[]) ?? []);
    setWithdrawals((w.data as Withdrawal[]) ?? []);
  }, []);

  useEffect(() => {
    if (isAdmin) {
      void load();
      const i = setInterval(() => void load(), 15000);
      return () => clearInterval(i);
    }
    return;
  }, [isAdmin, load]);

  const nameOf = useCallback(
    (id: string) => {
      const p = profiles.find((x) => x.id === id);
      return p?.full_name || p?.email || id.slice(0, 8);
    },
    [profiles],
  );

  async function signIn() {
    setBusy(true);
    setAuthMsg("");
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pass });
    setBusy(false);
    if (error) { setAuthMsg(error.message); return; }
    setSession({ userId: data.user.id, email: data.user.email ?? "" });
  }

  async function updateStatus(table: "support_tickets" | "refund_requests" | "withdrawal_requests", id: string, status: string) {
    await supabase.from(table).update({ status }).eq("id", id);
    void load();
  }

  if (isAdmin === null && !session) {
    return <div className="min-h-screen bg-zinc-950" />;
  }

  if (!session || isAdmin === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-zinc-100">
        <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-7">
          <h1 className="text-xl font-bold">Admin console</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {session && isAdmin === false ? "This account has no admin access." : "Sign in with an administrator account."}
          </p>
          {!session && (
            <div className="mt-5 space-y-3">
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm outline-none focus:border-emerald-500" />
              <input value={pass} type="password" onChange={(e) => setPass(e.target.value)} onKeyDown={(e) => e.key === "Enter" && signIn()} placeholder="Password" className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm outline-none focus:border-emerald-500" />
              <button disabled={busy} onClick={signIn} className="w-full rounded-full bg-emerald-500 py-2.5 text-sm font-bold text-black hover:bg-emerald-400 disabled:opacity-60">
                {busy ? "Signing in..." : "Sign in"}
              </button>
              {authMsg && <p className="text-sm text-red-400">{authMsg}</p>}
            </div>
          )}
          {session && (
            <button onClick={async () => { await supabase.auth.signOut(); location.reload(); }} className="mt-5 w-full rounded-full border border-zinc-700 py-2.5 text-sm font-semibold">
              Sign out
            </button>
          )}
        </div>
      </div>
    );
  }

  const pendingTickets = tickets.filter((t) => t.status === "open").length;
  const pendingRefunds = refunds.filter((r) => r.status === "pending").length;
  const pendingWithdrawals = withdrawals.filter((w) => w.status === "pending").length;
  const totalBalance = states.reduce((a, s) => a + Number(s.data?.balance ?? 0), 0);

  const q = search.trim().toLowerCase();
  const filteredProfiles = profiles.filter(
    (p) => !q || (p.full_name ?? "").toLowerCase().includes(q) || (p.email ?? "").toLowerCase().includes(q) || (p.document ?? "").includes(q),
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-5 py-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-sm font-black text-black">A</span>
          <h1 className="text-sm font-bold tracking-wide">ADMIN CONSOLE</h1>
          <nav className="ml-4 flex flex-wrap gap-1">
            {(["overview", "users", "tickets", "refunds", "withdrawals"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`rounded-full px-3.5 py-1.5 text-xs font-semibold capitalize ${tab === t ? "bg-zinc-100 text-zinc-900" : "text-zinc-400 hover:bg-zinc-900"}`}>
                {t}
              </button>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-xs text-zinc-400">
            <span className="hidden sm:inline">{session.email}</span>
            <button onClick={async () => { await supabase.auth.signOut(); location.reload(); }} className="rounded-full border border-zinc-700 px-3 py-1.5 font-semibold text-zinc-300">Sign out</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-6">
        {tab === "overview" && (
          <section className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {[
                { k: "Users", v: String(profiles.length) },
                { k: "Open tickets", v: String(pendingTickets) },
                { k: "Pending refunds", v: String(pendingRefunds) },
                { k: "Pending withdrawals", v: String(pendingWithdrawals) },
                { k: "Balance held", v: money(totalBalance) },
              ].map((c) => (
                <div key={c.k} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                  <p className="text-xs uppercase tracking-wide text-zinc-500">{c.k}</p>
                  <p className="mt-2 text-2xl font-bold">{c.v}</p>
                </div>
              ))}
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <Panel title="Latest tickets">
                {tickets.slice(0, 6).map((t) => (
                  <Row key={t.id} left={`${t.code} · ${t.subject ?? "-"}`} sub={`${nameOf(t.user_id)} · ${when(t.created_at)}`} right={<StatusPill value={t.status} />} onChat={() => setChatUser({ id: t.user_id, label: nameOf(t.user_id) })} />
                ))}
                {!tickets.length && <Empty />}
              </Panel>
              <Panel title="Latest withdrawals">
                {withdrawals.slice(0, 6).map((w) => (
                  <Row key={w.id} left={`${w.code} · ${money(w.amount)}`} sub={`${nameOf(w.user_id)} · ${when(w.created_at)}`} right={<StatusPill value={w.status} />} onChat={() => setChatUser({ id: w.user_id, label: nameOf(w.user_id) })} />
                ))}
                {!withdrawals.length && <Empty />}
              </Panel>
            </div>
          </section>
        )}

        {tab === "users" && (
          <section>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email or document" className="mb-4 w-full max-w-md rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm outline-none focus:border-emerald-500" />
            <Table head={["User", "Contact", "Document", "Balance", "Songs", "Joined", ""]}>
              {filteredProfiles.map((p) => {
                const st = states.find((s) => s.user_id === p.id);
                return (
                  <tr key={p.id} className="border-t border-zinc-800/80">
                    <td className="px-4 py-3 font-medium">{p.full_name || "—"}</td>
                    <td className="px-4 py-3 text-zinc-400">{p.email}<br /><span className="text-xs">{p.phone}</span></td>
                    <td className="px-4 py-3 text-zinc-400">{p.document || "—"}</td>
                    <td className="px-4 py-3">{money(st?.data?.balance)}</td>
                    <td className="px-4 py-3 text-zinc-400">{st?.data?.totalDone ?? 0}</td>
                    <td className="px-4 py-3 text-zinc-400">{when(p.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setChatUser({ id: p.id, label: p.full_name || p.email || "user" })} className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-bold text-black">Chat</button>
                    </td>
                  </tr>
                );
              })}
            </Table>
          </section>
        )}

        {tab === "tickets" && (
          <Table head={["Code", "User", "Subject", "Type", "Message", "Status", "Actions"]}>
            {tickets.map((t) => (
              <tr key={t.id} className="border-t border-zinc-800/80 align-top">
                <td className="px-4 py-3 font-mono text-xs">{t.code}</td>
                <td className="px-4 py-3">{nameOf(t.user_id)}<br /><span className="text-xs text-zinc-500">{when(t.created_at)}</span></td>
                <td className="px-4 py-3">{t.subject || "—"}</td>
                <td className="px-4 py-3 text-zinc-400 capitalize">{t.kind}</td>
                <td className="max-w-md px-4 py-3 text-zinc-400">{t.message}</td>
                <td className="px-4 py-3"><StatusPill value={t.status} /></td>
                <td className="px-4 py-3">
                  <Actions
                    options={[["in_review", "Review"], ["done", "Resolve"], ["rejected", "Reject"]]}
                    onPick={(s) => updateStatus("support_tickets", t.id, s)}
                    onChat={() => setChatUser({ id: t.user_id, label: nameOf(t.user_id) })}
                  />
                </td>
              </tr>
            ))}
          </Table>
        )}

        {tab === "refunds" && (
          <Table head={["Code", "User", "Amount", "Reason", "Stage", "Status", "Actions"]}>
            {refunds.map((r) => (
              <tr key={r.id} className="border-t border-zinc-800/80 align-top">
                <td className="px-4 py-3 font-mono text-xs">{r.code}</td>
                <td className="px-4 py-3">{nameOf(r.user_id)}<br /><span className="text-xs text-zinc-500">{when(r.created_at)}</span></td>
                <td className="px-4 py-3">{money(r.amount)}</td>
                <td className="max-w-sm px-4 py-3 text-zinc-400">{r.reason || "—"}</td>
                <td className="px-4 py-3 text-zinc-400">{r.stage}</td>
                <td className="px-4 py-3"><StatusPill value={r.status} /></td>
                <td className="px-4 py-3">
                  <Actions
                    options={[["in_review", "Review"], ["approved", "Approve"], ["rejected", "Reject"]]}
                    onPick={(s) => updateStatus("refund_requests", r.id, s)}
                    onChat={() => setChatUser({ id: r.user_id, label: nameOf(r.user_id) })}
                  />
                </td>
              </tr>
            ))}
          </Table>
        )}

        {tab === "withdrawals" && (
          <Table head={["Code", "User", "Amount", "Account", "KYC", "Status", "Actions"]}>
            {withdrawals.map((w) => (
              <tr key={w.id} className="border-t border-zinc-800/80 align-top">
                <td className="px-4 py-3 font-mono text-xs">{w.code}</td>
                <td className="px-4 py-3">{nameOf(w.user_id)}<br /><span className="text-xs text-zinc-500">{when(w.created_at)}</span></td>
                <td className="px-4 py-3">{money(w.amount)}</td>
                <td className="px-4 py-3 text-zinc-400">{w.account_email}<br /><span className="text-xs">{w.account_holder}</span></td>
                <td className="px-4 py-3 text-xs text-zinc-400">{w.full_name}<br />{w.document}<br />{w.address}</td>
                <td className="px-4 py-3"><StatusPill value={w.status} /></td>
                <td className="px-4 py-3">
                  <Actions
                    options={[["in_review", "Review"], ["approved", "Approve"], ["rejected", "Reject"]]}
                    onPick={(s) => updateStatus("withdrawal_requests", w.id, s)}
                    onChat={() => setChatUser({ id: w.user_id, label: nameOf(w.user_id) })}
                  />
                </td>
              </tr>
            ))}
          </Table>
        )}
      </main>

      <ChatDock target={chatUser} onClose={() => setChatUser(null)} />
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900">
      <p className="border-b border-zinc-800 px-4 py-3 text-xs font-bold uppercase tracking-wide text-zinc-400">{title}</p>
      <div className="divide-y divide-zinc-800/70">{children}</div>
    </div>
  );
}

function Row({ left, sub, right, onChat }: { left: string; sub: string; right: React.ReactNode; onChat: () => void }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{left}</p>
        <p className="truncate text-xs text-zinc-500">{sub}</p>
      </div>
      {right}
      <button onClick={onChat} className="rounded-full border border-zinc-700 px-3 py-1 text-xs font-semibold text-zinc-300">Chat</button>
    </div>
  );
}

function Empty() {
  return <p className="px-4 py-6 text-sm text-zinc-500">Nothing here yet.</p>;
}

function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900">
      <table className="w-full text-left text-sm">
        <thead className="bg-zinc-900/80 text-xs uppercase tracking-wide text-zinc-500">
          <tr>{head.map((h, i) => <th key={i} className="px-4 py-3 font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function Actions({ options, onPick, onChat }: { options: [string, string][]; onPick: (s: string) => void; onChat: () => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(([value, label]) => (
        <button key={value} onClick={() => onPick(value)} className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs font-semibold text-zinc-300 hover:bg-zinc-800">{label}</button>
      ))}
      <button onClick={onChat} className="rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-bold text-black">Chat</button>
    </div>
  );
}

function ChatDock({ target, onClose }: { target: { id: string; label: string } | null; onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  const userId = target?.id;

  const fetchMessages = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase.from("chat_messages").select("*").eq("user_id", userId).order("created_at");
    setMessages((data as ChatMessage[]) ?? []);
  }, [userId]);

  useEffect(() => {
    if (!userId) { setMessages([]); return; }
    void fetchMessages();
    const i = setInterval(() => void fetchMessages(), 4000);
    return () => clearInterval(i);
  }, [userId, fetchMessages]);

  useEffect(() => {
    boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight });
  }, [messages]);

  const send = async () => {
    const body = text.trim();
    if (!body || !userId) return;
    setText("");
    await supabase.from("chat_messages").insert({ user_id: userId, sender: "admin", body });
    void fetchMessages();
  };

  const label = useMemo(() => target?.label ?? "", [target]);
  if (!target) return null;

  return (
    <div className="fixed bottom-5 right-5 z-40 flex h-[460px] w-[350px] flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
      <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-3">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">{label}</p>
        <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200">✕</button>
      </div>
      <div ref={boxRef} className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {messages.map((m) => (
          <div key={m.id} className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.sender === "admin" ? "ml-auto bg-emerald-500 text-black" : "bg-zinc-800 text-zinc-100"}`}>
            {m.body}
            <span className={`mt-1 block text-[10px] ${m.sender === "admin" ? "text-black/60" : "text-zinc-500"}`}>{new Date(m.created_at).toLocaleTimeString()}</span>
          </div>
        ))}
        {!messages.length && <p className="pt-10 text-center text-xs text-zinc-500">No messages yet. Say hello.</p>}
      </div>
      <div className="flex gap-2 border-t border-zinc-800 p-3">
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Write a message" className="flex-1 rounded-full border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm outline-none focus:border-emerald-500" />
        <button onClick={send} className="rounded-full bg-emerald-500 px-4 text-sm font-bold text-black">Send</button>
      </div>
    </div>
  );
}
