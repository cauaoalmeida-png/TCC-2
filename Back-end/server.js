/* ============================================
   FactoryTrack — Back-end (Node.js + Express + MySQL)
   Todas as rotas usadas pelo front-end (JS/ e PAGES/) estão
   implementadas aqui: setores, máquinas, ocorrências e estoque.
   ============================================ */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise'); // versão com Promises (permite async/await)

const app = express();
app.use(express.json());

// ------------------------------------------------------------
// CORS: em produção, restrinja ao domínio do seu front-end
// hospedado (defina FRONTEND_URL no .env, ex: https://factorytrack.vercel.app).
// Se FRONTEND_URL não for definida (ex: rodando local), libera geral —
// bom para desenvolvimento, mas troque antes de apresentar o projeto no ar.
// ------------------------------------------------------------
const FRONTEND_URL = process.env.FRONTEND_URL;
app.use(cors({
    origin: FRONTEND_URL || '*'
}));

const PORT = process.env.PORT || 3000;

// ------------------------------------------------------------
// Conexão com o banco (pool: reconecta sozinho, aguenta várias
// requisições ao mesmo tempo — mais robusto que uma conexão única)
// ------------------------------------------------------------
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '', // No XAMPP a senha padrão é vazia
    database: process.env.DB_NAME || 'factorytrack_db',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10
});

// Testa a conexão assim que o servidor sobe
(async () => {
    try {
        const conn = await pool.getConnection();
        console.log('✅ Conectado ao banco de dados MySQL (factorytrack_db) com sucesso!');
        conn.release();
    } catch (err) {
        console.error('❌ Erro ao conectar ao banco de dados:', err.message);
        console.error('   Verifique se o MySQL/XAMPP está rodando e se o banco foi criado (veja db.sql).');
    }
})();

// Rota simples para checar se a API está de pé
app.get('/', (req, res) => {
    res.json({ status: 'ok', mensagem: 'API FactoryTrack rodando 🚀' });
});

// ==========================================
// ROTAS DE SETORES
// ==========================================

// Cadastrar setor
app.post('/cadastrar-setor', async (req, res) => {
    const { nome_setor, responsavel } = req.body;

    if (!nome_setor || !responsavel) {
        return res.status(400).json({ erro: 'nome_setor e responsavel são obrigatórios.' });
    }

    try {
        const sql = 'INSERT INTO setores (nome_setor, responsavel) VALUES (?, ?)';
        const [result] = await pool.query(sql, [nome_setor, responsavel]);
        res.status(201).json({ id: result.insertId, nome_setor, responsavel });
    } catch (err) {
        console.error('❌ Erro ao cadastrar setor:', err.message);
        res.status(500).json({ erro: 'Erro ao cadastrar setor.' });
    }
});

// Buscar todos os setores
app.get('/setores', async (req, res) => {
    try {
        const [results] = await pool.query('SELECT * FROM setores ORDER BY id');
        res.status(200).json(results);
    } catch (err) {
        console.error('❌ Erro ao buscar setores:', err.message);
        res.status(500).json({ erro: 'Erro ao buscar setores.' });
    }
});

// Deletar setor
app.delete('/deletar-setor/:id', async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM setores WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ erro: 'Setor não encontrado.' });
        }
        res.status(200).json({ mensagem: 'Setor deletado com sucesso!' });
    } catch (err) {
        console.error('❌ Erro ao deletar setor:', err.message);
        res.status(500).json({ erro: 'Erro ao deletar setor.' });
    }
});

// ==========================================
// ROTAS DE MÁQUINAS
// ==========================================

// Cadastrar máquina
app.post('/cadastrar-maquina', async (req, res) => {
    const { nome_maquina, setor_associado, numero_serie } = req.body;

    if (!nome_maquina || !setor_associado) {
        return res.status(400).json({ erro: 'nome_maquina e setor_associado são obrigatórios.' });
    }

    try {
        const sql = 'INSERT INTO maquinas (nome_maquina, setor_associado, numero_serie) VALUES (?, ?, ?)';
        const [result] = await pool.query(sql, [nome_maquina, setor_associado, numero_serie || null]);
        res.status(201).json({ id: result.insertId, nome_maquina, setor_associado, numero_serie });
    } catch (err) {
        console.error('❌ Erro ao cadastrar máquina:', err.message);
        res.status(500).json({ erro: 'Erro ao cadastrar máquina.' });
    }
});

// Buscar todas as máquinas
app.get('/maquinas', async (req, res) => {
    try {
        const [results] = await pool.query('SELECT * FROM maquinas ORDER BY id');
        res.status(200).json(results);
    } catch (err) {
        console.error('❌ Erro ao buscar máquinas:', err.message);
        res.status(500).json({ erro: 'Erro ao buscar máquinas.' });
    }
});

// Deletar máquina
app.delete('/deletar-maquina/:id', async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM maquinas WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ erro: 'Máquina não encontrada.' });
        }
        res.status(200).json({ mensagem: 'Máquina deletada com sucesso!' });
    } catch (err) {
        console.error('❌ Erro ao deletar máquina:', err.message);
        res.status(500).json({ erro: 'Erro ao deletar máquina.' });
    }
});

// ==========================================
// ROTAS DE OCORRÊNCIAS (registro + checklist)
// ==========================================

// Cadastrar nova ocorrência (usada em ocorrencia.html e checklist.html)
app.post('/cadastrar-ocorrencia', async (req, res) => {
    const { data, setor, maquina, tipo, operador, turno, descricao, status, resolucao, itensChecklist } = req.body;

    if (!setor || !maquina || !tipo || !operador || !turno) {
        return res.status(400).json({ erro: 'setor, maquina, tipo, operador e turno são obrigatórios.' });
    }

    // Transforma a lista de itens do checklist em texto para salvar no MySQL
    const itensString = itensChecklist ? JSON.stringify(itensChecklist) : null;
    const dataOcorrencia = data || new Date().toISOString();

    try {
        const sql = `INSERT INTO ocorrencias
            (data, setor, maquina, tipo, operador, turno, descricao, status, resolucao, itensChecklist)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const [result] = await pool.query(sql, [
            dataOcorrencia, setor, maquina, tipo, operador, turno,
            descricao || '', status || 'Pendente', resolucao || '', itensString
        ]);

        res.status(201).json({ id: result.insertId, mensagem: 'Registrado com sucesso!' });
    } catch (err) {
        console.error('❌ Erro ao registrar ocorrência/checklist:', err.message);
        res.status(500).json({ erro: 'Erro ao registrar ocorrência/checklist.' });
    }
});

// Buscar todas as ocorrências (usada em historico.html, painel.html e exportação)
app.get('/ocorrencias', async (req, res) => {
    try {
        const [results] = await pool.query('SELECT * FROM ocorrencias ORDER BY data DESC');

        // Converte itensChecklist de volta para array/objeto antes de responder
        const ocorrencias = results.map(o => ({
            ...o,
            itensChecklist: o.itensChecklist ? JSON.parse(o.itensChecklist) : null
        }));

        res.status(200).json(ocorrencias);
    } catch (err) {
        console.error('❌ Erro ao buscar ocorrências:', err.message);
        res.status(500).json({ erro: 'Erro ao buscar ocorrências.' });
    }
});

// Marcar ocorrência como resolvida (usada em historico.html)
app.put('/resolver-ocorrencia/:id', async (req, res) => {
    const { id } = req.params;
    const { resolucao, dataResolucao } = req.body;

    if (!resolucao) {
        return res.status(400).json({ erro: 'O campo resolucao é obrigatório.' });
    }

    try {
        const sql = `UPDATE ocorrencias
            SET status = 'Resolvido', resolucao = ?, dataResolucao = ?
            WHERE id = ?`;
        const [result] = await pool.query(sql, [resolucao, dataResolucao || new Date().toISOString(), id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ erro: 'Ocorrência não encontrada.' });
        }
        res.status(200).json({ mensagem: 'Ocorrência marcada como resolvida!' });
    } catch (err) {
        console.error('❌ Erro ao resolver ocorrência:', err.message);
        res.status(500).json({ erro: 'Erro ao resolver ocorrência.' });
    }
});

// ==========================================
// ROTAS DE ESTOQUE (peças)
// ==========================================

// Buscar todas as peças
app.get('/pecas', async (req, res) => {
    try {
        const [results] = await pool.query('SELECT * FROM pecas ORDER BY id');
        res.status(200).json(results);
    } catch (err) {
        console.error('❌ Erro ao buscar estoque:', err.message);
        res.status(500).json({ erro: 'Erro ao buscar estoque.' });
    }
});

// Cadastrar nova peça (usada em estoque.html)
app.post('/cadastrar-peca', async (req, res) => {
    const { nome, categoria, qtd, min, unidade } = req.body;

    if (!nome || qtd === undefined || min === undefined) {
        return res.status(400).json({ erro: 'nome, qtd e min são obrigatórios.' });
    }

    try {
        const sql = 'INSERT INTO pecas (nome, categoria, qtd, min, unidade) VALUES (?, ?, ?, ?, ?)';
        const [result] = await pool.query(sql, [nome, categoria || null, qtd, min, unidade || null]);
        res.status(201).json({ id: result.insertId, nome, categoria, qtd, min, unidade });
    } catch (err) {
        console.error('❌ Erro ao cadastrar peça:', err.message);
        res.status(500).json({ erro: 'Erro ao cadastrar peça.' });
    }
});

// Atualizar a quantidade de uma peça (usar ou repor — estoque.html envia o valor final)
app.put('/atualizar-peca/:id', async (req, res) => {
    const { id } = req.params;
    const { qtd } = req.body;

    if (qtd === undefined || isNaN(qtd) || qtd < 0) {
        return res.status(400).json({ erro: 'qtd inválida.' });
    }

    try {
        const [result] = await pool.query('UPDATE pecas SET qtd = ? WHERE id = ?', [qtd, id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ erro: 'Peça não encontrada.' });
        }
        res.status(200).json({ mensagem: 'Estoque atualizado!' });
    } catch (err) {
        console.error('❌ Erro ao atualizar quantidade:', err.message);
        res.status(500).json({ erro: 'Erro ao atualizar quantidade.' });
    }
});

// Deletar uma peça
app.delete('/deletar-peca/:id', async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM pecas WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ erro: 'Peça não encontrada.' });
        }
        res.status(200).json({ mensagem: 'Peça deletada!' });
    } catch (err) {
        console.error('❌ Erro ao deletar peça:', err.message);
        res.status(500).json({ erro: 'Erro ao deletar peça.' });
    }
});

// ==========================================
// Rota "coringa" — qualquer caminho não mapeado cai aqui
// ==========================================
app.use((req, res) => {
    res.status(404).json({ erro: `Rota não encontrada: ${req.method} ${req.originalUrl}` });
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
