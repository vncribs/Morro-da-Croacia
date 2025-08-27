const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');

const CHANNEL_CONFIG = "1408614791878283345";
const metasPath = './metas.json';

// Emojis dos itens
const ITEM_EMOJIS = {
    FARINHA: '🌾',
    ÓPIO: '🌷',
    FOLHA: '🌿',
    EMBALAGEM: '📦'
};

// Função para enviar botão "Definir Metas"
async function enviarBotaoDefinirMetas(client) {
    const canal = await client.channels.fetch(CHANNEL_CONFIG);

    // Limpa mensagens antigas com botões
    const mensagens = await canal.messages.fetch({ limit: 50 });
    const mensagensBotao = mensagens.filter(m => m.components.length > 0);
    if (mensagensBotao.size > 0) await canal.bulkDelete(mensagensBotao);

    const rows = [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('definir_metas')
                .setLabel('📊 Definir Metas')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('visualizar_metas')
                .setLabel('👀 Visualizar Metas')
                .setStyle(ButtonStyle.Secondary)
        )
    ];

    const embed = new EmbedBuilder()
        .setTitle('📊 Painel de Metas')
        .setDescription('Clique em "Definir Metas" para ajustar as metas ou "Visualizar Metas" para ver o que já foi definido.')
        .setColor('#00FF7F')
        .setFooter({ text: 'Painel de Metas', iconURL: canal.guild.iconURL() })
        .setTimestamp();

    await canal.send({ embeds: [embed], components: rows });
}

// Setup de listener
function setupConfig(client) {
    // Guarda temporariamente as seleções de cada usuário
    const selecoesTemp = {};

    client.on('interactionCreate', async interaction => {
        if (!interaction.isButton() && !interaction.isStringSelectMenu() && !interaction.isChatInputCommand()) return;

        // Botão Definir Metas
        if (interaction.isButton() && interaction.customId === 'definir_metas') {
            const quantidades = Array.from({ length: 25 }, (_, i) => (i + 1) * 10); // 10 a 250
            const itens = ['FARINHA', 'ÓPIO', 'FOLHA', 'EMBALAGEM'];
            const rows = [];

            itens.forEach(item => {
                const options = quantidades.map(q => ({
                    label: q.toString(),
                    value: q.toString()
                }));

                const select = new StringSelectMenuBuilder()
                    .setCustomId(`quant_${item}`)
                    .setPlaceholder(`${ITEM_EMOJIS[item]} ${item}`)
                    .addOptions(options);

                const row = new ActionRowBuilder().addComponents(select);
                rows.push(row);
            });

            // Botão ENVIAR
            const enviarButton = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('enviar_metas')
                    .setLabel('📤 ENVIAR')
                    .setStyle(ButtonStyle.Success)
            );

            await interaction.reply({
                content: 'Selecione a quantidade de cada item e clique em ENVIAR:',
                components: [...rows, enviarButton],
                ephemeral: true
            });
        }

        // Captura valores do SelectMenu e guarda temporariamente
        if (interaction.isStringSelectMenu() && interaction.customId.startsWith('quant_')) {
            const item = interaction.customId.replace('quant_', '');
            if (!selecoesTemp[interaction.user.id]) selecoesTemp[interaction.user.id] = {};
            selecoesTemp[interaction.user.id][item] = parseInt(interaction.values[0]);
            await interaction.deferUpdate(); // atualiza seleção local sem enviar mensagem
        }

        // Botão ENVIAR
        if (interaction.isButton() && interaction.customId === 'enviar_metas') {
            const usuarioId = interaction.user.id;
            const metas = selecoesTemp[usuarioId] || {};

            if (Object.keys(metas).length === 0) {
                return await interaction.reply({ content: '⚠️ Você precisa selecionar pelo menos uma meta antes de enviar.', ephemeral: true });
            }

            // Salva no metas.json
            fs.writeFileSync(metasPath, JSON.stringify(metas, null, 2));

            // Limpa seleção temporária do usuário
            delete selecoesTemp[usuarioId];

            await interaction.update({ content: '✅ Metas enviadas e salvas!', components: [] });
        }

        // Botão Visualizar Metas
        if (interaction.isButton() && interaction.customId === 'visualizar_metas') {
            let embed;
            let metas = {};

            try {
                if (fs.existsSync(metasPath)) {
                    metas = JSON.parse(fs.readFileSync(metasPath));
                }
            } catch (err) {
                console.error('Erro ao ler metas.json:', err);
            }

            if (Object.keys(metas).length > 0) {
                embed = new EmbedBuilder()
                    .setTitle('📊 Metas Atuais')
                    .setColor('#00FF7F')
                    .setTimestamp()
                    .setDescription('Aqui estão as metas definidas atualmente:')
                    .addFields(
                        { name: `${ITEM_EMOJIS.FARINHA} FARINHA`, value: `ㅤㅤ${metas.FARINHA || 0}`, inline: true },
                        { name: '\u200B', value: '\u200B', inline: true },
                        { name: `${ITEM_EMOJIS.ÓPIO} ÓPIO`, value: `ㅤㅤ${metas.ÓPIO || 0}`, inline: true },
                        { name: `${ITEM_EMOJIS.FOLHA} FOLHA`, value: `ㅤㅤ${metas.FOLHA || 0}`, inline: true },
                        { name: `ㅤㅤㅤ${ITEM_EMOJIS.EMBALAGEM} EMBALAGEM`, value: `ㅤㅤㅤㅤㅤ${metas.EMBALAGEM || 0}`, inline: true }
                    );
            } else {
                embed = new EmbedBuilder()
                    .setTitle('📊 Metas Atuais')
                    .setColor('#FF0000')
                    .setDescription('Ainda não há metas definidas.');
            }

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // Comando /limparmetas
        if (interaction.isChatInputCommand() && interaction.commandName === 'limparmetas') {
            try {
                if (fs.existsSync(metasPath)) {
                    fs.writeFileSync(metasPath, JSON.stringify({}, null, 2));
                    await interaction.reply({ content: '✅ Todas as metas foram limpas!', ephemeral: true });
                } else {
                    await interaction.reply({ content: '⚠️ Nenhum arquivo de metas encontrado.', ephemeral: true });
                }
            } catch (err) {
                console.error('Erro ao limpar metas:', err);
                await interaction.reply({ content: '❌ Ocorreu um erro ao limpar as metas.', ephemeral: true });
            }
        }
    });
}

module.exports = { enviarBotaoDefinirMetas, setupConfig };
