const { z } = require('zod');

const criarSetor = z.object({
    body: z.object({
        nome_setor: z.string({ error: 'nome_setor é obrigatório.' }).trim().min(2, 'nome_setor precisa ter ao menos 2 letras.').max(100),
        responsavel: z.string({ error: 'responsavel é obrigatório.' }).trim().min(2, 'responsavel precisa ter ao menos 2 letras.').max(100)
    })
});

module.exports = { criarSetor };
