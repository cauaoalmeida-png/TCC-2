const { z } = require('zod');

const criarGuindaste = z.object({
    body: z.object({
        modelo: z.string({ error: 'O modelo do guindaste é obrigatório.' }).trim().min(2, 'O modelo do guindaste é obrigatório.').max(100),
        identificacao: z.string().trim().max(100).optional()
    })
});

const alugarGuindaste = z.object({
    body: z.object({
        guindasteId: z.number({ error: 'guindasteId precisa ser um número.' }).int().positive('guindasteId precisa ser maior que zero.'),
        cliente: z.string({ error: 'cliente é obrigatório.' }).trim().min(2, 'cliente precisa ter ao menos 2 letras.').max(150),
        dataPrevistaDevolucao: z.iso.date({ error: 'dataPrevistaDevolucao precisa estar no formato AAAA-MM-DD.' })
    })
});

module.exports = { criarGuindaste, alugarGuindaste };
