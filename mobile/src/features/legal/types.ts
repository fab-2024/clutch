export type LegalSection = {
  title: string;
  paragraphs: string[];
};

export type LegalDocument = {
  eyebrow: string;
  title: string;
  updatedAt: string;
  introduction: string;
  sections: LegalSection[];
};
