declare module '@compass/dto/pagination' {
  export interface PaginationResponse<TItem> {
    items: TItem[];
    nextCursor: string | null;
  }
}
