import 'dotenv/config';
import { 
    Client, 
    GatewayIntentBits, 
    Partials, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    TextInputBuilder, 
    TextInputStyle, 
    ModalBuilder, 
    InteractionType,
    EmbedBuilder
} from 'discord.js';
import express from 'express'; // <-- Adicionado para UptimeRobot

// IDs dos canais e cargos
const CANAL_REGISTRO = '1408285269777580052';
const CANAL_LOG = '1408424578014904390';
const CARGO_MEMBRO = '1408281469578641488'; // Cargo definitivo
const CARGO_ESPERA = '1408437234851647570'; // Cargo temporário "Aguardando Aprovação"

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel]
});

// ========================
// Código atual do bot
// ========================

client.once('clientReady', async () => {
    console.log(`Bot do ${client.user.tag} está online!`);

    try {
        const canal = await client.channels.fetch(CANAL_REGISTRO);
        if (canal) {
            const mensagens = await canal.messages.fetch({ limit: 100 });
            await canal.bulkDelete(mensagens);

            const embedRegistro = new EmbedBuilder()
                .setTitle('📋 REGISTRAR-SE 📋')
                .setDescription('Basta clicar no botão abaixo para fazer o seu registro, algum responsável em breve irá verificar.')
                .setColor('#1E90FF')
                .setThumbnail('https://i.imgur.com/SeuLogo.png')
                .setImage('https://i.imgur.com/SeuBanner.png');

            const botaoRegistro = new ButtonBuilder()
                .setCustomId('abrir_registro')
                .setLabel('✅ Realizar Registro')
                .setStyle(ButtonStyle.Success);

            const row = new ActionRowBuilder().addComponents(botaoRegistro);

            await canal.send({ embeds: [embedRegistro], components: [row] });
        }
    } catch (error) {
        console.error('Erro ao limpar/enviar botão no canal de registro:', error);
    }
});

client.on('interactionCreate', async interaction => {
    try {
        // Botão de registro
        if (interaction.isButton() && interaction.customId === 'abrir_registro') {
            const modal = new ModalBuilder()
                .setCustomId('modal_registro')
                .setTitle('Registro');

            const inputNome = new TextInputBuilder()
                .setCustomId('nome')
                .setLabel('Nome')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const inputID = new TextInputBuilder()
                .setCustomId('id')
                .setLabel('ID')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const inputRecrutador = new TextInputBuilder()
                .setCustomId('recrutador')
                .setLabel('Recrutador')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const row1 = new ActionRowBuilder().addComponents(inputNome);
            const row2 = new ActionRowBuilder().addComponents(inputID);
            const row3 = new ActionRowBuilder().addComponents(inputRecrutador);

            modal.addComponents(row1, row2, row3);
            await interaction.showModal(modal);
        }

        // Modal submit
        if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'modal_registro') {
            const nome = interaction.fields.getTextInputValue('nome');
            const id = interaction.fields.getTextInputValue('id');
            const recrutador = interaction.fields.getTextInputValue('recrutador');

            try { await interaction.member.setNickname(`${id} | ${nome}`); } 
            catch (err) { console.log('Não foi possível alterar o nickname:', err.message); }

            try { await interaction.member.roles.add(CARGO_ESPERA); } 
            catch (err) { console.log('Não foi possível atribuir o cargo de espera:', err.message); }

            try {
                const canalLog = await client.channels.fetch(CANAL_LOG);
                if (canalLog) {
                    const embedLog = new EmbedBuilder()
                        .setTitle('📌 Novo Registro - Aguardando Aprovação')
                        .setDescription(`**Usuário:** ${interaction.user.tag}\n**Nome:** ${nome}\n**ID:** ${id}\n**Recrutador:** ${recrutador}`)
                        .setColor('#FFA500');

                    const row = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(`aprovar_${interaction.user.id}`)
                                .setLabel('✅ Aprovar')
                                .setStyle(ButtonStyle.Success),
                            new ButtonBuilder()
                                .setCustomId(`rejeitar_${interaction.user.id}`)
                                .setLabel('❌ Rejeitar')
                                .setStyle(ButtonStyle.Danger)
                        );

                    await canalLog.send({ embeds: [embedLog], components: [row] });
                }
            } catch (err) {
                console.log('Erro ao enviar log:', err);
            }

            await interaction.reply({ content: 'Registro enviado! Aguarde aprovação da gerência.', ephemeral: true });
        }

        // Botões de aprovação/rejeição
        if (interaction.isButton() && (interaction.customId.startsWith('aprovar_') || interaction.customId.startsWith('rejeitar_'))) {
            const userId = interaction.customId.split('_')[1];
            const membro = await interaction.guild.members.fetch(userId);

            if (!membro) return interaction.reply({ content: 'Usuário não encontrado.', ephemeral: true });

            if (interaction.customId.startsWith('aprovar_')) {
                try {
                    await membro.roles.remove(CARGO_ESPERA);
                    await membro.roles.add(CARGO_MEMBRO);
                    await interaction.update({ content: `✅ ${membro.user.tag} aprovado!`, embeds: [], components: [] });
                } catch (err) {
                    console.log('Erro ao aprovar:', err);
                }
            } else if (interaction.customId.startsWith('rejeitar_')) {
                try {
                    await membro.kick('Registro rejeitado pela gerência.');
                    await interaction.update({ content: `❌ ${membro.user.tag} rejeitado e removido.`, embeds: [], components: [] });
                } catch (err) {
                    console.log('Erro ao rejeitar:', err);
                }
            }
        }

    } catch (err) {
        console.error('Erro no interactionCreate:', err);
    }
});

// ========================
// LOGIN
// ========================
client.login(process.env.TOKEN);

// ========================
// UPTIME ROBOT
// ========================
const app = express();
app.get("/", (req, res) => res.send("Bot rodando 24/7!"));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Servidor web ativo na porta ${PORT}`));
