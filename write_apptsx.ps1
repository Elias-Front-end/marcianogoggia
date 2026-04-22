$content = @'
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { MapPin, Users, BarChart3, Settings, Home } from "lucide-react";

const BAIRROS = [
  "ADHEMAR DE BARROS","AFONSO PENA","AIRES","ALTO DIVINEIA","ANGELINA CUNHA","BOM RETIRO","CABO CHICO",
  "CACHOEIRA","CANTARELLO","CENTRO","CERRO DA LAGOA","CHACARA VIRGEM","CIDADE MORADA","CRUZEIRO",
  "DEL CASTILHO","DOM VITAL","FIGUEIRA","FLOR DE LIS","GILBERTO KUHL","GRACIOSA","INVEMAR",
  "IPORANGA","JARDIM AMELIA","JARDIM AQUARIUS","JARDIM BRASIL","JARDIM CANDELÁRIO","JARDIM DAS OLIVEIRAS",
  "JARDIM ESCOLA","JARDIM IPÊ","JARDIM KREAL","JARDIM LOSANGO","JARDIM MARICÁ","JARDIM METROPOLITANO",
  "JARDIM OLARIA","JARDIM PALMAR","JARDIM PIEDADE","JARDIM PROGRESSO","JARDIM ROMA","JARDIM SIPÁ",
  "JOSÉ GOMES","LAGOINHA","LARGO DO ZANINHO","LINHA VELHA","MEIRIZ","MORADIA","NOSSA SENHORA DE FÁTIMA",
  "NOVA Milano","PASSO DA IGREJA","PICADOURO","PORTÃO","POVO TERRENOVA","QUARITA","RIBEIRÃO CLARO",
  "RIVIERA","SAMPAIO","SANHAROL","SÃO BENEDITTO","SÃO CRISTÓVÃO","SÃO LUIZ","VALE DOS PINHEIRAS","VILA GURIATU",
  "VILA SANTA THEREZA","VINTE E TRÊS DE MAIO","XANBUARÁ"
];

const SERVER_URL = "http://localhost:3000";

export default function App() {
  const [activeTab, setActiveTab] = useState("INICIO");
  const [totalApoiadores, setTotalApoiadores] = useState(0);
  const [formData, setFormData] = useState({
    nome: "", telefone: "", email: "", rua: "", numero: "", complemento: "", bairro: "", cidade: "São José dos Pinhais"
  });
  const [coords, setCoords] = useState(null);
  const [preciso, setPreciso] = useState(false);
  const [status, setStatus] = useState("idle");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch(`${SERVER_URL}/api/stats`)
      .then(r => r.ok ? r.json() : { total: 0 })
      .then(d => setTotalApoiadores(d.total || 0))
      .catch(() => setTotalApoiadores(0));
  }, []);

  async function handleGeocode() {
    if (!formData.rua || !formData.bairro) return;
    setStatus("loading");
    setMsg("Geocodificando...");
    setCoords(null);
    setPreciso(false);
    try {
      const res = await fetch(`${SERVER_URL}/api/geocodificar-com-cache`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rua: formData.rua, numero: formData.numero, bairro: formData.bairro, cidade: formData.cidade })
      });
      const data = await res.json();
      if (data.lat && data.lon) {
        setCoords([data.lat, data.lon]);
        setPreciso(data.preciso !== false);
        setStatus("idle");
        setMsg(data.preciso ? "Coordenadas encontradas com precisão." : "Coordenadas aproximadas (endereço não encontrado com precisão).");
      } else {
        setStatus("error");
        setMsg("Endereço não encontrado. Tente ajustar o endereço.");
      }
    } catch {
      setStatus("error");
      setMsg("Erro ao geocodificar. Verifique a conexão com o servidor.");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formData.nome || !formData.telefone || !formData.bairro) {
      setStatus("error");
      setMsg("Preencha os campos obrigatórios: Nome, Telefone e Bairro.");
      return;
    }
    setStatus("loading");
    setMsg("Salvando...");
    try {
      let payload = { ...formData };
      if (coords) {
        payload.lat = coords[0];
        payload.lon = coords[1];
        payload.preciso = preciso;
      }
      const res = await fetch(`${SERVER_URL}/api/apoiadores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("success");
        setMsg("Apoiador cadastrado com sucesso!");
        setTotalApoiadores(n => n + 1);
        setFormData({ nome: "", telefone: "", email: "", rua: "", numero: "", complemento: "", bairro: "", cidade: "São José dos Pinhais" });
        setCoords(null);
        setTimeout(() => { setStatus("idle"); setMsg(""); }, 4000);
      } else {
        setStatus("error");
        setMsg(data.erro || "Erro ao salvar.");
      }
    } catch {
      setStatus("error");
      setMsg("Erro de conexão com o servidor.");
    }
  }

  const navItems = [
    { name: "INICIO", icon: Home },
    { name: "CADASTRAR", icon: Users },
    { name: "MAPA", icon: MapPin },
    { name: "DASHBOARD", icon: BarChart3 },
    { name: "APOIADORES", icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-bg relative overflow-hidden flex flex-col">
      <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
        <div className="absolute inset-0 bg-radial-gradient from-accent/10 to-transparent" />
        <img src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2672&auto=format&fit=crop" alt="" className="w-full h-full object-cover mix-blend-screen opacity-30 select-none" referrerPolicy="no-referrer" />
      </div>

      <header className="relative z-10 px-6 md:px-12 py-4 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-2 group cursor-pointer">
          <div className="w-7 h-7 bg-accent rounded-sm flex items-center justify-center">
            <MapPin className="w-4 h-4 text-bg" />
          </div>
          <span className="text-lg font-display font-bold text-accent tracking-tighter">Marciano Goggia</span>
        </div>
        <div className="text-right">
          <div className="text-xl font-display font-bold text-accent">{totalApoiadores}</div>
          <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Apoiadores</div>
        </div>
      </header>

      <nav className="relative z-10 px-6 md:px-12 py-3 flex items-center gap-2 border-b border-white/5 bg-bg/80 backdrop-blur-sm overflow-x-auto">
        {navItems.map(item => (
          <button key={item.name} onClick={() => setActiveTab(item.name)} className={`nav-link whitespace-nowrap ${activeTab === item.name ? "nav-link-active" : ""}`}>
            <item.icon className="w-3 h-3" />
            {item.name}
          </button>
        ))}
      </nav>

      <main className="relative z-10 flex-grow overflow-auto">
        {activeTab === "INICIO" && (
          <div className="flex flex-col items-center justify-center min-h-full text-center px-4 py-12">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="max-w-3xl">
              <span className="text-accent text-[10px] md:text-sm font-display font-medium tracking-[0.5em] uppercase mb-4 block">CAMPANHA 2024</span>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold uppercase mb-8 leading-tight">Marciano Goggia</h1>
              <p className="text-white/60 text-sm md:text-lg max-w-2xl mx-auto mb-12 font-light leading-relaxed">Plataforma de gestão e mapeamento de apoiadores da campanha para Prefeitura de São José dos Pinhais.</p>
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <button onClick={() => setActiveTab("CADASTRAR")} className="btn-primary">Cadastrar Apoiador</button>
                <button onClick={() => setActiveTab("MAPA")} className="btn-secondary">Ver Mapa</button>
              </div>
            </motion.div>
          </div>
        )}

        {activeTab === "CADASTRAR" && (
          <div className="flex flex-col items-center py-12 px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="w-full max-w-2xl">
              <div className="text-center mb-8">
                <h2 className="text-2xl md:text-3xl font-display font-bold uppercase mb-2">Cadastro de Apoiador</h2>
                <p className="text-white/40 text-sm">Sistema de geocodificação automática via LocationIQ</p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-white/40 uppercase tracking-widest mb-2">Nome Completo *</label>
                    <input type="text" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} placeholder="Seu nome completo" className="form-input" required />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-white/40 uppercase tracking-widest mb-2">Telefone *</label>
                    <input type="text" value={formData.telefone} onChange={e => setFormData({...formData, telefone: e.target.value})} placeholder="(41) 99999-9999" className="form-input" required />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-mono text-white/40 uppercase tracking-widest mb-2">E-mail</label>
                  <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="email@exemplo.com" className="form-input" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-mono text-white/40 uppercase tracking-widest mb-2">Rua / Avenida *</label>
                    <input type="text" value={formData.rua} onChange={e => setFormData({...formData, rua: e.target.value})} placeholder="Nome da rua" className="form-input" required />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-white/40 uppercase tracking-widest mb-2">Número</label>
                    <input type="text" value={formData.numero} onChange={e => setFormData({...formData, numero: e.target.value})} placeholder="123" className="form-input" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-white/40 uppercase tracking-widest mb-2">Complemento</label>
                    <input type="text" value={formData.complemento} onChange={e => setFormData({...formData, complemento: e.target.value})} placeholder="Apto, casa, etc" className="form-input" />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-white/40 uppercase tracking-widest mb-2">Bairro *</label>
                    <input type="text" value={formData.bairro} onChange={e => setFormData({...formData, bairro: e.target.value})} placeholder="Digite o bairro" list="bairros-list" className="form-input" required />
                    <datalist id="bairros-list">
                      {BAIRROS.map(b => <option key={b} value={b} />)}
                    </datalist>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-mono text-white/40 uppercase tracking-widest mb-2">Cidade</label>
                  <input type="text" value={formData.cidade} onChange={e => setFormData({...formData, cidade: e.target.value})} className="form-input" readOnly />
                </div>
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                  <button type="button" onClick={handleGeocode} className="btn-secondary flex items-center gap-2" disabled={status === "loading"}>
                    <MapPin className="w-4 h-4" />
                    {status === "loading" ? "Buscando..." : "Geocodificar Endereço"}
                  </button>
                  {coords && (
                    <div className={`text-xs font-mono ${preciso ? "text-green-400" : "text-red-400"}`}>
                      {preciso ? "✓ " : "⚠ "}{coords[0].toFixed(6)}, {coords[1].toFixed(6)}
                    </div>
                  )}
                </div>
                {msg && (
                  <div className={`text-sm text-center font-mono ${status === "error" ? "text-red-400" : status === "success" ? "text-green-400" : "text-accent"}`}>{msg}</div>
                )}
                <button type="submit" className="btn-primary w-full" disabled={status === "loading"}>
                  {status === "loading" ? "Salvando..." : "Cadastrar Apoiador"}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {activeTab === "MAPA" && (
          <div className="flex flex-col items-center py-12 px-4">
            <div className="w-full text-center mb-4">
              <h2 className="text-2xl font-display font-bold uppercase">Mapa de Apoiadores</h2>
            </div>
            <iframe src={`${SERVER_URL}/mapa.html`} className="w-full h-[70vh] border border-white/10 rounded" title="Mapa" />
          </div>
        )}

        {activeTab === "DASHBOARD" && (
          <div className="flex flex-col items-center py-12 px-4">
            <div className="w-full text-center mb-4">
              <h2 className="text-2xl font-display font-bold uppercase">Dashboard</h2>
            </div>
            <iframe src={`${SERVER_URL}/dashboard.html`} className="w-full h-[70vh] border border-white/10 rounded" title="Dashboard" />
          </div>
        )}

        {activeTab === "APOIADORES" && (
          <div className="flex flex-col items-center py-12 px-4">
            <div className="w-full text-center mb-4">
              <h2 className="text-2xl font-display font-bold uppercase">Gerenciar Apoiadores</h2>
            </div>
            <iframe src={`${SERVER_URL}/admin.html`} className="w-full h-[70vh] border border-white/10 rounded" title="Admin" />
          </div>
        )}
      </main>

      <footer className="relative z-10 px-12 py-6 flex flex-col md:flex-row items-center justify-between border-t border-white/5 bg-bg/80 backdrop-blur-sm">
        <div className="flex items-center gap-4 mb-4 md:mb-0">
          <span className="text-accent font-display font-black text-sm">MG</span>
          <span className="text-[10px] text-white/40 uppercase tracking-widest">© 2024 Marciano Goggia. All rights reserved.</span>
        </div>
        <div className="flex items-center gap-2 text-accent">
          <MapPin className="w-3 h-3" />
          <span className="text-[10px] font-mono tracking-widest uppercase">São José dos Pinhais - PR</span>
        </div>
      </footer>
    </div>
  );
}
'@

[System.IO.File]::WriteAllText('D:\PROGETOS_BLOCK\marcianogoggia\new\src\App.tsx', $content, [System.Text.Encoding]::UTF8)
Write-Host 'SUCCESS'