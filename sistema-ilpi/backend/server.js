const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express(); // 1. Primeiro criamos o app

// 2. Configuramos o CORS corretamente
app.use(cors({
    origin: 'https://sistema-ilpi-app.onrender.com'
}));
app.use(express.json());

// 3. Conexão com o Banco de Dados (USANDO A VARIÁVEL DO RENDER)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Isso pega o link que colamos no Render
  ssl: {
    rejectUnauthorized: false // Necessário para conexões externas no Render
  }
});

// LISTAR
app.get('/residentes', async (req, res) => {
  try {
    const query = `SELECT id, nome, TO_CHAR(data_nascimento, 'YYYY-MM-DD') as nascimento, 
                   TO_CHAR(data_admissao, 'YYYY-MM-DD') as admissao, 
                   contato_emergencia, cep, endereco_rua, numero_casa, anotacoes 
                   FROM residentes ORDER BY id DESC`;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) { res.status(500).json(err); }
});

// CRIAR
app.post('/residentes', async (req, res) => {
  const { nome, nascimento, admissao, emergencia, cep, endereco, numero, anotacoes } = req.body;
  try {
    const query = `INSERT INTO residentes (nome, data_nascimento, data_admissao, contato_emergencia, cep, endereco_rua, numero_casa, anotacoes) 
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`;
    const values = [nome, nascimento || null, admissao || null, emergencia, cep, endereco, numero, anotacoes];
    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json(err); }
});

// EDITAR
app.put('/residentes/:id', async (req, res) => {
  const { id } = req.params;
  const { nome, nascimento, admissao, emergencia, cep, endereco, numero, anotacoes } = req.body;
  try {
    const query = `UPDATE residentes SET nome=$1, data_nascimento=$2, data_admissao=$3, 
                   contato_emergencia=$4, cep=$5, endereco_rua=$6, numero_casa=$7, anotacoes=$8 
                   WHERE id=$9`;
    await pool.query(query, [nome, nascimento || null, admissao || null, emergencia, cep, endereco, numero, anotacoes, id]);
    res.send("Atualizado com sucesso");
  } catch (err) { res.status(500).json(err); }
});

// EXCLUIR
app.delete('/residentes/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM residentes WHERE id = $1', [id]);
    res.send("Excluído com sucesso");
  } catch (err) { res.status(500).json(err); }
});

// Rota para BUSCAR o histórico
app.get('/evolucoes/:residenteId', async (req, res) => {
    try {
        const { residenteId } = req.params;
        const resultado = await pool.query(
            'SELECT * FROM evolucoes WHERE residente_id = $1 ORDER BY data DESC',
            [residenteId]
        );
        res.json(resultado.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao buscar histórico");
    }
});

// Rota para SALVAR evolução
app.post('/evolucoes', async (req, res) => {
    try {
        const { residente_id, profissional, texto } = req.body;
        await pool.query(
            'INSERT INTO evolucoes (residente_id, profissional, texto) VALUES ($1, $2, $3)',
            [residente_id, profissional, texto]
        );
        res.status(201).send("Evolução registrada!");
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao salvar evolução");
    }
});

const PORT = process.env.PORT || 3001; // Render define a porta sozinho
app.listen(PORT, () => console.log(`Backend rodando na porta ${PORT}`));