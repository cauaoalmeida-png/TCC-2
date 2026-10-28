const { z } = require('zod');
const { idParam } = require('./comum');

const criarPeca = z.object({
    body: z.object({
        nome: z.string({ error: 'nome é obrigatório.' }).trim().min(2, 'nome precisa ter ao menos 2 letras.').max(100),
        categoria: z.string().trim().max(50).optional(),
        qtd: z.number({ error: 'qtd precisa ser um número.' }).int('qtd precisa ser inteiro.').min(0, 'qtd não pode ser negativa.'),
        min: z.number({ error: 'min precisa ser um número.' }).int('min precisa ser inteiro.').min(0, 'min não pode ser negativo.'),
        unidade: z.string().trim().max(20).optional()
    })
});

const atualizarPeca = z.object({
    params: idParam,
    body: z.object({
        qtd: z.number({ error: 'qtd precisa ser um número.' }).int('qtd precisa ser inteiro.').min(0, 'qtd não pode ser negativa.')
    })
});

module.exports = { criarPeca, atualizarPeca };
