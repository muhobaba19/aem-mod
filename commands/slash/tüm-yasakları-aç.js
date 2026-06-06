const { 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ComponentType,
    EmbedBuilder,
    SlashCommandBuilder 
} = require('discord.js');

const path = require('path');
const config = require(path.resolve(process.cwd(), 'config.json')); 

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tüm-yasakları-aç')
        .setDescription('Ankara Emniyetine bağlı tüm sunuculardaki yasakları tamamen temizler.'),
    
    async execute(interaction) {
        // 🌟 İLK ADIM: 3 saniye sınırını aşmak ve Unknown Interaction hatasını kökten çözmek için deferReply yapıyoruz
        // Kurucular paneli gizli (ephemeral) olsun istersen flags: 64 bırakabilirsin kanka
        await interaction.deferReply({ flags: 64 }).catch(() => null);

        const kurucularListesi = config.kurucular || [];
        const tetikleyenID = interaction.user.id.toString().trim();

        const kurucuMu = kurucularListesi.some(id => id.toString().trim() === tetikleyenID);

        if (!kurucuMu) {
            return interaction.editReply({ 
                content: '❌ Bu komut yalnızca botun kurucularına özeldir, yetkiniz yetersiz!'
            });
        }

        // 2. ADIM: Onay Butonlarını Tasarlama
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('ban_ac_evet')
                    .setLabel('Evet')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🔓'),
                new ButtonBuilder()
                    .setCustomId('ban_ac_hayir')
                    .setLabel('Hayır')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('✖️')
            );

        // DeferReply kullandığımız için artık 'reply' değil 'editReply' yapıyoruz kanka
        const mesaj = await interaction.editReply({
            content: 'Gerçekten tüm yasakları açmak istiyor musunuz?',
            components: [row],
            withResponse: true // Yeni nesil Discord.js v14 uyarısını çözen kısım kanka
        });

        // 3. ADIM: Buton Dinleyici (Collector) Kurulumu
        const collector = mesaj.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 30000 
        });

        collector.on('collect', async i => {
            const butonBasanID = i.user.id.toString().trim();
            const butonBasanKurucuMu = kurucularListesi.some(id => id.toString().trim() === butonBasanID);
            
            if (!butonBasanKurucuMu) {
                return i.reply({ content: '❌ Bu butonlara dokunmaya senin yetkin yok kanka!', flags: 64 });
            }

            // --- HAYIR BUTONUNA BASILIRSA ---
            if (i.customId === 'ban_ac_hayir') {
                collector.stop();
                return i.update({
                    content: '⚙️ İşlem yetkili tarafından iptal edildi. Mevcut yasaklar aynen korunuyor.',
                    components: []
                });
            }

            // --- EVET BUTONUNA BASILIRSA ---
            if (i.customId === 'ban_ac_evet') {
                collector.stop();

                await i.update({
                    content: 'İşlem başlatıldı, bu biraz zaman alabilir...',
                    components: []
                });

                const sunucular = interaction.client.guilds.cache;
                let toplamAçılanBan = 0;

                const suAn = new Date();
                const tarihFormat = suAn.toLocaleDateString('tr-TR');
                const saatFormat = suAn.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

                for (const [guildId, guild] of sunucular) {
                    try {
                        const banListesi = await guild.bans.fetch().catch(() => null);
                        if (!banListesi || banListesi.size === 0) continue;

                        let sunucuBanMetni = "";
                        let sunucudaAcilanBanSayisi = 0;

                        for (const [userId, banInfo] of banListesi) {
                            const kullanici = banInfo.user;
                            const sebep = banInfo.reason || 'Sebep belirtilmemiş.';

                            await guild.bans.remove(userId, 'Tüm yasakları aç komutu (Owner) kullanıldı.').catch(() => null);
                            toplamAçılanBan++;
                            sunucudaAcilanBanSayisi++;

                            sunucuBanMetni += `👤 **İsim:** \`${kullanici.tag}\`\n🆔 **ID:** \`${kullanici.id}\`\n📝 **Sebep:** \`${sebep}\`\n📅 **Tarih/Saat:** \`${tarihFormat} - ${saatFormat}\`\n───────────────────\n`;
                        }

                        if (sunucudaAcilanBanSayisi > 0) {
                            const sunucuEmbed = new EmbedBuilder()
                                .setTitle(`🔓 Tüm Yasakları Açma İşlemi`)
                                .setDescription(`**Sunucu Adı:** \`${guild.name}\`\n**Kaldırılan Ban Sayısı:** \`${sunucudaAcilanBanSayisi}\`\n\n${sunucuBanMetni}`)
                                .setColor('#ff0000')
                                .setTimestamp()
                                .setFooter({ text: `AEM Moderasyon Sistemi | Sunucu ID: ${guild.id}` });

                            await interaction.channel.send({ embeds: [sunucuEmbed] }).catch(() => null);
                        }

                    } catch (err) {
                        continue;
                    }
                }

                await interaction.followUp({
                    content: `✅ **Büyük yasak açma işlemi tamamlandı!** Toplam **${toplamAçılanBan}** şahsın yasağı başarıyla kaldırıldı. Sunucu bazlı detaylı raporlar yukarıda listelendi kanka! 🔓`
                }).catch(() => null);
            }
        });

        collector.on('end', async (collected, reason) => {
            if (reason === 'time') {
                await interaction.editReply({
                    content: '⏱️ Onay süresi doldu, güvenlik protokolü gereği işlem otomatik iptal edildi.',
                    components: []
                }).catch(() => null);
            }
        });
    }
};