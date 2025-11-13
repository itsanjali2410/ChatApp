// API error types

export interface ApiError {
  response?: {
    status?: number;
    data?: {
      detail?: string;
    };
  };
  message?: string;
}

export interface FileUploadData {
  filename: string;
  file_id: string;
  file_type: string;
  file_url: string;
  size: number;
  thumbnail_url?: string;
}



