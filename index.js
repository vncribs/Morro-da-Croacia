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
import express from 'express';

// IDs dos canais e cargos
const CANAL_REGISTRO = '1408285269777580052';
const CANAL_LOG = '1408424578014904390';
const CARGO_MEMBRO = '1408281469578641488';
const CARGO_ESPERA = '1408437234851647570';

// --- CONFIGURAÇÃO DO EXPRESS PARA UPTIME ROBOT ---
const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
    res.send('Bot ativo! ✅');
});

app.listen(PORT, () => {
    console.log(`Servidor web ativo na porta ${PORT}`);
});

// --- CONFIGURAÇÃO DO DISCORD ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel]
});

let mensagemBotaoId = null;

// Função para capitalizar cada palavra
function capitalizarNome(nome) {
    return nome.split(' ').map(palavra => palavra.charAt(0).toUpperCase() + palavra.slice(1).toLowerCase()).join(' ');
}

// Função para enviar o botão de registro
async function enviarBotaoRegistro() {
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
            const msg = await canal.send({ embeds: [embedRegistro], components: [row] });
            mensagemBotaoId = msg.id;
        }
    } catch (error) {
        console.error('Erro ao limpar/enviar botão no canal de registro:', error);
    }
}

client.once('ready', async () => {
    console.log(`Bot do ${client.user.tag} está online!`);
    await enviarBotaoRegistro();
});

// Reenvia o botão se alguém deletar a mensagem
client.on('messageDelete', async (mensagem) => {
    if (mensagem.id === mensagemBotaoId) {
        console.log('Botão de registro deletado, reenviando...');
        mensagemBotaoId = null;
        enviarBotaoRegistro();
    }
});

client.on('interactionCreate', async interaction => {
    try {
        // BOTÃO DE REGISTRO
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

            modal.addComponents(
                new ActionRowBuilder().addComponents(inputNome),
                new ActionRowBuilder().addComponents(inputID),
                new ActionRowBuilder().addComponents(inputRecrutador)
            );

            await interaction.showModal(modal);
        }

        // MODAL SUBMIT
        if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'modal_registro') {
            let nome = interaction.fields.getTextInputValue('nome');
            const id = interaction.fields.getTextInputValue('id');
            const recrutador = interaction.fields.getTextInputValue('recrutador');

            // Capitaliza o nome
            nome = capitalizarNome(nome);

            try {
                await interaction.member.setNickname(`${id} | ${nome}`);
            } catch (err) {
                console.log('Não foi possível alterar o nickname:', err.message);
            }

            try {
                await interaction.member.roles.add(CARGO_ESPERA);
            } catch (err) {
                console.log('Não foi possível atribuir o cargo de espera:', err.message);
            }

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

        // BOTÕES DE APROVAÇÃO/REJEIÇÃO
        if (interaction.isButton() && (interaction.customId.startsWith('aprovar_') || interaction.customId.startsWith('rejeitar_'))) {
            const userId = interaction.customId.split('_')[1];
            const membro = await interaction.guild.members.fetch(userId);
            if (!membro) return interaction.reply({ content: 'Usuário não encontrado.', ephemeral: true });

            // Pega o nome capitalizado do nickname
            const nickname = membro.nickname || membro.user.username;

            if (interaction.customId.startsWith('aprovar_')) {
                try {
                    await membro.roles.remove(CARGO_ESPERA);
                    await membro.roles.add(CARGO_MEMBRO);
                    await interaction.update({ content: `✅ ${nickname} aprovado!`, embeds: [], components: [] });
                } catch (err) {
                    console.log('Erro ao aprovar:', err);
                }
            } else if (interaction.customId.startsWith('rejeitar_')) {
                try {
                    await membro.kick('Registro rejeitado pela gerência.');
                    await interaction.update({ content: `❌ ${nickname} rejeitado e removido.`, embeds: [], components: [] });
                } catch (err) {
                    console.log('Erro ao rejeitar:', err);
                }
            }
        }

    } catch (err) {
        console.error('Erro no interactionCreate:', err);
    }
});

client.login(process.env.TOKEN);
