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
            data_cadastro DATE DEFAULT CURRENT_DATE,
            hora_cadastro TIME DEFAULT CURRENT_TIME
        )
    `);
});

app.post('/api/apoiadores', (req, res) => {
    const { nome, rua, numero, bairro, telefone, email, latitude, longitude } = req.body;
    
    if (!nome || !rua || !numero || !bairro) {
        return res.status(400).json({ error: 'Nome, rua, número e bairro são obrigatórios' });
    }
    
    const stmt = db.prepare(`
        INSERT INTO apoiadores (nome, rua, numero, bairro, telefone, email, latitude, longitude)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(nome, rua, numero, bairro, telefone || null, email || null, latitude || null, longitude || null, function(err) {
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
    const { nome, rua, numero, bairro, telefone, email } = req.body;
    
    if (!nome || !rua || !numero || !bairro) {
        return res.status(400).json({ error: 'Nome, rua, número e bairro são obrigatórios' });
    }
    
    const stmt = db.prepare(`
        UPDATE apoiadores 
        SET nome = ?, rua = ?, numero = ?, bairro = ?, telefone = ?, email = ?
        WHERE id = ?
    `);
    
    stmt.run(nome, rua, numero, bairro, telefone || null, email || null, id, function(err) {
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

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
