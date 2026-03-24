import { useState, useEffect, useRef } from "react";
import { auth, db } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  doc, setDoc, getDoc, collection, onSnapshot, updateDoc, deleteDoc, query, where, getDocs
} from "firebase/firestore";

const DIVS = ["NCAA I", "NCAA II", "NCAA III", "NAIA"];
const YEARS = ["Freshman", "Sophomore", "Junior", "Senior"];
const US_STATES = ["Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming"];

const G = {
  dark:"#1a2e1a", green:"#2d5a27", gold:"#c9a84c", goldLight:"#f0d080",
  white:"#ffffff", muted:"#6b7c6a", danger:"#c0392b", success:"#27ae60", mid:"#3d7a35",
};
const S = {
  wrap:{ fontFamily:"var(--font-sans)", maxWidth:820, margin:"0 auto", padding:"1.25rem" },
  card:{ background:"var(--color-background-primary)", borderRadius:12, border:"0.5px solid var(--color-border-tertiary)", padding:"1rem 1.25rem", marginBottom:12 },
  goldCard:{ background:"var(--color-background-primary)", borderRadius:12, border:`1.5px solid ${G.gold}66`, padding:"1rem 1.25rem", marginBottom:16 },
  inp:{ padding:"9px 12px", borderRadius:9, border:"0.5px solid var(--color-border-secondary)", background:"var(--color-background-primary)", color:"var(--color-text-primary)", fontSize:14, width:"100%", boxSizing:"border-box" },
  btnPrimary:{ padding:"9px 20px", borderRadius:10, border:"none", background:G.green, color:G.white, cursor:"pointer", fontSize:14, fontWeight:500 },
  btnGold:{ padding:"9px 20px", borderRadius:10, border:"none", background:G.gold, color:G.dark, cursor:"pointer", fontSize:14, fontWeight:500 },
  btnDanger:{ padding:"9px 20px", borderRadius:10, border:"none", background:G.danger, color:G.white, cursor:"pointer", fontSize:14, fontWeight:500 },
  btnSmall:{ padding:"6px 12px", borderRadius:8, border:"0.5px solid var(--color-border-secondary)", background:"var(--color-background-secondary)", color:"var(--color-text-primary)", cursor:"pointer", fontSize:12 },
  btnOutline:{ padding:"8px 16px", borderRadius:10, border:`1.5px solid ${G.green}`, background:"transparent", color:G.green, cursor:"pointer", fontSize:13, fontWeight:500 },
  navBtn:(a,live)=>({ padding:"9px 18px", borderRadius:10, border:"none", cursor:"pointer", fontSize:13, fontWeight:500, background:live?G.danger:a?G.green:"var(--color-background-secondary)", color:live?G.white:a?G.white:"var(--color-text-primary)" }),
  badge:(c)=>({ fontSize:11, padding:"3px 9px", borderRadius:6, background:c+"22", color:c, fontWeight:500 }),
  th:(center)=>({ padding:"6px 8px", textAlign:center?"center":"left", fontWeight:500, color:"var(--color-text-secondary)", fontSize:12 }),
  td:(center)=>({ padding:"8px", textAlign:center?"center":"left" }),
};

// ── Course Search ─────────────────────────────────────────────────────────────
function CourseSearch({ onSave, onCancel }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState(null);
  const [manual, setManual] = useState({ name:"", par:"", slope:"", rating:"", holes:18, holePars:Array(18).fill(4) });
  const timer = useRef(null);

  const search = (q) => {
    setQuery(q);
    if (timer.current) clearTimeout(timer.current);
    if (q.length < 3) { setResults(null); return; }
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch("/.netlify/functions/claude", {
          method:"POST", headers:{ "Content-Type":"application/json" },
          body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:800,
            system:"Return ONLY a raw JSON array of up to 4 golf courses. Each: {name, location, par, slope, rating, holes}. No markdown.",
            messages:[{ role:"user", content:`Golf courses matching: "${q}"` }] })
        });
        const data = await res.json();
        const text = data.content?.map(b=>b.text||"").join("").replace(/```json|```/g,"").trim();
        setResults(JSON.parse(text));
      } catch { setResults([]); }
      setLoading(false);
    }, 600);
  };

  const select = (c) => {
    const hp = Array(c.holes).fill(null).map((_,i)=>i%6===1||i%6===4?3:i%6===2||i%6===5?5:4);
    setDraft({ name:`${c.name} — ${c.location}`, par:c.par, slope:c.slope, rating:c.rating, holes:c.holes, holePars:hp });
  };

  const HolePars = ({ pars, onChange }) => (
    <div style={{ marginBottom:16 }}>
      <p style={{ margin:"0 0 8px", fontSize:13, color:"var(--color-text-secondary)" }}>Par per hole</p>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(9, 1fr)", gap:4 }}>
        {pars.map((p,i) => (
          <div key={i} style={{ textAlign:"center" }}>
            <p style={{ margin:"0 0 2px", fontSize:10, color:"var(--color-text-secondary)" }}>H{i+1}</p>
            <select value={p} onChange={e=>{ const n=[...pars]; n[i]=Number(e.target.value); onChange(n); }} style={{ ...S.inp, padding:"4px 2px", textAlign:"center", fontSize:13 }}>
              <option value={3}>3</option><option value={4}>4</option><option value={5}>5</option>
            </select>
          </div>
        ))}
      </div>
    </div>
  );

  if (draft) return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <h2 style={{ margin:0, fontSize:18, fontWeight:500 }}>Confirm course</h2>
        <button style={S.btnSmall} onClick={onCancel}>✕ Cancel</button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:10, marginBottom:14 }}>
        <input style={S.inp} placeholder="Course name" value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})} />
        <input style={S.inp} placeholder="Par" type="number" value={draft.par} onChange={e=>setDraft({...draft,par:e.target.value})} />
        <input style={S.inp} placeholder="Slope" type="number" value={draft.slope} onChange={e=>setDraft({...draft,slope:e.target.value})} />
        <input style={S.inp} placeholder="Rating" type="number" value={draft.rating} onChange={e=>setDraft({...draft,rating:e.target.value})} />
      </div>
      <HolePars pars={draft.holePars} onChange={hp=>setDraft({...draft,holePars:hp})} />
      <div style={{ display:"flex", gap:8 }}>
        <button style={S.btnPrimary} onClick={()=>draft.name&&onSave({...draft,id:"c_"+Date.now(),par:Number(draft.par),slope:Number(draft.slope),rating:Number(draft.rating)})}>Save course</button>
        <button style={S.btnSmall} onClick={()=>setDraft(null)}>Search again</button>
      </div>
    </div>
  );

  if (results !== null && results.length > 0) return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <h2 style={{ margin:0, fontSize:18, fontWeight:500 }}>Select a course</h2>
        <button style={S.btnSmall} onClick={onCancel}>✕ Cancel</button>
      </div>
      {results.map((c,i) => (
        <div key={i} onClick={()=>select(c)}
          style={{ padding:"14px 16px", cursor:"pointer", borderRadius:10, border:"0.5px solid var(--color-border-secondary)", marginBottom:10, display:"flex", justifyContent:"space-between", alignItems:"center", background:"var(--color-background-primary)" }}
          onMouseEnter={e=>e.currentTarget.style.background="var(--color-background-secondary)"}
          onMouseLeave={e=>e.currentTarget.style.background="var(--color-background-primary)"}>
          <div>
            <p style={{ margin:0, fontWeight:500, fontSize:15 }}>{c.name}</p>
            <p style={{ margin:"3px 0 0", fontSize:13, color:"var(--color-text-secondary)" }}>{c.location}</p>
          </div>
          <div style={{ display:"flex", gap:6 }}>
            <span style={S.badge(G.mid)}>Par {c.par}</span>
            <span style={S.badge(G.muted)}>Slope {c.slope}</span>
            <span style={S.badge(G.muted)}>{c.holes}H</span>
          </div>
        </div>
      ))}
      <button style={S.btnSmall} onClick={()=>{ setResults(null); setQuery(""); }}>Search again</button>
    </div>
  );

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <h2 style={{ margin:0, fontSize:18, fontWeight:500 }}>Add a course</h2>
        <button style={S.btnSmall} onClick={onCancel}>✕ Cancel</button>
      </div>
      <div style={{ display:"flex", gap:8, marginBottom:8 }}>
        <input style={{ ...S.inp, flex:1 }} placeholder="e.g. Pebble Beach, Augusta..." value={query} onChange={e=>search(e.target.value)} autoFocus />
        {loading && <span style={{ alignSelf:"center", fontSize:12, color:"var(--color-text-secondary)" }}>Searching...</span>}
      </div>
      {results!==null && results.length===0 && !loading && <p style={{ fontSize:13, color:"var(--color-text-secondary)", margin:"4px 0 12px" }}>No results — try a different name.</p>}
      <div style={{ display:"flex", alignItems:"center", gap:8, margin:"14px 0 12px" }}>
        <div style={{ flex:1, height:"0.5px", background:"var(--color-border-tertiary)" }} />
        <span style={{ fontSize:13, color:"var(--color-text-secondary)" }}>or fill in manually</span>
        <div style={{ flex:1, height:"0.5px", background:"var(--color-border-tertiary)" }} />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:10, marginBottom:14 }}>
        <input style={S.inp} placeholder="Course name" value={manual.name} onChange={e=>setManual({...manual,name:e.target.value})} />
        <input style={S.inp} placeholder="Par" type="number" value={manual.par} onChange={e=>setManual({...manual,par:e.target.value})} />
        <input style={S.inp} placeholder="Slope" type="number" value={manual.slope} onChange={e=>setManual({...manual,slope:e.target.value})} />
        <input style={S.inp} placeholder="Rating" type="number" value={manual.rating} onChange={e=>setManual({...manual,rating:e.target.value})} />
      </div>
      <HolePars pars={manual.holePars} onChange={hp=>setManual({...manual,holePars:hp})} />
      <button style={S.btnPrimary} onClick={()=>manual.name&&onSave({...manual,id:"c_"+Date.now(),par:Number(manual.par),slope:Number(manual.slope),rating:Number(manual.rating)})}>Save course</button>
    </div>
  );
}

// ── Live Public ───────────────────────────────────────────────────────────────
function LivePublic({ onBack }) {
  const [teams, setTeams] = useState([]);
  const toParLabel = (v) => v===null||v===undefined?"—":v===0?"E":v>0?`+${v}`:`${v}`;
  const toParColor = (v) => !v&&v!==0?"var(--color-text-secondary)":v<0?G.success:v>0?G.danger:"var(--color-text-primary)";

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "teams"), snap => {
      setTeams(snap.docs.map(d=>({id:d.id,...d.data()})));
    });
    return unsub;
  }, []);

  const allActive = teams.flatMap(team =>
    (team.tournaments||[]).filter(t=>t.rounds?.some(r=>r.status==="live")).map(t=>({...t,teamName:team.name,teamDiv:team.division,courses:team.courses||[],players:team.players||[]}))
  );

  return (
    <div style={S.wrap}>
      <div style={{ background:G.dark, borderRadius:14, padding:"1.25rem 1.5rem", marginBottom:20, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <h1 style={{ margin:0, fontSize:20, fontWeight:500, color:G.gold }}>🔴 Live Scores</h1>
          <p style={{ margin:"4px 0 0", fontSize:13, color:G.goldLight, opacity:0.8 }}>Active tournaments across all teams</p>
        </div>
        {onBack && <button style={{ ...S.btnSmall, color:G.white, borderColor:"rgba(255,255,255,0.3)", background:"rgba(255,255,255,0.1)" }} onClick={onBack}>← Back</button>}
      </div>
      {allActive.length===0
        ? <div style={{ ...S.card, textAlign:"center", padding:"3rem" }}><p style={{ margin:0, color:"var(--color-text-secondary)" }}>No active tournaments right now</p></div>
        : allActive.map(t => {
            const lr = t.rounds.find(r=>r.status==="live");
            const course = t.courses.find(c=>c.id===lr?.courseId);
            if (!lr||!course) return null;
            const lb = t.players.map(p=>{ const sc=lr.scores?.[p.id]||[]; const played=sc.filter(x=>x!==null); const total=played.length?played.reduce((a,b)=>a+b,0):null; const toPar=total!==null?Math.round(total-course.par*(played.length/sc.length)):null; return {player:p,total,toPar,holesPlayed:played.length}; }).sort((a,b)=>(a.toPar??999)-(b.toPar??999));
            return (
              <div key={t.id} style={S.card}>
                <div style={{ ...S.card, background:G.dark, border:"none", marginBottom:14, padding:"12px 16px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div>
                      <p style={{ margin:0, fontWeight:500, color:G.gold, fontSize:15 }}>{t.name}</p>
                      <p style={{ margin:"3px 0 0", fontSize:12, color:G.goldLight, opacity:0.8 }}>{t.teamName} · {t.teamDiv} · R{lr.roundNum} · {course.name}</p>
                    </div>
                    <span style={S.badge(G.danger)}>● Live</span>
                  </div>
                </div>
                <table style={{ width:"100%", fontSize:13, borderCollapse:"collapse" }}>
                  <thead><tr style={{ borderBottom:"0.5px solid var(--color-border-tertiary)" }}>
                    {["#","Player","Holes","Score","To par"].map(h=><th key={h} style={S.th(h!=="Player")}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {lb.map((e,i)=>(
                      <tr key={e.player.id} style={{ borderBottom:"0.5px solid var(--color-border-tertiary)", background:i===0?`${G.gold}11`:"transparent" }}>
                        <td style={{ ...S.td(true), color:i===0?G.gold:"inherit", fontWeight:i<3?500:400 }}>{i+1}</td>
                        <td style={{ ...S.td(), fontWeight:500 }}>{e.player.name}</td>
                        <td style={S.td(true)}>{e.holesPlayed}/{course.holes}</td>
                        <td style={S.td(true)}>{e.total??"—"}</td>
                        <td style={{ ...S.td(true), fontWeight:500, color:toParColor(e.toPar) }}>{toParLabel(e.toPar)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })
      }
    </div>
  );
}

// ── Auth Screen ───────────────────────────────────────────────────────────────
function AuthScreen({ onLogin, onRegister }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name:"", email:"", password:"", role:"player", teamId:"", universityName:"", universityState:"" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "teams"), snap => {
      setTeams(snap.docs.map(d=>({id:d.id,...d.data()})));
    });
    return unsub;
  }, []);

  const handleLogin = async () => {
    if (!form.email||!form.password) { setError("Please fill all fields."); return; }
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, form.email, form.password);
      const userDoc = await getDoc(doc(db, "users", cred.user.uid));
      if (userDoc.exists()) onLogin({ uid:cred.user.uid, ...userDoc.data() });
      else setError("User profile not found.");
    } catch { setError("Invalid email or password."); }
    setLoading(false);
  };

  const handleRegister = async () => {
    if (!form.name||!form.email||!form.password) { setError("Please fill all fields."); return; }
    if (form.role==="coach"&&(!form.universityName||!form.universityState)) { setError("Please enter university name and state."); return; }
    if (form.role==="player"&&!form.teamId) { setError("Please select a team."); return; }
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      const uid = cred.user.uid;
      const teamId = form.role==="coach" ? "team_"+uid : form.teamId;
      const registeredAt = new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
      const userData = { name:form.name, email:form.email, role:form.role, teamId, status:form.role==="player"?"pending":"active", registeredAt };
      await setDoc(doc(db,"users",uid), userData);
      if (form.role==="coach") {
        await setDoc(doc(db,"teams",teamId), { name:form.universityName, state:form.universityState, division:"NCAA I", courses:[], players:[], tournaments:[], coachId:uid, createdAt:registeredAt });
      }
      onRegister({ uid, ...userData });
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div style={{ ...S.wrap, maxWidth:420, paddingTop:"3rem" }}>
      <div style={{ background:G.dark, borderRadius:14, padding:"1.5rem", marginBottom:24, textAlign:"center" }}>
        <h1 style={{ margin:0, fontSize:26, fontWeight:500, color:G.gold }}>Golf Stats Pro</h1>
        <p style={{ margin:"6px 0 0", fontSize:13, color:G.goldLight, opacity:0.8 }}>NCAA / NAIA Team Management</p>
      </div>
      <div style={{ display:"flex", gap:6, marginBottom:20 }}>
        {[["login","Sign in"],["register","Register"],["live","🔴 Live"]].map(([m,l])=>(
          <button key={m} onClick={()=>{ setMode(m); setError(""); }} style={{ ...S.navBtn(mode===m,false), flex:1 }}>{l}</button>
        ))}
      </div>
     {mode==="live" && <LivePublic onBack={()=>setMode("login")} />} 
      {mode==="login" && (
        <div style={S.goldCard}>
          <p style={{ margin:"0 0 14px", fontWeight:500, fontSize:15 }}>Sign in to your account</p>
          {error && <p style={{ margin:"0 0 10px", fontSize:13, color:G.danger }}>{error}</p>}
          <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:16 }}>
            <input style={S.inp} placeholder="Email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} />
            <input style={S.inp} placeholder="Password" type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} onKeyDown={e=>e.key==="Enter"&&handleLogin()} />
          </div>
          <button style={{ ...S.btnPrimary, width:"100%", opacity:loading?0.7:1 }} onClick={handleLogin} disabled={loading}>{loading?"Signing in...":"Sign in"}</button>
        </div>
      )}
      {mode==="register" && (
        <div style={S.goldCard}>
          <p style={{ margin:"0 0 14px", fontWeight:500, fontSize:15 }}>Create account</p>
          {error && <p style={{ margin:"0 0 10px", fontSize:13, color:G.danger }}>{error}</p>}
          <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:14 }}>
            <input style={S.inp} placeholder="Full name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />
            <input style={S.inp} placeholder="Email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} />
            <input style={S.inp} placeholder="Password (min 6 characters)" type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} />
            <select style={S.inp} value={form.role} onChange={e=>setForm({...form,role:e.target.value,teamId:"",universityName:"",universityState:""})}>
              <option value="player">Player</option>
              <option value="coach">Coach</option>
            </select>
            {form.role==="coach" ? (
              <>
                <input style={S.inp} placeholder="University name" value={form.universityName} onChange={e=>setForm({...form,universityName:e.target.value})} />
                <select style={S.inp} value={form.universityState} onChange={e=>setForm({...form,universityState:e.target.value})}>
                  <option value="">Select state...</option>
                  {US_STATES.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </>
            ) : (
              <select style={S.inp} value={form.teamId} onChange={e=>setForm({...form,teamId:e.target.value})}>
                <option value="">Select your team...</option>
                {teams.map(t=><option key={t.id} value={t.id}>{t.name} ({t.division})</option>)}
              </select>
            )}
          </div>
          <button style={{ ...S.btnPrimary, width:"100%", opacity:loading?0.7:1 }} onClick={handleRegister} disabled={loading}>
            {loading?"Creating account...":form.role==="player"?"Request to join team":"Create account"}
          </button>
          {form.role==="player" && <p style={{ margin:"10px 0 0", fontSize:12, color:"var(--color-text-secondary)", textAlign:"center" }}>Your coach will need to approve your request</p>}
        </div>
      )}
    </div>
  );
}

// ── Pending Screen ────────────────────────────────────────────────────────────
function PendingScreen({ user, onLogout }) {
  return (
    <div style={{ ...S.wrap, maxWidth:420, paddingTop:"3rem", textAlign:"center" }}>
      <div style={{ background:G.dark, borderRadius:14, padding:"1.5rem", marginBottom:24 }}>
        <h1 style={{ margin:0, fontSize:22, fontWeight:500, color:G.gold }}>Golf Stats Pro</h1>
      </div>
      <div style={S.goldCard}>
        <p style={{ fontSize:40, margin:"0 0 12px" }}>⏳</p>
        <p style={{ fontWeight:500, fontSize:16, margin:"0 0 8px" }}>Request pending approval</p>
        <p style={{ fontSize:14, color:"var(--color-text-secondary)", margin:"0 0 20px" }}>Hi {user.name}, your request has been sent to your coach.</p>
        <button style={S.btnSmall} onClick={onLogout}>Sign out</button>
      </div>
    </div>
  );
}

// ── Admin Panel ───────────────────────────────────────────────────────────────
function AdminPanel({ currentUser, onLogout }) {
  const [tab, setTab] = useState("overview");
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const u1 = onSnapshot(collection(db,"teams"), snap=>setTeams(snap.docs.map(d=>({id:d.id,...d.data()}))));
    const u2 = onSnapshot(collection(db,"users"), snap=>setUsers(snap.docs.map(d=>({id:d.id,...d.data()}))));
    return ()=>{ u1(); u2(); };
  }, []);

  const coaches = users.filter(u=>u.role==="coach");
  const players = users.filter(u=>u.role==="player");
  const pending = users.filter(u=>u.status==="pending");
  const filtered = (list) => list.filter(u=>u.name?.toLowerCase().includes(search.toLowerCase())||u.email?.toLowerCase().includes(search.toLowerCase()));

  const StatCard = ({ label, value, color }) => (
    <div style={{ background:"var(--color-background-secondary)", borderRadius:10, padding:"16px 20px", textAlign:"center" }}>
      <p style={{ margin:0, fontSize:28, fontWeight:500, color:color||G.gold }}>{value}</p>
      <p style={{ margin:"4px 0 0", fontSize:12, color:"var(--color-text-secondary)" }}>{label}</p>
    </div>
  );

  return (
    <div style={S.wrap}>
      <div style={{ background:G.dark, borderRadius:14, padding:"1rem 1.5rem", marginBottom:20, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <h1 style={{ margin:0, fontSize:20, fontWeight:500, color:G.gold }}>Golf Stats Pro</h1>
          <p style={{ margin:"3px 0 0", fontSize:12, color:G.goldLight, opacity:0.8 }}>Platform Administration</p>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <div style={{ textAlign:"right" }}>
            <p style={{ margin:0, fontSize:13, color:G.goldLight }}>{currentUser.name}</p>
            <span style={{ ...S.badge(G.danger), fontSize:10 }}>admin</span>
          </div>
          <button style={{ ...S.btnSmall, color:G.white, borderColor:"rgba(255,255,255,0.3)", background:"rgba(255,255,255,0.1)" }} onClick={onLogout}>Sign out</button>
        </div>
      </div>
      <div style={{ display:"flex", gap:6, marginBottom:20, flexWrap:"wrap" }}>
        {[["overview","Overview"],["universities","Universities"],["coaches","Coaches"],["players","Players"]].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)} style={S.navBtn(tab===id,false)}>{label}</button>
        ))}
      </div>
      {tab==="overview" && (
        <div>
          <h2 style={{ margin:"0 0 16px", fontSize:18, fontWeight:500 }}>Platform overview</h2>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:24 }}>
            <StatCard label="Universities" value={teams.length} color={G.gold} />
            <StatCard label="Coaches" value={coaches.length} color={G.green} />
            <StatCard label="Players" value={players.length} color={G.mid} />
            <StatCard label="Pending" value={pending.length} color={pending.length>0?G.danger:G.muted} />
          </div>
          <h3 style={{ fontSize:15, fontWeight:500, margin:"0 0 12px" }}>Recent registrations</h3>
          {users.filter(u=>u.role!=="admin").slice(-5).reverse().map(u=>{
            const team = teams.find(t=>t.id===u.teamId);
            return (
              <div key={u.id} style={{ ...S.card, display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 16px", marginBottom:6 }}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ width:36, height:36, borderRadius:"50%", background:G.dark, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:500, color:G.gold }}>
                    {u.name?.split(" ").map(n=>n[0]).join("")}
                  </div>
                  <div>
                    <p style={{ margin:0, fontWeight:500, fontSize:14 }}>{u.name}</p>
                    <p style={{ margin:0, fontSize:12, color:"var(--color-text-secondary)" }}>{u.email} · {team?.name||"—"}</p>
                  </div>
                </div>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <span style={S.badge(u.role==="coach"?G.gold:G.mid)}>{u.role}</span>
                  <span style={S.badge(u.status==="active"?G.success:G.danger)}>{u.status}</span>
                  <span style={{ fontSize:12, color:"var(--color-text-secondary)" }}>{u.registeredAt}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {tab==="universities" && (
        <div>
          <h2 style={{ margin:"0 0 16px", fontSize:18, fontWeight:500 }}>Universities ({teams.length})</h2>
          {teams.map(t=>{
            const coach = coaches.find(u=>u.teamId===t.id);
            const teamPlayers = players.filter(u=>u.teamId===t.id);
            return (
              <div key={t.id} style={S.card}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                  <div>
                    <p style={{ margin:0, fontWeight:500, fontSize:15 }}>{t.name}</p>
                    <p style={{ margin:"2px 0 0", fontSize:12, color:"var(--color-text-secondary)" }}>{t.division}{t.state?` · ${t.state}`:""}</p>
                  </div>
                  <button onClick={()=>deleteDoc(doc(db,"teams",t.id))} style={{ background:"none", border:"none", cursor:"pointer", color:G.danger, fontSize:18 }}>×</button>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:12 }}>
                  {[["Courses",t.courses?.length||0],["Players",teamPlayers.length],["Tournaments",(t.tournaments||[]).length],["Coach",coach?.name||"None"]].map(([l,v])=>(
                    <div key={l} style={{ background:"var(--color-background-secondary)", borderRadius:8, padding:"8px 10px" }}>
                      <p style={{ margin:0, fontSize:10, color:"var(--color-text-secondary)" }}>{l}</p>
                      <p style={{ margin:0, fontWeight:500, fontSize:13 }}>{v}</p>
                    </div>
                  ))}
                </div>
                {coach && <p style={{ margin:0, fontSize:12, color:"var(--color-text-secondary)" }}>Coach: <span style={{ color:"var(--color-text-primary)", fontWeight:500 }}>{coach.name}</span> · {coach.email}</p>}
              </div>
            );
          })}
        </div>
      )}
      {(tab==="coaches"||tab==="players") && (
        <div>
          <h2 style={{ margin:"0 0 16px", fontSize:18, fontWeight:500 }}>{tab==="coaches"?"Coaches":"Players"} ({tab==="coaches"?coaches.length:players.length})</h2>
          <input style={{ ...S.inp, marginBottom:14 }} placeholder="Search by name or email..." value={search} onChange={e=>setSearch(e.target.value)} />
          <table style={{ width:"100%", fontSize:13, borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ borderBottom:"0.5px solid var(--color-border-tertiary)" }}>
                {["Name","Email","University","Status","Registered",""].map(h=><th key={h} style={S.th(false)}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered(tab==="coaches"?coaches:players).map(u=>{
                const team = teams.find(t=>t.id===u.teamId);
                return (
                  <tr key={u.id} style={{ borderBottom:"0.5px solid var(--color-border-tertiary)" }}>
                    <td style={{ ...S.td(), fontWeight:500 }}>{u.name}</td>
                    <td style={{ ...S.td(), color:"var(--color-text-secondary)" }}>{u.email}</td>
                    <td style={S.td()}>{team?.name||"—"}</td>
                    <td style={S.td()}><span style={S.badge(u.status==="active"?G.success:G.danger)}>{u.status}</span></td>
                    <td style={{ ...S.td(), color:"var(--color-text-secondary)" }}>{u.registeredAt||"—"}</td>
                    <td style={S.td()}><button onClick={()=>deleteDoc(doc(db,"users",u.id))} style={{ background:"none", border:"none", cursor:"pointer", color:G.danger, fontSize:16 }}>×</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Team App ──────────────────────────────────────────────────────────────────
function TeamApp({ currentUser, onLogout, onShowLive }) {
  const isCoach = currentUser.role==="coach";
  const [team, setTeam] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [tab, setTab] = useState(isCoach?"team":"live");
  const [activeTournId, setActiveTournId] = useState(null);
  const [activeRoundIdx, setActiveRoundIdx] = useState(null);
  const [liveScores, setLiveScores] = useState({});
  const [removedPlayers, setRemovedPlayers] = useState(new Set());
  const [expandedTourneys, setExpandedTourneys] = useState({});
  const [viewingRound, setViewingRound] = useState(null);
  const [showPlayerForm, setShowPlayerForm] = useState(false);
  const [newPlayer, setNewPlayer] = useState({ name:"", year:"Freshman" });
  const [showCourseSearch, setShowCourseSearch] = useState(false);
  const [showTournForm, setShowTournForm] = useState(false);
  const [tournDraft, setTournDraft] = useState({ name:"", div:"NCAA I", numRounds:2, roundCourses:["",""] });
  const [aiQuery, setAiQuery] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (!currentUser.teamId) return;
    const unsub = onSnapshot(doc(db,"teams",currentUser.teamId), snap => {
      if (snap.exists()) setTeam({id:snap.id,...snap.data()});
    });
    return unsub;
  }, [currentUser.teamId]);

  useEffect(() => {
    if (!isCoach||!currentUser.teamId) return;
    const q = query(collection(db,"users"), where("teamId","==",currentUser.teamId), where("status","==","pending"));
    const unsub = onSnapshot(q, snap=>setPendingRequests(snap.docs.map(d=>({id:d.id,...d.data()}))));
    return unsub;
  }, [currentUser.teamId, isCoach]);

  const saveTeam = async (updated) => {
    await updateDoc(doc(db,"teams",currentUser.teamId), updated);
  };

  const toParLabel = (v) => v===null||v===undefined?"—":v===0?"E":v>0?`+${v}`:`${v}`;
  const toParColor = (v) => !v&&v!==0?"var(--color-text-secondary)":v<0?G.success:v>0?G.danger:"var(--color-text-primary)";
  const toggleTourn = (id) => setExpandedTourneys(prev=>({...prev,[id]:!prev[id]}));

  const calcRoundResult = (scores, course) => {
    if (!scores||!course) return null;
    const played = scores.filter(x=>x!==null);
    if (!played.length) return null;
    const total = played.reduce((a,b)=>a+b,0);
    return { total, toPar:Math.round(total-course.par*(played.length/scores.length)), holesPlayed:played.length };
  };

  const activeTournament = (team?.tournaments||[]).find(t=>t.id===activeTournId)||null;

  const approvePlayer = async (userId) => {
    await updateDoc(doc(db,"users",userId), { status:"active" });
  };

  const createTournament = async () => {
    if (!tournDraft.name.trim()||!team) return;
    const rounds = Array.from({length:Number(tournDraft.numRounds)},(_,i)=>({
      roundNum:i+1, courseId:tournDraft.roundCourses[i]||null, scores:{}, status:"pending", date:null,
    }));
    const newT = { id:"t_"+Date.now(), name:tournDraft.name.trim(), div:tournDraft.div, date:new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}), rounds };
    await saveTeam({ tournaments:[...(team.tournaments||[]),newT] });
    setTournDraft({ name:"", div:team.division||"NCAA I", numRounds:2, roundCourses:["",""] });
    setShowTournForm(false);
  };

  const startRound = async (tournId, roundIdx) => {
    if (!team) return;
    const tourn = team.tournaments.find(t=>t.id===tournId);
    const round = tourn.rounds[roundIdx];
    const course = team.courses.find(c=>c.id===round.courseId);
    if (!course) return;
    const scores = {};
    team.players.forEach(p=>{ scores[p.id]=Array(course.holes).fill(null); });
    const updated = { tournaments:team.tournaments.map(t=>t.id===tournId?{...t,rounds:t.rounds.map((r,i)=>i===roundIdx?{...r,scores,status:"live",date:new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}:r)}:t) };
    await saveTeam(updated);
    setActiveTournId(tournId); setActiveRoundIdx(roundIdx); setLiveScores({...scores}); setRemovedPlayers(new Set()); setTab("live");
  };

  const updateScore = async (pid, hole, val) => {
    const newVal = val === "" ? null : Number(val);
    setLiveScores(prev => {
      const u = { ...prev, [pid]: [...(prev[pid] || [])] };
      u[pid][hole] = newVal;
      return u;
    });
    if (!currentUser?.teamId || activeTournId === null || activeRoundIdx === null) return;
    const tourn = team.tournaments.find(t => t.id === activeTournId);
    if (!tourn) return;
    const updatedScores = { ...(tourn.rounds[activeRoundIdx].scores || {}) };
    if (!updatedScores[pid]) updatedScores[pid] = Array(18).fill(null);
    updatedScores[pid] = [...updatedScores[pid]];
    updatedScores[pid][hole] = newVal;
    const updatedTournaments = team.tournaments.map(t => t.id !== activeTournId ? t : {
      ...t, rounds: t.rounds.map((r, i) => i !== activeRoundIdx ? r : { ...r, scores: updatedScores })
    });
    await updateDoc(doc(db, "teams", currentUser.teamId), { tournaments: updatedTournaments });
  };

  const finishRound = async () => {
    if (!team) return;
    const updated = { tournaments:team.tournaments.map(t=>t.id!==activeTournId?t:{...t,rounds:t.rounds.map((r,i)=>i===activeRoundIdx?{...r,scores:liveScores,status:"completed"}:r)}) };
    await saveTeam(updated);
    setActiveTournId(null); setActiveRoundIdx(null); setLiveScores({}); setRemovedPlayers(new Set()); setTab("rounds");
  };

  const askAI = async () => {
    if (!aiQuery.trim()||!team) return;
    setAiLoading(true); setAiResponse("");
    const stats = (team.tournaments||[]).map(t=>`${t.name}: ${t.rounds.filter(r=>r.status==="completed").map(r=>{ const c=team.courses?.find(x=>x.id===r.courseId); return `R${r.roundNum}: ${(team.players||[]).map(p=>{ const res=calcRoundResult(r.scores[p.id],c); return res?`${p.name} ${toParLabel(res.toPar)}`:null; }).filter(Boolean).join(", ")}`; }).join(" | ")}`).join("\n");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:1000, system:`Expert golf coach assistant for ${team.name} (${team.division}). Roster: ${(team.players||[]).map(p=>`${p.name} (${p.year})`).join(", ")}. Data:\n${stats||"None yet."}`, messages:[{role:"user",content:aiQuery}] })
      });
      const data = await res.json();
      setAiResponse(data.content?.map(b=>b.text||"").join("")||"No response.");
    } catch { setAiResponse("Error connecting to AI."); }
    setAiLoading(false);
  };

  if (!team) return <div style={{ ...S.wrap, paddingTop:"3rem", textAlign:"center" }}><p style={{ color:"var(--color-text-secondary)" }}>Loading team data...</p></div>;

  const coachTabs = [
    {id:"team",label:"Team"},{id:"courses",label:"Courses"},{id:"rounds",label:"Tournaments"},
    {id:"live",label:activeTournId?"● Live":"Live",live:!!activeTournId},
    {id:"rankings",label:"Rankings"},{id:"ai",label:"AI Coach"},
  ];
  const playerTabs = [
    {id:"live",label:"Live scores"},{id:"rankings",label:"Rankings"},{id:"profile",label:"My profile"},
  ];
  const tabs = isCoach ? coachTabs : playerTabs;

  const renderScorecard = (round, course, scores, readOnly) => {
    const pls = readOnly ? (team.players||[]) : (team.players||[]).filter(p=>!removedPlayers.has(p.id));
    return pls.map(p => {
      const sc = scores[p.id]||Array(course.holes).fill(null);
      const res = calcRoundResult(sc,course);
      return (
        <div key={p.id} style={S.card}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <p style={{ margin:0, fontWeight:500 }}>{p.name}</p>
            <div style={{ display:"flex", gap:10, alignItems:"center" }}>
              <span style={{ fontSize:13, color:"var(--color-text-secondary)" }}>{res?.total??"—"}</span>
              <span style={{ fontWeight:500, color:toParColor(res?.toPar) }}>{toParLabel(res?.toPar)}</span>
              {!readOnly && <button onClick={()=>setRemovedPlayers(prev=>new Set([...prev,p.id]))} style={{ background:"none", border:"none", cursor:"pointer", color:G.danger, fontSize:18, lineHeight:1 }}>×</button>}
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(9, 1fr)", gap:4 }}>
            {Array.from({length:course.holes}).map((_,i)=>{
              const hp=course.holePars?.[i]; const val=sc[i]; const diff=val!==null&&val!==undefined&&hp?val-hp:null;
              const color=diff===null?"var(--color-text-primary)":diff<0?G.success:diff>0?G.danger:"var(--color-text-primary)";
              return (
                <div key={i} style={{ textAlign:"center" }}>
                  <p style={{ margin:"0 0 1px", fontSize:10, color:"var(--color-text-secondary)" }}>H{i+1}</p>
                  {hp && <p style={{ margin:"0 0 2px", fontSize:10, fontWeight:500, color:G.gold }}>P{hp}</p>}
                  {readOnly
                    ? <div style={{ padding:"5px 2px", borderRadius:9, background:"var(--color-background-secondary)", border:"0.5px solid var(--color-border-tertiary)", fontSize:13, fontWeight:diff!==null?500:400, color, minHeight:30, display:"flex", alignItems:"center", justifyContent:"center" }}>{val??"—"}</div>
                    : <input type="number" min="1" max="15" value={sc[i]??""} onChange={e=>updateScore(p.id,i,e.target.value)} style={{ ...S.inp, padding:"5px 2px", textAlign:"center", fontSize:13, color, fontWeight:diff!==null?500:400 }} />
                  }
                </div>
              );
            })}
          </div>
        </div>
      );
    });
  };

  return (
    <div style={S.wrap}>
      <div style={{ background:G.dark, borderRadius:14, padding:"1rem 1.5rem", marginBottom:20, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <h1 style={{ margin:0, fontSize:20, fontWeight:500, color:G.gold }}>Golf Stats Pro</h1>
          <p style={{ margin:"3px 0 0", fontSize:12, color:G.goldLight, opacity:0.8 }}>{team.name} · {team.division}</p>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <button style={{ ...S.btnSmall, color:G.white, borderColor:"rgba(255,255,255,0.3)", background:"rgba(255,255,255,0.1)" }} onClick={onShowLive}>🔴 Live</button>
          <div style={{ textAlign:"right" }}>
            <p style={{ margin:0, fontSize:13, color:G.goldLight }}>{currentUser.name}</p>
            <span style={{ ...S.badge(isCoach?G.gold:G.mid), fontSize:10 }}>{currentUser.role}</span>
          </div>
          <button style={{ ...S.btnSmall, color:G.white, borderColor:"rgba(255,255,255,0.3)", background:"rgba(255,255,255,0.1)" }} onClick={onLogout}>Sign out</button>
        </div>
      </div>

      {isCoach && pendingRequests.length>0 && (
        <div style={{ ...S.card, background:`${G.gold}15`, border:`1px solid ${G.gold}44`, marginBottom:16 }}>
          <p style={{ margin:"0 0 10px", fontWeight:500, fontSize:14 }}>⏳ Pending join requests ({pendingRequests.length})</p>
          {pendingRequests.map(r=>(
            <div key={r.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
              <span style={{ fontSize:14 }}>{r.name} <span style={{ color:"var(--color-text-secondary)", fontSize:12 }}>({r.email})</span></span>
              <button style={{ ...S.btnPrimary, padding:"5px 12px", fontSize:12 }} onClick={()=>approvePlayer(r.id)}>Approve</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display:"flex", gap:6, marginBottom:20, flexWrap:"wrap" }}>
        {tabs.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={S.navBtn(tab===t.id,t.live)}>{t.label}</button>)}
      </div>

      {tab==="team" && isCoach && (
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <h2 style={{ margin:0, fontSize:18, fontWeight:500 }}>Roster — {(team.players||[]).length} players</h2>
            <button style={S.btnPrimary} onClick={()=>setShowPlayerForm(!showPlayerForm)}>+ Add player</button>
          </div>
          {showPlayerForm && (
            <div style={S.goldCard}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
                <input style={S.inp} placeholder="Full name" value={newPlayer.name} onChange={e=>setNewPlayer({...newPlayer,name:e.target.value})} />
                <select style={S.inp} value={newPlayer.year} onChange={e=>setNewPlayer({...newPlayer,year:e.target.value})}>
                  {YEARS.map(y=><option key={y}>{y}</option>)}
                </select>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button style={S.btnPrimary} onClick={async()=>{ if(!newPlayer.name)return; await saveTeam({players:[...(team.players||[]),{...newPlayer,id:"p_"+Date.now()}]}); setNewPlayer({name:"",year:"Freshman"}); setShowPlayerForm(false); }}>Save</button>
                <button style={S.btnSmall} onClick={()=>setShowPlayerForm(false)}>Cancel</button>
              </div>
            </div>
          )}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            {(team.players||[]).map(p=>(
              <div key={p.id} style={{ ...S.card, display:"flex", alignItems:"center", gap:12, marginBottom:0 }}>
                <div style={{ width:40, height:40, borderRadius:"50%", background:G.dark, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:500, color:G.gold, flexShrink:0 }}>
                  {p.name.split(" ").map(n=>n[0]).join("")}
                </div>
                <div style={{ flex:1 }}>
                  <p style={{ margin:0, fontWeight:500, fontSize:14 }}>{p.name}</p>
                  <span style={S.badge(G.mid)}>{p.year}</span>
                </div>
                <button onClick={()=>saveTeam({players:(team.players||[]).filter(x=>x.id!==p.id)})} style={{ background:"none", border:"none", cursor:"pointer", color:G.danger, fontSize:18 }}>×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab==="courses" && isCoach && (
        showCourseSearch
          ? <CourseSearch onSave={async c=>{ await saveTeam({courses:[...(team.courses||[]),c]}); setShowCourseSearch(false); }} onCancel={()=>setShowCourseSearch(false)} />
          : <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                <h2 style={{ margin:0, fontSize:18, fontWeight:500 }}>Courses</h2>
                <button style={S.btnPrimary} onClick={()=>setShowCourseSearch(true)}>+ Add course</button>
              </div>
              {(team.courses||[]).length===0 && <p style={{ color:"var(--color-text-secondary)", fontSize:14 }}>No courses yet.</p>}
              {(team.courses||[]).map(c=>(
                <div key={c.id} style={S.card}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                    <p style={{ margin:0, fontWeight:500, fontSize:15 }}>{c.name}</p>
                    <button onClick={()=>saveTeam({courses:(team.courses||[]).filter(x=>x.id!==c.id)})} style={{ background:"none", border:"none", cursor:"pointer", color:G.danger, fontSize:18 }}>×</button>
                  </div>
                  <div style={{ display:"flex", gap:12 }}>
                    {[["Par",c.par],["Slope",c.slope],["Rating",c.rating],["Holes",c.holes]].map(([l,v])=>(
                      <div key={l} style={{ textAlign:"center", background:"var(--color-background-secondary)", borderRadius:8, padding:"8px 14px" }}>
                        <p style={{ margin:0, fontSize:11, color:"var(--color-text-secondary)" }}>{l}</p>
                        <p style={{ margin:0, fontWeight:500, fontSize:16 }}>{v}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
      )}

      {tab==="rounds" && isCoach && (
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <h2 style={{ margin:0, fontSize:18, fontWeight:500 }}>Tournaments</h2>
            <button style={S.btnGold} onClick={()=>setShowTournForm(!showTournForm)}>+ New tournament</button>
          </div>
          {showTournForm && (
            <div style={S.goldCard}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
                <input style={S.inp} placeholder="Tournament name" value={tournDraft.name} onChange={e=>setTournDraft({...tournDraft,name:e.target.value})} />
                <select style={S.inp} value={tournDraft.div} onChange={e=>setTournDraft({...tournDraft,div:e.target.value})}>
                  {DIVS.map(d=><option key={d}>{d}</option>)}
                </select>
              </div>
              <p style={{ margin:"0 0 8px", fontSize:13, color:"var(--color-text-secondary)" }}>Number of rounds</p>
              <div style={{ display:"flex", gap:6, marginBottom:14 }}>
                {[1,2,3,4].map(n=>(
                  <button key={n} type="button"
                    onClick={()=>{ const rc=Array.from({length:n},(_,i)=>tournDraft.roundCourses[i]||""); setTournDraft({...tournDraft,numRounds:n,roundCourses:rc}); }}
                    style={{ width:40, height:40, borderRadius:8, border:"none", cursor:"pointer", fontSize:15, fontWeight:500, background:tournDraft.numRounds===n?G.green:"var(--color-background-secondary)", color:tournDraft.numRounds===n?G.white:"var(--color-text-primary)" }}>
                    {n}
                  </button>
                ))}
              </div>
              <p style={{ margin:"0 0 8px", fontSize:13, color:"var(--color-text-secondary)" }}>Course per round</p>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
                {Array.from({length:tournDraft.numRounds}).map((_,i)=>(
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:13, fontWeight:500, color:G.gold, minWidth:24 }}>R{i+1}</span>
                    <select style={{ ...S.inp, flex:1 }} value={tournDraft.roundCourses[i]||""} onChange={e=>{ const rc=[...tournDraft.roundCourses]; rc[i]=e.target.value; setTournDraft({...tournDraft,roundCourses:rc}); }}>
                      <option value="">Select course...</option>
                      {(team.courses||[]).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button style={S.btnGold} onClick={createTournament}>Create tournament</button>
                <button style={S.btnSmall} onClick={()=>setShowTournForm(false)}>Cancel</button>
              </div>
            </div>
          )}
          {(team.tournaments||[]).length===0 && <p style={{ color:"var(--color-text-secondary)", fontSize:14 }}>No tournaments yet.</p>}
          {(team.tournaments||[]).map(t=>(
            <div key={t.id} style={S.card}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                <div>
                  <p style={{ margin:0, fontWeight:500, fontSize:15 }}>{t.name}</p>
                  <p style={{ margin:"2px 0 0", fontSize:12, color:"var(--color-text-secondary)" }}>{t.div} · {t.date}</p>
                </div>
                <button onClick={()=>saveTeam({tournaments:(team.tournaments||[]).filter(x=>x.id!==t.id)})} style={{ background:"none", border:"none", cursor:"pointer", color:G.danger, fontSize:18 }}>×</button>
              </div>
              {t.rounds.map((r,i)=>{
                const course=(team.courses||[]).find(c=>c.id===r.courseId);
                return (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 14px", borderRadius:9, background:"var(--color-background-secondary)", marginBottom:6 }}>
                    <div>
                      <span style={{ fontWeight:500, fontSize:13 }}>R{r.roundNum}</span>
                      <span style={{ fontSize:13, color:course?"var(--color-text-secondary)":G.danger, marginLeft:8 }}>{course?course.name:"No course assigned"}</span>
                      {r.date && <span style={{ fontSize:12, color:"var(--color-text-secondary)", marginLeft:8 }}>· {r.date}</span>}
                    </div>
                    <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                      <span style={S.badge(r.status==="completed"?G.success:r.status==="live"?G.danger:G.muted)}>{r.status==="completed"?"Done":r.status==="live"?"Live":"Pending"}</span>
                      {r.status==="pending"&&course && <button style={S.btnPrimary} onClick={()=>startRound(t.id,i)}>Start</button>}
                      {r.status==="live" && <button style={S.btnDanger} onClick={()=>{ setActiveTournId(t.id); setActiveRoundIdx(i); setLiveScores(r.scores); setTab("live"); }}>Continue</button>}
                      {r.status==="completed" && <button style={S.btnSmall} onClick={()=>{ setViewingRound({tournId:t.id,roundIdx:i}); setTab("live"); }}>View scores</button>}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {tab==="live" && (
        <div>
          <h2 style={{ margin:"0 0 14px", fontSize:18, fontWeight:500 }}>{viewingRound?"Round scorecard":activeTournId?"Live scorecard":"Live scores"}</h2>
          {viewingRound ? (()=>{
            const tourn=(team.tournaments||[]).find(t=>t.id===viewingRound.tournId);
            const round=tourn?.rounds[viewingRound.roundIdx];
            const course=(team.courses||[]).find(c=>c.id===round?.courseId);
            if (!tourn||!round||!course) return <p style={{ color:G.danger }}>Round not found.</p>;
            const lb=(team.players||[]).map(p=>({player:p,...calcRoundResult(round.scores?.[p.id],course)})).sort((a,b)=>(a.toPar??999)-(b.toPar??999));
            return (
              <>
                <div style={{ ...S.card, background:G.dark, border:"none", marginBottom:16 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div>
                      <p style={{ margin:0, fontWeight:500, color:G.gold }}>{tourn.name} · R{round.roundNum}</p>
                      <p style={{ margin:"4px 0 0", fontSize:13, color:G.goldLight, opacity:0.8 }}>{course.name} · Par {course.par} · {round.date}</p>
                    </div>
                    <span style={S.badge(G.success)}>Completed</span>
                  </div>
                </div>
                <h3 style={{ fontSize:15, fontWeight:500, margin:"0 0 10px" }}>Leaderboard</h3>
                {lb.map((e,i)=>(
                  <div key={e.player.id} style={{ ...S.card, display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 16px", marginBottom:6, borderLeft:i===0?`3px solid ${G.gold}`:"0.5px solid var(--color-border-tertiary)" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <span style={{ fontSize:13, fontWeight:500, color:i===0?G.gold:"var(--color-text-secondary)", minWidth:22 }}>#{i+1}</span>
                      <span style={{ fontWeight:500 }}>{e.player.name}</span>
                      <span style={S.badge(G.muted)}>{e.holesPlayed??0}/{course.holes}</span>
                    </div>
                    <div style={{ display:"flex", gap:16 }}>
                      <span>{e.total??"—"}</span>
                      <span style={{ fontSize:16, fontWeight:500, color:toParColor(e.toPar), minWidth:32, textAlign:"right" }}>{toParLabel(e.toPar)}</span>
                    </div>
                  </div>
                ))}
                <h3 style={{ fontSize:15, fontWeight:500, margin:"20px 0 10px" }}>Scorecards</h3>
                {renderScorecard(round,course,round.scores||{},true)}
                <button style={S.btnSmall} onClick={()=>{ setViewingRound(null); setTab("rounds"); }}>← Back to tournaments</button>
              </>
            );
          })() : activeTournament&&activeRoundIdx!==null ? (()=>{
            const round=activeTournament.rounds[activeRoundIdx];
            const course=(team.courses||[]).find(c=>c.id===round.courseId);
            if (!course) return <p style={{ color:G.danger }}>No course assigned.</p>;
            const activePls=(team.players||[]).filter(p=>!removedPlayers.has(p.id));
            const lb=activePls.map(p=>({player:p,...calcRoundResult(liveScores[p.id],course)})).sort((a,b)=>(a.toPar??999)-(b.toPar??999));
            return (
              <>
                <div style={{ ...S.card, background:G.dark, border:"none", marginBottom:16 }}>
                  <p style={{ margin:0, fontWeight:500, color:G.gold }}>{activeTournament.name} · R{round.roundNum}</p>
                  <p style={{ margin:"4px 0 0", fontSize:13, color:G.goldLight, opacity:0.8 }}>{course.name} · Par {course.par}</p>
                </div>
                <h3 style={{ fontSize:15, fontWeight:500, margin:"0 0 10px" }}>Leaderboard</h3>
                {lb.map((e,i)=>(
                  <div key={e.player.id} style={{ ...S.card, display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 16px", marginBottom:6, borderLeft:i===0?`3px solid ${G.gold}`:"0.5px solid var(--color-border-tertiary)" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <span style={{ fontSize:13, fontWeight:500, color:i===0?G.gold:"var(--color-text-secondary)", minWidth:22 }}>#{i+1}</span>
                      <span style={{ fontWeight:500 }}>{e.player.name}</span>
                      <span style={S.badge(G.muted)}>{e.holesPlayed??0}/{course.holes}</span>
                    </div>
                    <div style={{ display:"flex", gap:16 }}>
                      <span>{e.total??"—"}</span>
                      <span style={{ fontSize:16, fontWeight:500, color:toParColor(e.toPar), minWidth:32, textAlign:"right" }}>{toParLabel(e.toPar)}</span>
                    </div>
                  </div>
                ))}
                {(isCoach || currentUser.role === "player") && (
                  <>
                    <h3 style={{ fontSize:15, fontWeight:500, margin:"20px 0 8px" }}>Enter scores</h3>
                    {removedPlayers.size>0 && (
                      <div style={{ marginBottom:12, padding:"8px 14px", background:`${G.danger}15`, borderRadius:8, border:`1px solid ${G.danger}44`, fontSize:13, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <span><span style={{ color:G.danger, fontWeight:500 }}>Withdrawn: </span>{(team.players||[]).filter(p=>removedPlayers.has(p.id)).map(p=>p.name).join(", ")}</span>
                        <button style={S.btnSmall} onClick={()=>setRemovedPlayers(new Set())}>Restore all</button>
                      </div>
                    )}
                    {renderScorecard(round,course,liveScores,false)}
                    <button style={S.btnDanger} onClick={finishRound}>Finish round & save</button>
                  </>
                )}
              </>
            );
          })() : (
            <div>
              {(team.tournaments||[]).filter(t=>t.rounds.some(r=>r.status==="live")).length===0
                ? <p style={{ color:"var(--color-text-secondary)", fontSize:14 }}>{isCoach?"No active round. Start one from Tournaments.":"No active round right now."}</p>
                : (team.tournaments||[]).filter(t=>t.rounds.some(r=>r.status==="live")).map(t=>{
                    const lr=t.rounds.find(r=>r.status==="live");
                    const course=(team.courses||[]).find(c=>c.id===lr?.courseId);
                    if (!course) return null;
                    const lb=(team.players||[]).map(p=>({player:p,...calcRoundResult(lr.scores?.[p.id],course)})).sort((a,b)=>(a.toPar??999)-(b.toPar??999));
                    return (
                      <div key={t.id} style={S.card}>
                        <div style={{ ...S.card, background:G.dark, border:"none", marginBottom:14, padding:"12px 16px" }}>
                          <p style={{ margin:0, fontWeight:500, color:G.gold }}>{t.name} · R{lr.roundNum}</p>
                          <p style={{ margin:"3px 0 0", fontSize:12, color:G.goldLight, opacity:0.8 }}>{course.name} · Par {course.par}</p>
                        </div>
                        {lb.map((e,i)=>(
                          <div key={e.player.id} style={{ ...S.card, display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 16px", marginBottom:6, borderLeft:i===0?`3px solid ${G.gold}`:"0.5px solid var(--color-border-tertiary)" }}>
                            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                              <span style={{ fontSize:13, fontWeight:500, color:i===0?G.gold:"var(--color-text-secondary)", minWidth:22 }}>#{i+1}</span>
                              <span style={{ fontWeight:500 }}>{e.player.name}</span>
                              <span style={S.badge(G.muted)}>{e.holesPlayed??0}/{course.holes}</span>
                            </div>
                            <div style={{ display:"flex", gap:16 }}>
                              <span>{e.total??"—"}</span>
                              <span style={{ fontWeight:500, color:toParColor(e.toPar) }}>{toParLabel(e.toPar)}</span>
                            </div>
                          </div>
                        ))}
                        <button style={{ ...S.btnDanger, marginTop:8 }} onClick={()=>{ setActiveTournId(t.id); setActiveRoundIdx(t.rounds.findIndex(r=>r.status==="live")); setLiveScores(lr.scores||{}); }}>Enter scores</button>
                      </div>
                    );
                  })
              }
            </div>
          )}
        </div>
      )}

      {tab==="rankings" && (
        <div>
          <h2 style={{ margin:"0 0 14px", fontSize:18, fontWeight:500 }}>Rankings</h2>
          {(team.tournaments||[]).length===0 && <p style={{ color:"var(--color-text-secondary)", fontSize:14 }}>No tournaments yet.</p>}
          {(team.tournaments||[]).map(t=>{
            const completed=t.rounds.filter(r=>r.status==="completed");
            if (!completed.length) return null;
            const isOpen=!!expandedTourneys[t.id];
            const rows=(team.players||[]).map(p=>{
              const results=t.rounds.map(r=>r.status==="completed"?calcRoundResult(r.scores[p.id],(team.courses||[]).find(c=>c.id===r.courseId)):null);
              const done=results.filter(Boolean);
              const grand=done.length?done.reduce((s,r)=>s+r.toPar,0):null;
              return {player:p,results,grand};
            }).sort((a,b)=>(a.grand??999)-(b.grand??999));
            const leader=rows[0];
            return (
              <div key={t.id} style={S.card}>
                <div onClick={()=>toggleTourn(t.id)} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer", userSelect:"none" }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                      <p style={{ margin:0, fontWeight:500, fontSize:15 }}>{t.name}</p>
                      <span style={S.badge(G.gold)}>{t.div}</span>
                      <span style={S.badge(completed.length===t.rounds.length?G.success:G.muted)}>{completed.length}/{t.rounds.length} rounds</span>
                    </div>
                    {!isOpen&&leader && <p style={{ margin:"4px 0 0", fontSize:12, color:"var(--color-text-secondary)" }}>Leader: <span style={{ fontWeight:500 }}>{leader.player.name}</span> <span style={{ color:toParColor(leader.grand), fontWeight:500 }}>{toParLabel(leader.grand)}</span> · {t.date}</p>}
                  </div>
                  <span style={{ fontSize:16, color:"var(--color-text-secondary)", marginLeft:12 }}>{isOpen?"▲":"▼"}</span>
                </div>
                {isOpen && (
                  <div style={{ marginTop:14 }}>
                    <table style={{ width:"100%", fontSize:13, borderCollapse:"collapse" }}>
                      <thead>
                        <tr style={{ borderBottom:"0.5px solid var(--color-border-tertiary)" }}>
                          <th style={S.th()}>#</th><th style={S.th()}>Player</th>
                          {t.rounds.map((r,i)=>(
                            <th key={i} style={S.th(true)}>R{r.roundNum}<div style={{ fontSize:10, fontWeight:400, color:"var(--color-text-secondary)" }}>{((team.courses||[]).find(c=>c.id===r.courseId)?.name||"—").substring(0,12)}</div></th>
                          ))}
                          {t.rounds.length>1 && <th style={{ ...S.th(true), color:G.gold }}>Total</th>}
                          {isCoach && <th style={S.th(true)}>Select</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map(({player,results,grand},i)=>(
                          <tr key={player.id} style={{ borderBottom:"0.5px solid var(--color-border-tertiary)", background:i===0?`${G.gold}11`:"transparent" }}>
                            <td style={{ ...S.td(), color:i===0?G.gold:"inherit", fontWeight:i<3?500:400 }}>{i+1}</td>
                            <td style={{ ...S.td(), fontWeight:500 }}>{player.name}</td>
                            {results.map((res,ri)=>(
                              <td key={ri} style={{ ...S.td(), textAlign:"center" }}>
                                {res?<span style={{ fontWeight:500, color:toParColor(res.toPar) }}>{toParLabel(res.toPar)}</span>:<span style={{ color:"var(--color-text-secondary)" }}>—</span>}
                              </td>
                            ))}
                            {t.rounds.length>1 && <td style={{ ...S.td(), textAlign:"center", fontWeight:700, color:toParColor(grand) }}>{toParLabel(grand)}</td>}
                            {isCoach && <td style={{ ...S.td(), textAlign:"center" }}><input type="checkbox" checked={!!player.selected} onChange={ev=>saveTeam({players:(team.players||[]).map(p=>p.id===player.id?{...p,selected:ev.target.checked}:p)})} /></td>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {isCoach && (
                      <div style={{ marginTop:12, padding:"10px 14px", background:`${G.gold}15`, borderRadius:8, border:`1px solid ${G.gold}44`, fontSize:13 }}>
                        <span style={{ fontWeight:500 }}>Travel team for {t.div}: </span>
                        <span style={{ color:"var(--color-text-secondary)" }}>{(team.players||[]).filter(p=>p.selected).map(p=>p.name).join(", ")||"None selected yet"}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab==="profile" && !isCoach && (
        <div>
          <h2 style={{ margin:"0 0 14px", fontSize:18, fontWeight:500 }}>My profile</h2>
          <div style={S.goldCard}>
            <div style={{ display:"flex", alignItems:"center", gap:16 }}>
              <div style={{ width:56, height:56, borderRadius:"50%", background:G.dark, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, fontWeight:500, color:G.gold }}>
                {currentUser.name.split(" ").map(n=>n[0]).join("")}
              </div>
              <div>
                <p style={{ margin:0, fontWeight:500, fontSize:16 }}>{currentUser.name}</p>
                <p style={{ margin:"2px 0 0", fontSize:13, color:"var(--color-text-secondary)" }}>{team.name} · {team.division}</p>
              </div>
            </div>
          </div>
          {(team.tournaments||[]).map(t=>{
            const completed=t.rounds.filter(r=>r.status==="completed");
            if (!completed.length) return null;
            return (
              <div key={t.id} style={S.card}>
                <p style={{ margin:"0 0 10px", fontWeight:500 }}>{t.name}</p>
                {completed.map((r,i)=>{
                  const course=(team.courses||[]).find(c=>c.id===r.courseId);
                  const res=calcRoundResult(r.scores[currentUser.playerId],course);
                  return (
                    <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"8px 12px", background:"var(--color-background-secondary)", borderRadius:8, marginBottom:6 }}>
                      <span style={{ fontSize:13 }}>R{r.roundNum} · {course?.name}</span>
                      <span style={{ fontWeight:500, color:toParColor(res?.toPar) }}>{res?toParLabel(res.toPar):"—"}</span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {tab==="ai" && isCoach && (
        <div>
          <div style={{ ...S.card, background:G.dark, border:"none", marginBottom:16 }}>
            <p style={{ margin:"0 0 4px", fontWeight:500, fontSize:15, color:G.gold }}>AI Coach assistant</p>
            <p style={{ margin:0, fontSize:13, color:G.goldLight, opacity:0.8 }}>Powered by Claude · {team.name}</p>
          </div>
          <div style={{ display:"flex", gap:8, marginBottom:12 }}>
            <input style={{ ...S.inp, flex:1 }} placeholder="Ask about your team, lineup, strategy..." value={aiQuery} onChange={e=>setAiQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&askAI()} />
            <button style={S.btnGold} onClick={askAI} disabled={aiLoading}>{aiLoading?"...":"Ask"}</button>
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:16 }}>
            {["Who are my top performers?","Analyze team weaknesses","Recommend travel team"].map(q=>(
              <button key={q} style={S.btnOutline} onClick={()=>setAiQuery(q)}>{q}</button>
            ))}
          </div>
          {aiLoading && <div style={{ ...S.card, textAlign:"center", padding:"2rem" }}><p style={{ margin:0, color:"var(--color-text-secondary)" }}>Analyzing...</p></div>}
          {aiResponse && <div style={{ ...S.card, borderLeft:`3px solid ${G.green}`, whiteSpace:"pre-wrap", fontSize:14, lineHeight:1.8 }}>{aiResponse}</div>}
        </div>
      )}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLive, setShowLive] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db,"users",firebaseUser.uid));
        if (userDoc.exists()) setCurrentUser({ uid:firebaseUser.uid, ...userDoc.data() });
        else setCurrentUser(null);
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleLogin = (user) => setCurrentUser(user);
  const handleLogout = async () => { await signOut(auth); setCurrentUser(null); setShowLive(false); };
  const handleRegister = (user) => setCurrentUser(user);

  if (loading) return (
    <div style={{ ...S.wrap, paddingTop:"3rem", textAlign:"center" }}>
      <div style={{ background:G.dark, borderRadius:14, padding:"1.5rem", marginBottom:24, maxWidth:420, margin:"0 auto" }}>
        <h1 style={{ margin:0, fontSize:26, fontWeight:500, color:G.gold }}>Golf Stats Pro</h1>
      </div>
      <p style={{ color:"var(--color-text-secondary)" }}>Loading...</p>
    </div>
  );

  if (showLive) return <LivePublic onBack={()=>setShowLive(false)} />;
  if (!currentUser) return <AuthScreen onLogin={handleLogin} onRegister={handleRegister} />;
  if (currentUser.status==="pending") return <PendingScreen user={currentUser} onLogout={handleLogout} />;
  if (currentUser.role==="admin") return <AdminPanel currentUser={currentUser} onLogout={handleLogout} />;

  return <TeamApp currentUser={currentUser} onLogout={handleLogout} onShowLive={()=>setShowLive(true)} />;
}
