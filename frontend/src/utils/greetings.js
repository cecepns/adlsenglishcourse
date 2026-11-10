export function getTimeGreeting() {
  const h = new Date().getHours();
  if (h < 11) return "Selamat Pagi";
  if (h < 15) return "Selamat Siang";
  if (h < 18) return "Selamat Sore";
  return "Selamat Malam";
}

export function getOpeningGreeting(user) {
  const waktu = getTimeGreeting();
  const nama = user?.name || "Rekan ADLS";
  switch (user?.role) {
    case "owner":
      return `${waktu}, ${nama}! Terima kasih atas visi dan dukungan luar biasa dalam memajukan ADLS English Course.`;
    case "admin_pusat":
      return `${waktu}, ${nama}! Terima kasih telah menjadi penggerak utama koordinasi seluruh cabang ADLS.`;
    case "admin_cabang":
      return `${waktu}, ${nama}! Apresiasi setinggi-tingginya atas ketelitian Anda mengelola operasional cabang.`;
    case "tutor":
      return `${waktu}, Kak Tutor ${nama}! Terima kasih atas semangat dan dedikasi mengajar hari ini.`;
    case "siswa":
      return `${waktu}, ${nama}! Selamat belajar—setiap langkah kecil membawa kemajuan besar berbahasa Inggris!`;
    case "ortu":
      return `${waktu}, Bapak/Ibu ${nama}! Terima kasih selalu setia mendampingi perjalanan belajar ananda di ADLS.`;
    default:
      return `${waktu}, ${nama}! Selamat datang di ADLS English Course.`;
  }
}

export function getClosingGreeting(role, customTask) {
  const base = customTask ? `${customTask} ` : "";
  switch (role) {
    case "owner":
    case "admin_pusat":
    case "admin_cabang":
      return `${base}Terima kasih atas kerja keras dan dedikasi Admin dalam melayani ADLS English Course!`;
    case "tutor":
      return `${base}Tugas selesai! Terima kasih Kak Tutor atas ilmu dan inspirasi yang diberikan hari ini.`;
    case "siswa":
      return `${base}Hebat! Terus pertahankan semangat belajarmu di ADLS English Course!`;
    case "ortu":
      return `${base}Terima kasih Bapak/Ibu atas perhatian dan dukungan hangatnya untuk ananda.`;
    default:
      return `${base}Terima kasih telah menyelesaikan tugas dengan baik!`;
  }
}

export function getLogoutGreeting(user) {
  const nama = user?.name || "Rekan ADLS";
  switch (user?.role) {
    case "tutor":
      return `Terima kasih atas pengabdiannya hari ini, ${nama}. Sampai jumpa di sesi mengajar berikutnya!`;
    case "siswa":
      return `Great job today, ${nama}! Istirahat yang cukup dan terus berlatih bahasa Inggris ya!`;
    case "ortu":
      return `Terima kasih atas kerja sama Bapak/Ibu ${nama}. Sampai jumpa kembali di Portal ADLS!`;
    default:
      return `Terima kasih atas kontribusi hebat Anda hari ini, ${nama}. Sampai jumpa kembali!`;
  }
}

