const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = new sqlite3.Database('./apoiadores.db', (err) => {
    if (err) console.error('Erro ao conectar:', err.message);
    else console.log('Conectado ao SQLite');
});

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS apoiadores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            rua TEXT NOT NULL,
            numero TEXT NOT NULL,
            bairro TEXT NOT NULL,
            telefone TEXT,
            email TEXT,
            latitude REAL,
            longitude REAL,
            coordenadas_precisas INTEGER DEFAULT 1,
            data_cadastro DATE DEFAULT CURRENT_DATE,
            hora_cadastro TIME DEFAULT CURRENT_TIME
        )
    `);
    
    db.run(`ALTER TABLE apoiadores ADD COLUMN coordenadas_precisas INTEGER DEFAULT 1`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('Erro ao adicionar coluna:', err);
        }
    });
    
    // Tabela de cache de coordenadas
    db.run(`
        CREATE TABLE IF NOT EXISTS coordenadas_cache (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            rua TEXT NOT NULL,
            numero TEXT,
            bairro TEXT NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            preciso INTEGER DEFAULT 1,
            UNIQUE(rua, numero, bairro)
        )
    `);
});

app.post('/api/apoiadores', (req, res) => {
    const { nome, rua, numero, bairro, telefone, email, latitude, longitude, coordenadas_precisas } = req.body;
    
    if (!nome || !rua || !numero || !bairro) {
        return res.status(400).json({ error: 'Nome, rua, número e bairro são obrigatórios' });
    }
    
    const stmt = db.prepare(`
        INSERT INTO apoiadores (nome, rua, numero, bairro, telefone, email, latitude, longitude, coordenadas_precisas)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(nome, rua, numero, bairro, telefone || null, email || null, latitude || null, longitude || null, coordenadas_precisas !== false ? 1 : 0, function(err) {
        if (err) {
            console.error('Erro ao cadastrar:', err);
            return res.status(500).json({ error: 'Erro ao cadastrar apoiador' });
        }
        res.status(201).json({ id: this.lastID, message: 'Apoiador cadastrado com sucesso' });
    });
    stmt.finalize();
});

app.get('/api/apoiadores', (req, res) => {
    db.all('SELECT * FROM apoiadores ORDER BY id DESC', [], (err, rows) => {
        if (err) {
            console.error('Erro ao listar:', err);
            return res.status(500).json({ error: 'Erro ao listar apoiadores' });
        }
        res.json(rows);
    });
});

app.put('/api/apoiadores/:id', (req, res) => {
    const { id } = req.params;
    const { nome, rua, numero, bairro, telefone, email, latitude, longitude, coordenadas_precisas } = req.body;
    
    if (!nome || !rua || !numero || !bairro) {
        return res.status(400).json({ error: 'Nome, rua, número e bairro são obrigatórios' });
    }
    
    const stmt = db.prepare(`
        UPDATE apoiadores 
        SET nome = ?, rua = ?, numero = ?, bairro = ?, telefone = ?, email = ?, latitude = ?, longitude = ?, coordenadas_precisas = ?
        WHERE id = ?
    `);
    
    stmt.run(nome, rua, numero, bairro, telefone || null, email || null, latitude || null, longitude || null, coordenadas_precisas !== false ? 1 : 0, id, function(err) {
        if (err) {
            console.error('Erro ao atualizar:', err);
            return res.status(500).json({ error: 'Erro ao atualizar apoiador' });
        }
        res.json({ message: 'Apoiador atualizado com sucesso' });
    });
    stmt.finalize();
});

app.delete('/api/apoiadores/:id', (req, res) => {
    const { id } = req.params;
    
    const stmt = db.prepare('DELETE FROM apoiadores WHERE id = ?');
    
    stmt.run(id, function(err) {
        if (err) {
            console.error('Erro ao excluir:', err);
            return res.status(500).json({ error: 'Erro ao excluir apoiador' });
        }
        res.json({ message: 'Apoiador excluído com sucesso' });
    });
    stmt.finalize();
});

app.get('/api/stats', (req, res) => {
    db.get('SELECT COUNT(*) as total FROM apoiadores', [], (err, row) => {
        const total = row ? row.total : 0;
        db.all('SELECT COUNT(DISTINCT bairro) as total FROM apoiadores', [], (err, r2) => {
            const qtdBairros = r2 && r2.length > 0 ? r2[0].total : 0;
            db.get('SELECT COUNT(*) as total FROM apoiadores WHERE preciso = 1', [], (err, r3) => {
                res.json({
                    total: total,
                    bairros: qtdBairros,
                    precisos: r3 && r3.total ? r3.total : 0
                });
            });
        });
    });
});

app.get('/api/estatisticas', (req, res) => {
    db.get('SELECT COUNT(*) as total FROM apoiadores', [], (err, row) => {
        const total = row ? row.total : 0;
        
        db.all('SELECT bairro, COUNT(*) as total FROM apoiadores GROUP BY bairro ORDER BY total DESC', [], (err, rows) => {
            res.json({
                total: total,
                bairros: rows || []
            });
        });
    });
});

app.post('/api/recalcular-coordenadas', async (req, res) => {
    const LOCATIONIQ_KEY = 'pk.49f935195ce927d0901526065edf509c';
    
    db.all('SELECT * FROM apoiadores', [], async (err, apoiadores) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao buscar apoiadores' });
        }
        
        let atualizados = 0;
        let erros = 0;
        
        for (const apoiador of apoiadores) {
            const endereco = `${apoiador.rua}, ${apoiador.numero}, ${apoiador.bairro}, São José dos Pinhais, Paraná, Brasil`;
            
            try {
                const encodedAddr = encodeURIComponent(endereco);
                const response = await fetch(`https://us1.locationiq.com/v1/search.php?key=${LOCATIONIQ_KEY}&q=${encodedAddr}&format=json&limit=1&addressdetails=1`);
                
                const data = await response.json();
                
                if (data && data.length > 0 && data[0].lat && data[0].lon) {
                    const lat = parseFloat(data[0].lat);
                    const lng = parseFloat(data[0].lon);
                    
                    db.run('UPDATE apoiadores SET latitude = ?, longitude = ? WHERE id = ?', 
                        [lat, lng, apoiador.id]);
                    atualizados++;
                } else {
                    erros++;
                }
                
                // Rate limit: 2 req/s no LocationIQ gratuito
                await new Promise(r => setTimeout(r, 600));
                
            } catch (error) {
                console.error(`Erro ao buscar coordenadas para ${apoiador.nome}:`, error);
                erros++;
            }
        }
        
        res.json({ 
            message: 'Coordenadas recalculadas',
            atualizados,
            erros,
            total: apoiadores.length
        });
    });
});

app.get('/api/geocodificar', async (req, res) => {
    const { rua, numero, bairro } = req.query;
    
    if (!rua || !numero || !bairro) {
        return res.status(400).json({ error: 'Rua, número e bairro são obrigatórios' });
    }
    
    const LOCATIONIQ_KEY = 'pk.49f935195ce927d0901526065edf509c';
    
    function normalizar(texto) {
        if (!texto) return '';
        return texto.toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]/g, ' ')
            .trim();
    }
    
    function similarity(s1, s2) {
        if (!s1 || !s2) return 0;
        const words1 = s1.split(/\s+/);
        const words2 = s2.split(/\s+/);
        let matches = 0;
        for (const w1 of words1) {
            if (w1.length > 2 && words2.some(w2 => w2.includes(w1) || w1.includes(w2))) {
                matches++;
            }
        }
        return matches / Math.max(words1.length, words2.length);
    }
    
    function validarEndereco(resultado, rua, numero, bairro) {
        if (!resultado || !resultado.address) return false;
        
        const addr = resultado.address;
        const ruaNormalizada = normalizar(rua);
        const bairroNormalizado = normalizar(bairro);
        
        const ruaResultado = normalizar(addr.road || addr.pedestrian || addr.path || '');
        const bairroResultado = normalizar(
            addr.neighbourhood || addr.suburb || addr.quarter || addr.village || addr.town || addr.municipality || ''
        );
        
        const ruaMatch = ruaNormalizada.length > 3 && (
            ruaResultado.includes(ruaNormalizada) || 
            ruaNormalizada.includes(ruaResultado) ||
            similarity(ruaNormalizada, ruaResultado) > 0.6
        );
        
        const bairroMatch = !bairroNormalizado || bairroNormalizado.length < 3 || (
            bairroResultado.includes(bairroNormalizado) || 
            bairroNormalizado.includes(bairroResultado) ||
            similarity(bairroNormalizado, bairroResultado) > 0.6
        );
        
        return ruaMatch && bairroMatch;
    }
    
    const BAIRROS_COORDS = {
        'Centro': [-25.5317, -49.2921],
        'Aeroporto': [-25.5084, -49.1755],
        'Alto da Boa Vista': [-25.5521, -49.3210],
        'Barra do João José': [-25.4898, -49.2456],
        'Bela Vista': [-25.5456, -49.2567],
        'Boa Vista': [-25.5378, -49.2234],
        'Brasil': [-25.5212, -49.2634],
        'Cachoeirinha': [-25.5678, -49.3123],
        'Campo Largo': [-25.4534, -49.3456],
        'Campus': [-25.5123, -49.3234],
        'Cidade Industrial': [-25.4834, -49.2834],
        'Colônia Rio Grande': [-25.4123, -49.3567],
        'Cruzeiro': [-25.5234, -49.2345],
        'Eucaliptos': [-25.5567, -49.2934],
        'Guabirotuba': [-25.5234, -49.3456],
        'Inocência': [-25.4789, -49.2567],
        'Ipê': [-25.5489, -49.2789],
        'Jardim': [-25.5345, -49.3012],
        'Jardim dos Eucaliptos': [-25.5623, -49.2901],
        'Jardim Kennedy': [-25.5012, -49.2678],
        'Jardim Maria Helena': [-25.5156, -49.2890],
        'Muricy': [-25.4876, -49.2345],
        'Oliveira': [-25.5432, -49.3123],
        'Parque Industrial': [-25.4765, -49.2765],
        'Parque São Pedro': [-25.5234, -49.3512],
        'Pedra Grande': [-25.5765, -49.3345],
        'Pineville': [-25.5578, -49.2654],
        'Ponta Grossa': [-25.4654, -49.3456],
        'Portão': [-25.5098, -49.2543],
        'Possidônio': [-25.4567, -49.3234],
        'Rio Pequeno': [-25.4987, -49.3345],
        'Santo Antônio': [-25.5321, -49.2765],
        'São Cristóvão': [-25.5156, -49.2543],
        'São Francisco': [-25.5467, -49.2432],
        'São João': [-25.5234, -49.2890],
        'São Pedro': [-25.5567, -49.3089],
        'Seara': [-25.4876, -49.2987],
        'Taboão': [-25.5123, -49.3345],
        'Tancredo': [-25.5423, -49.2543],
        'Vila Formosa': [-25.4765, -49.2345],
        'Vila Guarani': [-25.5098, -49.3123],
        'Vila Izabel': [-25.5234, -49.2654],
        'Vila Residencial': [-25.4987, -49.2543],
        'Vila Velha': [-25.5312, -49.3089],
        'Xaxim': [-25.4876, -49.3210]
    };
    
    try {
        // Primeiro tenta com SJP
        const enderecoSJP = `${rua}, ${numero}, ${bairro}, São José dos Pinhais, Paraná, Brasil`;
        const encodedAddr = encodeURIComponent(enderecoSJP);
        const response = await fetch(`https://us1.locationiq.com/v1/search.php?key=${LOCATIONIQ_KEY}&q=${encodedAddr}&format=json&limit=1&addressdetails=1`);
        
        const data = await response.json();
        
        if (data && data.length > 0 && data[0].lat && data[0].lon) {
            const valido = validarEndereco(data[0], rua, numero, bairro);
            return res.json({
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon),
                preciso: valido
            });
        }
        
        // Se não encontrar, tenta sem especificar cidade
        const enderecoGeral = `${rua}, ${numero}, ${bairro}, Paraná, Brasil`;
        const encodedAddr2 = encodeURIComponent(enderecoGeral);
        const response2 = await fetch(`https://us1.locationiq.com/v1/search.php?key=${LOCATIONIQ_KEY}&q=${encodedAddr2}&format=json&limit=1&addressdetails=1`);
        
        const data2 = await response2.json();
        
        if (data2 && data2.length > 0 && data2[0].lat && data2[0].lon) {
            const valido = validarEndereco(data2[0], rua, numero, bairro);
            return res.json({
                lat: parseFloat(data2[0].lat),
                lng: parseFloat(data2[0].lon),
                preciso: valido
            });
        }
        
        // Não encontrou - usa fallback do bairro
        const bairroLower = bairro.toLowerCase().trim();
        if (bairro && BAIRROS_COORDS[bairroLower]) {
            const coords = BAIRROS_COORDS[bairroLower];
            return res.json({ lat: coords[0], lng: coords[1], preciso: false });
        }
        
        return res.json({ lat: -25.5317, lng: -49.2921, preciso: false });
        
    } catch (error) {
        console.error('Erro geocodificação:', error);
        
        const bairroLower = bairro.toLowerCase().trim();
        if (bairro && BAIRROS_COORDS[bairroLower]) {
            const coords = BAIRROS_COORDS[bairroLower];
            return res.json({ lat: coords[0], lng: coords[1], preciso: false });
        }
        
        res.json({ lat: -25.5317, lng: -49.2921, preciso: false });
    }
});

// Buscar coordenadas no cache
app.get('/api/coordenadas-cache/get', (req, res) => {
    const { rua, numero, bairro } = req.query;
    
    if (!rua || !bairro) {
        return res.status(400).json({ error: 'Rua e bairro são obrigatórios' });
    }
    
    // Normalizar para busca
    const ruaNorm = rua.toLowerCase().trim();
    const numeroNorm = numero ? numero.toLowerCase().trim() : '';
    const bairroNorm = bairro.toLowerCase().trim();
    
    db.get(`
        SELECT latitude, longitude, preciso FROM coordenadas_cache 
        WHERE LOWER(rua) = ? AND LOWER(COALESCE(numero, '')) = ? AND LOWER(bairro) = ?
    `, [ruaNorm, numeroNorm, bairroNorm], (err, row) => {
        if (err) {
            console.error('Erro ao buscar cache:', err);
            return res.status(500).json({ error: 'Erro ao buscar coordenadas' });
        }
        
        if (row) {
            return res.json({
                lat: row.latitude,
                lng: row.longitude,
                preciso: row.preciso === 1,
                fromCache: true
            });
        }
        
        res.json(null);
    });
});

// Salvar coordenadas no cache
app.post('/api/coordenadas-cache/save', (req, res) => {
    const { rua, numero, bairro, latitude, longitude, preciso } = req.body;
    
    if (!rua || !bairro || latitude === undefined || longitude === undefined) {
        return res.status(400).json({ error: 'Dados incompletos' });
    }
    
    const stmt = db.prepare(`
        INSERT OR REPLACE INTO coordenadas_cache (rua, numero, bairro, latitude, longitude, preciso)
        VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
        rua.toLowerCase().trim(),
        numero ? numero.toLowerCase().trim() : null,
        bairro.toLowerCase().trim(),
        latitude,
        longitude,
        preciso !== false ? 1 : 0
    , function(err) {
        if (err) {
            console.error('Erro ao salvar cache:', err);
            return res.status(500).json({ error: 'Erro ao salvar coordenadas' });
        }
        res.json({ message: 'Coordenadas salvas no cache' });
    });
    stmt.finalize();
});

// Listar todas coordenadas do cache
app.get('/api/coordenadas-cache', (req, res) => {
    db.all('SELECT * FROM coordenadas_cache ORDER BY rua, bairro', [], (err, rows) => {
        if (err) {
            console.error('Erro ao listar cache:', err);
            return res.status(500).json({ error: 'Erro ao listar coordenadas' });
        }
        res.json(rows || []);
    });
});

// Geocodificar com cache - versão melhorada
app.get('/api/geocodificar-com-cache', async (req, res) => {
    const { rua, numero, bairro } = req.query;
    
    if (!rua || !numero || !bairro) {
        return res.status(400).json({ error: 'Rua, número e bairro são obrigatórios' });
    }
    
    const LOCATIONIQ_KEY = 'pk.49f935195ce927d0901526065edf509c';
    
    // 1. Primeiro verifica o cache
    const cacheKey = { rua, numero, bairro };
    
    const BAIRROS_COORDS = {
        'Academia': [-25.5189, -49.2321], 'Afonso Pena': [-25.5423, -49.2756], 'Águas Belas': [-25.5567, -49.3012],
        'Aristocrata': [-25.5298, -49.2654], 'Arujá': [-25.5489, -49.3123], 'Aviação': [-25.5084, -49.1755],
        'Barro Preto': [-25.4765, -49.2567], 'Bom Jesus': [-25.5123, -49.3234], 'Boneca do Iguaçu': [-25.5234, -49.2890],
        'Borda do Campo': [-25.4876, -49.3345], 'Braga': [-25.4534, -49.3210], 'Campo Largo da Roseira': [-25.4423, -49.3156],
        'Centro': [-25.5317, -49.2921], 'Cidade Jardim': [-25.5456, -49.2789], 'Contenda': [-25.4123, -49.3456],
        'Costeira': [-25.5567, -49.2432], 'Cruzeiro': [-25.5234, -49.2345], 'Del Rey': [-25.5345, -49.2567],
        'Dom Rodrigo': [-25.4678, -49.2890], 'Guatupê': [-25.5234, -49.2234], 'Iná': [-25.5098, -49.3123],
        'Inspetor Carvalho': [-25.4987, -49.3012], 'Ipê': [-25.5489, -49.2789], 'Itália': [-25.5378, -49.2654],
        'Jurema': [-25.5212, -49.2543], 'Ouro Fino': [-25.5567, -49.2934], 'Parque da Fonte': [-25.5623, -49.2890],
        'Pedro Moro': [-25.5156, -49.2765], 'Quississana': [-25.4876, -49.2345], 'Rio Pequeno': [-25.4987, -49.3345],
        'São Cristóvão': [-25.5156, -49.2543], 'São Domingos': [-25.5234, -49.3089], 'São Marcos': [-25.5098, -49.2234],
        'São Pedro': [-25.5567, -49.3089], 'Silveira da Motta': [-25.5423, -49.2432], 'Três Marias': [-25.4765, -49.2987],
        'Zacarias': [-25.5312, -49.2654], 'Cachoeira': [-25.4234, -49.3567], 'Cachoeira de São José': [-25.4123, -49.3456],
        'Campestre da Faxina': [-25.3987, -49.3678], 'Campina': [-25.4534, -49.3123], 'Campina do Miringuava': [-25.3898, -49.3789],
        'Campina do Taquaral': [-25.4123, -49.3567], 'Campina dos Furtados': [-25.3765, -49.3890], 'Carioca': [-25.4567, -49.3012],
        'Colônia Acioli': [-25.3678, -49.3956], 'Colônia Castelhanos': [-25.3543, -49.4012], 'Colônia Malhada': [-25.3456, -49.4123],
        'Colônia Marcelino': [-25.3345, -49.4234], 'Colônia Murici': [-25.3234, -49.4345], 'Colônia Rio Grande': [-25.4123, -49.3567],
        'Colônia Santos Andrade': [-25.3987, -49.3678], 'Despique': [-25.3123, -49.4456], 'Emboque': [-25.3012, -49.4567],
        'Faxina': [-25.2898, -49.4678], 'Gamela': [-25.2789, -49.4789], 'Marcelino': [-25.2678, -49.4890],
        'Morro Alto': [-25.2567, -49.5012], 'Olho Agudo': [-25.2456, -49.5123], 'Roça Velha': [-25.2345, -49.5234],
        'Roseira de São Sebastião': [-25.2234, -49.5345], 'Santo Antônio': [-25.5321, -49.2765], 'São Sebastião': [-25.2123, -49.5456]
    };
    
    function normalizar(texto) {
        if (!texto) return '';
        return texto.toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]/g, ' ')
            .trim();
    }
    
    function validarEndereco(resultado, rua, numero, bairro) {
        if (!resultado || !resultado.address) return false;
        const addr = resultado.address;
        const ruaNormalizada = normalizar(rua);
        const bairroNormalizado = normalizar(bairro);
        const ruaResultado = normalizar(addr.road || addr.pedestrian || addr.path || '');
        const bairroResultado = normalizar(addr.neighbourhood || addr.suburb || addr.quarter || addr.village || addr.town || addr.municipality || '');
        const ruaMatch = ruaNormalizada.length > 3 && (ruaResultado.includes(ruaNormalizada) || ruaNormalizada.includes(ruaResultado));
        const bairroMatch = !bairroNormalizado || bairroNormalizado.length < 3 || (bairroResultado.includes(bairroNormalizado) || bairroNormalizado.includes(bairroResultado));
        return ruaMatch && bairroMatch;
    }
    
    // Verificar cache primeiro
    const ruaNorm = rua.toLowerCase().trim();
    const numeroNorm = numero ? numero.toLowerCase().trim() : '';
    const bairroNorm = bairro.toLowerCase().trim();
    
    db.get(`SELECT latitude, longitude, preciso FROM coordenadas_cache WHERE LOWER(rua) = ? AND LOWER(COALESCE(numero, '')) = ? AND LOWER(bairro) = ?`, 
        [ruaNorm, numeroNorm, bairroNorm], async (err, cached) => {
        if (cached) {
            return res.json({
                lat: cached.latitude,
                lng: cached.longitude,
                preciso: cached.preciso === 1,
                fromCache: true
            });
        }
        
        // Cache não encontrado - buscar na API
        try {
            const enderecoSJP = `${rua}, ${numero}, ${bairro}, São José dos Pinhais, Paraná, Brasil`;
            const encodedAddr = encodeURIComponent(enderecoSJP);
            const response = await fetch(`https://us1.locationiq.com/v1/search.php?key=${LOCATIONIQ_KEY}&q=${encodedAddr}&format=json&limit=1&addressdetails=1`);
            
            let data = await response.json();
            let valido = false;
            
            if (data && data.length > 0 && data[0].lat && data[0].lon) {
                valido = validarEndereco(data[0], rua, numero, bairro);
            } else {
                // Tenta sem especificar cidade
                const enderecoGeral = `${rua}, ${numero}, ${bairro}, Paraná, Brasil`;
                const encodedAddr2 = encodeURIComponent(enderecoGeral);
                const response2 = await fetch(`https://us1.locationiq.com/v1/search.php?key=${LOCATIONIQ_KEY}&q=${encodedAddr2}&format=json&limit=1&addressdetails=1`);
                data = await response2.json();
                
                if (data && data.length > 0 && data[0].lat && data[0].lon) {
                    valido = validarEndereco(data[0], rua, numero, bairro);
                }
            }
            
            let lat, lng;
            let preciso = valido;
            
            if (data && data.length > 0 && data[0].lat && data[0].lon) {
                lat = parseFloat(data[0].lat);
                lng = parseFloat(data[0].lon);
            } else {
                // Usa fallback do bairro
                const bairroLower = bairro.toLowerCase().trim();
                if (BAIRROS_COORDS[bairroLower]) {
                    [lat, lng] = BAIRROS_COORDS[bairroLower];
                } else {
                    lat = -25.5317;
                    lng = -49.2921;
                }
                preciso = false;
            }
            
            // Salvar no cache para próximas consultas
            db.run(`INSERT OR REPLACE INTO coordenadas_cache (rua, numero, bairro, latitude, longitude, preciso) VALUES (?, ?, ?, ?, ?, ?)`,
                [ruaNorm, numeroNorm || null, bairroNorm, lat, lng, preciso ? 1 : 0]);
            
            res.json({ lat, lng, preciso, fromCache: false });
            
        } catch (error) {
            console.error('Erro geocodificação:', error);
            const bairroLower = bairro.toLowerCase().trim();
            if (BAIRROS_COORDS[bairroLower]) {
                const [lat, lng] = BAIRROS_COORDS[bairroLower];
                return res.json({ lat, lng, preciso: false, fromCache: false });
            }
            res.json({ lat: -25.5317, lng: -49.2921, preciso: false, fromCache: false });
        }
    });
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
