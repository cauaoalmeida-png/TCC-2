// Middleware genérico: recebe um schema do Zod e valida body e params
// antes de deixar a requisição chegar no controller.
function validar(schema) {
    return (req, res, next) => {
        const resultado = schema.safeParse({
            body: req.body ?? {},
            params: req.params
        });

        if (!resultado.success) {
            return res.status(400).json({
                erro: 'Dados inválidos.',
                detalhes: resultado.error.issues.map(issue => ({
                    campo: issue.path.slice(1).join('.') || issue.path.join('.'),
                    mensagem: issue.message
                }))
            });
        }

        // Guarda os dados já convertidos/limpos pelo Zod
        req.validado = resultado.data;
        next();
    };
}

module.exports = validar;
