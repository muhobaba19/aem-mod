const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'sil',
    description: 'Belirtilen miktarda mesajı kanaldan temizler.',
    
    async execute(message, args) {
        // 1. ADIM: Yetki Kontrolü (Mesajları Yönet, Sunucuyu Yönet veya Yönetici)
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages) && 
            !message.member.permissions.has(PermissionFlagsBits.ManageGuild) && 
            !message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            
            return message.reply({ content: '❌ Bu komutu kullanabilmek için yeterli yetkin bulunmuyor gaddar!' }).then(msg => {
                setTimeout(() => msg.delete().catch(() => null), 5000);
            });
        }

        // 2. ADIM: Miktar ve Sınır Kontrolü
        const miktar = parseInt(args[0]);

        if (isNaN(miktar)) {
            return message.reply({ content: '⚙️ Lütfen silmek istediğiniz mesaj sayısını rakam olarak girin. Örnek: `.sil 5`' }).then(msg => {
                setTimeout(() => msg.delete().catch(() => null), 5000);
            });
        }

        if (miktar < 3) {
            return message.reply({ content: '⚠️ En az **3** mesaj silebilirsin, daha azını tek tek siliver.' }).then(msg => {
                setTimeout(() => msg.delete().catch(() => null), 5000);
            });
        }

        if (miktar > 100) {
            return message.reply({ content: '⚠️ Tek seferde en fazla **100** mesaj silebilirsin.' }).then(msg => {
                setTimeout(() => msg.delete().catch(() => null), 5000);
            });
        }

        // Kendi yazdığı .sil komutunu da dahil etmek için miktarı 1 arttırıyoruz kanka
        const toplamSilinecek = miktar + 1;

        // 3. ADIM: Mesajları Toplu Silme Motoru
        try {
            const silinenler = await message.channel.bulkDelete(toplamSilinecek, true);
            
            // Başarılı bildirimini kanala atıp 4 saniye sonra otomatik siliyoruz ki kirlilik yapmasın
            const onayMesaji = await message.channel.send({ 
                content: `🗑️ **Başarıyla ${silinenler.size - 1} adet mesaj kanaldan süpürüldü!**` 
            });
            
            setTimeout(() => onayMesaji.delete().catch(() => null), 4000);

        } catch (error) {
            console.error(error);
            return message.channel.send({ 
                content: '❌ **14 günden eski mesajlar Discord politikaları nedeniyle topluca silinemez kanka!**' 
            }).then(msg => {
                setTimeout(() => msg.delete().catch(() => null), 6000);
            });
        }
    },
};