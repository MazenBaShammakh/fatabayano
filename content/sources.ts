import type { SourcesContent } from "./types";

export const sources: SourcesContent = {
  title: "المصادر",
  intro: "نبحث في مصادر علمية منشورة ومعروفة، ونربط كل نتيجة بمصدرها.",
  groups: [
    {
      heading: "القرآن الكريم",
      items: [
        { name: "مجمع الملك فهد لطباعة المصحف الشريف", description: "النص الرسمي للمصحف وطبعاته المعتمدة.", url: "https://qurancomplex.gov.sa" },
        { name: "Quranpedia", description: "موسوعة قرآنية تجمع التفاسير وعلوم القرآن.", url: "https://quranpedia.net" },
        { name: "موسوعة القرآن الكريم", description: "ترجمات معاني القرآن وتفاسيره المعتمدة.", url: "https://quranenc.com" },
      ],
    },
    {
      heading: "الحديث",
      items: [
        { name: "الدرر السنية، الموسوعة الحديثية", description: "أحاديث مع أحكام المحدّثين عليها.", url: "https://dorar.net/hadith" },
        { name: "المكتبة الشاملة", description: "مكتبة واسعة لكتب الحديث وشروحه.", url: "https://shamela.ws" },
        { name: "موسوعة الأحاديث النبوية", description: "أحاديث مشروحة ومترجمة مع تخريجها.", url: "https://hadeethenc.com" },
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
