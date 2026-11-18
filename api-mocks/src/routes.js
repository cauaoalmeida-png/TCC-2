const { Router } = require('express');
const validar = require('./middlewares/validar');
const { comId } = require('./schemas/comum');

const usuarioSchema = require('./schemas/usuarioSchema');
const setorSchema = require('./schemas/setorSchema');
const maquinaSchema = require('./schemas/maquinaSchema');
const ocorrenciaSchema = require('./schemas/ocorrenciaSchema');
const pecaSchema = require('./schemas/pecaSchema');
const guindasteSchema = require('./schemas/guindasteSchema');

const usuarioController = require('./controllers/usuarioController');
const setorController = require('./controllers/setorController');
const maquinaController = require('./controllers/maquinaController');
const ocorrenciaController = require('./controllers/ocorrenciaController');
const pecaController = require('./controllers/pecaController');
const guindasteController = require('./controllers/guindasteController');

const routes = Router();

routes.get('/api/health', (req, res) => res.json({ status: 'ok', mensagem: 'API de mocks rodando' }));

// LOGIN E USUÁRIOS
routes.post('/login', validar(usuarioSchema.login), usuarioController.login);
routes.get('/me', usuarioController.me);
routes.get('/usuarios', usuarioController.listar);
routes.post('/usuarios', validar(usuarioSchema.criarUsuario), usuarioController.criar);
routes.put('/usuarios/:id/status', validar(usuarioSchema.alterarStatus), usuarioController.alterarStatus);
routes.put('/usuarios/:id/cargo', validar(usuarioSchema.alterarCargo), usuarioController.alterarCargo);

// SETORES
routes.get('/setores', setorController.listar);
routes.post('/cadastrar-setor', validar(setorSchema.criarSetor), setorController.criar);
routes.delete('/deletar-setor/:id', validar(comId), setorController.deletar);

// MÁQUINAS
routes.get('/maquinas', maquinaController.listar);
routes.post('/cadastrar-maquina', validar(maquinaSchema.criarMaquina), maquinaController.criar);
routes.delete('/deletar-maquina/:id', validar(comId), maquinaController.deletar);

// OCORRÊNCIAS (inclui checklist)
routes.get('/ocorrencias', ocorrenciaController.listar);
routes.post('/cadastrar-ocorrencia', validar(ocorrenciaSchema.criarOcorrencia), ocorrenciaController.criar);
routes.put('/resolver-ocorrencia/:id', validar(ocorrenciaSchema.resolverOcorrencia), ocorrenciaController.resolver);
routes.delete('/ocorrencias/:id', validar(comId), ocorrenciaController.deletar);

// ESTOQUE (PEÇAS)
routes.get('/pecas', pecaController.listar);
routes.post('/cadastrar-peca', validar(pecaSchema.criarPeca), pecaController.criar);
routes.put('/atualizar-peca/:id', validar(pecaSchema.atualizarPeca), pecaController.atualizar);
routes.delete('/deletar-peca/:id', validar(comId), pecaController.deletar);

// GUINDASTES E ALUGUÉIS
routes.get('/guindastes', guindasteController.listar);
routes.post('/cadastrar-guindaste', validar(guindasteSchema.criarGuindaste), guindasteController.criar);
routes.delete('/deletar-guindaste/:id', validar(comId), guindasteController.deletar);
routes.get('/alugueis', guindasteController.listarAlugueis);
routes.post('/alugar-guindaste', validar(guindasteSchema.alugarGuindaste), guindasteController.alugar);
routes.put('/devolver-aluguel/:id', validar(comId), guindasteController.devolver);

module.exports = routes;
