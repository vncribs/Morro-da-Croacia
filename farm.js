const { 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    EmbedBuilder, 
    PermissionsBitField 
} = require('discord.js');
const fs = require('fs');

const metasPath = './metas.json';
const pastasUsuarios = {}; // Guarda ID do canal criado por usuário

module.exports = {
    enviarPainelFarm: async (client) => {
        try {
            const canalFarm = await client.channels.fetch('1410019523830222961');
            const categoriaFarm = '1409980384547967077';

            if (!canalFarm) return console.log('Canal do farm não encontrado!');

            const embedPainel = new EmbedBuilder()
                .setColor('#00FF7F')
                .setTitle('📦 Painel do Farm')
                .setDescription('Clique nos botões abaixo para abrir sua pasta ou visualizar as metas.');

            const botoesPainel = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('farm_abrir_pasta')
                        .setLabel('Abrir Pasta')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('farm_visualizar_metas')
                        .setLabel('Visualizar Metas')
                        .setStyle(ButtonStyle.Secondary)
                );

            await canalFarm.send({ embeds: [embedPainel], components: [botoesPainel] });
            console.log('Painel do farm enviado com sucesso!');
        } catch (error) {
            console.error('Erro ao enviar painel do farm:', error);
        }
    },

    handleInteraction: async (interaction) => {
        if (!interaction.isButton()) return;

        const categoriaFarm = '1409980384547967077';

        function criarEmbedMetas() {
            let metas = {};
            try {
                if (fs.existsSync(metasPath)) {
                    metas = JSON.parse(fs.readFileSync(metasPath));
                }
            } catch (err) {
                console.error('Erro ao ler metas.json:', err);
            }

            const ITEM_EMOJIS = {
                FARINHA: '🌾',
                ÓPIO: '🌷',
                FOLHA: '🌿',
                EMBALAGEM: '📦'
            };

            if (Object.keys(metas).length > 0) {
                return new EmbedBuilder()
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
                return new EmbedBuilder()
                    .setTitle('📊 Metas Atuais')
                    .setColor('#FF0000')
                    .setDescription('Ainda não há metas definidas.');
            }
        }

        const userId = interaction.user.id;

        // VISUALIZAR METAS DO PAINEL
        if (interaction.customId === 'farm_visualizar_metas') {
            try {
                await interaction.deferReply({ flags: 64 });
                await interaction.editReply({ embeds: [criarEmbedMetas()] });
            } catch (err) {
                console.error('Erro ao mostrar metas do painel:', err);
            }
            return;
        }

        // ABRIR PASTA
        if (interaction.customId === 'farm_abrir_pasta') {
            try {
                await interaction.deferReply({ flags: 64 });

                // Se já existe pasta do usuário, leva pra lá
                if (pastasUsuarios[userId]) {
                    const canalExistente = interaction.guild.channels.cache.get(pastasUsuarios[userId]);
                    if (canalExistente) {
                        return await interaction.editReply({ content: `Sua pasta já existe: ${canalExistente}` });
                    }
                }

                // Cria nova pasta
                const guild = interaction.guild;
                const pasta = await guild.channels.create({
                    name: `farm-${interaction.user.username}`,
                    type: 0,
                    parent: categoriaFarm,
                    permissionOverwrites: [
                        {
                            id: guild.id,
                            deny: [PermissionsBitField.Flags.ViewChannel],
                        },
                        {
                            id: userId,
                            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                        },
                    ],
                });

                pastasUsuarios[userId] = pasta.id;

                const embedPasta = new EmbedBuilder()
                    .setColor('#FFA500')
                    .setTitle(`📁 Pasta de ${interaction.user.username}`)
                    .setDescription('Use os botões abaixo para gerenciar sua pasta ou visualizar as metas.');

                const botoesPasta = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('farm_fechar_pasta')
                            .setLabel('Fechar Pasta')
                            .setStyle(ButtonStyle.Danger),
                        new ButtonBuilder()
                            .setCustomId('farm_visualizar_metas_pasta')
                            .setLabel('Visualizar Metas')
                            .setStyle(ButtonStyle.Secondary)
                    );

                await pasta.send({ embeds: [embedPasta], components: [botoesPasta] });

                // Edita botão no painel para indicar pasta criada
                const msg = await interaction.message.fetch();
                const componentes = msg.components.map(row => {
                    row.components = row.components.map(btn => {
                        if (btn.data.custom_id === 'farm_abrir_pasta') {
                            btn.data.label = 'Pasta criada ✅';
                        }
                        return btn;
                    });
                    return row;
                });

                await msg.edit({ components });

                await interaction.editReply({ content: `Sua pasta foi criada: ${pasta}` });

            } catch (err) {
                console.error('Erro ao abrir pasta:', err);
                try {
                    if (!interaction.replied && !interaction.deferred)
                        await interaction.reply({ content: '❌ Erro ao criar a pasta.', flags: 64 });
                } catch {}
            }
            return;
        }

        // VISUALIZAR METAS NA PASTA
        if (interaction.customId === 'farm_visualizar_metas_pasta') {
            try {
                await interaction.deferReply({ flags: 64 });
                await interaction.editReply({ embeds: [criarEmbedMetas()] });
            } catch (err) {
                console.error('Erro ao mostrar metas na pasta:', err);
            }
            return;
        }

        // FECHAR PASTA
        if (interaction.customId === 'farm_fechar_pasta') {
            const canal = interaction.channel;
            if (!canal) return;
            if (!canal.name.startsWith('farm-')) {
                if (!interaction.replied && !interaction.deferred)
                    await interaction.reply({ content: 'Este botão só funciona dentro de pastas de farm.', flags: 64 });
                return;
            }

            delete pastasUsuarios[userId]; // Limpa pasta do usuário
            await canal.delete().catch(err => console.log(err));
        }
    }
};
