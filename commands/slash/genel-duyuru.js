const { SlashCommandBuilder, EmbedBuilder, WebhookClient, PermissionFlagsBits } = require('discord.js');

// 🚨 LOG WEBHOOK CLIENT
const logWebhook = new WebhookClient({ url: 'https://discord.com/api/webhooks/1507460412319469801/I0t-nWqc5gfl9wvEHmQyxhKTVy5_lNCGVpk7fy0AfbuOFCTHYj0dTaNadJDq9-4oCk2U' });

// Sadece senin verdiğin kanal ID'leri listesi kanka
const KANAL_IDLERI = [
    "1483938355522568232", "1505457515939495957", "1504281425044574248", 
    "1504599033128288256", "1507392848117633194", "1504266743848112158", 
    "1507392987196424253", "1506433712542318754", "1504492945221615776", 
    "1507393396950568970", "1507393491649560618", "1507393598075965491", 
    "1507393679026032681", "1507393768280690729"
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('genel-duyuru')
        .setDescription('Belirlenen tüm kanallara genel duyuru gönderir.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) // Sadece adminler kullansın kanka
        .addStringOption(option =>
            option.setName('metin')
                .setDescription('Duyuruda gidecek olan metni yazın.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('imza')
                .setDescription('İmza kısmında ne yazacağını belirtin (Boş bırakırsanız sizi etiketler).')
                .setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply(); // İşlem uzun sürebileceği için botu beklemeye alıyoruz

        const metin = interaction.options.getString('metin');
        const imzaGiris = interaction.options.getString('imza');
        
        // İmza boşsa tag atsın, doluysa yazılanı göstersin kanka
        const imza = imzaGiris ? imzaGiris : `<@${interaction.user.id}>`;

        // 1. ADIM: Tam istediğin o emojisiz, siyah renkli Duyuru Embed Tasarımı
        const duyuruEmbed = new EmbedBuilder()
            .setTitle('Genel Duyuru')
            .setDescription(metin)
            .addFields({ name: 'İmza:', value: imza })
            .setColor('#000000')
            .setFooter({ text: 'AEM - Genel Duyuru System' });

        let basariliListesi = "";
        let hataliListesi = "";
        let sorunVarMi = false;

        // 2. ADIM: Kanalları tek tek gezip duyuruyu basma döngüsü
        for (const kanalId of KANAL_IDLERI) {
            try {
                const kanal = await interaction.client.channels.fetch(kanalId).catch(() => null);

                if (!kanal) {
                    hataliListesi += `• (Kanal ID: ${kanalId}) Bot bu sunucuda bulunmuyor/Bot yetkisiz olabilir, Bot sahibi ile iletişime geçin.\n`;
                    sorunVarMi = true;
                    continue;
                }

                const sunucuAdi = kanal.guild.name;
                const kanalAdi = kanal.name;

                // Herkes duysun diye everyone ve here tagı ile birlikte embed fırlatılıyor
                await kanal.send({ content: '@everyone @here', embeds: [duyuruEmbed] });
                basariliListesi += `**${sunucuAdi}** (#${kanalAdi}) ✅\n`;

            } catch (error) {
                hataliListesi += `• (Kanal ID: ${kanalId}) Bot bu sunucuda bulunmuyor/Bot yetkisiz olabilir, Bot sahibi ile iletişime geçin.\n`;
                sorunVarMi = true;
            }
        }

        // 3. ADIM: Yetkiliye verilecek olan Durum Raporu Embed'i
        const raporEmbed = new EmbedBuilder()
            .setTitle('📊 Genel Duyuru Gönderim Raporu')
            .setColor(sorunVarMi ? '#ff0000' : '#00ff00')
            .addFields(
                { name: 'Duyuru Durumları:', value: basariliListesi || 'Hiçbir sunucuya gönderilemedi.' },
                { name: 'Sorunlar:', value: sorunVarMi ? hataliListesi : 'Başarıyla gönderildi! No problem gardaş' }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [raporEmbed] });

        // 4. ADIM: Webhook Logunu Ateşleme Motoru
        const logEmbed = new EmbedBuilder()
            .setTitle('Genel duyuru komutu tetiklendi')
            .setColor('#000000')
            .addFields(
                { name: 'Yetkili:', value: `${interaction.user.username}`, inline: true },
                { name: 'Yetkili İd:', value: `\`${interaction.user.id}\``, inline: true },
                { name: 'Gönderdiği Metin:', value: metin },
                { name: 'İmza:', value: imza }
            )
            .setFooter({ text: 'AEM - Genel Duyuru System' })
            .setTimestamp();

        await logWebhook.send({ embeds: [logEmbed] }).catch(err => console.log("Webhook loğu gönderilemedi: ", err));
    },
};