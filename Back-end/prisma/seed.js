// Dados de exemplo (os mesmos do db.sql) para a demonstração.
// Só insere em tabelas vazias, então pode rodar a cada deploy sem duplicar.
//   npm run seed

require('dotenv').config();
const { createDatabase } = require('../src/database');

async function main() {
    const { prisma } = createDatabase();
    try {
        if (await prisma.setor.count() === 0) {
            await prisma.setor.createMany({
                data: [
                    { nomeSetor: 'Montagem', responsavel: 'Carlos Silva' },
                    { nomeSetor: 'Qualidade', responsavel: 'Ana Paula' },
                    { nomeSetor: 'Expedição', responsavel: 'Roberto Melo' },
                    { nomeSetor: 'Manutenção', responsavel: 'José Ferreira' }
                ]
            });
            console.log('Setores de exemplo criados.');
        }
        if (await prisma.maquina.count() === 0) {
            await prisma.maquina.createMany({
                data: [
                    { nomeMaquina: 'Esteira Linha A', setorAssociado: 'Montagem', numeroSerie: 'EST-001' },
                    { nomeMaquina: 'Parafusadeira Automática', setorAssociado: 'Montagem', numeroSerie: 'PAF-002' },
                    { nomeMaquina: 'Mesa de Inspeção Visual', setorAssociado: 'Qualidade', numeroSerie: 'INS-003' },
                    { nomeMaquina: 'Calibrador Digital', setorAssociado: 'Qualidade', numeroSerie: 'CAL-004' },
                    { nomeMaquina: 'Empilhadeira Elétrica', setorAssociado: 'Expedição', numeroSerie: 'EMP-005' },
                    { nomeMaquina: 'Balança Industrial', setorAssociado: 'Expedição', numeroSerie: 'BAL-006' },
                    { nomeMaquina: 'Compressor de Ar', setorAssociado: 'Manutenção', numeroSerie: 'CMP-007' }
                ]
            });
            console.log('Máquinas de exemplo criadas.');
        }
        if (await prisma.peca.count() === 0) {
            await prisma.peca.createMany({
                data: [
                    { nome: 'Parafuso M6', categoria: 'Fixação', qtd: 500, min: 100, unidade: 'un' },
                    { nome: 'Correia Esteira A', categoria: 'Peça de máquina', qtd: 3, min: 2, unidade: 'un' },
                    { nome: 'Óleo Lubrificante', categoria: 'Insumo', qtd: 12, min: 5, unidade: 'l' },
                    { nome: 'Filtro de Ar Compressor', categoria: 'Manutenção', qtd: 1, min: 2, unidade: 'un' }
                ]
            });
            console.log('Peças de exemplo criadas.');
        }
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((err) => {
    console.error('Erro ao inserir dados de exemplo:', err.message);
    process.exit(1);
});
