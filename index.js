        const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, Events, EmbedBuilder, REST, Routes, SlashCommandBuilder } = require('discord.js');
        const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

        const TOKEN = process.env.TOKEN;

        // IDs fornecidos
        const CHANNEL_REGISTRO = "1409980265995960330";
        const CHANNEL_LOGS = "1409979944036991158";
        const CARGO_MEMBRO = "1409989088421085214";
        const CARGO_AGUARDANDO = "1409991552465506446";

        // Config.js
        const { enviarBotaoDefinirMetas, setupConfig, carregarMetas } = require('./config.js');
        // Farm.js
        const { enviarPainelFarm } = require('./farm.js');

        // Registrar comandos
        const commands = [
          new SlashCommandBuilder()
            .setName('configmetas')
            .setDescription('Definir metas diarias'),
          new SlashCommandBuilder()
            .setName('limparmetas')
            .setDescription('Apaga todas as metas setadas'),
          new SlashCommandBuilder()
            .setName('registro')
            .setDescription('Envia a mensagem de registro no canal de registro'),
          new SlashCommandBuilder()
            .setName('limparchat')
            .setDescription('Limpa todas as mensagens do canal'),
          new SlashCommandBuilder()
            .setName('reboot')
            .setDescription('Reinicia o bot (apenas administradores)')
        ].map(cmd => cmd.toJSON());

        const rest = new REST({ version: '10' }).setToken(TOKEN);
        (async () => {
          try {
            console.log('Registrando comandos...');
            await rest.put(
              Routes.applicationGuildCommands('1408575572547731466', '1409979784775077898'),
              { body: commands }
            );
            console.log('Comandos registrados!');
          } catch (error) {
            console.error(error);
          }
        })();

        client.once('ready', async () => {
          console.log(`${client.user.tag} está online!`);

          // Botão de registro
          await enviarBotaoRegistro();

          // Botão de definir metas
          await enviarBotaoDefinirMetas(client);

          // Configura listener de interações do config.js
          setupConfig(client);

          // Painel de farm
          await enviarPainelFarm(client);

        });

        // Função aprimorada para enviar embed RP-friendly + botão no canal de registro
        async function enviarBotaoRegistro(membro = null) {
          const canal = await client.channels.fetch(CHANNEL_REGISTRO);

          // Limpa mensagens antigas com botões
          const mensagens = await canal.messages.fetch({ limit: 100 });
          const mensagensBotao = mensagens.filter(m => m.components.length > 0);
          if (mensagensBotao.size > 0) await canal.bulkDelete(mensagensBotao);

          // Embed RP-friendly aprimorado
          const embed = new EmbedBuilder()
            .setTitle('✍️ Registro GTA RP')
            .setDescription(
              membro 
                ? `🎉 Bem-vindo(a), ${membro}!\nClique no botão abaixo para se registrar! 🚨`
                : 'Clique no botão abaixo para se registrar! 🎉📝'
            )
            .setColor('#00FF7F')
            .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: 'Morro da Croácia • Prepare-se!', iconURL: canal.guild.iconURL() })
            .setTimestamp();

          // Botão de registro
          const botao = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('registrar')
              .setLabel('📝 Registrar')
              .setStyle(ButtonStyle.Primary)
          );

          // Envia embed + botão
          await canal.send({ embeds: [embed], components: [botao] });
        }

        // Boas-vindas e botão ao entrar no servidor
        client.on('guildMemberAdd', async membro => {
          await enviarBotaoRegistro(`<@${membro.id}>`);
        });

        client.on(Events.InteractionCreate, async interaction => {

          // algo de farm
            const farm = require('./farm.js');
            farm.handleInteraction(interaction);

          // Comando /registro
          if (interaction.isChatInputCommand() && interaction.commandName === 'registro') {
            if (!interaction.member.permissions.has('Administrator')) return;
            await enviarBotaoRegistro();
            await interaction.deferReply({ ephemeral: true });
            await interaction.deleteReply();
          }

          // Comando /configmetas
          if (interaction.isChatInputCommand() && interaction.commandName === 'configmetas') {
              if (!interaction.member.permissions.has('Administrator')) return;
              await enviarBotaoDefinirMetas(client);
              await interaction.reply({ content: '✅ Botão de definir metas enviado!', ephemeral: true });
          }

          // Comando /limparchat
          if (interaction.isChatInputCommand() && interaction.commandName === 'limparchat') {
            if (!interaction.member.permissions.has('Administrator')) return;

            const canal = interaction.channel;

            // Apagar todas as mensagens (até 100 últimas)
            const mensagens = await canal.messages.fetch({ limit: 100 });
            await canal.bulkDelete(mensagens);

            // Apagar apenas as mensagens do autor (quem usou o comando)
            const minhasMensagens = mensagens.filter(msg => msg.author.id === interaction.user.id);
            for (const msg of minhasMensagens.values()) {
              await msg.delete().catch(() => {});
            }

            await interaction.deferReply({ ephemeral: true });
            await interaction.deleteReply();
          }

          // Comando /reboot
          if (interaction.isChatInputCommand() && interaction.commandName === 'reboot') {
            if (!interaction.member.permissions.has('Administrator')) {
              return interaction.reply({ content: '❌ Apenas administradores podem usar este comando.', ephemeral: true });
            }

            await interaction.reply({ content: '🔄 Reiniciando o bot...', ephemeral: true });
            process.exit(0); // Render vai reiniciar automaticamente
          }

          // Botão de registro
          if (interaction.isButton() && interaction.customId === 'registrar') {
            const modal = new ModalBuilder()
              .setCustomId('modalRegistro')
              .setTitle('📋 Formulário de Registro');

            const inputID = new TextInputBuilder()
              .setCustomId('inputID')
              .setLabel('🆔 Seu ID (somente números)')
              .setStyle(TextInputStyle.Short)
              .setRequired(true);

            const inputNome = new TextInputBuilder()
              .setCustomId('inputNome')
              .setLabel('🧑 Nome')
              .setStyle(TextInputStyle.Short)
              .setRequired(true);

            const inputRecrutador = new TextInputBuilder()
              .setCustomId('inputRecrutador')
              .setLabel('🤝 Recrutador')
              .setStyle(TextInputStyle.Short)
              .setRequired(true);

            modal.addComponents(
              new ActionRowBuilder().addComponents(inputID),
              new ActionRowBuilder().addComponents(inputNome),
              new ActionRowBuilder().addComponents(inputRecrutador)
            );

            await interaction.showModal(modal);
          }

          // Modal submit registro
          if (interaction.isModalSubmit() && interaction.customId === 'modalRegistro') {
            const id = interaction.fields.getTextInputValue('inputID');
            const nome = interaction.fields.getTextInputValue('inputNome');
            const recrutador = interaction.fields.getTextInputValue('inputRecrutador');

            if (!/^\d+$/.test(id)) {
              return interaction.reply({ content: '❌ ID inválido! Digite apenas números.', ephemeral: true });
            }

            const membro = await interaction.guild.members.fetch(interaction.user.id);
            await membro.roles.add(CARGO_AGUARDANDO);

            await interaction.reply({ content: `✅ Registro enviado! Aguarde a aprovação da gerência`, ephemeral: true });

            const embed = new EmbedBuilder()
              .setTitle('🛡️ Novo Registro Recebido')
              .setDescription(`Um novo jogador se registrou na Croácia!`)
              .setColor('#00FF7F')
              .addFields(
                { name: '🆔 ID', value: id, inline: true },
                { name: '🧑 Nome', value: nome, inline: true },
                { name: '🤝 Recrutador', value: recrutador, inline: true },
                { name: '💬 Discord', value: `<@${interaction.user.id}>`, inline: true }
              )
              .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
              .setTimestamp()
              .setFooter({ text: 'Morro da Croácia', iconURL: interaction.guild.iconURL() });

            const acoes = new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId(`aprovar_${interaction.user.id}`)
                .setLabel('✅ Aprovar Registro')
                .setStyle(ButtonStyle.Success)
                .setEmoji('🟢'),
              new ButtonBuilder()
                .setCustomId(`reprovar_${interaction.user.id}`)
                .setLabel('❌ Reprovar Registro')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🔴')
            );

            const canalLogs = await client.channels.fetch(CHANNEL_LOGS);
            await canalLogs.send({ embeds: [embed], components: [acoes] });
          }

          // Aprovar/Reprovar registro
          if (interaction.isButton() && (interaction.customId.startsWith('aprovar') || interaction.customId.startsWith('reprovar'))) {
            const [acao, userId] = interaction.customId.split('_');
            const membro = await interaction.guild.members.fetch(userId);

            if (acao === 'aprovar') {
              await membro.roles.remove(CARGO_AGUARDANDO);
              await membro.roles.add(CARGO_MEMBRO);
              await interaction.update({ content: `✅ Registro aprovado para <@${userId}>`, components: [] });
            } else if (acao === 'reprovar') {
              await membro.roles.remove(CARGO_AGUARDANDO);
              await membro.kick('Registro reprovado');
              await interaction.update({ content: `❌ Registro reprovado para <@${userId}>`, components: [] });
            }
          }
        });

        client.login(TOKEN);
