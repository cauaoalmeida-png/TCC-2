const { z } = require('zod');
const { idParam } = require('./comum');

const tipos = ['Parada de máquina', 'Problema de qualidade', 'Falta de material', 'Manutenção preventiva', 'Checklist', 'Outro'];
const turnos = ['Manhã', 'Tarde', 'Noite'];

const criarOcorrencia = z.object({
    body: z.object({
        setor: z.string({ error: 'setor é obrigatório.' }).trim().min(1, 'setor é obrigatório.').max(100),
        maquina: z.string({ error: 'maquina é obrigatória.' }).trim().min(1, 'maquina é obrigatória.').max(100),
        tipo: z.enum(tipos, { error: `tipo deve ser um destes: ${tipos.join(', ')}.` }),
        turno: z.enum(turnos, { error: 'turno deve ser Manhã, Tarde ou Noite.' }),
        descricao: z.string().max(2000, 'descricao pode ter no máximo 2000 caracteres.').optional(),
        status: z.enum(['Pendente', 'Resolvido']).optional(),
        resolucao: z.string().optional(),
        itensChecklist: z.array(z.object({
            item: z.string().min(1),
            ok: z.boolean()
        })).optional()
    })
});

const resolverOcorrencia = z.object({
    params: idParam,
    body: z.object({
        resolucao: z.string({ error: 'O campo resolucao é obrigatório.' }).trim().min(3, 'Descreva a resolução (mínimo 3 caracteres).'),
        dataResolucao: z.iso.datetime({ error: 'dataResolucao precisa estar no formato ISO (ex.: 2026-10-28T10:00:00Z).' }).optional()
    })
});

module.exports = { criarOcorrencia, resolverOcorrencia };
