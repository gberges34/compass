declare module '@compass/dto/pagination' {
  export interface PaginationResponse<TItem> {
    items: TItem[];
    nextCursor: string | null;
  }
}

declare module '@compass/dto' {
  export * from '@compass/dto/pagination';
}
