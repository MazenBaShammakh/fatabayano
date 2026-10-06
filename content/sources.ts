import type { SourcesContent } from "./types";

export const sources: SourcesContent = {
  title: "المصادر",
  intro: "نبحث في مصادر علمية منشورة ومعروفة، ونربط كل نتيجة بمصدرها.",
  groups: [
    {
      heading: "القرآن الكريم",
      items: [
        { name: "Quran.com", description: "نص المصحف كاملًا بالرسم العثماني، نطابق به الآيات الواردة في الرسالة.", url: "https://quran.com" },
      ],
    },
    {
      heading: "الحديث",
      items: [
        { name: "موسوعة الأحاديث النبوية", description: "أحاديث مشروحة مع تخريجها وحكم أهل العلم عليها، ونأخذ منها الحكم كما نُشر.", url: "https://hadeethenc.com" },
      ],
    },
    {
      heading: "الفتاوى المنشورة",
      items: [
        { name: "الإسلام سؤال وجواب", description: "فتاوى منشورة مرتبة حسب الموضوع.", url: "https://islamqa.info" },
        { name: "إسلام ويب، مركز الفتوى", description: "فتاوى مركز الفتوى في موقع إسلام ويب.", url: "https://www.islamweb.net/ar/fatwa" },
        { name: "موقع الشيخ عبدالعزيز بن باز", description: "فتاوى الشيخ ودروسه المنشورة.", url: "https://binbaz.org.sa" },
        { name: "موقع الشيخ محمد بن صالح العثيمين", description: "فتاوى الشيخ ومؤلفاته المنشورة.", url: "https://binothaimeen.net" },
      ],
    },
  ],
  note: "قائمة المصادر مبدئية وتُحدَّث مع التطوير.",
};
