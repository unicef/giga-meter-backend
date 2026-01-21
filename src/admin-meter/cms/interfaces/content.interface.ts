export interface SectionField {
  key: string;
  type: 'text' | 'image' | 'list';
  required: boolean;
  label?: string;
}

export interface SectionSchema {
  id: string;
  name: string;
  fields: SectionField[];
}

export interface SectionData {
  id: string;
  schemaId: string;
  data: Record<string, any>;
}

export interface PageContent {
  page: string;
  sections: SectionData[];
}

export interface ContentStructure {
  pages: PageContent[];
}

export interface MediaFile {
  id: string;
  name: string;
  altText?: string;
  fileType: string;
  url: string;
  width?: number;
  height?: number;
  duration?: number; // For videos
}

export interface MediaLibrary {
  files: MediaFile[];
}
