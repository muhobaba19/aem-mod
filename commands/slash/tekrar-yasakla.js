const { 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ComponentType,
    EmbedBuilder,
    SlashCommandBuilder 
} = require('discord.js');

const path = require('path');
const fs = require('fs');

// Klasör yapısından bağımsız olarak config ve yasaklılar listesini çekiyoruz kanka
const config = require(path.resolve(process.cwd(), 'config.json')); 
const yasaklilarPath = path.resolve(process.cwd(), 'yasaklilar.json');

// Eğer yasaklilar.json dosyası yoksa otomatik boş bir yapı oluştursun kanka
if (!fs.existsSync(yasaklilarPath)) {
    fs.writeFileSync(yasaklilarPath, JSON.stringify({}, null, 2));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tekrar-yasakla')
        .setDescription('Tam yasaklı şahısları botun olduğu diğer tüm sunuculardan da temizler.')
        .addStringOption(option => 
            option.setName('kullanıcı')
                .setDescription('Tüm listeyi taramak için "all" yazın veya spesifik bir şahsın ID değerini girin.')
                .setRequired(true)),
    
    async execute(interaction) {
        // 🌟 3 saniye sınırını aşmak için deferReply yapıyoruz, paneli kuruculara özel gizli tutuyoruz
        await interaction.deferReply({ flags: 64 }).catch(() => null);

        const kurucularListesi = config.kurucular || [];
        const tetikleyenID = interaction.user.id.toString().trim();
        const kurucuMu = kurucularListesi.some(id => id.toString().trim() === tetikleyenID);

        if (!kurucuMu) {
            return interaction.editReply({ 
                content: '❌ Bu komut yalnızca botun kurucularına özeldir, yetkiniz yetersiz!'
            });
        }

        const hedefGirdi = interaction.options.getString('kullanıcı').trim();
        
        // Veritabanını anlık olarak dosyadan taze oku kanka
        let yasakliVeritabanı = {};
        try {
            yasakliVeritabanı = JSON.parse(fs.readFileSync(yasaklilarPath, 'utf8'));
        } catch (e) {
            yasakliVeritabanı = {};
        }

        const keys = Object.keys(yasakliVeritabanı);
        if (keys.length === 0) {
            return interaction.editReply({
                content: 'Sistemde kayıtlı tam yasaklı veri bulunamadı. Önce tam-yasakla komutuyla birilerini cezalandırmalısınız kanka.'
            });
        }

        // Listeye alınacak kişileri belirliyoruz
        let islemYapilacaklar = [];

        if (hedefGirdi.toLowerCase() === 'all') {
            islemYapilacaklar = keys.map(id => ({ id, ...yasakliVeritabanı[id] }));
        } else {
            if (!yasakliVeritabanı[hedefGirdi]) {
                return interaction.editReply({
                    content: `Belirtilen ID değerine sahip şahıs tam yasaklılar listesinde bulunamadı: ${hedefGirdi}`
                });
            }
            islemYapilacaklar = [{ id: hedefGirdi, ...yasakliVeritabanı[hedefGirdi] }];
        }

        // Onay mekanizması
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('tekrar_ban_evet')
                    .setLabel('Evet')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🔓'),
                new ButtonBuilder()
                    .setCustomId('tekrar_ban_hayir')
                    .setLabel('Hayır')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('✖️')
            );

        const mesaj = await interaction.editReply({
            content: `${islemYapilacaklar.length} adet şahısa ait global tarama ve cezalandırma işlemi başlatılsın mı?`,
            components: [row],
            withResponse: true
        });

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

            if (i.customId === 'tekrar_ban_hayir') {
                collector.stop();
                return i.update({
                    content: 'İşlem yetkili tarafından iptal edildi. Mevcut durum korunuyor.',
                    components: []
                });
            }

            if (i.customId === 'tekrar_ban_evet') {
                collector.stop();

                await i.update({
                    content: 'Büyük operasyon başlatıldı, sunucular taranıyor...',
                    components: []
                });

                const tümSunucular = interaction.client.guilds.cache;

                for (const hedef of islemYapilacaklar) {
                    let sunucuRaporListesi = "";
                    let sunuculardaIslemGorduMu = false;
                    let sonKullaniciAdi = hedef.tag || "Bilinmeyen Kullanıcı";

                    for (const [guildId, guild] of tümSunucular) {
                        try {
                            const banListesi = await guild.bans.fetch().catch(() => null);
                            
                            if (banListesi && banListesi.has(hedef.id)) {
                                // Eğer şahıs bu sunucuda zaten banlıysa yanına [YASAKLI] yazıyoruz
                                sunucuRaporListesi += `• \`${guild.name}\` **[YASAKLI]**\n`;
                                sunuculardaIslemGorduMu = true;
                            } else {
                                // Şahıs bu sunucuda banlı değilse, şimdi yasaklıyoruz
                                const banAt = await guild.bans.remove(hedef.id).catch(() => null); // Varsa önce temizle garanti olsun
                                await guild.bans.add(hedef.id, { reason: `Global Tam-Yasakla Protokolü: ${hedef.sebep}` }).catch(() => null);
                                
                                sunucuRaporListesi += `• \`${guild.name}\` **[ŞİMDİ YASAKLANDI]**\n`;
                                sunuculardaIslemGorduMu = true;
                            }
                        } catch (err) {
                            continue;
                        }
                    }

                    // İstediğin o tam #ff0000 kırmızı renkteki rapor embedi kanka:
                    if (sunuculardaIslemGorduMu) {
                        const raporEmbed = new EmbedBuilder()
                            .setColor('#ff0000')
                            .setDescription(`<@${hedef.id}> (\`${hedef.id}\`) aşağıdaki şu sunuculardan tekrar yasaklandı:\n\n${sunucuRaporListesi}\n**Sebep:** \`${hedef.sebep}\``)
                            .setTimestamp()
                            .setFooter({ text: `AEM - Moderasyon System` });

                        await interaction.channel.send({ embeds: [raporEmbed] }).catch(() => null);
                    }
                }

                await interaction.followUp({
                    content: 'İşlem başarıyla tamamlandı!'
                }).catch(() => null);
            }
        });

        collector.on('end', async (collected, reason) => {
            if (reason === 'time') {
                await interaction.editReply({
                    content: 'Onay süresi doldu, güvenlik protokolü gereği işlem otomatik iptal edildi.',
                    components: []
                }).catch(() => null);
            }
        });
    }
};