const { Client, GatewayIntentBits, EmbedBuilder, REST, Routes, SlashCommandBuilder } = require("discord.js");

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

// CREAZIONE DEI COMANDI VELOCI CON LA BARRA (SLASH COMMANDS)
const commands = [
    new SlashCommandBuilder().setName("inizia").setDescription("🔑 Avvia la tua consegna aziendale (Solo per il Titolare)"),
    new SlashCommandBuilder().setName("termina").setDescription("🛑 Rientra in deposito col camion (Solo per il Titolare)")
].map(command => command.toJSON());

client.on("ready", async () => {
    console.log("Camion di Euro Truck Simulator 2 ONLINE! Acceso come: " + client.user.tag);
    
    // Registra i comandi veloci su Discord in automatico all'avvio
    const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log("[SUCCESSO] Comandi veloci /inizia e /termina attivati con successo!");
    } catch (error) {
        console.error(error);
    }

    // Invia un avviso pulito senza pulsanti ingombranti
    const channel = client.channels.cache.get(CHANNEL_ID);
    if (channel) {
        try { await channel.bulkDelete(5).catch(() => {}); } catch(e){}

        const embedPannello = new EmbedBuilder()
            .setColor(0xFF8C00) 
            .setAuthor({ name: "🚚 DEPOSITO CENTRALE TRASPORTI 🚚" })
            .setTitle("Centro Logistico Autisti Attivo")
            .setDescription(
                "Benvenuti nel centro di tracciamento della community!\n\n" +
                "👤 **Titolare Azienda:** `" + OWNER_USERNAME + "`\n\n" +
                "⌨️ **Comandi Rapidi del Capo:**\n" +
                "👉 Scrivi **`/inizia`** nella barra dei messaggi in basso quando parti per un viaggio.\n" +
                "👉 Scrivi **`/termina`** nella barra in basso quando arrivi a destinazione.\n\n" +
                "⭐ **Per la flotta di Autisti:** Il vostro radar è **100% automatico** appena aprite il gioco!"
            )
            .setFooter({ text: "SCS Software - Rete Logistica H24" })
            .setTimestamp();

        channel.send({ embeds: [embedPannello] }).catch(console.error);
    }
});

// GESTIONE DEI COMANDI SCRITTI IN CHAT
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.user.username !== OWNER_USERNAME) {
        return interaction.reply({ content: "❌ Questi comandi rapidi sono riservati esclusivamente al titolare dell'azienda (" + OWNER_USERNAME + ")!", ephemeral: true });
    }

    const channel = client.channels.cache.get(CHANNEL_ID);
    if (!channel) return;

    if (interaction.commandName === "inizia") {
        const embedPartenza = new EmbedBuilder()
            .setColor(0x00FF00)
            .setAuthor({ name: "🚚 AZIENDA TRASPORTI – NOTIFICA 🚚" })
            .setTitle("🛣️ Camion in Viaggio sul Fronte")
            .setDescription("L'autista capo **" + interaction.user.username + "** ha acceso il motore, agganciato il rimorchio ed è **partito per una nuova consegna** su **Euro Truck Simulator 2**!\n\n**Stato:** Consegna in corso nel Continente Europeo 🗺️")
            .setTimestamp();
        
        await channel.send({ embeds: [embedPartenza] }).catch(console.error);
        await interaction.reply({ content: "✅ Viaggio avviato con successo, buona strada!", ephemeral: true });
    }

    if (interaction.commandName === "termina") {
        const embedArrivo = new EmbedBuilder()
            .setColor(0xFF0000)
            .setAuthor({ name: "🚚 AZIENDA TRASPORTI – AGGIORNAMENTO 🚚" })
            .setTitle("🏁 Consegna Completata")
            .setDescription("L'autista capo **" + interaction.user.username + "** ha parcheggiato il veicolo, spento i sistemi ed è **rientrato correttamente in deposito**.\n\n**Stato:** Riposo autisti attivo.")
            .setTimestamp();

        await channel.send({ embeds: [embedArrivo] }).catch(console.error);
        await interaction.reply({ content: "🛑 Rimorchio sganciato, rientro in deposito registrato!", ephemeral: true });
    }
});

setInterval(() => {
    client.guilds.cache.forEach(async (guild) => {
        try {
            const members = await guild.members.fetch({ withPresences: true });
            members.forEach((m) => {
                if (m.user.bot || m.user.username === "winstonblue76" || m.user.username === OWNER_USERNAME) return;
                const presence = m.presence;

                const gestisciUscitaAmico = () => {
                    if (utentiInViaggio.has(m.user.id) && !timerSostaUtenti.has(m.user.id)) {
                        timerSostaUtenti.set(m.user.id, setTimeout(() => {
                            utentiInViaggio.delete(m.user.id);
                            timerSostaUtenti.delete(m.user.id);
                            
                            const embedLeave = new EmbedBuilder()
                                .setColor(0xFF0000)
                                .setAuthor({ name: "🚚 AZIENDA TRASPORTI – AGGIORNAMENTO 🚚" })
                                .setTitle("🏁 Consegna Completata")
                                .setDescription("Il camionista **" + m.user.username + "** ha finito il suo turno ed è **rientrato correttamente in deposito**.")
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
                            .setAuthor({ name: "🚚 AZIENDA TRASPORTI – NOTIFICA 🚚" })
                            .setTitle("🛣️ Camion in Viaggio sul Fronte")
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

