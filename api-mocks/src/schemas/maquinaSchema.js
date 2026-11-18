const { z } = require('zod');

const criarMaquina = z.object({
    body: z.object({
        nome_maquina: z.string({ error: 'nome_maquina é obrigatório.' }).trim().min(2, 'nome_maquina precisa ter ao menos 2 letras.').max(100),
        setor_associado: z.string({ error: 'setor_associado é obrigatório.' }).trim().min(2, 'setor_associado precisa ter ao menos 2 letras.').max(100),
        numero_serie: z.string().trim().max(50).nullable().optional()
    })
});

module.exports = { criarMaquina };
