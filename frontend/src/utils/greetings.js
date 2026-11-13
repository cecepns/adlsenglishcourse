export function getTimeGreeting() {
  const h = new Date().getHours();
  if (h < 11) return "Selamat Pagi";
  if (h < 15) return "Selamat Siang";
  if (h < 18) return "Selamat Sore";
  return "Selamat Malam";
}

export function getEnglishTimeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

export function formatTutorName(name) {
  const raw = String(name || "Tutor").trim();
  if (/^(ms|mr|mrs|miss)\b/i.test(raw)) return raw;
  return `Ms. ${raw}`;
}

export function getOpeningGreeting(user) {
  const waktu = getTimeGreeting();
  const nama = user?.name || "Rekan ADLS";
  switch (user?.role) {
    case "owner":
      return `${waktu}, ${nama}! Terima kasih atas visi dan dukungan luar biasa dalam memajukan ADLS Solusi Indonesia.`;
    case "admin_pusat":
      return `${waktu}, ${nama}! Terima kasih telah menjadi penggerak utama koordinasi seluruh cabang ADLS.`;
    case "admin_cabang":
      return `${waktu}, ${nama}! Apresiasi setinggi-tingginya atas ketelitian Anda mengelola operasional cabang.`;
    case "tutor": {
      const enTime = getEnglishTimeGreeting();
      const tutorTitle = formatTutorName(nama);
      return `Welcome! ${enTime}, ${tutorTitle}! Thank you for your dedication and passion in inspiring our students today.`;
    }
    case "siswa":
      return `${waktu}, ${nama}! Selamat belajar—setiap langkah kecil membawa kemajuan besar berbahasa Inggris!`;
    case "ortu":
      return `${waktu}, Bapak/Ibu ${nama}! Terima kasih selalu setia mendampingi perjalanan belajar ananda di ADLS.`;
    default:
      return `${waktu}, ${nama}! Selamat datang di ADLS Solusi Indonesia.`;
  }
}

export function getClosingGreeting(role, customTask) {
  const base = customTask ? `${customTask} ` : "";
  switch (role) {
    case "owner":
    case "admin_pusat":
    case "admin_cabang":
      return `${base}Terima kasih atas kerja keras dan dedikasi Admin dalam melayani ADLS Solusi Indonesia!`;
    case "tutor":
      return `${base}Well done! Thank you for your excellence, guidance, and for inspiring our students today!`;
    case "siswa":
      return `${base}Great job! Keep up the spirit and keep practicing your English at ADLS!`;
    case "ortu":
      return `${base}Terima kasih Bapak/Ibu atas perhatian dan dukungan hangatnya untuk ananda.`;
    default:
      return `${base}Terima kasih telah menyelesaikan tugas dengan baik!`;
  }
}

export function getLogoutGreeting(user) {
  const nama = user?.name || "Rekan ADLS";
  switch (user?.role) {
    case "tutor": {
      const tutorTitle = formatTutorName(nama);
      return `Thank you for inspiring our students today, ${tutorTitle}! Have a great rest and see you in the next session!`;
    }
    case "siswa":
      return `Great job today, ${nama}! Istirahat yang cukup dan terus berlatih bahasa Inggris ya!`;
    case "ortu":
      return `Terima kasih atas kerja sama Bapak/Ibu ${nama}. Sampai jumpa kembali di Portal ADLS!`;
    default:
      return `Terima kasih atas kontribusi hebat Anda hari ini, ${nama}. Sampai jumpa kembali!`;
  }
}
