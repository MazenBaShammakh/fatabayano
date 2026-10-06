import type { PrivacyContent } from "./types";

export const privacy: PrivacyContent = {
  title: "الخصوصية",
  intro: "نحرص على ألا نحفظ إلا ما تحتاجه الخدمة لتعمل.",
  sections: [
    {
      heading: "ما نحفظه",
      items: [
        "بطاقات المشاركة، وفيها الادعاءات الموثقة وأحكامها فقط، لمدة محدودة.",
        "عدّاد مؤقت لحماية الخدمة من الإساءة، يستخدم عنوانًا مُشفّرًا.",
      ],
    },
    {
      heading: "ما لا نحفظه",
      items: ["الرسالة الأصلية.", "الصور.", "الحسابات، فلا نطلب منك التسجيل."],
    },
    {
      heading: "المعالجة",
      items: [
        // TODO: confirm this sentence against the AI provider's terms (data retention and usage).
        "تُرسل الرسالة أو الصورة مؤقتًا إلى خدمة ذكاء اصطناعي خارجية لقراءتها وتحليلها.",
      ],
    },
  ],
};
