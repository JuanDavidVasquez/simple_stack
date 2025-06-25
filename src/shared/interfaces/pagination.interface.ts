export interface PaginatedResponse<T> {
  data: T[];               
  total: number;           
  page: number;            
  limit: number;           
  offset: number;          
  totalPages: number;      
  hasNextPage: boolean;    
  hasPreviousPage: boolean;
}

export interface PaginatedRequest {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    filters?: Record<string, any>;
}
