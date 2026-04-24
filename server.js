const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Default URL if not provided via environment
const DATABASE_URL = process.env.DATABASE_URL || 'mariadb://mariadb:oa6qhwd1qvc8y1uq0jap@develop_marcianogoggia:3306/marcianogoggia_db';

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

        // Seed initial data if empty
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

app.post('/api/recalcular-coordenadas', async (req, res) => {
    const LOCATIONIQ_KEY = 'pk.49f935195ce927d0901526065edf509c';
    
    try {
        const [apoiadores] = await pool.query('SELECT * FROM apoiadores');
        
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
                    
                    await pool.execute('UPDATE apoiadores SET latitude = ?, longitude = ? WHERE id = ?', 
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
    } catch (err) {
        res.status(500).json({ error: 'Erro ao buscar apoiadores' });
    }
});

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

app.get('/api/geocodificar', async (req, res) => {
    const { rua, numero, bairro } = req.query;
    
    if (!rua || !numero || !bairro) {
        return res.status(400).json({ error: 'Rua, número e bairro são obrigatórios' });
    }
    
    const LOCATIONIQ_KEY = 'pk.49f935195ce927d0901526065edf509c';
    
    try {
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

app.get('/api/coordenadas-cache/get', async (req, res) => {
    try {
        const { rua, numero, bairro } = req.query;
        if (!rua || !bairro) return res.status(400).json({ error: 'Rua e bairro são obrigatórios' });
        
        const ruaNorm = rua.toLowerCase().trim();
        const numeroNorm = numero ? numero.toLowerCase().trim() : '';
        const bairroNorm = bairro.toLowerCase().trim();
        
        const [rows] = await pool.execute(`
            SELECT latitude, longitude, preciso FROM coordenadas_cache 
            WHERE LOWER(rua) = ? AND LOWER(IFNULL(numero, '')) = ? AND LOWER(bairro) = ?
        `, [ruaNorm, numeroNorm, bairroNorm]);
        
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
        
        await pool.execute(`
            INSERT INTO coordenadas_cache (rua, numero, bairro, latitude, longitude, preciso)
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE latitude = VALUES(latitude), longitude = VALUES(longitude), preciso = VALUES(preciso)
        `, [
            rua.toLowerCase().trim(),
            numero ? numero.toLowerCase().trim() : null,
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
    
    if (!rua || !numero || !bairro) {
        return res.status(400).json({ error: 'Rua, número e bairro são obrigatórios' });
    }
    
    const LOCATIONIQ_KEY = 'pk.49f935195ce927d0901526065edf509c';
    
    const ruaNorm = rua.toLowerCase().trim();
    const numeroNorm = numero ? numero.toLowerCase().trim() : '';
    const bairroNorm = bairro.toLowerCase().trim();
    
    try {
        const [cachedRows] = await pool.execute(`
            SELECT latitude, longitude, preciso FROM coordenadas_cache 
            WHERE LOWER(rua) = ? AND LOWER(IFNULL(numero, '')) = ? AND LOWER(bairro) = ?
        `, [ruaNorm, numeroNorm, bairroNorm]);
        
        if (cachedRows.length > 0) {
            return res.json({
                lat: cachedRows[0].latitude,
                lng: cachedRows[0].longitude,
                preciso: cachedRows[0].preciso === 1,
                fromCache: true
            });
        }
        
        const enderecoSJP = `${rua}, ${numero}, ${bairro}, São José dos Pinhais, Paraná, Brasil`;
        const encodedAddr = encodeURIComponent(enderecoSJP);
        const response = await fetch(`https://us1.locationiq.com/v1/search.php?key=${LOCATIONIQ_KEY}&q=${encodedAddr}&format=json&limit=1&addressdetails=1`);
        
        let data = await response.json();
        let valido = false;
        
        if (data && data.length > 0 && data[0].lat && data[0].lon) {
            valido = validarEndereco(data[0], rua, numero, bairro);
        } else {
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
            const bairroLower = bairro.toLowerCase().trim();
            if (BAIRROS_COORDS[bairroLower]) {
                [lat, lng] = BAIRROS_COORDS[bairroLower];
            } else {
                lat = -25.5317;
                lng = -49.2921;
            }
            preciso = false;
        }
        
        await pool.execute(`
            INSERT INTO coordenadas_cache (rua, numero, bairro, latitude, longitude, preciso)
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE latitude = VALUES(latitude), longitude = VALUES(longitude), preciso = VALUES(preciso)
        `, [ruaNorm, numeroNorm || null, bairroNorm, lat, lng, preciso]);
        
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

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
