export type Review = { name: string; location: string; rating: number; date: string; title: string; text: string; isDemo?: boolean };
export type Product = {
  id: string; name: string; tradition: string; category: string; price: number; compareAt?: number;
  color: string; background: string; image: string; badge: string; rating: number; reviewCount: number;
  kind?: 'generative'|'ai'; style?:string; formats?:string; isPrivate?:boolean; accessToken?:string; recipe?:{version:string;style:string;palette:string;seed:number;detail:number;edition?:number}; tags?:string;
  artworks: string[]; description: string; story: string; palette: string[]; created: string; reviews: Review[];
};
export type Order = {
  id: string; name: string; email: string; createdAt: string; status: 'demo' | 'paid' | 'pending';
  total: number; discount: number; products: Product[]; accessToken?: string; receiptSent?: boolean;
  gift?: { recipient: string; message: string } | null;
};
