export interface GoogleMediaItem {
  id: string;
  filename: string;
  mimeType: string;
  baseUrl: string;
  productUrl: string;
  mediaMetadata: GoogleMediaMetadata;
}

export interface GoogleMediaMetadata {
  creationTime: Date;
  height: string;
  width: string;
  photo: GooglePhoto;
}

export interface GooglePhoto {
  apertureNumber: number;
  cameraMake: string;
  cameraModel: string;
  focalLength: number;
  isoEquivalent: number;
}

export interface DbMediaItem {
  id: string;
  baseUrl: string;
  fileName: string;
  downloaded: boolean;
  filePath: string;
  productUrl: string; 
  mimeType: string;
  creationTime: Date;
  width: number;
  height: number;
}