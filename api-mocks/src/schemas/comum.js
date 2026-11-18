const { z } = require('zod');

// Valida o :id da URL (precisa ser um número inteiro positivo)
const idParam = z.object({
    id: z.coerce.number({ error: 'O id precisa ser um número.' })
        .int('O id precisa ser inteiro.')
        .positive('O id precisa ser maior que zero.')
});

const comId = z.object({ params: idParam });

module.exports = { idParam, comId };
