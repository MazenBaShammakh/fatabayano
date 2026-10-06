/**
 * Sample messages on the home page, so visitors can try the tool without pasting their own.
 * Written to read like real forwarded messages. Each one was checked against the live pipeline and shows a
 * different kind of result; re-check them if the matching or the data changes.
 */
export type Sample =
  /** `shows` describes what the message contains, never the verdict: results come from the pipeline. */
  | { id: string; label: string; shows: string; text: string }
  | { id: string; label: string; shows: string; image: string; alt: string };

export const samples: Sample[] = [
  {
    id: "chain",
    label: "رسالة صباحية متداولة",
    shows: "حديث، وقول شائع، وآية، ودعوى أن نشرها واجب",
    text: "🌸 صباح الخير 🌸\nقال رسول الله ﷺ: «الكلمة الطيبة صدقة»\nوقال ﷺ: «النظافة من الإيمان» فاحرصوا عليها.\nوقال تعالى: يا أيها الذين آمنوا إذا جاءكم فاجر بخبر فتثبتوا\n⚠️ انشرها ولا تجعلها تقف عندك، فنشرها واجب ومن لم ينشرها فعليه إثم",
  },
  {
    id: "dhikr",
    label: "فضل ذكر",
    shows: "حديث في فضل التسبيح، بغير لفظه الحرفي",
    text: "📿 فضل عظيم لا تفوّته:\nمن قال سبحان الله وبحمده مائة مرة غُفرت ذنوبه ولو كانت مثل زبد البحر\nلا تنسَ أن تقولها اليوم 🤍",
  },
  {
    id: "fiqh",
    label: "تنبيه فقهي",
    shows: "دعوى تحريم صيام يوم السبت",
    text: "تنبيه مهم ‼️\nصيام يوم السبت حرام إلا في الفريضة، فلا تصوموه تطوعًا وأخبروا أهلكم",
  },
  {
    id: "dua",
    label: "دعاء",
    shows: "دعاء منسوب إلى النبي ﷺ",
    text: "🤲 دعاء جامع، كان أكثر دعاء النبي ﷺ:\nاللهم ربنا آتنا في الدنيا حسنة وفي الآخرة حسنة وقنا عذاب النار",
  },
  {
    id: "screenshot",
    label: "لقطة شاشة من واتساب",
    shows: "صورة رسالة فيها حديث وآية، نقرأ نصها ثم نتحقق منه",
    image: "/samples/forwarded-message.png",
    alt: "لقطة شاشة لرسالة متداولة فيها حديث وآية",
  },
];
