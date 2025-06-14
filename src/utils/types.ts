export interface Review {
  reviewer: string;
  rating: number;
  review: string;
}

export interface Movie {
  id: string;
  title: string;
  description: string;
  genre: string;
  year: number;
  actors: string[];
  reviews: Review[];
  embedding?: number[];
  titleVector?: number[];
  descriptionVector?: number[];
  genreVector?: number[];
  yearVector?: number[];
  actorsVector?: number[];
  reviewsVector?: number[];
}
