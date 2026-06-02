import { useState, useEffect, useRef, useMemo } from "react";
import { toast } from "sonner";
import {
  Home, MessageCircle, Plus, User, Search, SlidersHorizontal,
  Star, ChevronLeft, X, Camera, Send, LogOut, Bell, Check,
} from "lucide-react";

// ──────────────────────────────────────────
// TYPES & SEED DATA
// ──────────────────────────────────────────
type Facultad = "FIIS" | "FIM" | "FIEE" | "FIC" | "FAUA" | "FIQT" | "FIGMM" | "FIA" | "FIP";
type Categoria = "Libros" | "Apuntes" | "Tecnología" | "Instrumentos" | "Ropa UNI" | "Otros";

const FACULTADES: Facultad[] = ["FIIS","FIM","FIEE","FIC","FAUA","FIQT","FIGMM","FIA","FIP"];
const CATEGORIAS: Categoria[] = ["Libros","Apuntes","Tecnología","Instrumentos","Ropa UNI","Otros"];
const ZONAS = ["Pabellón A","Pabellón C","Pabellón R","Biblioteca Central","CC.BB.","Comedor","Puerta 3","Losa Deportiva"];

interface Producto {
  id: string;
  titulo: string;
  precio: number;
  emoji: string;
  categoria: Categoria;
  estado: "Nuevo" | "Como nuevo" | "Usado";
  zona: string;
  vendedorId: string;
  vendido: boolean;
}
interface Vendedor {
  id: string;
  nombre: string;
  facultad: Facultad;
  codigo: string;
  reviews: { stars: number; text: string; from: string }[];
}
interface Mensaje { from: "me" | "them"; text: string; time: string; }
interface Chat { vendedorId: string; productoId: string; mensajes: Mensaje[]; unread: number; }

const SEED_VENDEDORES: Vendedor[] = [
  { id: "v1", nombre: "Andrés Quispe", facultad: "FIEE", codigo: "20210123", reviews: [{ stars: 5, text: "Súper rápido y honesto.", from: "Lucía R." },{ stars: 4, text: "Buen estado del libro.", from: "Mario P." }] },
  { id: "v2", nombre: "María Flores", facultad: "FIIS", codigo: "20200456", reviews: [{ stars: 5, text: "Excelente vendedora.", from: "Camila T." }] },
  { id: "v3", nombre: "Diego Salas", facultad: "FIM", codigo: "20190789", reviews: [{ stars: 4, text: "Todo conforme.", from: "Jhon P." },{ stars: 5, text: "Recomendado 100%.", from: "Ana V." }] },
  { id: "v4", nombre: "Lucía Rojas", facultad: "FAUA", codigo: "20220012", reviews: [{ stars: 3, text: "Llegó un poco tarde.", from: "Rafa S." }] },
];

const SEED_PRODUCTOS: Producto[] = [
  { id: "p1", titulo: "Cálculo de Stewart 8ª Ed.", precio: 45, emoji: "📘", categoria: "Libros", estado: "Como nuevo", zona: "Biblioteca Central", vendedorId: "v1", vendido: false },
  { id: "p2", titulo: "Apuntes Termodinámica", precio: 15, emoji: "📝", categoria: "Apuntes", estado: "Nuevo", zona: "Pabellón A", vendedorId: "v3", vendido: false },
  { id: "p3", titulo: "Calculadora HP 50G", precio: 220, emoji: "🧮", categoria: "Tecnología", estado: "Usado", zona: "Puerta 3", vendedorId: "v2", vendido: false },
  { id: "p4", titulo: "Polo oficial UNI", precio: 35, emoji: "👕", categoria: "Ropa UNI", estado: "Nuevo", zona: "CC.BB.", vendedorId: "v4", vendido: false },
  { id: "p5", titulo: "Escuadra técnica", precio: 12, emoji: "📐", categoria: "Instrumentos", estado: "Como nuevo", zona: "Pabellón C", vendedorId: "v1", vendido: false },
  { id: "p6", titulo: "Arduino UNO R3", precio: 65, emoji: "🔌", categoria: "Tecnología", estado: "Usado", zona: "Pabellón R", vendedorId: "v2", vendido: false },
];

const avgStars = (v: Vendedor) => v.reviews.length ? v.reviews.reduce((a,r)=>a+r.stars,0)/v.reviews.length : 0;

// ──────────────────────────────────────────
// UI PRIMITIVES
// ──────────────────────────────────────────
const Stars = ({ n, size = 12 }: { n: number; size?: number }) => (
  <span className="inline-flex items-center gap-0.5">
    {[1,2,3,4,5].map(i => (
      <Star key={i} size={size} className={i <= Math.round(n) ? "fill-[var(--gold)] text-[var(--gold)]" : "text-[var(--uni-gray3)]"} />
    ))}
  </span>
);

const Kicker = ({ children }: { children: React.ReactNode }) => (
  <div className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--uni-muted)]">{children}</div>
);

// ──────────────────────────────────────────
// MAIN APP
// ──────────────────────────────────────────
export function UniMarketApp() {
  const [authed, setAuthed] = useState(false);
  const [user, setUser] = useState<{ nombre: string; email: string; facultad: Facultad; codigo: string } | null>(null);

  const [tab, setTab] = useState<"home" | "chats" | "publish" | "profile">("home");
  const [productos, setProductos] = useState<Producto[]>(SEED_PRODUCTOS);
  const [vendedores, setVendedores] = useState<Vendedor[]>(SEED_VENDEDORES);
  const [chats, setChats] = useState<Chat[]>([
    { vendedorId: "v2", productoId: "p3", unread: 0, mensajes: [
      { from: "them", text: "Hola, sí está disponible 👋", time: "10:21" },
    ]},
  ]);

  // navigation overlays
  const [detalle, setDetalle] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState<string | null>(null); // vendedorId
  const [perfilOpen, setPerfilOpen] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // filters
  const [cat, setCat] = useState<Categoria | "Todo">("Todo");
  const [query, setQuery] = useState("");
  const [showVendidos, setShowVendidos] = useState(false);
  const [filtFac, setFiltFac] = useState<Facultad | "">("");
  const [filtZona, setFiltZona] = useState<string>("");
  const [filtMin, setFiltMin] = useState<string>("");
  const [filtMax, setFiltMax] = useState<string>("");

  const totalUnread = chats.reduce((a,c)=>a+c.unread,0);

  // Bot reply scheduler hook
  const scheduleBotReply = (vendedorId: string) => {
    setTimeout(() => {
      const vend = vendedores.find(v=>v.id===vendedorId);
      const respuestas = ["Claro, ¿en qué pabellón te quedaría mejor?","Sí, sigue disponible 👌","Te puedo hacer 5 soles de descuento.","Perfecto, mañana 10am en CC.BB.","Sin problema, llevo cambio."];
      const reply: Mensaje = { from: "them", text: respuestas[Math.floor(Math.random()*respuestas.length)], time: new Date().toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" }) };
      setChats(prev => prev.map(c => c.vendedorId === vendedorId ? { ...c, mensajes: [...c.mensajes, reply], unread: chatOpenRef.current === vendedorId ? 0 : c.unread + 1 } : c));
      if (chatOpenRef.current !== vendedorId) {
        toast(`Nuevo mensaje de ${vend?.nombre ?? "Compañero"}`, { description: reply.text });
      }
    }, 2000);
  };

  // ref to know if chat is open (used inside setTimeout)
  const chatOpenRef = useRef<string | null>(null);
  useEffect(() => { chatOpenRef.current = chatOpen; }, [chatOpen]);

  // filtered list
  const visibles = useMemo(() => {
    return productos.filter(p => {
      if (cat !== "Todo" && p.categoria !== cat) return false;
      if (query && !p.titulo.toLowerCase().includes(query.toLowerCase())) return false;
      if (!showVendidos && p.vendido) return false;
      if (filtFac && vendedores.find(v=>v.id===p.vendedorId)?.facultad !== filtFac) return false;
      if (filtZona && p.zona !== filtZona) return false;
      if (filtMin && p.precio < Number(filtMin)) return false;
      if (filtMax && p.precio > Number(filtMax)) return false;
      return true;
    });
  }, [productos, cat, query, showVendidos, filtFac, filtZona, filtMin, filtMax, vendedores]);

  const limpiarFiltros = () => {
    setFiltFac(""); setFiltZona(""); setFiltMin(""); setFiltMax(""); setCat("Todo"); setQuery("");
    toast.success("Filtros limpiados");
  };

  // ─── AUTH ───
  if (!authed) {
    return <AuthScreen onAuth={(u) => { setUser(u); setAuthed(true); toast.success(`Bienvenido, ${u.nombre.split(" ")[0]}`); }} />;
  }

  const openChatWith = (vendedorId: string, productoId: string) => {
    setChats(prev => {
      const exists = prev.find(c => c.vendedorId === vendedorId);
      if (exists) return prev.map(c => c.vendedorId === vendedorId ? { ...c, unread: 0 } : c);
      return [...prev, { vendedorId, productoId, mensajes: [{ from: "them", text: "¡Hola! Bienvenido al chat.", time: "ahora" }], unread: 0 }];
    });
    setChatOpen(vendedorId);
    setDetalle(null);
  };

  const sendMessage = (vendedorId: string, text: string) => {
    if (!text.trim()) return;
    const msg: Mensaje = { from: "me", text, time: new Date().toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" }) };
    setChats(prev => prev.map(c => c.vendedorId === vendedorId ? { ...c, mensajes: [...c.mensajes, msg] } : c));
    scheduleBotReply(vendedorId);
  };

  const toggleVendido = (id: string) => {
    setProductos(prev => prev.map(p => p.id === id ? { ...p, vendido: !p.vendido } : p));
    const p = productos.find(x=>x.id===id);
    toast.success(p?.vendido ? "Producto reactivado" : "Marcado como VENDIDO");
  };

  const publicar = (data: Omit<Producto, "id" | "vendido" | "vendedorId">) => {
    const nuevo: Producto = { ...data, id: "p"+Date.now(), vendido: false, vendedorId: "me" };
    // ensure "me" exists as vendedor
    setVendedores(prev => prev.find(v=>v.id==="me") ? prev : [...prev, { id: "me", nombre: user!.nombre, facultad: user!.facultad, codigo: user!.codigo, reviews: [] }]);
    setProductos(prev => [nuevo, ...prev]);
    toast.success("Producto publicado");
    setTab("home");
  };

  const addReview = (vendedorId: string, stars: number, text: string) => {
    setVendedores(prev => prev.map(v => v.id === vendedorId ? { ...v, reviews: [...v.reviews, { stars, text, from: user!.nombre }] } : v));
    toast.success("Reseña publicada");
  };

  // ─── SCREENS ───
  return (
    <div className="min-h-screen bg-[var(--uni-dark)] text-white max-w-[480px] mx-auto relative">
      {/* TOP NAV */}
      <header className="sticky top-0 z-40 bg-[rgba(13,13,13,0.92)] backdrop-blur-md border-b border-[var(--uni-line)]">
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <div className="mono text-[10px] uppercase tracking-[0.22em] text-[var(--uni-muted)]">// {tab === "home" ? "Catálogo" : tab === "chats" ? "Mensajes" : tab === "publish" ? "Publicar" : "Perfil"}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="w-2 h-2 bg-[var(--uni-red)]" />
              <span className="mono font-bold text-sm tracking-wider">UNIMARKET</span>
            </div>
          </div>
          {tab === "home" && (
            <button onClick={()=>setFiltersOpen(true)} className="w-10 h-10 grid place-items-center rounded-[12px] bg-[var(--uni-gray)] border border-[var(--uni-line)]">
              <SlidersHorizontal size={16} />
            </button>
          )}
        </div>
      </header>

      {/* MAIN */}
      <main className="pb-24 screen-in" key={tab}>
        {tab === "home" && (
          <HomeScreen
            user={user!}
            productos={visibles}
            vendedores={vendedores}
            cat={cat} setCat={setCat}
            query={query} setQuery={setQuery}
            showVendidos={showVendidos} setShowVendidos={setShowVendidos}
            onOpen={(id)=>setDetalle(id)}
          />
        )}
        {tab === "chats" && (
          <ChatsScreen chats={chats} vendedores={vendedores} productos={productos} onOpen={(vid)=>{ setChatOpen(vid); setChats(prev=>prev.map(c=>c.vendedorId===vid?{...c,unread:0}:c)); }} />
        )}
        {tab === "publish" && (
          <PublishScreen onPublish={publicar} />
        )}
        {tab === "profile" && (
          <ProfileScreen user={user!} productos={productos} onLogout={()=>{ setAuthed(false); setUser(null); }} onOpenVendedor={(vid)=>setPerfilOpen(vid)} vendedores={vendedores} />
        )}
      </main>

      {/* BOTTOM NAV */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 max-w-[480px] mx-auto bg-[rgba(13,13,13,0.95)] backdrop-blur-md border-t border-[var(--uni-line)]">
        <div className="grid grid-cols-4 px-2 py-2">
          {[
            { k: "home", icon: Home, label: "Inicio" },
            { k: "chats", icon: MessageCircle, label: "Mensajes", badge: totalUnread },
            { k: "publish", icon: Plus, label: "Publicar", primary: true },
            { k: "profile", icon: User, label: "Perfil" },
          ].map(item => {
            const Icon = item.icon;
            const active = tab === item.k;
            return (
              <button key={item.k} onClick={()=>setTab(item.k as typeof tab)} className="flex flex-col items-center gap-1 py-2 relative">
                <div className={`w-10 h-10 grid place-items-center rounded-xl transition-colors ${item.primary ? "bg-[var(--uni-red)]" : active ? "bg-[var(--uni-gray2)]" : ""}`}>
                  <Icon size={item.primary ? 20 : 18} className={item.primary ? "text-white" : active ? "text-white" : "text-[var(--uni-muted)]"} />
                  {item.badge ? (
                    <span className="absolute top-1 right-3 min-w-[18px] h-[18px] px-1 grid place-items-center bg-[var(--uni-red)] text-[10px] font-bold rounded-full">{item.badge}</span>
                  ) : null}
                </div>
                <span className={`text-[10px] mono uppercase tracking-wider ${active ? "text-white" : "text-[var(--uni-muted)]"}`}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* OVERLAYS */}
      {detalle && (
        <ProductDetail
          producto={productos.find(p=>p.id===detalle)!}
          vendedor={vendedores.find(v=>v.id===productos.find(p=>p.id===detalle)!.vendedorId)}
          onClose={()=>setDetalle(null)}
          onContact={(vid, pid)=>openChatWith(vid, pid)}
          onToggleVendido={toggleVendido}
          onOpenVendedor={(vid)=>{ setDetalle(null); setPerfilOpen(vid); }}
          isMine={productos.find(p=>p.id===detalle)!.vendedorId === "me"}
        />
      )}

      {chatOpen && (
        <ChatRoom
          chat={chats.find(c=>c.vendedorId===chatOpen)!}
          vendedor={vendedores.find(v=>v.id===chatOpen)!}
          producto={productos.find(p=>p.id===chats.find(c=>c.vendedorId===chatOpen)!.productoId)}
          onClose={()=>setChatOpen(null)}
          onSend={(t)=>sendMessage(chatOpen, t)}
        />
      )}

      {perfilOpen && (
        <VendedorPerfil
          vendedor={vendedores.find(v=>v.id===perfilOpen)!}
          productos={productos.filter(p=>p.vendedorId===perfilOpen)}
          onClose={()=>setPerfilOpen(null)}
          onReview={(s,t)=>addReview(perfilOpen, s, t)}
          onOpenProducto={(pid)=>{ setPerfilOpen(null); setDetalle(pid); }}
        />
      )}

      {filtersOpen && (
        <FiltersPanel
          facultad={filtFac} setFacultad={setFiltFac}
          zona={filtZona} setZona={setFiltZona}
          min={filtMin} setMin={setFiltMin}
          max={filtMax} setMax={setFiltMax}
          onClear={limpiarFiltros}
          onClose={()=>setFiltersOpen(false)}
        />
      )}
    </div>
  );
}

// ──────────────────────────────────────────
// AUTH
// ──────────────────────────────────────────
function AuthScreen({ onAuth }: { onAuth: (u: { nombre: string; email: string; facultad: Facultad; codigo: string }) => void }) {
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [nombre, setNombre] = useState("");
  const [codigo, setCodigo] = useState("");
  const [facultad, setFacultad] = useState<Facultad>("FIIS");

  const submit = () => {
    if (mode === "forgot") {
      if (!email.endsWith("@uni.edu.pe")) { toast.error("Usa tu correo @uni.edu.pe"); return; }
      toast.success("Enlace de recuperación enviado a " + email);
      setMode("login"); return;
    }
    if (!email.endsWith("@uni.edu.pe")) { toast.error("El correo debe terminar en @uni.edu.pe"); return; }
    if (pwd.length < 4) { toast.error("Contraseña muy corta"); return; }
    if (mode === "signup" && (!nombre || !codigo)) { toast.error("Completa todos los campos"); return; }
    const finalName = nombre || email.split("@")[0].replace(".", " ").replace(/\b\w/g, l=>l.toUpperCase());
    onAuth({ nombre: finalName, email, facultad, codigo: codigo || "20210000" });
  };

  return (
    <div className="min-h-screen bg-[var(--uni-dark)] max-w-[480px] mx-auto flex flex-col">
      <div className="px-6 pt-16 pb-8">
        <div className="mono text-[10px] uppercase tracking-[0.25em] text-[var(--uni-muted)]">// Universidad Nacional de Ingeniería</div>
        <div className="flex items-center gap-3 mt-3">
          <div className="w-3 h-12 bg-[var(--uni-red)]" />
          <div>
            <div className="mono font-bold text-2xl tracking-wider">UNIMARKET</div>
            <div className="text-xs text-[var(--uni-muted)] mt-0.5">Marketplace oficial estudiantil</div>
          </div>
        </div>
      </div>

      <div className="flex-1 px-6">
        <div className="bg-[var(--uni-gray)] border border-[var(--uni-line)] rounded-2xl p-6">
          <div className="flex gap-1 mb-6 bg-[var(--uni-gray2)] p-1 rounded-lg">
            {(["login","signup"] as const).map(m => (
              <button key={m} onClick={()=>setMode(m)} className={`flex-1 py-2 text-sm font-medium rounded-md transition ${mode===m ? "bg-[var(--uni-red)] text-white" : "text-[var(--uni-muted)]"}`}>
                {m === "login" ? "Iniciar sesión" : "Crear cuenta"}
              </button>
            ))}
          </div>

          {mode === "signup" && (
            <Field label="Nombre completo">
              <input value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Camila Torres" className={inputCls}/>
            </Field>
          )}

          <Field label="Correo institucional">
            <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="camila.torres@uni.edu.pe" className={inputCls}/>
          </Field>

          {mode !== "forgot" && (
            <Field label="Contraseña">
              <input type="password" value={pwd} onChange={e=>setPwd(e.target.value)} placeholder="••••••••" className={inputCls}/>
            </Field>
          )}

          {mode === "signup" && (
            <>
              <Field label="Código de estudiante">
                <input value={codigo} onChange={e=>setCodigo(e.target.value)} placeholder="20210123" className={inputCls}/>
              </Field>
              <Field label="Facultad">
                <select value={facultad} onChange={e=>setFacultad(e.target.value as Facultad)} className={inputCls}>
                  {FACULTADES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </Field>
            </>
          )}

          <button onClick={submit} className="w-full mt-4 py-3.5 bg-[var(--uni-red)] hover:bg-[var(--uni-red2)] transition text-white font-semibold rounded-xl mono uppercase tracking-wider text-sm">
            {mode === "login" ? "Entrar" : mode === "signup" ? "Registrarme" : "Enviar enlace"}
          </button>

          {mode === "login" && (
            <button onClick={()=>setMode("forgot")} className="w-full mt-3 text-xs text-[var(--uni-muted)] hover:text-white transition">
              ¿Olvidaste tu contraseña?
            </button>
          )}
          {mode === "forgot" && (
            <button onClick={()=>setMode("login")} className="w-full mt-3 text-xs text-[var(--uni-muted)] hover:text-white transition">
              ← Volver al login
            </button>
          )}
        </div>

        <p className="text-[10px] text-center mono uppercase tracking-wider text-[var(--uni-muted)] mt-6">
          // Solo correos @uni.edu.pe
        </p>
      </div>
    </div>
  );
}

const inputCls = "w-full px-4 py-3 bg-[var(--uni-gray2)] border border-[var(--uni-line)] rounded-lg text-sm text-white placeholder:text-[var(--uni-muted)] focus:outline-none focus:border-[var(--uni-red)] transition";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <label className="mono text-[10px] uppercase tracking-wider text-[var(--uni-muted)] block mb-1.5">{label}</label>
      {children}
    </div>
  );
}

// ──────────────────────────────────────────
// HOME / CATALOG
// ──────────────────────────────────────────
function HomeScreen({ user, productos, vendedores, cat, setCat, query, setQuery, showVendidos, setShowVendidos, onOpen }: {
  user: { nombre: string }; productos: Producto[]; vendedores: Vendedor[];
  cat: Categoria | "Todo"; setCat: (c: Categoria | "Todo") => void;
  query: string; setQuery: (q: string) => void;
  showVendidos: boolean; setShowVendidos: (b: boolean) => void;
  onOpen: (id: string) => void;
}) {
  return (
    <div className="px-5 pt-4">
      <div className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--uni-muted)]">// Hola, {user.nombre.split(" ")[0]}</div>
      <h1 className="text-2xl font-bold mt-1 leading-tight">¿Qué necesitas <br/>para este ciclo?</h1>

      <div className="mt-5 relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--uni-muted)]" />
        <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar libros, apuntes, polos..." className="w-full pl-11 pr-4 py-3 bg-[var(--uni-gray)] border border-[var(--uni-line)] rounded-xl text-sm focus:outline-none focus:border-[var(--uni-red)]"/>
      </div>

      <div className="flex items-center gap-2 mt-4 overflow-x-auto scroll-thin pb-2 -mx-5 px-5">
        {(["Todo", ...CATEGORIAS] as const).map(c => (
          <button key={c} onClick={()=>setCat(c)} className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold border transition ${cat===c ? "bg-[var(--uni-red)] border-[var(--uni-red)] text-white" : "bg-[var(--uni-gray)] border-[var(--uni-line)] text-[var(--uni-muted)]"}`}>
            {c}
          </button>
        ))}
      </div>

      <label className="flex items-center gap-2 mt-3 mb-1 text-xs text-[var(--uni-muted)] cursor-pointer">
        <input type="checkbox" checked={showVendidos} onChange={e=>setShowVendidos(e.target.checked)} className="accent-[var(--uni-red)]"/>
        Mostrar también productos vendidos
      </label>

      <div className="mt-3 grid grid-cols-2 gap-3">
        {productos.map(p => {
          const v = vendedores.find(x=>x.id===p.vendedorId);
          return (
            <button key={p.id} onClick={()=>onOpen(p.id)} className="text-left bg-[var(--uni-gray)] border border-[var(--uni-line)] rounded-2xl overflow-hidden relative hover:border-[var(--uni-red-border,#C1121F40)] transition">
              <div className="aspect-square bg-[var(--uni-gray2)] grid place-items-center text-5xl relative">
                {p.emoji}
                {p.vendido && (
                  <div className="absolute inset-0 bg-black/70 grid place-items-center">
                    <span className="mono text-[var(--uni-red)] font-bold text-lg tracking-[0.3em] border-2 border-[var(--uni-red)] px-3 py-1 -rotate-12">VENDIDO</span>
                  </div>
                )}
              </div>
              <div className="p-3">
                <div className="mono text-[10px] uppercase text-[var(--uni-muted)]">{p.categoria}</div>
                <div className="font-semibold text-sm mt-0.5 line-clamp-1">{p.titulo}</div>
                <div className="mono text-base font-bold text-[var(--uni-red2)] mt-1">S/ {p.precio}</div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--uni-line)]">
                  <div className="min-w-0">
                    <div className="text-[10px] truncate">{v?.nombre}</div>
                    <div className="mono text-[9px] text-[var(--uni-muted)]">{v?.facultad}</div>
                  </div>
                  <Stars n={v ? avgStars(v) : 0} size={10}/>
                </div>
              </div>
            </button>
          );
        })}
        {productos.length === 0 && (
          <div className="col-span-2 py-16 text-center text-[var(--uni-muted)] text-sm">
            <Kicker>// Sin resultados</Kicker>
            <p className="mt-2">Prueba con otros filtros.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────
// PRODUCT DETAIL
// ──────────────────────────────────────────
function ProductDetail({ producto, vendedor, onClose, onContact, onToggleVendido, onOpenVendedor, isMine }: {
  producto: Producto; vendedor?: Vendedor; onClose: () => void;
  onContact: (vid: string, pid: string) => void; onToggleVendido: (id: string) => void;
  onOpenVendedor: (vid: string) => void; isMine: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-[var(--uni-dark)] max-w-[480px] mx-auto overflow-y-auto screen-in">
      <div className="sticky top-0 z-10 bg-[rgba(13,13,13,0.92)] backdrop-blur border-b border-[var(--uni-line)] px-4 py-3 flex items-center gap-3">
        <button onClick={onClose} className="w-9 h-9 grid place-items-center rounded-lg bg-[var(--uni-gray)]"><ChevronLeft size={18}/></button>
        <Kicker>// Detalle</Kicker>
      </div>

      <div className="aspect-square bg-[var(--uni-gray)] grid place-items-center text-9xl relative">
        {producto.emoji}
        {producto.vendido && (
          <div className="absolute inset-0 bg-black/70 grid place-items-center">
            <span className="mono text-[var(--uni-red)] font-bold text-3xl tracking-[0.4em] border-4 border-[var(--uni-red)] px-6 py-2 -rotate-12">VENDIDO</span>
          </div>
        )}
      </div>

      <div className="p-5">
        <Kicker>// {producto.categoria} · {producto.estado}</Kicker>
        <h2 className="text-2xl font-bold mt-1">{producto.titulo}</h2>
        <div className="mono text-3xl font-bold text-[var(--uni-red2)] mt-2">S/ {producto.precio}</div>

        <div className="mt-4 p-3 bg-[var(--uni-gray)] border border-[var(--uni-line)] rounded-xl">
          <Kicker>// Zona de entrega</Kicker>
          <div className="text-sm mt-1">📍 {producto.zona}</div>
        </div>

        {vendedor && (
          <button onClick={()=>onOpenVendedor(vendedor.id)} className="w-full mt-3 p-3 bg-[var(--uni-gray)] border border-[var(--uni-line)] rounded-xl flex items-center gap-3 text-left">
            <div className="w-11 h-11 grid place-items-center bg-[var(--uni-red)] rounded-full font-bold">{vendedor.nombre[0]}</div>
            <div className="flex-1">
              <div className="font-semibold text-sm">{vendedor.nombre}</div>
              <div className="mono text-[10px] text-[var(--uni-muted)]">{vendedor.facultad} · {vendedor.codigo}</div>
              <div className="mt-0.5"><Stars n={avgStars(vendedor)} /></div>
            </div>
            <ChevronLeft size={16} className="rotate-180 text-[var(--uni-muted)]"/>
          </button>
        )}

        <div className="mt-5 grid grid-cols-1 gap-2">
          {!isMine && vendedor && !producto.vendido && (
            <button onClick={()=>onContact(vendedor.id, producto.id)} className="w-full py-3.5 bg-[var(--uni-red)] hover:bg-[var(--uni-red2)] transition rounded-xl font-semibold mono uppercase tracking-wider text-sm">
              Contactar vendedor
            </button>
          )}
          <button onClick={()=>onToggleVendido(producto.id)} className={`w-full py-3 rounded-xl font-semibold text-sm border transition ${producto.vendido ? "border-[var(--success)] text-[var(--success)]" : "border-[var(--uni-line)] text-white hover:border-white"}`}>
            {producto.vendido ? "↻ Reactivar publicación" : "✓ Marcar como vendido"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────
// CHATS LIST & ROOM
// ──────────────────────────────────────────
function ChatsScreen({ chats, vendedores, productos, onOpen }: { chats: Chat[]; vendedores: Vendedor[]; productos: Producto[]; onOpen: (vid: string) => void }) {
  return (
    <div className="px-5 pt-4">
      <Kicker>// Conversaciones</Kicker>
      <h1 className="text-2xl font-bold mt-1">Mensajes</h1>
      <div className="mt-5 space-y-2">
        {chats.length === 0 && <div className="text-center py-16 text-[var(--uni-muted)] text-sm">Sin chats aún. Contacta a un vendedor.</div>}
        {chats.map(c => {
          const v = vendedores.find(x=>x.id===c.vendedorId)!;
          const p = productos.find(x=>x.id===c.productoId);
          const last = c.mensajes[c.mensajes.length-1];
          return (
            <button key={c.vendedorId} onClick={()=>onOpen(c.vendedorId)} className="w-full text-left p-3 bg-[var(--uni-gray)] border border-[var(--uni-line)] rounded-xl flex items-center gap-3">
              <div className="w-12 h-12 grid place-items-center bg-[var(--uni-red)] rounded-full font-bold relative">
                {v.nombre[0]}
                {c.unread > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-[var(--uni-red2)] text-[10px] rounded-full grid place-items-center border-2 border-[var(--uni-dark)]">{c.unread}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-sm">{v.nombre}</div>
                  <div className="mono text-[10px] text-[var(--uni-muted)]">{last?.time}</div>
                </div>
                <div className="text-xs text-[var(--uni-muted)] truncate">{last?.text}</div>
                {p && <div className="mono text-[10px] text-[var(--uni-red2)] mt-0.5">// {p.titulo}</div>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ChatRoom({ chat, vendedor, producto, onClose, onSend }: { chat: Chat; vendedor: Vendedor; producto?: Producto; onClose: () => void; onSend: (t: string) => void }) {
  const [txt, setTxt] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat.mensajes.length]);

  return (
    <div className="fixed inset-0 z-50 bg-[var(--uni-dark)] max-w-[480px] mx-auto flex flex-col screen-in">
      <div className="bg-[rgba(13,13,13,0.92)] backdrop-blur border-b border-[var(--uni-line)] px-4 py-3 flex items-center gap-3">
        <button onClick={onClose} className="w-9 h-9 grid place-items-center rounded-lg bg-[var(--uni-gray)]"><ChevronLeft size={18}/></button>
        <div className="w-10 h-10 grid place-items-center bg-[var(--uni-red)] rounded-full font-bold">{vendedor.nombre[0]}</div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">{vendedor.nombre}</div>
          <div className="mono text-[10px] text-[var(--uni-muted)] truncate">{producto ? `// ${producto.titulo}` : vendedor.facultad}</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scroll-thin px-4 py-4 space-y-2">
        {chat.mensajes.map((m, i) => (
          <div key={i} className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[78%] px-3 py-2 rounded-2xl text-sm ${m.from === "me" ? "bg-[var(--uni-red)] rounded-br-md" : "bg-[var(--uni-gray2)] rounded-bl-md"}`}>
              <div>{m.text}</div>
              <div className={`mono text-[9px] mt-1 ${m.from === "me" ? "text-white/70" : "text-[var(--uni-muted)]"}`}>{m.time}</div>
            </div>
          </div>
        ))}
        <div ref={bottomRef}/>
      </div>

      <form onSubmit={(e)=>{ e.preventDefault(); onSend(txt); setTxt(""); }} className="border-t border-[var(--uni-line)] p-3 flex items-center gap-2 bg-[var(--uni-gray)]">
        <input value={txt} onChange={e=>setTxt(e.target.value)} placeholder="Escribe un mensaje..." className="flex-1 px-4 py-3 bg-[var(--uni-gray2)] rounded-full text-sm focus:outline-none border border-transparent focus:border-[var(--uni-red)]"/>
        <button type="submit" className="w-11 h-11 grid place-items-center bg-[var(--uni-red)] rounded-full"><Send size={16}/></button>
      </form>
    </div>
  );
}

// ──────────────────────────────────────────
// PUBLISH
// ──────────────────────────────────────────
function PublishScreen({ onPublish }: { onPublish: (d: Omit<Producto,"id"|"vendido"|"vendedorId">) => void }) {
  const [titulo, setTitulo] = useState("");
  const [precio, setPrecio] = useState("");
  const [categoria, setCategoria] = useState<Categoria>("Libros");
  const [estado, setEstado] = useState<"Nuevo" | "Como nuevo" | "Usado">("Nuevo");
  const [zona, setZona] = useState(ZONAS[0]);
  const [emoji, setEmoji] = useState("📦");
  const [imgs, setImgs] = useState<string[]>([]);

  const EMOJIS = ["📦","📘","📝","🧮","👕","📐","🔌","🎧","🪑","⚽","🔬","🖊️"];

  const addImg = () => {
    if (imgs.length >= 5) { toast.error("Máximo 5 imágenes"); return; }
    setImgs([...imgs, EMOJIS[Math.floor(Math.random()*EMOJIS.length)]]);
  };

  const submit = () => {
    if (!titulo || !precio) { toast.error("Completa título y precio"); return; }
    onPublish({ titulo, precio: Number(precio), categoria, estado, zona, emoji: imgs[0] || emoji });
    setTitulo(""); setPrecio(""); setImgs([]);
  };

  return (
    <div className="px-5 pt-4">
      <Kicker>// Nueva publicación</Kicker>
      <h1 className="text-2xl font-bold mt-1">Publicar producto</h1>

      <div className="mt-5">
        <Kicker>// Imágenes ({imgs.length}/5)</Kicker>
        <div className="mt-2 grid grid-cols-5 gap-2">
          {imgs.map((e, i) => (
            <div key={i} className="aspect-square bg-[var(--uni-gray)] border border-[var(--uni-line)] rounded-lg grid place-items-center text-2xl relative">
              {e}
              <button onClick={()=>setImgs(imgs.filter((_,j)=>j!==i))} className="absolute -top-1 -right-1 w-5 h-5 bg-[var(--uni-red)] rounded-full grid place-items-center"><X size={10}/></button>
            </div>
          ))}
          {imgs.length < 5 && (
            <button onClick={addImg} className="aspect-square border border-dashed border-[var(--uni-gray3)] rounded-lg grid place-items-center text-[var(--uni-muted)] hover:border-[var(--uni-red)] hover:text-[var(--uni-red)] transition">
              <Camera size={18}/>
            </button>
          )}
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <Field label="Título *"><input value={titulo} onChange={e=>setTitulo(e.target.value)} placeholder="Ej. Libro Cálculo I" className={inputCls}/></Field>
        <Field label="Precio (S/) *"><input type="number" value={precio} onChange={e=>setPrecio(e.target.value)} placeholder="0" className={inputCls}/></Field>
        <Field label="Categoría">
          <select value={categoria} onChange={e=>setCategoria(e.target.value as Categoria)} className={inputCls}>
            {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Estado">
          <div className="grid grid-cols-3 gap-2">
            {(["Nuevo","Como nuevo","Usado"] as const).map(e => (
              <button key={e} onClick={()=>setEstado(e)} className={`py-2.5 text-xs rounded-lg border transition ${estado===e ? "bg-[var(--uni-red)] border-[var(--uni-red)]" : "border-[var(--uni-line)] text-[var(--uni-muted)]"}`}>{e}</button>
            ))}
          </div>
        </Field>
        <Field label="Zona de entrega en campus">
          <select value={zona} onChange={e=>setZona(e.target.value)} className={inputCls}>
            {ZONAS.map(z => <option key={z} value={z}>{z}</option>)}
          </select>
        </Field>
        {imgs.length === 0 && (
          <Field label="Emoji de portada (preview)">
            <div className="flex flex-wrap gap-1.5">
              {EMOJIS.map(e => (
                <button key={e} onClick={()=>setEmoji(e)} className={`w-10 h-10 grid place-items-center rounded-lg text-xl border ${emoji===e ? "border-[var(--uni-red)] bg-[var(--uni-red-bg,#C1121F14)]" : "border-[var(--uni-line)] bg-[var(--uni-gray)]"}`}>{e}</button>
              ))}
            </div>
          </Field>
        )}
      </div>

      <button onClick={submit} className="w-full mt-6 py-3.5 bg-[var(--uni-red)] hover:bg-[var(--uni-red2)] transition rounded-xl font-semibold mono uppercase tracking-wider text-sm">
        Publicar producto
      </button>
    </div>
  );
}

// ──────────────────────────────────────────
// PROFILE (mine)
// ──────────────────────────────────────────
function ProfileScreen({ user, productos, onLogout, onOpenVendedor, vendedores }: { user: { nombre: string; email: string; facultad: Facultad; codigo: string }; productos: Producto[]; onLogout: () => void; onOpenVendedor: (vid: string) => void; vendedores: Vendedor[] }) {
  const mios = productos.filter(p => p.vendedorId === "me");
  const meVend = vendedores.find(v=>v.id==="me");

  return (
    <div className="px-5 pt-4">
      <Kicker>// Perfil</Kicker>
      <div className="mt-3 p-5 bg-[var(--uni-gray)] border border-[var(--uni-line)] rounded-2xl">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 grid place-items-center bg-[var(--uni-red)] rounded-full font-bold text-2xl">{user.nombre[0]}</div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-lg truncate">{user.nombre}</div>
            <div className="mono text-[10px] text-[var(--uni-muted)] truncate">{user.email}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="mono text-[10px] px-2 py-0.5 bg-[var(--uni-red-bg,#C1121F14)] text-[var(--uni-red2)] border border-[var(--uni-red)] rounded">{user.facultad}</span>
              <span className="mono text-[10px] text-[var(--uni-muted)]">{user.codigo}</span>
            </div>
          </div>
        </div>
        {meVend && meVend.reviews.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[var(--uni-line)] flex items-center justify-between">
            <Kicker>// Reputación</Kicker>
            <div className="flex items-center gap-2">
              <Stars n={avgStars(meVend)}/>
              <span className="mono text-xs">{avgStars(meVend).toFixed(1)}</span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-5">
        <Kicker>// Mis publicaciones ({mios.length})</Kicker>
        <div className="mt-3 space-y-2">
          {mios.length === 0 && <p className="text-sm text-[var(--uni-muted)] text-center py-8">Aún no has publicado nada.</p>}
          {mios.map(p => (
            <div key={p.id} className="p-3 bg-[var(--uni-gray)] border border-[var(--uni-line)] rounded-xl flex items-center gap-3">
              <div className="w-12 h-12 grid place-items-center bg-[var(--uni-gray2)] rounded-lg text-2xl">{p.emoji}</div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{p.titulo}</div>
                <div className="mono text-xs text-[var(--uni-red2)]">S/ {p.precio}</div>
              </div>
              {p.vendido && <span className="mono text-[9px] px-2 py-1 bg-[var(--uni-red)] rounded">VENDIDO</span>}
            </div>
          ))}
        </div>
      </div>

      {meVend && (
        <button onClick={()=>onOpenVendedor("me")} className="w-full mt-4 py-3 border border-[var(--uni-line)] rounded-xl text-sm mono uppercase tracking-wider hover:border-white transition">
          Ver mi perfil público
        </button>
      )}

      <button onClick={onLogout} className="w-full mt-3 py-3 flex items-center justify-center gap-2 border border-[var(--uni-line)] rounded-xl text-sm text-[var(--uni-muted)] hover:text-[var(--uni-red)] hover:border-[var(--uni-red)] transition">
        <LogOut size={14}/> Cerrar sesión
      </button>
    </div>
  );
}

// ──────────────────────────────────────────
// VENDEDOR PERFIL (public) + REVIEW MODAL
// ──────────────────────────────────────────
function VendedorPerfil({ vendedor, productos, onClose, onReview, onOpenProducto }: { vendedor: Vendedor; productos: Producto[]; onClose: () => void; onReview: (s: number, t: string) => void; onOpenProducto: (pid: string) => void }) {
  const [open, setOpen] = useState(false);
  const [stars, setStars] = useState(5);
  const [txt, setTxt] = useState("");

  const send = () => {
    if (!txt.trim()) { toast.error("Escribe un comentario"); return; }
    onReview(stars, txt);
    setOpen(false); setTxt(""); setStars(5);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[var(--uni-dark)] max-w-[480px] mx-auto overflow-y-auto screen-in">
      <div className="sticky top-0 z-10 bg-[rgba(13,13,13,0.92)] backdrop-blur border-b border-[var(--uni-line)] px-4 py-3 flex items-center gap-3">
        <button onClick={onClose} className="w-9 h-9 grid place-items-center rounded-lg bg-[var(--uni-gray)]"><ChevronLeft size={18}/></button>
        <Kicker>// Vendedor</Kicker>
      </div>

      <div className="p-5">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 grid place-items-center bg-[var(--uni-red)] rounded-full font-bold text-3xl">{vendedor.nombre[0]}</div>
          <div className="flex-1">
            <div className="font-bold text-xl">{vendedor.nombre}</div>
            <div className="mono text-xs text-[var(--uni-muted)]">{vendedor.facultad} · {vendedor.codigo}</div>
            <div className="flex items-center gap-2 mt-1.5">
              <Stars n={avgStars(vendedor)}/>
              <span className="mono text-xs">{avgStars(vendedor).toFixed(1)} ({vendedor.reviews.length})</span>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <Kicker>// Publicaciones</Kicker>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {productos.map(p => (
              <button key={p.id} onClick={()=>onOpenProducto(p.id)} className="aspect-square bg-[var(--uni-gray)] border border-[var(--uni-line)] rounded-lg grid place-items-center text-3xl relative">
                {p.emoji}
                {p.vendido && <div className="absolute inset-0 bg-black/70 grid place-items-center rounded-lg"><span className="mono text-[8px] text-[var(--uni-red)] font-bold">VENDIDO</span></div>}
              </button>
            ))}
            {productos.length === 0 && <div className="col-span-3 text-xs text-[var(--uni-muted)] text-center py-4">Sin publicaciones</div>}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <Kicker>// Reseñas ({vendedor.reviews.length})</Kicker>
          <button onClick={()=>setOpen(true)} className="text-xs mono uppercase tracking-wider text-[var(--uni-red2)] hover:text-white">+ Escribir</button>
        </div>
        <div className="mt-2 space-y-2">
          {vendedor.reviews.map((r,i) => (
            <div key={i} className="p-3 bg-[var(--uni-gray)] border border-[var(--uni-line)] rounded-xl">
              <div className="flex items-center justify-between">
                <Stars n={r.stars}/>
                <div className="mono text-[10px] text-[var(--uni-muted)]">— {r.from}</div>
              </div>
              <p className="text-sm mt-1.5">{r.text}</p>
            </div>
          ))}
          {vendedor.reviews.length === 0 && <p className="text-xs text-[var(--uni-muted)] text-center py-4">Sin reseñas todavía.</p>}
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/70 grid place-items-center z-50 p-5" onClick={()=>setOpen(false)}>
          <div className="bg-[var(--uni-gray)] border border-[var(--uni-line)] rounded-2xl p-5 w-full max-w-sm" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <Kicker>// Calificar vendedor</Kicker>
              <button onClick={()=>setOpen(false)}><X size={18}/></button>
            </div>
            <div className="flex justify-center gap-1 mb-4">
              {[1,2,3,4,5].map(i => (
                <button key={i} onClick={()=>setStars(i)}>
                  <Star size={32} className={i <= stars ? "fill-[var(--gold)] text-[var(--gold)]" : "text-[var(--uni-gray3)]"}/>
                </button>
              ))}
            </div>
            <textarea value={txt} onChange={e=>setTxt(e.target.value)} rows={3} placeholder="Cuéntanos cómo fue la experiencia..." className={inputCls}/>
            <button onClick={send} className="w-full mt-3 py-3 bg-[var(--uni-red)] rounded-xl font-semibold mono uppercase text-sm tracking-wider">
              Publicar reseña
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────
// FILTERS PANEL
// ──────────────────────────────────────────
function FiltersPanel({ facultad, setFacultad, zona, setZona, min, setMin, max, setMax, onClear, onClose }: {
  facultad: Facultad | ""; setFacultad: (f: Facultad | "") => void;
  zona: string; setZona: (z: string) => void;
  min: string; setMin: (s: string) => void;
  max: string; setMax: (s: string) => void;
  onClear: () => void; onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 max-w-[480px] mx-auto" onClick={onClose}>
      <div className="absolute bottom-0 left-0 right-0 bg-[var(--uni-gray)] border-t border-[var(--uni-line)] rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto screen-in" onClick={e=>e.stopPropagation()}>
        <div className="w-12 h-1 bg-[var(--uni-gray3)] rounded mx-auto mb-4"/>
        <div className="flex items-center justify-between mb-5">
          <div>
            <Kicker>// Filtros</Kicker>
            <h2 className="text-xl font-bold mt-1">Refinar búsqueda</h2>
          </div>
          <button onClick={onClose} className="w-9 h-9 grid place-items-center rounded-lg bg-[var(--uni-gray2)]"><X size={18}/></button>
        </div>

        <Field label="Facultad del vendedor">
          <div className="flex flex-wrap gap-1.5">
            <button onClick={()=>setFacultad("")} className={`px-3 py-1.5 text-xs rounded-full border ${facultad==="" ? "bg-[var(--uni-red)] border-[var(--uni-red)]" : "border-[var(--uni-line)] text-[var(--uni-muted)]"}`}>Todas</button>
            {FACULTADES.map(f => (
              <button key={f} onClick={()=>setFacultad(f)} className={`px-3 py-1.5 text-xs rounded-full border mono ${facultad===f ? "bg-[var(--uni-red)] border-[var(--uni-red)]" : "border-[var(--uni-line)] text-[var(--uni-muted)]"}`}>{f}</button>
            ))}
          </div>
        </Field>

        <Field label="Rango de precio (S/)">
          <div className="grid grid-cols-2 gap-2">
            <input type="number" value={min} onChange={e=>setMin(e.target.value)} placeholder="Mín." className={inputCls}/>
            <input type="number" value={max} onChange={e=>setMax(e.target.value)} placeholder="Máx." className={inputCls}/>
          </div>
        </Field>

        <Field label="Zona de entrega">
          <div className="flex flex-wrap gap-1.5">
            <button onClick={()=>setZona("")} className={`px-3 py-1.5 text-xs rounded-full border ${zona==="" ? "bg-[var(--uni-red)] border-[var(--uni-red)]" : "border-[var(--uni-line)] text-[var(--uni-muted)]"}`}>Cualquiera</button>
            {ZONAS.map(z => (
              <button key={z} onClick={()=>setZona(z)} className={`px-3 py-1.5 text-xs rounded-full border ${zona===z ? "bg-[var(--uni-red)] border-[var(--uni-red)]" : "border-[var(--uni-line)] text-[var(--uni-muted)]"}`}>{z}</button>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-2 mt-5">
          <button onClick={onClear} className="py-3 border border-[var(--uni-line)] rounded-xl text-sm mono uppercase tracking-wider">Limpiar</button>
          <button onClick={onClose} className="py-3 bg-[var(--uni-red)] rounded-xl text-sm font-semibold mono uppercase tracking-wider">Aplicar</button>
        </div>
      </div>
    </div>
  );
}
