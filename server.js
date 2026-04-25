const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Default URL if not provided via environment
const DATABASE_URL = process.env.DATABASE_URL || 'mariadb://mariadb:oa6qhwd1qvc8y1uq0jap@develop_marcianogoggia:3306/marcianogoggia_db';
const LOCATIONIQ_KEY = 'pk.49f935195ce927d0901526065edf509c';
const JWT_SECRET = process.env.JWT_SECRET || 'marciano_goggia_super_secret_2025';

let pool;

async function initDB() {
    try {
        pool = mysql.createPool(DATABASE_URL);
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS apoiadores (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nome VARCHAR(255) NOT NULL,
                rua VARCHAR(255) NOT NULL,
                numero VARCHAR(50) NOT NULL,
                bairro VARCHAR(100) NOT NULL,
                telefone VARCHAR(50),
                email VARCHAR(255),
                latitude DECIMAL(10, 8),
                longitude DECIMAL(11, 8),
                coordenadas_precisas BOOLEAN DEFAULT TRUE,
                data_cadastro DATE DEFAULT (CURRENT_DATE),
                hora_cadastro TIME DEFAULT (CURRENT_TIME)
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS coordenadas_cache (
                id INT AUTO_INCREMENT PRIMARY KEY,
                rua VARCHAR(255) NOT NULL,
                numero VARCHAR(50),
                bairro VARCHAR(100) NOT NULL,
                latitude DECIMAL(10, 8) NOT NULL,
                longitude DECIMAL(11, 8) NOT NULL,
                preciso BOOLEAN DEFAULT TRUE,
                UNIQUE KEY unique_endereco (rua, numero, bairro)
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nome VARCHAR(255) NOT NULL,
                username VARCHAR(100) NOT NULL UNIQUE,
                senha_hash VARCHAR(255) NOT NULL,
                papel ENUM('admin','editor','visualizador') DEFAULT 'editor',
                ativo BOOLEAN DEFAULT TRUE,
                criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
                ultimo_login DATETIME
            )
        `);

        // Cria usuário admin padrão se não existir
        const [uRows] = await pool.query('SELECT COUNT(*) as count FROM usuarios');
        if (uRows[0].count === 0) {
            const hash = await bcrypt.hash('admin123', 10);
            await pool.execute(
                'INSERT INTO usuarios (nome, username, senha_hash, papel) VALUES (?, ?, ?, ?)',
                ['Administrador', 'admin', hash, 'admin']
            );
            console.log('Usuário admin criado: admin / admin123');
        }

        // Seed initial data se estiver vazio
        const [rows] = await pool.query('SELECT COUNT(*) as count FROM apoiadores');
        if (rows[0].count === 0) {
            console.log('Inserindo cadastros iniciais...');
            const seedData = [
                ['Narciso Franklin de Almeida', 'R. Eloina Ribas Bastos', '468', 'Costeira'],
                ['Maria Gonçalves de Oliveira', 'R. Eloina Ribas Bastos', '468', 'Costeira'],
                ['João Leandro Matias', 'R. Almerinda de Oliveira Alves', '164', 'Rio Pequeno'],
                ['Douglas Henrique de moura', 'R. Estanislau lachinski', '610', 'Piraquara'],
                ['Rodrigo Pará', 'R. Itaoca', '201', 'Guatupê'],
                ['Mayara do socorro da Silva', 'R. Luiz Rafael poplade', '314', 'Iná'],
                ['Roseli de Lima neimam', 'R. Jânio quadros', 'S/N', 'Ipê'],
                ['Luciano schappo Diogo', 'R. Giocondo dal Stella', '341', 'Quissisana'],
                ['Sebastião Pereira de Castro', 'R. Sebastião spejorin', '950', 'São Marcos']
            ];
            
            for (const data of seedData) {
                await pool.execute(
                    'INSERT INTO apoiadores (nome, rua, numero, bairro, coordenadas_precisas) VALUES (?, ?, ?, ?, ?)',
                    [...data, false]
                );
            }
        }
        console.log('Conectado ao MariaDB e tabelas verificadas.');
    } catch (error) {
        console.error('Erro ao inicializar o banco de dados:', error);
    }
}

initDB();

// -------------------------------------------------------------
// MIDDLEWARE DE AUTENTICAÇÃO
// -------------------------------------------------------------

function authMiddleware(req, res, next) {
    const auth = req.headers['authorization'];
    if (!auth || !auth.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Não autorizado' });
    }
    try {
        const token = auth.split(' ')[1];
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        return res.status(401).json({ error: 'Token inválido ou expirado' });
    }
}

function adminOnly(req, res, next) {
    if (req.user.papel !== 'admin') {
        return res.status(403).json({ error: 'Apenas administradores' });
    }
    next();
}

// -------------------------------------------------------------
// ROTAS DE AUTENTICAÇÃO
// -------------------------------------------------------------

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, senha } = req.body;
        if (!username || !senha) return res.status(400).json({ error: 'Usuário e senha obrigatórios' });

        const [rows] = await pool.execute('SELECT * FROM usuarios WHERE username = ? AND ativo = 1', [username]);
        if (rows.length === 0) return res.status(401).json({ error: 'Credenciais inválidas' });

        const usuario = rows[0];
        const senhaOk = await bcrypt.compare(senha, usuario.senha_hash);
        if (!senhaOk) return res.status(401).json({ error: 'Credenciais inválidas' });

        await pool.execute('UPDATE usuarios SET ultimo_login = NOW() WHERE id = ?', [usuario.id]);

        const token = jwt.sign(
            { id: usuario.id, username:usuario.username, nome: usuario.nome, papel: usuario.papel },
            JWT_SECRET
        );

        res.json({ token, usuario: { id: usuario.id, nome: usuario.nome, username: usuario.username, papel: usuario.papel } });
    } catch (err) {
        console.error('Erro no login:', err);
        res.status(500).json({ error: 'Erro interno' });
    }
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
    res.json(req.user);
});

// -------------------------------------------------------------
// ROTAS DE GERENCIAMENTO DE USUÁRIOS
// -------------------------------------------------------------

app.get('/api/usuarios', authMiddleware, adminOnly, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, nome, username, papel, ativo, criado_em, ultimo_login FROM usuarios ORDER BY id DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao listar usuários' });
    }
});

app.post('/api/usuarios', authMiddleware, adminOnly, async (req, res) => {
    try {
        const { nome, username, senha, papel } = req.body;
        if (!nome || !username || !senha) return res.status(400).json({ error: 'Nome, usuário e senha são obrigatórios' });
        const hash = await bcrypt.hash(senha, 10);
        const [result] = await pool.execute(
            'INSERT INTO usuarios (nome, username, senha_hash, papel) VALUES (?, ?, ?, ?)',
            [nome, username, hash, papel || 'editor']
        );
        res.status(201).json({ id: result.insertId, message: 'Usuário criado com sucesso' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Nome de usuário já existe' });
        res.status(500).json({ error: 'Erro ao criar usuário' });
    }
});

app.put('/api/usuarios/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, username, senha, papel, ativo } = req.body;
        if (!nome || !username) return res.status(400).json({ error: 'Nome e usuário são obrigatórios' });

        if (senha) {
            const hash = await bcrypt.hash(senha, 10);
            await pool.execute(
                'UPDATE usuarios SET nome=?, username=?, senha_hash=?, papel=?, ativo=? WHERE id=?',
                [nome, username, hash, papel || 'editor', ativo !== false ? 1 : 0, id]
            );
        } else {
            await pool.execute(
                'UPDATE usuarios SET nome=?, username=?, papel=?, ativo=? WHERE id=?',
                [nome, username, papel || 'editor', ativo !== false ? 1 : 0, id]
            );
        }
        res.json({ message: 'Usuário atualizado com sucesso' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Nome de usuário já existe' });
        res.status(500).json({ error: 'Erro ao atualizar usuário' });
    }
});

app.delete('/api/usuarios/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
        const { id } = req.params;
        if (parseInt(id) === req.user.id) return res.status(400).json({ error: 'Não pode excluir seu próprio usuário' });
        await pool.execute('DELETE FROM usuarios WHERE id = ?', [id]);
        res.json({ message: 'Usuário excluído com sucesso' });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao excluir usuário' });
    }
});

app.post('/api/apoiadores', async (req, res) => {
    try {
        const { nome, rua, numero, bairro, telefone, email, latitude, longitude, coordenadas_precisas } = req.body;
        
        if (!nome || !rua || !numero || !bairro) {
            return res.status(400).json({ error: 'Nome, rua, número e bairro são obrigatórios' });
        }
        
        const [result] = await pool.execute(`
            INSERT INTO apoiadores (nome, rua, numero, bairro, telefone, email, latitude, longitude, coordenadas_precisas)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [nome, rua, numero, bairro, telefone || null, email || null, latitude || null, longitude || null, coordenadas_precisas !== false]);
        
        res.status(201).json({ id: result.insertId, message: 'Apoiador cadastrado com sucesso' });
    } catch (err) {
        console.error('Erro ao cadastrar:', err);
        res.status(500).json({ error: 'Erro ao cadastrar apoiador' });
    }
});

app.get('/api/apoiadores', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM apoiadores ORDER BY id DESC');
        res.json(rows);
    } catch (err) {
        console.error('Erro ao listar:', err);
        res.status(500).json({ error: 'Erro ao listar apoiadores' });
    }
});

app.put('/api/apoiadores/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, rua, numero, bairro, telefone, email, latitude, longitude, coordenadas_precisas } = req.body;
        
        if (!nome || !rua || !numero || !bairro) {
            return res.status(400).json({ error: 'Nome, rua, número e bairro são obrigatórios' });
        }
        
        await pool.execute(`
            UPDATE apoiadores 
            SET nome = ?, rua = ?, numero = ?, bairro = ?, telefone = ?, email = ?, latitude = ?, longitude = ?, coordenadas_precisas = ?
            WHERE id = ?
        `, [nome, rua, numero, bairro, telefone || null, email || null, latitude || null, longitude || null, coordenadas_precisas !== false, id]);
        
        res.json({ message: 'Apoiador atualizado com sucesso' });
    } catch (err) {
        console.error('Erro ao atualizar:', err);
        res.status(500).json({ error: 'Erro ao atualizar apoiador' });
    }
});

app.delete('/api/apoiadores/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.execute('DELETE FROM apoiadores WHERE id = ?', [id]);
        res.json({ message: 'Apoiador excluído com sucesso' });
    } catch (err) {
        console.error('Erro ao excluir:', err);
        res.status(500).json({ error: 'Erro ao excluir apoiador' });
    }
});

app.get('/api/stats', async (req, res) => {
    try {
        const [r1] = await pool.query('SELECT COUNT(*) as total FROM apoiadores');
        const [r2] = await pool.query('SELECT COUNT(DISTINCT bairro) as total FROM apoiadores');
        const [r3] = await pool.query('SELECT COUNT(*) as total FROM apoiadores WHERE coordenadas_precisas = 1');
        
        res.json({
            total: r1[0].total || 0,
            bairros: r2[0].total || 0,
            precisos: r3[0].total || 0
        });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao buscar stats' });
    }
});

app.get('/api/estatisticas', async (req, res) => {
    try {
        const [r1] = await pool.query('SELECT COUNT(*) as total FROM apoiadores');
        const [rows] = await pool.query('SELECT bairro, COUNT(*) as total FROM apoiadores GROUP BY bairro ORDER BY total DESC');
        
        res.json({
            total: r1[0].total || 0,
            bairros: rows || []
        });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao buscar estatisticas' });
    }
});


// -------------------------------------------------------------
// FUNÇÕES DE GEOCODIFICAÇÃO EM CASCATA
// -------------------------------------------------------------

const BAIRROS_COORDS = {
    'Centro': [-25.5317, -49.2921], 'Aeroporto': [-25.5084, -49.1755], 'Alto da Boa Vista': [-25.5521, -49.3210],
    'Barra do João José': [-25.4898, -49.2456], 'Bela Vista': [-25.5456, -49.2567], 'Boa Vista': [-25.5378, -49.2234],
    'Brasil': [-25.5212, -49.2634], 'Cachoeirinha': [-25.5678, -49.3123], 'Campo Largo': [-25.4534, -49.3456],
    'Campus': [-25.5123, -49.3234], 'Cidade Industrial': [-25.4834, -49.2834], 'Colônia Rio Grande': [-25.4123, -49.3567],
    'Cruzeiro': [-25.5234, -49.2345], 'Eucaliptos': [-25.5567, -49.2934], 'Guabirotuba': [-25.5234, -49.3456],
    'Inocência': [-25.4789, -49.2567], 'Ipê': [-25.5489, -49.2789], 'Jardim': [-25.5345, -49.3012],
    'Jardim dos Eucaliptos': [-25.5623, -49.2901], 'Jardim Kennedy': [-25.5012, -49.2678], 'Jardim Maria Helena': [-25.5156, -49.2890],
    'Muricy': [-25.4876, -49.2345], 'Oliveira': [-25.5432, -49.3123], 'Parque Industrial': [-25.4765, -49.2765],
    'Parque São Pedro': [-25.5234, -49.3512], 'Pedra Grande': [-25.5765, -49.3345], 'Pineville': [-25.5578, -49.2654],
    'Ponta Grossa': [-25.4654, -49.3456], 'Portão': [-25.5098, -49.2543], 'Possidônio': [-25.4567, -49.3234],
    'Rio Pequeno': [-25.4987, -49.3345], 'Santo Antônio': [-25.5321, -49.2765], 'São Cristóvão': [-25.5156, -49.2543],
    'São Francisco': [-25.5467, -49.2432], 'São João': [-25.5234, -49.2890], 'São Pedro': [-25.5567, -49.3089],
    'Seara': [-25.4876, -49.2987], 'Taboão': [-25.5123, -49.3345], 'Tancredo': [-25.5423, -49.2543],
    'Vila Formosa': [-25.4765, -49.2345], 'Vila Guarani': [-25.5098, -49.3123], 'Vila Izabel': [-25.5234, -49.2654],
    'Vila Residencial': [-25.4987, -49.2543], 'Vila Velha': [-25.5312, -49.3089], 'Xaxim': [-25.4876, -49.3210],
    'Academia': [-25.5189, -49.2321], 'Afonso Pena': [-25.5423, -49.2756], 'Águas Belas': [-25.5567, -49.3012],
    'Aristocrata': [-25.5298, -49.2654], 'Arujá': [-25.5489, -49.3123], 'Aviação': [-25.5084, -49.1755],
    'Barro Preto': [-25.4765, -49.2567], 'Bom Jesus': [-25.5123, -49.3234], 'Boneca do Iguaçu': [-25.5234, -49.2890],
    'Borda do Campo': [-25.4876, -49.3345], 'Braga': [-25.4534, -49.3210], 'Campo Largo da Roseira': [-25.4423, -49.3156],
    'Cidade Jardim': [-25.5456, -49.2789], 'Contenda': [-25.4123, -49.3456], 'Costeira': [-25.5567, -49.2432],
    'Del Rey': [-25.5345, -49.2567], 'Dom Rodrigo': [-25.4678, -49.2890], 'Guatupê': [-25.5234, -49.2234], 
    'Iná': [-25.5098, -49.3123], 'Inspetor Carvalho': [-25.4987, -49.3012], 'Itália': [-25.5378, -49.2654],
    'Jurema': [-25.5212, -49.2543], 'Ouro Fino': [-25.5567, -49.2934], 'Parque da Fonte': [-25.5623, -49.2890],
    'Pedro Moro': [-25.5156, -49.2765], 'Quississana': [-25.4876, -49.2345], 'São Domingos': [-25.5234, -49.3089], 
    'São Marcos': [-25.5098, -49.2234], 'Silveira da Motta': [-25.5423, -49.2432], 'Três Marias': [-25.4765, -49.2987],
    'Zacarias': [-25.5312, -49.2654], 'Cachoeira': [-25.4234, -49.3567], 'Cachoeira de São José': [-25.4123, -49.3456],
    'Campestre da Faxina': [-25.3987, -49.3678], 'Campina': [-25.4534, -49.3123], 'Campina do Miringuava': [-25.3898, -49.3789],
    'Campina do Taquaral': [-25.4123, -49.3567], 'Campina dos Furtados': [-25.3765, -49.3890], 'Carioca': [-25.4567, -49.3012],
    'Colônia Acioli': [-25.3678, -49.3956], 'Colônia Castelhanos': [-25.3543, -49.4012], 'Colônia Malhada': [-25.3456, -49.4123],
    'Colônia Marcelino': [-25.3345, -49.4234], 'Colônia Murici': [-25.3234, -49.4345], 'Colônia Santos Andrade': [-25.3987, -49.3678], 
    'Despique': [-25.3123, -49.4456], 'Emboque': [-25.3012, -49.4567], 'Faxina': [-25.2898, -49.4678], 
    'Gamela': [-25.2789, -49.4789], 'Marcelino': [-25.2678, -49.4890], 'Morro Alto': [-25.2567, -49.5012], 
    'Olho Agudo': [-25.2456, -49.5123], 'Roça Velha': [-25.2345, -49.5234], 'Roseira de São Sebastião': [-25.2234, -49.5345], 
    'São Sebastião': [-25.2123, -49.5456]
};

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

function validarEndereco(resultado, rua) {
    if (!resultado || !resultado.address) return false;
    const addr = resultado.address;
    const ruaNormalizada = normalizar(rua);
    const ruaResultado = normalizar(addr.road || addr.pedestrian || addr.path || '');
    return ruaNormalizada.length > 3 && (
        ruaResultado.includes(ruaNormalizada) || 
        ruaNormalizada.includes(ruaResultado) ||
        similarity(ruaNormalizada, ruaResultado) > 0.6
    );
}

function limparNumero(numero) {
    if (!numero) return '';
    const n = numero.toLowerCase().trim();
    if (n === 's/n' || n === 'sn' || n === 'sem numero' || n === '0') return '';
    return n;
}

async function buscarCoordenadasCascata(rua, numero, bairro) {
    const numLimpo = limparNumero(numero);
    const cidade = "São José dos Pinhais, Paraná, Brasil";
    
    // Filtro especial para municípios vizinhos digitados no campo de bairro
    const isPiraquara = normalizar(bairro).includes("piraquara");
    const isCuritiba = normalizar(bairro).includes("curitiba");
    
    let cidadeReal = cidade;
    if (isPiraquara) cidadeReal = "Piraquara, Paraná, Brasil";
    if (isCuritiba) cidadeReal = "Curitiba, Paraná, Brasil";
    
    const tentativas = [];
    
    // Tenta 1: Muito especifico (Rua, Número, Bairro, Cidade)
    if (numLimpo && bairro) tentativas.push(`${rua}, ${numLimpo}, ${bairro}, ${cidadeReal}`);
    
    // Tenta 2: Rua, Bairro, Cidade (remove o número que costuma quebrar a API)
    if (bairro) tentativas.push(`${rua}, ${bairro}, ${cidadeReal}`);
    
    // Tenta 3: Rua, Número, Cidade
    if (numLimpo) tentativas.push(`${rua}, ${numLimpo}, ${cidadeReal}`);
    
    // Tenta 4: Rua, Cidade
    tentativas.push(`${rua}, ${cidadeReal}`);

    for (const ender of tentativas) {
        try {
            const encoded = encodeURIComponent(ender);
            const res = await fetch(`https://us1.locationiq.com/v1/search.php?key=${LOCATIONIQ_KEY}&q=${encoded}&format=json&limit=1&addressdetails=1`);
            const data = await res.json();
            
            if (data && data.length > 0 && data[0].lat && data[0].lon) {
                // Apenas verifica se encontrou a rua certa na cidade
                const valido = validarEndereco(data[0], rua);
                if (valido) {
                    return {
                        lat: parseFloat(data[0].lat),
                        lng: parseFloat(data[0].lon),
                        // Se encontramos usando o endereço exato com número, marcamos preciso = true
                        preciso: ender.includes(numLimpo) && numLimpo !== ''
                    };
                }
            }
        } catch (e) {
            console.error('Erro na cascata para', ender, ':', e.message);
        }
        await new Promise(r => setTimeout(r, 600)); // rate limit API
    }
    
    // Fallback bairro fixo
    const bairroLower = bairro ? bairro.toLowerCase().trim() : '';
    if (BAIRROS_COORDS[bairroLower]) {
        const [lat, lng] = BAIRROS_COORDS[bairroLower];
        return { lat, lng, preciso: false };
    }
    
    return { lat: -25.5317, lng: -49.2921, preciso: false };
}


// -------------------------------------------------------------
// ROTAS DE COORDENADAS
// -------------------------------------------------------------

app.post('/api/recalcular-coordenadas', async (req, res) => {
    try {
        const [apoiadores] = await pool.query('SELECT * FROM apoiadores');
        
        let atualizados = 0;
        let erros = 0;
        
        for (const apoiador of apoiadores) {
            const resultado = await buscarCoordenadasCascata(apoiador.rua, apoiador.numero, apoiador.bairro);
            
            if (resultado && resultado.lat) {
                await pool.execute('UPDATE apoiadores SET latitude = ?, longitude = ?, coordenadas_precisas = ? WHERE id = ?', 
                    [resultado.lat, resultado.lng, resultado.preciso ? 1 : 0, apoiador.id]);
                atualizados++;
            } else {
                erros++;
            }
        }
        
        res.json({ message: 'Coordenadas recalculadas', atualizados, erros, total: apoiadores.length });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar apoiadores' });
    }
});

app.get('/api/geocodificar', async (req, res) => {
    const { rua, numero, bairro } = req.query;
    if (!rua || !bairro) return res.status(400).json({ error: 'Rua e bairro são obrigatórios' });
    
    const result = await buscarCoordenadasCascata(rua, numero, bairro);
    res.json(result);
});

app.get('/api/coordenadas-cache/get', async (req, res) => {
    try {
        const { rua, numero, bairro } = req.query;
        if (!rua || !bairro) return res.status(400).json({ error: 'Rua e bairro são obrigatórios' });
        
        const ruaNorm = rua.toLowerCase().trim();
        const numLimpo = limparNumero(numero);
        const bairroNorm = bairro.toLowerCase().trim();
        
        const [rows] = await pool.execute(`
            SELECT latitude, longitude, preciso FROM coordenadas_cache 
            WHERE LOWER(rua) = ? AND LOWER(IFNULL(numero, '')) = ? AND LOWER(bairro) = ?
        `, [ruaNorm, numLimpo, bairroNorm]);
        
        if (rows.length > 0) {
            return res.json({
                lat: rows[0].latitude,
                lng: rows[0].longitude,
                preciso: rows[0].preciso === 1,
                fromCache: true
            });
        }
        res.json(null);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao buscar coordenadas' });
    }
});

app.post('/api/coordenadas-cache/save', async (req, res) => {
    try {
        const { rua, numero, bairro, latitude, longitude, preciso } = req.body;
        if (!rua || !bairro || latitude === undefined || longitude === undefined) {
            return res.status(400).json({ error: 'Dados incompletos' });
        }
        
        const numLimpo = limparNumero(numero);
        
        await pool.execute(`
            INSERT INTO coordenadas_cache (rua, numero, bairro, latitude, longitude, preciso)
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE latitude = VALUES(latitude), longitude = VALUES(longitude), preciso = VALUES(preciso)
        `, [
            rua.toLowerCase().trim(),
            numLimpo ? numLimpo : null,
            bairro.toLowerCase().trim(),
            latitude,
            longitude,
            preciso !== false
        ]);
        res.json({ message: 'Coordenadas salvas no cache' });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao salvar coordenadas' });
    }
});

app.get('/api/coordenadas-cache', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM coordenadas_cache ORDER BY rua, bairro');
        res.json(rows || []);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao listar coordenadas' });
    }
});

app.get('/api/geocodificar-com-cache', async (req, res) => {
    const { rua, numero, bairro } = req.query;
    if (!rua || !bairro) return res.status(400).json({ error: 'Rua e bairro são obrigatórios' });
    
    const ruaNorm = rua.toLowerCase().trim();
    const numLimpo = limparNumero(numero);
    const bairroNorm = bairro.toLowerCase().trim();
    
    try {
        const [cachedRows] = await pool.execute(`
            SELECT latitude, longitude, preciso FROM coordenadas_cache 
            WHERE LOWER(rua) = ? AND LOWER(IFNULL(numero, '')) = ? AND LOWER(bairro) = ?
        `, [ruaNorm, numLimpo, bairroNorm]);
        
        if (cachedRows.length > 0) {
            return res.json({
                lat: cachedRows[0].latitude,
                lng: cachedRows[0].longitude,
                preciso: cachedRows[0].preciso === 1,
                fromCache: true
            });
        }
        
        const result = await buscarCoordenadasCascata(rua, numero, bairro);
        
        await pool.execute(`
            INSERT INTO coordenadas_cache (rua, numero, bairro, latitude, longitude, preciso)
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE latitude = VALUES(latitude), longitude = VALUES(longitude), preciso = VALUES(preciso)
        `, [ruaNorm, numLimpo || null, bairroNorm, result.lat, result.lng, result.preciso]);
        
        res.json({ ...result, fromCache: false });
        
    } catch (error) {
        console.error('Erro na API com cache:', error);
        res.status(500).json({ error: 'Erro interno na geocodificação' });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
