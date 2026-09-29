const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require("discord.js");

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildPresences, 
        GatewayIntentBits.GuildMembers
    ] 
});

const utentiInViaggio = new Set();
const timerSostaUtenti = new Map();

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const OWNER_USERNAME = process.env.OWNER_USERNAME;

client.on("ready", async () => {
    console.log("Camion di Euro Truck Simulator 2 ONLINE! Acceso come: " + client.user.tag);
    
    const channel = client.channels.cache.get(CHANNEL_ID);
    if (channel) {
        try { await channel.bulkDelete(5).catch(() => {}); } catch(e){}

        const embedPannello = new EmbedBuilder()
            .setColor(0xFF8C00) 
            .setAuthor({ name: "1 TRASPORTI 1" })
            .setTitle("Plancia di Comando Autisti")
            .setDescription(
                "Benvenuti nel centro logistico della community!\n\n" +
                "👤 **Titolare Azienda:** `" + OWNER_USERNAME + "`\n\n" +
                "👉 Se sei il titolare, usa i pulsanti qui sotto per aggiornare lo stato del tuo camion in tempo reale.\n" +
                "⭐ Per tutti gli altri autisti della community, lo schieramento sul camion è **100% automatico** appena aprite il gioco!"
            )
            .setFooter({ text: "SCS Software - Rete Logistica H24" })
            .setTimestamp();

        const rigaPulsanti = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("accendi_motore").setLabel("🔑 Inizia Consegna").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId("spegni_motore").setLabel("🛑 Termina Consegna").setStyle(ButtonStyle.Danger)
        );

        channel.send({ embeds: [embedPannello], components: [rigaPulsanti] }).catch(console.error);
    }
});

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;
    
    if (interaction.user.username !== OWNER_USERNAME) {
        return interaction.reply({ content: "❌ Questo pannello comandi è riservato esclusivamente al titolare dell'azienda (" + OWNER_USERNAME + ")!", ephemeral: true });
    }

    const channel = client.channels.cache.get(CHANNEL_ID);
    if (!channel) return;

    if (interaction.customId === "accendi_motore") {
        const embedPartenza = new EmbedBuilder()
            .setColor(0x00FF00)
            .setAuthor({ name: "1 TRASPORTI – NOTIFICA 1" })
            .setTitle("1 Camion in Viaggio sul Fronte")
            .setDescription("L'autista capo **" + interaction.user.username + "** ha acceso il motore, agganciato il rimorchio ed è **partito per una nuova consegna** su **Euro Truck Simulator 2**!\n\n**Stato:** Consegna in corso nel Continente Europeo 1")
            .setTimestamp();
        
        await channel.send({ embeds: [embedPartenza] }).catch(console.error);
        await interaction.reply({ content: "1 Viaggio avviato con successo, buona strada!", ephemeral: true });
    }

    if (interaction.customId === "spegni_motore") {
        const embedArrivo = new EmbedBuilder()
            .setColor(0xFF0000)
            .setAuthor({ name: "1 TRASPORTI – AGGIORNAMENTO 1" })
            .setTitle("1 Consegna Completata")
            .setDescription("L'autista capo **" + interaction.user.username + "** ha parcheggiato il veicolo, spento i sistemi ed è **rientrato correttamente in deposito**.\n\n**Stato:** Riposo autisti attivo.")
            .setTimestamp();

        await channel.send({ embeds: [embedArrivo] }).catch(console.error);
        await interaction.reply({ content: "1 Rimorchio sganciato, rientro in deposito registrato!", ephemeral: true });
    }
});

setInterval(() => {
    client.guilds.cache.forEach(async (guild) => {
        try {
            const members = await guild.members.fetch({ withPresences: true });
            members.forEach((m) => {
                if (m.user.bot || m.user.username === OWNER_USERNAME) return;
                const presence = m.presence;

                const gestisciUscitaAmico = () => {
                    if (utentiInViaggio.has(m.user.id) && !timerSostaUtenti.has(m.user.id)) {
                        timerSostaUtenti.set(m.user.id, setTimeout(() => {
                            utentiInViaggio.delete(m.user.id);
                            timerSostaUtenti.delete(m.user.id);
                            
                            const embedLeave = new EmbedBuilder()
                                .setColor(0xFF0000)
                                .setAuthor({ name: "1 TRASPORTI – AGGIORNAMENTO 1" })
                                .setTitle("1 Consegna Completata")
                                .setDescription("Il camionista **" + m.user.username + "** ha finito il seu turno ed è **rientrato correttamente in deposito**.")
                                .setThumbnail(m.user.displayAvatarURL({ dynamic: true }))
                                .setTimestamp();
                            
                            const channel = client.channels.cache.get(CHANNEL_ID);
                            if (channel) channel.send({ embeds: [embedLeave] }).catch(() => {});
                        }, 30000));
                    }
                };

                if (!presence?.activities || presence.activities.length === 0) return gestisciUscitaAmico();
                
                const staGiocandoAETS2 = presence.activities.some(act => 
                    act.name && (act.name.toLowerCase().includes("euro truck") || act.name.toLowerCase().includes("ets2"))
                );

                if (staGiocandoAETS2) {
                    if (timerSostaUtenti.has(m.user.id)) {
                        clearTimeout(timerSostaUtenti.get(m.user.id));
                        timerSostaUtenti.delete(m.user.id);
                        return;
                    }

                    if (!utentiInViaggio.has(m.user.id)) {
                        utentiInViaggio.add(m.user.id);
                        
                        const embedJoin = new EmbedBuilder()
                            .setColor(0x00FF00)
                            .setAuthor({ name: "1 TRASPORTI – NOTIFICA 1" })
                            .setTitle("1 Camion in Viaggio sul Fronte")
                            .setDescription("Il camionista **" + m.user.username + "** si è appena messo alla guida ed è **partito per una consegna** su **Euro Truck Simulator 2**!")
                            .setThumbnail(m.user.displayAvatarURL({ dynamic: true }))
                            .setTimestamp();
                        
                        const channel = client.channels.cache.get(CHANNEL_ID);
                        if (channel) channel.send({ embeds: [embedJoin] }).catch(() => {});
                    }
                } else {
                    gestisciUscitaAmico();
                }
            });
        } catch (e) {}
    });
}, 5000);

client.login(DISCORD_TOKEN);
