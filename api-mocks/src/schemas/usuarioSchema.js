const { z } = require('zod');
const { idParam } = require('./comum');

const cargos = ['operador', 'gerente', 'chefe_geral'];

const login = z.object({
    body: z.object({
        usuario: z.email('Informe um e-mail válido.'),
        senha: z.string({ error: 'A senha é obrigatória.' }).min(1, 'A senha é obrigatória.')
    })
});

const criarUsuario = z.object({
    body: z.object({
        nome: z.string({ error: 'O nome é obrigatório.' }).trim().min(1, 'O nome é obrigatório.').max(100),
        usuario: z.email('Informe um e-mail corporativo válido.').max(100),
        senha: z.string({ error: 'A senha é obrigatória.' })
            .min(8, 'A senha precisa ter no mínimo 8 caracteres.')
            .max(256),
        cargo: z.enum(cargos, { error: 'Cargo deve ser operador, gerente ou chefe_geral.' })
    })
});

const alterarStatus = z.object({
    params: idParam,
    body: z.object({
        ativo: z.boolean({ error: 'O campo ativo precisa ser true ou false.' })
    })
});

const alterarCargo = z.object({
    params: idParam,
    body: z.object({
        cargo: z.enum(cargos, { error: 'Cargo deve ser operador, gerente ou chefe_geral.' })
    })
});

module.exports = { login, criarUsuario, alterarStatus, alterarCargo };
